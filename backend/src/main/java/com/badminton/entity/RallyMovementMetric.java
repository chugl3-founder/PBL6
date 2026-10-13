package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "rally_movement_metrics")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class RallyMovementMetric {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private AiAnalysis analysis;
    @Column(name = "rally_number", nullable = false)
    private Integer rallyNumber;
    @Column(name = "upper_distance_meters", precision = 10, scale = 3)
    private BigDecimal upperDistanceMeters;
    @Column(name = "lower_distance_meters", precision = 10, scale = 3)
    private BigDecimal lowerDistanceMeters;
    @Column(name = "upper_position_samples", nullable = false)
    private Integer upperPositionSamples;
    @Column(name = "lower_position_samples", nullable = false)
    private Integer lowerPositionSamples;
    @Column(name = "is_full_tracking_distance", nullable = false)
    private Boolean isFullTrackingDistance;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
