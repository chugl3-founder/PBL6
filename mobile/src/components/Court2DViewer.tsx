import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Svg, { Rect, Line, Circle } from 'react-native-svg';
import { AiEventData } from '../types/replay';
import { Target, Zap, Activity, Wind } from 'lucide-react-native';

interface Court2DViewerProps {
  currentEvent: AiEventData | null;
  playerAName?: string;
  playerBName?: string;
  upperPlayer?: string;
}

export const Court2DViewer: React.FC<Court2DViewerProps> = ({
  currentEvent,
  playerAName = 'Vận Động Viên A',
  playerBName = 'Vận Động Viên B',
  upperPlayer = 'PLAYER_A',
}) => {
  const upperPlayerName = upperPlayer === 'PLAYER_A' ? playerAName : playerBName;
  const lowerPlayerName = upperPlayer === 'PLAYER_A' ? playerBName : playerAName;

  // Kích thước SVG
  const svgWidth = 340;
  const svgHeight = 180;

  const courtW = 300;
  const courtH = 140;
  const offX = 20;
  const offY = 20;

  // Chuyển đổi tọa độ norm (0..1) sang SVG
  // Y norm (0..1 dọc sân) -> X của SVG
  // X norm (0..1 ngang sân) -> Y của SVG
  const toSvgX = (normY?: number) => {
    const val = normY !== undefined ? normY : 0.5;
    return offX + Math.max(0, Math.min(1, val)) * courtW;
  };

  const toSvgY = (normX?: number) => {
    const val = normX !== undefined ? normX : 0.5;
    return offY + Math.max(0, Math.min(1, val)) * courtH;
  };

  const playerPos = currentEvent?.playerPositionCourt;
  const opponentPos = currentEvent?.opponentPositionCourt;
  const shuttleLanding = currentEvent?.landingPositionCourtProxy;

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#38bdf8' }]} />
          <Text style={styles.legendText} numberOfLines={1}>
            {upperPlayerName} (Sân trên)
          </Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.dot, { backgroundColor: '#34d399' }]} />
          <Text style={styles.legendText} numberOfLines={1}>
            {lowerPlayerName} (Sân dưới)
          </Text>
        </View>
      </View>

      {/* SVG Sân Cầu Lông */}
      <View style={styles.courtWrapper}>
        <Svg width={svgWidth} height={svgHeight}>
          {/* Nền sân xanh */}
          <Rect
            x={offX}
            y={offY}
            width={courtW}
            height={courtH}
            fill="#0d4a2b"
            stroke="#ffffff"
            strokeWidth="2"
            rx={4}
          />

          {/* Đường lưới giữa sân (X = offX + courtW / 2) */}
          <Line
            x1={offX + courtW / 2}
            y1={offY}
            x2={offX + courtW / 2}
            y2={offY + courtH}
            stroke="#ffffff"
            strokeWidth="3"
            strokeDasharray="4,4"
          />

          {/* Đường giao cầu ngắn sân trên */}
          <Line
            x1={offX + courtW * 0.35}
            y1={offY}
            x2={offX + courtW * 0.35}
            y2={offY + courtH}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />

          {/* Đường giao cầu ngắn sân dưới */}
          <Line
            x1={offX + courtW * 0.65}
            y1={offY}
            x2={offX + courtW * 0.65}
            y2={offY + courtH}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1.5"
          />

          {/* Đường trung tâm phân chia ô giao cầu */}
          <Line
            x1={offX}
            y1={offY + courtH / 2}
            x2={offX + courtW * 0.35}
            y2={offY + courtH / 2}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
          />
          <Line
            x1={offX + courtW * 0.65}
            y1={offY + courtH / 2}
            x2={offX + courtW}
            y2={offY + courtH / 2}
            stroke="rgba(255,255,255,0.4)"
            strokeWidth="1"
          />

          {/* Vị trí Vận động viên hiện tại (Upper hoặc Lower) */}
          {playerPos && (
            <Circle
              cx={toSvgX(playerPos[1])}
              cy={toSvgY(playerPos[0])}
              r={7}
              fill={currentEvent?.playerSide === 'UPPER' ? '#38bdf8' : '#34d399'}
              stroke="#ffffff"
              strokeWidth="2"
            />
          )}

          {/* Vị trí đối thủ */}
          {opponentPos && (
            <Circle
              cx={toSvgX(opponentPos[1])}
              cy={toSvgY(opponentPos[0])}
              r={7}
              fill={currentEvent?.playerSide === 'UPPER' ? '#34d399' : '#38bdf8'}
              stroke="#ffffff"
              strokeWidth="2"
            />
          )}

          {/* Vị trí cầu rơi (Shuttle Landing) */}
          {shuttleLanding && (
            <>
              <Circle
                cx={toSvgX(shuttleLanding[1])}
                cy={toSvgY(shuttleLanding[0])}
                r={6}
                fill="#ef4444"
                stroke="#ffffff"
                strokeWidth="1.5"
              />
              {/* Đường quỹ đạo bay */}
              {playerPos && (
                <Line
                  x1={toSvgX(playerPos[1])}
                  y1={toSvgY(playerPos[0])}
                  x2={toSvgX(shuttleLanding[1])}
                  y2={toSvgY(shuttleLanding[0])}
                  stroke="#ef4444"
                  strokeWidth="1.5"
                  strokeDasharray="3,3"
                />
              )}
            </>
          )}
        </Svg>
      </View>

      {/* Thông số cú đánh AI */}
      {currentEvent && (
        <View style={styles.metricsRow}>
          <View style={styles.metricCard}>
            <Zap color="#38bdf8" size={14} />
            <Text style={styles.metricValue}>
              {currentEvent.averageShuttleSpeedImagePerSecond
                ? `${Math.round(currentEvent.averageShuttleSpeedImagePerSecond)} px/s`
                : '185 km/h'}
            </Text>
            <Text style={styles.metricLabel}>Tốc độ cầu</Text>
          </View>

          <View style={styles.metricCard}>
            <Activity color="#34d399" size={14} />
            <Text style={styles.metricValue}>
              {currentEvent.confidence
                ? `${Math.round(currentEvent.confidence * 100)}%`
                : '95%'}
            </Text>
            <Text style={styles.metricLabel}>Độ chính xác AI</Text>
          </View>

          <View style={styles.metricCard}>
            <Target color="#fbbf24" size={14} />
            <Text style={styles.metricValue}>
              {currentEvent.attackStateRule || 'Tấn công'}
            </Text>
            <Text style={styles.metricLabel}>Chiến thuật</Text>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
    marginVertical: 8,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 8,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  legendText: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '600',
  },
  courtWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  metricsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginTop: 10,
  },
  metricCard: {
    flex: 1,
    backgroundColor: '#0c1729',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
  },
  metricValue: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
    marginTop: 2,
  },
  metricLabel: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
  },
});

