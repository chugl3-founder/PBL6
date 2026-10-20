import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
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
} from 'lucide-react-native';

type StatsRouteProp = RouteProp<RootStackParamList, 'MatchStatistics'>;

const STROKE_COLORS: Record<string, string> = {
  SMASH: '#ef4444',
  DROP: '#06b6d4',
  CLEAR: '#eab308',
  SERVE: '#10b981',
  LIFT: '#8b5cf6',
  DRIVE: '#ec4899',
  NET_SHOT: '#3b82f6',
};

export const MatchStatisticsScreen: React.FC = () => {
  const route = useRoute<StatsRouteProp>();
  const navigation = useNavigation();
  const { matchId, isPublic = true, title, playerAName = 'VĐV A', playerBName = 'VĐV B' } = route.params;

  const [stats, setStats] = useState<MatchStatisticsData | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

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

  if (loading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>Đang tổng hợp báo cáo thống kê AI...</Text>
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
  const playerARatio = Math.round((stats.playerAStrokes / totalHits) * 100);
  const playerBRatio = 100 - playerARatio;

  return (
    <View style={styles.container}>
      {/* Top Bar */}
      <View style={styles.topBar}>
        <TouchableOpacity style={styles.backButton} onPress={() => navigation.goBack()}>
          <ArrowLeft color="#ffffff" size={20} />
        </TouchableOpacity>
        <Text style={styles.topBarTitle} numberOfLines={1}>
          {title || 'Báo Cáo Thống Kê AI'}
        </Text>
      </View>

      <ScrollView contentContainerStyle={styles.content}>
        {/* Banner Tổng quan */}
        <View style={styles.summaryCard}>
          <View style={styles.summaryBadge}>
            <Award color="#fbbf24" size={14} />
            <Text style={styles.summaryBadgeText}>PHÂN TÍCH CHUYÊN SÂU</Text>
          </View>
          <Text style={styles.summaryTitle}>Chỉ Số Trận Đấu Toàn Diện</Text>

          {/* 4 Chỉ số cốt lõi */}
          <View style={styles.statsGrid}>
            <View style={styles.gridBox}>
              <Zap color="#38bdf8" size={18} />
              <Text style={styles.gridNumber}>{stats.totalStrokes}</Text>
              <Text style={styles.gridLabel}>Tổng cú đánh</Text>
            </View>

            <View style={styles.gridBox}>
              <Trophy color="#fbbf24" size={18} />
              <Text style={styles.gridNumber}>{stats.totalRallies}</Text>
              <Text style={styles.gridLabel}>Tổng pha cầu</Text>
            </View>

            <View style={styles.gridBox}>
              <Flame color="#ef4444" size={18} />
              <Text style={styles.gridNumber}>
                {stats.avgStrokesPerRally ? stats.avgStrokesPerRally.toFixed(1) : '0'}
              </Text>
              <Text style={styles.gridLabel}>Chạm/Pha TB</Text>
            </View>

            <View style={styles.gridBox}>
              <Clock color="#34d399" size={18} />
              <Text style={styles.gridNumber}>
                {stats.avgRallyDuration ? `${stats.avgRallyDuration.toFixed(1)}s` : '0s'}
              </Text>
              <Text style={styles.gridLabel}>Thời lượng TB</Text>
            </View>
          </View>
        </View>

        {/* Tỷ lệ kiểm soát cú đánh giữa 2 tuyển thủ */}
        <View style={styles.sectionCard}>
          <Text style={styles.sectionTitle}>Tỷ Lệ Kiểm Soát Cầu</Text>
          <View style={styles.versusRow}>
            <View style={styles.playerMeta}>
              <Text style={styles.playerName}>{playerAName}</Text>
              <Text style={styles.playerHits}>{stats.playerAStrokes} cú ({playerARatio}%)</Text>
            </View>
            <View style={[styles.playerMeta, { alignItems: 'flex-end' }]}>
              <Text style={styles.playerName}>{playerBName}</Text>
              <Text style={styles.playerHits}>{stats.playerBStrokes} cú ({playerBRatio}%)</Text>
            </View>
          </View>

          {/* Progress bar */}
          <View style={styles.ratioBar}>
            <View style={[styles.ratioFillA, { width: `${playerARatio}%` }]} />
            <View style={[styles.ratioFillB, { width: `${playerBRatio}%` }]} />
          </View>
        </View>

        {/* Phân bố các loại cú đánh (Stroke Distribution) */}
        {stats.strokeDistribution && (
          <View style={styles.sectionCard}>
            <Text style={styles.sectionTitle}>Phân Bổ Kỹ Thuật Đánh</Text>
            <View style={styles.distributionList}>
              {Object.entries(stats.strokeDistribution).map(([stroke, count]) => {
                const percent = Math.round((Number(count) / totalHits) * 100);
                const color = STROKE_COLORS[stroke] || '#38bdf8';

                return (
                  <View key={stroke} style={styles.distItem}>
                    <View style={styles.distHeader}>
                      <View style={styles.distNameTag}>
                        <View style={[styles.colorDot, { backgroundColor: color }]} />
                        <Text style={styles.distStrokeName}>{stroke}</Text>
                      </View>
                      <Text style={styles.distPercent}>
                        {count} cú ({percent}%)
                      </Text>
                    </View>
                    <View style={styles.distTrack}>
                      <View
                        style={[
                          styles.distFill,
                          { width: `${percent}%`, backgroundColor: color },
                        ]}
                      />
                    </View>
                  </View>
                );
              })}
            </View>
          </View>
        )}

        {/* Nhận xét Huấn luyện viên AI (Coach Insights) */}
        {stats.coachInsights?.insights && (
          <View style={styles.sectionCard}>
            <View style={styles.sectionHeaderRow}>
              <Lightbulb color="#fbbf24" size={18} />
              <Text style={styles.sectionTitle}>Nhận Xét Chiến Thuật AI</Text>
            </View>

            <View style={styles.insightsList}>
              {stats.coachInsights.insights.map((item, idx) => (
                <View key={idx} style={styles.insightBox}>
                  <View style={styles.insightTag}>
                    <Text style={styles.insightCategory}>{item.category || 'Chiến thuật'}</Text>
                    <Text style={styles.insightTarget}>• {item.target}</Text>
                  </View>
                  <Text style={styles.insightText}>{item.insight}</Text>
                </View>
              ))}
            </View>
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
    paddingTop: Platform.OS === 'ios' ? 50 : 20,
    paddingBottom: 12,
    backgroundColor: '#0b1424',
  },
  backButton: {
    padding: 6,
    marginRight: 10,
  },
  topBarTitle: {
    flex: 1,
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  content: {
    padding: 16,
    gap: 16,
    paddingBottom: 40,
  },
  summaryCard: {
    backgroundColor: '#122340',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 18,
    padding: 16,
  },
  summaryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(251, 191, 36, 0.15)',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    gap: 4,
    marginBottom: 8,
  },
  summaryBadgeText: {
    color: '#fbbf24',
    fontSize: 10,
    fontWeight: '700',
  },
  summaryTitle: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 14,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  gridBox: {
    flex: 1,
    backgroundColor: 'rgba(15, 29, 53, 0.8)',
    borderRadius: 12,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  gridNumber: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 4,
  },
  gridLabel: {
    color: '#94a3b8',
    fontSize: 10,
    marginTop: 2,
    textAlign: 'center',
  },
  sectionCard: {
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
  },
  sectionHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 12,
  },
  versusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  playerMeta: {},
  playerName: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  playerHits: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  ratioBar: {
    height: 10,
    borderRadius: 5,
    backgroundColor: '#1e3a5f',
    flexDirection: 'row',
    overflow: 'hidden',
  },
  ratioFillA: {
    backgroundColor: '#0284c7',
  },
  ratioFillB: {
    backgroundColor: '#34d399',
  },
  distributionList: {
    gap: 12,
  },
  distItem: {},
  distHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  distNameTag: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  colorDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  distStrokeName: {
    color: '#e2e8f0',
    fontSize: 12,
    fontWeight: '600',
  },
  distPercent: {
    color: '#94a3b8',
    fontSize: 11,
  },
  distTrack: {
    height: 6,
    backgroundColor: '#0c1729',
    borderRadius: 3,
    overflow: 'hidden',
  },
  distFill: {
    height: '100%',
    borderRadius: 3,
  },
  insightsList: {
    gap: 10,
  },
  insightBox: {
    backgroundColor: '#0c1729',
    borderRadius: 12,
    padding: 12,
    borderLeftWidth: 3,
    borderLeftColor: '#fbbf24',
  },
  insightTag: {
    flexDirection: 'row',
    gap: 4,
    marginBottom: 4,
  },
  insightCategory: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '700',
  },
  insightTarget: {
    color: '#94a3b8',
    fontSize: 11,
  },
  insightText: {
    color: '#cbd5e1',
    fontSize: 12,
    lineHeight: 18,
  },
});

