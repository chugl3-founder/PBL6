"""Media worker settings.

Reads its own .env first, then falls back to ../ai-worker/.env: both workers share the broker, database and
storage, so a machine already set up for the AI worker needs no extra file.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_HERE = Path(__file__).resolve().parent
load_dotenv(_HERE / ".env")
load_dotenv(_HERE.parent / "ai-worker" / ".env")  # never overrides values already set


def _env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


@dataclass(frozen=True)
class Settings:
    amqp_url: str
    queue_name: str
    db_host: str
    db_port: int
    db_name: str
    db_user: str
    db_password: str
    s3_endpoint: str
    s3_access_key: str
    s3_secret_key: str
    s3_bucket: str
    s3_region: str

    @classmethod
    def from_env(cls) -> "Settings":
        default_amqp = "amqp://{}:{}@{}:{}/".format(
            _env("RABBITMQ_USER", "guest"), _env("RABBITMQ_PASS", "guest"),
            _env("RABBITMQ_HOST", "rabbitmq"), _env("RABBITMQ_PORT", "5672"),
        )
        return cls(
            amqp_url=_env("AMQP_URL", default_amqp),
            # Not RABBITMQ_QUEUE: that one names the AI queue in the shared .env.
            queue_name=_env("MEDIA_QUEUE", "badminton.media.queue"),
            db_host=_env("DB_HOST", "postgres"),
            db_port=int(_env("DB_PORT", "5432")),
            db_name=_env("DB_NAME", _env("POSTGRES_DB", "badminton_db")),
            db_user=_env("DB_USER", _env("POSTGRES_USER", "badminton_user")),
            db_password=_env("DB_PASS", _env("POSTGRES_PASSWORD", "badminton_password")),
            s3_endpoint=_env("S3_ENDPOINT", "http://minio:9000"),
            s3_access_key=_env("S3_ACCESS_KEY", _env("MINIO_ROOT_USER", "minioadmin")),
            s3_secret_key=_env("S3_SECRET_KEY", _env("MINIO_ROOT_PASSWORD", "minioadmin")),
            s3_bucket=_env("S3_BUCKET", _env("S3_BUCKET_VIDEOS", "badminton-videos")),
            s3_region=_env("S3_REGION", "ap-southeast-1"),
        )


settings = Settings.from_env()
