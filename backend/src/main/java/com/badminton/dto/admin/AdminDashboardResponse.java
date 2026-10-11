package com.badminton.dto.admin;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AdminDashboardResponse {
    private long totalUsers;
    private long activeUsers;
    private long lockedUsers;

    private long totalMatches;
    private long publishedMatches;
    private long analyzedMatches;
    private long draftMatches;
    private long deletedMatches;

    private long totalAiAnalyses;
    private long completedAiAnalyses;
    private long failedAiAnalyses;
    private long processingAiAnalyses;
    private double aiSuccessRate;

    private Map<String, Long> matchStatusBreakdown;
    private Map<String, Long> aiStatusBreakdown;
}

