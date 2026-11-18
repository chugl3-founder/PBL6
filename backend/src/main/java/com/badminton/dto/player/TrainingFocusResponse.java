package com.badminton.dto.player;

import java.time.LocalDate;
import java.util.List;

/**
 * A player's weaknesses: the ways they lose points most often across the matches the viewer may
 * see, and how each one moved from match to match, so whoever prepares to face the player (or follows their form) sees which weaknesses persist.
 */
public record TrainingFocusResponse(
        String player,
        int matchesAnalyzed,
        int pointsLost,
        List<Focus> focuses
) {

    /**
     * One way of losing points. kind ERROR: the player's own shot ended a rally they lost (usually into the
     * net or out); CONCEDED: the opponent won the rally with this stroke.
     *
     * @param share         percent of all lost points
     * @param trend         IMPROVING, WORSENING, STABLE, or NOT_ENOUGH_DATA (fewer than two matches to compare)
     * @param baselineRate  average percent of lost points in the earlier matches
     * @param latestRate    percent of lost points in the latest match
     */
    public record Focus(
            String key,
            String kind,
            String stroke,
            int count,
            int share,
            String trend,
            Integer baselineRate,
            Integer latestRate,
            List<MatchPoint> matches,
            List<Clip> clips
    ) {
    }

    /** rate: percent of that match's lost points; null when the match has too few lost points to judge. */
    public record MatchPoint(
            Long matchId,
            String title,
            LocalDate matchDate,
            String opponent,
            boolean owned,
            int lost,
            int count,
            Integer rate
    ) {
    }

    /** A rally that shows the weakness: seconds is where it starts in the match video, rallyNumber its number there. */
    public record Clip(Long matchId, boolean owned, String opponent, double seconds, int rallyNumber) {
    }
}
