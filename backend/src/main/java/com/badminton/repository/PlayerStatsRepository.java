package com.badminton.repository;

import com.badminton.dto.player.PlayerProfileResponse.LabelCount;
import com.badminton.dto.player.PlayerProfileResponse.Radar;
import com.badminton.dto.player.PlayerProfileResponse.RallyLengthStat;
import com.badminton.dto.player.PlayerProfileResponse.StrokeStat;
import com.badminton.dto.player.PlayerProfileResponse.ZoneCell;
import com.badminton.dto.player.PlayerSummaryResponse;
import lombok.RequiredArgsConstructor;
import org.springframework.jdbc.core.namedparam.MapSqlParameterSource;
import org.springframework.jdbc.core.namedparam.NamedParameterJdbcTemplate;
import org.springframework.stereotype.Repository;

import java.math.BigDecimal;
import java.sql.Date;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Cross-match aggregates for one player. Players have no table of their own: a player is a name on
 * {@code matches} (compared trimmed and case-insensitively), and the court side they played on comes
 * from {@code matches.upper_player}. Only matches the viewer may see are counted: published ones and
 * the viewer's own (viewerId -1 for a guest).
 */
@Repository
@RequiredArgsConstructor
public class PlayerStatsRepository {

    /** The player's matches, their court side, opponent and current completed analysis (if any). */
    private static final String PLAYER_MATCHES = """
            WITH pm AS (
              SELECT m.id AS match_id, m.title, m.match_date, m.status AS match_status,
                     (m.owner_id = :viewerId) AS owned, a.id AS analysis_id,
                     CASE WHEN (lower(trim(m.player_a_name)) = :key) = (m.upper_player = 'PLAYER_A')
                          THEN 'UPPER' ELSE 'LOWER' END AS side,
                     CASE WHEN lower(trim(m.player_a_name)) = :key
                          THEN trim(m.player_a_name) ELSE trim(m.player_b_name) END AS player_name,
                     CASE WHEN lower(trim(m.player_a_name)) = :key
                          THEN trim(m.player_b_name) ELSE trim(m.player_a_name) END AS opponent
              FROM matches m
              LEFT JOIN ai_analyses a ON a.match_id = m.id AND a.is_current AND a.status = 'COMPLETED'
              WHERE m.deleted_at IS NULL
                AND (m.status = 'PUBLISHED' OR m.owner_id = :viewerId)
                AND :key IN (lower(trim(m.player_a_name)), lower(trim(m.player_b_name)))
            )
            """;

    private static final String SCORED = "r.winner_side IN ('UPPER', 'LOWER')";

    private final NamedParameterJdbcTemplate jdbc;

    public record MatchRow(Long matchId, String title, LocalDate matchDate, String status, boolean owned,
                           Long analysisId, String side, String playerName, String opponent, int shots, int won, int lost,
                           Double avgDistance, String playstyle, Radar radar) {
    }

    public List<PlayerSummaryResponse> findPlayers(long viewerId, String search, int limit) {
        String sql = """
                WITH v AS (
                  SELECT m.id AS match_id, m.match_date, a.id AS analysis_id, x.name,
                         CASE WHEN x.is_a = (m.upper_player = 'PLAYER_A') THEN 'UPPER' ELSE 'LOWER' END AS side
                  FROM matches m
                  CROSS JOIN LATERAL (VALUES (trim(m.player_a_name), true), (trim(m.player_b_name), false)) AS x(name, is_a)
                  LEFT JOIN ai_analyses a ON a.match_id = m.id AND a.is_current AND a.status = 'COMPLETED'
                  WHERE m.deleted_at IS NULL AND (m.status = 'PUBLISHED' OR m.owner_id = :viewerId) AND x.name <> ''
                )
                SELECT mode() WITHIN GROUP (ORDER BY v.name) AS display_name,
                  count(DISTINCT v.match_id) AS matches,
                  count(DISTINCT v.analysis_id) AS analyzed,
                  max(v.match_date) AS last_date,
                  coalesce(sum(rs.won), 0) AS won,
                  coalesce(sum(rs.lost), 0) AS lost,
                  coalesce(sum(es.shots), 0) AS shots,
                  round(avg(p.attack_score)) AS attack, round(avg(p.defense_score)) AS defense,
                  round(avg(p.net_control_score)) AS net_control, round(avg(p.shot_variety_score)) AS shot_variety,
                  round(avg(p.consistency_score)) AS consistency, round(avg(p.pace_score)) AS pace,
                  mode() WITHIN GROUP (ORDER BY p.playstyle_label) AS playstyle
                FROM v
                LEFT JOIN LATERAL (
                  SELECT count(*) FILTER (WHERE r.winner_side = v.side) AS won,
                         count(*) FILTER (WHERE %s AND r.winner_side <> v.side) AS lost
                  FROM rallies r WHERE r.analysis_id = v.analysis_id
                ) rs ON true
                LEFT JOIN LATERAL (
                  SELECT count(*) AS shots FROM ai_events e
                  WHERE e.analysis_id = v.analysis_id AND e.player_side = v.side
                ) es ON true
                LEFT JOIN player_analysis_profiles p ON p.analysis_id = v.analysis_id AND p.player_side = v.side
                WHERE lower(v.name) LIKE :search
                GROUP BY lower(v.name)
                ORDER BY count(DISTINCT v.analysis_id) DESC, count(DISTINCT v.match_id) DESC, display_name
                LIMIT :limit
                """.formatted(SCORED);
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("viewerId", viewerId)
                .addValue("search", "%" + escapeLike(search.toLowerCase()) + "%")
                .addValue("limit", limit);
        return jdbc.query(sql, params, (rs, i) -> new PlayerSummaryResponse(
                rs.getString("display_name"),
                rs.getInt("matches"),
                rs.getInt("analyzed"),
                localDate(rs, "last_date"),
                rs.getInt("won"),
                rs.getInt("lost"),
                rs.getInt("shots"),
                radar(rs),
                rs.getString("playstyle")
        ));
    }

    public List<MatchRow> findMatches(long viewerId, String key) {
        String sql = PLAYER_MATCHES + """
                SELECT pm.*,
                  (SELECT count(*) FROM ai_events e WHERE e.analysis_id = pm.analysis_id AND e.player_side = pm.side) AS shots,
                  (SELECT count(*) FROM rallies r WHERE r.analysis_id = pm.analysis_id AND r.winner_side = pm.side) AS won,
                  (SELECT count(*) FROM rallies r WHERE r.analysis_id = pm.analysis_id AND %s AND r.winner_side <> pm.side) AS lost,
                  (SELECT avg(CASE WHEN pm.side = 'UPPER' THEN mm.upper_distance_meters ELSE mm.lower_distance_meters END)
                     FROM rally_movement_metrics mm WHERE mm.analysis_id = pm.analysis_id) AS avg_distance,
                  p.playstyle_label AS playstyle,
                  p.attack_score AS attack, p.defense_score AS defense, p.net_control_score AS net_control,
                  p.shot_variety_score AS shot_variety, p.consistency_score AS consistency, p.pace_score AS pace
                FROM pm
                LEFT JOIN player_analysis_profiles p ON p.analysis_id = pm.analysis_id AND p.player_side = pm.side
                ORDER BY pm.match_date DESC, pm.match_id DESC
                """.formatted(SCORED);
        return jdbc.query(sql, params(viewerId, key), (rs, i) -> new MatchRow(
                rs.getLong("match_id"),
                rs.getString("title"),
                localDate(rs, "match_date"),
                rs.getString("match_status"),
                rs.getBoolean("owned"),
                (Long) rs.getObject("analysis_id", Long.class),
                rs.getString("side"),
                rs.getString("player_name"),
                rs.getString("opponent"),
                rs.getInt("shots"),
                rs.getInt("won"),
                rs.getInt("lost"),
                decimal(rs, "avg_distance"),
                rs.getString("playstyle"),
                radar(rs)
        ));
    }

    /** Every stroke class the player used, with how often it ended a rally they won or lost. */
    public List<StrokeStat> findStrokes(long viewerId, String key) {
        String sql = PLAYER_MATCHES + """
                SELECT e.stroke, count(*) AS total,
                  count(*) FILTER (WHERE r.winner_side = pm.side) AS winners,
                  count(*) FILTER (WHERE %s AND r.winner_side <> pm.side) AS errors
                FROM pm
                JOIN ai_events e ON e.analysis_id = pm.analysis_id AND e.player_side = pm.side
                LEFT JOIN rallies r ON r.analysis_id = e.analysis_id AND r.end_event_id = e.id
                GROUP BY e.stroke
                ORDER BY total DESC
                """.formatted(SCORED);
        return jdbc.query(sql, params(viewerId, key), (rs, i) -> new StrokeStat(
                rs.getString("stroke"), rs.getInt("total"), rs.getInt("winners"), rs.getInt("errors")));
    }

    public Map<String, Integer> findHandSides(long viewerId, String key) {
        String sql = PLAYER_MATCHES + """
                SELECT e.stroke_side, count(*) AS total
                FROM pm JOIN ai_events e ON e.analysis_id = pm.analysis_id AND e.player_side = pm.side
                GROUP BY e.stroke_side
                """;
        Map<String, Integer> sides = new TreeMap<>();
        jdbc.query(sql, params(viewerId, key), rs -> {
            sides.put(rs.getString("stroke_side"), rs.getInt("total"));
        });
        return sides;
    }

    public List<RallyLengthStat> findRallyLengths(long viewerId, String key) {
        String sql = PLAYER_MATCHES + """
                SELECT CASE WHEN r.total_strokes <= 4 THEN 'SHORT'
                            WHEN r.total_strokes <= 9 THEN 'MEDIUM' ELSE 'LONG' END AS bucket,
                  count(*) FILTER (WHERE r.winner_side = pm.side) AS won,
                  count(*) FILTER (WHERE r.winner_side <> pm.side) AS lost
                FROM pm JOIN rallies r ON r.analysis_id = pm.analysis_id AND %s
                GROUP BY 1
                """.formatted(SCORED);
        return jdbc.query(sql, params(viewerId, key), (rs, i) -> new RallyLengthStat(
                rs.getString("bucket"), rs.getInt("won"), rs.getInt("lost")));
    }

    /** The opponent's stroke that ended rallies the player lost. */
    public List<LabelCount> findConcededBy(long viewerId, String key) {
        String sql = PLAYER_MATCHES + """
                SELECT e.stroke, count(*) AS total
                FROM pm
                JOIN rallies r ON r.analysis_id = pm.analysis_id AND %s AND r.winner_side <> pm.side
                JOIN ai_events e ON e.id = r.end_event_id AND e.player_side <> pm.side
                GROUP BY e.stroke
                ORDER BY total DESC
                """.formatted(SCORED);
        return jdbc.query(sql, params(viewerId, key), (rs, i) -> new LabelCount(
                rs.getString("stroke"), rs.getInt("total")));
    }

    /**
     * Court cells (12 along x 6 across) for one layer. Points are mirrored for matches the player
     * played on the upper side, so the player is always on the near half (along 6..11).
     */
    public Map<String, List<ZoneCell>> findZones(long viewerId, String key) {
        String sql = PLAYER_MATCHES + """
                , pts AS (
                  SELECT 'POSITION' AS layer, pm.side, e.player_position_court AS pt
                  FROM pm JOIN ai_events e ON e.analysis_id = pm.analysis_id AND e.player_side = pm.side
                  UNION ALL
                  SELECT 'LANDING', pm.side, e.landing_position_court_proxy
                  FROM pm JOIN ai_events e ON e.analysis_id = pm.analysis_id AND e.player_side = pm.side
                  UNION ALL
                  SELECT 'CONCEDED', pm.side, e.landing_position_court_proxy
                  FROM pm
                  JOIN rallies r ON r.analysis_id = pm.analysis_id AND %s AND r.winner_side <> pm.side
                  JOIN ai_events e ON e.id = r.end_event_id AND e.player_side <> pm.side
                ), norm AS (
                  SELECT layer,
                    CASE WHEN side = 'UPPER' THEN 1 - (pt->>0)::float ELSE (pt->>0)::float END AS x,
                    CASE WHEN side = 'UPPER' THEN 1 - (pt->>1)::float ELSE (pt->>1)::float END AS y
                  FROM pts
                  WHERE jsonb_typeof(pt) = 'array' AND jsonb_array_length(pt) = 2
                    AND jsonb_typeof(pt->0) = 'number' AND jsonb_typeof(pt->1) = 'number'
                )
                SELECT layer,
                  least(11, greatest(0, floor(y * 12)))::int AS along,
                  least(5, greatest(0, floor(x * 6)))::int AS across,
                  count(*) AS total
                FROM norm
                GROUP BY 1, 2, 3
                """.formatted(SCORED);
        Map<String, List<ZoneCell>> layers = new TreeMap<>();
        jdbc.query(sql, params(viewerId, key), rs -> {
            layers.computeIfAbsent(rs.getString("layer"), k -> new ArrayList<>())
                    .add(new ZoneCell(rs.getInt("along"), rs.getInt("across"), rs.getInt("total")));
        });
        return layers;
    }

    /**
     * The last shot of a decided rally in one of the player's matches. x, y: where it landed, mirrored
     * like {@link #findZones} so the player is on the near half; null when not tracked.
     */
    public record RallyEnd(Long matchId, boolean published, String opponent, double rallyStart, double seconds,
                           String stroke, boolean byPlayer, boolean playerWon, Double x, Double y) {
    }

    public List<RallyEnd> findRallyEnds(long viewerId, String key) {
        String sql = PLAYER_MATCHES + """
                SELECT pm.match_id, (pm.match_status = 'PUBLISHED') AS published, pm.opponent,
                  r.start_time, e.time_seconds, e.stroke,
                  (e.player_side = pm.side) AS by_player,
                  (r.winner_side = pm.side) AS player_won,
                  CASE WHEN jsonb_typeof(e.landing_position_court_proxy->0) = 'number'
                            AND jsonb_typeof(e.landing_position_court_proxy->1) = 'number' THEN
                    CASE WHEN pm.side = 'UPPER' THEN 1 - (e.landing_position_court_proxy->>0)::float
                         ELSE (e.landing_position_court_proxy->>0)::float END END AS x,
                  CASE WHEN jsonb_typeof(e.landing_position_court_proxy->0) = 'number'
                            AND jsonb_typeof(e.landing_position_court_proxy->1) = 'number' THEN
                    CASE WHEN pm.side = 'UPPER' THEN 1 - (e.landing_position_court_proxy->>1)::float
                         ELSE (e.landing_position_court_proxy->>1)::float END END AS y
                FROM pm
                JOIN rallies r ON r.analysis_id = pm.analysis_id AND %s
                JOIN ai_events e ON e.id = r.end_event_id
                ORDER BY pm.match_date DESC, pm.match_id DESC, r.start_time
                """.formatted(SCORED);
        return jdbc.query(sql, params(viewerId, key), (rs, i) -> new RallyEnd(
                rs.getLong("match_id"),
                rs.getBoolean("published"),
                rs.getString("opponent"),
                rs.getDouble("start_time"),
                rs.getDouble("time_seconds"),
                rs.getString("stroke"),
                rs.getBoolean("by_player"),
                rs.getBoolean("player_won"),
                (Double) rs.getObject("x", Double.class),
                (Double) rs.getObject("y", Double.class)
        ));
    }

    private static MapSqlParameterSource params(long viewerId, String key) {
        return new MapSqlParameterSource().addValue("viewerId", viewerId).addValue("key", key);
    }

    private static Radar radar(ResultSet rs) throws SQLException {
        return new Radar(integer(rs, "attack"), integer(rs, "defense"), integer(rs, "net_control"),
                integer(rs, "shot_variety"), integer(rs, "consistency"), integer(rs, "pace"));
    }

    private static Integer integer(ResultSet rs, String column) throws SQLException {
        Object value = rs.getObject(column);
        return value == null ? null : ((Number) value).intValue();
    }

    private static Double decimal(ResultSet rs, String column) throws SQLException {
        BigDecimal value = rs.getBigDecimal(column);
        return value == null ? null : value.doubleValue();
    }

    private static LocalDate localDate(ResultSet rs, String column) throws SQLException {
        Date value = rs.getDate(column);
        return value == null ? null : value.toLocalDate();
    }

    private static String escapeLike(String text) {
        return text.replace("\\", "\\\\").replace("%", "\\%").replace("_", "\\_");
    }
}
