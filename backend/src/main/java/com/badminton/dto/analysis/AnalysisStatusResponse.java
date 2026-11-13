package com.badminton.dto.analysis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisStatusResponse {
    private Long analysisId;
    private Long matchId;
    private String status; // QUEUED, PROCESSING, COMPLETED, FAILED, UNSUPPORTED, CANCELLED
    private Integer progressPercent;
    private String currentStage; // hit_scan, pose_and_classification, rally_segmentation, tactical_analysis, completed
    private String modelName;
    private String modelVersion;
    private OffsetDateTime startedAt;
    private OffsetDateTime completedAt;
    private String errorMessage;
    /** Streaming analysis: results shown on the replay are complete up to this second. */
    private Double analyzedUntilSeconds;
    private Double videoDurationSeconds;
    /** [[start, end], ...] seconds whose provisional hits are final; null when not streaming. */
    private List<List<Double>> analyzedRanges;
}

