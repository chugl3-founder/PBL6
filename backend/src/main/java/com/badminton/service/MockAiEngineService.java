package com.badminton.service;

import com.badminton.entity.AiAnalysis;
import com.badminton.entity.AiEvent;
import com.badminton.entity.Match;
import com.badminton.entity.MatchStatistic;
import com.badminton.entity.Rally;
import com.badminton.repository.AiAnalysisRepository;
import com.badminton.repository.AiEventRepository;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.MatchStatisticRepository;
import com.badminton.repository.RallyRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.scheduling.annotation.Async;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.*;
import java.util.concurrent.ConcurrentHashMap;

@Service
@RequiredArgsConstructor
@Slf4j
public class MockAiEngineService {

    private final AiAnalysisRepository aiAnalysisRepository;
    private final AiEventRepository aiEventRepository;
    private final RallyRepository rallyRepository;
    private final MatchStatisticRepository matchStatisticRepository;
    private final MatchRepository matchRepository;
    private final ObjectMapper objectMapper;

    // Bộ nhớ tạm lưu trữ tiến độ realtime trong lúc @Async đang chạy
    private final Map<Long, Integer> progressMap = new ConcurrentHashMap<>();
    private final Map<Long, String> stageMap = new ConcurrentHashMap<>();

    public int getProgress(Long analysisId) {
        return progressMap.getOrDefault(analysisId, 0);
    }

    public String getCurrentStage(Long analysisId) {
        return stageMap.getOrDefault(analysisId, "hit_scan");
    }

    private final Set<Long> cancelledAnalyses = java.util.concurrent.ConcurrentHashMap.newKeySet();

    public void cancelAnalysis(Long analysisId) {
        cancelledAnalyses.add(analysisId);
        progressMap.remove(analysisId);
        stageMap.put(analysisId, "cancelled: Đã hủy phiên phân tích bởi người dùng");
    }

    @Async
    public void runMockAnalysis(Long analysisId) {
        log.info("[MockAiEngine] Bắt đầu tiến trình phân tích mô phỏng cho Analysis ID: {}", analysisId);
        cancelledAnalyses.remove(analysisId);
        
        // Đợi 200ms để đảm bảo transaction của thread gọi (AnalysisService) đã commit hoàn tất vào DB
        try {
            Thread.sleep(200);
        } catch (InterruptedException ignored) {}

        Optional<AiAnalysis> analysisOpt = aiAnalysisRepository.findById(analysisId);
        if (analysisOpt.isEmpty()) {
            // Thử lại lần 2 sau 300ms nếu DB chưa kịp flush
            try {
                Thread.sleep(300);
            } catch (InterruptedException ignored) {}
            analysisOpt = aiAnalysisRepository.findById(analysisId);
        }

        if (analysisOpt.isEmpty()) {
            log.error("[MockAiEngine] Không tìm thấy Analysis ID: {}", analysisId);
            return;
        }

        AiAnalysis analysis = analysisOpt.get();
        Match match = analysis.getMatch();
        Long matchId = match != null ? match.getId() : null;

        try {
            if (cancelledAnalyses.contains(analysisId)) return;

            // Giai đoạn 1: Khởi động & Quét phát hiện tiếp xúc cầu (hit_scan)
            analysis.setStatus("PROCESSING");
            analysis.setStartedAt(OffsetDateTime.now());
            aiAnalysisRepository.save(analysis);

            stageMap.put(analysisId, "hit_scan: Phát hiện các khung hình tiếp xúc vợt & cầu");
            progressMap.put(analysisId, 15);
            Thread.sleep(1500);

            if (cancelledAnalyses.contains(analysisId)) return;

            // Kịch bản kiểm thử: Nếu tiêu đề chứa 'fail', mô phỏng lỗi UNSUPPORTED_VIDEO_ANGLE (VS-13)
            if (match != null && match.getTitle() != null && match.getTitle().toLowerCase().contains("fail")) {
                log.warn("[MockAiEngine] Kích hoạt kịch bản kiểm thử lỗi UNSUPPORTED_VIDEO_ANGLE cho Analysis ID: {}", analysisId);
                handleFailure(analysis, matchId, "UNSUPPORTED_VIDEO_ANGLE", "Góc quay video không chuẩn hoặc người chơi bị che khuất trong nhiều khung hình liên tiếp.");
                return;
            }

            progressMap.put(analysisId, 35);
            Thread.sleep(1500);
            if (cancelledAnalyses.contains(analysisId)) return;

            // Giai đoạn 2: Trích xuất tư thế & Phân loại cú đánh (pose_and_classification)
            stageMap.put(analysisId, "pose_and_classification: Nhận diện loại cú đánh & vị trí đấu thủ");
            progressMap.put(analysisId, 55);
            Thread.sleep(1500);
            if (cancelledAnalyses.contains(analysisId)) return;

            // Giai đoạn 3: Phân đoạn pha cầu (rally_segmentation)
            stageMap.put(analysisId, "rally_segmentation: Phân đoạn các pha cầu & tính điểm số");
            progressMap.put(analysisId, 75);
            Thread.sleep(1500);
            if (cancelledAnalyses.contains(analysisId)) return;

            // Giai đoạn 4: Phân tích chiến thuật & Chỉ số CoachAI+ (tactical_analysis)
            stageMap.put(analysisId, "tactical_analysis: Tổng hợp radar 5 trục, ma trận phản xạ & insights");
            progressMap.put(analysisId, 90);
            Thread.sleep(1000);
            if (cancelledAnalyses.contains(analysisId)) return;

            // Sinh dữ liệu thực tế chuẩn CoachAI+ 2.0
            generateMockAiData(analysis, match);

            // Hoàn tất
            analysis.setStatus("COMPLETED");
            analysis.setCompletedAt(OffsetDateTime.now());
            aiAnalysisRepository.save(analysis);

            if (matchId != null) {
                matchRepository.findById(matchId).ifPresent(m -> {
                    m.setStatus("ANALYZED");
                    matchRepository.save(m);
                });
            }

            progressMap.put(analysisId, 100);
            stageMap.put(analysisId, "completed: Phân tích hoàn tất thành công");
            log.info("[MockAiEngine] Phân tích hoàn tất thành công cho Analysis ID: {}", analysisId);

        } catch (InterruptedException ie) {
            Thread.currentThread().interrupt();
            log.error("[MockAiEngine] Tiến trình phân tích bị gián đoạn", ie);
            handleFailure(analysis, matchId, "ANALYSIS_INTERRUPTED", "Tiến trình phân tích bị gián đoạn");
        } catch (Exception e) {
            log.error("[MockAiEngine] Lỗi trong quá trình sinh dữ liệu phân tích", e);
            handleFailure(analysis, matchId, "ANALYSIS_FAILED", e.getMessage());
        }
    }

    private void handleFailure(AiAnalysis analysis, Long matchId, String code, String message) {
        analysis.setStatus("FAILED");
        analysis.setErrorCode(code);
        analysis.setErrorMessage(message);
        aiAnalysisRepository.save(analysis);

        if (matchId != null) {
            matchRepository.findById(matchId).ifPresent(m -> {
                m.setStatus("READY"); // Cho phép thử lại
                matchRepository.save(m);
            });
        }
        progressMap.remove(analysis.getId());
        stageMap.remove(analysis.getId());
    }


    private void generateMockAiData(AiAnalysis analysis, Match match) throws Exception {
        // Xóa dữ liệu cũ nếu có
        rallyRepository.deleteByAnalysisId(analysis.getId());
        aiEventRepository.deleteByAnalysisId(analysis.getId());
        matchStatisticRepository.deleteByAnalysisId(analysis.getId());

        String[] strokeTypes = {"SERVE", "CLEAR", "DROP", "SMASH", "LIFT", "DRIVE", "NET_SHOT", "NET_ATTACK"};
        String[] strokeSides = {"FOREHAND", "BACKHAND", "AROUNDHEAD"};
        String[] winReasons = {"winner_smash", "winner_net_shot", "opponent_forced_error", "opponent_unforced_error"};

        List<AiEvent> createdEvents = new ArrayList<>();
        List<Rally> createdRallies = new ArrayList<>();

        int currentFrame = 60;
        double currentTime = 2.0;
        int eventOrder = 1;
        int rallyCount = 5; // Mô phỏng 5 pha cầu tiêu biểu (VS-11 & VS-12)
        int scoreUpper = 0;
        int scoreLower = 0;

        // Phân bổ cú đánh các rally: 6, 8, 8, 8, 10 => Tổng 40 cú đánh (Trung bình 8.0 cú/pha)
        int[] strokesPerRallyArray = {6, 8, 8, 8, 10};

        for (int r = 1; r <= rallyCount; r++) {
            int strokesInRally = strokesPerRallyArray[r - 1];
            double rallyStartTime = currentTime;
            AiEvent rallyStartEvent = null;
            AiEvent rallyEndEvent = null;
            List<String> strokeSeq = new ArrayList<>();

            String serverSide = (r % 2 == 1) ? "UPPER" : "LOWER";

            for (int s = 0; s < strokesInRally; s++) {
                String playerSide = (s % 2 == 0) ? serverSide : (serverSide.equals("UPPER") ? "LOWER" : "UPPER");
                String stroke = (s == 0) ? "SERVE" : strokeTypes[(s * 3 + r) % strokeTypes.length];
                String strokeSide = strokeSides[(s + r) % strokeSides.length];
                strokeSeq.add(stroke.toLowerCase());

                // Tọa độ vị trí sân (0.0 .. 1.0)
                double playerX = playerSide.equals("UPPER") ? 0.35 + (s * 0.05) % 0.3 : 0.40 + (s * 0.05) % 0.3;
                double playerY = playerSide.equals("UPPER") ? 0.15 + (s * 0.04) % 0.2 : 0.65 + (s * 0.04) % 0.2;
                double oppX = 0.5;
                double oppY = playerSide.equals("UPPER") ? 0.75 : 0.25;

                int hittingArea = playerSide.equals("UPPER") ? ((s % 3) + 1) : ((s % 3) + 7);
                int landingArea = playerSide.equals("UPPER") ? ((s % 3) + 7) : ((s % 3) + 1);

                // VS-10: Giả lập cú đánh khó nhận diện với confidence < 0.60 (ví dụ 0.52) để kiểm thử cảnh báo độ tin cậy thấp
                double strokeConfidence;
                if (r == 1 && s == 3) {
                    strokeConfidence = 0.52; // Kịch bản Gherkin VS-10: confidence = 0.52
                } else if (r == 2 && s == 4) {
                    strokeConfidence = 0.58;
                } else {
                    strokeConfidence = 0.85 + (s % 15) * 0.01;
                }

                AiEvent event = AiEvent.builder()
                        .analysis(analysis)
                        .eventOrder(eventOrder++)
                        .startFrame(currentFrame)
                        .hitFrame(currentFrame + 12)
                        .endFrame(currentFrame + 24)
                        .timeSeconds(BigDecimal.valueOf(currentTime).setScale(3, RoundingMode.HALF_UP))
                        .playerSide(playerSide)
                        .stroke(stroke)
                        .strokeSide(strokeSide)
                        .confidence(BigDecimal.valueOf(strokeConfidence).setScale(3, RoundingMode.HALF_UP))
                        .refinedFrame(currentFrame + 12)
                        .contactOffset(0)
                        .hitScore(BigDecimal.valueOf(0.9200))
                        .ballRound(s + 1)
                        .gapFromPreviousHitSeconds(BigDecimal.valueOf(s == 0 ? 0.0 : 1.25).setScale(3, RoundingMode.HALF_UP))
                        .top2(objectMapper.writeValueAsString(List.of(stroke.toLowerCase(), strokeTypes[(s + 1) % strokeTypes.length].toLowerCase())))
                        .cropBox(objectMapper.writeValueAsString(List.of(120, 80, 240, 320)))
                        .playerPositionCourt(objectMapper.writeValueAsString(List.of(Math.round(playerX * 100.0) / 100.0, Math.round(playerY * 100.0) / 100.0)))
                        .opponentPositionCourt(objectMapper.writeValueAsString(List.of(oppX, oppY)))
                        .contactShuttleProjectionCourt(objectMapper.writeValueAsString(List.of(Math.round(playerX * 100.0) / 100.0, Math.round(playerY * 100.0) / 100.0)))
                        .contactHeightImageRatio(BigDecimal.valueOf(0.6500))
                        .hittingArea3x3(hittingArea)
                        .landingPositionCourtProxy(objectMapper.writeValueAsString(List.of(0.5, oppY)))
                        .landingArea3x3Proxy(landingArea)
                        .landingProxyFrame(currentFrame + 20)
                        .landingProxyConfidence(BigDecimal.valueOf(0.8800))
                        .landingIsProxy(true)
                        .flightTimeToNextHitSeconds(BigDecimal.valueOf(1.150))
                        .averageShuttleSpeedImagePerSecond(BigDecimal.valueOf(245.500))
                        .averageWristSpeedImagePerSecond(BigDecimal.valueOf(112.300))
                        .shuttleVisibilityRatio(BigDecimal.valueOf(0.9200))
                        .attackStateRule(stroke.equals("SMASH") ? "attacking" : "rallying")
                        .build();

                AiEvent savedEvent = aiEventRepository.save(event);
                createdEvents.add(savedEvent);

                if (s == 0) rallyStartEvent = savedEvent;
                if (s == strokesInRally - 1) rallyEndEvent = savedEvent;

                currentFrame += 35;
                currentTime += 1.4;
            }

            // Kết thúc rally, xác định bên thắng
            String winnerSide = (r % 2 == 1) ? "UPPER" : "LOWER";
            if ("UPPER".equals(winnerSide)) scoreUpper++;
            else scoreLower++;

            double rallyEndTime = currentTime;
            double duration = rallyEndTime - rallyStartTime;

            Rally rally = Rally.builder()
                    .match(match)
                    .analysis(analysis)
                    .rallyNumber(r)
                    .startEvent(rallyStartEvent)
                    .endEvent(rallyEndEvent)
                    .startTime(BigDecimal.valueOf(rallyStartTime).setScale(3, RoundingMode.HALF_UP))
                    .endTime(BigDecimal.valueOf(rallyEndTime).setScale(3, RoundingMode.HALF_UP))
                    .duration(BigDecimal.valueOf(duration).setScale(3, RoundingMode.HALF_UP))
                    .totalStrokes(strokesInRally)
                    .boundaryType("TIME_GAP")
                    .serverSide(serverSide)
                    .winnerSide(winnerSide)
                    .winReason(winReasons[(r - 1) % winReasons.length])
                    .scoreUpper(scoreUpper)
                    .scoreLower(scoreLower)
                    .scoreText(scoreUpper + " - " + scoreLower)
                    .strokeSequence(objectMapper.writeValueAsString(strokeSeq))
                    .isComplete(true)
                    .partialStart(false)
                    .partialEnd(false)
                    .build();

            createdRallies.add(rallyRepository.save(rally));

            // Nghỉ giữa các rally 8 giây
            currentFrame += 200;
            currentTime += 8.0;
        }

        // Tạo Match Statistics
        int playerAStrokes = (int) createdEvents.stream().filter(e -> "UPPER".equalsIgnoreCase(e.getPlayerSide())).count();
        int playerBStrokes = createdEvents.size() - playerAStrokes;
        int forehands = (int) createdEvents.stream().filter(e -> "FOREHAND".equalsIgnoreCase(e.getStrokeSide())).count();
        int backhands = (int) createdEvents.stream().filter(e -> "BACKHAND".equalsIgnoreCase(e.getStrokeSide())).count();
        int aroundheads = createdEvents.size() - forehands - backhands;

        MatchStatistic matchStatistic = MatchStatistic.builder()
                .match(match)
                .analysis(analysis)
                .totalStrokes(createdEvents.size())
                .totalRallies(createdRallies.size())
                .avgStrokesPerRally(BigDecimal.valueOf((double) createdEvents.size() / createdRallies.size()).setScale(2, RoundingMode.HALF_UP))
                .avgRallyDuration(BigDecimal.valueOf(11.50))
                .playerAStrokes(playerAStrokes)
                .playerBStrokes(playerBStrokes)
                .forehandCount(forehands)
                .backhandCount(backhands)
                .aroundheadCount(aroundheads)
                .unknownSideCount(0)
                .avgConfidence(BigDecimal.valueOf(0.892))
                .build();
        matchStatisticRepository.save(matchStatistic);

        // Lưu JSONB nâng cao cho CoachAI+ 2.0 trong ai_analyses
        Map<String, Object> summaryMap = Map.of(
                "hit_count", createdEvents.size(),
                "estimated_rally_count", createdRallies.size(),
                "hits_per_minute", 42.5,
                "mean_confidence", 0.892,
                "estimated_score", Map.of(
                        "upper", scoreUpper,
                        "lower", scoreLower,
                        "leader", scoreUpper >= scoreLower ? "upper" : "lower",
                        "is_estimate", true,
                        "method", "last_hit_error_heuristic"
                )
        );

        Map<String, Object> radarMap = Map.of(
                "axes", List.of("attack", "defense", "net_play", "consistency", "variation"),
                "upper", List.of(78, 65, 82, 74, 70),
                "lower", List.of(68, 79, 71, 80, 64)
        );

        Map<String, Object> tacticalMap = Map.of(
                "top_transitions_2gram", List.of(
                        Map.of("from", "serve", "to", "lift", "count", 4),
                        Map.of("from", "lift", "to", "smash", "count", 3),
                        Map.of("from", "smash", "to", "net_shot", "count", 3)
                ),
                "estimated_winning_combinations", Map.of(
                        "upper", List.of(List.of("lift", "smash")),
                        "lower", List.of(List.of("drop", "net_attack"))
                )
        );

        Map<String, Object> coachInsights = Map.of(
                "insights", List.of(
                        Map.of("target", "upper", "category", "attack", "insight", "Tỷ lệ smash thành công đạt 68%, nên tiếp tục duy trì ép cầu bổng góc xa."),
                        Map.of("target", "lower", "category", "defense", "insight", "Cần cải thiện tốc độ bước chân lùi để chống lại các pha smash cắm sân.")
                )
        );

        analysis.setSummaryData(objectMapper.writeValueAsString(summaryMap));
        analysis.setRadarChart(objectMapper.writeValueAsString(radarMap));
        analysis.setTacticalPatterns(objectMapper.writeValueAsString(tacticalMap));
        analysis.setCoachInsights(objectMapper.writeValueAsString(coachInsights));
        analysis.setCourtCorners(objectMapper.writeValueAsString(List.of(
                List.of(0.18, 0.12), List.of(0.82, 0.12),
                List.of(0.88, 0.88), List.of(0.12, 0.88)
        )));
        aiAnalysisRepository.save(analysis);
    }
}

