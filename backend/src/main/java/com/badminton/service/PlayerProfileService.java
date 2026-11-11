package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.player.PlayerProfileResponse;
import com.badminton.dto.player.PlayerProfileResponse.LabelCount;
import com.badminton.dto.player.PlayerProfileResponse.MatchEntry;
import com.badminton.dto.player.PlayerProfileResponse.OpponentStat;
import com.badminton.dto.player.PlayerProfileResponse.Radar;
import com.badminton.dto.player.PlayerProfileResponse.Totals;
import com.badminton.dto.player.PlayerProfileResponse.ZoneCell;
import com.badminton.dto.player.PlayerSummaryResponse;
import com.badminton.entity.User;
import com.badminton.repository.PlayerStatsRepository;
import com.badminton.repository.PlayerStatsRepository.MatchRow;
import com.badminton.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Objects;
import java.util.function.Function;
import java.util.stream.Collectors;

/** Player directory and cross-match player profiles, limited to the matches the viewer may see. */
@Service
@RequiredArgsConstructor
public class PlayerProfileService {

    private static final long GUEST = -1L;
    private static final int MAX_NAME_LENGTH = 100;
    private static final int DIRECTORY_LIMIT = 60;

    private final PlayerStatsRepository playerStatsRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<PlayerSummaryResponse> listPlayers(String viewerEmail, String search) {
        String keyword = search == null ? "" : search.trim();
        return playerStatsRepository.findPlayers(viewerId(viewerEmail), keyword, DIRECTORY_LIMIT);
    }

    @Transactional(readOnly = true)
    public PlayerProfileResponse getProfile(String viewerEmail, String name) {
        String key = name == null ? "" : name.trim().toLowerCase();
        if (key.isEmpty() || key.length() > MAX_NAME_LENGTH) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "INVALID_PLAYER_NAME",
                    "Tên vận động viên không hợp lệ");
        }
        long viewerId = viewerId(viewerEmail);
        List<MatchRow> rows = playerStatsRepository.findMatches(viewerId, key);
        if (rows.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "PLAYER_NOT_FOUND",
                    "Không tìm thấy vận động viên trong các trận bạn được xem");
        }

        List<MatchRow> analyzed = rows.stream().filter(r -> r.analysisId() != null).toList();
        boolean hasAnalysis = !analyzed.isEmpty();
        Map<String, List<ZoneCell>> zones = hasAnalysis ? playerStatsRepository.findZones(viewerId, key) : Map.of();

        return new PlayerProfileResponse(
                rows.get(0).playerName(),
                rows.size(),
                analyzed.size(),
                rows.stream().map(MatchRow::matchDate).filter(Objects::nonNull).min(LocalDate::compareTo).orElse(null),
                rows.stream().map(MatchRow::matchDate).filter(Objects::nonNull).max(LocalDate::compareTo).orElse(null),
                new Totals(
                        analyzed.stream().mapToInt(MatchRow::shots).sum(),
                        analyzed.stream().mapToInt(MatchRow::won).sum(),
                        analyzed.stream().mapToInt(MatchRow::lost).sum(),
                        average(analyzed.stream().map(MatchRow::avgDistance).toList())),
                averageRadar(analyzed),
                playstyles(analyzed),
                hasAnalysis ? playerStatsRepository.findStrokes(viewerId, key) : List.of(),
                hasAnalysis ? playerStatsRepository.findHandSides(viewerId, key) : Map.of(),
                hasAnalysis ? playerStatsRepository.findRallyLengths(viewerId, key) : List.of(),
                hasAnalysis ? playerStatsRepository.findConcededBy(viewerId, key) : List.of(),
                new PlayerProfileResponse.Zones(
                        zones.getOrDefault("POSITION", List.of()),
                        zones.getOrDefault("LANDING", List.of()),
                        zones.getOrDefault("CONCEDED", List.of())),
                opponents(rows),
                rows.stream().map(PlayerProfileService::toEntry).toList()
        );
    }

    private long viewerId(String email) {
        if (email == null || email.isBlank()) {
            return GUEST;
        }
        // A guest's principal is Spring's "anonymousUser", which matches no account.
        return userRepository.findByEmail(email).map(User::getId).orElse(GUEST);
    }

    private static MatchEntry toEntry(MatchRow r) {
        return new MatchEntry(r.matchId(), r.title(), r.matchDate(), r.status(), r.owned(), r.analysisId() != null,
                r.side(), r.opponent(), r.shots(), r.won(), r.lost(), round1(r.avgDistance()), r.playstyle(), r.radar());
    }

    private static List<OpponentStat> opponents(List<MatchRow> rows) {
        Map<String, List<MatchRow>> byOpponent = rows.stream().collect(Collectors.groupingBy(
                r -> r.opponent().toLowerCase(), LinkedHashMap::new, Collectors.toList()));
        return byOpponent.values().stream()
                .map(list -> new OpponentStat(
                        list.get(0).opponent(),
                        list.size(),
                        list.stream().mapToInt(MatchRow::won).sum(),
                        list.stream().mapToInt(MatchRow::lost).sum()))
                .sorted(Comparator.comparingInt(OpponentStat::matches).reversed()
                        .thenComparing(o -> -(o.ralliesWon() + o.ralliesLost())))
                .toList();
    }

    private static List<LabelCount> playstyles(List<MatchRow> analyzed) {
        return analyzed.stream()
                .map(MatchRow::playstyle)
                .filter(Objects::nonNull)
                .collect(Collectors.groupingBy(Function.identity(), LinkedHashMap::new, Collectors.counting()))
                .entrySet().stream()
                .map(e -> new LabelCount(e.getKey(), e.getValue().intValue()))
                .sorted(Comparator.comparingInt(LabelCount::count).reversed())
                .toList();
    }

    private static Radar averageRadar(List<MatchRow> rows) {
        List<Radar> radars = rows.stream().map(MatchRow::radar).toList();
        return new Radar(
                averageInt(radars, Radar::attack),
                averageInt(radars, Radar::defense),
                averageInt(radars, Radar::netControl),
                averageInt(radars, Radar::shotVariety),
                averageInt(radars, Radar::consistency),
                averageInt(radars, Radar::pace));
    }

    private static Integer averageInt(List<Radar> radars, Function<Radar, Integer> field) {
        List<Integer> values = radars.stream().map(field).filter(Objects::nonNull).toList();
        return values.isEmpty() ? null
                : (int) Math.round(values.stream().mapToInt(Integer::intValue).average().orElse(0));
    }

    private static Double average(List<Double> values) {
        List<Double> present = new ArrayList<>(values.stream().filter(Objects::nonNull).toList());
        return present.isEmpty() ? null : round1(present.stream().mapToDouble(Double::doubleValue).average().orElse(0));
    }

    private static Double round1(Double value) {
        return value == null ? null : Math.round(value * 10) / 10.0;
    }
}
