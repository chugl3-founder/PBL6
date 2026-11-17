package com.badminton.dto.admin;

import java.time.OffsetDateTime;

/** A scouting report that is open to anyone with its link. */
public record AdminSharedReportResponse(
        Long id,
        String title,
        String opponentName,
        String ownPlayerName,
        String ownerEmail,
        String ownerName,
        String shareToken,
        OffsetDateTime updatedAt
) {
}
