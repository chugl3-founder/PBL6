"""PostgreSQL connection and analysis-status operations."""

from __future__ import annotations

import logging

import psycopg2

from app.config import settings

logger = logging.getLogger(__name__)


def get_connection():
    return psycopg2.connect(
        dbname=settings.db_name,
        user=settings.db_user,
        password=settings.db_password,
        host=settings.db_host,
        port=settings.db_port,
    )


def update_analysis_status(
    analysis_id: int,
    status: str,
    error_message: str | None = None,
) -> None:
    try:
        with get_connection() as connection, connection.cursor() as cursor:
            if status == "PROCESSING":
                cursor.execute(
                    """
                    UPDATE ai_analyses
                    SET status = %s, started_at = NOW(), updated_at = NOW()
                    WHERE id = %s
                    """,
                    (status, analysis_id),
                )
            elif status == "FAILED":
                cursor.execute(
                    """
                    UPDATE ai_analyses
                    SET status = %s, error_message = %s,
                        completed_at = NOW(), updated_at = NOW()
                    WHERE id = %s
                    """,
                    (status, error_message, analysis_id),
                )
    except Exception:
        logger.exception("Failed to update analysis %s status", analysis_id)
