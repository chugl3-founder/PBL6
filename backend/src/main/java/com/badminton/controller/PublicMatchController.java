package com.badminton.controller;

import com.badminton.dto.analysis.AiEventResponse;
import com.badminton.dto.analysis.MatchStatisticsResponse;
import com.badminton.dto.analysis.RallyResponse;
import com.badminton.dto.match.MatchResponse;
import com.badminton.dto.match.PagedMatchResponse;
import com.badminton.dto.video.VideoResponse;
import com.badminton.service.AnalysisService;
import com.badminton.service.MatchService;
import com.badminton.service.VideoService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public-matches")
@RequiredArgsConstructor
public class PublicMatchController {

    private final MatchService matchService;
    private final VideoService videoService;
    private final AnalysisService analysisService;

    @GetMapping
    public ResponseEntity<PagedMatchResponse> browsePublicMatches(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PagedMatchResponse response = matchService.getPublicMatches(search, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchResponse> getPublicMatchDetail(@PathVariable Long id) {
        MatchResponse response = matchService.getPublicMatchDetail(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/video")
    public ResponseEntity<VideoResponse> getPublicMatchVideo(@PathVariable Long id) {
        VideoResponse response = videoService.getPublicVideoByMatchId(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<List<AiEventResponse>> getPublicMatchEvents(@PathVariable Long id) {
        // Đảm bảo trận đấu tồn tại và đã PUBLISHED
        matchService.getPublicMatchDetail(id);
        List<AiEventResponse> events = analysisService.getMatchEvents(id);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/{id}/rallies")
    public ResponseEntity<List<RallyResponse>> getPublicMatchRallies(@PathVariable Long id) {
        // Đảm bảo trận đấu tồn tại và đã PUBLISHED
        matchService.getPublicMatchDetail(id);
        List<RallyResponse> rallies = analysisService.getMatchRallies(id);
        return ResponseEntity.ok(rallies);
    }

    @GetMapping("/{id}/statistics")
    public ResponseEntity<MatchStatisticsResponse> getPublicMatchStatistics(@PathVariable Long id) {
        // Đảm bảo trận đấu tồn tại và đã PUBLISHED
        matchService.getPublicMatchDetail(id);
        MatchStatisticsResponse statistics = analysisService.getMatchStatistics(id);
        return ResponseEntity.ok(statistics);
    }
}
