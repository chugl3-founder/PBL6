package com.badminton.service.player;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.player.TrainingFocusResponse;
import com.badminton.dto.player.TrainingFocusResponse.Clip;
import com.badminton.dto.player.TrainingFocusResponse.Focus;
import com.badminton.dto.player.TrainingFocusResponse.MatchPoint;
import com.badminton.entity.user.User;
import com.badminton.repository.player.PlayerStatsRepository;
import com.badminton.repository.player.PlayerStatsRepository.MatchRow;
import com.badminton.repository.player.PlayerStatsRepository.RallyEnd;
import com.badminton.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.ArrayList;
import java.util.Comparator;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;

/**
 * The ways a player loses points most often, match by match. A lost rally is grouped by its last shot: the
 * player's own (kind ERROR, usually a shot into the net or out) or the opponent's (kind CONCEDED). The AI
 * sometimes misses the last hit of a rally, so a group is a tendency to check on video, not a verdict.
 */
@Service
@RequiredArgsConstructor
public class TrainingFocusService {

    private static final long GUEST = -1L;
    private static final int MAX_NAME_LENGTH = 100;
    /** Focus areas returned, most frequent first. */
    private static final int MAX_FOCUSES = 3;
    /** A way of losing points must happen at least this often to be worth training. */
    private static final int MIN_COUNT = 2;
    /** A match needs this many lost points before its rate means anything. */
    private static final int MIN_LOST_FOR_RATE = 3;
    /** Percentage points of change in the latest match that count as a real move. */
    private static final int TREND_THRESHOLD = 8;
    private static final int MAX_CLIPS = 6;

    private final PlayerStatsRepository playerStatsRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public TrainingFocusResponse forViewer(String viewerEmail, String name) {
        return forViewerId(viewerId(viewerEmail), name);
    }

    /** viewerId -1 is a guest: only published matches count. */
    @Transactional(readOnly = true)
    public TrainingFocusResponse forViewerId(long viewerId, String name) {
        String key = name == null ? "" : name.trim().toLowerCase(Locale.ROOT);
        if (key.isEmpty() || key.length() > MAX_NAME_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_INVALID_PLAYER_NAME",
                    "Tên vận động viên không hợp lệ");
        }
        List<MatchRow> rows = playerStatsRepository.findMatches(viewerId, key);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, ErrorType.SYSTEM, "ERR_PLAYER_NOT_FOUND",
                    "Không tìm thấy vận động viên trong các trận bạn được xem");
        }
        List<RallyEnd> ends = playerStatsRepository.findRallyEnds(viewerId, key);
        return build(rows, ends);
    }

    /** Pure: the focus areas from the player's matches and the last shots of their decided rallies. */
    static TrainingFocusResponse build(List<MatchRow> rows, List<RallyEnd> ends) {
        // Oldest match first, so a trend reads left to right.
        List<MatchRow> chronological = rows.stream()
                .filter(r -> r.analysisId() != null)
                .sorted(Comparator.comparing(MatchRow::matchDate, Comparator.nullsFirst(Comparator.naturalOrder()))
                        .thenComparing(MatchRow::matchId))
                .toList();

        Map<Long, Integer> lostByMatch = new HashMap<>();
        Map<String, Group> groups = new LinkedHashMap<>();
        for (RallyEnd e : ends) {
            if (e.playerWon()) {
                continue;
            }
            lostByMatch.merge(e.matchId(), 1, Integer::sum);
            String stroke = e.stroke() == null ? "UNKNOWN" : e.stroke().toUpperCase(Locale.ROOT);
            if ("UNKNOWN".equals(stroke)) {
                continue; // nothing to train from "some other shot"
            }
            String kind = e.byPlayer() ? "ERROR" : "CONCEDED";
            groups.computeIfAbsent(kind + ":" + stroke, k -> new Group(kind, stroke)).add(e);
        }
        int totalLost = lostByMatch.values().stream().mapToInt(Integer::intValue).sum();

        List<Focus> focuses = groups.values().stream()
                .filter(g -> g.ends.size() >= MIN_COUNT)
                .sorted(Comparator.comparingInt((Group g) -> g.ends.size()).reversed())
                .limit(MAX_FOCUSES)
                .map(g -> g.toFocus(chronological, lostByMatch, totalLost))
                .toList();

        String player = rows.get(0).playerName();
        return new TrainingFocusResponse(player, (int) chronological.stream()
                .filter(r -> lostByMatch.containsKey(r.matchId())).count(), totalLost, focuses);
    }

    private static final class Group {
        final String kind;
        final String stroke;
        final List<RallyEnd> ends = new ArrayList<>();

        Group(String kind, String stroke) {
            this.kind = kind;
            this.stroke = stroke;
        }

        void add(RallyEnd e) {
            ends.add(e);
        }

        Focus toFocus(List<MatchRow> chronological, Map<Long, Integer> lostByMatch, int totalLost) {
            Map<Long, Integer> countByMatch = new HashMap<>();
            ends.forEach(e -> countByMatch.merge(e.matchId(), 1, Integer::sum));

            List<MatchPoint> points = new ArrayList<>();
            for (MatchRow m : chronological) {
                int lost = lostByMatch.getOrDefault(m.matchId(), 0);
                if (lost == 0) {
                    continue; // no decided rally lost in this video: nothing to compare
                }
                int count = countByMatch.getOrDefault(m.matchId(), 0);
                Integer rate = lost >= MIN_LOST_FOR_RATE ? percent(count, lost) : null;
                points.add(new MatchPoint(m.matchId(), m.title(), m.matchDate(), m.opponent(), m.owned(), lost, count, rate));
            }

            List<Integer> rates = points.stream().map(MatchPoint::rate).filter(r -> r != null).toList();
            String trend = "NOT_ENOUGH_DATA";
            Integer baseline = null;
            Integer latest = null;
            if (rates.size() >= 2) {
                latest = rates.get(rates.size() - 1);
                baseline = (int) Math.round(rates.subList(0, rates.size() - 1).stream()
                        .mapToInt(Integer::intValue).average().orElse(0));
                int diff = latest - baseline;
                trend = diff <= -TREND_THRESHOLD ? "IMPROVING" : diff >= TREND_THRESHOLD ? "WORSENING" : "STABLE";
            }

            Map<Long, Boolean> owned = new HashMap<>();
            chronological.forEach(m -> owned.put(m.matchId(), m.owned()));
            // Newest matches first: those clips are what the player looks like now.
            Map<Long, Integer> order = new HashMap<>();
            for (int i = 0; i < chronological.size(); i++) {
                order.put(chronological.get(i).matchId(), i);
            }
            List<Clip> clips = ends.stream()
                    .sorted(Comparator.comparingInt((RallyEnd e) -> order.getOrDefault(e.matchId(), -1)).reversed()
                            .thenComparingDouble(RallyEnd::rallyStart))
                    .limit(MAX_CLIPS)
                    .map(e -> new Clip(e.matchId(), owned.getOrDefault(e.matchId(), false), e.opponent(), e.rallyStart(),
                            e.rallyNumber()))
                    .toList();

            return new Focus(kind + ":" + stroke, kind, stroke, ends.size(), percent(ends.size(), totalLost),
                    trend, baseline, latest, points, clips);
        }
    }

    private static int percent(int part, int whole) {
        return whole == 0 ? 0 : (int) Math.round(100.0 * part / whole);
    }

    private long viewerId(String email) {
        if (email == null || email.isBlank()) {
            return GUEST;
        }
        return userRepository.findByEmail(email).map(User::getId).orElse(GUEST);
    }
}
