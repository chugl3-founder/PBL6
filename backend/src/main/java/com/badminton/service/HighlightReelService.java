package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.config.RabbitMQConfig;
import com.badminton.config.S3Properties;
import com.badminton.dto.highlight.HighlightReelRequest;
import com.badminton.dto.highlight.HighlightReelResponse;
import com.badminton.dto.highlight.HighlightSuggestionsResponse;
import com.badminton.entity.HighlightReel;
import com.badminton.entity.Match;
import com.badminton.repository.HighlightQueryRepository;
import com.badminton.repository.HighlightReelRepository;
import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.GetObjectRequest;
import software.amazon.awssdk.services.s3.presigner.S3Presigner;
import software.amazon.awssdk.services.s3.presigner.model.GetObjectPresignRequest;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.OffsetDateTime;
import java.time.format.DateTimeFormatter;
import java.util.ArrayList;
import java.util.Comparator;
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

    private final MatchAccessService matchAccess;
    private final HighlightReelRepository highlightReelRepository;
    private final HighlightQueryRepository highlightQueryRepository;
    private final RabbitTemplate rabbitTemplate;
    private final S3Presigner s3Presigner;
    private final S3Client s3Client;
    private final S3Properties s3Properties;
    private final ObjectMapper objectMapper;

    /** One database round trip (see HighlightQueryRepository). */
    public HighlightSuggestionsResponse suggest(Long matchId, String email) {
        HighlightQueryRepository.Loaded loaded = loadOwned(matchId, email);
        HighlightQueryRepository.Context ctx = loaded.context();
        requireCompleted(ctx);
        return new HighlightSuggestionsResponse(matchId, ctx.analysisId(), defaultTitle(ctx),
                HighlightSelector.MAX_REEL_SECONDS, HighlightSelector.MAX_CLIPS, rank(loaded));
    }

    @Transactional(readOnly = true)
    public List<HighlightReelResponse> list(Long matchId, String email) {
        matchAccess.requireOwner(matchId, email);
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
        matchAccess.requireOwner(matchId, email);
        return toResponse(reel(matchId, reelId));
    }

    /**
     * Returns at once with a QUEUED reel; the media worker renders it (HTTP 202). Two database round trips:
     * one read of everything needed, then an autocommit INSERT, committed before the job is published so the
     * worker always finds the row.
     */
    public HighlightReelResponse create(Long matchId, HighlightReelRequest.Create request, String email) {
        HighlightQueryRepository.Loaded loaded = loadOwned(matchId, email);
        HighlightQueryRepository.Context ctx = loaded.context();
        requireCompleted(ctx);
        if (ctx.videoStoragePath() == null && ctx.youtubeUrl() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_VIDEO_NOT_FOUND",
                    "Trận đấu chưa có video");
        }
        if (ctx.busy()) {
            throw new ApiException(HttpStatus.CONFLICT, ErrorType.VALIDATION, "ERR_HIGHLIGHT_IN_PROGRESS",
                    "Đang có một video highlight được dựng cho trận này. Hãy đợi video đó xong.");
        }

        List<Map<String, Object>> clips = choose(rank(loaded), request.rallyIds()).stream().map(c -> {
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

        String title = request.title() == null || request.title().isBlank() ? defaultTitle(ctx) : request.title().trim();
        String clipsJson;
        try {
            clipsJson = objectMapper.writeValueAsString(clips);
        } catch (JsonProcessingException e) {
            throw new ApiException(HttpStatus.INTERNAL_SERVER_ERROR, ErrorType.SYSTEM, "ERR_HIGHLIGHT_SERIALIZE",
                    "Không tạo được danh sách pha cầu");
        }
        HighlightQueryRepository.Inserted created = highlightQueryRepository.insertQueued(
                matchId, ctx.analysisId(), ctx.ownerId(), title, clipsJson);

        Map<String, Object> job = new LinkedHashMap<>();
        job.put("matchId", matchId);
        job.put("title", title);
        job.put("subtitle", ctx.playerAName() + " vs " + ctx.playerBName()
                + (ctx.matchDate() != null ? " · " + ctx.matchDate().format(DATE) : ""));
        // The scoreboard is per player, not per court half: players change ends between games.
        job.put("nameA", ctx.playerAName());
        job.put("nameB", ctx.playerBName());
        job.put("videoStoragePath", ctx.videoStoragePath());
        if ("YOUTUBE".equalsIgnoreCase(ctx.videoSourceType()) && ctx.youtubeUrl() != null) {
            job.put("youtubeUrl", ctx.youtubeUrl());
        }
        job.put("clips", clips);
        job.put("reelId", created.id());
        job.put("outputPath", "highlights/" + matchId + "/" + created.id() + ".mp4");

        String status = created.status();
        String error = null;
        try {
            String payload = objectMapper.writeValueAsString(job);
            rabbitTemplate.convertAndSend(RabbitMQConfig.MEDIA_EXCHANGE_NAME, RabbitMQConfig.MEDIA_ROUTING_KEY, payload);
            log.info("Queued highlight reel {} for match {} ({} clips)", created.id(), matchId, clips.size());
        } catch (Exception e) {
            log.warn("Could not queue highlight reel {}: {}", created.id(), e.getMessage());
            status = "FAILED";
            error = "Không gửi được yêu cầu tới máy dựng video. Hãy thử lại sau.";
            markFailed(created.id(), error);
        }
        return new HighlightReelResponse(created.id(), matchId, ctx.playerAName(), ctx.playerBName(),
                ctx.analysisId(), title, status, created.progressPercent(), clips.size(),
                null, null, error, null, null, created.createdAt(), null);
    }

    @Transactional
    public void delete(Long matchId, Long reelId, String email) {
        matchAccess.requireOwner(matchId, email);
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

    private void markFailed(Long reelId, String error) {
        highlightReelRepository.findById(reelId).ifPresent(reel -> {
            reel.setStatus("FAILED");
            reel.setErrorMessage(error);
            highlightReelRepository.save(reel);
        });
    }

    /** The requested rallies in match order, checked against the current analysis and the reel limits. */
    private static List<HighlightSelector.Candidate> choose(List<HighlightSelector.Candidate> ranked,
                                                           List<Long> rallyIds) {
        Set<Long> wanted = new HashSet<>(rallyIds);
        if (wanted.size() > HighlightSelector.MAX_CLIPS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_TOO_MANY_CLIPS",
                    "Chỉ chọn tối đa " + HighlightSelector.MAX_CLIPS + " pha cầu");
        }
        Map<Long, HighlightSelector.Candidate> byId = ranked.stream()
                .collect(Collectors.toMap(HighlightSelector.Candidate::rallyId, Function.identity()));
        List<HighlightSelector.Candidate> chosen = new ArrayList<>();
        for (Long id : wanted) {
            HighlightSelector.Candidate c = byId.get(id);
            if (c == null) {
                throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_INVALID_RALLY",
                        "Pha cầu không thuộc phân tích hiện tại của trận hoặc không dùng được cho highlight");
            }
            chosen.add(c);
        }
        chosen.sort(Comparator.comparingInt(HighlightSelector.Candidate::rallyNumber));
        double total = chosen.stream().mapToDouble(HighlightSelector.Candidate::clipDuration).sum();
        if (total > HighlightSelector.MAX_REEL_SECONDS) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_REEL_TOO_LONG",
                    "Tổng thời lượng " + Math.round(total) + " giây vượt giới hạn "
                            + Math.round(HighlightSelector.MAX_REEL_SECONDS) + " giây. Hãy bỏ bớt pha cầu.");
        }
        return chosen;
    }

    private static List<HighlightSelector.Candidate> rank(HighlightQueryRepository.Loaded loaded) {
        HighlightQueryRepository.Context ctx = loaded.context();
        List<HighlightSelector.RallyFacts> facts = loaded.rallies().stream()
                .map(r -> new HighlightSelector.RallyFacts(r.id(), r.rallyNumber(), r.startTime(), r.endTime(),
                        r.totalStrokes(), r.winnerSide(), r.scoreUpper(), r.scoreLower(), r.endStroke(),
                        r.endHitterSide(), r.complete()))
                .toList();
        BigDecimal duration = ctx.analysisVideoDuration() != null ? ctx.analysisVideoDuration() : ctx.videoDuration();
        // upper_player is who stood on the upper half when the video starts.
        return HighlightSelector.rank(facts, duration != null ? duration.doubleValue() : null,
                !"PLAYER_B".equalsIgnoreCase(ctx.upperPlayer()),
                HighlightSelector.Start.of(ctx.startGame(), ctx.startScoreA(), ctx.startScoreB()));
    }

    private HighlightQueryRepository.Loaded loadOwned(Long matchId, String email) {
        HighlightQueryRepository.Loaded loaded = highlightQueryRepository
                .load(matchId, OffsetDateTime.now().minus(STALE_JOB), true)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.SYSTEM, "ERR_MATCH_NOT_FOUND",
                        "Không tìm thấy trận đấu"));
        if (email == null || !email.equalsIgnoreCase(loaded.context().ownerEmail())) {
            throw ApiException.forbidden("Bạn không có quyền thao tác trên trận đấu này.");
        }
        return loaded;
    }

    private static void requireCompleted(HighlightQueryRepository.Context ctx) {
        if (ctx.analysisId() == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_ANALYSIS_NOT_FOUND",
                    "Trận đấu chưa được phân tích");
        }
        if (!"COMPLETED".equalsIgnoreCase(ctx.analysisStatus())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, ErrorType.VALIDATION, "ERR_ANALYSIS_NOT_COMPLETED",
                    "Hãy đợi phân tích AI hoàn tất rồi tạo video highlight");
        }
    }

    private HighlightReel reel(Long matchId, Long reelId) {
        return highlightReelRepository.findByIdAndMatchId(reelId, matchId)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, ErrorType.SYSTEM, "ERR_HIGHLIGHT_NOT_FOUND",
                        "Không tìm thấy video highlight"));
    }

    private static String defaultTitle(HighlightQueryRepository.Context ctx) {
        return "Highlight " + ctx.playerAName() + " vs " + ctx.playerBName();
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
