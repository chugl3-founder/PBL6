package com.badminton.service.coach;

import com.badminton.service.analysis.ReplayDataService;
import com.badminton.service.match.MatchAccessService;
import com.badminton.service.match.MatchResultService;
import com.badminton.service.match.PublicReplayService;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.analysis.AiEventResponse;
import com.badminton.dto.analysis.MatchStatisticsResponse;
import com.badminton.dto.player.PlayerSummaryResponse;
import com.badminton.dto.player.TrainingFocusResponse;
import com.badminton.repository.player.PlayerStatsRepository;
import com.badminton.service.player.TrainingFocusService;
import com.badminton.dto.analysis.RallyResponse;
import com.badminton.dto.match.MatchResult;
import com.badminton.entity.match.Match;
import com.badminton.entity.scouting.ScoutingReport;
import com.badminton.repository.coach.CoachQueryRepository;
import com.badminton.repository.scouting.ScoutingReportRepository;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The functions Gemini may call while answering. Each one checks access the same way as the web app: a published
 * match is open to everyone, any other match only to its owner or an admin. Data comes from the same services as
 * the Replay page, so scores, winners and games are per player (players change ends between games).
 * A tool never throws: problems come back as {"error": ...} for the model to explain.
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class CoachTools {

    private static final String PUBLISHED = "PUBLISHED";
    private static final int MAX_RALLIES = 200;

    private final MatchAccessService matchAccess;
    private final PublicReplayService publicReplayService;
    private final ReplayDataService replayDataService;
    private final MatchResultService matchResultService;
    private final ScoutingReportRepository scoutingReportRepository;
    private final CoachQueryRepository coachQueryRepository;
    private final PlayerStatsRepository playerStatsRepository;
    private final TrainingFocusService trainingFocusService;
    private final GeminiClient gemini;
    private final ObjectMapper objectMapper;

    /** Gemini functionDeclarations for the tools below. */
    public ArrayNode declarations() {
        ArrayNode list = objectMapper.createArrayNode();
        declare(list, "search_badminton_knowledge",
                "Tìm tri thức chuyên môn cầu lông: luật BWF, kỹ thuật (smash, drop, footwork), chiến thuật đơn/đôi, thể lực và phòng chấn thương.",
                Map.of("query", prop("string", "Câu hỏi hoặc từ khóa cần tra cứu"),
                        "category", prop("string", "Tùy chọn: rules, tactics, techniques hoặc fitness_injury")),
                List.of("query"));
        declare(list, "get_match_statistics",
                "Thống kê tổng thể một trận: hai tay vợt, tỷ số từng ván, người thắng, tổng số cú đánh, số cú của mỗi tay vợt, thời lượng trung bình pha cầu.",
                Map.of("match_id", prop("integer", "ID trận đấu")), List.of("match_id"));
        declare(list, "get_match_rallies",
                "Danh sách pha cầu của trận theo thứ tự: ván, thời điểm bắt đầu/kết thúc trong video (giây), thời lượng, số cú đánh, tay vợt thắng pha và tỷ số sau pha. Dùng để tìm pha dài nhất, các pha mất điểm, diễn biến tỷ số.",
                Map.of("match_id", prop("integer", "ID trận đấu"),
                        "limit", prop("integer", "Số pha tối đa, mặc định 60")),
                List.of("match_id"));
        declare(list, "find_rallies",
                "Tìm các pha cầu của một trận theo điều kiện: ván, người thắng pha, cú đánh cuối (loại cú và ai đánh), "
                        + "pha có chứa một loại cú, ăn điểm hay đánh hỏng, số cú tối thiểu/tối đa. Trả về từng pha kèm start_clock, "
                        + "cú cuối, chuỗi cú đánh và thống kê theo cú cuối. Dùng khi người dùng muốn xem/lọc các pha cụ thể.",
                Map.of("match_id", prop("integer", "ID trận đấu"),
                        "game", prop("integer", "Tùy chọn: chỉ lấy pha của ván này"),
                        "winner", prop("string", "Tùy chọn: tên tay vợt thắng pha"),
                        "last_hitter", prop("string", "Tùy chọn: tên tay vợt đánh cú cuối của pha"),
                        "last_stroke", prop("string", "Tùy chọn: loại cú cuối: SMASH, DROP, CLEAR, SERVE, LIFT, DRIVE, NET_SHOT, NET_ATTACK, PUSH"),
                        "contains_stroke", prop("string", "Tùy chọn: pha có ít nhất một cú loại này (mã như last_stroke)"),
                        "outcome", prop("string", "Tùy chọn: WINNER_SHOT (cú cuối là của người thắng pha, tức ăn điểm) hoặc ERROR (cú cuối của người thua pha, thường là cú hỏng)"),
                        "min_strokes", prop("integer", "Tùy chọn: số cú tối thiểu trong pha"),
                        "max_strokes", prop("integer", "Tùy chọn: số cú tối đa trong pha"),
                        "limit", prop("integer", "Số pha tối đa trả về, mặc định 10")),
                List.of("match_id"));
        declare(list, "get_training_focus",
                "Điểm yếu chính của một tay vợt qua mọi trận người dùng được xem: các kiểu mất điểm thường gặp nhất "
                        + "(đánh hỏng bằng cú nào, bị đối thủ ăn điểm bằng cú nào), tỷ lệ theo từng trận và xu hướng "
                        + "(đang khắc phục / lộ rõ hơn). Dùng để phân tích điểm yếu và cách khai thác, hoặc theo dõi phong độ.",
                Map.of("player_name", prop("string", "Tên tay vợt (có thể chỉ một phần tên)")),
                List.of("player_name"));
        declare(list, "compare_match_performances",
                "So sánh hai trận: tỷ số, nhịp độ, số pha cầu dài, số điểm mỗi tay vợt giành được.",
                Map.of("match_id_1", prop("integer", "ID trận thứ nhất"), "match_id_2", prop("integer", "ID trận thứ hai")),
                List.of("match_id_1", "match_id_2"));
        declare(list, "get_scouting_report",
                "Báo cáo trinh sát đối thủ mà chính người dùng đã tạo: điểm mạnh, điểm yếu, kế hoạch chiến thuật, ghi chú huấn luyện viên.",
                Map.of("opponent_name", prop("string", "Tên đối thủ")), List.of("opponent_name"));
        declare(list, "recommend_matches",
                "Gợi ý trận đấu phù hợp với phong cách, kỹ thuật và nhịp độ người dùng thích.",
                Map.of("play_style", prop("string", "Ví dụ: tấn công smash, phòng thủ phản công, tốc độ bắt lưới"),
                        "preferred_shots", prop("string", "Ví dụ: jump smash, drop, net kill, bộ chân"),
                        "pace", prop("string", "Ví dụ: marathon giằng co, nhanh gọn, chung kết giải lớn"),
                        "limit", prop("integer", "Số trận, mặc định 3")),
                List.of());
        return list;
    }

    /** Runs one function call; the result is the JSON object sent back as the functionResponse. */
    public Object call(String name, JsonNode args, CoachCaller caller) {
        try {
            return switch (name) {
                case "search_badminton_knowledge" -> searchKnowledge(text(args, "query"), text(args, "category"));
                case "get_match_statistics" -> matchStatistics(args.path("match_id").asLong(), caller);
                case "get_match_rallies" -> Map.of("rallies",
                        matchRallies(args.path("match_id").asLong(), args.path("limit").asInt(60), caller));
                case "find_rallies" -> findRallies(args, caller);
                case "get_training_focus" -> trainingFocus(text(args, "player_name"), caller);
                case "compare_match_performances" ->
                        compare(args.path("match_id_1").asLong(), args.path("match_id_2").asLong(), caller);
                case "get_scouting_report" -> scoutingReport(text(args, "opponent_name"), caller);
                case "recommend_matches" -> Map.of("matches", recommend(text(args, "play_style"),
                        text(args, "preferred_shots"), text(args, "pace"), args.path("limit").asInt(3), caller));
                default -> error("Không có công cụ " + name);
            };
        } catch (ApiException e) {
            return error(e.getMessage());
        } catch (Exception e) {
            log.warn("Coach tool {} failed: {}", name, e.toString());
            return error("Không lấy được dữ liệu lúc này.");
        }
    }

    // ---------------------------------------------------------------- tools

    private Object searchKnowledge(String query, String category) {
        if (query == null) {
            return error("Thiếu nội dung cần tra cứu.");
        }
        String cat = category != null && List.of("rules", "tactics", "techniques", "fitness_injury").contains(category)
                ? category : null;
        List<Map<String, Object>> chunks = new ArrayList<>();
        for (CoachQueryRepository.KnowledgeChunk c : coachQueryRepository.searchKnowledge(gemini.embed(query), cat, 0.40, 4)) {
            chunks.add(Map.of("category", c.category(), "source", c.sourceFile(), "content", c.content(),
                    "similarity", round(c.similarity(), 3)));
        }
        return Map.of("results", chunks);
    }

    private Object matchStatistics(long matchId, CoachCaller caller) {
        Match match = visibleMatch(matchId, caller);
        List<RallyResponse> rallies = inMatch(rallies(match, caller));
        Map<String, Object> res = new LinkedHashMap<>();
        res.put("match_id", match.getId());
        res.put("title", match.getTitle());
        res.put("player_a", match.getPlayerAName());
        res.put("player_b", match.getPlayerBName());
        res.put("status", match.getStatus());
        putResult(res, match);
        res.put("rallies_seen", rallies.size());
        res.put("note", "Video có thể chỉ là một đoạn của trận; tỷ số là những gì thấy được trong video.");
        MatchStatisticsResponse s = statistics(match, caller);
        if (s != null) {
            res.put("total_strokes", s.getTotalStrokes());
            res.put("avg_strokes_per_rally", s.getAvgStrokesPerRally());
            res.put("avg_rally_duration_seconds", s.getAvgRallyDuration());
            res.put("strokes_" + match.getPlayerAName(), s.getPlayerAStrokes());
            res.put("strokes_" + match.getPlayerBName(), s.getPlayerBStrokes());
            res.put("ai_avg_confidence", s.getAvgConfidence());
            // The classifier does not split forehand and backhand yet: 0 and 0 means no data, not no strokes.
            if (positive(s.getForehandCount()) || positive(s.getBackhandCount())) {
                res.put("forehand_count", s.getForehandCount());
                res.put("backhand_count", s.getBackhandCount());
            }
            if (s.getStrokeDistribution() != null && !s.getStrokeDistribution().isEmpty()) {
                res.put("stroke_types", s.getStrokeDistribution());
            }
        }
        return res;
    }

    private List<Map<String, Object>> matchRallies(long matchId, int limit, CoachCaller caller) {
        Match match = visibleMatch(matchId, caller);
        List<Map<String, Object>> out = new ArrayList<>();
        for (RallyResponse r : inMatch(rallies(match, caller))) {
            if (out.size() >= Math.max(1, Math.min(limit, MAX_RALLIES))) {
                break;
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rally_number", r.getRallyNumber());
            m.put("game", r.getGameNumber());
            m.put("start_time_seconds", scale1(r.getStartTime()));
            m.put("start_clock", clock(r.getStartTime()));
            m.put("end_time_seconds", scale1(r.getEndTime()));
            m.put("duration_seconds", scale1(r.getDuration()));
            m.put("strokes_count", r.getTotalStrokes());
            m.put("winner", playerName(match, r.getWinnerPlayer()));
            if (r.getScoreA() != null && r.getScoreB() != null) {
                m.put("score_after", match.getPlayerAName() + " " + r.getScoreA() + " - " + r.getScoreB() + " " + match.getPlayerBName());
            }
            out.add(m);
        }
        return out;
    }

    private Object findRallies(JsonNode args, CoachCaller caller) {
        Match match = visibleMatch(args.path("match_id").asLong(), caller);
        String winner = text(args, "winner");
        String lastHitter = text(args, "last_hitter");
        String winnerKey = RallySearch.playerKey(match, winner);
        String hitterKey = RallySearch.playerKey(match, lastHitter);
        if ((winner != null && winnerKey == null) || (lastHitter != null && hitterKey == null)) {
            return error("Không rõ tay vợt nào: trận này là " + match.getPlayerAName() + " gặp " + match.getPlayerBName() + ".");
        }
        String lastStroke = RallySearch.strokeCode(text(args, "last_stroke"));
        String contains = RallySearch.strokeCode(text(args, "contains_stroke"));
        if ((text(args, "last_stroke") != null && lastStroke == null) || (text(args, "contains_stroke") != null && contains == null)) {
            return error("Không có loại cú này. Các loại cú: " + String.join(", ", RallySearch.STROKE_LABELS.keySet()));
        }
        String outcome = text(args, "outcome");
        outcome = outcome == null ? null : outcome.toUpperCase(Locale.ROOT).contains("ERROR") ? "ERROR" : "WINNER_SHOT";
        int limit = args.path("limit").asInt(RallySearch.DEFAULT_LIMIT);
        RallySearch.Filter filter = new RallySearch.Filter(
                optInt(args, "game"), winnerKey, hitterKey, lastStroke, contains, outcome,
                optInt(args, "min_strokes"), optInt(args, "max_strokes"),
                Math.max(1, Math.min(limit, RallySearch.MAX_LIMIT)));
        return RallySearch.search(match, inMatch(rallies(match, caller)), events(match, caller), filter);
    }

    private Object trainingFocus(String playerName, CoachCaller caller) {
        if (playerName == null) {
            return error("Thiếu tên tay vợt.");
        }
        long viewerId = caller.userId() != null ? caller.userId() : -1L;
        // The model often gives part of a name ("Axelsen"): pick the best-known player that matches.
        List<PlayerSummaryResponse> candidates = playerStatsRepository.findPlayers(viewerId, playerName, 5);
        if (candidates.isEmpty()) {
            return Map.of("message", "Không tìm thấy tay vợt '" + playerName + "' trong các trận người dùng được xem.");
        }
        PlayerSummaryResponse player = candidates.stream()
                .filter(c -> c.name().equalsIgnoreCase(playerName.trim()))
                .findFirst().orElse(candidates.get(0));
        TrainingFocusResponse focus = trainingFocusService.forViewerId(viewerId, player.name());

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("player", focus.player());
        res.put("matches_analyzed", focus.matchesAnalyzed());
        res.put("points_lost", focus.pointsLost());
        if (player.radar() != null) {
            res.put("style_scores_0_100", player.radar());
        }
        List<Map<String, Object>> items = new ArrayList<>();
        for (TrainingFocusResponse.Focus f : focus.focuses()) {
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("weakness", "ERROR".equals(f.kind())
                    ? focus.player() + " mất điểm sau cú " + RallySearch.label(f.stroke()) + " của chính mình (thường là cú hỏng)"
                    : "Đối thủ ăn điểm " + focus.player() + " bằng cú " + RallySearch.label(f.stroke()));
            m.put("count", f.count());
            m.put("share_of_lost_points_percent", f.share());
            m.put("trend", switch (f.trend()) {
                case "IMPROVING" -> "tiến bộ (trận gần nhất ít hơn trước)";
                case "WORSENING" -> "sa sút (trận gần nhất nhiều hơn trước)";
                case "STABLE" -> "giữ nguyên";
                default -> "chưa đủ trận để so sánh";
            });
            m.put("earlier_matches_rate_percent", f.baselineRate());
            m.put("latest_match_rate_percent", f.latestRate());
            m.put("per_match", f.matches().stream().map(p -> {
                Map<String, Object> pm = new LinkedHashMap<>();
                pm.put("match_id", p.matchId());
                pm.put("date", p.matchDate() == null ? null : p.matchDate().toString());
                pm.put("opponent", p.opponent());
                pm.put("count", p.count());
                pm.put("lost", p.lost());
                pm.put("rate_percent", p.rate());
                return pm;
            }).toList());
            items.add(m);
        }
        res.put("focuses", items);
        if (items.isEmpty()) {
            res.put("message", "Chưa đủ pha mất điểm đã xác định để rút ra điểm yếu.");
        }
        res.put("note", "Nhóm theo cú cuối do AI nhận diện; đây là xu hướng, cần xem clip để xác nhận.");
        return res;
    }

    private Object compare(long id1, long id2, CoachCaller caller) {
        Map<String, Object> m1 = summary(visibleMatch(id1, caller), caller);
        Map<String, Object> m2 = summary(visibleMatch(id2, caller), caller);
        Map<String, Object> diff = new LinkedHashMap<>();
        diff.put("strokes_diff", num(m2.get("total_strokes")) - num(m1.get("total_strokes")));
        diff.put("avg_rally_duration_diff_sec", round(num(m2.get("avg_rally_duration_seconds")) - num(m1.get("avg_rally_duration_seconds")), 2));
        diff.put("avg_strokes_diff", round(num(m2.get("avg_strokes_per_rally")) - num(m1.get("avg_strokes_per_rally")), 2));
        diff.put("long_rallies_diff", num(m2.get("long_rallies_count")) - num(m1.get("long_rallies_count")));
        return Map.of("match_1", m1, "match_2", m2, "comparison_summary", diff);
    }

    private Object scoutingReport(String opponent, CoachCaller caller) {
        if (!caller.signedIn()) {
            return Map.of("message", "Báo cáo trinh sát là dữ liệu riêng của từng tài khoản; người dùng cần đăng nhập để xem.");
        }
        if (opponent == null) {
            return error("Thiếu tên đối thủ.");
        }
        String needle = opponent.toLowerCase(Locale.ROOT);
        // Only the caller's own reports: a scouting plan is private to the coach who made it.
        return scoutingReportRepository.findByOwnerIdOrderByUpdatedAtDesc(caller.userId()).stream()
                .filter(r -> r.getOpponentName() != null && r.getOpponentName().toLowerCase(Locale.ROOT).contains(needle))
                .findFirst()
                .<Object>map(this::reportView)
                .orElse(Map.of("message", "Bạn chưa có báo cáo trinh sát nào về đối thủ '" + opponent + "'."));
    }

    private List<Map<String, Object>> recommend(String style, String shots, String pace, int limit, CoachCaller caller) {
        String s = lower(style), sh = lower(shots), p = lower(pace);
        List<Map<String, Object>> scored = new ArrayList<>();
        for (CoachQueryRepository.MatchCard m : coachQueryRepository.visibleAnalysedMatches(caller.userId(), caller.admin(), 200)) {
            int score = 0;
            List<String> reasons = new ArrayList<>();
            String corpus = lower(m.title() + " " + m.playerAName() + " " + m.playerBName() + " " + m.description());
            int strokes = m.totalStrokes() == null ? 0 : m.totalStrokes();
            double avgStrokes = m.avgStrokesPerRally() == null ? 0 : m.avgStrokesPerRally().doubleValue();

            if (anyIn(s + " " + sh, "tấn công", "smash", "áp đảo", "uy lực", "power")) {
                if (anyIn(corpus, "axelsen", "lee zii jia", "shi yuqi", "ginting")) {
                    score += 6;
                    reasons.add("Có những tay đập cầu uy lực hàng đầu thế giới.");
                }
                if (m.forehandCount() != null && strokes > 0 && (double) m.forehandCount() / strokes > 0.55) {
                    score += 3;
                    reasons.add("Tỷ lệ cú thuận tay tấn công cao.");
                }
            }
            if (anyIn(s + " " + sh, "phòng thủ", "kiểm soát", "bền bỉ", "bộ chân", "thủ cầu")) {
                if (anyIn(corpus, "momota", "chou tien chen", "kunlavut")) {
                    score += 6;
                    reasons.add("Lối chơi điều cầu và phòng thủ phản công bậc thầy.");
                }
                if (avgStrokes >= 15) {
                    score += 4;
                    reasons.add("Pha cầu bền bỉ (trung bình " + round(avgStrokes, 1) + " cú/pha).");
                }
            }
            if (anyIn(s + " " + sh, "tốc độ", "lưới", "nhanh", "gài lưới", "net kill", "drop")
                    && anyIn(corpus, "ginting", "lee zii jia")) {
                score += 5;
                reasons.add("Tốc độ bắt lưới và siết lưới nhanh.");
            }
            if (anyIn(p, "marathon", "giằng co", "dài", "nghẹt thở") && strokes >= 700) {
                score += 4;
                reasons.add("Khối lượng vận động lớn (" + strokes + " cú đánh).");
            }
            if (anyIn(p, "chung kết", "giải lớn", "finals", "all england", "world tour")
                    && anyIn(corpus, "finals", "chung kết", "all england", "world tour")) {
                score += 4;
                reasons.add("Trận đấu đỉnh cao ở giải lớn / chung kết.");
            }
            Map<String, Object> item = new LinkedHashMap<>();
            item.put("match_id", m.id());
            item.put("title", m.title());
            item.put("players", m.playerAName() + " vs " + m.playerBName());
            item.put("total_strokes", strokes);
            item.put("avg_strokes_per_rally", round(avgStrokes, 2));
            item.put("match_reasons", reasons.isEmpty() ? List.of("Trận đấu hội tụ nhiều kỹ năng đỉnh cao đáng học hỏi.") : reasons);
            item.put("relevance_score", score);
            scored.add(item);
        }
        scored.sort(Comparator.comparingInt((Map<String, Object> m) -> (Integer) m.get("relevance_score")).reversed());
        return scored.subList(0, Math.min(Math.max(1, limit), scored.size()));
    }

    // ---------------------------------------------------------------- helpers

    /** The match if the caller may see it: published, or owned by the caller, or the caller is an admin. */
    private Match visibleMatch(long matchId, CoachCaller caller) {
        Match match = matchAccess.findActive(matchId);
        if (PUBLISHED.equals(match.getStatus())) {
            return match;
        }
        try {
            matchAccess.requireOwnerOrAdmin(match, caller.email());
        } catch (ApiException e) {
            throw ApiException.forbidden("QUYỀN RIÊNG TƯ: Trận đấu #" + matchId
                    + " là trận riêng tư của người dùng khác. Không được xem hoặc phân tích số liệu trận này.");
        }
        return match;
    }

    private List<RallyResponse> rallies(Match match, CoachCaller caller) {
        return PUBLISHED.equals(match.getStatus())
                ? publicReplayService.getRallies(match.getId())
                : replayDataService.getRallies(match.getId(), caller.email());
    }

    private List<AiEventResponse> events(Match match, CoachCaller caller) {
        try {
            return PUBLISHED.equals(match.getStatus())
                    ? publicReplayService.getEvents(match.getId())
                    : replayDataService.getEvents(match.getId(), caller.email());
        } catch (ApiException e) {
            return List.of();
        }
    }

    /** Statistics of the current analysis, or null when the match has none yet. */
    private MatchStatisticsResponse statistics(Match match, CoachCaller caller) {
        try {
            return PUBLISHED.equals(match.getStatus())
                    ? publicReplayService.getStatistics(match.getId())
                    : replayDataService.getStatistics(match.getId(), caller.email());
        } catch (ApiException e) {
            return null;
        }
    }

    /** Rallies of the match itself, without play the AI picked up after it was won. */
    private static List<RallyResponse> inMatch(List<RallyResponse> rallies) {
        return rallies.stream().filter(r -> !Boolean.TRUE.equals(r.getAfterMatch()) && !Boolean.TRUE.equals(r.getBeforeMatch())).toList();
    }

    /** score_by_game and winner, from the same result as the match cards. */
    private void putResult(Map<String, Object> res, Match match) {
        MatchResult result = matchResultService.resultsFor(List.of(match)).get(match.getId());
        if (result == null || result.games().isEmpty()) {
            res.put("score_by_game", "chưa có dữ liệu tỷ số");
            res.put("winner", "chưa xác định");
            return;
        }
        // The video may start in a later game (start_game); games follow on from it.
        int firstGame = match.getStartGame() != null ? match.getStartGame() : 1;
        List<String> games = new ArrayList<>();
        for (int i = 0; i < result.games().size(); i++) {
            MatchResult.GameScore g = result.games().get(i);
            games.add("ván " + (firstGame + i) + ": " + g.scoreA() + "-" + g.scoreB() + (g.finished() ? "" : " (chưa xong)"));
        }
        res.put("score_by_game", match.getPlayerAName() + " - " + match.getPlayerBName() + ": " + String.join(", ", games));
        String winner = playerName(match, result.winner());
        res.put("winner", winner != null ? winner : "chưa xác định (video chưa thấy hết trận)");
    }

    private Map<String, Object> summary(Match match, CoachCaller caller) {
        List<RallyResponse> rallies = inMatch(rallies(match, caller));
        MatchStatisticsResponse s = statistics(match, caller);
        Map<String, Integer> points = new LinkedHashMap<>();
        RallyResponse longest = null;
        int longRallies = 0;
        for (RallyResponse r : rallies) {
            String winner = playerName(match, r.getWinnerPlayer());
            if (winner != null) {
                points.merge(winner, 1, Integer::sum);
            }
            if (r.getTotalStrokes() != null && r.getTotalStrokes() >= 15) {
                longRallies++;
            }
            if (r.getDuration() != null && (longest == null || r.getDuration().compareTo(longest.getDuration()) > 0)) {
                longest = r;
            }
        }
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("match_id", match.getId());
        m.put("title", match.getTitle());
        m.put("player_a", match.getPlayerAName());
        m.put("player_b", match.getPlayerBName());
        putResult(m, match);
        m.put("points_won_in_video", points);
        m.put("total_rallies", rallies.size());
        m.put("total_strokes", s != null && s.getTotalStrokes() != null ? s.getTotalStrokes() : 0);
        m.put("avg_strokes_per_rally", s != null ? s.getAvgStrokesPerRally() : null);
        m.put("avg_rally_duration_seconds", s != null ? s.getAvgRallyDuration() : null);
        m.put("long_rallies_count", longRallies);
        if (longest != null) {
            Map<String, Object> l = new LinkedHashMap<>();
            l.put("rally_number", longest.getRallyNumber());
            l.put("start_time_seconds", scale1(longest.getStartTime()));
            l.put("start_clock", clock(longest.getStartTime()));
            l.put("duration_seconds", scale1(longest.getDuration()));
            l.put("strokes_count", longest.getTotalStrokes());
            m.put("longest_rally", l);
        }
        return m;
    }

    private Map<String, Object> reportView(ScoutingReport r) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("title", r.getTitle());
        m.put("opponent", r.getOpponentName());
        m.put("own_player", r.getOwnPlayerName());
        m.put("coach_notes", r.getCoachNotes());
        String plan = r.getPlanData();
        m.put("plan_data", plan != null && plan.length() > 6000 ? plan.substring(0, 6000) + "..." : plan);
        return m;
    }

    private static String playerName(Match match, String player) {
        if ("PLAYER_A".equals(player)) {
            return match.getPlayerAName();
        }
        if ("PLAYER_B".equals(player)) {
            return match.getPlayerBName();
        }
        return null;
    }

    private void declare(ArrayNode list, String name, String description, Map<String, ObjectNode> props, List<String> required) {
        ObjectNode fn = list.addObject();
        fn.put("name", name);
        fn.put("description", description);
        ObjectNode params = fn.putObject("parameters");
        params.put("type", "object");
        ObjectNode properties = params.putObject("properties");
        props.forEach(properties::set);
        ArrayNode req = params.putArray("required");
        required.forEach(req::add);
    }

    private ObjectNode prop(String type, String description) {
        ObjectNode p = objectMapper.createObjectNode();
        p.put("type", type);
        p.put("description", description);
        return p;
    }

    private static Map<String, Object> error(String message) {
        return Map.of("error", message);
    }

    private static String text(JsonNode args, String field) {
        JsonNode v = args.path(field);
        return v.isTextual() && !v.asText().isBlank() ? v.asText().trim() : null;
    }

    private static Integer optInt(JsonNode args, String field) {
        JsonNode v = args.path(field);
        return v.canConvertToInt() && !v.isNull() && !v.isMissingNode() ? v.asInt() : null;
    }

    private static String lower(String s) {
        return s == null ? "" : s.toLowerCase(Locale.ROOT);
    }

    private static boolean anyIn(String haystack, String... needles) {
        for (String n : needles) {
            if (haystack.contains(n)) {
                return true;
            }
        }
        return false;
    }

    private static boolean positive(Integer v) {
        return v != null && v > 0;
    }

    private static double num(Object v) {
        return v instanceof Number n ? n.doubleValue() : 0;
    }

    private static double round(double v, int places) {
        return BigDecimal.valueOf(v).setScale(places, RoundingMode.HALF_UP).doubleValue();
    }

    private static BigDecimal scale1(BigDecimal v) {
        return v == null ? null : v.setScale(1, RoundingMode.HALF_UP);
    }

    /**
     * A time in the video as "mm:ss" for the rally links "[Pha cầu #X - mm:ss]"; minutes go past 59
     * ("65:30") so the link format stays the same. The model copies it: converting 3725 seconds by
     * itself it got times wrong, worst on the later part of a long YouTube video.
     */
    static String clock(BigDecimal seconds) {
        if (seconds == null) {
            return null;
        }
        int total = Math.max(0, seconds.setScale(0, RoundingMode.FLOOR).intValue());
        return String.format("%02d:%02d", total / 60, total % 60);
    }
}
