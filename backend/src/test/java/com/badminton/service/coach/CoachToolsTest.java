package com.badminton.service.coach;

import com.badminton.service.analysis.ReplayDataService;
import com.badminton.service.match.MatchAccessService;
import com.badminton.service.match.MatchResultService;
import com.badminton.service.match.PublicReplayService;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.analysis.RallyResponse;
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
    private GeminiClient gemini;
    private CoachTools tools;

    private final Match privateMatch = Match.builder().id(5L).status("ANALYZED").playerAName("Axelsen").playerBName("Momota")
            .owner(User.builder().id(1L).email("owner@badminton.vn").build()).build();

    @BeforeEach
    void setUp() {
        tools = new CoachTools(matchAccess, publicReplayService, replayDataService, matchResultService,
                scoutingReportRepository, coachQueryRepository, gemini, mapper);
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
                .containsEntry("start_time_seconds", new BigDecimal("33.8"));
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
