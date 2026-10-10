package com.badminton.controller;

import com.badminton.dto.analysis.AnalysisDispatchResponse;
import com.badminton.dto.analysis.AnalysisStatusResponse;
import com.badminton.service.AnalysisService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matches/{id}/analysis")
@RequiredArgsConstructor
public class AnalysisController {

    private final AnalysisService analysisService;

    /**
     * NFR-PER-02, NFR-AI-01: Bắt đầu phân tích AI, trả về 202 Accepted ngay lập tức (< 200ms)
     */
    @PostMapping("/dispatch")
    public ResponseEntity<AnalysisDispatchResponse> dispatchAnalysis(
            @PathVariable Long id,
            @AuthenticationPrincipal String email
    ) {
        AnalysisDispatchResponse response = analysisService.dispatchAnalysis(id, email);
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(response);
    }

    /**
     * Endpoint polling lấy trạng thái & tiến trình xử lý phân tích AI
     */
    @GetMapping("/status")
    public ResponseEntity<AnalysisStatusResponse> getAnalysisStatus(
            @PathVariable Long id,
            @AuthenticationPrincipal String email
    ) {
        AnalysisStatusResponse response = analysisService.getAnalysisStatus(id, email);
        return ResponseEntity.ok(response);
    }

    /**
     * Lấy toàn bộ danh sách các sự kiện cú đánh (AiEvents) kèm tọa độ 2D của trận đấu phục vụ Replay
     */
    @GetMapping("/events")
    public ResponseEntity<java.util.List<com.badminton.dto.analysis.AiEventResponse>> getMatchEvents(
            @PathVariable Long id
    ) {
        java.util.List<com.badminton.dto.analysis.AiEventResponse> events = analysisService.getMatchEvents(id);
        return ResponseEntity.ok(events);
    }

    /**
     * VS-11: Lấy danh sách các đợt cầu (Rallies) của trận đấu
     */
    @GetMapping("/rallies")
    public ResponseEntity<java.util.List<com.badminton.dto.analysis.RallyResponse>> getMatchRallies(
            @PathVariable Long id
    ) {
        java.util.List<com.badminton.dto.analysis.RallyResponse> rallies = analysisService.getMatchRallies(id);
        return ResponseEntity.ok(rallies);
    }

    /**
     * VS-12: Lấy dữ liệu thống kê chuyên sâu toàn diện của trận đấu
     */
    @GetMapping("/statistics")
    public ResponseEntity<com.badminton.dto.analysis.MatchStatisticsResponse> getMatchStatistics(
            @PathVariable Long id
    ) {
        com.badminton.dto.analysis.MatchStatisticsResponse statistics = analysisService.getMatchStatistics(id);
        return ResponseEntity.ok(statistics);
    }
}


