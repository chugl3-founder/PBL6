package com.badminton.service.highlight;

import com.badminton.service.highlight.HighlightSelector.Candidate;
import com.badminton.service.highlight.HighlightSelector.RallyFacts;
import org.junit.jupiter.api.Test;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;

class HighlightSelectorTest {

    private static RallyFacts rally(long id, double start, int strokes, String winner, int up, int low,
                                    String endStroke, String endHitter) {
        return new RallyFacts(id, (int) id, start, start + strokes * 1.2, strokes, winner, up, low,
                endStroke, endHitter, true);
    }

    private static Candidate only(RallyFacts r) {
        return HighlightSelector.rank(List.of(r), null, true).get(0);
    }

    /** Rallies that take the score from 0-0 to the given side counts, each won on the given half. */
    private static List<RallyFacts> run(List<RallyFacts> into, String winner, int points, int[] count) {
        for (int i = 0; i < points; i++) {
            if ("UPPER".equals(winner)) count[0]++;
            else count[1]++;
            long id = into.size() + 1;
            into.add(rally(id, id * 40.0, 6, winner, count[0], count[1], "CLEAR", winner));
        }
        return into;
    }

    @Test
    void gameWinningRallyIsLabelledAndShowsScoreItWasPlayedAt() {
        Candidate c = only(rally(1, 10, 6, "LOWER", 18, 21, "CLEAR", "UPPER"));

        assertThat(c.reasons()).contains("Điểm kết thúc ván 1");
        assertThat(c.label()).isEqualTo("Kết thúc ván 1 · 18-21");
        assertThat(c.scoreABefore()).isEqualTo(18);
        assertThat(c.scoreBBefore()).isEqualTo(20);
    }

    @Test
    void savingAGamePointCounts() {
        // A (upper) led 20-18 and lost the rally.
        Candidate c = only(rally(1, 10, 4, "LOWER", 20, 19, "DROP", "LOWER"));

        assertThat(c.reasons()).containsExactly("Cứu điểm game");
    }

    @Test
    void smashOnlyCountsWhenTheHitterWonThePoint() {
        List<Candidate> ranked = HighlightSelector.rank(List.of(
                rally(1, 10, 5, "UPPER", 1, 0, "SMASH", "UPPER"),
                rally(2, 30, 5, "LOWER", 1, 1, "SMASH", "UPPER")), null, true);

        assertThat(ranked.get(0).label()).isEqualTo("Smash ăn điểm");
        assertThat(ranked.get(1).reasons()).isEmpty();
        assertThat(ranked.get(0).score()).isGreaterThan(ranked.get(1).score());
    }

    @Test
    void deuceIsNotAGameWin() {
        assertThat(HighlightSelector.winsGame(21, 20)).isFalse();
        assertThat(HighlightSelector.winsGame(22, 20)).isTrue();
        assertThat(HighlightSelector.winsGame(30, 29)).isTrue();
        assertThat(HighlightSelector.hasGamePoint(29, 29)).isTrue();
    }

    @Test
    void runningCountIsSplitIntoGamesAndFollowsPlayersAcrossEnds() {
        // The AI never resets: game 1 ends 21-15 for A (upper), then B takes the first 5 points of game 2
        // from the upper half, since the players changed ends. Stored counts keep climbing: 26-15.
        int[] count = {0, 0};
        List<RallyFacts> rallies = new ArrayList<>();
        run(rallies, "LOWER", 15, count);
        run(rallies, "UPPER", 21, count);
        run(rallies, "UPPER", 5, count);
        RallyFacts last = rallies.get(rallies.size() - 1);
        assertThat(last.scoreUpper()).isEqualTo(26);

        List<Candidate> ranked = HighlightSelector.rank(rallies, null, true);
        Candidate gameEnd = ranked.get(35);
        Candidate lastOfGame2 = ranked.get(ranked.size() - 1);

        assertThat(gameEnd.label()).startsWith("Kết thúc ván 1 · 21-15");
        assertThat(lastOfGame2.gameNumber()).isEqualTo(2);
        // Before the 5th point of game 2: A 0, B 4.
        assertThat(lastOfGame2.scoreABefore()).isZero();
        assertThat(lastOfGame2.scoreBBefore()).isEqualTo(4);
    }

    @Test
    void decidingGameSwapsEndsAtEleven() {
        int[] count = {0, 0};
        List<RallyFacts> rallies = new ArrayList<>();
        run(rallies, "UPPER", 21, count);   // game 1: A on upper wins 21-0
        run(rallies, "UPPER", 21, count);   // game 2: B on upper wins 21-0
        run(rallies, "UPPER", 11, count);   // game 3: A back on upper, reaches 11 and changes ends
        run(rallies, "UPPER", 2, count);    // now B is on upper

        List<Candidate> ranked = HighlightSelector.rank(rallies, null, true);
        Candidate last = ranked.get(ranked.size() - 1);

        assertThat(last.gameNumber()).isEqualTo(3);
        assertThat(last.scoreABefore()).isEqualTo(11);
        assertThat(last.scoreBBefore()).isEqualTo(1);
    }

    @Test
    void ralliesAfterAStraightGamesWinAreMarkedAfterTheMatch() {
        int[] count = {0, 0};
        List<RallyFacts> rallies = new ArrayList<>();
        run(rallies, "UPPER", 21, count);   // game 1: A on upper wins 21-0
        run(rallies, "LOWER", 21, count);   // game 2: A, now on lower, wins 21-0: match over
        run(rallies, "UPPER", 3, count);    // play the AI picked up after the match

        Map<Long, HighlightSelector.GameContext> games = HighlightSelector.trackGames(rallies, true);
        HighlightSelector.GameContext lastPoint = games.get(42L);
        HighlightSelector.GameContext after = games.get(45L);

        assertThat(lastPoint.afterMatch()).isFalse();
        assertThat(lastPoint.game()).isEqualTo(2);
        assertThat(after.afterMatch()).isTrue();
        assertThat(after.game()).isEqualTo(2);
        // The final score is kept, not a new game.
        assertThat(after.aAfter()).isEqualTo(21);
        assertThat(after.bAfter()).isZero();
        assertThat(HighlightSelector.rank(rallies, null, true)).noneMatch(c -> c.rallyNumber() > 42);
    }

    @Test
    void videoStartingMidGameUsesTheGivenScore() {
        // The video starts in game 2 at A 15 - B 18 (A on upper); the AI counts from 0-0.
        int[] count = {0, 0};
        List<RallyFacts> rallies = new ArrayList<>();
        run(rallies, "LOWER", 3, count);    // B reaches 21-15: game 2 ends
        run(rallies, "UPPER", 1, count);    // game 3: players changed ends, B is on upper

        List<Candidate> ranked = HighlightSelector.rank(rallies, null, true, new HighlightSelector.Start(2, 15, 18));

        assertThat(ranked.get(2).label()).startsWith("Kết thúc ván 2 · 15-21");
        assertThat(ranked.get(3).gameNumber()).isEqualTo(3);
        assertThat(ranked.get(3).scoreABefore()).isZero();
        assertThat(ranked.get(3).scoreBBefore()).isZero();
    }

    @Test
    void storedScoresThatAlreadyRestartPerGameAreKept() {
        List<Candidate> ranked = HighlightSelector.rank(List.of(
                rally(1, 10, 6, "UPPER", 21, 10, "CLEAR", "UPPER"),
                rally(2, 50, 6, "LOWER", 0, 1, "CLEAR", "LOWER")), null, true);

        assertThat(ranked.get(1).gameNumber()).isEqualTo(2);
        // Game 2: A moved to the lower half and won the first point.
        assertThat(ranked.get(1).scoreABefore()).isZero();
        assertThat(ranked.get(1).scoreBBefore()).isZero();
    }

    @Test
    void clipsArePaddedAndClampedToTheVideo() {
        Candidate c = HighlightSelector.rank(List.of(new RallyFacts(1, 1, 0.5, 60.5, 10, "UPPER", 1, 0, null, null, true)),
                61.0, true).get(0);

        assertThat(c.clipStart()).isZero();
        assertThat(c.clipEnd()).isEqualTo(61.0);
    }

    @Test
    void defaultCutStaysUnderTargetAndIsInMatchOrder() {
        List<RallyFacts> rallies = new ArrayList<>();
        for (int i = 1; i <= 40; i++) {
            rallies.add(rally(i, i * 60.0, 10 + (i % 20), "UPPER", i % 15, 0, "CLEAR", "UPPER"));
        }

        List<Candidate> ranked = HighlightSelector.rank(rallies, null, true);
        List<Candidate> suggested = ranked.stream().filter(Candidate::suggested).toList();

        assertThat(suggested).isNotEmpty().hasSizeLessThanOrEqualTo(HighlightSelector.TARGET_CLIPS);
        assertThat(suggested.stream().mapToDouble(Candidate::clipDuration).sum())
                .isLessThanOrEqualTo(HighlightSelector.TARGET_REEL_SECONDS);
        assertThat(ranked).isSortedAccordingTo((a, b) -> Integer.compare(a.rallyNumber(), b.rallyNumber()));
        Candidate best = ranked.stream().max((a, b) -> Integer.compare(a.score(), b.score())).orElseThrow();
        assertThat(best.suggested()).isTrue();
    }

    @Test
    void quietMatchStillGetsAStartingSelection() {
        List<Candidate> ranked = HighlightSelector.rank(List.of(
                rally(1, 10, 3, "UPPER", 1, 0, "CLEAR", "UPPER"),
                rally(2, 30, 4, "LOWER", 1, 1, "DROP", "LOWER"),
                rally(3, 50, 2, "UPPER", 2, 1, "LIFT", "UPPER"),
                rally(4, 70, 3, "UPPER", 3, 1, "LIFT", "UPPER")), null, true);

        assertThat(ranked).filteredOn(Candidate::suggested).hasSize(HighlightSelector.MIN_SUGGESTED_CLIPS);
    }

    @Test
    void brokenRalliesAreLeftOut() {
        List<Candidate> ranked = HighlightSelector.rank(List.of(
                new RallyFacts(1, 1, 10, 11, 1, "UPPER", 1, 0, null, null, true),
                new RallyFacts(2, 2, 20, 200, 80, "UPPER", 2, 0, null, null, true),
                new RallyFacts(3, 3, 300, 310, 8, "UPPER", 3, 0, null, null, false)), null, true);

        assertThat(ranked).isEmpty();
    }

    @Test
    void warmUpRalliesBeforeTheFirstScoreboardReadingAreMarkedBeforeTheMatch() {
        // Match 330: the AI counted two warm-up rallies (1-0, 1-1), then read the scoreboard at 1-0.
        List<RallyFacts> rallies = List.of(
                rally(1, 270, 4, "UPPER", 1, 0, null, null),
                rally(2, 289, 1, "LOWER", 1, 1, null, null),
                rally(3, 380, 14, "UPPER", 1, 0, null, null),
                rally(4, 406, 4, "LOWER", 1, 1, null, null),
                rally(5, 426, 11, "LOWER", 1, 2, null, null));

        Map<Long, HighlightSelector.GameContext> games = HighlightSelector.trackGames(rallies, true);

        assertThat(games.get(1L).beforeMatch()).isTrue();
        assertThat(games.get(2L).beforeMatch()).isTrue();
        assertThat(games.get(1L).aWon() || games.get(1L).bWon()).isFalse();
        assertThat(games.get(3L).beforeMatch()).isFalse();
        assertThat(games.get(3L).aAfter()).isEqualTo(1);
        assertThat(games.get(3L).bAfter()).isEqualTo(0);
        assertThat(games.get(5L).aAfter()).isEqualTo(1);
        assertThat(games.get(5L).bAfter()).isEqualTo(2);
    }

    @Test
    void aCountRestartingForTheNextGameIsNotWarmUp() {
        // Match 308: the AI missed points, so game 1 ended at 20-15 in its count, then restarted at 1-0.
        List<RallyFacts> rallies = new ArrayList<>();
        int[] count = {0, 0};
        run(rallies, "LOWER", 20, count);
        run(rallies, "UPPER", 15, count);
        rallies.add(rally(36, 2000, 4, "UPPER", 1, 0, null, null));
        rallies.add(rally(37, 2030, 4, "LOWER", 1, 1, null, null));

        Map<Long, HighlightSelector.GameContext> games = HighlightSelector.trackGames(rallies, true);

        assertThat(games.values()).noneMatch(HighlightSelector.GameContext::beforeMatch);
        // The restart ends game 1 (won by the player ahead) and starts game 2 with the players' ends changed.
        assertThat(games.get(35L).game()).isEqualTo(1);
        assertThat(games.get(36L).game()).isEqualTo(2);
        assertThat(games.get(36L).aOnUpper()).isFalse();
        assertThat(games.get(36L).bAfter()).isEqualTo(1); // B is on the upper half now and won it
    }

    @Test
    void aGameEndedByTheRulesIsNotEndedAgainWhenTheCountRestarts() {
        List<RallyFacts> rallies = new ArrayList<>();
        int[] count = {0, 0};
        run(rallies, "UPPER", 21, count);                          // game 1: A wins 21-0
        rallies.add(rally(22, 2000, 4, "UPPER", 1, 0, null, null)); // the AI restarts its count for game 2

        Map<Long, HighlightSelector.GameContext> games = HighlightSelector.trackGames(rallies, true);

        assertThat(games.get(22L).game()).isEqualTo(2);
        assertThat(games.get(22L).afterMatch()).isFalse();
    }

    @Test
    void aCountThatDropsAfterTheVideoStartsMidGameMarksNothing() {
        // The owner gave a starting score: the count is not from 0-0, so no rally is taken as warm-up.
        List<RallyFacts> rallies = List.of(
                rally(1, 10, 4, "UPPER", 1, 0, null, null),
                rally(2, 30, 4, "LOWER", 1, 1, null, null),
                rally(3, 50, 4, "UPPER", 1, 0, null, null));

        Map<Long, HighlightSelector.GameContext> games =
                HighlightSelector.trackGames(rallies, true, new HighlightSelector.Start(1, 5, 4));

        assertThat(games.values()).noneMatch(HighlightSelector.GameContext::beforeMatch);
    }
}
