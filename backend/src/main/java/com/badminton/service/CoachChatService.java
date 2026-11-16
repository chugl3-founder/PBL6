package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.coach.CoachDtos.ChatRequest;
import com.badminton.dto.coach.CoachDtos.History;
import com.badminton.dto.coach.CoachDtos.MatchOption;
import com.badminton.dto.coach.CoachDtos.MatchOptions;
import com.badminton.dto.coach.CoachDtos.MessageItem;
import com.badminton.dto.coach.CoachDtos.SessionItem;
import com.badminton.dto.coach.CoachDtos.SessionList;
import com.badminton.dto.coach.CoachDtos.VideoCitation;
import com.badminton.dto.match.MatchResult;
import com.badminton.entity.ChatMessage;
import com.badminton.entity.ChatSession;
import com.badminton.entity.Match;
import com.badminton.repository.ChatMessageRepository;
import com.badminton.repository.ChatSessionRepository;
import com.badminton.repository.CoachQueryRepository;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.UserRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

import java.io.IOException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.Executor;
import java.util.concurrent.atomic.AtomicBoolean;
import java.util.function.Function;
import java.util.stream.Collectors;

/**
 * Conversations with the AI Coach: who owns a session, its history, saving answers, and streaming an answer to
 * the browser as server-sent events. A session belongs to a signed-in user or, for a guest, to one browser key.
 */
@Slf4j
@Service
public class CoachChatService {

    /** Earlier messages sent back to the model so it follows the conversation. */
    private static final int HISTORY_MESSAGES = 10;
    private static final int SESSIONS_LISTED = 20;
    private static final int MATCH_OPTIONS = 50;
    private static final long STREAM_TIMEOUT_MS = 180_000;

    static final String UNAVAILABLE_MESSAGE =
            "Xin lỗi, Huấn luyện viên AI đang bận hoặc mất kết nối. Bạn vui lòng thử lại sau ít phút nhé.";

    private final CoachService coachService;
    private final ChatSessionRepository sessionRepository;
    private final ChatMessageRepository messageRepository;
    private final CoachQueryRepository coachQueryRepository;
    private final MatchRepository matchRepository;
    private final MatchResultService matchResultService;
    private final UserRepository userRepository;
    private final ObjectMapper objectMapper;
    private final Executor coachExecutor;

    public CoachChatService(CoachService coachService, ChatSessionRepository sessionRepository,
                            ChatMessageRepository messageRepository, CoachQueryRepository coachQueryRepository,
                            MatchRepository matchRepository, MatchResultService matchResultService,
                            UserRepository userRepository, ObjectMapper objectMapper,
                            @Qualifier("coachExecutor") Executor coachExecutor) {
        this.coachService = coachService;
        this.sessionRepository = sessionRepository;
        this.messageRepository = messageRepository;
        this.coachQueryRepository = coachQueryRepository;
        this.matchRepository = matchRepository;
        this.matchResultService = matchResultService;
        this.userRepository = userRepository;
        this.objectMapper = objectMapper;
        this.coachExecutor = coachExecutor;
    }

    /** The caller from the JWT set by JwtAuthenticationFilter; anyone else is a guest. */
    public CoachCaller caller(Authentication auth) {
        if (!(auth instanceof UsernamePasswordAuthenticationToken) || !(auth.getPrincipal() instanceof String email)) {
            return CoachCaller.GUEST;
        }
        return userRepository.findByEmail(email)
                .map(u -> new CoachCaller(email, u.getId(), "ROLE_ADMIN".equals(u.getRole())))
                .orElse(CoachCaller.GUEST);
    }

    /**
     * Opens the conversation (a new one when no session id is given) and streams the answer. Each event is
     * {text, done}; the last one has done=true with session_id, video_citations and error.
     */
    public SseEmitter streamAnswer(ChatRequest req, CoachCaller caller) {
        String question = req.message().trim();
        ChatSession session = openSession(req, caller, question);
        Long matchId = req.matchId() != null ? req.matchId() : session.getMatchId();
        List<ChatMessage> history = recentHistory(session.getId());

        SseEmitter emitter = new SseEmitter(STREAM_TIMEOUT_MS);
        coachExecutor.execute(() -> {
            StringBuilder answer = new StringBuilder();
            AtomicBoolean clientGone = new AtomicBoolean(false);
            boolean failed = false;
            try {
                coachService.answer(question, matchId, history, caller, text -> {
                    answer.append(text);
                    if (!send(emitter, Map.of("text", text, "done", false))) {
                        clientGone.set(true);
                        throw new IllegalStateException("The browser closed the stream");
                    }
                });
            } catch (Exception e) {
                if (clientGone.get()) {
                    log.info("Coach stream closed by the browser (session {})", session.getId());
                    return;
                }
                failed = true;
                log.error("Coach answer failed (session {}): {}", session.getId(), e.getMessage());
                String sep = answer.length() > 0 ? "\n\n" : "";
                trySend(emitter, Map.of("text", sep + UNAVAILABLE_MESSAGE, "done", false));
            }
            List<VideoCitation> citations = CoachService.extractCitations(answer.toString());
            if (!failed) {
                try {
                    saveTurn(session.getId(), question, answer.toString(), citations);
                } catch (Exception e) {
                    log.error("Could not save the coach answer (session {})", session.getId(), e);
                }
            }
            Map<String, Object> last = new LinkedHashMap<>();
            last.put("text", "");
            last.put("done", true);
            last.put("error", failed);
            last.put("session_id", session.getId().toString());
            last.put("video_citations", citations);
            trySend(emitter, last);
            emitter.complete();
        });
        return emitter;
    }

    @Transactional(readOnly = true)
    public History history(String sessionId, String browserKey, CoachCaller caller) {
        if (!caller.signedIn() && !StringUtils.hasText(browserKey)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, ErrorType.VALIDATION,
                    "ERR_UNAUTHORIZED", "Thiếu thông tin xác thực (token hoặc browser_key).");
        }
        ChatSession session = ownedSession(sessionId, browserKey, caller);
        List<MessageItem> messages = messageRepository.findBySessionIdOrderByCreatedAtAsc(session.getId()).stream()
                .map(m -> new MessageItem(m.getId().toString(), m.getSenderRole(), m.getContent(),
                        readCitations(m.getVideoCitations()), m.getCreatedAt()))
                .toList();
        return new History(session.getId().toString(), messages);
    }

    @Transactional(readOnly = true)
    public SessionList sessions(String browserKey, Long matchId, CoachCaller caller) {
        PageRequest page = PageRequest.of(0, SESSIONS_LISTED);
        List<ChatSession> sessions;
        if (caller.signedIn()) {
            sessions = sessionRepository.findOfUser(caller.userId(), matchId, page);
        } else if (StringUtils.hasText(browserKey)) {
            sessions = sessionRepository.findOfGuest(browserKey, matchId, page);
        } else {
            sessions = List.of();
        }
        return new SessionList(sessions.stream()
                .map(s -> new SessionItem(s.getId().toString(), s.getUserId(), s.getMatchId(), s.getTitle(), s.getCreatedAt()))
                .toList());
    }

    /** Analysed matches the caller may compare, with the games seen in each video. */
    @Transactional(readOnly = true)
    public MatchOptions matchOptions(CoachCaller caller) {
        List<CoachQueryRepository.MatchCard> cards =
                coachQueryRepository.visibleAnalysedMatches(caller.userId(), caller.admin(), MATCH_OPTIONS);
        Map<Long, Match> matches = matchRepository.findAllById(cards.stream().map(CoachQueryRepository.MatchCard::id).toList())
                .stream().collect(Collectors.toMap(Match::getId, Function.identity()));
        Map<Long, MatchResult> results = matchResultService.resultsFor(new ArrayList<>(matches.values()));
        return new MatchOptions(cards.stream().map(c -> {
            MatchResult r = results.get(c.id());
            String score = r == null || r.games().isEmpty() ? "-" : r.games().stream()
                    .map(g -> g.scoreA() + "-" + g.scoreB()).collect(Collectors.joining(", "));
            return new MatchOption(c.id(), c.title(), c.playerAName(), c.playerBName(), score,
                    c.totalStrokes() == null ? 0 : c.totalStrokes());
        }).toList());
    }

    // ---------------------------------------------------------------- sessions

    private ChatSession openSession(ChatRequest req, CoachCaller caller, String question) {
        if (!StringUtils.hasText(req.sessionId())) {
            if (!caller.signedIn() && !StringUtils.hasText(req.browserKey())) {
                throw ApiException.badRequest("ERR_BROWSER_KEY_REQUIRED", "Khách cần gửi browser_key để lưu cuộc trò chuyện.");
            }
            return sessionRepository.save(ChatSession.builder()
                    .id(UUID.randomUUID())
                    .userId(caller.userId())
                    .matchId(req.matchId())
                    .title(question.length() > 50 ? question.substring(0, 50) + "..." : question)
                    .browserKey(caller.signedIn() ? null : req.browserKey())
                    .build());
        }
        return ownedSession(req.sessionId(), req.browserKey(), caller);
    }

    /** Only the user who started the conversation, or the guest browser that did, may use it. */
    private ChatSession ownedSession(String sessionId, String browserKey, CoachCaller caller) {
        UUID id;
        try {
            id = UUID.fromString(sessionId);
        } catch (IllegalArgumentException e) {
            throw ApiException.notFound("ERR_CHAT_SESSION_NOT_FOUND", "Phiên trò chuyện không tồn tại.");
        }
        ChatSession session = sessionRepository.findById(id)
                .orElseThrow(() -> ApiException.notFound("ERR_CHAT_SESSION_NOT_FOUND", "Phiên trò chuyện không tồn tại."));
        boolean owner = session.getUserId() != null
                ? caller.signedIn() && session.getUserId().equals(caller.userId())
                : StringUtils.hasText(browserKey) && browserKey.equals(session.getBrowserKey());
        if (!owner) {
            throw ApiException.forbidden("Bạn không có quyền truy cập phiên trò chuyện riêng tư này.");
        }
        return session;
    }

    private List<ChatMessage> recentHistory(UUID sessionId) {
        List<ChatMessage> latest = new ArrayList<>(
                messageRepository.findBySessionIdOrderByCreatedAtDesc(sessionId, PageRequest.of(0, HISTORY_MESSAGES)));
        java.util.Collections.reverse(latest);
        return latest;
    }

    /** Question and answer are saved only when the AI answered: a failure never becomes a bot message. */
    private void saveTurn(UUID sessionId, String question, String answer, List<VideoCitation> citations) throws IOException {
        messageRepository.save(ChatMessage.builder().sessionId(sessionId).senderRole(ChatMessage.ROLE_USER)
                .content(question).videoCitations("[]").build());
        messageRepository.save(ChatMessage.builder().sessionId(sessionId).senderRole(ChatMessage.ROLE_ASSISTANT)
                .content(answer).videoCitations(objectMapper.writeValueAsString(citations)).build());
    }

    private List<VideoCitation> readCitations(String json) {
        if (!StringUtils.hasText(json)) {
            return List.of();
        }
        try {
            return objectMapper.readValue(json, new TypeReference<List<VideoCitation>>() { });
        } catch (IOException e) {
            return List.of();
        }
    }

    // ---------------------------------------------------------------- SSE

    /** False when the browser has closed the stream. */
    private static boolean send(SseEmitter emitter, Object data) {
        try {
            emitter.send(SseEmitter.event().data(data, MediaType.APPLICATION_JSON));
            return true;
        } catch (IOException | IllegalStateException e) {
            return false;
        }
    }

    private static void trySend(SseEmitter emitter, Object data) {
        send(emitter, data);
    }
}
