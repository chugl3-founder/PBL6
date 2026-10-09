package com.badminton.entity;

import jakarta.persistence.*;
import lombok.*;
import org.hibernate.annotations.CreationTimestamp;
import org.hibernate.annotations.UpdateTimestamp;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Entity
@Table(name = "matches")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class Match {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "owner_id", nullable = false)
    private User owner;

    @Column(name = "player_a_name", nullable = false, length = 100)
    private String playerAName;

    @Column(name = "player_b_name", nullable = false, length = 100)
    private String playerBName;

    @Column(name = "upper_player", nullable = false, length = 20)
    @Builder.Default
    private String upperPlayer = "PLAYER_A"; // PLAYER_A, PLAYER_B

    @Column(name = "lower_player", nullable = false, length = 20)
    @Builder.Default
    private String lowerPlayer = "PLAYER_B"; // PLAYER_A, PLAYER_B

    @Column(name = "match_date", nullable = false)
    @Builder.Default
    private LocalDate matchDate = LocalDate.now();

    @Column(length = 200)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String source = "USER_UPLOAD"; // USER_UPLOAD, ADMIN_CURATED

    @Column(nullable = false, length = 20)
    @Builder.Default
    private String status = "DRAFT"; // DRAFT, READY, ANALYZING, ANALYZED, PUBLISHED

    @Column(name = "deleted_at")
    private OffsetDateTime deletedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private OffsetDateTime createdAt;

    @UpdateTimestamp
    @Column(name = "updated_at", nullable = false)
    private OffsetDateTime updatedAt;
}

