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


def fetch_court_player_names(match_id: int) -> tuple[str, str]:
    """Return (upper, lower) player names so AI insights name real players."""
    try:
        with get_connection() as connection, connection.cursor() as cursor:
            cursor.execute(
                "SELECT player_a_name, player_b_name, upper_player FROM matches WHERE id = %s",
                (match_id,),
            )
            row = cursor.fetchone()
    except Exception:
        logger.exception("Failed to load player names for match %s", match_id)
        row = None
    if not row:
        return "Player Upper", "Player Lower"
    player_a, player_b, upper_player = row
    return (player_a, player_b) if upper_player == "PLAYER_A" else (player_b, player_a)
