package com.badminton.service.coach;

import com.badminton.dto.coach.CoachDtos.VideoCitation;
import com.badminton.entity.coach.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.ArrayList;
import java.util.List;
import java.util.Map;
import java.util.function.Consumer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.doThrow;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.times;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoachServiceTest {

    private static final CoachCaller GUEST = CoachCaller.GUEST;

    private final ObjectMapper mapper = new ObjectMapper();
    @Mock
    private GeminiClient gemini;
    @Mock
    private CoachTools tools;
    private CoachService coach;

    @BeforeEach
    void setUp() {
        coach = new CoachService(gemini, tools, mapper);
        lenient().when(gemini.isConfigured()).thenReturn(true);
        lenient().when(gemini.chatModels()).thenReturn(List.of("primary", "backup"));
        lenient().when(tools.declarations()).thenReturn(mapper.createArrayNode());
    }

    /** Each call of streamGenerate replays the next list of chunks. */
    private void geminiAnswers(String model, List<List<String>> callsOfChunks) {
        int[] call = {0};
        doAnswer(inv -> {
            Consumer<JsonNode> onChunk = inv.getArgument(2);
            for (String chunk : callsOfChunks.get(call[0]++)) {
                onChunk.accept(mapper.readTree(chunk));
            }
            return null;
        }).when(gemini).streamGenerate(eq(model), any(), any());
    }

    private static String textChunk(String text) {
        return "{\"candidates\":[{\"content\":{\"role\":\"model\",\"parts\":[{\"text\":\"" + text + "\"}]}}]}";
    }

    @Test
    void runsTheRequestedToolThenStreamsTheAnswer() throws Exception {
        String call = "{\"candidates\":[{\"content\":{\"parts\":[{\"functionCall\":{\"name\":\"get_match_rallies\","
                + "\"args\":{\"match_id\":13}},\"thoughtSignature\":\"sig\"}]}}]}";
        geminiAnswers("primary", List.of(List.of(call), List.of(textChunk("Pha dài nhất là "), textChunk("[Pha cầu #3 - 01:56]"))));
        when(tools.call(eq("get_match_rallies"), any(), eq(GUEST))).thenReturn(Map.of("rallies", List.of()));

        List<String> streamed = new ArrayList<>();
        coach.answer("Pha dài nhất?", 13L, List.of(), GUEST, streamed::add);

        assertThat(String.join("", streamed)).isEqualTo("Pha dài nhất là [Pha cầu #3 - 01:56]");
        ArgumentCaptor<JsonNode> body = ArgumentCaptor.forClass(JsonNode.class);
        verify(gemini, times(2)).streamGenerate(eq("primary"), body.capture(), any());
        JsonNode second = body.getAllValues().get(1).get("contents");
        // The model's function call goes back unchanged (with its thought signature), then the tool result.
        assertThat(second.get(1).at("/parts/0/thoughtSignature").asText()).isEqualTo("sig");
        assertThat(second.get(2).at("/parts/0/functionResponse/name").asText()).isEqualTo("get_match_rallies");
        assertThat(body.getAllValues().get(0).at("/systemInstruction/parts/0/text").asText()).contains("match_id=13");
    }

    @Test
    void sendsEarlierMessagesAsHistory() throws Exception {
        geminiAnswers("primary", List.of(List.of(textChunk("ok"))));
        List<ChatMessage> history = List.of(
                ChatMessage.builder().senderRole(ChatMessage.ROLE_USER).content("Trận #13 ai thắng?").build(),
                ChatMessage.builder().senderRole(ChatMessage.ROLE_ASSISTANT).content("Axelsen dẫn 20-16").build());

        coach.answer("Còn pha dài nhất?", null, history, GUEST, t -> { });

        ArgumentCaptor<JsonNode> body = ArgumentCaptor.forClass(JsonNode.class);
        verify(gemini).streamGenerate(eq("primary"), body.capture(), any());
        // The captured body is the live request, so the model's reply has been appended after the question.
        JsonNode contents = body.getValue().get("contents");
        assertThat(contents).hasSize(4);
        assertThat(contents.get(0).get("role").asText()).isEqualTo("user");
        assertThat(contents.get(1).get("role").asText()).isEqualTo("model");
        assertThat(contents.get(2).at("/parts/0/text").asText()).isEqualTo("Còn pha dài nhất?");
    }

    @Test
    void triesTheBackupModelWhenThePrimaryFailsBeforeAnswering() throws Exception {
        doThrow(new GeminiClient.GeminiException("503")).when(gemini).streamGenerate(eq("primary"), any(), any());
        geminiAnswers("backup", List.of(List.of(textChunk("trả lời"))));

        List<String> streamed = new ArrayList<>();
        coach.answer("Hỏi", null, List.of(), GUEST, streamed::add);

        assertThat(streamed).containsExactly("trả lời");
    }

    @Test
    void doesNotSwitchModelOnceTextIsOnScreen() throws Exception {
        doAnswer(inv -> {
            Consumer<JsonNode> onChunk = inv.getArgument(2);
            onChunk.accept(mapper.readTree(textChunk("nửa câu")));
            throw new GeminiClient.GeminiException("connection reset");
        }).when(gemini).streamGenerate(eq("primary"), any(), any());

        assertThatThrownBy(() -> coach.answer("Hỏi", null, List.of(), GUEST, t -> { }))
                .isInstanceOf(CoachService.CoachUnavailableException.class);
        verify(gemini, never()).streamGenerate(eq("backup"), any(), any());
    }

    @Test
    void withoutAKeyTheCoachIsUnavailable() {
        when(gemini.isConfigured()).thenReturn(false);

        assertThatThrownBy(() -> coach.answer("Hỏi", null, List.of(), GUEST, t -> { }))
                .isInstanceOf(CoachService.CoachUnavailableException.class);
    }

    @Test
    void extractsRallyLinks() {
        List<VideoCitation> citations = CoachService.extractCitations(
                "Xem [Pha cầu #3 - 01:56] và [Pha cầu #12 - 10:05], không phải [Pha cầu #x].");

        assertThat(citations).containsExactly(new VideoCitation(3, "01:56", 116, null),
                new VideoCitation(12, "10:05", 605, null));
    }

    @Test
    void extractCitations_readsTheMatchOfARallyFromAnotherMatch() {
        List<VideoCitation> citations = CoachService.extractCitations(
                "Mất điểm ở lưới [Trận #308 - Pha cầu #12 - 05:40] [Trận #297 - Pha cầu #3 - 01:02] [Pha cầu #7 - 02:10]");

        assertThat(citations).containsExactly(new VideoCitation(12, "05:40", 340, 308L),
                new VideoCitation(3, "01:02", 62, 297L), new VideoCitation(7, "02:10", 130, null));
    }
}
