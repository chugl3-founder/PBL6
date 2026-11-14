"""S3-compatible object-storage adapter."""

from __future__ import annotations

import logging
from pathlib import Path

import boto3
from botocore.client import Config

from app.config import settings

logger = logging.getLogger(__name__)


def get_client():
    return boto3.client(
        "s3",
        endpoint_url=settings.s3_endpoint,
        aws_access_key_id=settings.s3_access_key,
        aws_secret_access_key=settings.s3_secret_key,
        region_name=settings.s3_region,
        config=Config(signature_version="s3v4"),
    )


def download_video(storage_path: str, local_path: Path) -> None:
    logger.info(
        "Downloading video '%s' from bucket '%s'",
        storage_path,
        settings.s3_bucket,
    )
    local_path.parent.mkdir(parents=True, exist_ok=True)
    get_client().download_file(settings.s3_bucket, storage_path, str(local_path))
    logger.info("Downloaded %.2f MB", local_path.stat().st_size / (1024 * 1024))


# Same cap as an uploaded file.
MAX_YOUTUBE_BYTES = 500 * 1024 * 1024
# Measured on a 5-minute broadcast segment against 720p: 480p missed 11% of the strokes, changed the stroke label
# of 17% of the rest and flipped one rally winner. So 720p is used whenever it fits under the cap, and 480p only
# when it does not. Bitrates differ a lot between uploads: 720p H.264 was 4.2 MB a minute on a 2026 BWF match
# but 12 MB a minute on a 2023 one, so the size is read from YouTube rather than guessed from the duration.
YOUTUBE_HEIGHTS = (720, 480)

_YOUTUBE_UNAVAILABLE = (
    "Không tải được video từ YouTube. Hãy kiểm tra video ở chế độ công khai, "
    "không giới hạn độ tuổi và không phải buổi phát trực tiếp đang diễn ra."
)


def _estimated_bytes(fmt: dict, duration: float | None) -> float | None:
    size = fmt.get("filesize") or fmt.get("filesize_approx")
    if size:
        return float(size)
    if fmt.get("tbr") and duration:
        return fmt["tbr"] * 1000 / 8 * duration
    return None


def choose_youtube_format(info: dict) -> dict:
    """
    The video-only stream to analyse: the pipeline reads frames, so audio is skipped and no ffmpeg merge is needed.
    H.264 is preferred over VP9 and AV1 because OpenCV decodes it everywhere and, on YouTube, it is also the
    smallest at 720p (a 56-minute match: H.264 237 MB, AV1 302 MB, VP9 356 MB).
    """
    duration = info.get("duration")
    video_only = [
        f for f in info.get("formats", [])
        if f.get("vcodec") not in (None, "none") and f.get("acodec") in (None, "none") and f.get("height")
    ]
    for height in YOUTUBE_HEIGHTS:
        candidates = [f for f in video_only if f["height"] == height]
        # H.264 first, then whichever codec is smallest.
        candidates.sort(key=lambda f: (not str(f.get("vcodec", "")).startswith("avc1"), _estimated_bytes(f, duration) or float("inf")))
        for fmt in candidates:
            size = _estimated_bytes(fmt, duration)
            if size is not None and size <= MAX_YOUTUBE_BYTES:
                return fmt
    minutes = round((duration or 0) / 60)
    raise RuntimeError(
        f"Video YouTube này dài {minutes} phút, vượt giới hạn 500 MB ở độ phân giải AI cần (480p trở lên). "
        "Hãy dùng video ngắn hơn, ví dụ một ván đấu."
    )


def download_youtube_video(url: str, local_path: Path) -> None:
    """Downloads a YouTube video to local_path with yt-dlp, at most MAX_YOUTUBE_BYTES."""
    import yt_dlp

    logger.info("Downloading YouTube video %s", url)
    local_path.parent.mkdir(parents=True, exist_ok=True)
    options = {
        "outtmpl": str(local_path),
        "noplaylist": True,
        "quiet": True,
        "noprogress": True,
        "no_warnings": True,
        "overwrites": True,
        "retries": 3,
        # Guards against a size estimate that was too low.
        "max_filesize": MAX_YOUTUBE_BYTES,
    }
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)
        if info.get("is_live"):
            raise RuntimeError("Video đang phát trực tiếp. Hãy đợi buổi phát kết thúc rồi phân tích.")
        fmt = choose_youtube_format(info)
        logger.info(
            "YouTube format %s: %sp %s, about %.0f MB",
            fmt["format_id"], fmt["height"], fmt.get("vcodec"),
            (_estimated_bytes(fmt, info.get("duration")) or 0) / (1024 * 1024),
        )
        # The format is fixed when YoutubeDL is created, so a second instance downloads it. It extracts the page
        # again (about a second): the stream URLs of the first one are tied to that session and YouTube answers 403.
        with yt_dlp.YoutubeDL({**options, "format": fmt["format_id"]}) as ydl:
            ydl.download([url])
    except yt_dlp.utils.DownloadError as e:
        # Shown to the user on the match page, so it says what to do rather than echo yt-dlp.
        raise RuntimeError(_YOUTUBE_UNAVAILABLE) from e
    if not local_path.exists():
        raise RuntimeError("Video YouTube vượt giới hạn 500 MB hoặc YouTube không trả về file cho link này.")
    logger.info("Downloaded %.2f MB from YouTube", local_path.stat().st_size / (1024 * 1024))
