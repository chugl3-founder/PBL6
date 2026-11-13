package com.badminton.service;

import com.badminton.entity.AiAnalysis;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Component;

import java.util.List;

/**
 * Progress shown for an analysis. A Mock Engine run reports its own steps; the GPU worker streams results, so
 * its progress is the share of the video already covered.
 */
@Component
@RequiredArgsConstructor
public class AnalysisProgress {

    private final MockAiEngineService mockAiEngineService;

    public record Progress(int percent, String stage) {
    }

    /** analyzedRanges: the parsed analyzed_ranges column, or null. */
    public Progress of(AiAnalysis analysis, List<List<Double>> analyzedRanges) {
        String status = analysis.getStatus();
        if ("COMPLETED".equalsIgnoreCase(status)) {
            return new Progress(100, "completed: Phân tích hoàn tất");
        }
        if ("FAILED".equalsIgnoreCase(status) || "UNSUPPORTED".equalsIgnoreCase(status)) {
            return new Progress(0, "failed: Phiên phân tích gặp sự cố");
        }
        if ("CANCELLED".equalsIgnoreCase(status)) {
            return new Progress(0, "cancelled: Đã hủy");
        }

        int mockPercent = mockAiEngineService.getProgress(analysis.getId());
        if (mockPercent > 0) {
            return new Progress(mockPercent, mockAiEngineService.getCurrentStage(analysis.getId()));
        }
        if (!"PROCESSING".equalsIgnoreCase(status)) {
            return new Progress(0, "Đang chờ trong hàng đợi");
        }
        if (analysis.getAnalyzedUntilSeconds() != null && analysis.getVideoDurationSeconds() != null
                && analysis.getVideoDurationSeconds().signum() > 0) {
            // Several ranges once the viewer has made the worker jump ahead.
            double duration = analysis.getVideoDurationSeconds().doubleValue();
            double covered = analyzedRanges != null
                    ? analyzedRanges.stream().mapToDouble(r -> Math.max(0, r.get(1) - r.get(0))).sum()
                    : analysis.getAnalyzedUntilSeconds().doubleValue();
            return new Progress((int) Math.min(99, Math.floor(covered * 100 / duration)),
                    "streaming: Đang phân tích, kết quả hiện dần trên Replay");
        }
        // Video download and model warm-up: start from 0 so the bar never jumps back.
        return new Progress(0, "Đang khởi động GPU Worker (tải video, nạp model)");
    }
}
