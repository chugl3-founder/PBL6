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
