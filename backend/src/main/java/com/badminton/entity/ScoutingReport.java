package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.JdbcTypeCode;
import org.hibernate.annotations.UpdateTimestamp;
import org.hibernate.type.SqlTypes;

import java.time.OffsetDateTime;

/** A game plan against one opponent; plan_data is a JSON snapshot of the generated plan. */
@Entity
@Table(name = "scouting_reports")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScoutingReport {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(nullable = false, length = 200)
    private String title;

    @Column(name = "opponent_name", nullable = false, length = 100)
    private String opponentName;

    @Column(name = "own_player_name", length = 100)
    private String ownPlayerName;

    @Column(name = "coach_notes", columnDefinition = "TEXT")
    private String coachNotes;

    @JdbcTypeCode(SqlTypes.JSON)
    @Column(name = "plan_data", nullable = false, columnDefinition = "jsonb")
    private String planData;

    @Column(name = "share_token", length = 64, unique = true)
    private String shareToken;

    @Column(name = "generated_at", nullable = false)
    private OffsetDateTime generatedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}
