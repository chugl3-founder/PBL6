package com.badminton.dto.analysis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnalysisDispatchResponse {
    private Long analysisId;
    private Long matchId;
    private String status;
    private String message;
    private OffsetDateTime queuedAt;
}

