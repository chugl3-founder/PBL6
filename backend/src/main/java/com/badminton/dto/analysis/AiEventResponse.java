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
public class AiEventResponse {
    private Long id;
    private Integer eventOrder;
    private Integer startFrame;
    private Integer hitFrame;
    private Integer endFrame;
    private BigDecimal timeSeconds;
    private String playerSide; // UPPER, LOWER
    private String stroke; // SERVE, SMASH, CLEAR, DROP, LIFT, DRIVE, NET_SHOT, NET_ATTACK, PUSH, UNKNOWN
    private String strokeSide; // FOREHAND, BACKHAND, AROUNDHEAD, UNKNOWN
    private BigDecimal confidence;
    private Integer refinedFrame;
    private Integer contactOffset;
    private BigDecimal hitScore;
    private Integer ballRound;
    private BigDecimal gapFromPreviousHitSeconds;
    private List<String> top2;
    private List<Integer> cropBox;
    private List<Double> playerPositionCourt; // [x, y] normalized 0..1
    private List<Double> opponentPositionCourt; // [x, y] normalized 0..1
    private List<Double> contactShuttleProjectionCourt; // [x, y] normalized 0..1
    private BigDecimal contactHeightImageRatio;
    private Integer hittingArea3x3;
    private List<Double> landingPositionCourtProxy; // [x, y] normalized 0..1
    private Integer landingArea3x3Proxy;
    private Integer landingProxyFrame;
    private BigDecimal landingProxyConfidence;
    private Boolean landingIsProxy;
    private BigDecimal flightTimeToNextHitSeconds;
    private BigDecimal averageShuttleSpeedImagePerSecond;
    private BigDecimal averageWristSpeedImagePerSecond;
    private BigDecimal shuttleVisibilityRatio;
    private String attackStateRule;
}
