package com.badminton.repository;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.util.Optional;

/**
 * Creates a QUEUED analysis in one database round trip, so a burst of dispatches does not wait for connections.
 * The driver sends both statements together in an autocommit call: they run in order and in a single transaction.
 * The order matters because uq_ai_analyses_current_per_match allows one current analysis per match.
 */
@Repository
@RequiredArgsConstructor
public class AnalysisQueueRepository {

    private static final String DISPATCHABLE_MATCH = """
            SELECT m.id FROM matches m
            JOIN users u ON u.id = m.owner_id
            JOIN videos v ON v.match_id = m.id
            WHERE m.id = ? AND m.deleted_at IS NULL AND u.email = ? AND UPPER(v.status) IN ('READY', 'UPLOADED')
            """;

    private static final String CREATE_QUEUED_ANALYSIS = """
            UPDATE ai_analyses SET is_current = FALSE
            WHERE is_current AND match_id IN (%1$s);

            WITH analyzing AS (
                UPDATE matches SET status = 'ANALYZING', updated_at = NOW()
                WHERE id IN (%1$s)
                RETURNING id
            ), created AS (
                INSERT INTO ai_analyses (match_id, video_id, status, model_name, model_version, is_current)
                SELECT v.match_id, v.id, 'QUEUED', 'CoachAI+', '2.0_pbl6_coachai', TRUE
                FROM videos v JOIN analyzing a ON a.id = v.match_id
                RETURNING id, video_id
            )
            SELECT c.id, v.storage_path, v.video_source_type, v.youtube_url FROM created c JOIN videos v ON v.id = c.video_id
            """.formatted(DISPATCHABLE_MATCH);

    private final JdbcTemplate jdbcTemplate;

    public record QueuedAnalysis(Long analysisId, String videoStoragePath, String videoSourceType, String youtubeUrl) {
        public boolean fromYoutube() {
            return "YOUTUBE".equalsIgnoreCase(videoSourceType) && youtubeUrl != null;
        }
    }

    /** Empty when the match is missing or deleted, the user is not its owner, or its video is not ready. */
    public Optional<QueuedAnalysis> createQueuedAnalysis(Long matchId, String ownerEmail) {
        QueuedAnalysis queued = jdbcTemplate.execute(CREATE_QUEUED_ANALYSIS, (PreparedStatement statement) -> {
            statement.setLong(1, matchId);
            statement.setString(2, ownerEmail);
            statement.setLong(3, matchId);
            statement.setString(4, ownerEmail);
            statement.execute();
            statement.getMoreResults();
            try (ResultSet row = statement.getResultSet()) {
                return row.next() ? new QueuedAnalysis(row.getLong(1), row.getString(2), row.getString(3), row.getString(4)) : null;
            }
        });
        return Optional.ofNullable(queued);
    }
}
