package com.badminton.service.coach;

import com.badminton.dto.coach.CoachDtos.VideoCitation;
import com.badminton.entity.coach.ChatMessage;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;
import java.util.function.Consumer;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

/**
 * The AI Coach agent: sends the conversation to Gemini with the coach tools, runs the function calls it asks
 * for, and streams the text of the answer as it is generated. Tries the configured models in order.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class CoachService {

    /** Function-call rounds per answer before giving up (a normal answer needs one or two). */
    private static final int MAX_TOOL_ROUNDS = 6;

    private static final Pattern CITATION = Pattern.compile("\\[Pha cầu #(\\d+)\\s*-\\s*(\\d+):(\\d+)\\]");

    static final String SYSTEM_PROMPT = """
            Bạn là BadmintonAI Coach - Huấn luyện viên ảo và Chuyên gia trinh sát chiến thuật cầu lông chuyên nghiệp trên nền tảng Badminton Platform.

            NHIỆM VỤ CỦA BẠN:
            1. Giải đáp luật thi đấu BWF, kỹ thuật (cầm vợt, phát lực cổ tay, smash, drop, phông cầu, di chuyển 4 góc), chiến thuật, thể lực và phòng tránh chấn thương bằng công cụ search_badminton_knowledge. Dựa vào tài liệu tìm được, không bịa luật.
            2. Phân tích số liệu trận đấu, nhịp độ và các pha mất điểm bằng get_match_statistics và get_match_rallies.
               - Luôn gọi tay vợt bằng TÊN. Không dùng "bên trên/bên dưới sân" vì hai tay vợt đổi sân sau mỗi ván.
               - Chỉ khẳng định những gì có trong dữ liệu. Dữ liệu chưa có loại cú dứt điểm (smash, drop...) của từng pha hay lỗi tự đánh hỏng; đừng bịa các chi tiết này.
               - Video có thể chỉ là một đoạn của trận: nói rõ tỷ số là những gì thấy trong video.
               - Khi viết tỷ số, ghi kèm tên tay vợt dẫn trước (ví dụ: "Axelsen dẫn 20-16") để không bị đọc ngược.
            3. Khi nhắc tới một pha cầu cụ thể, BẮT BUỘC viết mốc thời gian dạng [Pha cầu #X - mm:ss] (ví dụ: [Pha cầu #3 - 01:25]), với mm:ss chép NGUYÊN VĂN từ trường start_clock của pha đó (thời điểm bắt đầu pha trong video), để người dùng bấm tua video tới đó. Không tự quy đổi giây sang mm:ss, và mỗi pha chỉ ghi một mốc. Viết mốc như chữ thường, không đặt trong dấu ` hay khối code.
            4. SO SÁNH 2 TRẬN (compare_match_performances): lập bảng Markdown đặt song song 2 trận
               | Chỉ số | Trận #A (tên) | Trận #B (tên) | Chênh lệch / Đánh giá |
               rồi phân tích: (a) thể lực và nhịp độ (pha cầu dài, thời lượng trung bình pha), (b) kết quả và hiệu quả ghi điểm (tỷ số từng ván, số điểm mỗi tay vợt giành được trong video). Kết luận tay vợt tiến bộ hay sa sút ở mặt nào và lời khuyên cụ thể.
            5. GỢI Ý TRẬN ĐẤU (recommend_matches):
               - Người dùng đã nêu sở thích (hoặc vừa làm khảo sát sở thích): gọi recommend_matches.
               - Mỗi trận gợi ý: tên trận, hai tay vợt, vì sao phù hợp, và thẻ xem trận BẮT BUỘC [Xem trận đấu #X] (viết như chữ thường).
               - Người dùng chỉ nói chung chung: chào đón, gợi ý ngắn và nhắc họ có thể chọn nhanh trong Bảng khảo sát sở thích.
            6. Ghi nhớ mạch hội thoại: "trận đó", "pha vừa rồi"... là nói về trận/pha trong các lượt trước.
            7. Trận riêng tư của người khác: công cụ sẽ báo lỗi quyền riêng tư; hãy lịch sự từ chối, không đoán số liệu.
            8. Không nhắc tên công cụ nội bộ hay cơ sở dữ liệu với người dùng; nói bằng lời tự nhiên.
            9. Giữ phong thái huấn luyện viên chuyên nghiệp, khách quan; tiếng Việt chuẩn xác, súc tích và khích lệ người chơi.
            """;

    private final GeminiClient gemini;
    private final CoachTools tools;
    private final ObjectMapper objectMapper;

    /** Gemini could not answer; the reason is logged, the user sees a generic message. */
    public static class CoachUnavailableException extends RuntimeException {
        public CoachUnavailableException(String message, Throwable cause) {
            super(message, cause);
        }
    }

    /**
     * Answers the question, sending text to onText as it arrives.
     *
     * @param history earlier messages of the conversation, oldest first
     * @param matchId the match being watched, or null
     * @throws CoachUnavailableException when no model could answer
     */
    public void answer(String question, Long matchId, List<ChatMessage> history, CoachCaller caller,
                       Consumer<String> onText) {
        if (!gemini.isConfigured()) {
            throw new CoachUnavailableException("GEMINI_API_KEY is not set", null);
        }
        RuntimeException last = null;
        for (String model : gemini.chatModels()) {
            boolean[] sentText = {false};
            try {
                run(model, question, matchId, history, caller, text -> {
                    sentText[0] = true;
                    onText.accept(text);
                });
                return;
            } catch (RuntimeException e) {
                last = e;
                log.warn("Coach model {} failed: {}", model, e.getMessage());
                if (sentText[0]) {
                    break; // part of an answer is on screen already; another model would start over
                }
            }
        }
        throw new CoachUnavailableException(last != null ? last.getMessage() : "no model configured", last);
    }

    private void run(String model, String question, Long matchId, List<ChatMessage> history, CoachCaller caller,
                     Consumer<String> onText) {
        ArrayNode contents = objectMapper.createArrayNode();
        for (ChatMessage m : history) {
            addText(contents, ChatMessage.ROLE_USER.equals(m.getSenderRole()) ? "user" : "model", m.getContent());
        }
        addText(contents, "user", question);

        ObjectNode body = objectMapper.createObjectNode();
        body.putObject("systemInstruction").putArray("parts").addObject().put("text", systemPrompt(matchId));
        body.set("contents", contents);
        body.putArray("tools").addObject().set("functionDeclarations", tools.declarations());
        body.putObject("generationConfig").put("temperature", 0.3);

        boolean answered = false;
        for (int round = 0; round < MAX_TOOL_ROUNDS; round++) {
            // The model's parts are sent back unchanged (thought signatures included), as Gemini requires.
            ArrayNode modelParts = objectMapper.createArrayNode();
            List<JsonNode> calls = new ArrayList<>();
            gemini.streamGenerate(model, body, chunk -> {
                for (JsonNode part : chunk.path("candidates").path(0).path("content").path("parts")) {
                    modelParts.add(part);
                    if (part.has("functionCall")) {
                        calls.add(part.get("functionCall"));
                    } else if (!part.path("text").asText("").isEmpty() && !part.path("thought").asBoolean(false)) {
                        onText.accept(part.get("text").asText());
                    }
                }
            });
            if (modelParts.isEmpty()) {
                break;
            }
            ObjectNode modelTurn = contents.addObject();
            modelTurn.put("role", "model");
            modelTurn.set("parts", modelParts);
            if (calls.isEmpty()) {
                answered = true;
                break;
            }
            ArrayNode responses = objectMapper.createArrayNode();
            for (JsonNode call : calls) {
                String name = call.path("name").asText();
                Object result = tools.call(name, call.path("args"), caller);
                ObjectNode fr = responses.addObject().putObject("functionResponse");
                fr.put("name", name);
                fr.set("response", objectMapper.valueToTree(result));
            }
            ObjectNode toolTurn = contents.addObject();
            toolTurn.put("role", "user");
            toolTurn.set("parts", responses);
        }
        if (!answered) {
            throw new GeminiClient.GeminiException(model + " returned no answer");
        }
    }

    private static String systemPrompt(Long matchId) {
        return matchId == null ? SYSTEM_PROMPT : SYSTEM_PROMPT
                + "\nNGỮ CẢNH: Người dùng đang xem trận đấu match_id=" + matchId + ". \"Trận này\" là trận #" + matchId + ".\n";
    }

    private static void addText(ArrayNode contents, String role, String text) {
        ObjectNode turn = contents.addObject();
        turn.put("role", role);
        turn.putArray("parts").addObject().put("text", text);
    }

    /** The clickable rally links "[Pha cầu #X - mm:ss]" in an answer. */
    public static List<VideoCitation> extractCitations(String text) {
        List<VideoCitation> out = new ArrayList<>();
        Matcher m = CITATION.matcher(text);
        while (m.find()) {
            int minutes = Integer.parseInt(m.group(2));
            int seconds = Integer.parseInt(m.group(3));
            out.add(new VideoCitation(Integer.parseInt(m.group(1)), String.format("%02d:%02d", minutes, seconds),
                    minutes * 60 + seconds));
        }
        return out;
    }
}
