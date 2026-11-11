package com.badminton.dto.scouting;

import com.badminton.dto.player.PlayerProfileResponse.Radar;
import com.badminton.dto.player.PlayerProfileResponse.RallyLengthStat;
import com.badminton.dto.player.PlayerProfileResponse.ZoneCell;

import java.time.LocalDate;
import java.util.List;

/**
 * The generated game plan against one opponent. Court cells are in the reader's view: the reader
 * stands on the near half (along 6..11), the opponent on the far half (along 0..5).
 */
public record ScoutingPlan(
        Subject opponent,
        Subject ownPlayer,
        HeadToHead headToHead,
        List<KeyPoint> keys,
        List<ZoneCell> targetZones,
        List<ZoneCell> threatZones,
        List<StrokeCount> threats,
        List<StrokeCount> weaknesses,
        List<RallyLengthStat> rallyLength,
        DataQuality quality
) {

    public record Subject(String name, int matchCount, int analyzedMatchCount, int ralliesWon, int ralliesLost,
                          String playstyle, Radar radar) {
    }

    public record HeadToHead(int matches, int ownWon, int ownLost, List<HeadToHeadMatch> list) {
    }

    public record HeadToHeadMatch(Long matchId, LocalDate matchDate, boolean published, int ownWon, int ownLost) {
    }

    /** category: TARGET, EXPLOIT, THREAT, TEMPO, STYLE. */
    public record KeyPoint(String category, String title, String detail, String evidence, List<Clip> clips) {
    }

    /** published: the replay is public; otherwise only the report owner can open it. */
    public record Clip(Long matchId, boolean published, double seconds, String label) {
    }

    /** count: rallies the stroke ended; total: how often the opponent played it. */
    public record StrokeCount(String stroke, int count, int total) {
    }

    /** level: LOW, MEDIUM, HIGH. */
    public record DataQuality(int analyzedMatches, int decidedRallies, String level, String note) {
    }
}
