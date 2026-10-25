"""Environment-backed worker configuration.

Secrets deliberately have no source-code defaults. Local development should
load them from an ignored .env file; deployments should inject them through
the container/orchestrator secret store.
"""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

load_dotenv()


def _required(name: str) -> str:
    value = os.getenv(name)
    if not value:
        raise RuntimeError(f"Required environment variable {name} is not configured")
    return value


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
        return cls(
            ai_classifier_root=Path(
                os.getenv("AI_CLASSIFIER_ROOT", "../../../AI_Classifier")
            ).resolve(),
            amqp_url=_required("AMQP_URL"),
            queue_name=os.getenv("RABBITMQ_QUEUE", "badminton.ai.queue"),
            db_host=_required("DB_HOST"),
            db_port=int(os.getenv("DB_PORT", "5432")),
            db_name=os.getenv("DB_NAME", "postgres"),
            db_user=_required("DB_USER"),
            db_password=_required("DB_PASS"),
            s3_endpoint=_required("S3_ENDPOINT"),
            s3_access_key=_required("S3_ACCESS_KEY"),
            s3_secret_key=_required("S3_SECRET_KEY"),
            s3_bucket=os.getenv("S3_BUCKET", "badminton-videos"),
            s3_region=os.getenv("S3_REGION", "ap-southeast-1"),
        )


settings = Settings.from_env()
