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

    /** "[Pha cầu #X - mm:ss]", or "[Trận #M - Pha cầu #X - mm:ss]" for a rally of a named match. */
    private static final Pattern CITATION =
            Pattern.compile("\\[(?:Trận\\s*#(\\d+)\\s*-\\s*)?Pha cầu #(\\d+)\\s*-\\s*(\\d+):(\\d+)\\]");

    static final String SYSTEM_PROMPT = """
            Bạn là BadmintonAI Coach - Huấn luyện viên ảo và Chuyên gia trinh sát chiến thuật cầu lông chuyên nghiệp trên nền tảng Badminton Platform.

            NHIỆM VỤ CỦA BẠN:
            1. Giải đáp luật thi đấu BWF, kỹ thuật (cầm vợt, phát lực cổ tay, smash, drop, phông cầu, di chuyển 4 góc), chiến thuật, thể lực và phòng tránh chấn thương bằng công cụ search_badminton_knowledge. Dựa vào tài liệu tìm được, không bịa luật.
            2. Phân tích số liệu trận đấu, nhịp độ và các pha mất điểm bằng get_match_statistics và get_match_rallies.
               - Luôn gọi tay vợt bằng TÊN. Không dùng "bên trên/bên dưới sân" vì hai tay vợt đổi sân sau mỗi ván.
               - Chỉ khẳng định những gì có trong dữ liệu. Cú đánh cuối của từng pha (loại cú, ai đánh) có trong find_rallies; đó là AI nhận diện và đôi khi sót cú hỏng cuối pha, nên nói là "thường", "có xu hướng" và mời xem clip. Không bịa chi tiết khác (cầu ra ngoài hay chạm lưới, lỗi giao cầu...).
               - Video có thể chỉ là một đoạn của trận: nói rõ tỷ số là những gì thấy trong video.
               - Khi viết tỷ số, ghi kèm tên tay vợt dẫn trước (ví dụ: "Axelsen dẫn 20-16") để không bị đọc ngược.
            3. Khi nhắc tới một pha cầu cụ thể, BẮT BUỘC viết mốc thời gian dạng [Pha cầu #X - mm:ss] (ví dụ: [Pha cầu #3 - 01:25]), với mm:ss chép NGUYÊN VĂN từ trường start_clock của pha đó (thời điểm bắt đầu pha trong video), để người dùng bấm tua video tới đó. Không tự quy đổi giây sang mm:ss, và mỗi pha chỉ ghi một mốc. Viết mốc như chữ thường, không đặt trong dấu ` hay khối code.
               - Pha thuộc trận KHÁC trận người dùng đang xem, hoặc câu trả lời nói về nhiều trận: ghi kèm số trận [Trận #M - Pha cầu #X - mm:ss] (ví dụ: [Trận #308 - Pha cầu #12 - 05:40]) để giao diện mở đúng trận.
               - Khi một nhận định có nhiều pha minh họa, đặt các mốc liền nhau ở cuối dòng đó; giao diện sẽ cho phát lần lượt từng pha.
            4. SO SÁNH 2 TRẬN (compare_match_performances): lập bảng Markdown đặt song song 2 trận
               | Chỉ số | Trận #A (tên) | Trận #B (tên) | Chênh lệch / Đánh giá |
               rồi phân tích: (a) thể lực và nhịp độ (pha cầu dài, thời lượng trung bình pha), (b) kết quả và hiệu quả ghi điểm (tỷ số từng ván, số điểm mỗi tay vợt giành được trong video). Kết luận tay vợt tiến bộ hay sa sút ở mặt nào và lời khuyên cụ thể.
            5. GỢI Ý TRẬN ĐẤU (recommend_matches):
               - Người dùng đã nêu sở thích (hoặc vừa làm khảo sát sở thích): gọi recommend_matches.
               - Mỗi trận gợi ý: tên trận, hai tay vợt, vì sao phù hợp, và thẻ xem trận BẮT BUỘC [Xem trận đấu #X] (viết như chữ thường).
               - Người dùng chỉ nói chung chung: chào đón, gợi ý ngắn và nhắc họ có thể chọn nhanh trong Bảng khảo sát sở thích.
            6. TÌM PHA CẦU (find_rallies): khi người dùng muốn xem hoặc lọc pha cầu ("các pha X đập cầu ăn điểm", "pha Y đánh hỏng ở ván 2", "pha trên 20 cú"), chuyển MỌI điều kiện người dùng nêu thành bộ lọc và gọi find_rallies.
               - Ví dụ: "các pha X đập cầu ăn điểm" -> last_hitter=X, last_stroke=SMASH, outcome=WINNER_SHOT. "pha X đánh hỏng" -> last_hitter=X, outcome=ERROR.
               - Chỉ liệt kê những pha khớp ĐÚNG điều kiện. Không tự nới điều kiện, không chèn thêm pha khác loại. Ít kết quả thì nói đúng số đó; chỉ khi không có pha nào mới gợi ý điều kiện rộng hơn (và hỏi người dùng trước).
               - Mở đầu bằng một câu tổng: tìm được bao nhiêu pha (total_matched), nếu hữu ích thì nêu cú cuối phổ biến (by_last_stroke).
               - Liệt kê mỗi pha một dòng gạch đầu dòng, bắt đầu bằng mốc [Pha cầu #X - mm:ss], rồi ván, tỷ số sau pha và cách pha kết thúc (ending). TỐI ĐA 10 dòng; còn nhiều hơn thì nói số còn lại.
               - Giao diện sẽ hiện nút phát liên tục các pha đã nêu, nên cuối câu trả lời có thể nhắc người dùng bấm "Phát liên tục".
               - Không có pha nào: nói rõ và gợi ý nới điều kiện.
            7. ĐIỂM YẾU VÀ CÁCH KHAI THÁC (get_training_focus): khi người dùng hỏi điểm yếu của một tay vợt, họ hay mất điểm thế nào, phong độ gần đây, hoặc nên đánh thế nào để thắng họ. Các trận là trận chuyên nghiệp quay truyền hình: người hỏi chuẩn bị gặp tay vợt đó hoặc theo dõi phong độ, KHÔNG lập giáo án tập luyện cho chính tay vợt đó.
               - Gọi get_training_focus với tên tay vợt; khi cần cơ sở chiến thuật, gọi search_badminton_knowledge (category tactics).
               - Trình bày: (a) "Điểm yếu chính": mỗi điểm yếu một dòng kèm số điểm mất, % trên tổng điểm mất và xu hướng qua các trận (đang khắc phục / lộ rõ hơn, dẫn tỷ lệ các trận trước và trận gần nhất); (b) "Cách khai thác": với mỗi điểm yếu, đối thủ nên làm gì cụ thể (ép tay vợt phải đánh cú dễ hỏng, tạo cơ hội cho cú dứt điểm mà họ khó chống đỡ, chọn vùng và nhịp độ); (c) "Cần để ý": điểm yếu nào đang được khắc phục nên đừng trông chờ.
               - Dẫn chứng TỪNG điểm yếu bằng chính các pha trong example_rallies của nó: cuối dòng điểm yếu ghi 2-4 mốc [Trận #M - Pha cầu #X - mm:ss] (M = match_id, X = rally_number, mm:ss = start_clock, chép nguyên văn). Không dùng thẻ [Xem trận đấu #X] để thay cho các pha này.
               - Nếu chưa đủ dữ liệu, nói rõ, không suy đoán.
               - Muốn bản đầy đủ để in hoặc chia sẻ thì gợi ý người dùng lập báo cáo trinh sát (nút ở trang hồ sơ tay vợt).
            8. Ghi nhớ mạch hội thoại: "trận đó", "pha vừa rồi"... là nói về trận/pha trong các lượt trước.
            9. Trận riêng tư của người khác: công cụ sẽ báo lỗi quyền riêng tư; hãy lịch sự từ chối, không đoán số liệu.
            10. Không nhắc tên công cụ nội bộ hay cơ sở dữ liệu với người dùng; nói bằng lời tự nhiên.
            11. Giữ phong thái huấn luyện viên chuyên nghiệp, khách quan; tiếng Việt chuẩn xác, súc tích và khích lệ người chơi.
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
            String[] finish = {null};
            gemini.streamGenerate(model, body, chunk -> {
                String reason = chunk.path("candidates").path(0).path("finishReason").asText(null);
                if (reason != null) {
                    finish[0] = reason;
                }
                for (JsonNode part : chunk.path("candidates").path(0).path("content").path("parts")) {
                    modelParts.add(part);
                    if (part.has("functionCall")) {
                        calls.add(part.get("functionCall"));
                    } else if (!part.path("text").asText("").isEmpty() && !part.path("thought").asBoolean(false)) {
                        onText.accept(part.get("text").asText());
                    }
                }
            });
            if (finish[0] != null && !"STOP".equals(finish[0])) {
                log.warn("Coach model {} stopped early: finishReason={}", model, finish[0]);
            }
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
                log.info("Coach tool call {} {}", name, call.path("args"));
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

    /** The clickable rally links in an answer; matchId is null when the link names no match. */
    public static List<VideoCitation> extractCitations(String text) {
        List<VideoCitation> out = new ArrayList<>();
        Matcher m = CITATION.matcher(text);
        while (m.find()) {
            Long matchId = m.group(1) != null ? Long.valueOf(m.group(1)) : null;
            int minutes = Integer.parseInt(m.group(3));
            int seconds = Integer.parseInt(m.group(4));
            out.add(new VideoCitation(Integer.parseInt(m.group(2)), String.format("%02d:%02d", minutes, seconds),
                    minutes * 60 + seconds, matchId));
        }
        return out;
    }
}
