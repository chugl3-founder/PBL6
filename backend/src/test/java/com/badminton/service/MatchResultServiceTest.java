package com.badminton.service;

import com.badminton.dto.match.MatchResult;
import com.badminton.entity.Match;
import com.badminton.repository.RallyRepository;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class MatchResultServiceTest {

    private record Score(Long matchId, Long id, Integer rallyNumber, String winnerSide, Integer scoreUpper,
                         Integer scoreLower) implements RallyRepository.RallyScore {
        public Long getMatchId() { return matchId; }
        public Long getId() { return id; }
        public Integer getRallyNumber() { return rallyNumber; }
        public String getWinnerSide() { return winnerSide; }
        public Integer getScoreUpper() { return scoreUpper; }
        public Integer getScoreLower() { return scoreLower; }
    }

    /** Points won on one half of the court, as the AI's running count per side. */
    private static void run(List<RallyRepository.RallyScore> into, String side, int points, int[] count) {
        for (int i = 0; i < points; i++) {
            if ("UPPER".equals(side)) count[0]++;
            else count[1]++;
            long n = into.size() + 1;
            into.add(new Score(1L, n, (int) n, side, count[0], count[1]));
        }
    }

    private static Match match() {
        return Match.builder().id(1L).upperPlayer("PLAYER_A").startGame(1).startScoreA(0).startScoreB(0).build();
    }

    @Test
    void straightGamesWinnerAndScores() {
        int[] count = {0, 0};
        List<RallyRepository.RallyScore> rallies = new ArrayList<>();
        run(rallies, "LOWER", 15, count);  // game 1: B (lower) 15 points
        run(rallies, "UPPER", 21, count);  // A (upper) wins 21-15
        run(rallies, "LOWER", 21, count);  // game 2: A now on lower, wins 21-0
        run(rallies, "UPPER", 2, count);   // play picked up after the match

        MatchResult result = MatchResultService.resultOf(match(), rallies);

        assertThat(result.winner()).isEqualTo("PLAYER_A");
        assertThat(result.games()).containsExactly(
                new MatchResult.GameScore(21, 15, true),
                new MatchResult.GameScore(21, 0, true));
    }

    @Test
    void videoStoppingMidGameHasNoWinner() {
        int[] count = {0, 0};
        List<RallyRepository.RallyScore> rallies = new ArrayList<>();
        run(rallies, "UPPER", 21, count);  // game 1 to A
        run(rallies, "UPPER", 5, count);   // game 2: B (now upper) leads 5-0 when the video ends

        MatchResult result = MatchResultService.resultOf(match(), rallies);

        assertThat(result.winner()).isNull();
        assertThat(result.games()).containsExactly(
                new MatchResult.GameScore(21, 0, true),
                new MatchResult.GameScore(0, 5, false));
    }
}
