package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "videos")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Video {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false, unique = true)
    private Match match;

    @Column(name = "file_name", nullable = false, length = 255)
    private String fileName;

    @Column(name = "storage_path", nullable = false, length = 1000)
    private String storagePath;

    @Column(name = "mime_type", nullable = false, length = 100)
    @Builder.Default
    private String mimeType = "video/mp4";

    @Column(name = "file_size")
    private Long fileSize;

    @Column(name = "video_source_type", length = 20)
    @Builder.Default
    private String videoSourceType = "MINIO_UPLOAD"; // MINIO_UPLOAD, YOUTUBE

    @Column(name = "youtube_url", length = 500)
    private String youtubeUrl;

    @Column(name = "youtube_video_id", length = 50)
    private String youtubeVideoId;

    @Column(name = "duration_seconds", precision = 10, scale = 2)
    private BigDecimal durationSeconds;

    @Column
    private Integer width;

    @Column
    private Integer height;

    @Column(precision = 5, scale = 2)
    private BigDecimal fps;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "UPLOADING"; // UPLOADING, UPLOADED, READY, FAILED

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

