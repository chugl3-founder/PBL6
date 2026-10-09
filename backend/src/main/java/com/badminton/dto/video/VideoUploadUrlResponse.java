package com.badminton.dto.video;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoUploadUrlResponse {
    private String uploadUrl;
    private String storagePath;
    private Integer expiresInSeconds;
}

