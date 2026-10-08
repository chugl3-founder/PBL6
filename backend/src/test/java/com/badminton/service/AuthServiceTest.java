package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.dto.auth.RegisterRequest;
import com.badminton.dto.auth.UserResponse;
import com.badminton.entity.User;
import com.badminton.repository.UserRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class AuthServiceTest {

    @Mock
    private UserRepository userRepository;

    @Mock
    private PasswordEncoder passwordEncoder;

    @InjectMocks
    private AuthService authService;

    private RegisterRequest validRequest;

    @BeforeEach
    void setUp() {
        validRequest = RegisterRequest.builder()
                .email("player@badminton.vn")
                .password("rawPassword123")
                .fullName("Nguyễn Tiến Minh")
                .badmintonLevel("PRO")
                .gender("MALE")
                .build();
    }

    @Test
    @DisplayName("Đăng ký thành công: Mật khẩu được mã hóa, User được lưu với vai trò ROLE_USER")
    void register_Success() {
        // Given
        when(userRepository.existsByEmail("player@badminton.vn")).thenReturn(false);
        when(passwordEncoder.encode("rawPassword123")).thenReturn("hashed_password_xyz");
        
        User savedUser = User.builder()
                .id(10L)
                .email("player@badminton.vn")
                .passwordHash("hashed_password_xyz")
                .fullName("Nguyễn Tiến Minh")
                .role("ROLE_USER")
                .status("ACTIVE")
                .badmintonLevel("PRO")
                .gender("MALE")
                .build();
        when(userRepository.save(any(User.class))).thenReturn(savedUser);

        // When
        UserResponse response = authService.register(validRequest);

        // Then
        assertNotNull(response);
        assertEquals(10L, response.getId());
        assertEquals("player@badminton.vn", response.getEmail());
        assertEquals("ROLE_USER", response.getRole());
        assertEquals("ACTIVE", response.getStatus());
        assertEquals("PRO", response.getBadmintonLevel());

        verify(passwordEncoder, times(1)).encode("rawPassword123");
        verify(userRepository, times(1)).save(any(User.class));
    }

    @Test
    @DisplayName("Đăng ký thất bại: Trùng email ném ra ApiException với HTTP 409 Conflict")
    void register_DuplicateEmail_ThrowsConflictException() {
        // Given
        when(userRepository.existsByEmail("player@badminton.vn")).thenReturn(true);

        // When & Then
        ApiException exception = assertThrows(ApiException.class, () -> authService.register(validRequest));

        assertEquals(HttpStatus.CONFLICT, exception.getStatus());
        assertEquals(ErrorType.VALIDATION, exception.getErrorType());
        assertEquals("AUTH_EMAIL_ALREADY_EXISTS", exception.getCode());

        // Đảm bảo không mã hóa mật khẩu hoặc lưu DB khi email đã trùng
        verify(passwordEncoder, never()).encode(anyString());
        verify(userRepository, never()).save(any(User.class));
    }
}

