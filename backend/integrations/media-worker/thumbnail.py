"""Still frame of an uploaded match video, shown on match cards (YouTube videos use YouTube's own thumbnail).

Job (from the backend, after an MP4 upload): {"type": "thumbnail", "matchId", "videoStoragePath", "outputPath"}.
Backfill the videos uploaded before this existed:  python thumbnail.py --backfill
"""

from __future__ import annotations

import argparse
import logging
import subprocess
import tempfile
from pathlib import Path
from typing import Any, Dict

import psycopg2

from config import settings
from render import ffmpeg_binary
from sources import s3_client, storage_source

logger = logging.getLogger(__name__)

WIDTH = 640


def _connect():
    return psycopg2.connect(dbname=settings.db_name, user=settings.db_user, password=settings.db_password,
                            host=settings.db_host, port=settings.db_port)


def _duration(url: str) -> float:
    out = subprocess.run([ffmpeg_binary("ffprobe"), "-v", "error", "-show_entries", "format=duration",
                          "-of", "default=nw=1:nk=1", url], capture_output=True, text=True, timeout=120)
    try:
        return float(out.stdout.strip())
    except ValueError:
        return 0.0


def make_thumbnail(match_id: int, storage_path: str, output_path: str) -> None:
    """Grabs one frame a little into the video (past intros and black frames), uploads it, records its key."""
    url = storage_source(storage_path).video
    duration = _duration(url)
    at = min(60.0, duration * 0.2) if duration > 0 else 5.0
    with tempfile.TemporaryDirectory(prefix=f"thumb-{match_id}-") as tmp:
        jpg = Path(tmp) / "thumb.jpg"
        subprocess.run([ffmpeg_binary(), "-y", "-loglevel", "error", "-ss", f"{at:.2f}", "-i", url,
                        "-frames:v", "1", "-vf", f"scale={WIDTH}:-2", "-q:v", "4", str(jpg)],
                       check=True, timeout=300)
        s3_client().upload_file(str(jpg), settings.s3_bucket, output_path,
                                ExtraArgs={"ContentType": "image/jpeg", "CacheControl": "max-age=86400"})
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("UPDATE videos SET thumbnail_path = %s, updated_at = NOW() WHERE match_id = %s AND storage_path = %s",
                    (output_path, match_id, storage_path))
        updated = cur.rowcount
    logger.info("Thumbnail for match %s at %.0f s -> %s (%s row)", match_id, at, output_path, updated)


def process_thumbnail_job(payload: Dict[str, Any]) -> None:
    make_thumbnail(int(payload["matchId"]), payload["videoStoragePath"], payload["outputPath"])


def backfill() -> None:
    """Every uploaded video still without a thumbnail."""
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("""SELECT match_id, storage_path FROM videos
                       WHERE thumbnail_path IS NULL AND COALESCE(video_source_type, '') <> 'YOUTUBE'
                         AND storage_path IS NOT NULL AND status IN ('READY', 'UPLOADED') ORDER BY match_id""")
        rows = cur.fetchall()
    logger.info("%d videos without a thumbnail", len(rows))
    for match_id, storage_path in rows:
        try:
            make_thumbnail(match_id, storage_path, f"thumbnails/{match_id}.jpg")
        except Exception as e:
            logger.warning("Match %s: no thumbnail (%s)", match_id, e)


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [THUMBNAIL] %(message)s")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--backfill", action="store_true", help="make thumbnails for existing uploaded videos")
    if parser.parse_args().backfill:
        backfill()
    else:
        parser.print_help()
