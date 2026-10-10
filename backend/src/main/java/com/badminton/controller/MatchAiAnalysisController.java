package com.badminton.controller;

import com.badminton.dto.analysis.AnalysisDispatchResponse;
import com.badminton.dto.analysis.AnalysisStatusResponse;
import com.badminton.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/matches/{id}/ai-analyses/{analysisId}")
@RequiredArgsConstructor
public class MatchAiAnalysisController {

    private final AnalysisService analysisService;

    /**
     * OpenAPI 3.0 /api/matches/{id}/ai-analyses/{analysisId}/retry: Thử lại phiên phân tích bị FAILED
     */
    @PostMapping("/retry")
    public ResponseEntity<AnalysisDispatchResponse> retryAiAnalysis(
            @PathVariable Long id,
            @PathVariable Long analysisId,
            @AuthenticationPrincipal String email
    ) {
        AnalysisDispatchResponse response = analysisService.retryAnalysis(id, analysisId, email);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    /**
     * OpenAPI 3.0 /api/matches/{id}/ai-analyses/{analysisId}/cancel: Hủy phiên phân tích AI đang chạy
     */
    @PostMapping("/cancel")
    public ResponseEntity<AnalysisStatusResponse> cancelAiAnalysis(
            @PathVariable Long id,
            @PathVariable Long analysisId,
            @AuthenticationPrincipal String email
    ) {
        AnalysisStatusResponse response = analysisService.cancelAnalysis(id, analysisId, email);
        return ResponseEntity.ok(response);
    }
}

