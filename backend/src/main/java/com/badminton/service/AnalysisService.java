package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.analysis.AnalysisDispatchResponse;
import com.badminton.dto.analysis.AnalysisStatusResponse;
import com.badminton.entity.AiAnalysis;
import com.badminton.entity.Match;
import com.badminton.entity.User;
import com.badminton.entity.Video;
import com.badminton.repository.AiAnalysisRepository;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.UserRepository;
import com.badminton.repository.VideoRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.OffsetDateTime;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class AnalysisService {

    private final MatchRepository matchRepository;
    private final VideoRepository videoRepository;
    private final UserRepository userRepository;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final com.badminton.repository.AiEventRepository aiEventRepository;
    private final com.badminton.repository.RallyRepository rallyRepository;
    private final com.badminton.repository.MatchStatisticRepository matchStatisticRepository;
    private final MockAiEngineService mockAiEngineService;

    @Transactional
    public AnalysisDispatchResponse dispatchAnalysis(Long matchId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "USER_NOT_FOUND", "Người dùng không tồn tại"));

        Match match = matchRepository.findById(matchId)
                .filter(m -> m.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "MATCH_NOT_FOUND", "Không tìm thấy trận đấu"));

        if (!match.getOwner().getId().equals(user.getId())) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorType.VALIDATION, "FORBIDDEN", "Bạn không có quyền thao tác trên trận đấu này");
        }

        Video video = videoRepository.findByMatchId(matchId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "VIDEO_NOT_FOUND", "Trận đấu chưa có video được tải lên"));

        if (!"READY".equalsIgnoreCase(video.getStatus()) && !"UPLOADED".equalsIgnoreCase(video.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "VIDEO_NOT_READY", "Video chưa sẵn sàng để phân tích");
        }

        // Đánh dấu toàn bộ các bản ghi phân tích cũ của trận đấu thành isCurrent = false
        aiAnalysisRepository.demoteAllCurrentByMatchId(matchId);

        // Tạo bản ghi AI Analysis mới với trạng thái QUEUED
        AiAnalysis analysis = AiAnalysis.builder()
                .match(match)
                .video(video)
                .status("QUEUED")
                .modelName("CoachAI+")
                .modelVersion("2.0_pbl6_coachai")
                .isCurrent(true)
                .build();

        AiAnalysis savedAnalysis = aiAnalysisRepository.saveAndFlush(analysis);

        // Cập nhật trạng thái trận đấu sang ANALYZING
        match.setStatus("ANALYZING");
        matchRepository.saveAndFlush(match);

        // Kích hoạt Mock AI Engine phân tích bất đồng bộ (hoặc bắn RabbitMQ cho external worker)
        mockAiEngineService.runMockAnalysis(savedAnalysis.getId());


        log.info("Đã điều phối phân tích AI thành công cho Match ID: {}, Analysis ID: {}", matchId, savedAnalysis.getId());

        return AnalysisDispatchResponse.builder()
                .analysisId(savedAnalysis.getId())
                .matchId(matchId)
                .status("QUEUED")
                .message("Yêu cầu phân tích đã được tiếp nhận và đưa vào hàng đợi xử lý.")
                .queuedAt(OffsetDateTime.now())
                .build();
    }

    @Transactional(readOnly = true)
    public AnalysisStatusResponse getAnalysisStatus(Long matchId, String userEmail) {
        Match match = matchRepository.findById(matchId)
                .filter(m -> m.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "MATCH_NOT_FOUND", "Không tìm thấy trận đấu"));

        Optional<AiAnalysis> analysisOpt = aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(matchId);
        if (analysisOpt.isEmpty()) {
            // Nếu chưa có phiên phân tích hiện tại, thử tìm phiên gần nhất
            analysisOpt = aiAnalysisRepository.findTopByMatchIdOrderByCreatedAtDesc(matchId);
        }

        if (analysisOpt.isEmpty()) {
            return AnalysisStatusResponse.builder()
                    .matchId(matchId)
                    .status("NONE")
                    .progressPercent(0)
                    .currentStage("Chưa có phiên phân tích")
                    .build();
        }

        AiAnalysis analysis = analysisOpt.get();
        int progress = mockAiEngineService.getProgress(analysis.getId());
        String currentStage = mockAiEngineService.getCurrentStage(analysis.getId());

        if ("COMPLETED".equalsIgnoreCase(analysis.getStatus())) {
            progress = 100;
            currentStage = "completed";
        } else if ("FAILED".equalsIgnoreCase(analysis.getStatus())) {
            currentStage = "failed";
        }

        return AnalysisStatusResponse.builder()
                .analysisId(analysis.getId())
                .matchId(matchId)
                .status(analysis.getStatus())
                .progressPercent(progress)
                .currentStage(currentStage)
                .modelName(analysis.getModelName())
                .modelVersion(analysis.getModelVersion())
                .startedAt(analysis.getStartedAt())
                .completedAt(analysis.getCompletedAt())
                .errorMessage(analysis.getErrorMessage())
                .build();
    }

    @Transactional(readOnly = true)
    public java.util.List<com.badminton.dto.analysis.AiEventResponse> getMatchEvents(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .filter(m -> m.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "MATCH_NOT_FOUND", "Không tìm thấy trận đấu"));

        AiAnalysis analysis = aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(matchId)
                .orElseGet(() -> aiAnalysisRepository.findTopByMatchIdOrderByCreatedAtDesc(matchId)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ANALYSIS_NOT_FOUND", "Trận đấu chưa có dữ liệu phân tích")));

        java.util.List<com.badminton.entity.AiEvent> events = aiEventRepository.findByAnalysisIdOrderByEventOrderAsc(analysis.getId());

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        return events.stream().map(e -> {
            java.util.List<String> top2 = parseJsonList(mapper, e.getTop2(), String.class);
            java.util.List<Integer> cropBox = parseJsonList(mapper, e.getCropBox(), Integer.class);
            java.util.List<Double> playerPos = parseJsonList(mapper, e.getPlayerPositionCourt(), Double.class);
            java.util.List<Double> oppPos = parseJsonList(mapper, e.getOpponentPositionCourt(), Double.class);
            java.util.List<Double> contactPos = parseJsonList(mapper, e.getContactShuttleProjectionCourt(), Double.class);
            java.util.List<Double> landPos = parseJsonList(mapper, e.getLandingPositionCourtProxy(), Double.class);

            return (com.badminton.dto.analysis.AiEventResponse) com.badminton.dto.analysis.AiEventResponse.builder()
                    .id(e.getId())
                    .eventOrder(e.getEventOrder())
                    .startFrame(e.getStartFrame())
                    .hitFrame(e.getHitFrame())
                    .endFrame(e.getEndFrame())
                    .timeSeconds(e.getTimeSeconds())
                    .playerSide(e.getPlayerSide())
                    .stroke(e.getStroke())
                    .strokeSide(e.getStrokeSide())
                    .confidence(e.getConfidence())
                    .refinedFrame(e.getRefinedFrame())
                    .contactOffset(e.getContactOffset())
                    .hitScore(e.getHitScore())
                    .ballRound(e.getBallRound())
                    .gapFromPreviousHitSeconds(e.getGapFromPreviousHitSeconds())
                    .top2(top2)
                    .cropBox(cropBox)
                    .playerPositionCourt(playerPos)
                    .opponentPositionCourt(oppPos)
                    .contactShuttleProjectionCourt(contactPos)
                    .contactHeightImageRatio(e.getContactHeightImageRatio())
                    .hittingArea3x3(e.getHittingArea3x3())
                    .landingPositionCourtProxy(landPos)
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
        }).collect(java.util.stream.Collectors.toList());

    }

    @Transactional(readOnly = true)
    public java.util.List<com.badminton.dto.analysis.RallyResponse> getMatchRallies(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .filter(m -> m.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "MATCH_NOT_FOUND", "Không tìm thấy trận đấu"));

        AiAnalysis analysis = aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(matchId)
                .orElseGet(() -> aiAnalysisRepository.findTopByMatchIdOrderByCreatedAtDesc(matchId)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ANALYSIS_NOT_FOUND", "Trận đấu chưa có dữ liệu phân tích")));

        java.util.List<com.badminton.entity.Rally> rallies = rallyRepository.findByAnalysisIdOrderByRallyNumberAsc(analysis.getId());

        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        return rallies.stream().map(r -> {
            java.util.List<String> strokeSeq = parseJsonList(mapper, r.getStrokeSequence(), String.class);

            return com.badminton.dto.analysis.RallyResponse.builder()
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
                    .strokeSequence(strokeSeq)
                    .isComplete(r.getIsComplete())
                    .build();
        }).collect(java.util.stream.Collectors.toList());
    }

    @Transactional(readOnly = true)
    public com.badminton.dto.analysis.MatchStatisticsResponse getMatchStatistics(Long matchId) {
        Match match = matchRepository.findById(matchId)
                .filter(m -> m.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "MATCH_NOT_FOUND", "Không tìm thấy trận đấu"));

        AiAnalysis analysis = aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(matchId)
                .orElseGet(() -> aiAnalysisRepository.findTopByMatchIdOrderByCreatedAtDesc(matchId)
                        .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ANALYSIS_NOT_FOUND", "Trận đấu chưa có dữ liệu phân tích")));

        return buildStatisticsResponse(analysis);
    }

    @Transactional(readOnly = true)
    public com.badminton.dto.analysis.MatchStatisticsResponse getStatisticsByAnalysisId(Long analysisId) {
        AiAnalysis analysis = aiAnalysisRepository.findById(analysisId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ANALYSIS_NOT_FOUND", "Không tìm thấy phiên phân tích"));

        return buildStatisticsResponse(analysis);
    }

    private com.badminton.dto.analysis.MatchStatisticsResponse buildStatisticsResponse(AiAnalysis analysis) {
        com.fasterxml.jackson.databind.ObjectMapper mapper = new com.fasterxml.jackson.databind.ObjectMapper();

        // 1. Tìm hoặc tổng hợp MatchStatistic
        java.util.List<com.badminton.entity.AiEvent> events = aiEventRepository.findByAnalysisIdOrderByEventOrderAsc(analysis.getId());
        java.util.List<com.badminton.entity.Rally> rallies = rallyRepository.findByAnalysisIdOrderByRallyNumberAsc(analysis.getId());

        java.util.Optional<com.badminton.entity.MatchStatistic> statsOpt = matchStatisticRepository.findByAnalysisId(analysis.getId());

        com.badminton.entity.MatchStatistic stats;
        if (statsOpt.isPresent()) {
            stats = statsOpt.get();
        } else {
            // Aggregate tự động nếu chưa có bản ghi
            int totalStrokes = events.size();
            int totalRallies = rallies.size();
            double avgStrokes = totalRallies > 0 ? (double) totalStrokes / totalRallies : 0.0;
            double avgDuration = rallies.stream()
                    .filter(r -> r.getDuration() != null)
                    .mapToDouble(r -> r.getDuration().doubleValue())
                    .average().orElse(0.0);

            int playerAStrokes = (int) events.stream().filter(e -> "UPPER".equalsIgnoreCase(e.getPlayerSide())).count();
            int playerBStrokes = totalStrokes - playerAStrokes;
            int forehands = (int) events.stream().filter(e -> "FOREHAND".equalsIgnoreCase(e.getStrokeSide())).count();
            int backhands = (int) events.stream().filter(e -> "BACKHAND".equalsIgnoreCase(e.getStrokeSide())).count();
            int aroundheads = totalStrokes - forehands - backhands;
            double avgConf = events.stream()
                    .filter(e -> e.getConfidence() != null)
                    .mapToDouble(e -> e.getConfidence().doubleValue())
                    .average().orElse(0.0);

            stats = com.badminton.entity.MatchStatistic.builder()
                    .match(analysis.getMatch())
                    .analysis(analysis)
                    .totalStrokes(totalStrokes)
                    .totalRallies(totalRallies)
                    .avgStrokesPerRally(java.math.BigDecimal.valueOf(avgStrokes).setScale(2, java.math.RoundingMode.HALF_UP))
                    .avgRallyDuration(java.math.BigDecimal.valueOf(avgDuration).setScale(2, java.math.RoundingMode.HALF_UP))
                    .playerAStrokes(playerAStrokes)
                    .playerBStrokes(playerBStrokes)
                    .forehandCount(forehands)
                    .backhandCount(backhands)
                    .aroundheadCount(aroundheads)
                    .unknownSideCount(0)
                    .avgConfidence(java.math.BigDecimal.valueOf(avgConf).setScale(3, java.math.RoundingMode.HALF_UP))
                    .build();
            stats = matchStatisticRepository.save(stats);
        }

        // 2. Tính phân bố chi tiết cú đánh (strokeDistribution)
        java.util.Map<String, Integer> strokeDistribution = new java.util.HashMap<>();
        for (com.badminton.entity.AiEvent evt : events) {
            String stroke = evt.getStroke();
            if (stroke != null) {
                strokeDistribution.put(stroke, strokeDistribution.getOrDefault(stroke, 0) + 1);
            }
        }

        // 3. Parse CoachAI+ 2.0 metrics
        Object summaryData = parseJsonObject(mapper, analysis.getSummaryData());
        Object radarChart = parseJsonObject(mapper, analysis.getRadarChart());
        Object coachInsights = parseJsonObject(mapper, analysis.getCoachInsights());
        Object tacticalPatterns = parseJsonObject(mapper, analysis.getTacticalPatterns());

        return com.badminton.dto.analysis.MatchStatisticsResponse.builder()
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
                .summaryData(summaryData)
                .radarChart(radarChart)
                .coachInsights(coachInsights)
                .tacticalPatterns(tacticalPatterns)
                .build();
    }

    private Object parseJsonObject(com.fasterxml.jackson.databind.ObjectMapper mapper, String json) {
        if (json == null || json.isBlank()) return null;
        try {
            return mapper.readValue(json, Object.class);
        } catch (Exception ex) {
            return null;
        }
    }

    @Transactional
    public AnalysisDispatchResponse retryAnalysis(Long matchId, Long analysisId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "USER_NOT_FOUND", "Người dùng không tồn tại"));

        Match match = matchRepository.findById(matchId)
                .filter(m -> m.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "MATCH_NOT_FOUND", "Không tìm thấy trận đấu"));

        if (!match.getOwner().getId().equals(user.getId()) && !"ROLE_ADMIN".equals(user.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorType.VALIDATION, "FORBIDDEN", "Bạn không có quyền thao tác trên trận đấu này");
        }

        AiAnalysis oldAnalysis;
        if (analysisId != null) {
            oldAnalysis = aiAnalysisRepository.findById(analysisId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ANALYSIS_NOT_FOUND", "Không tìm thấy phiên phân tích"));
        } else {
            oldAnalysis = aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(matchId)
                    .orElseGet(() -> aiAnalysisRepository.findTopByMatchIdOrderByCreatedAtDesc(matchId)
                            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ANALYSIS_NOT_FOUND", "Không tìm thấy phiên phân tích để thử lại")));
        }

        if (!oldAnalysis.getMatch().getId().equals(matchId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ANALYSIS_MATCH_MISMATCH", "Phiên phân tích không thuộc về trận đấu này");
        }

        if (!"FAILED".equalsIgnoreCase(oldAnalysis.getStatus()) && !"UNSUPPORTED".equalsIgnoreCase(oldAnalysis.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ANALYSIS_NOT_FAILED", "Chỉ có thể thử lại phiên phân tích khi đang ở trạng thái FAILED hoặc UNSUPPORTED");
        }

        // Đánh dấu toàn bộ các bản ghi phân tích cũ của trận đấu thành isCurrent = false
        aiAnalysisRepository.demoteAllCurrentByMatchId(matchId);

        // Tạo phiên phân tích mới với status QUEUED
        AiAnalysis newAnalysis = AiAnalysis.builder()
                .match(match)
                .video(oldAnalysis.getVideo())
                .status("QUEUED")
                .modelName("CoachAI+")
                .modelVersion("2.0_pbl6_coachai")
                .isCurrent(true)
                .build();

        AiAnalysis savedNewAnalysis = aiAnalysisRepository.saveAndFlush(newAnalysis);

        match.setStatus("ANALYZING");
        matchRepository.saveAndFlush(match);

        mockAiEngineService.runMockAnalysis(savedNewAnalysis.getId());
        log.info("Đã khởi tạo lại (retry) phiên phân tích AI cho Match ID: {}, New Analysis ID: {}", matchId, savedNewAnalysis.getId());

        return AnalysisDispatchResponse.builder()
                .analysisId(savedNewAnalysis.getId())
                .matchId(matchId)
                .status("QUEUED")
                .message("Đã khởi tạo lại phiên phân tích AI và đưa vào hàng đợi xử lý.")
                .queuedAt(OffsetDateTime.now())
                .build();
    }

    @Transactional
    public AnalysisStatusResponse cancelAnalysis(Long matchId, Long analysisId, String userEmail) {
        User user = userRepository.findByEmail(userEmail)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "USER_NOT_FOUND", "Người dùng không tồn tại"));

        Match match = matchRepository.findById(matchId)
                .filter(m -> m.getDeletedAt() == null)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "MATCH_NOT_FOUND", "Không tìm thấy trận đấu"));

        if (!match.getOwner().getId().equals(user.getId()) && !"ROLE_ADMIN".equals(user.getRole())) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorType.VALIDATION, "FORBIDDEN", "Bạn không có quyền thao tác trên trận đấu này");
        }

        AiAnalysis analysis;
        if (analysisId != null) {
            analysis = aiAnalysisRepository.findById(analysisId)
                    .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ANALYSIS_NOT_FOUND", "Không tìm thấy phiên phân tích"));
        } else {
            analysis = aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(matchId)
                    .orElseGet(() -> aiAnalysisRepository.findTopByMatchIdOrderByCreatedAtDesc(matchId)
                            .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "ANALYSIS_NOT_FOUND", "Không tìm thấy phiên phân tích để hủy")));
        }

        if (!analysis.getMatch().getId().equals(matchId)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ANALYSIS_MATCH_MISMATCH", "Phiên phân tích không thuộc về trận đấu này");
        }

        if (!"QUEUED".equalsIgnoreCase(analysis.getStatus()) && !"PROCESSING".equalsIgnoreCase(analysis.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "CANNOT_CANCEL", "Chỉ có thể hủy phiên phân tích đang ở trạng thái QUEUED hoặc PROCESSING");
        }

        // Thông báo Mock Engine ngắt luồng
        mockAiEngineService.cancelAnalysis(analysis.getId());

        // Cập nhật trạng thái CANCELLED
        analysis.setStatus("CANCELLED");
        analysis.setCompletedAt(OffsetDateTime.now());
        analysis.setErrorMessage("Phiên phân tích đã bị hủy bởi người dùng.");
        aiAnalysisRepository.saveAndFlush(analysis);

        match.setStatus("READY");
        matchRepository.saveAndFlush(match);
        log.info("Đã hủy phiên phân tích AI cho Match ID: {}, Analysis ID: {}", matchId, analysis.getId());

        return AnalysisStatusResponse.builder()
                .analysisId(analysis.getId())
                .matchId(matchId)
                .status("CANCELLED")
                .progressPercent(0)
                .currentStage("cancelled: Đã hủy phiên phân tích bởi người dùng")
                .modelName(analysis.getModelName())
                .modelVersion(analysis.getModelVersion())
                .startedAt(analysis.getStartedAt())
                .completedAt(analysis.getCompletedAt())
                .errorMessage("Phiên phân tích đã bị hủy bởi người dùng.")
                .build();
    }

    private <T> java.util.List<T> parseJsonList(com.fasterxml.jackson.databind.ObjectMapper mapper, String json, Class<T> clazz) {
        if (json == null || json.isBlank()) return java.util.Collections.emptyList();
        try {
            return mapper.readValue(json, mapper.getTypeFactory().constructCollectionType(java.util.List.class, clazz));
        } catch (Exception ex) {
            return java.util.Collections.emptyList();
        }
    }
}

