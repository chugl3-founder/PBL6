package com.badminton.controller;

import com.badminton.dto.highlight.HighlightReelRequest;
import com.badminton.dto.highlight.HighlightReelResponse;
import com.badminton.dto.highlight.HighlightSuggestionsResponse;
import com.badminton.service.HighlightReelService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class HighlightReelController {

    private final HighlightReelService highlightReelService;

    /** Scored rallies of the current analysis, with the default cut marked suggested. */
    @GetMapping("/matches/{matchId}/highlights/suggestions")
    public HighlightSuggestionsResponse suggestions(@PathVariable Long matchId,
                                                    @AuthenticationPrincipal String email) {
        return highlightReelService.suggest(matchId, email);
    }

    @GetMapping("/matches/{matchId}/highlights")
    public List<HighlightReelResponse> list(@PathVariable Long matchId, @AuthenticationPrincipal String email) {
        return highlightReelService.list(matchId, email);
    }

    /** Every reel of the signed-in user, across matches. */
    @GetMapping("/highlights")
    public List<HighlightReelResponse> listMine(@AuthenticationPrincipal String email) {
        return highlightReelService.listMine(email);
    }

    @GetMapping("/matches/{matchId}/highlights/{reelId}")
    public HighlightReelResponse get(@PathVariable Long matchId, @PathVariable Long reelId,
                                     @AuthenticationPrincipal String email) {
        return highlightReelService.get(matchId, reelId, email);
    }

    /** Queues a render on the media worker and returns at once (HTTP 202). */
    @PostMapping("/matches/{matchId}/highlights")
    public ResponseEntity<HighlightReelResponse> create(@PathVariable Long matchId,
                                                        @Valid @RequestBody HighlightReelRequest.Create request,
                                                        @AuthenticationPrincipal String email) {
        return ResponseEntity.status(HttpStatus.ACCEPTED).body(highlightReelService.create(matchId, request, email));
    }

    @DeleteMapping("/matches/{matchId}/highlights/{reelId}")
    public ResponseEntity<Void> delete(@PathVariable Long matchId, @PathVariable Long reelId,
                                       @AuthenticationPrincipal String email) {
        highlightReelService.delete(matchId, reelId, email);
        return ResponseEntity.noContent().build();
    }
}
