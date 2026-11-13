"""Media worker: renders highlight reels queued by the backend, and thumbnails of uploaded videos (thumbnail.py).

1. Listens to `badminton.media.queue` (the backend publishes when the owner clicks "Tạo video highlight").
2. Reads only the needed parts of the match video (S3 presigned URL or YouTube stream) with ffmpeg.
3. Renders an intro card and one clip per rally with a scoreboard overlay, then joins them (render.py).
4. Uploads the MP4 to object storage and marks the highlight_reels row COMPLETED.

CPU only: it runs next to the backend, not on the GPU machine of the AI worker.
"""

from __future__ import annotations

import json
import logging
import os
import tempfile
import threading
import time
from pathlib import Path
from typing import Any, Dict

import pika
import psycopg2

from config import settings
from render import Clip, RenderError, render_reel
from sources import download_storage, download_youtube, s3_client, storage_source, youtube_source
from thumbnail import process_thumbnail_job

logging.basicConfig(level=logging.INFO, format="%(asctime)s [%(levelname)s] [MEDIA-WORKER] %(message)s")
logger = logging.getLogger(__name__)

# Over this the storage provider refuses the upload (Supabase: 50 MB per file).
MAX_UPLOAD_BYTES = int(os.getenv("HIGHLIGHT_MAX_UPLOAD_BYTES", str(49 * 1024 * 1024)))
DB_RETRY_SECONDS = 30
GENERIC_FAILURE = "Dựng video thất bại. Hãy thử lại; nếu vẫn lỗi, hãy chọn ít pha cầu hơn."


def _connect():
    return psycopg2.connect(dbname=settings.db_name, user=settings.db_user, password=settings.db_password,
                            host=settings.db_host, port=settings.db_port)


def update_reel(reel_id: int, **fields: Any) -> int:
    """Updates the row and returns how many rows changed (0 when the owner deleted the reel)."""
    columns = ", ".join(f"{name} = %s" for name in fields)
    with _connect() as conn, conn.cursor() as cur:
        cur.execute(f"UPDATE highlight_reels SET {columns}, updated_at = NOW() WHERE id = %s",
                    (*fields.values(), reel_id))
        return cur.rowcount


def reel_status(reel_id: int) -> str | None:
    with _connect() as conn, conn.cursor() as cur:
        cur.execute("SELECT status FROM highlight_reels WHERE id = %s", (reel_id,))
        row = cur.fetchone()
    return row[0] if row else None


class Progress:
    """Writes progress at most every few seconds; the database may be remote."""

    def __init__(self, reel_id: int):
        self.reel_id = reel_id
        self.last_write = 0.0

    def __call__(self, percent: int) -> None:
        now = time.monotonic()
        if now - self.last_write < 2 and percent < 95:
            return
        self.last_write = now
        try:
            update_reel(self.reel_id, progress_percent=min(99, percent))
        except Exception:
            logger.warning("Could not save progress for reel %s", self.reel_id, exc_info=True)


def _render(payload: Dict[str, Any], workdir: Path, out_path: Path, progress: Progress, streamed: bool) -> float:
    youtube = payload.get("youtubeUrl")
    if streamed:
        source = youtube_source(youtube) if youtube else storage_source(payload["videoStoragePath"])
    elif youtube:
        source = download_youtube(youtube, workdir / "source" / "match")
    else:
        source = download_storage(payload["videoStoragePath"], workdir / "source" / "match.mp4")
    return render_reel(
        source=source,
        clips=[Clip.from_json(c) for c in payload["clips"]],
        out_path=out_path,
        workdir=workdir / ("stream" if streamed else "local"),
        title=payload.get("title") or "Highlight",
        subtitle=payload.get("subtitle") or "",
        # Jobs queued before the per-player scoreboard still carry upperName/lowerName.
        name_a=payload.get("nameA") or payload.get("upperName") or "A",
        name_b=payload.get("nameB") or payload.get("lowerName") or "B",
        on_progress=progress,
    )


def process_job(payload: Dict[str, Any]) -> None:
    reel_id = int(payload["reelId"])
    status = reel_status(reel_id)
    if status is None or status == "COMPLETED":
        logger.info("Reel %s is %s; skipping.", reel_id, status or "deleted")
        return

    update_reel(reel_id, status="RENDERING", progress_percent=1, error_message=None)
    progress = Progress(reel_id)
    started = time.monotonic()
    with tempfile.TemporaryDirectory(prefix=f"reel-{reel_id}-") as tmp:
        workdir = Path(tmp)
        out_path = workdir / "out" / f"{reel_id}.mp4"
        try:
            duration = _render(payload, workdir, out_path, progress, streamed=True)
        except RenderError:
            raise
        except Exception:
            # Streaming over HTTP can fail on some hosts or YouTube formats; reading a local copy always works.
            logger.warning("Streaming render failed for reel %s; downloading the video instead.", reel_id,
                           exc_info=True)
            duration = _render(payload, workdir, out_path, progress, streamed=False)

        size = out_path.stat().st_size
        if size > MAX_UPLOAD_BYTES:
            raise RenderError(f"Video dài {duration:.0f} giây nặng {size / 1e6:.0f} MB, vượt giới hạn lưu trữ. "
                              "Hãy bỏ bớt pha cầu.")
        key = payload["outputPath"]
        s3_client().upload_file(str(out_path), settings.s3_bucket, key, ExtraArgs={"ContentType": "video/mp4"})

    changed = update_reel(reel_id, status="COMPLETED", progress_percent=100, storage_path=key,
                          duration_seconds=round(duration, 3), file_size=size, error_message=None,
                          completed_at=psycopg2.extensions.AsIs("NOW()"))
    if changed == 0:
        # Deleted while rendering: nothing points at the file any more.
        s3_client().delete_object(Bucket=settings.s3_bucket, Key=key)
        logger.info("Reel %s was deleted during rendering; removed the upload.", reel_id)
        return
    logger.info("Reel %s done: %.1f s, %.1f MB in %.0f s", reel_id, duration, size / 1e6, time.monotonic() - started)


def _settle(connection, channel, delivery_tag: int, ack: bool, requeue: bool = False) -> None:
    """Acks or nacks from the job thread: pika channels may only be used on the connection's own thread."""

    def settle() -> None:
        if not channel.is_open:
            logger.warning("Channel closed before the job was settled; the broker will redeliver it.")
            return
        if ack:
            channel.basic_ack(delivery_tag=delivery_tag)
        else:
            channel.basic_nack(delivery_tag=delivery_tag, requeue=requeue)

    try:
        connection.add_callback_threadsafe(settle)
    except Exception as e:
        logger.warning("Could not settle message (%r); the broker will redeliver it.", e)


def _run_thumbnail(connection, channel, delivery_tag: int, payload: Dict[str, Any]) -> None:
    """A card thumbnail is a nicety: on failure the card keeps its placeholder, so the job is dropped."""
    try:
        process_thumbnail_job(payload)
    except Exception as e:
        logger.warning("Thumbnail for match %s failed: %s", payload.get("matchId"), e)
    _settle(connection, channel, delivery_tag, ack=True)


def _run_job(connection, channel, delivery_tag: int, body: bytes) -> None:
    reel_id = None
    try:
        payload = json.loads(body.decode("utf-8"))
        if payload.get("type") == "thumbnail":
            _run_thumbnail(connection, channel, delivery_tag, payload)
            return
        reel_id = payload.get("reelId")
        logger.info("==> Reel %s: %d clips for match %s", reel_id, len(payload.get("clips", [])),
                    payload.get("matchId"))
        process_job(payload)
    except Exception as e:
        logger.error("Reel %s failed: %s", reel_id, e, exc_info=not isinstance(e, RenderError))
        message = str(e) if isinstance(e, RenderError) else GENERIC_FAILURE
        recorded = True
        if reel_id is not None:
            try:
                update_reel(int(reel_id), status="FAILED", error_message=message)
            except Exception:
                recorded = False
        if not recorded:
            # The failure could not be saved, so dropping the message would leave the row RENDERING.
            logger.warning("Database unavailable. Requeueing job in %s seconds.", DB_RETRY_SECONDS)
            time.sleep(DB_RETRY_SECONDS)
        _settle(connection, channel, delivery_tag, ack=False, requeue=not recorded)
        return
    _settle(connection, channel, delivery_tag, ack=True)


def callback(ch, method, properties, body):
    """Runs the job on its own thread so the connection keeps answering heartbeats; prefetch=1 keeps one job."""
    threading.Thread(target=_run_job, args=(ch.connection, ch, method.delivery_tag, body),
                     name=f"reel-{method.delivery_tag}", daemon=True).start()


def connect_to_rabbitmq():
    parameters = pika.URLParameters(settings.amqp_url)
    parameters.heartbeat = int(os.getenv("AMQP_HEARTBEAT_SECONDS", "600"))
    parameters.blocked_connection_timeout = 300
    while True:
        try:
            connection = pika.BlockingConnection(parameters)
            channel = connection.channel()
            channel.queue_declare(queue=settings.queue_name, durable=True)
            logger.info("Listening on queue '%s'", settings.queue_name)
            return connection, channel
        except Exception as e:
            logger.warning("Broker connection failed (%s). Retrying in 5 seconds...", e)
            time.sleep(5)


def main() -> None:
    logger.info("Starting highlight media worker...")
    while True:
        connection, channel = connect_to_rabbitmq()
        channel.basic_qos(prefetch_count=1)
        channel.basic_consume(queue=settings.queue_name, on_message_callback=callback)
        try:
            channel.start_consuming()
        except KeyboardInterrupt:
            logger.info("Media worker stopped by user.")
            channel.stop_consuming()
            connection.close()
            return
        except Exception as e:
            logger.warning("Lost broker connection (%r). Reconnecting in 5 seconds...", e)
            time.sleep(5)


if __name__ == "__main__":
    main()
