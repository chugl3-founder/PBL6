package com.badminton.repository.player;

import com.badminton.dto.player.PlayerProfileResponse.LabelCount;
import com.badminton.dto.player.PlayerProfileResponse.Radar;
import com.badminton.util.PlayerKey;
import com.badminton.dto.player.PlayerProfileResponse.RallyLengthStat;
import com.badminton.dto.player.PlayerProfileResponse.StrokeStat;
import com.badminton.dto.player.PlayerProfileResponse.ZoneCell;
import com.badminton.dto.player.PlayerSummaryResponse;
import com.badminton.service.highlight.HighlightSelector;
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
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeMap;

/**
 * Cross-match aggregates for one player. Players have no table of their own: a player is a name on
 * {@code matches} (compared trimmed and case-insensitively), and the court side they started on comes
 * from {@code matches.upper_player}. Players change ends after every game (and at 11 in game 3), so every
 * rally and stroke is attributed by the side the player stood on at that moment, from
 * {@link HighlightSelector#trackGames}; warm-up and post-match play the AI picked up are left out. Only
 * matches the viewer may see are counted: published ones and the viewer's own (viewerId -1 for a guest).
 */
@Repository
@RequiredArgsConstructor
public class PlayerStatsRepository {

    /** The player's matches, their court side, opponent and current completed analysis (if any). */
    private static final String PLAYER_MATCHES = """
            WITH pm AS (
              SELECT m.id AS match_id, m.title, m.match_date, m.status AS match_status,
                     (m.owner_id = :viewerId) AS owned, a.id AS analysis_id,
                     CASE WHEN (regexp_replace(lower(m.player_a_name), '[^[:alnum:]]+', '', 'g') = :key) = (m.upper_player = 'PLAYER_A')
                          THEN 'UPPER' ELSE 'LOWER' END AS side,
                     CASE WHEN regexp_replace(lower(m.player_a_name), '[^[:alnum:]]+', '', 'g') = :key
                          THEN trim(m.player_a_name) ELSE trim(m.player_b_name) END AS player_name,
                     CASE WHEN regexp_replace(lower(m.player_a_name), '[^[:alnum:]]+', '', 'g') = :key
                          THEN trim(m.player_b_name) ELSE trim(m.player_a_name) END AS opponent
              FROM matches m
              LEFT JOIN ai_analyses a ON a.match_id = m.id AND a.is_current AND a.status = 'COMPLETED'
              WHERE m.deleted_at IS NULL
                AND (m.status = 'PUBLISHED' OR m.owner_id = :viewerId)
                AND :key IN (regexp_replace(lower(m.player_a_name), '[^[:alnum:]]+', '', 'g'), regexp_replace(lower(m.player_b_name), '[^[:alnum:]]+', '', 'g'))
            )
            """;

    private static final String SCORED = "r.winner_side IN ('UPPER', 'LOWER')";

    /**
     * rs: one row per rally of the matches in play, from Java (see {@link #rallySides}): whether the players
     * stand on the other ends than at the start of the video, and whether the rally counts in the match.
     */
    private static final String RALLY_SIDES = """
            , rs AS (
              SELECT * FROM unnest(
                string_to_array(:rsAnalysis, ',')::bigint[], string_to_array(:rsNumber, ',')::int[],
                string_to_array(:rsStart, ',')::numeric[], string_to_array(:rsSwitched, ',')::boolean[],
                string_to_array(:rsCounts, ',')::boolean[]
              ) AS t(analysis_id, rally_number, start_time, switched, counts)
            )
            """;

    /** The player's side flipped: they stand there once the ends are switched. */
    private static final String FLIPPED = "(CASE pm.side WHEN 'UPPER' THEN 'LOWER' ELSE 'UPPER' END)";

    /**
     * pr: the player's rallies that count, with ps, the half the player stood on during the rally.
     * pe: every stroke in the player's matches, with ps, the player's half at that moment (from the latest
     * rally started by then); strokes in play outside the match are left out.
     */
    private static final String PLAYER_PLAY = RALLY_SIDES + """
            , pr AS (
              SELECT pm.match_id, pm.match_date, pm.match_status, pm.opponent, r.analysis_id, r.rally_number,
                     r.start_time, r.total_strokes, r.winner_side, r.end_event_id,
                     CASE WHEN rs.switched THEN %1$s ELSE pm.side END AS ps
              FROM pm
              JOIN rallies r ON r.analysis_id = pm.analysis_id
              JOIN rs ON rs.analysis_id = r.analysis_id AND rs.rally_number = r.rally_number AND rs.counts
            ), pe AS (
              SELECT pm.match_id, e.id, e.analysis_id, e.stroke, e.stroke_side, e.player_side,
                     e.player_position_court, e.landing_position_court_proxy,
                     CASE WHEN coalesce(sw.switched, false) THEN %1$s ELSE pm.side END AS ps
              FROM pm
              JOIN ai_events e ON e.analysis_id = pm.analysis_id
              LEFT JOIN LATERAL (
                SELECT rs.switched, rs.counts FROM rs
                WHERE rs.analysis_id = e.analysis_id AND rs.start_time <= e.time_seconds + 0.05
                ORDER BY rs.start_time DESC LIMIT 1
              ) sw ON true
              WHERE coalesce(sw.counts, true)
            )
            """.formatted(FLIPPED);

    private final NamedParameterJdbcTemplate jdbc;

    public record MatchRow(Long matchId, String title, LocalDate matchDate, String status, boolean owned,
                           Long analysisId, String side, String playerName, String opponent, int shots, int won, int lost,
                           Double avgDistance, String playstyle, Radar radar) {
    }

    public List<PlayerSummaryResponse> findPlayers(long viewerId, String search, int limit) {
        String sql = """
                WITH v AS (
                  SELECT m.id AS match_id, m.match_date, a.id AS analysis_id, x.name,
                         regexp_replace(lower(x.name), '[^[:alnum:]]+', '', 'g') AS name_key,
                         CASE WHEN x.is_a = (m.upper_player = 'PLAYER_A') THEN 'UPPER' ELSE 'LOWER' END AS side
                  FROM matches m
                  CROSS JOIN LATERAL (VALUES (trim(m.player_a_name), true), (trim(m.player_b_name), false)) AS x(name, is_a)
                  LEFT JOIN ai_analyses a ON a.match_id = m.id AND a.is_current AND a.status = 'COMPLETED'
                  WHERE m.deleted_at IS NULL AND (m.status = 'PUBLISHED' OR m.owner_id = :viewerId) AND x.name <> ''
                )
                """ + RALLY_SIDES + """
                SELECT mode() WITHIN GROUP (ORDER BY v.name) AS display_name,
                  count(DISTINCT v.match_id) AS matches,
                  count(DISTINCT v.analysis_id) AS analyzed,
                  max(v.match_date) AS last_date,
                  coalesce(sum(wl.won), 0) AS won,
                  coalesce(sum(wl.lost), 0) AS lost,
                  coalesce(sum(es.shots), 0) AS shots,
                  round(avg(p.attack_score)) AS attack, round(avg(p.defense_score)) AS defense,
                  round(avg(p.net_control_score)) AS net_control, round(avg(p.shot_variety_score)) AS shot_variety,
                  round(avg(p.consistency_score)) AS consistency, round(avg(p.pace_score)) AS pace,
                  mode() WITHIN GROUP (ORDER BY p.playstyle_label) AS playstyle
                FROM v
                LEFT JOIN LATERAL (
                  SELECT count(*) FILTER (WHERE r.winner_side = x.ps) AS won,
                         count(*) FILTER (WHERE %s AND r.winner_side <> x.ps) AS lost
                  FROM rallies r
                  JOIN rs ON rs.analysis_id = r.analysis_id AND rs.rally_number = r.rally_number AND rs.counts
                  CROSS JOIN LATERAL (SELECT CASE WHEN rs.switched
                      THEN (CASE v.side WHEN 'UPPER' THEN 'LOWER' ELSE 'UPPER' END) ELSE v.side END AS ps) x
                  WHERE r.analysis_id = v.analysis_id
                ) wl ON true
                LEFT JOIN LATERAL (
                  SELECT count(*) AS shots FROM ai_events e
                  LEFT JOIN LATERAL (
                    SELECT rs.switched, rs.counts FROM rs
                    WHERE rs.analysis_id = e.analysis_id AND rs.start_time <= e.time_seconds + 0.05
                    ORDER BY rs.start_time DESC LIMIT 1
                  ) sw ON true
                  WHERE e.analysis_id = v.analysis_id AND coalesce(sw.counts, true)
                    AND e.player_side = CASE WHEN coalesce(sw.switched, false)
                      THEN (CASE v.side WHEN 'UPPER' THEN 'LOWER' ELSE 'UPPER' END) ELSE v.side END
                ) es ON true
                LEFT JOIN player_analysis_profiles p ON p.analysis_id = v.analysis_id AND p.player_side = v.side
                WHERE lower(v.name) LIKE :search AND length(v.name_key) > 1
                GROUP BY v.name_key
                HAVING count(DISTINCT v.analysis_id) > 0 AND coalesce(sum(es.shots), 0) > 0
                ORDER BY count(DISTINCT v.analysis_id) DESC, count(DISTINCT v.match_id) DESC, display_name
                LIMIT :limit
                """.formatted(SCORED);
        MapSqlParameterSource params = new MapSqlParameterSource()
                .addValue("viewerId", viewerId)
                .addValue("search", "%" + escapeLike(search.toLowerCase()) + "%")
                .addValue("limit", limit);
        addRallySides(params, viewerId, null);
        return jdbc.query(sql, params, (rs, i) -> new PlayerSummaryResponse(
                rs.getString("display_name"),
                rs.getInt("matches"),
                rs.getInt("analyzed"),
                localDate(rs, "last_date"),
                rs.getInt("won"),
                rs.getInt("lost"),
                rs.getInt("shots"),
                styleRadar(rs, rs.getInt("shots")),
                playstyle(styleRadar(rs, rs.getInt("shots")))
        ));
    }

    public List<MatchRow> findMatches(long viewerId, String key) {
        String sql = PLAYER_MATCHES + PLAYER_PLAY + """
                SELECT pm.*,
                  (SELECT count(*) FROM pe WHERE pe.match_id = pm.match_id AND pe.player_side = pe.ps) AS shots,
                  (SELECT count(*) FROM pr r WHERE r.match_id = pm.match_id AND r.winner_side = r.ps) AS won,
                  (SELECT count(*) FROM pr r WHERE r.match_id = pm.match_id AND %s AND r.winner_side <> r.ps) AS lost,
                  (SELECT avg(CASE WHEN r.ps = 'UPPER' THEN mm.upper_distance_meters ELSE mm.lower_distance_meters END)
                     FROM pr r JOIN rally_movement_metrics mm
                       ON mm.analysis_id = r.analysis_id AND mm.rally_number = r.rally_number
                     WHERE r.match_id = pm.match_id) AS avg_distance,
                  p.playstyle_label AS playstyle,
                  p.attack_score AS attack, p.defense_score AS defense, p.net_control_score AS net_control,
                  p.shot_variety_score AS shot_variety, p.consistency_score AS consistency, p.pace_score AS pace
                FROM pm
                LEFT JOIN player_analysis_profiles p ON p.analysis_id = pm.analysis_id AND p.player_side = pm.side
                ORDER BY pm.match_date DESC, pm.match_id DESC
                """.formatted(SCORED);
        return jdbc.query(sql, playParams(viewerId, key), (rs, i) -> new MatchRow(
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
                playstyle(styleRadar(rs, rs.getInt("shots"))),
                styleRadar(rs, rs.getInt("shots"))
        ));
    }

    /** Every stroke class the player used, with how often it ended a rally they won or lost. */
    public List<StrokeStat> findStrokes(long viewerId, String key) {
        String sql = PLAYER_MATCHES + PLAYER_PLAY + """
                SELECT e.stroke, count(*) AS total,
                  count(*) FILTER (WHERE r.winner_side = r.ps) AS winners,
                  count(*) FILTER (WHERE %s AND r.winner_side <> r.ps) AS errors
                FROM pe e
                LEFT JOIN pr r ON r.analysis_id = e.analysis_id AND r.end_event_id = e.id
                WHERE e.player_side = e.ps
                GROUP BY e.stroke
                ORDER BY total DESC
                """.formatted(SCORED);
        return jdbc.query(sql, playParams(viewerId, key), (rs, i) -> new StrokeStat(
                rs.getString("stroke"), rs.getInt("total"), rs.getInt("winners"), rs.getInt("errors")));
    }

    public Map<String, Integer> findHandSides(long viewerId, String key) {
        String sql = PLAYER_MATCHES + PLAYER_PLAY + """
                SELECT e.stroke_side, count(*) AS total
                FROM pe e WHERE e.player_side = e.ps
                GROUP BY e.stroke_side
                """;
        Map<String, Integer> sides = new TreeMap<>();
        jdbc.query(sql, playParams(viewerId, key), rs -> {
            sides.put(rs.getString("stroke_side"), rs.getInt("total"));
        });
        return sides;
    }

    public List<RallyLengthStat> findRallyLengths(long viewerId, String key) {
        String sql = PLAYER_MATCHES + PLAYER_PLAY + """
                SELECT CASE WHEN r.total_strokes <= 4 THEN 'SHORT'
                            WHEN r.total_strokes <= 9 THEN 'MEDIUM' ELSE 'LONG' END AS bucket,
                  count(*) FILTER (WHERE r.winner_side = r.ps) AS won,
                  count(*) FILTER (WHERE r.winner_side <> r.ps) AS lost
                FROM pr r WHERE %s
                GROUP BY 1
                """.formatted(SCORED);
        return jdbc.query(sql, playParams(viewerId, key), (rs, i) -> new RallyLengthStat(
                rs.getString("bucket"), rs.getInt("won"), rs.getInt("lost")));
    }

    /** The opponent's stroke that ended rallies the player lost. */
    public List<LabelCount> findConcededBy(long viewerId, String key) {
        String sql = PLAYER_MATCHES + PLAYER_PLAY + """
                SELECT e.stroke, count(*) AS total
                FROM pr r
                JOIN ai_events e ON e.id = r.end_event_id AND e.player_side <> r.ps
                WHERE %s AND r.winner_side <> r.ps
                GROUP BY e.stroke
                ORDER BY total DESC
                """.formatted(SCORED);
        return jdbc.query(sql, playParams(viewerId, key), (rs, i) -> new LabelCount(
                rs.getString("stroke"), rs.getInt("total")));
    }

    /**
     * Court cells (12 along x 6 across) for one layer. Points are mirrored for matches the player
     * played on the upper side, so the player is always on the near half (along 6..11).
     */
    public Map<String, List<ZoneCell>> findZones(long viewerId, String key) {
        String sql = PLAYER_MATCHES + PLAYER_PLAY + """
                , pts AS (
                  SELECT 'POSITION' AS layer, e.ps AS side, e.player_position_court AS pt
                  FROM pe e WHERE e.player_side = e.ps
                  UNION ALL
                  SELECT 'LANDING', e.ps, e.landing_position_court_proxy
                  FROM pe e WHERE e.player_side = e.ps
                  UNION ALL
                  SELECT 'CONCEDED', r.ps, e.landing_position_court_proxy
                  FROM pr r
                  JOIN ai_events e ON e.id = r.end_event_id AND e.player_side <> r.ps
                  WHERE %s AND r.winner_side <> r.ps
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
        jdbc.query(sql, playParams(viewerId, key), rs -> {
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
        String sql = PLAYER_MATCHES + PLAYER_PLAY + """
                SELECT r.match_id, (r.match_status = 'PUBLISHED') AS published, r.opponent,
                  r.start_time, e.time_seconds, e.stroke,
                  (e.player_side = r.ps) AS by_player,
                  (r.winner_side = r.ps) AS player_won,
                  CASE WHEN jsonb_typeof(e.landing_position_court_proxy->0) = 'number'
                            AND jsonb_typeof(e.landing_position_court_proxy->1) = 'number' THEN
                    CASE WHEN r.ps = 'UPPER' THEN 1 - (e.landing_position_court_proxy->>0)::float
                         ELSE (e.landing_position_court_proxy->>0)::float END END AS x,
                  CASE WHEN jsonb_typeof(e.landing_position_court_proxy->0) = 'number'
                            AND jsonb_typeof(e.landing_position_court_proxy->1) = 'number' THEN
                    CASE WHEN r.ps = 'UPPER' THEN 1 - (e.landing_position_court_proxy->>1)::float
                         ELSE (e.landing_position_court_proxy->>1)::float END END AS y
                FROM pr r
                JOIN ai_events e ON e.id = r.end_event_id
                WHERE %s
                ORDER BY r.match_date DESC, r.match_id DESC, r.start_time
                """.formatted(SCORED);
        return jdbc.query(sql, playParams(viewerId, key), (rs, i) -> new RallyEnd(
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
        // Callers pass the lower-cased name; the queries compare spelling-free keys (PlayerKey).
        return new MapSqlParameterSource().addValue("viewerId", viewerId).addValue("key", key == null ? null : PlayerKey.of(key));
    }

    /** params plus the rally sides of the player's matches, for queries built on PLAYER_PLAY. */
    private MapSqlParameterSource playParams(long viewerId, String key) {
        MapSqlParameterSource params = params(viewerId, key);
        addRallySides(params, viewerId, key);
        return params;
    }

    /**
     * Fills the rs parameters: for every rally of the viewer's visible analysed matches (only the player's
     * when key is set), whether the players had changed ends since the video started and whether the rally
     * counts in the match. The same walk the replay scores with ({@link HighlightSelector#trackGames}).
     */
    private void addRallySides(MapSqlParameterSource params, long viewerId, String key) {
        String sql = """
                SELECT a.id AS analysis_id, m.upper_player, m.start_game, m.start_score_a, m.start_score_b,
                       r.id, r.rally_number, r.start_time, r.winner_side, r.score_upper, r.score_lower, r.win_reason
                FROM matches m
                JOIN ai_analyses a ON a.match_id = m.id AND a.is_current AND a.status = 'COMPLETED'
                JOIN rallies r ON r.analysis_id = a.id
                WHERE m.deleted_at IS NULL AND (m.status = 'PUBLISHED' OR m.owner_id = :viewerId)
                """ + (key == null ? "" : "  AND :key IN (regexp_replace(lower(m.player_a_name), '[^[:alnum:]]+', '', 'g'), regexp_replace(lower(m.player_b_name), '[^[:alnum:]]+', '', 'g'))\n") + """
                ORDER BY a.id, r.rally_number
                """;
        Map<Long, List<Object[]>> byAnalysis = new LinkedHashMap<>();
        Map<Long, Object[]> matchOf = new LinkedHashMap<>();
        jdbc.query(sql, params(viewerId, key), rs -> {
            long analysisId = rs.getLong("analysis_id");
            matchOf.putIfAbsent(analysisId, new Object[]{rs.getString("upper_player"),
                    rs.getObject("start_game"), rs.getObject("start_score_a"), rs.getObject("start_score_b")});
            byAnalysis.computeIfAbsent(analysisId, k -> new ArrayList<>()).add(new Object[]{
                    rs.getLong("id"), rs.getInt("rally_number"), rs.getBigDecimal("start_time"),
                    rs.getString("winner_side"), rs.getInt("score_upper"), rs.getInt("score_lower"),
                    rs.getString("win_reason")});
        });

        StringBuilder analyses = new StringBuilder(), numbers = new StringBuilder(), starts = new StringBuilder(),
                switched = new StringBuilder(), counts = new StringBuilder();
        for (Map.Entry<Long, List<Object[]>> entry : byAnalysis.entrySet()) {
            Object[] match = matchOf.get(entry.getKey());
            boolean upperIsA = !"PLAYER_B".equalsIgnoreCase((String) match[0]);
            List<HighlightSelector.RallyFacts> facts = new ArrayList<>();
            for (Object[] r : entry.getValue()) {
                facts.add(new HighlightSelector.RallyFacts((Long) r[0], (Integer) r[1], 0, 0, 0, (String) r[3],
                        (Integer) r[4], (Integer) r[5], null, null, true, (String) r[6]));
            }
            Map<Long, HighlightSelector.GameContext> games = HighlightSelector.trackGames(facts, upperIsA,
                    HighlightSelector.Start.of(number(match[1]), number(match[2]), number(match[3])));
            for (Object[] r : entry.getValue()) {
                HighlightSelector.GameContext g = games.get((Long) r[0]);
                separate(analyses).append(entry.getKey());
                separate(numbers).append(r[1]);
                separate(starts).append(((BigDecimal) r[2]).toPlainString());
                separate(switched).append(g.aOnUpper() != upperIsA);
                separate(counts).append(!g.outsideMatch());
            }
        }
        params.addValue("rsAnalysis", analyses.toString())
                .addValue("rsNumber", numbers.toString())
                .addValue("rsStart", starts.toString())
                .addValue("rsSwitched", switched.toString())
                .addValue("rsCounts", counts.toString());
    }

    private static StringBuilder separate(StringBuilder list) {
        return list.isEmpty() ? list : list.append(',');
    }

    private static Integer number(Object value) {
        return value == null ? null : ((Number) value).intValue();
    }

    /** Fewer strokes than this say nothing about a style: no radar and no style label. */
    static final int MIN_STYLE_SHOTS = 30;

    private static Radar styleRadar(ResultSet rs, int shots) throws SQLException {
        return shots >= MIN_STYLE_SHOTS ? radar(rs) : null;
    }

    private static String playstyle(Radar radar) {
        return radar == null ? null : radar.playstyle();
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
