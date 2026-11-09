import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Image,
  Platform,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { matchApi } from '../../api/matchApi';
import { MatchData } from '../../types/match';
import { useAuth } from '../../context/AuthContext';
import {
  Search,
  Video,
  Clock,
  Trophy,
  Zap,
  Globe,
  Play,
  BarChart2,
  Lock,
} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const PublicMatchesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [search, setSearch] = useState<string>('');

  const fetchMatches = useCallback(async (keyword = '') => {
    try {
      const data = await matchApi.getPublicMatches(0, 30, keyword);
      setMatches(data);
    } catch (err) {
      console.error('Lỗi khi tải danh sách trận đấu công khai:', err);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMatches(search);
    }, 350);
    return () => clearTimeout(timer);
  }, [search, fetchMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMatches(search);
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '45:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalRallies = matches.reduce((sum, m) => sum + (m.totalRallies || 0), 0);
  const totalStrokes = matches.reduce((sum, m) => sum + (m.totalStrokes || 0), 0);

  const renderHeader = () => (
    <View style={styles.headerContainer}>
      {/* Banner */}
      <View style={styles.banner}>
        <View style={styles.tag}>
          <Globe color="#38bdf8" size={14} />
          <Text style={styles.tagText}>THƯ VIỆN CÔNG KHAI</Text>
        </View>

        <Text style={styles.bannerTitle}>Kho Trận Đấu Phân Tích AI</Text>
        <Text style={styles.bannerDesc}>
          Khám phá các pha cầu đỉnh cao với timeline tương tác và sơ đồ 2D thời gian thực.
        </Text>

        {/* Quick Stats Grid */}
        <View style={styles.statsGrid}>
          <View style={styles.statBox}>
            <Video color="#38bdf8" size={16} />
            <Text style={styles.statNumber}>{matches.length}</Text>
            <Text style={styles.statLabel}>Trận đấu</Text>
          </View>
          <View style={styles.statBox}>
            <Trophy color="#fbbf24" size={16} />
            <Text style={styles.statNumber}>{totalRallies}</Text>
            <Text style={styles.statLabel}>Pha cầu</Text>
          </View>
          <View style={styles.statBox}>
            <Zap color="#34d399" size={16} />
            <Text style={styles.statNumber}>{totalStrokes}</Text>
            <Text style={styles.statLabel}>Cú đánh</Text>
          </View>
        </View>

        {/* Guest Preview Notice */}
        {!user && (
          <View style={styles.guestNotice}>
            <Clock color="#fbbf24" size={14} />
            <Text style={styles.guestNoticeText}>
              Chế độ Khách vãng lai: Xem thử 5 phút đầu tiên của mỗi trận đấu.
            </Text>
          </View>
        )}
      </View>

      {/* Search Bar */}
      <View style={styles.searchBox}>
        <Search color="#94a3b8" size={18} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm theo tuyển thủ, giải đấu..."
          placeholderTextColor="#64748b"
          value={search}
          onChangeText={setSearch}
        />
        {search.length > 0 && (
          <TouchableOpacity onPress={() => setSearch('')}>
            <Text style={styles.clearSearch}>✕</Text>
          </TouchableOpacity>
        )}
      </View>

      <Text style={styles.sectionTitle}>
        Danh Sách Trận Đấu ({matches.length})
      </Text>
    </View>
  );

  const renderItem = ({ item }: { item: MatchData }) => (
    <TouchableOpacity
      style={styles.card}
      activeOpacity={0.8}
      onPress={() =>
        navigation.navigate('MatchReplay', {
          matchId: item.id,
          isPublic: true,
          title: item.title || `${item.playerAName} vs ${item.playerBName}`,
        })
      }
    >
      {/* Thumbnail area */}
      <View style={styles.thumbnailArea}>
        {item.thumbnailUrl ? (
          <Image source={{ uri: item.thumbnailUrl }} style={styles.thumbnailImage} />
        ) : (
          <View style={styles.thumbnailPlaceholder}>
            <Video color="#475569" size={36} />
          </View>
        )}

        {/* Play Icon Overlay */}
        <View style={styles.playOverlay}>
          <Play color="#ffffff" size={20} fill="#ffffff" />
        </View>

        {/* Court Badge */}
        <View style={styles.courtBadge}>
          <Text style={styles.courtBadgeText}>{item.courtName || 'Giải Quốc Tế'}</Text>
        </View>

        {/* Duration Badge */}
        <View style={styles.durationBadge}>
          <Clock color="#38bdf8" size={11} style={{ marginRight: 4 }} />
          <Text style={styles.durationText}>{formatDuration(item.durationSeconds)}</Text>
        </View>
      </View>

      {/* Content */}
      <View style={styles.cardContent}>
        <Text style={styles.cardTitle} numberOfLines={1}>
          {item.title || `${item.playerAName} vs ${item.playerBName}`}
        </Text>

        {/* Players */}
        <View style={styles.playersRow}>
          <View style={styles.playerBadge}>
            <Text style={styles.playerName} numberOfLines={1}>
              {item.playerAName}
            </Text>
          </View>
          <Text style={styles.vsText}>VS</Text>
          <View style={styles.playerBadge}>
            <Text style={styles.playerName} numberOfLines={1}>
              {item.playerBName}
            </Text>
          </View>
        </View>

        {/* Meta Stats and Action Button */}
        <View style={styles.cardFooter}>
          <View style={styles.matchMeta}>
            <View style={styles.metaItem}>
              <Trophy color="#fbbf24" size={12} />
              <Text style={styles.metaText}>{item.totalRallies || 0} pha cầu</Text>
            </View>
            <View style={styles.metaItem}>
              <Zap color="#38bdf8" size={12} />
              <Text style={styles.metaText}>{item.totalStrokes || 0} cú đánh</Text>
            </View>
          </View>

          <TouchableOpacity
            style={styles.statsButton}
            onPress={() =>
              navigation.navigate('MatchStatistics', {
                matchId: item.id,
                isPublic: true,
                title: item.title || `${item.playerAName} vs ${item.playerBName}`,
                playerAName: item.playerAName,
                playerBName: item.playerBName,
              })
            }
          >
            <BarChart2 color="#38bdf8" size={14} />
            <Text style={styles.statsButtonText}>Thống kê</Text>
          </TouchableOpacity>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Đang tải thư viện trận đấu...</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#38bdf8"
              colors={['#0284c7']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Video color="#475569" size={48} />
              <Text style={styles.emptyTitle}>Không tìm thấy trận đấu nào</Text>
              <Text style={styles.emptyDesc}>
                {search
                  ? `Không có kết quả nào cho "${search}". Hãy thử từ khóa khác!`
                  : 'Hiện tại chưa có trận đấu công khai nào.'}
              </Text>
            </View>
          }
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0b1424',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  headerContainer: {
    marginBottom: 20,
  },
  banner: {
    backgroundColor: '#122340',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 20,
    padding: 18,
    marginBottom: 16,
  },
  tag: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    gap: 6,
    marginBottom: 10,
  },
  tagText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  bannerTitle: {
    color: '#ffffff',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 6,
  },
  bannerDesc: {
    color: '#94a3b8',
    fontSize: 13,
    lineHeight: 18,
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
  },
  statBox: {
    flex: 1,
    backgroundColor: 'rgba(15, 29, 53, 0.7)',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#1e3a5f',
  },
  statNumber: {
    color: '#ffffff',
    fontSize: 17,
    fontWeight: '800',
    marginTop: 4,
  },
  statLabel: {
    color: '#94a3b8',
    fontSize: 11,
    marginTop: 2,
  },
  guestNotice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(251, 191, 36, 0.1)',
    borderColor: 'rgba(251, 191, 36, 0.3)',
    borderWidth: 1,
    borderRadius: 10,
    padding: 10,
    marginTop: 14,
    gap: 8,
  },
  guestNoticeText: {
    color: '#fef08a',
    fontSize: 11,
    flex: 1,
    lineHeight: 15,
  },
  searchBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 24,
    paddingHorizontal: 14,
    height: 44,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    color: '#ffffff',
    fontSize: 14,
  },
  clearSearch: {
    color: '#94a3b8',
    fontSize: 16,
    paddingHorizontal: 4,
  },
  sectionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 12,
  },
  card: {
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 16,
    shadowColor: '#000000',
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 3,
  },
  thumbnailArea: {
    height: 180,
    backgroundColor: '#070f1e',
    position: 'relative',
    justifyContent: 'center',
    alignItems: 'center',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(2, 132, 199, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  courtBadge: {
    position: 'absolute',
    top: 10,
    left: 10,
    backgroundColor: 'rgba(11, 20, 36, 0.85)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  courtBadgeText: {
    color: '#e2e8f0',
    fontSize: 11,
    fontWeight: '600',
  },
  durationBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(11, 20, 36, 0.9)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  durationText: {
    color: '#ffffff',
    fontSize: 11,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  cardContent: {
    padding: 14,
  },
  cardTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 10,
  },
  playersRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#0c1729',
    borderRadius: 10,
    padding: 8,
    marginBottom: 12,
  },
  playerBadge: {
    flex: 1,
    alignItems: 'center',
  },
  playerName: {
    color: '#e2e8f0',
    fontSize: 13,
    fontWeight: '600',
  },
  vsText: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 11,
    paddingHorizontal: 8,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingTop: 10,
  },
  matchMeta: {
    flexDirection: 'row',
    gap: 12,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: '#94a3b8',
    fontSize: 11,
  },
  statsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  statsButtonText: {
    color: '#38bdf8',
    fontSize: 11,
    fontWeight: '600',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
});
