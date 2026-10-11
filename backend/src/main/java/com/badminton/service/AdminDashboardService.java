package com.badminton.service;

import com.badminton.dto.admin.AdminDashboardResponse;
import com.badminton.repository.AiAnalysisRepository;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.LinkedHashMap;
import java.util.Map;

@Service
@RequiredArgsConstructor
public class AdminDashboardService {

    private final UserRepository userRepository;
    private final MatchRepository matchRepository;
    private final AiAnalysisRepository aiAnalysisRepository;

    @Transactional(readOnly = true)
    public AdminDashboardResponse getDashboardMetrics() {
        long totalUsers = userRepository.count();
        long activeUsers = userRepository.countByStatus("ACTIVE");
        long lockedUsers = userRepository.countByStatus("LOCKED");

        long totalMatches = matchRepository.countByDeletedAtIsNull();
        long publishedMatches = matchRepository.countByStatusAndDeletedAtIsNull("PUBLISHED");
        long analyzedMatches = matchRepository.countByStatusAndDeletedAtIsNull("ANALYZED");
        long readyMatches = matchRepository.countByStatusAndDeletedAtIsNull("READY");
        long analyzingMatches = matchRepository.countByStatusAndDeletedAtIsNull("ANALYZING");
        long draftMatches = matchRepository.countByStatusAndDeletedAtIsNull("DRAFT");
        long deletedMatches = matchRepository.countByDeletedAtIsNotNull();

        long totalAiAnalyses = aiAnalysisRepository.count();
        long completedAi = aiAnalysisRepository.countByStatusIgnoreCase("COMPLETED");
        long failedAi = aiAnalysisRepository.countByStatusIgnoreCase("FAILED")
                + aiAnalysisRepository.countByStatusIgnoreCase("UNSUPPORTED");
        long processingAi = aiAnalysisRepository.countByStatusIgnoreCase("PROCESSING")
                + aiAnalysisRepository.countByStatusIgnoreCase("QUEUED");
        long cancelledAi = aiAnalysisRepository.countByStatusIgnoreCase("CANCELLED");

        long finishedOrFailed = completedAi + failedAi;
        double aiSuccessRate = finishedOrFailed > 0
                ? Math.round((completedAi * 1000.0) / finishedOrFailed) / 10.0
                : 100.0;

        Map<String, Long> matchBreakdown = new LinkedHashMap<>();
        matchBreakdown.put("PUBLISHED", publishedMatches);
        matchBreakdown.put("ANALYZED", analyzedMatches);
        matchBreakdown.put("READY", readyMatches);
        matchBreakdown.put("ANALYZING", analyzingMatches);
        matchBreakdown.put("DRAFT", draftMatches);
        matchBreakdown.put("DELETED", deletedMatches);

        Map<String, Long> aiBreakdown = new LinkedHashMap<>();
        aiBreakdown.put("COMPLETED", completedAi);
        aiBreakdown.put("PROCESSING_OR_QUEUED", processingAi);
        aiBreakdown.put("FAILED", failedAi);
        aiBreakdown.put("CANCELLED", cancelledAi);

        return AdminDashboardResponse.builder()
                .totalUsers(totalUsers)
                .activeUsers(activeUsers)
                .lockedUsers(lockedUsers)
                .totalMatches(totalMatches)
                .publishedMatches(publishedMatches)
                .analyzedMatches(analyzedMatches)
                .draftMatches(draftMatches)
                .deletedMatches(deletedMatches)
                .totalAiAnalyses(totalAiAnalyses)
                .completedAiAnalyses(completedAi)
                .failedAiAnalyses(failedAi)
                .processingAiAnalyses(processingAi)
                .aiSuccessRate(aiSuccessRate)
                .matchStatusBreakdown(matchBreakdown)
                .aiStatusBreakdown(aiBreakdown)
                .build();
    }
}

