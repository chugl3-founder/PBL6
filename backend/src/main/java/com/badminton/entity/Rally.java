package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.type.SqlTypes;

import java.math.BigDecimal;
import java.time.OffsetDateTime;

@Entity
@Table(name = "rallies")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Rally {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "match_id", nullable = false)
    private Match match;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "analysis_id", nullable = false)
    private AiAnalysis analysis;

    @Column(name = "rally_number", nullable = false)
    private Integer rallyNumber;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "start_event_id", nullable = false)
    private AiEvent startEvent;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "end_event_id", nullable = false)
    private AiEvent endEvent;

    @Column(name = "start_time", nullable = false, precision = 10, scale = 3)
    private BigDecimal startTime;

    @Column(name = "end_time", nullable = false, precision = 10, scale = 3)
    private BigDecimal endTime;

    @Column(nullable = false, precision = 10, scale = 3)
    private BigDecimal duration;

    @Column(name = "total_strokes", nullable = false)
    private Integer totalStrokes;

    @Column(name = "boundary_type", nullable = false, length = 30)
    @Builder.Default
    private String boundaryType = "TIME_GAP"; // TIME_GAP, SHUTTLE_DEAD, SERVICE_DETECTED

    // Các trường phân tích rally từ CoachAI+ 2.0
    @Column(name = "server_side", length = 20)
    private String serverSide; // UPPER, LOWER, UNKNOWN

    @Column(name = "winner_side", length = 20)
    private String winnerSide; // UPPER, LOWER, UNKNOWN

    @Column(name = "win_reason", length = 100)
    private String winReason;

    @Column(name = "score_upper")
    @Builder.Default
    private Integer scoreUpper = 0;

    @Column(name = "score_lower")
    @Builder.Default
    private Integer scoreLower = 0;

    @Column(name = "score_text", length = 50)
    private String scoreText;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "stroke_sequence", columnDefinition = "jsonb")
    private String strokeSequence;

    @Column(name = "is_complete")
    @Builder.Default
    private Boolean isComplete = true;

    @Column(name = "partial_start")
    @Builder.Default
    private Boolean partialStart = false;

    @Column(name = "partial_end")
    @Builder.Default
    private Boolean partialEnd = false;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;
}

