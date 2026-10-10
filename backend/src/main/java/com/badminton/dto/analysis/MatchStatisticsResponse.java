package com.badminton.dto.analysis;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.math.BigDecimal;
import java.util.Map;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class MatchStatisticsResponse {

    private Long id;
    private Long matchId;
    private Long analysisId;

    private Integer totalStrokes;
    private Integer totalRallies;
    private BigDecimal avgStrokesPerRally;
    private BigDecimal avgRallyDuration;

    private Integer playerAStrokes;
    private Integer playerBStrokes;

    private Integer forehandCount;
    private Integer backhandCount;
    private Integer aroundheadCount;
    private Integer unknownSideCount;

    private BigDecimal avgConfidence;

    // Phân bố chi tiết từng loại cú đánh (Smash, Clear, Drop, Serve, Net Shot, ...)
    private Map<String, Integer> strokeDistribution;

    // Dữ liệu mở rộng CoachAI+ 2.0 (JSON maps)
    private Object summaryData;
    private Object radarChart;
    private Object coachInsights;
    private Object tacticalPatterns;
}

