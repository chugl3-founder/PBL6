package com.badminton.service;

import com.badminton.dto.admin.AdminAnalysisResponse;
import com.badminton.dto.analysis.AiEventResponse;
import com.badminton.dto.analysis.AnalysisStatusResponse;
import com.badminton.dto.analysis.MatchStatisticsResponse;
import com.badminton.dto.analysis.RallyResponse;
import com.badminton.entity.AiAnalysis;
import com.badminton.entity.AiEvent;
import com.badminton.entity.Match;
import com.badminton.entity.MatchStatistic;
import com.badminton.entity.Rally;
import com.badminton.entity.Video;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Component;

import java.math.BigDecimal;
import java.util.Collections;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

/** Entity to response mapping for analyses, events, rallies and statistics, and the JSON columns they hold. */
@Component
@RequiredArgsConstructor
@Slf4j
public class AnalysisMapper {

    private static final TypeReference<List<List<Double>>> RANGES = new TypeReference<>() {
    };

    private final ObjectMapper objectMapper;
    private final AnalysisProgress analysisProgress;

    public AnalysisStatusResponse toStatusResponse(AiAnalysis analysis, Long matchId) {
        List<List<Double>> ranges = analyzedRanges(analysis);
        AnalysisProgress.Progress progress = analysisProgress.of(analysis, ranges);
        return AnalysisStatusResponse.builder()
                .analysisId(analysis.getId())
                .matchId(matchId)
                .status(analysis.getStatus())
                .progressPercent(progress.percent())
                .currentStage(progress.stage())
                .modelName(analysis.getModelName())
                .modelVersion(analysis.getModelVersion())
                .startedAt(analysis.getStartedAt())
                .completedAt(analysis.getCompletedAt())
                .errorMessage(analysis.getErrorMessage())
                .analyzedUntilSeconds(toDouble(analysis.getAnalyzedUntilSeconds()))
                .videoDurationSeconds(toDouble(analysis.getVideoDurationSeconds()))
                .analyzedRanges(ranges)
                .build();
    }

    public AdminAnalysisResponse toAdminResponse(AiAnalysis analysis) {
        Match match = analysis.getMatch();
        Video video = analysis.getVideo();
        AnalysisProgress.Progress progress = analysisProgress.of(analysis, analyzedRanges(analysis));
        return AdminAnalysisResponse.builder()
                .id(analysis.getId())
                .matchId(match != null ? match.getId() : null)
                .matchTitle(match != null ? match.getTitle() : null)
                .playerAName(match != null ? match.getPlayerAName() : null)
                .playerBName(match != null ? match.getPlayerBName() : null)
                .ownerEmail(match != null && match.getOwner() != null ? match.getOwner().getEmail() : null)
                .videoId(video != null ? video.getId() : null)
                .status(analysis.getStatus())
                .modelName(analysis.getModelName())
                .modelVersion(analysis.getModelVersion())
                .progressPercent(progress.percent())
                .currentStage(progress.stage())
                .startedAt(analysis.getStartedAt())
                .completedAt(analysis.getCompletedAt())
                .errorCode(analysis.getErrorCode())
                .errorMessage(analysis.getErrorMessage())
                .isCurrent(analysis.getIsCurrent())
                .createdAt(analysis.getCreatedAt())
                .build();
    }

    public AiEventResponse toEventResponse(AiEvent e) {
        return AiEventResponse.builder()
                .id(e.getId())
                .eventOrder(e.getEventOrder())
                .rallyNumber(e.getRallyNumber())
                .startFrame(e.getStartFrame())
                .hitFrame(e.getHitFrame())
                .endFrame(e.getEndFrame())
                .timeSeconds(e.getTimeSeconds())
                .playerSide(e.getPlayerSide())
                .hitterName(e.getHitterName())
                .stroke(e.getStroke())
                .strokeSide(e.getStrokeSide())
                .confidence(e.getConfidence())
                .refinedFrame(e.getRefinedFrame())
                .contactOffset(e.getContactOffset())
                .hitScore(e.getHitScore())
                .ballRound(e.getBallRound())
                .gapFromPreviousHitSeconds(e.getGapFromPreviousHitSeconds())
                .top2(jsonList(e.getTop2(), String.class))
                .ttaUsed(e.getTtaUsed())
                .ttaWindows(e.getTtaWindows())
                .cropBox(jsonList(e.getCropBox(), Integer.class))
                .playerPositionCourt(jsonList(e.getPlayerPositionCourt(), Double.class))
                .opponentPositionCourt(jsonList(e.getOpponentPositionCourt(), Double.class))
                .contactShuttleProjectionCourt(jsonList(e.getContactShuttleProjectionCourt(), Double.class))
                .contactHeightImageRatio(e.getContactHeightImageRatio())
                .hittingArea3x3(e.getHittingArea3x3())
                .landingPositionCourtProxy(jsonList(e.getLandingPositionCourtProxy(), Double.class))
                .landingArea3x3Proxy(e.getLandingArea3x3Proxy())
                .landingProxyFrame(e.getLandingProxyFrame())
                .landingProxyConfidence(e.getLandingProxyConfidence())
                .landingIsProxy(e.getLandingIsProxy())
                .flightTimeToNextHitSeconds(e.getFlightTimeToNextHitSeconds())
                .averageShuttleSpeedImagePerSecond(e.getAverageShuttleSpeedImagePerSecond())
                .averageWristSpeedImagePerSecond(e.getAverageWristSpeedImagePerSecond())
                .shuttleVisibilityRatio(e.getShuttleVisibilityRatio())
                .attackStateRule(e.getAttackStateRule())
                .build();
    }

    /** game: where the rally stands in the match (HighlightSelector.trackGames). */
    public RallyResponse toRallyResponse(Rally r, HighlightSelector.GameContext game) {
        return RallyResponse.builder()
                .id(r.getId())
                .rallyNumber(r.getRallyNumber())
                .startEventId(r.getStartEvent() != null ? r.getStartEvent().getId() : null)
                .endEventId(r.getEndEvent() != null ? r.getEndEvent().getId() : null)
                .startTime(r.getStartTime())
                .endTime(r.getEndTime())
                .duration(r.getDuration())
                .totalStrokes(r.getTotalStrokes())
                .boundaryType(r.getBoundaryType())
                .serverSide(r.getServerSide())
                .winnerSide(r.getWinnerSide())
                .winReason(r.getWinReason())
                .scoreUpper(r.getScoreUpper())
                .scoreLower(r.getScoreLower())
                .scoreText(r.getScoreText())
                .gameNumber(game.game())
                .scoreA(game.aAfter())
                .scoreB(game.bAfter())
                .winnerPlayer(game.aWon() ? "PLAYER_A" : game.bWon() ? "PLAYER_B" : null)
                .upperPlayer(game.aOnUpper() ? "PLAYER_A" : "PLAYER_B")
                .afterMatch(game.afterMatch())
                .strokeSequence(jsonList(r.getStrokeSequence(), String.class))
                .isComplete(r.getIsComplete())
                .partialStart(r.getPartialStart())
                .partialEnd(r.getPartialEnd())
                .build();
    }

    /** stats: the stored or freshly aggregated totals; events: for the per-stroke distribution. */
    public MatchStatisticsResponse toStatisticsResponse(AiAnalysis analysis, MatchStatistic stats, List<AiEvent> events) {
        Map<String, Integer> strokeDistribution = new HashMap<>();
        for (AiEvent evt : events) {
            if (evt.getStroke() != null) {
                strokeDistribution.merge(evt.getStroke(), 1, Integer::sum);
            }
        }
        return MatchStatisticsResponse.builder()
                .id(stats.getId())
                .matchId(analysis.getMatch().getId())
                .analysisId(analysis.getId())
                .totalStrokes(stats.getTotalStrokes())
                .totalRallies(stats.getTotalRallies())
                .avgStrokesPerRally(stats.getAvgStrokesPerRally())
                .avgRallyDuration(stats.getAvgRallyDuration())
                .playerAStrokes(stats.getPlayerAStrokes())
                .playerBStrokes(stats.getPlayerBStrokes())
                .forehandCount(stats.getForehandCount())
                .backhandCount(stats.getBackhandCount())
                .aroundheadCount(stats.getAroundheadCount())
                .unknownSideCount(stats.getUnknownSideCount())
                .avgConfidence(stats.getAvgConfidence())
                .strokeDistribution(strokeDistribution)
                .summaryData(jsonObject(analysis.getSummaryData()))
                .radarChart(jsonObject(analysis.getRadarChart()))
                .coachInsights(jsonObject(analysis.getCoachInsights()))
                .tacticalPatterns(jsonObject(analysis.getTacticalPatterns()))
                .structuredTactics(jsonObject(analysis.getStructuredTactics()))
                .build();
    }

    private List<List<Double>> analyzedRanges(AiAnalysis analysis) {
        String json = analysis.getAnalyzedRanges();
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, RANGES);
        } catch (Exception e) {
            log.warn("Could not read analyzed_ranges of analysis {}: {}", analysis.getId(), e.getMessage());
            return null;
        }
    }

    private <T> List<T> jsonList(String json, Class<T> type) {
        if (json == null || json.isBlank()) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json, objectMapper.getTypeFactory().constructCollectionType(List.class, type));
        } catch (Exception e) {
            return Collections.emptyList();
        }
    }

    private Object jsonObject(String json) {
        if (json == null || json.isBlank()) {
            return null;
        }
        try {
            return objectMapper.readValue(json, Object.class);
        } catch (Exception e) {
            return null;
        }
    }

    private static Double toDouble(BigDecimal value) {
        return value != null ? value.doubleValue() : null;
    }
}
