"""Environment-backed worker configuration.

Hỗ trợ nạp cấu hình linh hoạt từ biến môi trường hoặc .env file,
tương thích hoàn toàn với môi trường Docker Compose và chạy độc lập.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _get_env(name: str, default: str = "") -> str:
    return os.getenv(name, default)


@dataclass(frozen=True)
class Settings:
    ai_classifier_root: Path
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
        rabbit_user = _get_env("RABBITMQ_USER", "guest")
        rabbit_pass = _get_env("RABBITMQ_PASS", "guest")
        rabbit_host = _get_env("RABBITMQ_HOST", "rabbitmq")
        rabbit_port = _get_env("RABBITMQ_PORT", "5672")

        default_amqp = f"amqp://{rabbit_user}:{rabbit_pass}@{rabbit_host}:{rabbit_port}/"

        return cls(
            ai_classifier_root=Path(
                os.getenv("AI_CLASSIFIER_ROOT", "../AI_Classifier")
            ).resolve(),
            amqp_url=_get_env("AMQP_URL", default_amqp),
            queue_name=_get_env("RABBITMQ_QUEUE", "badminton.ai.queue"),
            db_host=_get_env("DB_HOST", "postgres"),
            db_port=int(_get_env("DB_PORT", "5432")),
            db_name=_get_env("DB_NAME", _get_env("POSTGRES_DB", "badminton_db")),
            db_user=_get_env("DB_USER", _get_env("POSTGRES_USER", "badminton_user")),
            db_password=_get_env("DB_PASS", _get_env("POSTGRES_PASSWORD", "badminton_password")),
            s3_endpoint=_get_env("S3_ENDPOINT", "http://minio:9000"),
            s3_access_key=_get_env("S3_ACCESS_KEY", _get_env("MINIO_ROOT_USER", "minioadmin")),
            s3_secret_key=_get_env("S3_SECRET_KEY", _get_env("MINIO_ROOT_PASSWORD", "minioadmin")),
            s3_bucket=_get_env("S3_BUCKET", _get_env("S3_BUCKET_VIDEOS", "badminton-videos")),
            s3_region=_get_env("S3_REGION", "ap-southeast-1"),
        )


settings = Settings.from_env()
