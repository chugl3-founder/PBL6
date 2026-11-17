package com.badminton.controller.player;

import com.badminton.dto.player.PlayerProfileResponse;
import com.badminton.dto.player.PlayerSummaryResponse;
import com.badminton.dto.player.TrainingFocusResponse;
import com.badminton.service.player.PlayerProfileService;
import com.badminton.service.player.TrainingFocusService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Player directory and cross-match profiles. Open to guests (public matches only); a signed-in
 * viewer also sees players from their own matches.
 */
@RestController
@RequestMapping("/api/players")
@RequiredArgsConstructor
public class PlayerController {

    private final PlayerProfileService playerProfileService;
    private final TrainingFocusService trainingFocusService;

    @GetMapping
    public ResponseEntity<List<PlayerSummaryResponse>> listPlayers(
            @RequestParam(required = false) String search,
            @AuthenticationPrincipal Object principal
    ) {
        return ResponseEntity.ok(playerProfileService.listPlayers(email(principal), search));
    }

    /** The name goes in the query string: player names may contain characters a path cannot carry. */
    @GetMapping("/profile")
    public ResponseEntity<PlayerProfileResponse> getProfile(
            @RequestParam String name,
            @AuthenticationPrincipal Object principal
    ) {
        return ResponseEntity.ok(playerProfileService.getProfile(email(principal), name));
    }

    /** The ways the player loses points most often, and how each changed from match to match. */
    @GetMapping("/training-focus")
    public ResponseEntity<TrainingFocusResponse> getTrainingFocus(
            @RequestParam String name,
            @AuthenticationPrincipal Object principal
    ) {
        return ResponseEntity.ok(trainingFocusService.forViewer(email(principal), name));
    }

    private static String email(Object principal) {
        return principal instanceof String email ? email : null;
    }
}
