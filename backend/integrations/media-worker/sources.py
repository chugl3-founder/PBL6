"""Resolves where a match video is read from, without downloading the whole file when possible.

ffmpeg seeks inside an HTTP file with range requests, so a 3-minute reel from a 1-hour match only reads the
cut parts. A full download is the fallback when streaming fails.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Dict, List

import boto3
from botocore.client import Config

from config import settings
from render import RenderError, Source

logger = logging.getLogger(__name__)

YOUTUBE_MAX_HEIGHT = 720

_YOUTUBE_UNAVAILABLE = (
    "Không đọc được video từ YouTube. Hãy kiểm tra video vẫn ở chế độ công khai và không giới hạn độ tuổi."
)


def s3_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


def storage_source(storage_path: str) -> Source:
    url = s3_client().generate_presigned_url(
        "get_object", Params={"Bucket": settings.s3_bucket, "Key": storage_path}, ExpiresIn=6 * 3600,
    )
    return Source(video=url)


def download_storage(storage_path: str, local_path: Path) -> Source:
    local_path.parent.mkdir(parents=True, exist_ok=True)
    s3_client().download_file(settings.s3_bucket, storage_path, str(local_path))
    return Source(video=str(local_path))


def _pick(formats: List[Dict], video: bool) -> Dict | None:
    if video:
        pool = [f for f in formats if f.get("vcodec") not in (None, "none") and f.get("acodec") in (None, "none")
                and f.get("height") and f["height"] <= YOUTUBE_MAX_HEIGHT and f.get("protocol", "https") == "https"]
        # Tallest first, then H.264, which every ffmpeg build decodes quickly.
        pool.sort(key=lambda f: (-f["height"], not str(f.get("vcodec", "")).startswith("avc1")))
    else:
        pool = [f for f in formats if f.get("acodec") not in (None, "none") and f.get("vcodec") in (None, "none")
                and f.get("protocol", "https") == "https"]
        pool.sort(key=lambda f: (f.get("ext") != "m4a", -(f.get("abr") or 0)))
    return pool[0] if pool else None


def youtube_source(url: str) -> Source:
    """Direct stream URLs for the video and audio tracks; YouTube serves them separately above 360p."""
    import yt_dlp

    try:
        with yt_dlp.YoutubeDL({"quiet": True, "no_warnings": True, "noplaylist": True}) as ydl:
            info = ydl.extract_info(url, download=False)
    except yt_dlp.utils.DownloadError as e:
        raise RenderError(_YOUTUBE_UNAVAILABLE) from e
    formats = info.get("formats") or []
    video = _pick(formats, video=True)
    if video is None:
        raise RenderError(_YOUTUBE_UNAVAILABLE)
    audio = _pick(formats, video=False)
    headers = dict(video.get("http_headers") or info.get("http_headers") or {})
    logger.info("YouTube streams: video %sp %s, audio %s", video.get("height"), video.get("vcodec"),
                audio.get("format_id") if audio else "none")
    return Source(video=video["url"], audio=audio["url"] if audio else None, http_headers=headers)


def download_youtube(url: str, local_path: Path) -> Source:
    import yt_dlp

    local_path.parent.mkdir(parents=True, exist_ok=True)
    options = {
        "quiet": True, "no_warnings": True, "noplaylist": True, "overwrites": True, "retries": 3,
        "outtmpl": str(local_path.with_suffix(".%(ext)s")),
        "format": f"bv*[height<={YOUTUBE_MAX_HEIGHT}]+ba/b[height<={YOUTUBE_MAX_HEIGHT}]",
        "merge_output_format": "mp4",
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            ydl.download([url])
    except yt_dlp.utils.DownloadError as e:
        raise RenderError(_YOUTUBE_UNAVAILABLE) from e
    files = sorted(local_path.parent.glob(local_path.stem + ".*"))
    if not files:
        raise RenderError(_YOUTUBE_UNAVAILABLE)
    return Source(video=str(files[0]))
