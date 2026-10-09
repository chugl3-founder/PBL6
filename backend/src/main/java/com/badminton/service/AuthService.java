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
    private final com.badminton.repository.PasswordResetRepository passwordResetRepository;
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

    @Transactional
    public com.badminton.dto.auth.TokenResponse refreshToken(com.badminton.dto.auth.RefreshTokenRequest request) {
        String rawToken = request.getRefreshToken().trim();
        String hashedToken = hashToken(rawToken);

        // 1. Tìm Refresh Token trong DB bằng hash
        RefreshToken tokenEntity = refreshTokenRepository.findByTokenHash(hashedToken)
                .orElseThrow(() -> {
                    log.warn("Làm mới token thất bại: Refresh token không tồn tại");
                    return new ApiException(
                            HttpStatus.UNAUTHORIZED,
                            ErrorType.VALIDATION,
                            "AUTH_INVALID_REFRESH_TOKEN",
                            "Refresh token không hợp lệ hoặc đã bị thu hồi."
                    );
                });

        // 2. Kiểm tra nếu token đã bị thu hồi
        if (Boolean.TRUE.equals(tokenEntity.getRevoked())) {
            log.warn("Làm mới token thất bại: Refresh token đã bị thu hồi");
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    ErrorType.VALIDATION,
                    "AUTH_REFRESH_TOKEN_REVOKED",
                    "Refresh token này đã bị thu hồi. Vui lòng đăng nhập lại."
            );
        }

        // 3. Kiểm tra nếu token đã hết hạn
        if (tokenEntity.getExpiresAt().isBefore(OffsetDateTime.now())) {
            log.warn("Làm mới token thất bại: Refresh token đã hết hạn vào lúc {}", tokenEntity.getExpiresAt());
            throw new ApiException(
                    HttpStatus.UNAUTHORIZED,
                    ErrorType.VALIDATION,
                    "AUTH_REFRESH_TOKEN_EXPIRED",
                    "Refresh token đã hết hạn. Vui lòng đăng nhập lại."
            );
        }

        User user = tokenEntity.getUser();

        // 4. Kiểm tra tài khoản user có bị khóa không
        if ("LOCKED".equalsIgnoreCase(user.getStatus())) {
            log.warn("Làm mới token thất bại: User {} đã bị khóa", user.getEmail());
            throw new ApiException(
                    HttpStatus.FORBIDDEN,
                    ErrorType.SYSTEM,
                    "AUTH_ACCOUNT_LOCKED",
                    "Tài khoản của bạn đã bị khóa. Vui lòng liên hệ quản trị viên."
            );
        }

        // 5. Cấp Access Token mới (15 phút)
        String newAccessToken = jwtTokenProvider.generateAccessToken(user.getId(), user.getEmail(), user.getRole());

        // 6. Cấp Refresh Token mới (Token Rotation an toàn)
        String newRawRefreshToken = jwtTokenProvider.generateRefreshToken();
        String newHashedRefreshToken = hashToken(newRawRefreshToken);

        // Thu hồi token cũ
        tokenEntity.setRevoked(true);
        refreshTokenRepository.save(tokenEntity);

        // Lưu token mới
        RefreshToken newTokenEntity = RefreshToken.builder()
                .user(user)
                .tokenHash(newHashedRefreshToken)
                .expiresAt(OffsetDateTime.now().plusDays(7))
                .revoked(false)
                .build();
        refreshTokenRepository.save(newTokenEntity);

        log.info("Làm mới token thành công cho user: id={}, email={}", user.getId(), user.getEmail());

        return com.badminton.dto.auth.TokenResponse.builder()
                .accessToken(newAccessToken)
                .refreshToken(newRawRefreshToken)
                .tokenType("Bearer")
                .expiresIn(jwtTokenProvider.getAccessTokenExpirationInSeconds())
                .build();
    }

    @Transactional
    public com.badminton.common.dto.MessageResponse logout(com.badminton.dto.auth.RefreshTokenRequest request) {
        String rawToken = request.getRefreshToken().trim();
        String hashedToken = hashToken(rawToken);

        // Tìm token và thu hồi (nếu tồn tại)
        refreshTokenRepository.findByTokenHash(hashedToken).ifPresent(tokenEntity -> {
            tokenEntity.setRevoked(true);
            refreshTokenRepository.save(tokenEntity);
            log.info("Đã thu hồi refresh token của user id={}", tokenEntity.getUser().getId());
        });

        return com.badminton.common.dto.MessageResponse.builder()
                .message("Đăng xuất thành công.")
                .build();
    }

    @Transactional
    public com.badminton.common.dto.MessageResponse forgotPassword(com.badminton.dto.auth.ForgotPasswordRequest request) {
        String email = request.getEmail().trim().toLowerCase();

        User user = userRepository.findByEmail(email)
                .orElseThrow(() -> {
                    log.warn("Yêu cầu quên mật khẩu thất bại: Không tìm thấy email {}", email);
                    return new ApiException(
                            HttpStatus.NOT_FOUND,
                            ErrorType.VALIDATION,
                            "ERR_USER_NOT_FOUND",
                            "Không tìm thấy tài khoản với email này."
                    );
                });

        // 1. Vô hiệu hóa các mã reset trước đó của user
        passwordResetRepository.invalidateAllByUserId(user.getId());

        // 2. Tạo token ngẫu nhiên an toàn (64 bytes Base64 URL-safe)
        String rawToken = jwtTokenProvider.generateRefreshToken();
        String hashedToken = hashToken(rawToken);

        // 3. Lưu vào bảng password_resets với thời hạn 15 phút
        com.badminton.entity.PasswordReset passwordReset = com.badminton.entity.PasswordReset.builder()
                .user(user)
                .tokenHash(hashedToken)
                .expiresAt(OffsetDateTime.now().plusMinutes(15))
                .isUsed(false)
                .build();
        passwordResetRepository.save(passwordReset);

        // Mô phỏng gửi email (In link Magic Reset ra log server)
        String resetLink = "http://localhost:5173/reset-password?token=" + rawToken;
        log.info("==========================================================================");
        log.info("MAGIC RESET PASSWORD LINK (User: {}): {}", email, resetLink);
        log.info("Token: {}", rawToken);
        log.info("==========================================================================");

        return com.badminton.common.dto.MessageResponse.builder()
                .message("Yêu cầu đặt lại mật khẩu đã được tiếp nhận. Vui lòng kiểm tra email của bạn.")
                .build();
    }

    @Transactional
    public com.badminton.common.dto.MessageResponse resetPassword(com.badminton.dto.auth.ResetPasswordRequest request) {
        String rawToken = request.getToken().trim();
        String hashedToken = hashToken(rawToken);

        com.badminton.entity.PasswordReset resetEntity = passwordResetRepository.findByTokenHash(hashedToken)
                .orElseThrow(() -> {
                    log.warn("Đặt lại mật khẩu thất bại: Token không tồn tại");
                    return new ApiException(
                            HttpStatus.BAD_REQUEST,
                            ErrorType.VALIDATION,
                            "ERR_INVALID_TOKEN",
                            "Token đặt lại mật khẩu không hợp lệ."
                    );
                });

        // Kiểm tra nếu token đã sử dụng
        if (Boolean.TRUE.equals(resetEntity.getIsUsed())) {
            log.warn("Đặt lại mật khẩu thất bại: Token đã được sử dụng");
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_TOKEN_ALREADY_USED",
                    "Token này đã được sử dụng trước đó."
            );
        }

        // Kiểm tra nếu token đã hết hạn
        if (resetEntity.getExpiresAt().isBefore(OffsetDateTime.now())) {
            log.warn("Đặt lại mật khẩu thất bại: Token đã hết hạn lúc {}", resetEntity.getExpiresAt());
            throw new ApiException(
                    HttpStatus.BAD_REQUEST,
                    ErrorType.VALIDATION,
                    "ERR_TOKEN_EXPIRED",
                    "Token đặt lại mật khẩu đã hết hạn (chỉ có hiệu lực trong 15 phút)."
            );
        }

        User user = resetEntity.getUser();

        // 1. Cập nhật mật khẩu mới (BCrypt)
        user.setPasswordHash(passwordEncoder.encode(request.getNewPassword()));
        userRepository.save(user);

        // 2. Đánh dấu token đã sử dụng
        resetEntity.setIsUsed(true);
        passwordResetRepository.save(resetEntity);

        // 3. Thu hồi toàn bộ refresh token cũ của user để đảm bảo an toàn
        refreshTokenRepository.revokeAllByUserId(user.getId());

        log.info("Đặt lại mật khẩu thành công cho user: id={}, email={}", user.getId(), user.getEmail());

        return com.badminton.common.dto.MessageResponse.builder()
                .message("Đặt lại mật khẩu thành công. Bạn có thể đăng nhập ngay bằng mật khẩu mới.")
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
