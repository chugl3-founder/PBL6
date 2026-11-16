package com.badminton.dto.highlight;

import com.badminton.service.HighlightSelector;

import java.util.List;

/** Every usable rally of the current analysis, scored; the default cut is marked suggested. */
public record HighlightSuggestionsResponse(
        Long matchId,
        Long analysisId,
        String defaultTitle,
        double maxReelSeconds,
        int maxClips,
        List<HighlightSelector.Candidate> candidates
) {
}
