package com.badminton.controller;

import com.badminton.dto.auth.AuthResponse;
import com.badminton.dto.auth.LoginRequest;
import com.badminton.dto.auth.RegisterRequest;
import com.badminton.dto.auth.UserResponse;
import com.badminton.service.AuthService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;

    @PostMapping("/register")
    public ResponseEntity<UserResponse> register(@Valid @RequestBody RegisterRequest request) {
        UserResponse response = authService.register(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(response);
    }

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@Valid @RequestBody LoginRequest request) {
        AuthResponse response = authService.login(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/refresh-token")
    public ResponseEntity<com.badminton.dto.auth.TokenResponse> refreshToken(
            @Valid @RequestBody com.badminton.dto.auth.RefreshTokenRequest request
    ) {
        com.badminton.dto.auth.TokenResponse response = authService.refreshToken(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/logout")
    public ResponseEntity<com.badminton.common.dto.MessageResponse> logout(
            @Valid @RequestBody com.badminton.dto.auth.RefreshTokenRequest request
    ) {
        com.badminton.common.dto.MessageResponse response = authService.logout(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/forgot-password")
    public ResponseEntity<com.badminton.common.dto.MessageResponse> forgotPassword(
            @Valid @RequestBody com.badminton.dto.auth.ForgotPasswordRequest request
    ) {
        com.badminton.common.dto.MessageResponse response = authService.forgotPassword(request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/reset-password")
    public ResponseEntity<com.badminton.common.dto.MessageResponse> resetPassword(
            @Valid @RequestBody com.badminton.dto.auth.ResetPasswordRequest request
    ) {
        com.badminton.common.dto.MessageResponse response = authService.resetPassword(request);
        return ResponseEntity.ok(response);
    }
}
