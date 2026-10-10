package com.badminton.config;

import com.badminton.entity.*;
import com.badminton.repository.*;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.context.event.ApplicationReadyEvent;
import org.springframework.context.event.EventListener;
import org.springframework.core.io.ClassPathResource;
import org.springframework.data.domain.Pageable;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

import java.io.InputStream;
import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;
import java.util.*;

@Slf4j
@Component
@RequiredArgsConstructor
public class PublicMatchDataSeeder {

    private final MatchRepository matchRepository;
    private final VideoRepository videoRepository;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final AiEventRepository aiEventRepository;
    private final RallyRepository rallyRepository;
    private final MatchStatisticRepository matchStatisticRepository;
    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @EventListener(ApplicationReadyEvent.class)
    @Transactional
    public void seedPublicMatches() {
        long publishedCount = matchRepository.findByStatusAndDeletedAtIsNull("PUBLISHED", Pageable.unpaged()).getTotalElements();
        if (publishedCount > 0) {
            log.info("[PublicMatchSeeder] Đã có {} trận đấu công khai trong hệ thống, bỏ qua nạp mẫu.", publishedCount);
            return;
        }

        log.info("[PublicMatchSeeder] Bắt đầu nạp dữ liệu trận đấu công khai từ dataset YouTube...");

        // 1. Tìm hoặc tạo tài khoản Admin quản trị
        User adminUser = userRepository.findByEmail("admin@badminton.vn")
                .orElseGet(() -> userRepository.findAll().stream()
                        .filter(u -> "ROLE_ADMIN".equals(u.getRole()))
                        .findFirst()
                        .orElseGet(() -> userRepository.save(User.builder()
                                .email("admin@badminton.vn")
                                .passwordHash(passwordEncoder.encode("Admin@123456"))
                                .fullName("Quản Trị Viên PBL6")
                                .role("ROLE_ADMIN")
                                .status("ACTIVE")
                                .badmintonLevel("PRO")
                                .build())));

        // 2. Đọc file dataset từ classpath
        ClassPathResource resource = new ClassPathResource("dataset/public_matches_seed.json");
        if (!resource.exists()) {
            log.warn("[PublicMatchSeeder] Không tìm thấy file dataset/public_matches_seed.json");
            return;
        }

        ObjectMapper mapper = new ObjectMapper();
        try (InputStream is = resource.getInputStream()) {
            List<JsonNode> matchesList = mapper.readValue(is, new TypeReference<List<JsonNode>>() {});
            log.info("[PublicMatchSeeder] Tìm thấy {} trận đấu trong file seed JSON.", matchesList.size());

            for (JsonNode mNode : matchesList) {
                String title = mNode.path("title").asText();
                String description = mNode.path("description").asText();
                String playerA = mNode.path("playerAName").asText();
                String playerB = mNode.path("playerBName").asText();

                // Tạo Match
                Match match = Match.builder()
                        .owner(adminUser)
                        .title(title)
                        .description(description)
                        .playerAName(playerA)
                        .playerBName(playerB)
                        .upperPlayer("PLAYER_A")
                        .lowerPlayer("PLAYER_B")
                        .matchDate(LocalDate.now().minusDays(15))
                        .source("ADMIN_CURATED")
                        .status("PUBLISHED")
                        .build();
                Match savedMatch = matchRepository.save(match);

                // Tạo Video
                JsonNode vNode = mNode.path("video");
                Video video = Video.builder()
                        .match(savedMatch)
                        .fileName(vNode.path("fileName").asText("match.mp4"))
                        .storagePath(vNode.path("storagePath").asText("youtube"))
                        .videoSourceType("YOUTUBE")
                        .youtubeUrl(vNode.path("youtubeUrl").asText())
                        .youtubeVideoId(vNode.path("youtubeVideoId").asText())
                        .fileSize(0L)
                        .durationSeconds(BigDecimal.valueOf(vNode.path("durationSeconds").asDouble(3000.0)))
                        .status("READY")
                        .build();
                Video savedVideo = videoRepository.save(video);

                // Tạo AiAnalysis
                AiAnalysis analysis = AiAnalysis.builder()
                        .match(savedMatch)
                        .video(savedVideo)
                        .status("COMPLETED")
                        .modelName("CoachAI+ ShuttleSet")
                        .modelVersion("2.0_production")
                        .isCurrent(true)
                        .startedAt(OffsetDateTime.now().minusHours(2))
                        .completedAt(OffsetDateTime.now().minusHours(1))
                        .build();
                AiAnalysis savedAnalysis = aiAnalysisRepository.save(analysis);

                // Tạo AiEvents
                JsonNode eventsArr = mNode.path("events");
                List<AiEvent> eventsToSave = new ArrayList<>();
                Map<Integer, AiEvent> firstEventOfRally = new HashMap<>();
                Map<Integer, AiEvent> lastEventOfRally = new HashMap<>();

                for (JsonNode eNode : eventsArr) {
                    int eventOrder = eNode.path("eventOrder").asInt();
                    int rallyNum = eNode.path("rallyNumber").asInt();
                    double timeSec = eNode.path("timeSeconds").asDouble();
                    int frame = (int) Math.round(timeSec * 30.0);

                    AiEvent event = AiEvent.builder()
                            .analysis(savedAnalysis)
                            .eventOrder(eventOrder)
                            .startFrame(Math.max(0, frame - 10))
                            .hitFrame(frame)
                            .endFrame(frame + 10)
                            .timeSeconds(BigDecimal.valueOf(timeSec))
                            .playerSide(eNode.path("playerSide").asText("UPPER"))
                            .stroke(eNode.path("stroke").asText("CLEAR"))
                            .strokeSide(eNode.path("strokeSide").asText("FOREHAND"))
                            .confidence(BigDecimal.valueOf(eNode.path("confidence").asDouble(0.90)))
                            .playerPositionCourt(eNode.path("playerPositionCourt").toString())
                            .opponentPositionCourt(eNode.path("opponentPositionCourt").toString())
                            .contactShuttleProjectionCourt(eNode.path("contactShuttleProjectionCourt").toString())
                            .landingPositionCourtProxy(eNode.path("landingPositionCourtProxy").toString())
                            .hittingArea3x3(eNode.path("hittingArea3x3").asInt(5))
                            .landingArea3x3Proxy(eNode.path("landingArea3x3Proxy").asInt(5))
                            .averageShuttleSpeedImagePerSecond(BigDecimal.valueOf(eNode.path("averageShuttleSpeed").asDouble(50.0)))
                            .attackStateRule(eNode.path("attackStateRule").asText("NEUTRAL"))
                            .build();

                    eventsToSave.add(event);
                }

                List<AiEvent> savedEvents = aiEventRepository.saveAll(eventsToSave);
                for (AiEvent e : savedEvents) {
                    // Mapping rally first/last event
                    int rNum = 1;
                    if (e.getEventOrder() <= eventsArr.size()) {
                        rNum = eventsArr.get(e.getEventOrder() - 1).path("rallyNumber").asInt(1);
                    }
                    if (!firstEventOfRally.containsKey(rNum)) {
                        firstEventOfRally.put(rNum, e);
                    }
                    lastEventOfRally.put(rNum, e);
                }

                // Tạo Rallies
                JsonNode ralliesArr = mNode.path("rallies");
                List<Rally> ralliesToSave = new ArrayList<>();
                for (JsonNode rNode : ralliesArr) {
                    int rNum = rNode.path("rallyNumber").asInt();
                    AiEvent startEv = firstEventOfRally.getOrDefault(rNum, savedEvents.get(0));
                    AiEvent endEv = lastEventOfRally.getOrDefault(rNum, savedEvents.get(savedEvents.size() - 1));

                    Rally rally = Rally.builder()
                            .match(savedMatch)
                            .analysis(savedAnalysis)
                            .rallyNumber(rNum)
                            .startEvent(startEv)
                            .endEvent(endEv)
                            .startTime(BigDecimal.valueOf(rNode.path("startTime").asDouble()))
                            .endTime(BigDecimal.valueOf(rNode.path("endTime").asDouble()))
                            .duration(BigDecimal.valueOf(rNode.path("duration").asDouble(5.0)))
                            .totalStrokes(rNode.path("totalStrokes").asInt(1))
                            .boundaryType("TIME_GAP")
                            .serverSide(rNode.path("serverSide").asText("UPPER"))
                            .winnerSide(rNode.path("winnerSide").asText("UPPER"))
                            .winReason(rNode.path("winReason").asText("Point Won"))
                            .scoreUpper(rNode.path("scoreUpper").asInt(0))
                            .scoreLower(rNode.path("scoreLower").asInt(0))
                            .scoreText(rNode.path("scoreText").asText("0 - 0"))
                            .strokeSequence(rNode.path("strokeSequence").toString())
                            .isComplete(true)
                            .build();
                    ralliesToSave.add(rally);
                }
                rallyRepository.saveAll(ralliesToSave);

                // Tạo MatchStatistic
                JsonNode statsNode = mNode.path("statistics");
                MatchStatistic statistic = MatchStatistic.builder()
                        .match(savedMatch)
                        .analysis(savedAnalysis)
                        .totalStrokes(statsNode.path("totalStrokes").asInt(savedEvents.size()))
                        .totalRallies(statsNode.path("totalRallies").asInt(ralliesToSave.size()))
                        .avgStrokesPerRally(BigDecimal.valueOf(statsNode.path("avgStrokesPerRally").asDouble(8.0)))
                        .avgRallyDuration(BigDecimal.valueOf(statsNode.path("avgRallyDuration").asDouble(6.5)))
                        .playerAStrokes(statsNode.path("playerAStrokes").asInt(0))
                        .playerBStrokes(statsNode.path("playerBStrokes").asInt(0))
                        .forehandCount(statsNode.path("forehandCount").asInt(0))
                        .backhandCount(statsNode.path("backhandCount").asInt(0))
                        .avgConfidence(BigDecimal.valueOf(0.91))
                        .build();
                matchStatisticRepository.save(statistic);

                log.info("[PublicMatchSeeder] ✅ Đã nạp thành công: '{}' (ID={}) với {} cú đánh và {} pha cầu.",
                        title, savedMatch.getId(), savedEvents.size(), ralliesToSave.size());
            }

            log.info("[PublicMatchSeeder] Hoàn thành nạp toàn bộ {} trận đấu công khai!", matchesList.size());
        } catch (Exception e) {
            log.error("[PublicMatchSeeder] Lỗi khi nạp dữ liệu trận đấu công khai: ", e);
        }
    }
}
