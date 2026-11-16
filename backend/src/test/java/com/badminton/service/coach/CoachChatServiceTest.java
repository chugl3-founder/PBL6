package com.badminton.service.coach;

import com.badminton.service.match.MatchResultService;
import com.badminton.common.exception.ApiException;
import com.badminton.entity.coach.ChatSession;
import com.badminton.repository.coach.ChatMessageRepository;
import com.badminton.repository.coach.ChatSessionRepository;
import com.badminton.repository.coach.CoachQueryRepository;
import com.badminton.repository.match.MatchRepository;
import com.badminton.repository.user.UserRepository;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class CoachChatServiceTest {

    @Mock
    private CoachService coachService;
    @Mock
    private ChatSessionRepository sessionRepository;
    @Mock
    private ChatMessageRepository messageRepository;
    @Mock
    private CoachQueryRepository coachQueryRepository;
    @Mock
    private MatchRepository matchRepository;
    @Mock
    private MatchResultService matchResultService;
    @Mock
    private UserRepository userRepository;
    private CoachChatService chats;

    private final UUID guestSession = UUID.randomUUID();
    private final UUID userSession = UUID.randomUUID();

    @BeforeEach
    void setUp() {
        chats = new CoachChatService(coachService, sessionRepository, messageRepository, coachQueryRepository,
                matchRepository, matchResultService, userRepository, new ObjectMapper(), Runnable::run);
    }

    private static int status(ApiException e) {
        return e.getStatus().value();
    }

    @Test
    void aGuestSessionOpensOnlyInTheBrowserThatStartedIt() {
        when(sessionRepository.findById(guestSession))
                .thenReturn(Optional.of(ChatSession.builder().id(guestSession).browserKey("browser-1").build()));
        when(messageRepository.findBySessionIdOrderByCreatedAtAsc(guestSession)).thenReturn(List.of());

        assertThat(chats.history(guestSession.toString(), "browser-1", CoachCaller.GUEST).messages()).isEmpty();
        assertThatThrownBy(() -> chats.history(guestSession.toString(), "browser-2", CoachCaller.GUEST))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(status(e)).isEqualTo(HttpStatus.FORBIDDEN.value()));
    }

    @Test
    void aUsersSessionIsClosedToOtherUsersAndToItsBrowserKey() {
        when(sessionRepository.findById(userSession))
                .thenReturn(Optional.of(ChatSession.builder().id(userSession).userId(1L).browserKey("browser-1").build()));

        assertThatThrownBy(() -> chats.history(userSession.toString(), null, new CoachCaller("b@x.vn", 2L, false)))
                .isInstanceOf(ApiException.class);
        // A user's conversation never opens with a browser key alone.
        assertThatThrownBy(() -> chats.history(userSession.toString(), "browser-1", CoachCaller.GUEST))
                .isInstanceOf(ApiException.class);
    }

    @Test
    void aGuestWithoutBrowserKeyIsRefused() {
        assertThatThrownBy(() -> chats.history(guestSession.toString(), null, CoachCaller.GUEST))
                .isInstanceOfSatisfying(ApiException.class, e -> assertThat(status(e)).isEqualTo(HttpStatus.UNAUTHORIZED.value()));
    }

    @Test
    void aGuestWithoutBrowserKeyListsNoSessions() {
        assertThat(chats.sessions(null, null, CoachCaller.GUEST).sessions()).isEmpty();
    }
}
