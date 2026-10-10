package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "match_statistics")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class MatchStatistic {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false, unique = true)
    private AiAnalysis analysis;

    @Column(name = "total_strokes", nullable = false)
    @Builder.Default
    private Integer totalStrokes = 0;

    @Column(name = "total_rallies", nullable = false)
    @Builder.Default
    private Integer totalRallies = 0;

    @Column(name = "avg_strokes_per_rally", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal avgStrokesPerRally = BigDecimal.ZERO;

    @Column(name = "avg_rally_duration", nullable = false, precision = 6, scale = 2)
    @Builder.Default
    private BigDecimal avgRallyDuration = BigDecimal.ZERO;

    @Column(name = "player_a_strokes", nullable = false)
    @Builder.Default
    private Integer playerAStrokes = 0;

    @Column(name = "player_b_strokes", nullable = false)
    @Builder.Default
    private Integer playerBStrokes = 0;

    @Column(name = "forehand_count", nullable = false)
    @Builder.Default
    private Integer forehandCount = 0;

    @Column(name = "backhand_count", nullable = false)
    @Builder.Default
    private Integer backhandCount = 0;

    @Column(name = "aroundhead_count", nullable = false)
    @Builder.Default
    private Integer aroundheadCount = 0;

    @Column(name = "unknown_side_count", nullable = false)
    @Builder.Default
    private Integer unknownSideCount = 0;

    @Column(name = "avg_confidence", nullable = false, precision = 4, scale = 3)
    @Builder.Default
    private BigDecimal avgConfidence = BigDecimal.ZERO;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

