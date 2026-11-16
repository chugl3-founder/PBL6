package com.badminton.repository.coach;

import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.util.ArrayList;
import java.util.List;

/**
 * Plain SQL for the AI Coach: the pgvector knowledge search (no JPA mapping for vector columns) and the
 * matches a caller may see with the statistics of their current analysis, one row per match.
 */
@Repository
@RequiredArgsConstructor
public class CoachQueryRepository {

    private final JdbcTemplate jdbcTemplate;

    public record KnowledgeChunk(String category, String sourceFile, String content, double similarity) {
    }

    /** One analysed match with its current statistics (null fields when that analysis has none). */
    public record MatchCard(Long id, String title, String playerAName, String playerBName, String description,
                            Integer totalStrokes, Integer totalRallies, BigDecimal avgStrokesPerRally,
                            BigDecimal avgRallyDuration, Integer forehandCount) {
    }

    /**
     * Chunks most similar to the query embedding, above the threshold.
     *
     * @param embedding the query vector (768 values, gemini-embedding-001)
     * @param category  rules, tactics, techniques or fitness_injury; null for all
     */
    public List<KnowledgeChunk> searchKnowledge(List<Double> embedding, String category, double threshold, int count) {
        String vector = toVectorLiteral(embedding);
        String sql = "SELECT category, source_file, content, similarity FROM match_knowledge(?::vector, ?, ?)"
                + (category != null ? " WHERE category = ?" : "");
        List<Object> args = new ArrayList<>(List.of(vector, threshold, count));
        if (category != null) {
            args.add(category);
        }
        return jdbcTemplate.query(sql, (rs, i) -> new KnowledgeChunk(rs.getString("category"),
                rs.getString("source_file"), rs.getString("content"), rs.getDouble("similarity")), args.toArray());
    }

    /**
     * Analysed matches the caller may see, newest first: published ones, plus their own (userId), or all for an
     * admin. Statistics come from the current analysis, else the latest one.
     */
    public List<MatchCard> visibleAnalysedMatches(Long userId, boolean admin, int limit) {
        String sql = """
                SELECT m.id, m.title, m.player_a_name, m.player_b_name, m.description,
                       s.total_strokes, s.total_rallies, s.avg_strokes_per_rally, s.avg_rally_duration, s.forehand_count
                FROM matches m
                JOIN LATERAL (
                    SELECT ms.* FROM match_statistics ms
                    LEFT JOIN ai_analyses a ON a.id = ms.analysis_id
                    WHERE ms.match_id = m.id
                    ORDER BY a.is_current DESC NULLS LAST, ms.created_at DESC
                    LIMIT 1
                ) s ON TRUE
                WHERE m.deleted_at IS NULL
                """;
        List<Object> args = new ArrayList<>();
        if (!admin) {
            if (userId != null) {
                sql += " AND (m.status = 'PUBLISHED' OR m.owner_id = ?)";
                args.add(userId);
            } else {
                sql += " AND m.status = 'PUBLISHED'";
            }
        }
        sql += " ORDER BY m.id DESC LIMIT ?";
        args.add(limit);
        return jdbcTemplate.query(sql, (rs, i) -> new MatchCard(
                rs.getLong("id"), rs.getString("title"), rs.getString("player_a_name"), rs.getString("player_b_name"),
                rs.getString("description"), (Integer) rs.getObject("total_strokes"),
                (Integer) rs.getObject("total_rallies"), rs.getBigDecimal("avg_strokes_per_rally"),
                rs.getBigDecimal("avg_rally_duration"), (Integer) rs.getObject("forehand_count")), args.toArray());
    }

    private static String toVectorLiteral(List<Double> values) {
        StringBuilder sb = new StringBuilder("[");
        for (int i = 0; i < values.size(); i++) {
            if (i > 0) {
                sb.append(',');
            }
            sb.append(values.get(i));
        }
        return sb.append(']').toString();
    }
}
