package com.badminton.service.coach;

import com.badminton.dto.analysis.AiEventResponse;
import com.badminton.dto.analysis.RallyResponse;
import com.badminton.entity.match.Match;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * Finds the rallies of one match that fit what the user asked for ("the points Axelsen won with a smash in
 * game 2"). Each rally is described by its last shot and who hit it, taken from the stroke events. The AI
 * sometimes misses the last hit (a shot into the net), so the ending is a tendency, not a confirmed error.
 */
final class RallySearch {

    /** The answer lists at most 10 rallies; returning more only made the model write long lists that got cut off. */
    static final int DEFAULT_LIMIT = 10;
    static final int MAX_LIMIT = 20;
    private static final int MAX_SEQUENCE = 25;
    private static final BigDecimal EDGE = new BigDecimal("0.05");

    static final Map<String, String> STROKE_LABELS = Map.of(
            "SMASH", "đập cầu",
            "DROP", "bỏ nhỏ",
            "CLEAR", "phông cầu",
            "SERVE", "giao cầu",
            "LIFT", "hất cầu",
            "DRIVE", "tạt cầu",
            "NET_SHOT", "kéo lưới",
            "NET_ATTACK", "vồ lưới",
            "PUSH", "đẩy cầu",
            "UNKNOWN", "cú khác");

    /** Every filter is optional; player filters are PLAYER_A or PLAYER_B, stroke filters stroke codes. */
    record Filter(Integer game, String winner, String lastHitter, String lastStroke, String containsStroke,
                  String outcome, Integer minStrokes, Integer maxStrokes, int limit) {
    }

    private RallySearch() {
    }

    /** The stroke code for a code or a Vietnamese/English name ("smash", "đập cầu", "net shot"), or null. */
    static String strokeCode(String text) {
        if (text == null || text.isBlank()) {
            return null;
        }
        String t = text.trim().toLowerCase(Locale.ROOT).replace('-', ' ').replace('_', ' ');
        for (Map.Entry<String, String> e : STROKE_LABELS.entrySet()) {
            if (t.equals(e.getKey().toLowerCase(Locale.ROOT).replace('_', ' ')) || t.equals(e.getValue())) {
                return e.getKey();
            }
        }
        if (t.contains("smash") || t.contains("đập")) return "SMASH";
        if (t.contains("drop") || t.contains("bỏ nhỏ") || t.contains("cắt")) return "DROP";
        if (t.contains("clear") || t.contains("phông")) return "CLEAR";
        if (t.contains("serve") || t.contains("giao")) return "SERVE";
        if (t.contains("lift") || t.contains("hất") || t.contains("lốp")) return "LIFT";
        if (t.contains("drive") || t.contains("tạt")) return "DRIVE";
        if (t.contains("kill") || t.contains("vồ") || t.contains("net attack")) return "NET_ATTACK";
        if (t.contains("net") || t.contains("lưới")) return "NET_SHOT";
        if (t.contains("push") || t.contains("đẩy")) return "PUSH";
        return null;
    }

    /** PLAYER_A or PLAYER_B for a name (or part of one), or null when it names neither or both. */
    static String playerKey(Match match, String name) {
        if (name == null || name.isBlank()) {
            return null;
        }
        String n = name.trim().toLowerCase(Locale.ROOT);
        boolean a = match.getPlayerAName() != null && match.getPlayerAName().toLowerCase(Locale.ROOT).contains(n);
        boolean b = match.getPlayerBName() != null && match.getPlayerBName().toLowerCase(Locale.ROOT).contains(n);
        if (a == b) {
            // "A"/"B" or "player_a" also work.
            if (n.equals("a") || n.equals("player_a")) return "PLAYER_A";
            if (n.equals("b") || n.equals("player_b")) return "PLAYER_B";
            return null;
        }
        return a ? "PLAYER_A" : "PLAYER_B";
    }

    static Map<String, Object> search(Match match, List<RallyResponse> rallies, List<AiEventResponse> events, Filter f) {
        Map<Long, AiEventResponse> byId = new HashMap<>();
        for (AiEventResponse e : events) {
            if (e.getId() != null) {
                byId.put(e.getId(), e);
            }
        }
        List<AiEventResponse> sorted = events.stream()
                .filter(e -> e.getTimeSeconds() != null)
                .sorted(Comparator.comparing(AiEventResponse::getTimeSeconds))
                .toList();

        List<Map<String, Object>> found = new ArrayList<>();
        Map<String, Integer> byLastStroke = new LinkedHashMap<>();
        int matched = 0;
        for (RallyResponse r : rallies) {
            List<AiEventResponse> hits = hitsOf(r, sorted);
            AiEventResponse last = r.getEndEventId() != null && byId.containsKey(r.getEndEventId())
                    ? byId.get(r.getEndEventId())
                    : hits.isEmpty() ? null : hits.get(hits.size() - 1);
            String lastStroke = last != null && last.getStroke() != null ? last.getStroke().toUpperCase(Locale.ROOT) : null;
            String lastHitter = last != null ? hitter(match, r, last.getPlayerSide()) : null;
            int strokes = r.getTotalStrokes() != null ? r.getTotalStrokes() : hits.size();

            if (f.game() != null && !f.game().equals(r.getGameNumber())) continue;
            if (f.winner() != null && !f.winner().equals(r.getWinnerPlayer())) continue;
            if (f.lastHitter() != null && !f.lastHitter().equals(lastHitter)) continue;
            if (f.lastStroke() != null && !f.lastStroke().equals(lastStroke)) continue;
            if (f.minStrokes() != null && strokes < f.minStrokes()) continue;
            if (f.maxStrokes() != null && strokes > f.maxStrokes()) continue;
            if (f.containsStroke() != null && hits.stream().noneMatch(h -> f.containsStroke().equalsIgnoreCase(h.getStroke()))) continue;
            if (f.outcome() != null) {
                if (r.getWinnerPlayer() == null || lastHitter == null) continue;
                boolean winnerShot = lastHitter.equals(r.getWinnerPlayer());
                if ("WINNER_SHOT".equals(f.outcome()) != winnerShot) continue;
            }

            matched++;
            if (lastStroke != null) {
                byLastStroke.merge(label(lastStroke), 1, Integer::sum);
            }
            if (found.size() >= f.limit()) {
                continue;
            }
            Map<String, Object> m = new LinkedHashMap<>();
            m.put("rally_number", r.getRallyNumber());
            m.put("game", r.getGameNumber());
            m.put("start_clock", CoachTools.clock(r.getStartTime()));
            m.put("duration_seconds", r.getDuration() == null ? null : r.getDuration().setScale(1, RoundingMode.HALF_UP));
            m.put("strokes_count", strokes);
            m.put("winner", name(match, r.getWinnerPlayer()));
            if (r.getScoreA() != null && r.getScoreB() != null) {
                m.put("score_after", match.getPlayerAName() + " " + r.getScoreA() + " - " + r.getScoreB() + " " + match.getPlayerBName());
            }
            if (lastStroke != null) {
                m.put("last_stroke", label(lastStroke));
                m.put("last_hitter", name(match, lastHitter));
                if (r.getWinnerPlayer() != null && lastHitter != null) {
                    m.put("ending", lastHitter.equals(r.getWinnerPlayer())
                            ? name(match, lastHitter) + " ăn điểm bằng cú " + label(lastStroke)
                            : name(match, lastHitter) + " mất điểm sau cú " + label(lastStroke) + " (thường là cú hỏng)");
                }
            }
            m.put("stroke_sequence", hits.stream().limit(MAX_SEQUENCE).map(h -> label(h.getStroke())).toList());
            found.add(m);
        }

        Map<String, Object> res = new LinkedHashMap<>();
        res.put("match_id", match.getId());
        res.put("total_matched", matched);
        res.put("returned", found.size());
        res.put("by_last_stroke", byLastStroke);
        res.put("rallies", found);
        res.put("note", "Cú cuối là AI nhận diện; cú hỏng cuối pha đôi khi bị sót, nên hãy nói là xu hướng và mời người dùng xem clip.");
        return res;
    }

    private static List<AiEventResponse> hitsOf(RallyResponse r, List<AiEventResponse> sorted) {
        if (r.getStartTime() == null || r.getEndTime() == null) {
            return List.of();
        }
        BigDecimal from = r.getStartTime().subtract(EDGE);
        BigDecimal to = r.getEndTime().add(EDGE);
        return sorted.stream()
                .filter(e -> e.getTimeSeconds().compareTo(from) >= 0 && e.getTimeSeconds().compareTo(to) <= 0)
                .toList();
    }

    /** Who hit from that half during this rally; players change ends, so it comes from the rally. */
    private static String hitter(Match match, RallyResponse r, String side) {
        String upper = r.getUpperPlayer() != null ? r.getUpperPlayer() : match.getUpperPlayer();
        if (upper == null || side == null) {
            return null;
        }
        String lower = "PLAYER_A".equals(upper) ? "PLAYER_B" : "PLAYER_A";
        return "UPPER".equals(side) ? upper : "LOWER".equals(side) ? lower : null;
    }

    private static String name(Match match, String player) {
        if ("PLAYER_A".equals(player)) return match.getPlayerAName();
        if ("PLAYER_B".equals(player)) return match.getPlayerBName();
        return null;
    }

    static String label(String stroke) {
        if (stroke == null) {
            return STROKE_LABELS.get("UNKNOWN");
        }
        return STROKE_LABELS.getOrDefault(stroke.toUpperCase(Locale.ROOT), stroke.toLowerCase(Locale.ROOT).replace('_', ' '));
    }
}
