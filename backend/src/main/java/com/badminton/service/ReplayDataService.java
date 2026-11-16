package com.badminton.service;

import com.badminton.common.exception.ApiException;
import com.badminton.common.exception.ErrorCodes;
import com.badminton.dto.analysis.AiEventResponse;
import com.badminton.dto.analysis.MatchStatisticsResponse;
import com.badminton.dto.analysis.RallyResponse;
import com.badminton.entity.AiAnalysis;
import com.badminton.entity.AiEvent;
import com.badminton.entity.Match;
import com.badminton.entity.MatchStatistic;
import com.badminton.entity.Rally;
import com.badminton.repository.AiAnalysisRepository;
import com.badminton.repository.AiEventRepository;
import com.badminton.repository.MatchStatisticRepository;
import com.badminton.repository.RallyRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.List;
import java.util.Map;

/**
 * What the Replay page reads for a match: stroke events, rallies (split into games per player) and statistics.
 * The methods taking an email check that the user owns the match or is an admin. The package-private ones
 * without it serve PublicReplayService, which checks that the match is published instead.
 */
@Service
@RequiredArgsConstructor
public class ReplayDataService {

    private final MatchAccessService matchAccess;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final AiEventRepository aiEventRepository;
    private final RallyRepository rallyRepository;
    private final MatchStatisticRepository matchStatisticRepository;
    private final AnalysisMapper mapper;

    @Transactional(readOnly = true)
    public List<AiEventResponse> getEvents(Long matchId, String email) {
        return events(matchAccess.requireOwnerOrAdmin(matchId, email));
    }

    @Transactional(readOnly = true)
    public List<RallyResponse> getRallies(Long matchId, String email) {
        return rallies(matchAccess.requireOwnerOrAdmin(matchId, email));
    }

    @Transactional(readOnly = true)
    public MatchStatisticsResponse getStatistics(Long matchId, String email) {
        return statistics(analysisOf(matchAccess.requireOwnerOrAdmin(matchId, email)));
    }

    @Transactional(readOnly = true)
    public MatchStatisticsResponse getStatisticsByAnalysisId(Long analysisId, String email) {
        AiAnalysis analysis = aiAnalysisRepository.findById(analysisId)
                .orElseThrow(() -> ApiException.notFound(ErrorCodes.ANALYSIS_NOT_FOUND, "Không tìm thấy phiên phân tích"));
        matchAccess.requireOwnerOrAdmin(analysis.getMatch().getId(), email);
        return statistics(analysis);
    }

    @Transactional(readOnly = true)
    List<AiEventResponse> getPublishedEvents(Long matchId) {
        return events(matchAccess.findActive(matchId));
    }

    @Transactional(readOnly = true)
    List<RallyResponse> getPublishedRallies(Long matchId) {
        return rallies(matchAccess.findActive(matchId));
    }

    @Transactional(readOnly = true)
    MatchStatisticsResponse getPublishedStatistics(Long matchId) {
        return statistics(analysisOf(matchAccess.findActive(matchId)));
    }

    private AiAnalysis analysisOf(Match match) {
        return aiAnalysisRepository.findCurrentOrLatest(match.getId())
                .orElseThrow(() -> ApiException.notFound(ErrorCodes.ANALYSIS_NOT_FOUND, "Trận đấu chưa có dữ liệu phân tích"));
    }

    private List<AiEventResponse> events(Match match) {
        return aiEventRepository.findByAnalysisIdOrderByEventOrderAsc(analysisOf(match).getId()).stream()
                .map(mapper::toEventResponse)
                .toList();
    }

    /** Rallies with per-player scores: the AI counts by court half and players change ends between games. */
    private List<RallyResponse> rallies(Match match) {
        List<Rally> rallies = rallyRepository.findByAnalysisIdOrderByRallyNumberAsc(analysisOf(match).getId());
        Map<Long, HighlightSelector.GameContext> games = HighlightSelector.trackGames(rallies.stream()
                        .map(r -> new HighlightSelector.RallyFacts(r.getId(), r.getRallyNumber(), 0, 0, 0, r.getWinnerSide(),
                                r.getScoreUpper() != null ? r.getScoreUpper() : 0,
                                r.getScoreLower() != null ? r.getScoreLower() : 0, null, null, true))
                        .toList(),
                !"PLAYER_B".equalsIgnoreCase(match.getUpperPlayer()),
                HighlightSelector.Start.of(match.getStartGame(), match.getStartScoreA(), match.getStartScoreB()));
        return rallies.stream().map(r -> mapper.toRallyResponse(r, games.get(r.getId()))).toList();
    }

    private MatchStatisticsResponse statistics(AiAnalysis analysis) {
        List<AiEvent> events = aiEventRepository.findByAnalysisIdOrderByEventOrderAsc(analysis.getId());
        MatchStatistic stats = matchStatisticRepository.findByAnalysisId(analysis.getId())
                .orElseGet(() -> aggregate(analysis, events,
                        rallyRepository.findByAnalysisIdOrderByRallyNumberAsc(analysis.getId())));
        return mapper.toStatisticsResponse(analysis, stats, events);
    }

    /** Totals computed on the fly when the AI worker has not stored match_statistics. Not saved. */
    private static MatchStatistic aggregate(AiAnalysis analysis, List<AiEvent> events, List<Rally> rallies) {
        int totalStrokes = events.size();
        int totalRallies = rallies.size();
        double avgStrokes = totalRallies > 0 ? (double) totalStrokes / totalRallies : 0.0;
        double avgDuration = rallies.stream()
                .filter(r -> r.getDuration() != null)
                .mapToDouble(r -> r.getDuration().doubleValue())
                .average().orElse(0.0);
        int upperStrokes = (int) events.stream().filter(e -> "UPPER".equalsIgnoreCase(e.getPlayerSide())).count();
        int forehands = countSide(events, "FOREHAND");
        int backhands = countSide(events, "BACKHAND");
        int aroundheads = countSide(events, "AROUNDHEAD") + countSide(events, "AROUND_HEAD");
        double avgConfidence = events.stream()
                .filter(e -> e.getConfidence() != null)
                .mapToDouble(e -> e.getConfidence().doubleValue())
                .average().orElse(0.0);

        return MatchStatistic.builder()
                .match(analysis.getMatch())
                .analysis(analysis)
                .totalStrokes(totalStrokes)
                .totalRallies(totalRallies)
                .avgStrokesPerRally(BigDecimal.valueOf(avgStrokes).setScale(2, RoundingMode.HALF_UP))
                .avgRallyDuration(BigDecimal.valueOf(avgDuration).setScale(2, RoundingMode.HALF_UP))
                .playerAStrokes(upperStrokes)
                .playerBStrokes(totalStrokes - upperStrokes)
                .forehandCount(forehands)
                .backhandCount(backhands)
                .aroundheadCount(aroundheads)
                .unknownSideCount(totalStrokes - forehands - backhands - aroundheads)
                .avgConfidence(BigDecimal.valueOf(avgConfidence).setScale(3, RoundingMode.HALF_UP))
                .build();
    }

    private static int countSide(List<AiEvent> events, String side) {
        return (int) events.stream().filter(e -> side.equalsIgnoreCase(e.getStrokeSide())).count();
    }
}
