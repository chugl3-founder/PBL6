package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.OffsetDateTime;

@Entity
@Table(name = "player_analysis_profiles")
@Getter @Setter @NoArgsConstructor @AllArgsConstructor @Builder
public class PlayerAnalysisProfile {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private AiAnalysis analysis;
    @Column(name = "player_side", nullable = false, length = 20)
    private String playerSide;
    @Column(name = "player_name", length = 100)
    private String playerName;
    @Column(name = "total_shots", nullable = false)
    private Integer totalShots;
    @Column(name = "playstyle_label", length = 100)
    private String playstyleLabel;
    @Column(name = "playstyle_description", columnDefinition = "TEXT")
    private String playstyleDescription;
    @Column(name = "attack_score") private Integer attackScore;
    @Column(name = "defense_score") private Integer defenseScore;
    @Column(name = "net_control_score") private Integer netControlScore;
    @Column(name = "shot_variety_score") private Integer shotVarietyScore;
    @Column(name = "consistency_score") private Integer consistencyScore;
    @Column(name = "pace_score") private Integer paceScore;
    @CreationTimestamp @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
    @UpdateTimestamp @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
