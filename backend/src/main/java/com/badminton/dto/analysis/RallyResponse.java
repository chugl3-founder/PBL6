package com.badminton.dto.analysis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class RallyResponse {
    private Long id;
    private Integer rallyNumber;
    private Long startEventId;
    private Long endEventId;
    private BigDecimal startTime;
    private BigDecimal endTime;
    private BigDecimal duration;
    private Integer totalStrokes;
    private String boundaryType;
    private String serverSide; // UPPER, LOWER
    private String winnerSide; // UPPER, LOWER
    private String winReason;
    private Integer scoreUpper;
    private Integer scoreLower;
    private String scoreText;
    private List<String> strokeSequence;
    private Boolean isComplete;
}

