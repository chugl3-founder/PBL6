package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "ai_events")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class AiEvent {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private AiAnalysis analysis;

    @Column(name = "event_order", nullable = false)
    private Integer eventOrder;

    @Column(name = "start_frame", nullable = false)
    private Integer startFrame;

    @Column(name = "hit_frame", nullable = false)
    private Integer hitFrame;

    @Column(name = "end_frame", nullable = false)
    private Integer endFrame;

    @Column(name = "time_seconds", nullable = false, precision = 10, scale = 3)
    private BigDecimal timeSeconds;

    @Column(name = "player_side", nullable = false, length = 20)
    private String playerSide; // UPPER, LOWER

    @Column(nullable = false, length = 50)
    private String stroke; // SERVE, SMASH, CLEAR, DROP, LIFT, DRIVE, NET_SHOT, NET_ATTACK, PUSH, UNKNOWN

    @Column(name = "stroke_side", nullable = false, length = 30)
    @Builder.Default
    private String strokeSide = "UNKNOWN"; // FOREHAND, BACKHAND, AROUNDHEAD, UNKNOWN

    @Column(nullable = false, precision = 4, scale = 3)
    private BigDecimal confidence;

    // Các trường nâng cao từ CoachAI+ 2.0
    @Column(name = "refined_frame")
    private Integer refinedFrame;

    @Column(name = "contact_offset")
    private Integer contactOffset;

    @Column(name = "hit_score", precision = 5, scale = 4)
    private BigDecimal hitScore;

    @Column(name = "ball_round")
    private Integer ballRound;

    @Column(name = "gap_from_previous_hit_seconds", precision = 8, scale = 3)
    private BigDecimal gapFromPreviousHitSeconds;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "top2", columnDefinition = "jsonb")
    private String top2;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "crop_box", columnDefinition = "jsonb")
    private String cropBox;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "player_position_court", columnDefinition = "jsonb")
    private String playerPositionCourt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "opponent_position_court", columnDefinition = "jsonb")
    private String opponentPositionCourt;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "contact_shuttle_projection_court", columnDefinition = "jsonb")
    private String contactShuttleProjectionCourt;

    @Column(name = "contact_height_image_ratio", precision = 6, scale = 4)
    private BigDecimal contactHeightImageRatio;

    @Column(name = "hitting_area_3x3")
    private Integer hittingArea3x3;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "landing_position_court_proxy", columnDefinition = "jsonb")
    private String landingPositionCourtProxy;

    @Column(name = "landing_area_3x3_proxy")
    private Integer landingArea3x3Proxy;

    @Column(name = "landing_proxy_frame")
    private Integer landingProxyFrame;

    @Column(name = "landing_proxy_confidence", precision = 5, scale = 4)
    private BigDecimal landingProxyConfidence;

    @Column(name = "landing_is_proxy")
    @Builder.Default
    private Boolean landingIsProxy = true;

    @Column(name = "flight_time_to_next_hit_seconds", precision = 8, scale = 3)
    private BigDecimal flightTimeToNextHitSeconds;

    @Column(name = "average_shuttle_speed_image_per_second", precision = 8, scale = 3)
    private BigDecimal averageShuttleSpeedImagePerSecond;

    @Column(name = "average_wrist_speed_image_per_second", precision = 8, scale = 3)
    private BigDecimal averageWristSpeedImagePerSecond;

    @Column(name = "shuttle_visibility_ratio", precision = 5, scale = 4)
    private BigDecimal shuttleVisibilityRatio;

    @Column(name = "attack_state_rule", length = 50)
    private String attackStateRule;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

