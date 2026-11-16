package com.badminton.controller.coach;

import com.badminton.dto.coach.CoachDtos.ChatRequest;
import com.badminton.dto.coach.CoachDtos.History;
import com.badminton.dto.coach.CoachDtos.MatchOptions;
import com.badminton.dto.coach.CoachDtos.SessionList;
import com.badminton.service.coach.CoachChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

/**
 * The AI Coach chatbot. Open to guests (identified by a browser_key) and signed-in users (by their JWT); what the
 * coach may read about matches follows the same access rules as the rest of the API.
 */
@RestController
@RequestMapping("/api/coach")
@RequiredArgsConstructor
public class CoachController {

    private final CoachChatService coachChatService;

    /** Streams the answer as server-sent events: {text, done}, the last one with session_id and video_citations. */
    @PostMapping(value = "/chat/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
    public SseEmitter chatStream(@Valid @RequestBody ChatRequest request, Authentication auth) {
        return coachChatService.streamAnswer(request, coachChatService.caller(auth));
    }

    @GetMapping("/sessions")
    public ResponseEntity<SessionList> sessions(
            @RequestParam(name = "browser_key", required = false) String browserKey,
            @RequestParam(name = "match_id", required = false) Long matchId,
            Authentication auth) {
        return ResponseEntity.ok(coachChatService.sessions(browserKey, matchId, coachChatService.caller(auth)));
    }

    @GetMapping("/sessions/{sessionId}/messages")
    public ResponseEntity<History> history(
            @PathVariable String sessionId,
            @RequestParam(name = "browser_key", required = false) String browserKey,
            Authentication auth) {
        return ResponseEntity.ok(coachChatService.history(sessionId, browserKey, coachChatService.caller(auth)));
    }

    /** Matches the caller may pick in the "compare two matches" dialog. */
    @GetMapping("/matches")
    public ResponseEntity<MatchOptions> matches(Authentication auth) {
        return ResponseEntity.ok(coachChatService.matchOptions(coachChatService.caller(auth)));
    }
}
