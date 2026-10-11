package com.badminton.controller;

import com.badminton.common.dto.MessageResponse;
import com.badminton.dto.match.MatchResponse;
import com.badminton.dto.match.PagedMatchResponse;
import com.badminton.service.MatchService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/admin/matches", "/api/v1/admin/matches"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminMatchController {

    private final MatchService matchService;

    @GetMapping
    public ResponseEntity<PagedMatchResponse> getAllMatches(
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "false") boolean includeDeleted,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PagedMatchResponse response = matchService.getAllMatchesForAdmin(status, includeDeleted, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchResponse> getMatchById(@PathVariable Long id) {
        MatchResponse response = matchService.getMatchByIdForAdmin(id);
        return ResponseEntity.ok(response);
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<MessageResponse> deleteMatch(@PathVariable Long id) {
        MessageResponse response = matchService.adminDeleteMatch(id);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/{id}/restore")
    public ResponseEntity<MatchResponse> restoreMatch(@PathVariable Long id) {
        MatchResponse response = matchService.restoreMatch(id);
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
