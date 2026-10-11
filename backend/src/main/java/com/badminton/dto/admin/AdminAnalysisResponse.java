package com.badminton.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminAnalysisResponse {
    private Long id;
    private Long matchId;
    private String matchTitle;
    private String playerAName;
    private String playerBName;
    private String ownerEmail;
    private Long videoId;
    private String status;
    private String modelName;
    private String modelVersion;
    private Integer progressPercent;
    private String currentStage;
    private OffsetDateTime startedAt;
    private OffsetDateTime completedAt;
    private String errorCode;
    private String errorMessage;
    private Boolean isCurrent;
    private OffsetDateTime createdAt;
}

