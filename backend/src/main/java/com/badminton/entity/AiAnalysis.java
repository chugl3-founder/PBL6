package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

@Entity
@Table(name = "ai_analyses")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiAnalysis {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "video_id", nullable = false)
    private Video video;


    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "QUEUED"; // QUEUED, PROCESSING, COMPLETED, FAILED, UNSUPPORTED, CANCELLED

    @Column(name = "model_name", nullable = false, length = 100)
    @Builder.Default
    private String modelName = "CoachAI+";

    @Column(name = "model_version", length = 100)
    @Builder.Default
    private String modelVersion = "2.0_pbl6_coachai";

    @Column(name = "started_at")
    private OffsetDateTime startedAt;

    @Column(name = "completed_at")
    private OffsetDateTime completedAt;

    @Column(name = "error_code", length = 100)
    private String errorCode;

    @Column(name = "error_message", columnDefinition = "TEXT")
    private String errorMessage;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "court_corners", columnDefinition = "jsonb")
    private String courtCorners;

    @Column(name = "is_current", nullable = false)
    @Builder.Default
    private Boolean isCurrent = true;

    // Các trường chiến thuật & phân tích CoachAI+ 2.0
    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "summary_data", columnDefinition = "jsonb")
    private String summaryData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "reliability_data", columnDefinition = "jsonb")
    private String reliabilityData;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "tactical_patterns", columnDefinition = "jsonb")
    private String tacticalPatterns;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "structured_tactics", columnDefinition = "jsonb")
    private String structuredTactics;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "movement_analytics", columnDefinition = "jsonb")
    private String movementAnalytics;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "spatial_distribution_3x3", columnDefinition = "jsonb")
    private String spatialDistribution3x3;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "player_profiles", columnDefinition = "jsonb")
    private String playerProfiles;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "radar_chart", columnDefinition = "jsonb")
    private String radarChart;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "response_transition_matrix", columnDefinition = "jsonb")
    private String responseTransitionMatrix;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "coach_insights", columnDefinition = "jsonb")
    private String coachInsights;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "timing_seconds", columnDefinition = "jsonb")
    private String timingSeconds;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

