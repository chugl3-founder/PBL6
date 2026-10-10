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

        // Đánh dấu các bản ghi phân tích cũ là isCurrent = false
        aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(matchId).ifPresent(oldAnalysis -> {
            oldAnalysis.setIsCurrent(false);
            aiAnalysisRepository.save(oldAnalysis);
        });

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

    private <T> java.util.List<T> parseJsonList(com.fasterxml.jackson.databind.ObjectMapper mapper, String json, Class<T> clazz) {
        if (json == null || json.isBlank()) return java.util.Collections.emptyList();
        try {
            return mapper.readValue(json, mapper.getTypeFactory().constructCollectionType(java.util.List.class, clazz));
        } catch (Exception ex) {
            return java.util.Collections.emptyList();
        }
    }
}

