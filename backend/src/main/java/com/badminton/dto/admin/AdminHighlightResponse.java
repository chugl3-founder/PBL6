package com.badminton.dto.admin;

import com.badminton.dto.highlight.HighlightReelResponse;
import com.fasterxml.jackson.annotation.JsonUnwrapped;

/** A highlight reel as the owner sees it, plus whose it is. */
public record AdminHighlightResponse(
        @JsonUnwrapped HighlightReelResponse reel,
        String ownerEmail
) {
}
