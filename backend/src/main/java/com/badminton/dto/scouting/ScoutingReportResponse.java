package com.badminton.dto.scouting;

import java.time.OffsetDateTime;

/** shareToken is only sent to the owner; plan is omitted in list views. */
public record ScoutingReportResponse(
        Long id,
        String title,
        String opponentName,
        String ownPlayerName,
        String coachNotes,
        String shareToken,
        boolean owner,
        OffsetDateTime generatedAt,
        OffsetDateTime updatedAt,
        ScoutingPlan plan
) {
}
