package com.badminton.service;

import com.badminton.common.dto.ErrorType;
import com.badminton.common.exception.ApiException;
import com.badminton.config.JwtTokenProvider;
import com.badminton.dto.auth.AuthResponse;
import com.badminton.dto.auth.LoginRequest;
import com.badminton.dto.auth.RegisterRequest;
import com.badminton.dto.auth.UserResponse;
import com.badminton.entity.RefreshToken;
import com.badminton.entity.User;
import com.badminton.repository.RefreshTokenRepository;
import com.badminton.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.time.OffsetDateTime;
import java.util.Base64;

@Slf4j
@Service
@RequiredArgsConstructor
public class AuthService {

    private final UserRepository userRepository;
    private final RefreshTokenRepository refreshTokenRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtTokenProvider jwtTokenProvider;

    @Transactional
    public UserResponse register(RegisterRequest request) {
        // 1. Kiểm tra email đã tồn tại chưa
        if (userRepository.existsByEmail(request.getEmail().trim().toLowerCase())) {
            log.warn("Đăng ký thất bại: Email {} đã tồn tại trên hệ thống", request.getEmail());
            throw new ApiException(
                    HttpStatus.CONFLICT,
                    ErrorType.VALIDATION,
                    "AUTH_EMAIL_ALREADY_EXISTS",
                    "Email này đã được sử dụng. Vui lòng chọn email khác hoặc đăng nhập."
            );
        }

        // 2. Mã hóa mật khẩu bằng BCrypt
        String encodedPassword = passwordEncoder.encode(request.getPassword());

        // 3. Khởi tạo User mới với trạng thái ACTIVE và vai trò ROLE_USER
        User newUser = User.builder()
                .email(request.getEmail().trim().toLowerCase())
                .passwordHash(encodedPassword)
                .fullName(request.getFullName().trim())
                .role("ROLE_USER")
                .status("ACTIVE")
                .age(request.getAge())
                .gender(request.getGender())
                .badmintonLevel(request.getBadmintonLevel())
                .build();

        User savedUser = userRepository.save(newUser);
        log.info("Đăng ký thành công người dùng mới: id={}, email={}", savedUser.getId(), savedUser.getEmail());

        return mapToUserResponse(savedUser);
    }

    @Transactional
    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        // 1. Tìm User theo Email
        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Đăng nhập thất bại: Không tìm thấy email {}", email);
                    return new ApiException(
                            HttpStatus.UNAUTHORIZED,
                            ErrorType.VALIDATION,
                            "AUTH_INVALID_CREDENTIALS",
                            "Email hoặc mật khẩu không chính xác."
                    );
                });

        // 2. Kiểm tra mật khẩu
        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            log.warn("Đăng nhập thất bại: Mật khẩu sai cho email {}", email);
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    ErrorType.VALIDATION,
                    "AUTH_INVALID_CREDENTIALS",
                    "Email hoặc mật khẩu không chính xác."
            );
        }

        // 3. Kiểm tra trạng thái tài khoản
        if ("LOCKED".equalsIgnoreCase(user.getStatus())) {
            log.warn("Đăng nhập thất bại: Tài khoản {} đã bị khóa", email);
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    ErrorType.SYSTEM,
                    "AUTH_ACCOUNT_LOCKED",
                    "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
            );
        }

        // 4. Sinh Access Token (15 phút)
        String accessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole());

        // 5. Sinh Refresh Token (7 ngày) và lưu hash vào cơ sở dữ liệu
        String rawRefreshToken = jwtTokenProvider.generateRefreshToken();
        String hashedRefreshToken = hashToken(rawRefreshToken);

        // Thu hồi các refresh token cũ của user
        refreshTokenRepository.revokeAllByUserId(user.getId());

        RefreshToken refreshTokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(hashedRefreshToken)
                .expiresAt(OffsetDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(refreshTokenEntity);

        log.info("Đăng nhập thành công: userId={}, email={}", user.getId(), user.getEmail());

        return AuthResponse.builder()
                .accessToken(accessToken)
                .refreshToken(rawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpirationInSeconds())
                .user(mapToUserResponse(user))
                .build();
    }

    private String hashToken(String token) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] hash = digest.digest(token.getBytes(StandardCharsets.UTF_8));
            return Base64.getEncoder().encodeToString(hash);
        } catch (NoSuchAlgorithmException e) {
            throw new RuntimeException("Thuật toán băm SHA-256 không khả dụng", e);
        }
    }

    public UserResponse mapToUserResponse(User user) {
        return UserResponse.builder()
                .id(user.getId())
                .email(user.getEmail())
                .role(user.getRole())
                .fullName(user.getFullName())
                .avatarUrl(user.getAvatarUrl())
                .age(user.getAge())
                .gender(user.getGender())
                .badmintonLevel(user.getBadmintonLevel())
                .status(user.getStatus())
                .createdAt(user.getCreatedAt())
                .build();
    }
}
