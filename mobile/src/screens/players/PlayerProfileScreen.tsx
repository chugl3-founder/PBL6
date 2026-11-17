import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { useRoute, useNavigation, RouteProp } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { ArrowLeft, User, Target, Play, ShieldAlert, Award } from 'lucide-react-native';
import Svg, { Polygon, Line, Text as SvgText } from 'react-native-svg';
import { RootStackParamList } from '../../navigation/types';
import { playerApi, PlayerProfile, TrainingFocusData } from '../../api/playerApi';

type ScreenRouteProp = RouteProp<RootStackParamList, 'PlayerProfile'>;

export const PlayerProfileScreen: React.FC = () => {
  const route = useRoute<ScreenRouteProp>();
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();
  const playerName = route.params?.name || '';

  const [profile, setProfile] = useState<PlayerProfile | null>(null);
  const [trainingFocus, setTrainingFocus] = useState<TrainingFocusData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadData();
  }, [playerName]);

  const loadData = async () => {
    try {
      setLoading(true);
      const [profData, focusData] = await Promise.all([
        playerApi.getProfile(playerName),
        playerApi.getTrainingFocus(playerName).catch(() => null),
      ]);
      setProfile(profData);
      setTrainingFocus(focusData);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
    }
  };

  const handleOpenMatch = (matchId: number) => {
    navigation.navigate('MatchReplay', {
      matchId,
      isPublic: true,
      title: `Trận đấu #${matchId}`,
    });
  };

  if (loading) {
    return (
      <View style={styles.center}>
        <ActivityIndicator size="large" color="#059669" />
        <Text style={styles.loadingText}>Đang tải hồ sơ {playerName}...</Text>
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.center}>
        <Text style={styles.errorText}>Không tìm thấy thông tin của vận động viên này.</Text>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.backBtnText}>Quay lại</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const radar = profile.radar || {
    attack: 60,
    defense: 60,
    netControl: 60,
    shotVariety: 60,
    consistency: 60,
    pace: 60,
  };

  // Radar Chart Calculations (Polygon 6 đỉnh)
  const size = 220;
  const center = size / 2;
  const radius = 75;
  const axes = [
    { label: 'Tấn công', val: radar.attack ?? 50 },
    { label: 'Phòng thủ', val: radar.defense ?? 50 },
    { label: 'Kiểm soát lưới', val: radar.netControl ?? 50 },
    { label: 'Đa dạng cú', val: radar.shotVariety ?? 50 },
    { label: 'Ổn định', val: radar.consistency ?? 50 },
    { label: 'Tốc độ', val: radar.pace ?? 50 },
  ];

  const points = axes
    .map((axis, i) => {
      const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
      const r = (Math.min(Math.max(axis.val, 10), 100) / 100) * radius;
      return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
    })
    .join(' ');

  const totalRallies = (profile.totals?.ralliesWon || 0) + (profile.totals?.ralliesLost || 0);
  const winRate = totalRallies > 0 ? Math.round(((profile.totals?.ralliesWon || 0) / totalRallies) * 100) : 0;

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {/* TOP HEADER */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backIconBtn} onPress={() => navigation.goBack()}>
          <ArrowLeft size={20} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Hồ Sơ Vận Động Viên</Text>
        <View style={{ width: 36 }} />
      </View>

      {/* PLAYER BANNER */}
      <View style={styles.playerBanner}>
        <View style={styles.avatarLarge}>
          <User size={36} color="#059669" />
        </View>
        <Text style={styles.profileName}>{profile.name}</Text>
        <Text style={styles.profileSubtitle}>
          {profile.playstyles?.[0]?.label || 'Lối chơi linh hoạt'} • {profile.analyzedMatchCount} trận đã phân tích
        </Text>

        <View style={styles.overviewGrid}>
          <View style={styles.overviewItem}>
            <Text style={styles.overviewVal}>{profile.totals?.shots || 0}</Text>
            <Text style={styles.overviewLabel}>Cú đánh</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewVal}>{winRate}%</Text>
            <Text style={styles.overviewLabel}>Tỷ lệ thắng pha</Text>
          </View>
          <View style={styles.overviewDivider} />
          <View style={styles.overviewItem}>
            <Text style={styles.overviewVal}>{profile.matchCount}</Text>
            <Text style={styles.overviewLabel}>Tổng trận</Text>
          </View>
        </View>
      </View>

      {/* RADAR CHART */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Target size={18} color="#059669" />
          <Text style={styles.sectionTitle}>Radar Năng Lực & Kỹ Năng</Text>
        </View>
        <View style={styles.chartWrapper}>
          <Svg width={size} height={size}>
            {[0.3, 0.6, 1.0].map((level, lIdx) => {
              const bgPoints = axes
                .map((_, i) => {
                  const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
                  const r = radius * level;
                  return `${center + r * Math.cos(angle)},${center + r * Math.sin(angle)}`;
                })
                .join(' ');
              return (
                <Polygon
                  key={lIdx}
                  points={bgPoints}
                  stroke="#cbd5e1"
                  strokeWidth="1"
                  fill={lIdx === 2 ? '#f8fafc' : 'transparent'}
                />
              );
            })}
            {axes.map((_, i) => {
              const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
              return (
                <Line
                  key={i}
                  x1={center}
                  y1={center}
                  x2={center + radius * Math.cos(angle)}
                  y2={center + radius * Math.sin(angle)}
                  stroke="#e2e8f0"
                  strokeWidth="1"
                />
              );
            })}
            <Polygon
              points={points}
              fill="rgba(5, 150, 105, 0.25)"
              stroke="#059669"
              strokeWidth="2"
            />
            {axes.map((axis, i) => {
              const angle = (Math.PI * 2 * i) / 6 - Math.PI / 2;
              const labelR = radius + 18;
              const x = center + labelR * Math.cos(angle);
              const y = center + labelR * Math.sin(angle) + 4;
              return (
                <SvgText
                  key={i}
                  x={x}
                  y={y}
                  fontSize="10"
                  fill="#475569"
                  fontWeight="600"
                  textAnchor="middle"
                >
                  {axis.label}
                </SvgText>
              );
            })}
          </Svg>
        </View>
      </View>

      {/* TRAINING FOCUS (PR #22) */}
      {trainingFocus && trainingFocus.focuses && trainingFocus.focuses.length > 0 && (
        <View style={styles.sectionCard}>
          <View style={styles.sectionTitleRow}>
            <ShieldAlert size={18} color="#d97706" />
            <Text style={styles.sectionTitle}>Trọng Tâm Cần Khắc Phục (Training Focus)</Text>
          </View>
          <Text style={styles.sectionSubtitle}>
            Các nguyên nhân làm mất điểm nhiều nhất trong các trận đấu gần đây:
          </Text>
          {trainingFocus.focuses.map((f, fIdx) => (
            <View key={fIdx} style={styles.focusItem}>
              <View style={styles.focusHeader}>
                <Text style={styles.focusStroke}>{f.stroke}</Text>
                <View
                  style={[
                    styles.focusTag,
                    f.kind === 'ERROR' ? styles.tagError : styles.tagConceded,
                  ]}
                >
                  <Text style={styles.focusTagText}>
                    {f.kind === 'ERROR' ? 'Tự đánh hỏng' : 'Bị đối phương ghi điểm'}
                  </Text>
                </View>
              </View>
              <Text style={styles.focusShare}>
                Chiếm {Math.round(f.share * 100)}% tổng số điểm bị mất ({f.count} lần)
              </Text>
            </View>
          ))}
        </View>
      )}

      {/* MATCHES LIST */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionTitleRow}>
          <Award size={18} color="#0284c7" />
          <Text style={styles.sectionTitle}>Các Trận Đấu Đã Tham Gia ({profile.matches?.length || 0})</Text>
        </View>

        {profile.matches && profile.matches.length > 0 ? (
          profile.matches.map((m, mIdx) => (
            <TouchableOpacity
              key={mIdx}
              style={styles.matchItem}
              onPress={() => handleOpenMatch(m.matchId)}
            >
              <View style={{ flex: 1 }}>
                <Text style={styles.matchTitle}>
                  {m.title || `Trận đấu #${m.matchId}`}
                </Text>
                <Text style={styles.matchOpponent}>Đối thủ: {m.opponent}</Text>
                <Text style={styles.matchMeta}>
                  {m.shots} cú đánh • {m.ralliesWon} thắng / {m.ralliesLost} thua
                </Text>
              </View>
              <View style={styles.watchBadge}>
                <Play size={12} color="#ffffff" fill="#ffffff" />
                <Text style={styles.watchBadgeText}>Xem Replay</Text>
              </View>
            </TouchableOpacity>
          ))
        ) : (
          <Text style={styles.emptyText}>Chưa có trận đấu nào được ghi nhận.</Text>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  content: {
    paddingBottom: 40,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  backIconBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  playerBanner: {
    backgroundColor: '#ffffff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  avatarLarge: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#ecfdf5',
    borderWidth: 2,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  profileName: {
    fontSize: 18,
    fontWeight: '800',
    color: '#0f172a',
  },
  profileSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
  },
  overviewGrid: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    width: '100%',
  },
  overviewItem: {
    flex: 1,
    alignItems: 'center',
  },
  overviewVal: {
    fontSize: 16,
    fontWeight: '700',
    color: '#059669',
  },
  overviewLabel: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2,
  },
  overviewDivider: {
    width: 1,
    height: 24,
    backgroundColor: '#e2e8f0',
  },
  sectionCard: {
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginBottom: 14,
    padding: 16,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
  },
  sectionSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 12,
  },
  chartWrapper: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
  },
  focusItem: {
    backgroundColor: '#fffbeb',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#fde68a',
    marginBottom: 8,
  },
  focusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  focusStroke: {
    fontSize: 13,
    fontWeight: '700',
    color: '#92400e',
  },
  focusTag: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  tagError: {
    backgroundColor: '#fee2e2',
  },
  tagConceded: {
    backgroundColor: '#fed7aa',
  },
  focusTagText: {
    fontSize: 10,
    fontWeight: '700',
    color: '#991b1b',
  },
  focusShare: {
    fontSize: 11,
    color: '#78350f',
    marginTop: 4,
  },
  matchItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  matchTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1e293b',
  },
  matchOpponent: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  matchMeta: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
  watchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
  },
  watchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  errorText: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    marginBottom: 16,
  },
  backBtn: {
    backgroundColor: '#059669',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 10,
  },
  backBtnText: {
    color: '#ffffff',
    fontWeight: '600',
  },
  emptyText: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 10,
  },
});
