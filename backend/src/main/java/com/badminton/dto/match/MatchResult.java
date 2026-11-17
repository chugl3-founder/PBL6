package com.badminton.dto.match;

import com.fasterxml.jackson.annotation.JsonIgnore;

import java.util.List;

/**
 * The result seen in the video, per player: each game's final score and, once a player has won two games,
 * the match winner. A game the video stops in has finished = false. matchRallies counts the rallies the Replay
 * lists (played in the match, with a known or pending winner); the match card shows it as its rally count.
 */
public record MatchResult(List<GameScore> games, String winner, @JsonIgnore int matchRallies) {

    public record GameScore(int scoreA, int scoreB, boolean finished) {
    }
}
