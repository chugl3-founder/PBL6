package com.badminton.dto.analysis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RallyResponse {
    private Long id;
    private Integer rallyNumber;
    private Long startEventId;
    private Long endEventId;
    private BigDecimal startTime;
    private BigDecimal endTime;
    private BigDecimal duration;
    private Integer totalStrokes;
    private String boundaryType;
    private String serverSide; // UPPER, LOWER
    private String winnerSide; // UPPER, LOWER
    private String winReason;
    private Integer scoreUpper;
    private Integer scoreLower;
    private String scoreText;
    // Per player, within the game. The AI counts per court half and players change ends, so the backend
    // splits the games by the scoring rules (see HighlightSelector.trackGames).
    private Integer gameNumber;
    private Integer scoreA;
    private Integer scoreB;
    private String winnerPlayer; // PLAYER_A, PLAYER_B, or null when nobody won the point
    private String upperPlayer; // who was on the upper half during this rally
    private Boolean afterMatch; // played after a player had already won the match (AI picked up post-match play)
    private List<String> strokeSequence;
    private Boolean isComplete;
    private Boolean partialStart;
    private Boolean partialEnd;
}

