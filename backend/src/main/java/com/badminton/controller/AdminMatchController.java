package com.badminton.controller;

import com.badminton.dto.match.MatchResponse;
import com.badminton.dto.match.PagedMatchResponse;
import com.badminton.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/admin/matches")
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminMatchController {

    private final MatchService matchService;

    @GetMapping
    public ResponseEntity<PagedMatchResponse> getAllMatches(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PagedMatchResponse response = matchService.getAllMatchesForAdmin(status, page, size);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/publish")
    public ResponseEntity<MatchResponse> publishMatch(@PathVariable Long id) {
        MatchResponse response = matchService.publishMatch(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/unpublish")
    public ResponseEntity<MatchResponse> unpublishMatch(@PathVariable Long id) {
        MatchResponse response = matchService.unpublishMatch(id);
        return ResponseEntity.ok(response);
    }
}

