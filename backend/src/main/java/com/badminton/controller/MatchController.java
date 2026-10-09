package com.badminton.controller;

import com.badminton.dto.match.CreateMatchRequest;
import com.badminton.dto.match.MatchResponse;
import com.badminton.dto.match.PagedMatchResponse;
import com.badminton.dto.match.UpdateMatchRequest;
import com.badminton.service.MatchService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matches")
@RequiredArgsConstructor
public class MatchController {

    private final MatchService matchService;

    @PostMapping
    public ResponseEntity<MatchResponse> createMatch(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody CreateMatchRequest request
    ) {
        MatchResponse response = matchService.createMatch(request, email);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @GetMapping
    public ResponseEntity<PagedMatchResponse> getMyMatches(
            @AuthenticationPrincipal String email,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PagedMatchResponse response = matchService.getMyMatches(email, status, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<MatchResponse> getMatchById(
            @AuthenticationPrincipal String email,
            @PathVariable Long id
    ) {
        MatchResponse response = matchService.getMatchById(id, email);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<MatchResponse> updateMatch(
            @AuthenticationPrincipal String email,
            @PathVariable Long id,
            @Valid @RequestBody UpdateMatchRequest request
    ) {
        MatchResponse response = matchService.updateMatch(id, request, email);
        return ResponseEntity.ok(response);
    }
}

