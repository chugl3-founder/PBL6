package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "tactic_detections")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class TacticDetection {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private AiAnalysis analysis;

    @Column(name = "rally_number", nullable = false)
    private Integer rallyNumber;
    @Column(name = "player_side", nullable = false, length = 20)
    private String playerSide;
    @Column(name = "player_name", length = 100)
    private String playerName;
    @Column(name = "tactic_code", nullable = false, length = 50)
    private String tacticCode;
    @Column(name = "tactic_label", nullable = false, length = 100)
    private String tacticLabel;
    @Column(name = "is_primary", nullable = false)
    private Boolean isPrimary;
    @Column(name = "start_ball_round")
    private Integer startBallRound;
    @Column(name = "end_ball_round")
    private Integer endBallRound;
    @Column(name = "shot_count", nullable = false)
    private Integer shotCount;
    @Column(name = "evidence_quality", length = 50)
    private String evidenceQuality;
    @Column(name = "confidence_calibrated", nullable = false)
    private Boolean confidenceCalibrated;
    @Column(name = "uses_landing_proxy", nullable = false)
    private Boolean usesLandingProxy;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}
