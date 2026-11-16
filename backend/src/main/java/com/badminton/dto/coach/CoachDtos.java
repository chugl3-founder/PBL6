package com.badminton.dto.coach;

import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

import java.time.OffsetDateTime;
import java.util.List;

/**
 * Request and response bodies of the AI Coach API. Field names are snake_case, as the chat widget reads them.
 */
public final class CoachDtos {

    private CoachDtos() {
    }

    /** A question; sessionId continues a conversation, browserKey identifies a guest's browser. */
    public record ChatRequest(
            @NotBlank(message = "Nội dung câu hỏi không được để trống")
            @Size(max = 4000, message = "Câu hỏi tối đa 4000 ký tự")
            String message,
            @JsonProperty("match_id") Long matchId,
            @JsonProperty("session_id") String sessionId,
            @JsonProperty("browser_key") @Size(max = 100) String browserKey) {
    }

    /** A clickable rally link in an answer: "[Pha cầu #3 - 01:56]". */
    public record VideoCitation(
            @JsonProperty("rally_number") int rallyNumber,
            String timestamp,
            int seconds) {
    }

    public record SessionItem(
            @JsonProperty("session_id") String sessionId,
            @JsonProperty("user_id") Long userId,
            @JsonProperty("match_id") Long matchId,
            String title,
            @JsonProperty("created_at") OffsetDateTime createdAt) {
    }

    public record SessionList(List<SessionItem> sessions) {
    }

    public record MessageItem(
            String id,
            String role,
            String content,
            @JsonProperty("video_citations") List<VideoCitation> videoCitations,
            @JsonProperty("created_at") OffsetDateTime createdAt) {
    }

    public record History(
            @JsonProperty("session_id") String sessionId,
            List<MessageItem> messages) {
    }

    /** A match the user may compare: score is the games seen in the video in player A-B order ("21-15, 18-21"). */
    public record MatchOption(
            Long id,
            String title,
            @JsonProperty("player_a") String playerA,
            @JsonProperty("player_b") String playerB,
            String score,
            @JsonProperty("total_strokes") int totalStrokes) {
    }

    public record MatchOptions(List<MatchOption> matches) {
    }
}
