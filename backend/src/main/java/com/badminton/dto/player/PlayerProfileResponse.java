package com.badminton.dto.player;

import java.time.LocalDate;
import java.util.List;
import java.util.Map;

/**
 * A player's record across every match the viewer may see (public matches and the viewer's own).
 * Court points are mirrored so the player always stands on the near (lower) half.
 */
public record PlayerProfileResponse(
        String name,
        int matchCount,
        int analyzedMatchCount,
        LocalDate firstMatchDate,
        LocalDate lastMatchDate,
        Totals totals,
        Radar radar,
        List<LabelCount> playstyles,
        List<StrokeStat> strokes,
        Map<String, Integer> handSides,
        List<RallyLengthStat> rallyLength,
        List<LabelCount> concededBy,
        Zones zones,
        List<OpponentStat> opponents,
        List<MatchEntry> matches
) {

    public record Totals(int shots, int ralliesWon, int ralliesLost, Double avgDistanceMeters) {
    }

    /** Average of the per-match style scores (0..100); null fields have no data. */
    public record Radar(Integer attack, Integer defense, Integer netControl,
                        Integer shotVariety, Integer consistency, Integer pace) {
    }

    public record LabelCount(String label, int count) {
    }

    /** winners: the player's shot ended a rally they won; errors: it ended a rally they lost. */
    public record StrokeStat(String stroke, int total, int winners, int errors) {
    }

    /** bucket: SHORT (1-4 shots), MEDIUM (5-9), LONG (10+). */
    public record RallyLengthStat(String bucket, int won, int lost) {
    }

    /** Court cell: along 0..11 from the far baseline, across 0..5. */
    public record ZoneCell(int along, int across, int count) {
    }

    /** position: where the player hits from; landing: where their shots land; conceded: where rally-ending shots beat them. */
    public record Zones(List<ZoneCell> position, List<ZoneCell> landing, List<ZoneCell> conceded) {
    }

    public record OpponentStat(String name, int matches, int ralliesWon, int ralliesLost) {
    }

    public record MatchEntry(
            Long matchId,
            String title,
            LocalDate matchDate,
            String status,
            boolean owned,
            boolean analyzed,
            String side,
            String opponent,
            int shots,
            int ralliesWon,
            int ralliesLost,
            Double avgDistanceMeters,
            String playstyle,
            Radar radar
    ) {
    }
}
