package com.badminton.dto.video;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class VideoResponse {
    private Long id;
    private Long matchId;
    private String fileName;
    private String storagePath;
    private String videoUrl;
    private String videoSourceType;
    private String youtubeUrl;
    private String youtubeVideoId;
    private String mimeType;
    private Long fileSize;
    private BigDecimal durationSeconds;
    private Integer width;
    private Integer height;
    private BigDecimal fps;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}

