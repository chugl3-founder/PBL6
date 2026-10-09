package com.badminton.controller;

import com.badminton.dto.video.VideoCompleteRequest;
import com.badminton.dto.video.VideoResponse;
import com.badminton.dto.video.VideoUploadUrlRequest;
import com.badminton.dto.video.VideoUploadUrlResponse;
import com.badminton.service.VideoService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/matches/{id}")
@RequiredArgsConstructor
public class VideoController {

    private final VideoService videoService;

    @PostMapping("/videos/upload-url")
    public ResponseEntity<VideoUploadUrlResponse> getPresignedUploadUrl(
            @PathVariable Long id,
            @AuthenticationPrincipal String email,
            @Valid @RequestBody VideoUploadUrlRequest request
    ) {
        VideoUploadUrlResponse response = videoService.getPresignedUploadUrl(id, request, email);
        return ResponseEntity.ok(response);
    }

    @PostMapping("/videos/complete")
    public ResponseEntity<VideoResponse> completeVideoUpload(
            @PathVariable Long id,
            @AuthenticationPrincipal String email,
            @Valid @RequestBody VideoCompleteRequest request
    ) {
        VideoResponse response = videoService.completeVideoUpload(id, request, email);
        return ResponseEntity.ok(response);
    }

    @GetMapping("/video")
    public ResponseEntity<VideoResponse> getVideoMetadata(
            @PathVariable Long id,
            @AuthenticationPrincipal String email
    ) {
        VideoResponse response = videoService.getVideoByMatchId(id, email);
        return ResponseEntity.ok(response);
    }
}

