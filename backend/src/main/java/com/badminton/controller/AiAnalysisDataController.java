package com.badminton.controller;

import com.badminton.dto.analysis.MatchStatisticsResponse;
import com.badminton.service.ReplayDataService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/ai-analyses")
@RequiredArgsConstructor
public class AiAnalysisDataController {

    private final ReplayDataService replayDataService;

    /**
     * OpenAPI 3.0 /api/ai-analyses/{id}/statistics: Lấy dữ liệu thống kê chuyên sâu toàn diện
     */
    @GetMapping("/{id}/statistics")
    public ResponseEntity<MatchStatisticsResponse> getMatchStatisticsByAnalysisId(@PathVariable Long id,
                                                                                  @AuthenticationPrincipal String email) {
        MatchStatisticsResponse statistics = replayDataService.getStatisticsByAnalysisId(id, email);
        return ResponseEntity.ok(statistics);
    }
}

