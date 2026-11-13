package com.badminton.dto.match;

import java.util.List;

/**
 * The result seen in the video, per player: each game's final score and, once a player has won two games,
 * the match winner. A game the video stops in has finished = false.
 */
public record MatchResult(List<GameScore> games, String winner) {

    public record GameScore(int scoreA, int scoreB, boolean finished) {
    }
}
