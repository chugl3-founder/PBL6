package com.badminton.dto.player;

import java.time.LocalDate;

/** One player in the directory: everything is counted over the matches the viewer may see. */
public record PlayerSummaryResponse(
        String name,
        int matchCount,
        int analyzedMatchCount,
        LocalDate lastMatchDate,
        int ralliesWon,
        int ralliesLost,
        int totalShots,
        PlayerProfileResponse.Radar radar,
        String playstyle
) {
}
