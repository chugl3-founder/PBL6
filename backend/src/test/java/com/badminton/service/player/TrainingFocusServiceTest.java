package com.badminton.service.player;

import com.badminton.dto.player.PlayerProfileResponse.Radar;
import com.badminton.dto.player.TrainingFocusResponse;
import com.badminton.repository.player.PlayerStatsRepository.MatchRow;
import com.badminton.repository.player.PlayerStatsRepository.RallyEnd;
import org.junit.jupiter.api.Test;

import java.time.LocalDate;
import java.util.ArrayList;
import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class TrainingFocusServiceTest {

    private static final Radar NO_RADAR = new Radar(null, null, null, null, null, null);

    private static MatchRow match(long id, LocalDate date) {
        return new MatchRow(id, "Trận " + id, date, "PUBLISHED", false, id * 10, "LOWER", "Axelsen", "Momota",
                100, 10, 10, null, null, NO_RADAR);
    }

    /** n lost rallies of the match ending on the given stroke; byPlayer: the player hit the last shot. */
    private static void lose(List<RallyEnd> ends, long matchId, int n, String stroke, boolean byPlayer) {
        for (int i = 0; i < n; i++) {
            ends.add(new RallyEnd(matchId, true, "Momota", ends.size() * 10.0, ends.size() * 10.0 + 5, stroke,
                    byPlayer, false, null, null));
        }
    }

    @Test
    void theMostFrequentWayOfLosingComesFirstAndItsTrendFollowsTheMatches() {
        List<RallyEnd> ends = new ArrayList<>();
        // Older match: 6 of 10 lost points are the player's own smash errors.
        lose(ends, 1, 6, "SMASH", true);
        lose(ends, 1, 4, "DROP", false);
        // Latest match: only 1 of 10.
        lose(ends, 2, 1, "SMASH", true);
        lose(ends, 2, 9, "DROP", false);
        ends.add(new RallyEnd(2L, true, "Momota", 999, 1000, "SMASH", true, true, null, null)); // a won rally: ignored

        TrainingFocusResponse res = TrainingFocusService.build(
                List.of(match(2, LocalDate.of(2026, 3, 1)), match(1, LocalDate.of(2026, 1, 1))), ends);

        assertThat(res.pointsLost()).isEqualTo(20);
        assertThat(res.matchesAnalyzed()).isEqualTo(2);
        assertThat(res.focuses()).extracting(TrainingFocusResponse.Focus::key)
                .containsExactly("CONCEDED:DROP", "ERROR:SMASH");

        TrainingFocusResponse.Focus smash = res.focuses().get(1);
        assertThat(smash.count()).isEqualTo(7);
        assertThat(smash.share()).isEqualTo(35);
        assertThat(smash.baselineRate()).isEqualTo(60);
        assertThat(smash.latestRate()).isEqualTo(10);
        assertThat(smash.trend()).isEqualTo("IMPROVING");
        assertThat(smash.matches()).extracting(TrainingFocusResponse.MatchPoint::matchId).containsExactly(1L, 2L);
        assertThat(smash.clips().get(0).matchId()).isEqualTo(2L); // newest match first

        assertThat(res.focuses().get(0).trend()).isEqualTo("WORSENING");
    }

    @Test
    void oneMatchIsNotEnoughForATrendAndUnknownStrokesAreNotAFocus() {
        List<RallyEnd> ends = new ArrayList<>();
        lose(ends, 1, 5, "UNKNOWN", true);
        lose(ends, 1, 3, "CLEAR", true);
        lose(ends, 1, 1, "LIFT", false);

        TrainingFocusResponse res = TrainingFocusService.build(List.of(match(1, LocalDate.of(2026, 1, 1))), ends);

        assertThat(res.pointsLost()).isEqualTo(9);
        assertThat(res.focuses()).extracting(TrainingFocusResponse.Focus::key).containsExactly("ERROR:CLEAR");
        assertThat(res.focuses().get(0).trend()).isEqualTo("NOT_ENOUGH_DATA");
    }
}
