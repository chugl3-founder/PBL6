package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.common.exception.ErrorCodes;
import com.badminton.entity.Match;
import com.badminton.entity.User;
import com.badminton.repository.MatchRepository;
import com.badminton.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.never;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class MatchAccessServiceTest {

    private static final String OWNER = "owner@badminton.vn";
    private static final String OTHER = "other@badminton.vn";
    private static final String ADMIN = "admin@badminton.vn";

    @Mock
    private MatchRepository matchRepository;
    @Mock
    private UserRepository userRepository;
    @InjectMocks
    private MatchAccessService access;

    private Match match;

    @BeforeEach
    void setUp() {
        match = Match.builder().id(7L).owner(User.builder().id(1L).email(OWNER).role("ROLE_USER").build()).build();
    }

    @Test
    void ownerPassesWithoutLookingUpTheUser() {
        when(matchRepository.findWithOwnerByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(match));

        assertThat(access.requireOwnerOrAdmin(7L, "Owner@Badminton.vn")).isSameAs(match);
        assertThat(access.requireOwner(7L, OWNER)).isSameAs(match);
        verify(userRepository, never()).findByEmail(OWNER);
    }

    @Test
    void adminMayReadButIsNotTheOwner() {
        when(matchRepository.findWithOwnerByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(match));
        when(userRepository.findByEmail(ADMIN)).thenReturn(Optional.of(User.builder().email(ADMIN).role("ROLE_ADMIN").build()));

        assertThat(access.requireOwnerOrAdmin(7L, ADMIN)).isSameAs(match);
        assertForbidden(() -> access.requireOwner(7L, ADMIN));
    }

    @Test
    void anotherUserIsForbidden() {
        when(matchRepository.findWithOwnerByIdAndDeletedAtIsNull(7L)).thenReturn(Optional.of(match));
        when(userRepository.findByEmail(OTHER)).thenReturn(Optional.of(User.builder().email(OTHER).role("ROLE_USER").build()));

        assertForbidden(() -> access.requireOwnerOrAdmin(7L, OTHER));
        assertForbidden(() -> access.requireOwnerOrAdmin(7L, null));
    }

    @Test
    void missingOrDeletedMatchIsNotFound() {
        when(matchRepository.findWithOwnerByIdAndDeletedAtIsNull(8L)).thenReturn(Optional.empty());

        assertThatThrownBy(() -> access.requireOwnerOrAdmin(8L, OWNER))
                .isInstanceOfSatisfying(ApiException.class, e -> {
                    assertThat(e.getStatus()).isEqualTo(HttpStatus.NOT_FOUND);
                    assertThat(e.getCode()).isEqualTo(ErrorCodes.MATCH_NOT_FOUND);
                });
    }

    private static void assertForbidden(org.assertj.core.api.ThrowableAssert.ThrowingCallable call) {
        assertThatThrownBy(call).isInstanceOfSatisfying(ApiException.class, e -> {
            assertThat(e.getStatus()).isEqualTo(HttpStatus.FORBIDDEN);
            assertThat(e.getErrorType()).isEqualTo(ErrorType.SYSTEM);
            assertThat(e.getCode()).isEqualTo(ErrorCodes.FORBIDDEN_ACCESS);
        });
    }
}
