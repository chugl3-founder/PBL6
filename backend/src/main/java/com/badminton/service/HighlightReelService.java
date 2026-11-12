package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.config.RabbitMQConfig;
import com.badminton.config.S3Properties;
import com.badminton.dto.highlight.HighlightReelRequest;
import com.badminton.dto.highlight.HighlightReelResponse;
import com.badminton.dto.highlight.HighlightSuggestionsResponse;
import com.badminton.entity.AiAnalysis;
import com.badminton.entity.AiEvent;
import com.badminton.entity.HighlightReel;
import com.badminton.entity.Match;
import com.badminton.entity.Rally;
import com.badminton.entity.Video;
import com.badminton.repository.AiAnalysisRepository;
import com.badminton.repository.AiEventRepository;
import com.badminton.repository.HighlightReelRepository;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.RallyRepository;
import com.badminton.repository.VideoRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Highlight reels: suggests rallies, queues a render job for the media worker and serves the finished MP4.
 * Only the match owner may create, list or delete reels.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class HighlightReelService {

    private static final Set<String> ACTIVE_STATUSES = Set.of("QUEUED", "RENDERING");
    /** A job older than this without progress is treated as lost (no media worker was running). */
    private static final Duration STALE_JOB = Duration.ofMinutes(15);
    private static final Duration URL_TTL = Duration.ofHours(12);
    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd/MM/yyyy");

    private final MatchRepository matchRepository;
    private final VideoRepository videoRepository;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final RallyRepository rallyRepository;
    private final AiEventRepository aiEventRepository;
    private final HighlightReelRepository highlightReelRepository;
    private final RabbitTemplate rabbitTemplate;
    private final TransactionTemplate transactionTemplate;
    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    private final S3Properties s3Properties;
    private final ObjectMapper objectMapper;

    @Transactional(readOnly = true)
    public HighlightSuggestionsResponse suggest(Long matchId, String email) {
        Match match = ownedMatch(matchId, email);
        AiAnalysis analysis = completedAnalysis(matchId);
        List<HighlightSelector.Candidate> candidates = rank(match, analysis, videoDuration(matchId, analysis));
        return new HighlightSuggestionsResponse(matchId, analysis.getId(), defaultTitle(match),
                HighlightSelector.MAX_REEL_SECONDS, HighlightSelector.MAX_CLIPS, candidates);
    }

    @Transactional(readOnly = true)
    public List<HighlightReelResponse> list(Long matchId, String email) {
        ownedMatch(matchId, email);
        return highlightReelRepository.findByMatchIdOrderByCreatedAtDesc(matchId).stream()
                .map(this::toResponse)
                .toList();
    }

    /** All reels of the user across matches, newest first: the "Highlight" page and the background-job tray. */
    @Transactional(readOnly = true)
    public List<HighlightReelResponse> listMine(String email) {
        return highlightReelRepository.findByOwnerEmailAndMatchDeletedAtIsNullOrderByCreatedAtDesc(email).stream()
                .map(this::toResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public HighlightReelResponse get(Long matchId, Long reelId, String email) {
        ownedMatch(matchId, email);
        return toResponse(reel(matchId, reelId));
    }

    /** Returns at once with a QUEUED reel; the media worker renders it (HTTP 202). */
    public HighlightReelResponse create(Long matchId, HighlightReelRequest.Create request, String email) {
        // Commit before publishing, as for AI analyses: the worker must always find the row.
        Map<String, Object> job = new LinkedHashMap<>();
        HighlightReel created = transactionTemplate.execute(status -> {
            HighlightReel reel = buildReel(matchId, request, email, job);
            return highlightReelRepository.save(reel);
        });
        job.put("reelId", created.getId());
        job.put("outputPath", "highlights/" + matchId + "/" + created.getId() + ".mp4");

        try {
            String payload = objectMapper.writeValueAsString(job);
            rabbitTemplate.convertAndSend(RabbitMQConfig.MEDIA_EXCHANGE_NAME, RabbitMQConfig.MEDIA_ROUTING_KEY, payload);
            log.info("Queued highlight reel {} for match {} ({} clips)", created.getId(), matchId,
                    ((List<?>) job.get("clips")).size());
        } catch (Exception e) {
            log.warn("Could not queue highlight reel {}: {}", created.getId(), e.getMessage());
            created.setStatus("FAILED");
            created.setErrorMessage("Không gửi được yêu cầu tới máy dựng video. Hãy thử lại sau.");
            highlightReelRepository.save(created);
        }
        return toResponse(created);
    }

    @Transactional
    public void delete(Long matchId, Long reelId, String email) {
        ownedMatch(matchId, email);
        HighlightReel reel = reel(matchId, reelId);
        highlightReelRepository.delete(reel);
        if (reel.getStoragePath() != null) {
            try {
                s3Client.deleteObject(DeleteObjectRequest.builder()
                        .bucket(bucket()).key(reel.getStoragePath()).build());
            } catch (Exception e) {
                // The row is gone, so the file is unreachable; a leftover object only costs storage.
                log.warn("Could not delete highlight file {}: {}", reel.getStoragePath(), e.getMessage());
            }
        }
    }

    private HighlightReel buildReel(Long matchId, HighlightReelRequest.Create request, String email,
                                    Map<String, Object> job) {
        Match match = ownedMatch(matchId, email);
        AiAnalysis analysis = completedAnalysis(matchId);
        Video video = videoRepository.findByMatchId(matchId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "VIDEO_NOT_FOUND",
                        "Trận đấu chưa có video"));

        OffsetDateTime staleBefore = OffsetDateTime.now().minus(STALE_JOB);
        boolean busy = highlightReelRepository.findByMatchIdOrderByCreatedAtDesc(matchId).stream()
                .anyMatch(r -> ACTIVE_STATUSES.contains(r.getStatus()) && r.getUpdatedAt().isAfter(staleBefore));
        if (busy) {
            throw new ApiException(HttpStatus.CONFLICT, ErrorType.VALIDATION, "HIGHLIGHT_IN_PROGRESS",
                    "Đang có một video highlight được dựng cho trận này. Hãy đợi video đó xong.");
        }

        Set<Long> wanted = new HashSet<>(request.rallyIds());
        if (wanted.size() > HighlightSelector.MAX_CLIPS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "TOO_MANY_CLIPS",
                    "Chỉ chọn tối đa " + HighlightSelector.MAX_CLIPS + " pha cầu");
        }
        Map<Long, HighlightSelector.Candidate> byId = rank(match, analysis, videoDuration(matchId, analysis)).stream()
                .collect(Collectors.toMap(HighlightSelector.Candidate::rallyId, Function.identity()));
        List<HighlightSelector.Candidate> chosen = new ArrayList<>();
        for (Long id : wanted) {
            HighlightSelector.Candidate c = byId.get(id);
            if (c == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "INVALID_RALLY",
                        "Pha cầu không thuộc phân tích hiện tại của trận hoặc không dùng được cho highlight");
            }
            chosen.add(c);
        }
        chosen.sort(java.util.Comparator.comparingInt(HighlightSelector.Candidate::rallyNumber));
        double total = chosen.stream().mapToDouble(HighlightSelector.Candidate::clipDuration).sum();
        if (total > HighlightSelector.MAX_REEL_SECONDS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "REEL_TOO_LONG",
                    "Tổng thời lượng " + Math.round(total) + " giây vượt giới hạn "
                            + Math.round(HighlightSelector.MAX_REEL_SECONDS) + " giây. Hãy bỏ bớt pha cầu.");
        }

        List<Map<String, Object>> clips = chosen.stream().map(c -> {
            Map<String, Object> clip = new LinkedHashMap<>();
            clip.put("rallyId", c.rallyId());
            clip.put("rallyNumber", c.rallyNumber());
            clip.put("start", c.clipStart());
            clip.put("end", c.clipEnd());
            clip.put("label", c.label());
            clip.put("game", c.gameNumber());
            clip.put("scoreA", c.scoreABefore());
            clip.put("scoreB", c.scoreBBefore());
            return clip;
        }).toList();

        String title = request.title() == null || request.title().isBlank() ? defaultTitle(match) : request.title().trim();
        job.put("matchId", matchId);
        job.put("title", title);
        job.put("subtitle", match.getPlayerAName() + " vs " + match.getPlayerBName()
                + (match.getMatchDate() != null ? " · " + match.getMatchDate().format(DATE) : ""));
        // The scoreboard is per player, not per court half: players change ends between games.
        job.put("nameA", match.getPlayerAName());
        job.put("nameB", match.getPlayerBName());
        job.put("videoStoragePath", video.getStoragePath());
        if ("YOUTUBE".equalsIgnoreCase(video.getVideoSourceType()) && video.getYoutubeUrl() != null) {
            job.put("youtubeUrl", video.getYoutubeUrl());
        }
        job.put("clips", clips);

        try {
            return HighlightReel.builder()
                    .match(match)
                    .analysis(analysis)
                    .owner(match.getOwner())
                    .title(title)
                    .clips(objectMapper.writeValueAsString(clips))
                    .build();
        } catch (JsonProcessingException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorType.SYSTEM, "HIGHLIGHT_SERIALIZE",
                    "Không tạo được danh sách pha cầu");
        }
    }

    private List<HighlightSelector.Candidate> rank(Match match, AiAnalysis analysis, Double videoDuration) {
        List<Rally> rallies = rallyRepository.findByAnalysisIdOrderByRallyNumberAsc(analysis.getId());
        // One query for all events instead of loading each rally's end event lazily.
        Map<Long, AiEvent> events = aiEventRepository.findByAnalysisIdOrderByEventOrderAsc(analysis.getId()).stream()
                .collect(Collectors.toMap(AiEvent::getId, Function.identity()));
        List<HighlightSelector.RallyFacts> facts = rallies.stream().map(r -> {
            AiEvent end = r.getEndEvent() != null ? events.get(r.getEndEvent().getId()) : null;
            return new HighlightSelector.RallyFacts(
                    r.getId(),
                    r.getRallyNumber(),
                    r.getStartTime().doubleValue(),
                    r.getEndTime().doubleValue(),
                    r.getTotalStrokes() != null ? r.getTotalStrokes() : 0,
                    r.getWinnerSide(),
                    r.getScoreUpper() != null ? r.getScoreUpper() : 0,
                    r.getScoreLower() != null ? r.getScoreLower() : 0,
                    end != null ? end.getStroke() : null,
                    end != null ? end.getPlayerSide() : null,
                    !Boolean.FALSE.equals(r.getIsComplete()));
        }).toList();
        return HighlightSelector.rank(facts, videoDuration, upperIsPlayerA(match));
    }

    /** Who started on the upper half of the court (game 1). */
    private static boolean upperIsPlayerA(Match match) {
        return !"PLAYER_B".equalsIgnoreCase(match.getUpperPlayer());
    }

    private Double videoDuration(Long matchId, AiAnalysis analysis) {
        if (analysis.getVideoDurationSeconds() != null) {
            return analysis.getVideoDurationSeconds().doubleValue();
        }
        return videoRepository.findByMatchId(matchId)
                .map(Video::getDurationSeconds)
                .map(java.math.BigDecimal::doubleValue)
                .orElse(null);
    }

    private Match ownedMatch(Long matchId, String email) {
        Match match = matchRepository.findByIdAndDeletedAtIsNull(matchId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu"));
        if (email == null || !email.equalsIgnoreCase(match.getOwner().getEmail())) {
            throw new ApiException(HttpStatus.FORBIDDEN, ErrorType.VALIDATION, "FORBIDDEN",
                    "Bạn không có quyền thao tác trên trận đấu này");
        }
        return match;
    }

    private AiAnalysis completedAnalysis(Long matchId) {
        AiAnalysis analysis = aiAnalysisRepository.findByMatchIdAndIsCurrentTrue(matchId)
                .orElseThrow(() -> new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ANALYSIS_NOT_FOUND",
                        "Trận đấu chưa được phân tích"));
        if (!"COMPLETED".equalsIgnoreCase(analysis.getStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ANALYSIS_NOT_COMPLETED",
                    "Hãy đợi phân tích AI hoàn tất rồi tạo video highlight");
        }
        return analysis;
    }

    private HighlightReel reel(Long matchId, Long reelId) {
        return highlightReelRepository.findByIdAndMatchId(reelId, matchId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.VALIDATION, "HIGHLIGHT_NOT_FOUND",
                        "Không tìm thấy video highlight"));
    }

    private String defaultTitle(Match match) {
        return "Highlight " + match.getPlayerAName() + " vs " + match.getPlayerBName();
    }

    private HighlightReelResponse toResponse(HighlightReel reel) {
        String videoUrl = null;
        String downloadUrl = null;
        if ("COMPLETED".equals(reel.getStatus()) && reel.getStoragePath() != null) {
            videoUrl = presign(reel.getStoragePath(), null);
            downloadUrl = presign(reel.getStoragePath(),
                    "attachment; filename=\"highlight-" + reel.getMatch().getId() + "-" + reel.getId() + ".mp4\"");
        }
        String status = reel.getStatus();
        String error = reel.getErrorMessage();
        if (ACTIVE_STATUSES.contains(status) && reel.getUpdatedAt() != null
                && reel.getUpdatedAt().isBefore(OffsetDateTime.now().minus(STALE_JOB))) {
            status = "FAILED";
            error = "Máy dựng video không phản hồi. Hãy kiểm tra media worker đang chạy rồi tạo lại.";
        }
        Match match = reel.getMatch();
        return new HighlightReelResponse(reel.getId(), match.getId(), match.getPlayerAName(), match.getPlayerBName(),
                reel.getAnalysis().getId(),
                reel.getTitle(), status, reel.getProgressPercent(), clipCount(reel.getClips()),
                reel.getDurationSeconds(), reel.getFileSize(), error, videoUrl, downloadUrl,
                reel.getCreatedAt(), reel.getCompletedAt());
    }

    private int clipCount(String clipsJson) {
        try {
            return objectMapper.readTree(clipsJson).size();
        } catch (Exception e) {
            return 0;
        }
    }

    private String presign(String key, String contentDisposition) {
        GetObjectRequest.Builder get = GetObjectRequest.builder().bucket(bucket()).key(key);
        if (contentDisposition != null) {
            get.responseContentDisposition(contentDisposition);
        }
        return s3Presigner.presignGetObject(GetObjectPresignRequest.builder()
                .signatureDuration(URL_TTL)
                .getObjectRequest(get.build())
                .build()).url().toString();
    }

    private String bucket() {
        return s3Properties.bucket().videos();
    }
}
