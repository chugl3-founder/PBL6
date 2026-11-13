package com.badminton.dto.match;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResponse {
    private Long id;
    private Long ownerId;
    private String ownerEmail;
    private String playerAName;
    private String playerBName;
    private String upperPlayer;
    private String lowerPlayer;
    private LocalDate matchDate;
    private Integer startGame;
    private Integer startScoreA;
    private Integer startScoreB;
    private String title;
    private String description;
    private String source;
    private String status;
    private String thumbnailUrl;
    private String youtubeVideoId;
    private BigDecimal durationSeconds;
    private Integer totalStrokes;
    private Integer totalRallies;
    /** Per-player game scores and winner, from the analysed rallies; null before analysis. */
    private MatchResult result;
    private OffsetDateTime deletedAt;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}
