package com.badminton.controller;

import com.badminton.dto.scouting.ScoutingReportRequest;
import com.badminton.dto.scouting.ScoutingReportResponse;
import com.badminton.service.ScoutingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/** Scouting reports of the signed-in user; the shared view by token is open to anyone with the link. */
@RestController
@RequestMapping("/api/scouting-reports")
@RequiredArgsConstructor
public class ScoutingController {

    private final ScoutingService scoutingService;

    @GetMapping
    public ResponseEntity<List<ScoutingReportResponse>> list(@AuthenticationPrincipal String email) {
        return ResponseEntity.ok(scoutingService.list(email));
    }

    @PostMapping
    public ResponseEntity<ScoutingReportResponse> create(
            @AuthenticationPrincipal String email,
            @Valid @RequestBody ScoutingReportRequest.Create request
    ) {
        return ResponseEntity.status(HttpStatus.CREATED).body(scoutingService.create(email, request));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ScoutingReportResponse> get(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return ResponseEntity.ok(scoutingService.get(email, id));
    }

    @PatchMapping("/{id}")
    public ResponseEntity<ScoutingReportResponse> update(
            @AuthenticationPrincipal String email,
            @PathVariable Long id,
            @Valid @RequestBody ScoutingReportRequest.Update request
    ) {
        return ResponseEntity.ok(scoutingService.update(email, id, request));
    }

    @PostMapping("/{id}/regenerate")
    public ResponseEntity<ScoutingReportResponse> regenerate(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return ResponseEntity.ok(scoutingService.regenerate(email, id));
    }

    @PostMapping("/{id}/share")
    public ResponseEntity<ScoutingReportResponse> share(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return ResponseEntity.ok(scoutingService.share(email, id));
    }

    @DeleteMapping("/{id}/share")
    public ResponseEntity<ScoutingReportResponse> unshare(@AuthenticationPrincipal String email, @PathVariable Long id) {
        return ResponseEntity.ok(scoutingService.unshare(email, id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> delete(@AuthenticationPrincipal String email, @PathVariable Long id) {
        scoutingService.delete(email, id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/shared/{token}")
    public ResponseEntity<ScoutingReportResponse> getShared(@PathVariable String token) {
        return ResponseEntity.ok(scoutingService.getShared(token));
    }
}
