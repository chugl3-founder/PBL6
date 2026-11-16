package com.badminton.dto.highlight;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

/** videoUrl and downloadUrl are presigned and only set once the reel is COMPLETED. */
public record HighlightReelResponse(
        Long id,
        Long matchId,
        String playerAName,
        String playerBName,
        Long analysisId,
        String title,
        String status,
        Integer progressPercent,
        int clipCount,
        BigDecimal durationSeconds,
        Long fileSize,
        String errorMessage,
        String videoUrl,
        String downloadUrl,
        OffsetDateTime createdAt,
        OffsetDateTime completedAt
) {
}
