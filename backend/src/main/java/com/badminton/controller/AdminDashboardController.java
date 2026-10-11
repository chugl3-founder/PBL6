package com.badminton.controller;

import com.badminton.dto.admin.AdminDashboardResponse;
import com.badminton.service.AdminDashboardService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping({"/api/admin/dashboard", "/api/v1/admin/dashboard"})
@RequiredArgsConstructor
@PreAuthorize("hasRole('ADMIN')")
public class AdminDashboardController {

    private final AdminDashboardService adminDashboardService;

    @GetMapping
    public ResponseEntity<AdminDashboardResponse> getDashboardMetrics() {
        AdminDashboardResponse response = adminDashboardService.getDashboardMetrics();
        return ResponseEntity.ok(response);
    }
}

