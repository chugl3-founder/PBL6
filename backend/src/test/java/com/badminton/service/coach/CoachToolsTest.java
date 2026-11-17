package com.badminton.service.coach;

import com.badminton.service.analysis.ReplayDataService;
import com.badminton.service.match.MatchAccessService;
import com.badminton.service.match.MatchResultService;
import com.badminton.service.match.PublicReplayService;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.analysis.AiEventResponse;
import com.badminton.dto.analysis.RallyResponse;
import com.badminton.repository.player.PlayerStatsRepository;
import com.badminton.service.player.TrainingFocusService;
import com.badminton.entity.match.Match;
import com.badminton.entity.scouting.ScoutingReport;
import com.badminton.entity.user.User;
import com.badminton.repository.coach.CoachQueryRepository;
import com.badminton.repository.scouting.ScoutingReportRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoachToolsTest {

    private final ObjectMapper mapper = new ObjectMapper();
    @Mock
    private MatchAccessService matchAccess;
    @Mock
    private PublicReplayService publicReplayService;
    @Mock
    private ReplayDataService replayDataService;
    @Mock
    private MatchResultService matchResultService;
    @Mock
    private ScoutingReportRepository scoutingReportRepository;
    @Mock
    private CoachQueryRepository coachQueryRepository;
    @Mock
    private PlayerStatsRepository playerStatsRepository;
    @Mock
    private TrainingFocusService trainingFocusService;
    @Mock
    private GeminiClient gemini;
    private CoachTools tools;

    private final Match privateMatch = Match.builder().id(5L).status("ANALYZED").playerAName("Axelsen").playerBName("Momota")
            .owner(User.builder().id(1L).email("owner@badminton.vn").build()).build();

    @BeforeEach
    void setUp() {
        tools = new CoachTools(matchAccess, publicReplayService, replayDataService, matchResultService,
                scoutingReportRepository, coachQueryRepository, playerStatsRepository, trainingFocusService, gemini, mapper);
    }

    @SuppressWarnings("unchecked")
    @Test
    void findRalliesFiltersByLastStrokeAndWhoHitIt() {
        when(matchAccess.findActive(5L)).thenReturn(privateMatch);
        CoachCaller owner = new CoachCaller("owner@badminton.vn", 1L, false);
        // Rally 1: Axelsen (upper) smashes and wins. Rally 2: ends on Momota's smash but Axelsen wins (an error).
        when(replayDataService.getRallies(5L, "owner@badminton.vn")).thenReturn(List.of(
                RallyResponse.builder().rallyNumber(1).gameNumber(1).startTime(new BigDecimal("10")).endTime(new BigDecimal("15"))
                        .totalStrokes(2).upperPlayer("PLAYER_A").winnerPlayer("PLAYER_A").scoreA(1).scoreB(0).build(),
                RallyResponse.builder().rallyNumber(2).gameNumber(1).startTime(new BigDecimal("30")).endTime(new BigDecimal("36"))
                        .totalStrokes(2).upperPlayer("PLAYER_A").winnerPlayer("PLAYER_A").scoreA(2).scoreB(0).build()));
        when(replayDataService.getEvents(5L, "owner@badminton.vn")).thenReturn(List.of(
                AiEventResponse.builder().id(1L).timeSeconds(new BigDecimal("11")).playerSide("LOWER").stroke("SERVE").build(),
                AiEventResponse.builder().id(2L).timeSeconds(new BigDecimal("14")).playerSide("UPPER").stroke("SMASH").build(),
                AiEventResponse.builder().id(3L).timeSeconds(new BigDecimal("31")).playerSide("UPPER").stroke("SERVE").build(),
                AiEventResponse.builder().id(4L).timeSeconds(new BigDecimal("35")).playerSide("LOWER").stroke("SMASH").build()));

        Map<String, Object> won = (Map<String, Object>) tools.call("find_rallies", mapper.createObjectNode()
                .put("match_id", 5).put("last_stroke", "smash").put("outcome", "WINNER_SHOT"), owner);
        Map<String, Object> errors = (Map<String, Object>) tools.call("find_rallies", mapper.createObjectNode()
                .put("match_id", 5).put("last_hitter", "momota"), owner);

        assertThat(won).containsEntry("total_matched", 1);
        Map<String, Object> rally = ((List<Map<String, Object>>) won.get("rallies")).get(0);
        assertThat(rally).containsEntry("rally_number", 1).containsEntry("last_hitter", "Axelsen")
                .containsEntry("ending", "Axelsen ăn điểm bằng cú đập cầu").containsEntry("start_clock", "00:10");
        assertThat(errors).containsEntry("total_matched", 1);
        assertThat((String) ((List<Map<String, Object>>) errors.get("rallies")).get(0).get("ending"))
                .startsWith("Momota mất điểm sau cú đập cầu");
    }

    @SuppressWarnings("unchecked")
    @Test
    void findRalliesRejectsAPlayerWhoIsNotInTheMatch() {
        when(matchAccess.findActive(5L)).thenReturn(privateMatch);
        CoachCaller owner = new CoachCaller("owner@badminton.vn", 1L, false);

        Map<String, Object> result = (Map<String, Object>) tools.call("find_rallies",
                mapper.createObjectNode().put("match_id", 5).put("winner", "Lin Dan"), owner);

        assertThat((String) result.get("error")).contains("Axelsen gặp Momota");
    }

    @SuppressWarnings("unchecked")
    @Test
    void aGuestCannotReadAnotherUsersPrivateMatch() {
        when(matchAccess.findActive(5L)).thenReturn(privateMatch);
        doThrow(ApiException.forbidden("no")).when(matchAccess).requireOwnerOrAdmin(privateMatch, null);

        Map<String, Object> result = (Map<String, Object>) tools.call("get_match_rallies",
                mapper.createObjectNode().put("match_id", 5), CoachCaller.GUEST);

        assertThat((String) result.get("error")).startsWith("QUYỀN RIÊNG TƯ");
        verify(replayDataService, never()).getRallies(any(), any());
    }

    @SuppressWarnings("unchecked")
    @Test
    void ralliesNameTheWinnerAndSkipPlayAfterTheMatch() {
        when(matchAccess.findActive(5L)).thenReturn(privateMatch);
        CoachCaller owner = new CoachCaller("owner@badminton.vn", 1L, false);
        when(replayDataService.getRallies(5L, "owner@badminton.vn")).thenReturn(List.of(
                RallyResponse.builder().rallyNumber(1).gameNumber(1).startTime(new BigDecimal("33.84")).duration(BigDecimal.ONE)
                        .winnerPlayer("PLAYER_B").scoreA(14).scoreB(16).afterMatch(false).build(),
                RallyResponse.builder().rallyNumber(2).gameNumber(1).winnerPlayer("PLAYER_A").afterMatch(true).build()));

        Map<String, Object> result = (Map<String, Object>) tools.call("get_match_rallies",
                mapper.createObjectNode().put("match_id", 5), owner);

        List<Map<String, Object>> rallies = (List<Map<String, Object>>) result.get("rallies");
        assertThat(rallies).hasSize(1);
        assertThat(rallies.get(0)).containsEntry("winner", "Momota")
                .containsEntry("score_after", "Axelsen 14 - 16 Momota")
                .containsEntry("start_time_seconds", new BigDecimal("33.8"))
                .containsEntry("start_clock", "00:33");
    }

    @Test
    void clockKeepsCountingMinutesPastAnHour() {
        assertThat(CoachTools.clock(new BigDecimal("607.4"))).isEqualTo("10:07");
        assertThat(CoachTools.clock(new BigDecimal("3725.9"))).isEqualTo("62:05");
        assertThat(CoachTools.clock(null)).isNull();
    }

    @SuppressWarnings("unchecked")
    @Test
    void scoutingReportsAreOnlyTheCallersOwn() {
        CoachCaller user = new CoachCaller("coach@badminton.vn", 9L, false);
        when(scoutingReportRepository.findByOwnerIdOrderByUpdatedAtDesc(9L)).thenReturn(List.of(
                ScoutingReport.builder().title("Kế hoạch").opponentName("Viktor Axelsen").build()));

        Map<String, Object> found = (Map<String, Object>) tools.call("get_scouting_report",
                mapper.createObjectNode().put("opponent_name", "axelsen"), user);
        Map<String, Object> guest = (Map<String, Object>) tools.call("get_scouting_report",
                mapper.createObjectNode().put("opponent_name", "axelsen"), CoachCaller.GUEST);

        assertThat(found).containsEntry("opponent", "Viktor Axelsen");
        assertThat(guest).containsKey("message");
        verify(scoutingReportRepository).findByOwnerIdOrderByUpdatedAtDesc(9L);
    }
}
