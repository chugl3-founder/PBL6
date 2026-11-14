import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
  Dimensions,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import Svg, { Path, Polygon, Line, Text as SvgText, G, Circle } from 'react-native-svg';
import { RootStackParamList } from '../../navigation/types';
import { replayApi } from '../../api/replayApi';
import { MatchStatisticsData } from '../../types/replay';
import {
  ArrowLeft,
  Trophy,
  Zap,
  Activity,
  Lightbulb,
  Clock,
  Flame,
  Award,
  Sparkles,
  Users,
  BarChart3,
  PieChart as PieIcon,
  Target,
  Shield,
  TrendingUp,
  CheckCircle,
} from 'lucide-react-native';

type StatsRouteProp = RouteProp<RootStackParamList, 'MatchStatistics'>;

type TabType = 'OVERVIEW' | 'CHARTS' | 'TACTICS';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const STROKE_COLORS: Record<string, string> = {
  SMASH: '#ef4444',      // Đỏ rực
  DROP: '#06b6d4',       // Cyan
  CLEAR: '#eab308',      // Vàng amber
  SERVE: '#10b981',      // Xanh ngọc
  LIFT: '#8b5cf6',       // Tím violet
  DRIVE: '#ec4899',      // Hồng pink
  NET_SHOT: '#3b82f6',   // Xanh dương
  NET_ATTACK: '#f97316', // Cam rực
  UNKNOWN: '#6b7280',    // Xám
};

const STROKE_VIETNAMESE: Record<string, string> = {
  SMASH: 'Đập cầu (Smash)',
  DROP: 'Bỏ nhỏ (Drop)',
  CLEAR: 'Phông cầu (Clear)',
  SERVE: 'Giao cầu (Serve)',
  LIFT: 'Hất cầu (Lift)',
  DRIVE: 'Tạt cầu (Drive)',
  NET_SHOT: 'Kéo lưới (Net Shot)',
  NET_ATTACK: 'Vồ lưới (Net Attack)',
  UNKNOWN: 'Khác',
};

const AXIS_VIETNAMESE: Record<string, string> = {
  attack: 'Tấn công',
  defense: 'Phòng thủ',
  net_play: 'Kiểm soát lưới',
  consistency: 'Độ ổn định',
  variation: 'Biến hóa',
};

export const MatchStatisticsScreen: React.FC = () => {
  const route = useRoute<StatsRouteProp>();
  const navigation = useNavigation();
  const { matchId, isPublic = true, title, playerAName = 'VĐV Phía Trên', playerBName = 'VĐV Phía Dưới' } = route.params;

  const [stats, setStats] = useState<MatchStatisticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [activeTab, setActiveTab] = useState<TabType>('OVERVIEW');
  const [selectedStroke, setSelectedStroke] = useState<string | null>(null);

  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoading(true);
        const data = await replayApi.getStatistics(matchId, isPublic);
        setStats(data);
      } catch (err) {
        console.error('Lỗi khi tải thống kê:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchStats();
  }, [matchId, isPublic]);

  // Xử lý dữ liệu phân bố cú đánh cho Donut & Bảng
  const strokeSlices = useMemo(() => {
    if (!stats?.strokeDistribution) return [];
    const entries = Object.entries(stats.strokeDistribution).sort((a, b) => b[1] - a[1]);
    const total = entries.reduce((sum, item) => sum + item[1], 0) || stats.totalStrokes || 1;

    let accumulatedAngle = 0;
    return entries.map(([stroke, count]) => {
      const percentage = (count / total);
      const angle = percentage * 360;
      const startAngle = accumulatedAngle;
      accumulatedAngle += angle;
      return {
        stroke,
        count,
        percentage: Math.round(percentage * 1000) / 10,
        startAngle,
        angle,
        color: STROKE_COLORS[stroke.toUpperCase()] || '#94a3b8',
      };
    });
  }, [stats]);

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Đang tổng hợp báo cáo phân tích AI chuyên sâu...</Text>
      </View>
    );
  }

  if (!stats) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.noDataText}>Chưa có dữ liệu thống kê cho trận đấu này.</Text>
        <TouchableOpacity style={styles.backBtnText} onPress={() => navigation.goBack()}>
          <Text style={styles.linkText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const totalHits = stats.totalStrokes || 1;
  const playerAStrokes = stats.playerAStrokes || Math.round(totalHits / 2);
  const playerBStrokes = stats.playerBStrokes || (totalHits - playerAStrokes);
  const playerARatio = Math.round((playerAStrokes / totalHits) * 100);
  const playerBRatio = 100 - playerARatio;

  // Thuận tay vs Trái tay vs Vòng đầu
  const totalHandedness = (stats.forehandCount + stats.backhandCount + stats.aroundheadCount) || totalHits;
  const forehandPct = Math.round((stats.forehandCount / totalHandedness) * 100);
  const backhandPct = Math.round((stats.backhandCount / totalHandedness) * 100);
  const aroundheadPct = Math.round(((stats.aroundheadCount || 0) / totalHandedness) * 100); // fix: khong suy ra 100 - x - y (sai khi ca 3 deu = 0)

  // Helper chuyển đổi góc Polar sang Cartesian cho SVG Donut
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians),
    };
  };

  const createSvgArc = (x: number, y: number, radius: number, innerRadius: number, startAngle: number, endAngle: number) => {
    const adjustedEndAngle = Math.min(endAngle, startAngle + 359.99);
    const start = polarToCartesian(x, y, radius, adjustedEndAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const innerStart = polarToCartesian(x, y, innerRadius, startAngle);
    const innerEnd = polarToCartesian(x, y, innerRadius, adjustedEndAngle);
    const arcSweep = adjustedEndAngle - startAngle <= 180 ? '0' : '1';

    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${arcSweep} 0 ${end.x} ${end.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${arcSweep} 1 ${innerEnd.x} ${innerEnd.y}`,
      'Z',
    ].join(' ');
  };

  // Helper tính toán đa giác cho Radar 5 trục
  const renderRadarChart = () => {
    const axes = stats.radarChart?.axes || ['attack', 'defense', 'net_play', 'consistency', 'variation'];
    const upperVals = stats.radarChart?.upper || [78, 65, 82, 75, 70];
    const lowerVals = stats.radarChart?.lower || [72, 79, 68, 71, 74];
    const numAxes = axes.length;
    const center = 110;
    const maxR = 75;

    const getPoint = (idx: number, val: number) => {
      const angle = (Math.PI * 2 * idx) / numAxes - Math.PI / 2;
      const r = (Math.min(Math.max(val, 0), 100) / 100) * maxR;
      return {
        x: center + r * Math.cos(angle),
        y: center + r * Math.sin(angle),
      };
    };

    const upperPolygon = axes.map((_, i) => {
      const pt = getPoint(i, upperVals[i] ?? 70);
      return `${pt.x},${pt.y}`;
    }).join(' ');

    const lowerPolygon = axes.map((_, i) => {
      const pt = getPoint(i, lowerVals[i] ?? 70);
      return `${pt.x},${pt.y}`;
    }).join(' ');

    return (
      <View style={styles.radarCard}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderLeft}>
            <Sparkles color="#a855f7" size={18} />
            <Text style={styles.cardTitle}>Biểu Đồ Radar {numAxes} Trục Năng Lực</Text>
          </View>
        </View>

        {/* Legend */}
        <View style={styles.radarLegendRow}>
          <View style={styles.radarLegendItem}>
            <View style={[styles.radarLegendColor, { backgroundColor: '#38bdf8' }]} />
            <Text style={styles.radarLegendText} numberOfLines={1}>{playerAName}</Text>
          </View>
          <View style={styles.radarLegendItem}>
            <View style={[styles.radarLegendColor, { backgroundColor: '#fbbf24' }]} />
            <Text style={styles.radarLegendText} numberOfLines={1}>{playerBName}</Text>
          </View>
        </View>

        {/* SVG Radar */}
        <View style={styles.radarSvgWrapper}>
          <Svg viewBox="0 0 220 220" width={220} height={220}>
            {/* Lưới đa giác đồng tâm (25%, 50%, 75%, 100%) */}
            {[25, 50, 75, 100].map((lv) => {
              const pts = axes.map((_, i) => {
                const p = getPoint(i, lv);
                return `${p.x},${p.y}`;
              }).join(' ');
              return (
                <Polygon
                  key={lv}
                  points={pts}
                  fill="none"
                  stroke="rgba(255,255,255,0.12)"
                  strokeWidth="1"
                />
              );
            })}

            {/* Trục nối tâm và nhãn */}
            {axes.map((ax, i) => {
              const outer = getPoint(i, 100);
              const labelPt = getPoint(i, 122);
              return (
                <G key={ax}>
                  <Line
                    x1={center}
                    y1={center}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="rgba(255,255,255,0.15)"
                    strokeWidth="1"
                  />
                  <SvgText
                    x={labelPt.x}
                    y={labelPt.y}
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="9"
                    fontWeight="bold"
                  >
                    {AXIS_VIETNAMESE[ax] || ax}
                  </SvgText>
                </G>
              );
            })}

            {/* Đa giác Player A */}
            <Polygon
              points={upperPolygon}
              fill="rgba(56, 189, 248, 0.3)"
              stroke="#38bdf8"
              strokeWidth="2"
            />

            {/* Đa giác Player B */}
            <Polygon
              points={lowerPolygon}
              fill="rgba(251, 191, 36, 0.28)"
              stroke="#fbbf24"
              strokeWidth="2"
            />
          </Svg>
        </View>

        {/* Bảng điểm 5 trục chi tiết */}
        <View style={styles.radarTable}>
          <View style={styles.radarTableHeader}>
            <Text style={styles.radarTableColHead}>Trục Kỹ Năng</Text>
            <Text style={[styles.radarTableColHead, { textAlign: 'right', color: '#38bdf8' }]}>{playerAName}</Text>
            <Text style={[styles.radarTableColHead, { textAlign: 'right', color: '#fbbf24' }]}>{playerBName}</Text>
          </View>
          {axes.map((ax, i) => (
            <View key={ax} style={styles.radarTableRow}>
              <Text style={styles.radarTableCellName}>{AXIS_VIETNAMESE[ax] || ax}</Text>
              <Text style={[styles.radarTableCellScore, { color: '#38bdf8' }]}>
                {upperVals[i] ?? 70}/100
              </Text>
              <Text style={[styles.radarTableCellScore, { color: '#fbbf24' }]}>
                {lowerVals[i] ?? 70}/100
              </Text>
            </View>
          ))}
        </View>
      </View>
    );
  };

  const activeStrokeInfo = selectedStroke
    ? strokeSlices.find((s) => s.stroke === selectedStroke)
    : null;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity testID="btn-back-stats" style={styles.backButton} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#ffffff" size={20} />
        </TouchableOpacity>
        <View style={styles.topBarTitleWrapper}>
          <Text style={styles.topBarTitle} numberOfLines={1}>
            {title || 'Báo Cáo Thống Kê AI'}
          </Text>
          <Text style={styles.topBarSubtitle}>
            {playerAName} vs {playerBName}
          </Text>
        </View>
      </View>

      {/* Tabs Switcher */}
      <View style={styles.tabBar}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'OVERVIEW' && styles.activeTabItem]}
          onPress={() => setActiveTab('OVERVIEW')}
        >
          <Activity color={activeTab === 'OVERVIEW' ? '#38bdf8' : '#64748b'} size={16} />
          <Text style={[styles.tabText, activeTab === 'OVERVIEW' && styles.activeTabText]}>
            Tổng quan
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'CHARTS' && styles.activeTabItem]}
          onPress={() => setActiveTab('CHARTS')}
        >
          <PieIcon color={activeTab === 'CHARTS' ? '#38bdf8' : '#64748b'} size={16} />
          <Text style={[styles.tabText, activeTab === 'CHARTS' && styles.activeTabText]}>
            Biểu đồ cú đánh
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'TACTICS' && styles.activeTabItem]}
          onPress={() => setActiveTab('TACTICS')}
        >
          <Sparkles color={activeTab === 'TACTICS' ? '#38bdf8' : '#64748b'} size={16} />
          <Text style={[styles.tabText, activeTab === 'TACTICS' && styles.activeTabText]}>
            Chiến thuật AI
          </Text>
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* ==================== TAB 1: OVERVIEW ==================== */}
        {activeTab === 'OVERVIEW' && (
          <View style={styles.tabContent}>
            {/* Banner AI Badge */}
            <View style={styles.aiBadgeBanner}>
              <View style={styles.aiBadgeRow}>
                <Award color="#fbbf24" size={16} />
                <Text style={styles.aiBadgeTitle}>PHÂN TÍCH CHUYÊN SÂU AI COMPUTER VISION</Text>
              </View>
              <Text style={styles.aiBadgeDesc}>
                Dữ liệu được trích xuất tự động qua mô hình nhận diện hành vi tuyển thủ và quỹ đạo cầu lông thời gian thực.
              </Text>
            </View>

            {/* 4 Chỉ số cốt lõi */}
            <View style={styles.statsGrid}>
              <View style={styles.gridCard}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
                  <Zap color="#38bdf8" size={18} />
                </View>
                <Text style={styles.gridNumber}>{stats.totalStrokes}</Text>
                <Text style={styles.gridLabel}>Tổng cú đánh</Text>
                <Text style={styles.gridSubLabel}>Toàn bộ trận đấu</Text>
              </View>

              <View style={styles.gridCard}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
                  <Trophy color="#fbbf24" size={18} />
                </View>
                <Text style={[styles.gridNumber, { color: '#fbbf24' }]}>{stats.totalRallies}</Text>
                <Text style={styles.gridLabel}>Tổng pha cầu</Text>
                <Text style={styles.gridSubLabel}>Pha cầu hoàn tất</Text>
              </View>

              <View style={styles.gridCard}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
                  <Flame color="#ef4444" size={18} />
                </View>
                <Text style={[styles.gridNumber, { color: '#ef4444' }]}>
                  {stats.avgStrokesPerRally ? stats.avgStrokesPerRally.toFixed(1) : '0'}
                </Text>
                <Text style={styles.gridLabel}>Chạm / Pha TB</Text>
                <Text style={styles.gridSubLabel}>Mức độ giằng co</Text>
              </View>

              <View style={styles.gridCard}>
                <View style={[styles.iconCircle, { backgroundColor: 'rgba(16, 185, 129, 0.15)' }]}>
                  <Clock color="#10b981" size={18} />
                </View>
                <Text style={[styles.gridNumber, { color: '#10b981' }]}>
                  {stats.avgRallyDuration ? `${stats.avgRallyDuration.toFixed(1)}s` : '0s'}
                </Text>
                <Text style={styles.gridLabel}>Thời lượng TB</Text>
                <Text style={styles.gridSubLabel}>Mỗi pha bóng</Text>
              </View>
            </View>

            {/* So sánh tỷ lệ kiểm soát giữa 2 tuyển thủ */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Users color="#f59e0b" size={18} />
                  <Text style={styles.cardTitle}>Tương Quan Khối Lượng Cú Đánh</Text>
                </View>
                <Text style={styles.cardHeaderBadge}>Upper vs Lower</Text>
              </View>

              <View style={styles.versusRow}>
                <View style={styles.playerMeta}>
                  <Text style={[styles.playerName, { color: '#38bdf8' }]} numberOfLines={1}>{playerAName}</Text>
                  <Text style={styles.playerHits}>{playerAStrokes} cú ({playerARatio}%)</Text>
                </View>
                <View style={[styles.playerMeta, { alignItems: 'flex-end' }]}>
                  <Text style={[styles.playerName, { color: '#fbbf24' }]} numberOfLines={1}>{playerBName}</Text>
                  <Text style={styles.playerHits}>{playerBStrokes} cú ({playerBRatio}%)</Text>
                </View>
              </View>

              {/* Progress bar so sánh */}
              <View style={styles.ratioBarTrack}>
                <View style={[styles.ratioBarA, { width: `${playerARatio}%` }]} />
                <View style={[styles.ratioBarB, { width: `${playerBRatio}%` }]} />
              </View>
              <View style={styles.ratioBarLabels}>
                <Text style={styles.ratioBarSubText}>{playerARatio}% khối lượng</Text>
                <Text style={styles.ratioBarSubText}>{playerBRatio}% khối lượng</Text>
              </View>
            </View>

            {/* Kỹ thuật tay thực hiện (Grip & Handedness) */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Target color="#10b981" size={18} />
                  <Text style={styles.cardTitle}>Kỹ Thuật Cầm Vợt & Vị Trí Tiếp Cầu</Text>
                </View>
                <Text style={styles.cardHeaderBadge}>Grip Distribution</Text>
              </View>

              <View style={styles.gripList}>
                {/* Thuận tay */}
                <View style={styles.gripItem}>
                  <View style={styles.gripHeader}>
                    <Text style={styles.gripLabel}>Thuận tay (Forehand)</Text>
                    <Text style={[styles.gripValue, { color: '#10b981' }]}>
                      {stats.forehandCount} ({forehandPct}%)
                    </Text>
                  </View>
                  <View style={styles.gripTrack}>
                    <View style={[styles.gripFill, { width: `${forehandPct}%`, backgroundColor: '#10b981' }]} />
                  </View>
                </View>

                {/* Trái tay */}
                <View style={styles.gripItem}>
                  <View style={styles.gripHeader}>
                    <Text style={styles.gripLabel}>Trái tay (Backhand)</Text>
                    <Text style={[styles.gripValue, { color: '#06b6d4' }]}>
                      {stats.backhandCount} ({backhandPct}%)
                    </Text>
                  </View>
                  <View style={styles.gripTrack}>
                    <View style={[styles.gripFill, { width: `${backhandPct}%`, backgroundColor: '#06b6d4' }]} />
                  </View>
                </View>

                {/* Vòng đầu */}
                <View style={styles.gripItem}>
                  <View style={styles.gripHeader}>
                    <Text style={styles.gripLabel}>Vòng qua đầu (Around the head)</Text>
                    <Text style={[styles.gripValue, { color: '#8b5cf6' }]}>
                      {stats.aroundheadCount} ({aroundheadPct}%)
                    </Text>
                  </View>
                  <View style={styles.gripTrack}>
                    <View style={[styles.gripFill, { width: `${aroundheadPct}%`, backgroundColor: '#8b5cf6' }]} />
                  </View>
                </View>
              </View>
            </View>

            {/* Độ tự tin mô hình AI */}
            <View style={styles.confidenceCard}>
              <CheckCircle color="#38bdf8" size={20} />
              <View style={styles.confidenceInfo}>
                <Text style={styles.confidenceTitle}>Độ tin cậy nhận diện AI: {(stats.avgConfidence * 100).toFixed(1)}%</Text>
                <Text style={styles.confidenceDesc}>
                  Mô hình đạt độ chính xác cao trong việc phân loại đường cầu, điểm tiếp xúc và kết quả pha bóng.
                </Text>
              </View>
            </View>
          </View>
        )}

        {/* ==================== TAB 2: CHARTS ==================== */}
        {activeTab === 'CHARTS' && (
          <View style={styles.tabContent}>
            {/* 1. Biểu đồ tròn Donut Chart SVG */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <PieIcon color="#38bdf8" size={18} />
                  <Text style={styles.cardTitle}>Biểu Đồ Tròn Phân Bố Cú Đánh</Text>
                </View>
                <Text style={styles.cardHeaderBadge}>{stats.totalStrokes} cú</Text>
              </View>

              <View style={styles.donutContainer}>
                {/* SVG Donut */}
                <View style={styles.donutSvgWrapper}>
                  <Svg viewBox="0 0 200 200" width={180} height={180}>
                    {strokeSlices.map((slice) => {
                      const isSelected = selectedStroke === slice.stroke;
                      const outerR = isSelected ? 92 : 86;
                      const innerR = 56;
                      return (
                        <Path
                          key={slice.stroke}
                          d={createSvgArc(100, 100, outerR, innerR, slice.startAngle, slice.startAngle + slice.angle)}
                          fill={slice.color}
                          opacity={selectedStroke && !isSelected ? 0.35 : 1}
                          onPress={() => setSelectedStroke(isSelected ? null : slice.stroke)}
                        />
                      );
                    })}
                  </Svg>

                  {/* Trung tâm Donut hiển thị Stroke hoặc Tổng */}
                  <View style={styles.donutCenter}>
                    {activeStrokeInfo ? (
                      <>
                        <Text style={styles.donutCenterLabel} numberOfLines={1}>
                          {activeStrokeInfo.stroke}
                        </Text>
                        <Text style={styles.donutCenterCount}>{activeStrokeInfo.count}</Text>
                        <Text style={[styles.donutCenterPct, { color: activeStrokeInfo.color }]}>
                          {activeStrokeInfo.percentage}%
                        </Text>
                      </>
                    ) : (
                      <>
                        <Text style={styles.donutCenterLabel}>CÚ ĐÁNH</Text>
                        <Text style={styles.donutCenterCount}>{stats.totalStrokes}</Text>
                        <Text style={styles.donutCenterPct}>100% Ghi nhận</Text>
                      </>
                    )}
                  </View>
                </View>

                {/* Chú giải nhanh tương tác */}
                <View style={styles.legendGrid}>
                  {strokeSlices.map((sl) => {
                    const isSelected = selectedStroke === sl.stroke;
                    return (
                      <TouchableOpacity
                        key={sl.stroke}
                        style={[styles.legendChip, isSelected && styles.selectedLegendChip]}
                        onPress={() => setSelectedStroke(isSelected ? null : sl.stroke)}
                      >
                        <View style={[styles.legendDot, { backgroundColor: sl.color }]} />
                        <Text style={styles.legendText} numberOfLines={1}>
                          {STROKE_VIETNAMESE[sl.stroke.toUpperCase()] || sl.stroke}
                        </Text>
                        <Text style={styles.legendCount}>{sl.count}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              </View>
            </View>

            {/* 2. Biểu đồ Cột dọc Tần Suất Cú Đánh */}
            {strokeSlices.length > 0 && (() => {
              const maxCount = Math.max(...strokeSlices.map((s) => s.count), 1);
              return (
                <View style={styles.card}>
                  <View style={styles.cardHeader}>
                    <View style={styles.cardHeaderLeft}>
                      <BarChart3 color="#10b981" size={18} />
                      <Text style={styles.cardTitle}>Biểu Đồ Cột Tần Suất Kỹ Thuật</Text>
                    </View>
                    <Text style={styles.cardHeaderBadge}>Đơn vị: Cú đánh</Text>
                  </View>

                  <View style={styles.columnChartWrapper}>
                    <View style={styles.columnBarsRow}>
                      {strokeSlices.map((sl) => {
                        const heightPct = Math.max(Math.round((sl.count / maxCount) * 100), 10);
                        const isSelected = selectedStroke === sl.stroke;
                        return (
                          <TouchableOpacity
                            key={sl.stroke}
                            style={styles.columnCol}
                            onPress={() => setSelectedStroke(isSelected ? null : sl.stroke)}
                          >
                            <Text style={styles.columnCountText}>{sl.count}</Text>
                            <View
                              style={[
                                styles.columnBar,
                                {
                                  height: `${heightPct}%`,
                                  backgroundColor: sl.color,
                                  opacity: selectedStroke && !isSelected ? 0.35 : 1,
                                },
                              ]}
                            />
                            <Text style={styles.columnLabel} numberOfLines={1}>
                              {sl.stroke.substring(0, 4)}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </View>
                  </View>
                </View>
              );
            })()}

            {/* 3. Bảng Phân Tích Định Lượng Chi Tiết Cú Đánh */}
            <View style={styles.card}>
              <View style={styles.cardHeader}>
                <View style={styles.cardHeaderLeft}>
                  <Activity color="#38bdf8" size={18} />
                  <Text style={styles.cardTitle}>Bảng Thống Kê Định Lượng Chi Tiết</Text>
                </View>
                <Text style={styles.cardHeaderBadge}>Chi tiết</Text>
              </View>

              <View style={styles.tableWrapper}>
                <View style={styles.tableHeadRow}>
                  <Text style={[styles.tableHeadCell, { flex: 2 }]}>Kỹ Thuật Đánh</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'right' }]}>Số Lượng</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1, textAlign: 'right' }]}>Tỷ Lệ</Text>
                  <Text style={[styles.tableHeadCell, { flex: 1.5, textAlign: 'right' }]}>Tỷ Trọng</Text>
                </View>

                {strokeSlices.map((sl) => (
                  <View key={sl.stroke} style={styles.tableRow}>
                    <View style={[styles.tableCellNameWrapper, { flex: 2 }]}>
                      <View style={[styles.tableDot, { backgroundColor: sl.color }]} />
                      <Text style={styles.tableCellName} numberOfLines={1}>
                        {STROKE_VIETNAMESE[sl.stroke.toUpperCase()] || sl.stroke}
                      </Text>
                    </View>
                    <Text style={[styles.tableCellCount, { flex: 1 }]}>{sl.count}</Text>
                    <Text style={[styles.tableCellPct, { flex: 1 }]}>{sl.percentage}%</Text>
                    <View style={[styles.tableCellProgress, { flex: 1.5 }]}>
                      <View style={[styles.tableProgressFill, { width: `${sl.percentage}%`, backgroundColor: sl.color }]} />
                    </View>
                  </View>
                ))}
              </View>
            </View>
          </View>
        )}

        {/* ==================== TAB 3: TACTICS ==================== */}
        {activeTab === 'TACTICS' && (
          <View style={styles.tabContent}>
            {/* 1. Radar Chart */}
            {renderRadarChart()}

            {/* 2. Chuỗi phối hợp chiến thuật 2-gram */}
            {stats.tacticalPatterns?.top_transitions_2gram && stats.tacticalPatterns.top_transitions_2gram.length > 0 && (
              <View style={styles.card}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Award color="#10b981" size={18} />
                    <Text style={styles.cardTitle}>Chuỗi Phối Hợp Chiến Thuật Phổ Biến</Text>
                  </View>
                  <Text style={styles.cardHeaderBadge}>2-Gram</Text>
                </View>

                <View style={styles.transitionsList}>
                  {stats.tacticalPatterns.top_transitions_2gram.map((item, idx) => (
                    <View key={idx} style={styles.transitionItem}>
                      <View style={styles.transitionSteps}>
                        <View style={styles.stepBadgeA}>
                          <Text style={styles.stepTextA}>{item.from}</Text>
                        </View>
                        <Text style={styles.stepArrow}>➜</Text>
                        <View style={styles.stepBadgeB}>
                          <Text style={styles.stepTextB}>{item.to}</Text>
                        </View>
                      </View>
                      <View style={styles.transitionCountBadge}>
                        <Text style={styles.transitionCountText}>{item.count} lần</Text>
                      </View>
                    </View>
                  ))}
                </View>
              </View>
            )}

            {/* 3. Nhận định chuyên môn AI (CoachAI+ Insights) */}
            {stats.coachInsights?.insights && stats.coachInsights.insights.length > 0 && (
              <View style={[styles.card, { borderColor: 'rgba(56, 189, 248, 0.3)' }]}>
                <View style={styles.cardHeader}>
                  <View style={styles.cardHeaderLeft}>
                    <Lightbulb color="#fbbf24" size={18} />
                    <Text style={styles.cardTitle}>Nhận Xét Chiến Thuật Huấn Luyện Viên AI</Text>
                  </View>
                </View>

                <View style={styles.insightsList}>
                  {stats.coachInsights.insights.map((item, idx) => (
                    <View key={idx} style={styles.insightBox}>
                      <View style={styles.insightHeader}>
                        <Text style={styles.insightCategory}>{item.category || 'Chiến thuật'}</Text>
                        <Text style={styles.insightTarget}>
                          Mục tiêu: {item.target === 'upper' ? playerAName : playerBName}
                        </Text>
                      </View>
                      <Text style={styles.insightText}>{item.insight}</Text>
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1424',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#0b1424',
    padding: 24,
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
    textAlign: 'center',
  },
  noDataText: {
    color: '#94a3b8',
    fontSize: 15,
    textAlign: 'center',
  },
  backBtnText: {
    marginTop: 16,
  },
  linkText: {
    color: '#38bdf8',
    fontSize: 14,
    fontWeight: '700',
  },
  topBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: Platform.OS === 'ios' ? 52 : 36,
    paddingBottom: 12,
    backgroundColor: '#111c30',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  backButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  topBarTitleWrapper: {
    flex: 1,
  },
  topBarTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  topBarSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: '#111c30',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.08)',
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    marginHorizontal: 4,
    borderRadius: 10,
    backgroundColor: 'transparent',
    gap: 6,
  },
  activeTabItem: {
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
  },
  tabText: {
    color: '#64748b',
    fontSize: 12,
    fontWeight: '600',
  },
  activeTabText: {
    color: '#38bdf8',
    fontWeight: '700',
  },
  content: {
    padding: 16,
    paddingBottom: 40,
  },
  tabContent: {
    gap: 16,
  },
  aiBadgeBanner: {
    backgroundColor: 'rgba(251, 191, 36, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(251, 191, 36, 0.25)',
    borderRadius: 16,
    padding: 14,
  },
  aiBadgeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 6,
  },
  aiBadgeTitle: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  aiBadgeDesc: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  gridCard: {
    width: (SCREEN_WIDTH - 44) / 2,
    backgroundColor: '#111c30',
    borderRadius: 16,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  iconCircle: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  gridNumber: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    letterSpacing: -0.5,
  },
  gridLabel: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
    marginTop: 2,
  },
  gridSubLabel: {
    color: '#64748b',
    fontSize: 10,
    marginTop: 2,
  },
  card: {
    backgroundColor: '#111c30',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
    paddingBottom: 10,
  },
  cardHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  cardHeaderBadge: {
    color: '#94a3b8',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  versusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  playerMeta: {
    flex: 1,
  },
  playerName: {
    fontSize: 13,
    fontWeight: '700',
  },
  playerHits: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  ratioBarTrack: {
    height: 10,
    backgroundColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 5,
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ratioBarA: {
    height: '100%',
    backgroundColor: '#38bdf8',
  },
  ratioBarB: {
    height: '100%',
    backgroundColor: '#fbbf24',
  },
  ratioBarLabels: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  ratioBarSubText: {
    color: '#64748b',
    fontSize: 10,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  gripList: {
    gap: 12,
  },
  gripItem: {},
  gripHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 6,
  },
  gripLabel: {
    color: '#cbd5e1',
    fontSize: 12,
  },
  gripValue: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  gripTrack: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.06)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  gripFill: {
    height: '100%',
    borderRadius: 3,
  },
  confidenceCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.08)',
    borderWidth: 1,
    borderColor: 'rgba(56, 189, 248, 0.25)',
    borderRadius: 16,
    padding: 14,
    gap: 12,
  },
  confidenceInfo: {
    flex: 1,
  },
  confidenceTitle: {
    color: '#38bdf8',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 4,
  },
  confidenceDesc: {
    color: '#94a3b8',
    fontSize: 11,
    lineHeight: 16,
  },
  donutContainer: {
    alignItems: 'center',
  },
  donutSvgWrapper: {
    position: 'relative',
    width: 180,
    height: 180,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  donutCenter: {
    position: 'absolute',
    alignItems: 'center',
    justifyContent: 'center',
  },
  donutCenterLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  donutCenterCount: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '900',
    marginTop: 1,
  },
  donutCenterPct: {
    color: '#10b981',
    fontSize: 10,
    fontWeight: '700',
    marginTop: 1,
  },
  legendGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    width: '100%',
  },
  legendChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
    borderRadius: 12,
    paddingVertical: 6,
    paddingHorizontal: 10,
    width: (SCREEN_WIDTH - 68) / 2,
    justifyContent: 'space-between',
  },
  selectedLegendChip: {
    backgroundColor: 'rgba(255, 255, 255, 0.12)',
    borderColor: '#38bdf8',
  },
  legendDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 6,
  },
  legendText: {
    color: '#cbd5e1',
    fontSize: 11,
    flex: 1,
  },
  legendCount: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginLeft: 4,
  },
  columnChartWrapper: {
    paddingTop: 10,
  },
  columnBarsRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    height: 150,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 6,
  },
  columnCol: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'flex-end',
    height: '100%',
    paddingHorizontal: 2,
  },
  columnCountText: {
    color: '#ffffff',
    fontSize: 9,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    marginBottom: 4,
  },
  columnBar: {
    width: '85%',
    maxWidth: 24,
    borderRadius: 4,
  },
  columnLabel: {
    color: '#94a3b8',
    fontSize: 9,
    fontWeight: '600',
    marginTop: 6,
    textTransform: 'uppercase',
  },
  tableWrapper: {
    marginTop: 4,
  },
  tableHeadRow: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.1)',
    paddingBottom: 8,
    marginBottom: 8,
  },
  tableHeadCell: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
  },
  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  tableCellNameWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  tableDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  tableCellName: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  tableCellCount: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tableCellPct: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'right',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  tableCellProgress: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 3,
    overflow: 'hidden',
    marginLeft: 8,
  },
  tableProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  radarCard: {
    backgroundColor: '#111c30',
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.08)',
  },
  radarLegendRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 16,
    marginBottom: 12,
  },
  radarLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  radarLegendColor: {
    width: 10,
    height: 10,
    borderRadius: 2,
  },
  radarLegendText: {
    color: '#cbd5e1',
    fontSize: 11,
    fontWeight: '600',
  },
  radarSvgWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 4,
  },
  radarTable: {
    marginTop: 14,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.06)',
    paddingTop: 10,
  },
  radarTableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.06)',
  },
  radarTableColHead: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    flex: 1,
  },
  radarTableRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 7,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 255, 255, 0.04)',
  },
  radarTableCellName: {
    color: '#cbd5e1',
    fontSize: 12,
    fontWeight: '500',
    flex: 1,
  },
  radarTableCellScore: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    textAlign: 'right',
    flex: 1,
  },
  transitionsList: {
    gap: 10,
  },
  transitionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'rgba(255, 255, 255, 0.03)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  transitionSteps: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  stepBadgeA: {
    backgroundColor: 'rgba(59, 130, 246, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stepTextA: {
    color: '#60a5fa',
    fontSize: 11,
    fontWeight: '700',
  },
  stepArrow: {
    color: '#64748b',
    fontSize: 12,
  },
  stepBadgeB: {
    backgroundColor: 'rgba(245, 158, 11, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  stepTextB: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  transitionCountBadge: {
    backgroundColor: 'rgba(16, 185, 129, 0.15)',
    borderWidth: 1,
    borderColor: 'rgba(16, 185, 129, 0.3)',
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 3,
  },
  transitionCountText: {
    color: '#34d399',
    fontSize: 11,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  insightsList: {
    gap: 10,
  },
  insightBox: {
    backgroundColor: 'rgba(255, 255, 255, 0.04)',
    borderRadius: 14,
    padding: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.06)',
  },
  insightHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  insightCategory: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '800',
    textTransform: 'uppercase',
  },
  insightTarget: {
    color: '#94a3b8',
    fontSize: 10,
  },
  insightText: {
    color: '#e2e8f0',
    fontSize: 12,
    lineHeight: 18,
  },
});
