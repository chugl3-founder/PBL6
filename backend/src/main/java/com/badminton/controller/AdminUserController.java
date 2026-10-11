package com.badminton.controller;

import com.badminton.dto.admin.PagedUserResponse;
import com.badminton.dto.admin.UpdateUserStatusRequest;
import com.badminton.dto.auth.UserResponse;
import com.badminton.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping({"/api/admin/users", "/api/v1/admin/users"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminUserController {

    private final UserService userService;

    @GetMapping
    public ResponseEntity<PagedUserResponse> getAllUsers(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size
    ) {
        PagedUserResponse response = userService.getAllUsersForAdmin(search, status, page, size);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        UserResponse response = userService.getUserByIdForAdmin(id);
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}/status")
    public ResponseEntity<UserResponse> updateUserStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateUserStatusRequest request,
            Authentication authentication
    ) {
        String adminEmail = authentication != null ? authentication.getName() : "";
        UserResponse response = userService.updateUserStatusForAdmin(id, request.getStatus(), adminEmail);
        return ResponseEntity.ok(response);
    }
}

