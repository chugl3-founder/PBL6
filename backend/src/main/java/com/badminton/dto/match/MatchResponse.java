package com.badminton.dto.match;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.OffsetDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchResponse {
    private Long id;
    private Long ownerId;
    private String playerAName;
    private String playerBName;
    private String upperPlayer;
    private String lowerPlayer;
    private LocalDate matchDate;
    private String title;
    private String description;
    private String source;
    private String status;
    private OffsetDateTime createdAt;
    private OffsetDateTime updatedAt;
}

