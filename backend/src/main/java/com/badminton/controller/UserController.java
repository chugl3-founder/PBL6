package com.badminton.controller;

import com.badminton.dto.auth.UserResponse;
import com.badminton.dto.user.AvatarResponse;
import com.badminton.dto.user.UpdateProfileRequest;
import com.badminton.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;

    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUserProfile(@AuthenticationPrincipal String email) {
        UserResponse response = userService.getCurrentUserProfile(email);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/me")
    public ResponseEntity<UserResponse> updateCurrentUserProfile(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody UpdateProfileRequest request
    ) {
        UserResponse response = userService.updateCurrentUserProfile(email, request);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/me/avatar")
    public ResponseEntity<AvatarResponse> uploadAvatar(
            @AuthenticationPrincipal String email,
            @RequestParam("avatar") MultipartFile avatar
    ) {
        AvatarResponse response = userService.uploadAvatar(email, avatar);
        return ResponseEntity.ok(response);
    }
}

