package com.badminton.controller;

import com.badminton.dto.admin.PagedAnalysisResponse;
import com.badminton.dto.analysis.AnalysisDispatchResponse;
import com.badminton.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/admin/ai-analyses", "/api/v1/admin/ai-analyses"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminAiAnalysisController {

    private final AnalysisService analysisService;

    @GetMapping
    public ResponseEntity<PagedAnalysisResponse> getAllAnalyses(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PagedAnalysisResponse response = analysisService.getAllAnalysesForAdmin(status, page, size);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/retry")
    public ResponseEntity<AnalysisDispatchResponse> retryAnalysis(@PathVariable Long id) {
        AnalysisDispatchResponse response = analysisService.retryAnalysisForAdmin(id);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }
}

