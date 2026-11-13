package com.badminton.repository;

import java.sql.Date;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Timestamp;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.time.ZoneOffset;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;

/**
 * What a highlight request needs, in as few database round trips as possible: Supabase is ~80 ms away, and the
 * JPA path took 7-8 queries (0.5-0.9 s) for one POST /highlights. {@link #load} sends the match context and the
 * rallies of the current analysis together in one call (the same multi-statement technique as
 * {@link AnalysisQueueRepository}); {@link #insertQueued} creates the reel in an autocommit INSERT ... RETURNING.
 */
@Repository
@RequiredArgsConstructor
public class HighlightQueryRepository {

    private static final String LOAD = """
            SELECT m.id, m.player_a_name, m.player_b_name, m.match_date, m.upper_player,
                   m.start_game, m.start_score_a, m.start_score_b, m.owner_id, u.email,
                   a.id, a.status, a.video_duration_seconds,
                   v.storage_path, v.video_source_type, v.youtube_url, v.duration_seconds,
                   EXISTS (SELECT 1 FROM highlight_reels h
                           WHERE h.match_id = m.id AND h.status IN ('QUEUED', 'RENDERING') AND h.updated_at > ?)
            FROM matches m
            JOIN users u ON u.id = m.owner_id
            LEFT JOIN ai_analyses a ON a.match_id = m.id AND a.is_current
            LEFT JOIN videos v ON v.match_id = m.id
            WHERE m.id = ? AND m.deleted_at IS NULL;

            SELECT r.id, r.rally_number, r.start_time, r.end_time, r.total_strokes, r.winner_side,
                   r.score_upper, r.score_lower, r.is_complete, e.stroke, e.player_side
            FROM rallies r
            JOIN ai_analyses a ON a.id = r.analysis_id AND a.is_current
            LEFT JOIN ai_events e ON e.id = r.end_event_id
            WHERE a.match_id = ? AND (NOT ? OR a.status = 'COMPLETED')
            ORDER BY r.rally_number
            """;

    private static final String INSERT = """
            INSERT INTO highlight_reels (match_id, analysis_id, owner_id, title, clips)
            VALUES (?, ?, ?, ?, CAST(? AS jsonb))
            RETURNING id, status, progress_percent, created_at
            """;

    private final JdbcTemplate jdbcTemplate;

    /** Match, owner, current analysis and video; analysis and video fields are null when missing. */
    public record Context(Long matchId, String playerAName, String playerBName, LocalDate matchDate,
                          String upperPlayer, Integer startGame, Integer startScoreA, Integer startScoreB,
                          Long ownerId, String ownerEmail,
                          Long analysisId, String analysisStatus, BigDecimal analysisVideoDuration,
                          String videoStoragePath, String videoSourceType, String youtubeUrl,
                          BigDecimal videoDuration, boolean busy) {
    }

    /** One rally with its last hit, as the highlight selector reads it. */
    public record RallyRow(long id, int rallyNumber, double startTime, double endTime, int totalStrokes,
                           String winnerSide, int scoreUpper, int scoreLower, boolean complete,
                           String endStroke, String endHitterSide) {
    }

    public record Loaded(Context context, List<RallyRow> rallies) {
    }

    public record Inserted(Long id, String status, Integer progressPercent, OffsetDateTime createdAt) {
    }

    /**
     * Empty when the match is missing or deleted. Rallies are those of the current analysis, and only when it
     * is COMPLETED if completedOnly is set.
     *
     * @param activeSince reels updated before this are lost jobs and do not count as busy
     */
    public Optional<Loaded> load(Long matchId, OffsetDateTime activeSince, boolean completedOnly) {
        return Optional.ofNullable(jdbcTemplate.execute(LOAD, (PreparedStatement statement) -> {
            statement.setTimestamp(1, Timestamp.from(activeSince.toInstant()));
            statement.setLong(2, matchId);
            statement.setLong(3, matchId);
            statement.setBoolean(4, completedOnly);
            statement.execute();
            Context context;
            try (ResultSet row = statement.getResultSet()) {
                context = row.next() ? context(row) : null;
            }
            statement.getMoreResults();
            List<RallyRow> rallies = new ArrayList<>();
            try (ResultSet row = statement.getResultSet()) {
                while (row.next()) {
                    rallies.add(rally(row));
                }
            }
            return context == null ? null : new Loaded(context, rallies);
        }));
    }

    public Inserted insertQueued(Long matchId, Long analysisId, Long ownerId, String title, String clipsJson) {
        return jdbcTemplate.queryForObject(INSERT, (row, i) -> new Inserted(
                row.getLong(1), row.getString(2), row.getInt(3),
                row.getTimestamp(4).toInstant().atOffset(ZoneOffset.UTC)),
                matchId, analysisId, ownerId, title, clipsJson);
    }

    private static Context context(ResultSet row) throws SQLException {
        Date date = row.getDate(4);
        return new Context(
                row.getLong(1), row.getString(2), row.getString(3), date != null ? date.toLocalDate() : null,
                row.getString(5), row.getInt(6), row.getInt(7), row.getInt(8),
                row.getLong(9), row.getString(10),
                (Long) row.getObject(11), row.getString(12), row.getBigDecimal(13),
                row.getString(14), row.getString(15), row.getString(16), row.getBigDecimal(17),
                row.getBoolean(18));
    }

    private static RallyRow rally(ResultSet row) throws SQLException {
        return new RallyRow(
                row.getLong(1), row.getInt(2), row.getDouble(3), row.getDouble(4), row.getInt(5),
                row.getString(6), row.getInt(7), row.getInt(8),
                !Boolean.FALSE.equals(row.getObject(9)),
                row.getString(10), row.getString(11));
    }
}
