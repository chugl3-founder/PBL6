package com.badminton.controller;

import com.badminton.dto.analysis.AiEventResponse;
import com.badminton.dto.analysis.MatchStatisticsResponse;
import com.badminton.dto.analysis.RallyResponse;
import com.badminton.dto.match.MatchResponse;
import com.badminton.dto.match.PagedMatchResponse;
import com.badminton.dto.video.VideoResponse;
import com.badminton.service.MatchService;
import com.badminton.service.PublicReplayService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/public-matches")
@RequiredArgsConstructor
public class PublicMatchController {

    private final MatchService matchService;
    private final PublicReplayService publicReplayService;

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
        VideoResponse response = publicReplayService.getVideo(id);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}/events")
    public ResponseEntity<List<AiEventResponse>> getPublicMatchEvents(@PathVariable Long id) {
        List<AiEventResponse> events = publicReplayService.getEvents(id);
        return ResponseEntity.ok(events);
    }

    @GetMapping("/{id}/rallies")
    public ResponseEntity<List<RallyResponse>> getPublicMatchRallies(@PathVariable Long id) {
        List<RallyResponse> rallies = publicReplayService.getRallies(id);
        return ResponseEntity.ok(rallies);
    }

    @GetMapping("/{id}/statistics")
    public ResponseEntity<MatchStatisticsResponse> getPublicMatchStatistics(@PathVariable Long id) {
        MatchStatisticsResponse statistics = publicReplayService.getStatistics(id);
        return ResponseEntity.ok(statistics);
    }
}
