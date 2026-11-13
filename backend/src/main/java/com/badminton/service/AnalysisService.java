package com.badminton.service;

import com.badminton.common.exception.ApiException;
import com.badminton.common.exception.ErrorCodes;
import com.badminton.dto.analysis.AnalysisDispatchResponse;
import com.badminton.dto.analysis.AnalysisStatusResponse;
import com.badminton.entity.AiAnalysis;
import com.badminton.entity.Match;
import com.badminton.entity.Video;
import com.badminton.repository.AiAnalysisRepository;
import com.badminton.repository.AnalysisQueueRepository;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.VideoRepository;
import java.util.Locale;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionTemplate;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.time.OffsetDateTime;
import java.util.Set;

/**
 * The life cycle of an analysis: start it, follow its progress, point the worker at a part of the video,
 * retry it after a failure and cancel it. Every start, first run or retry, is committed first and then handed
 * to AnalysisJobPublisher, which sends it to the AI worker (or the Mock Engine). Replay data is read through
 * ReplayDataService; the admin list through AdminAnalysisService.
 */
@Service
@RequiredArgsConstructor
@Slf4j
public class AnalysisService {

    private static final String MODEL_NAME = "CoachAI+";
    private static final String MODEL_VERSION = "2.0_pbl6_coachai";
    private static final Set<String> RETRYABLE = Set.of("FAILED", "UNSUPPORTED");
    private static final Set<String> RETRYABLE_BY_ADMIN = Set.of("FAILED", "UNSUPPORTED", "CANCELLED");
    private static final Set<String> RUNNING = Set.of("QUEUED", "PROCESSING");

    private final MatchAccessService matchAccess;
    private final MatchRepository matchRepository;
    private final VideoRepository videoRepository;
    private final AiAnalysisRepository aiAnalysisRepository;
    private final AnalysisQueueRepository analysisQueueRepository;
    private final AnalysisJobPublisher jobPublisher;
    private final AnalysisMapper mapper;
    private final TransactionTemplate transactionTemplate;

    /** NFR-PER-02: one database round trip, then the broker; answers 202 at once. */
    public AnalysisDispatchResponse dispatchAnalysis(Long matchId, String email) {
        AnalysisQueueRepository.QueuedAnalysis queued = analysisQueueRepository.createQueuedAnalysis(matchId, email)
                .orElseThrow(() -> transactionTemplate.execute(status -> dispatchRejection(matchId, email)));
        jobPublisher.publish(new AnalysisJobPublisher.AnalysisJob(queued.analysisId(), matchId,
                queued.videoStoragePath(), queued.fromYoutube() ? queued.youtubeUrl() : null));
        return queuedResponse(queued.analysisId(), matchId, "Yêu cầu phân tích đã được tiếp nhận và đưa vào hàng đợi xử lý.");
    }

    /** Explains why createQueuedAnalysis created nothing. Only rejected requests pay for these extra queries. */
    private ApiException dispatchRejection(Long matchId, String email) {
        try {
            matchAccess.requireOwner(matchId, email);
        } catch (ApiException e) {
            return e;
        }
        if (!videoRepository.existsByMatchId(matchId)) {
            return ApiException.badRequest(ErrorCodes.VIDEO_NOT_FOUND, "Trận đấu chưa có video được tải lên");
        }
        return ApiException.badRequest("ERR_VIDEO_NOT_READY", "Video chưa sẵn sàng để phân tích");
    }

    @Transactional(readOnly = true)
    public AnalysisStatusResponse getAnalysisStatus(Long matchId, String email) {
        matchAccess.requireOwnerOrAdmin(matchId, email);
        return statusOf(matchId);
    }

    private AnalysisStatusResponse statusOf(Long matchId) {
        return aiAnalysisRepository.findCurrentOrLatest(matchId)
                .map(analysis -> mapper.toStatusResponse(analysis, matchId))
                .orElseGet(() -> AnalysisStatusResponse.builder()
                        .matchId(matchId)
                        .status("NONE")
                        .progressPercent(0)
                        .currentStage("Chưa có phiên phân tích")
                        .build());
    }

    /**
     * Records where the viewer jumped to while the analysis runs; the GPU worker scans that part first.
     * A finished analysis is left alone without an error: the viewer may seek just as it completes.
     */
    @Transactional
    public AnalysisStatusResponse focusAnalysis(Long matchId, Double seconds, String email) {
        matchAccess.requireOwnerOrAdmin(matchId, email);
        aiAnalysisRepository.findCurrentOrLatest(matchId)
                .ifPresent(a -> aiAnalysisRepository.updateFocusIfRunning(
                        a.getId(), BigDecimal.valueOf(seconds).setScale(2, RoundingMode.HALF_UP), OffsetDateTime.now()));
        return statusOf(matchId);
    }

    /** Retries a FAILED or UNSUPPORTED analysis on the AI worker (owner or admin). */
    public AnalysisDispatchResponse retryAnalysis(Long matchId, Long analysisId, String email) {
        AnalysisJobPublisher.AnalysisJob job = transactionTemplate.execute(status -> {
            Match match = matchAccess.requireOwnerOrAdmin(matchId, email);
            AiAnalysis old = analysisId != null ? findAnalysis(analysisId) : aiAnalysisRepository.findCurrentOrLatest(matchId)
                    .orElseThrow(() -> ApiException.notFound(ErrorCodes.ANALYSIS_NOT_FOUND, "Không tìm thấy phiên phân tích để thử lại"));
            requireBelongsTo(old, matchId);
            if (!RETRYABLE.contains(upper(old.getStatus()))) {
                throw ApiException.badRequest("ERR_ANALYSIS_NOT_FAILED",
                        "Chỉ có thể thử lại phiên phân tích khi đang ở trạng thái FAILED hoặc UNSUPPORTED");
            }
            return requeue(match, old);
        });
        jobPublisher.publish(job);
        log.info("Retried analysis for match {}: new analysis {}", matchId, job.analysisId());
        return queuedResponse(job.analysisId(), matchId, "Đã khởi tạo lại phiên phân tích AI và đưa vào hàng đợi xử lý.");
    }

    /** Admin AI monitor: retries any FAILED, UNSUPPORTED or CANCELLED analysis. */
    public AnalysisDispatchResponse retryAnalysisForAdmin(Long analysisId) {
        AnalysisJobPublisher.AnalysisJob job = transactionTemplate.execute(status -> {
            AiAnalysis old = findAnalysis(analysisId);
            if (!RETRYABLE_BY_ADMIN.contains(upper(old.getStatus()))) {
                throw ApiException.badRequest("ERR_ANALYSIS_NOT_FAILED",
                        "Chỉ có thể thử lại phiên phân tích khi đang ở trạng thái lỗi (FAILED, UNSUPPORTED) hoặc đã hủy (CANCELLED).");
            }
            return requeue(old.getMatch(), old);
        });
        jobPublisher.publish(job);
        log.info("[Admin AI Monitor] Retried analysis {} as {} for match {}", analysisId, job.analysisId(), job.matchId());
        return queuedResponse(job.analysisId(), job.matchId(),
                "Quản trị viên đã kích hoạt chạy lại phiên phân tích AI thành công và đưa vào hàng đợi xử lý.");
    }

    /** A new current QUEUED analysis on the same video. Runs in the caller's transaction. */
    private AnalysisJobPublisher.AnalysisJob requeue(Match match, AiAnalysis old) {
        // Read the video before the demote below clears the persistence context.
        Video video = old.getVideo();
        String storagePath = video.getStoragePath();
        String youtubeUrl = "YOUTUBE".equalsIgnoreCase(video.getVideoSourceType()) ? video.getYoutubeUrl() : null;

        aiAnalysisRepository.demoteAllCurrentByMatchId(match.getId());
        AiAnalysis created = aiAnalysisRepository.saveAndFlush(AiAnalysis.builder()
                .match(match)
                .video(video)
                .status("QUEUED")
                .modelName(MODEL_NAME)
                .modelVersion(MODEL_VERSION)
                .isCurrent(true)
                .build());
        match.setStatus("ANALYZING");
        matchRepository.saveAndFlush(match);
        return new AnalysisJobPublisher.AnalysisJob(created.getId(), match.getId(), storagePath, youtubeUrl);
    }

    @Transactional
    public AnalysisStatusResponse cancelAnalysis(Long matchId, Long analysisId, String email) {
        Match match = matchAccess.requireOwnerOrAdmin(matchId, email);
        AiAnalysis analysis = analysisId != null ? findAnalysis(analysisId) : aiAnalysisRepository.findCurrentOrLatest(matchId)
                .orElseThrow(() -> ApiException.notFound(ErrorCodes.ANALYSIS_NOT_FOUND, "Không tìm thấy phiên phân tích để hủy"));
        requireBelongsTo(analysis, matchId);
        if (!RUNNING.contains(upper(analysis.getStatus()))) {
            throw ApiException.badRequest("ERR_CANNOT_CANCEL",
                    "Chỉ có thể hủy phiên phân tích đang ở trạng thái QUEUED hoặc PROCESSING");
        }

        jobPublisher.cancel(analysis.getId());
        String message = "Phiên phân tích đã bị hủy bởi người dùng.";
        analysis.setStatus("CANCELLED");
        analysis.setCompletedAt(OffsetDateTime.now());
        analysis.setErrorMessage(message);
        aiAnalysisRepository.saveAndFlush(analysis);
        match.setStatus("READY");
        matchRepository.saveAndFlush(match);
        log.info("Cancelled analysis {} of match {}", analysis.getId(), matchId);

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
                .errorMessage(message)
                .build();
    }

    private AiAnalysis findAnalysis(Long analysisId) {
        return aiAnalysisRepository.findById(analysisId)
                .orElseThrow(() -> ApiException.notFound(ErrorCodes.ANALYSIS_NOT_FOUND, "Không tìm thấy phiên phân tích"));
    }

    private static void requireBelongsTo(AiAnalysis analysis, Long matchId) {
        if (!analysis.getMatch().getId().equals(matchId)) {
            throw ApiException.badRequest(ErrorCodes.ANALYSIS_MATCH_MISMATCH, "Phiên phân tích không thuộc về trận đấu này");
        }
    }

    private static String upper(String status) {
        return status == null ? "" : status.toUpperCase(Locale.ROOT);
    }

    private static AnalysisDispatchResponse queuedResponse(Long analysisId, Long matchId, String message) {
        return AnalysisDispatchResponse.builder()
                .analysisId(analysisId)
                .matchId(matchId)
                .status("QUEUED")
                .message(message)
                .queuedAt(OffsetDateTime.now())
                .build();
    }
}
