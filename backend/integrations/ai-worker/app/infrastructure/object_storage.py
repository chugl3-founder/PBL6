"""S3-compatible object-storage adapter."""

from __future__ import annotations

import logging
import os
import subprocess
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
# When only part of a video is analysed the whole video is still downloaded (see download_youtube_video), but only
# into a temporary file, so a longer match is allowed.
MAX_YOUTUBE_SOURCE_BYTES = 2 * 1024 * 1024 * 1024
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


def choose_youtube_format(info: dict, max_bytes: int = MAX_YOUTUBE_BYTES) -> dict:
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
            if size is not None and size <= max_bytes:
                return fmt
    minutes = round((duration or 0) / 60)
    if max_bytes > MAX_YOUTUBE_BYTES:
        raise RuntimeError(
            f"Video YouTube này dài {minutes} phút, vượt giới hạn {max_bytes // (1024 ** 3)} GB "
            "ở độ phân giải AI cần (480p trở lên)."
        )
    raise RuntimeError(
        f"Video YouTube này dài {minutes} phút, vượt giới hạn 500 MB ở độ phân giải AI cần (480p trở lên). "
        "Hãy chọn một đoạn để phân tích, ví dụ một ván đấu."
    )


def _clock(seconds: float) -> str:
    seconds = int(seconds)
    hours, rest = divmod(seconds, 3600)
    return f"{hours}:{rest // 60:02d}:{rest % 60:02d}" if hours else f"{rest // 60}:{rest % 60:02d}"


def youtube_segment(
    duration: float | None, start_seconds: float | None, end_seconds: float | None
) -> tuple[float, float] | None:
    """
    The part of the video to analyse as (start, end) in seconds, or None for the whole video.
    The backend cannot know the video length, so the end is checked here: an end past the video stops at its end.
    """
    start = float(start_seconds or 0)
    if start <= 0 and end_seconds is None:
        return None
    if duration and start >= duration:
        raise RuntimeError(
            f"Video chỉ dài {_clock(duration)}, thời điểm bắt đầu {_clock(start)} nằm ngoài video. "
            "Hãy chọn lại đoạn cần phân tích."
        )
    end = float(end_seconds) if end_seconds is not None else float(duration or 0)
    if duration:
        end = min(end, float(duration))
    if end - start < 1:
        raise RuntimeError("Đoạn cần phân tích quá ngắn. Hãy chọn lại thời điểm bắt đầu và kết thúc.")
    if start <= 0 and duration and end >= duration:
        return None
    return start, end


# NVIDIA's encoder takes about 20 s for 10 minutes of 720p; libx264 about 45 s, used where there is no NVENC.
_CUT_ENCODERS = (
    ["-c:v", "h264_nvenc", "-preset", "p4", "-cq", "19"],
    ["-c:v", "libx264", "-preset", "veryfast", "-crf", "18"],
)


def cut_video(source: Path, target: Path, start: float, end: float) -> None:
    """
    Writes [start, end) of source to target, starting on an exact frame. The video is re-encoded: a stream copy
    starts at the keyframe before `start` and hides the extra frames in an edit list, and the pipeline, which seeks
    by frame number, would then be off by those frames.
    """
    ffmpeg = os.getenv("FFMPEG_BINARY", "ffmpeg")
    base = [ffmpeg, "-v", "error", "-y", "-ss", f"{start:.3f}", "-i", str(source), "-t", f"{end - start:.3f}", "-an"]
    for encoder in _CUT_ENCODERS:
        try:
            done = subprocess.run([*base, *encoder, str(target)], capture_output=True, text=True)
        except FileNotFoundError as e:
            raise RuntimeError("Máy phân tích chưa cài ffmpeg nên không cắt được đoạn video.") from e
        if done.returncode == 0 and target.exists() and target.stat().st_size > 0:
            logger.info("Cut %s-%s with %s", _clock(start), _clock(end), encoder[1])
            return
        logger.warning("ffmpeg %s could not cut the video: %s", encoder[1], done.stderr.strip()[-300:])
    raise RuntimeError("Không cắt được đoạn video cần phân tích.")


def download_youtube_video(
    url: str,
    local_path: Path,
    start_seconds: float | None = None,
    end_seconds: float | None = None,
) -> tuple[float, float] | None:
    """
    Downloads a YouTube video to local_path with yt-dlp, at most MAX_YOUTUBE_BYTES.

    With start_seconds/end_seconds only that part ends up in local_path, and the (start, end) actually used is
    returned (None for the whole video). The whole video is downloaded first and cut here: yt-dlp's own range
    download streams through ffmpeg, which YouTube throttles to about 0.15 MB/s (a 10-minute part took over
    6 minutes), while the plain download runs at about 8 MB/s (a 55-minute match in 26 s).
    """
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
        # Ranged requests of 10 MB keep YouTube from throttling a long download.
        "http_chunk_size": 10 * 1024 * 1024,
        # Guards against a size estimate that was too low.
        "max_filesize": MAX_YOUTUBE_BYTES,
    }
    source_path = local_path
    try:
        with yt_dlp.YoutubeDL(options) as ydl:
            info = ydl.extract_info(url, download=False)
        if info.get("is_live"):
            raise RuntimeError("Video đang phát trực tiếp. Hãy đợi buổi phát kết thúc rồi phân tích.")
        segment = youtube_segment(info.get("duration"), start_seconds, end_seconds)
        if segment is not None:
            source_path = local_path.with_name(f"{local_path.stem}_source{local_path.suffix}")
            options = {**options, "outtmpl": str(source_path), "max_filesize": MAX_YOUTUBE_SOURCE_BYTES}
        fmt = choose_youtube_format(info, options["max_filesize"])
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
    if not source_path.exists():
        raise RuntimeError("Video YouTube vượt giới hạn dung lượng hoặc YouTube không trả về file cho link này.")
    logger.info("Downloaded %.2f MB from YouTube", source_path.stat().st_size / (1024 * 1024))
    if segment is not None:
        try:
            cut_video(source_path, local_path, *segment)
        finally:
            source_path.unlink(missing_ok=True)
    return segment
