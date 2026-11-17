import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../navigation/types';
import { matchApi } from '../../api/matchApi';
import { MatchData } from '../../types/match';
import { useAuth } from '../../context/AuthContext';
import {
  Video,
  Plus,
  Play,
  BarChart2,
  Clock,
  Sparkles,
  Lock,
  LogIn,
  CheckCircle,
  AlertCircle,
  PlusCircle,
} from 'lucide-react-native';

type NavigationProp = NativeStackNavigationProp<RootStackParamList>;

export const MyMatchesScreen: React.FC = () => {
  const navigation = useNavigation<NavigationProp>();
  const { user } = useAuth();

  const [matches, setMatches] = useState<MatchData[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [refreshing, setRefreshing] = useState<boolean>(false);
  const [triggeringId, setTriggeringId] = useState<number | null>(null);

  const fetchMyMatches = useCallback(async () => {
    if (!user) {
      setLoading(false);
      setRefreshing(false);
      return;
    }

    try {
      const data = await matchApi.getMyMatches(0, 30);
      setMatches(data);
    } catch (err: any) {
      if (err?.response?.status === 401) {
        setMatches([]);
      } else {
        console.warn('Lỗi khi tải trận đấu của tôi:', err?.message || err);
      }
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyMatches();
  }, [fetchMyMatches]);

  const onRefresh = () => {
    setRefreshing(true);
    fetchMyMatches();
  };

  const handleTriggerAnalysis = async (matchId: number) => {
    try {
      setTriggeringId(matchId);
      await matchApi.triggerAiAnalysis(matchId);
      Alert.alert(
        'Thành công',
        'Đã kích hoạt phân tích AI cho trận đấu. Dữ liệu sẽ sẵn sàng sau giây lát!'
      );
      fetchMyMatches();
    } catch (err: any) {
      Alert.alert('Thông báo', err.response?.data?.message || 'Không thể bắt đầu phân tích AI.');
    } finally {
      setTriggeringId(null);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
      case 'ANALYZED':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#ecfdf5', borderColor: '#a7f3d0' }]}>
            <CheckCircle color="#059669" size={12} />
            <Text style={[styles.statusText, { color: '#059669' }]}>Đã phân tích</Text>
          </View>
        );
      case 'PROCESSING':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
            <ActivityIndicator size="small" color="#0284c7" style={{ transform: [{ scale: 0.6 }] }} />
            <Text style={[styles.statusText, { color: '#0284c7' }]}>Đang phân tích...</Text>
          </View>
        );
      case 'FAILED':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#fef2f2', borderColor: '#fecaca' }]}>
            <AlertCircle color="#dc2626" size={12} />
            <Text style={[styles.statusText, { color: '#dc2626' }]}>Thất bại</Text>
          </View>
        );
      case 'READY':
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
            <Clock color="#d97706" size={12} />
            <Text style={[styles.statusText, { color: '#d97706' }]}>Sẵn sàng phân tích</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, { backgroundColor: '#f1f5f9', borderColor: '#e2e8f0' }]}>
            <Text style={[styles.statusText, { color: '#64748b' }]}>{status}</Text>
          </View>
        );
    }
  };

  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.lockBox}>
          <Lock color="#059669" size={32} />
        </View>
        <Text style={styles.unauthTitle}>Yêu Cầu Đăng Nhập</Text>
        <Text style={styles.unauthDesc}>
          Đăng nhập vào tài khoản của bạn để quản lý các trận đấu cá nhân, tải video lên và xem phân tích chiến thuật chi tiết.
        </Text>
        <TouchableOpacity
          style={styles.loginBtn}
          onPress={() => navigation.navigate('Login')}
        >
          <LogIn color="#ffffff" size={18} style={{ marginRight: 8 }} />
          <Text style={styles.loginBtnText}>Đăng Nhập Ngay</Text>
        </TouchableOpacity>
      </View>
    );
  }

  const renderItem = ({ item }: { item: MatchData }) => {
    const isAnalyzed = item.status === 'COMPLETED' || item.status === 'ANALYZED';
    const isReady = item.status === 'READY';
    const isProcessing = item.status === 'PROCESSING';

    return (
      <View style={styles.matchCard}>
        {/* Header: Title & Status */}
        <View style={styles.cardHeaderRow}>
          <Text style={styles.matchTitle} numberOfLines={1}>
            {item.title || `${item.playerAName} vs ${item.playerBName}`}
          </Text>
          {getStatusBadge(item.status)}
        </View>

        {/* Players */}
        <View style={styles.matchPlayersRow}>
          <Text style={styles.playersText}>{item.playerAName}</Text>
          <Text style={styles.vs}>VS</Text>
          <Text style={styles.playersText}>{item.playerBName}</Text>
        </View>

        {/* Date and Court */}
        <View style={styles.metaRow}>
          <Text style={styles.dateText}>
            {item.matchDate ? new Date(item.matchDate).toLocaleDateString('vi-VN') : 'Hôm nay'}
          </Text>
          {item.totalStrokes ? (
            <Text style={styles.dateText}>• {item.totalStrokes} cú đánh</Text>
          ) : null}
        </View>

        {/* Actions */}
        <View style={styles.cardActions}>
          {isAnalyzed ? (
            <>
              <TouchableOpacity
                style={styles.actionBtnPrimary}
                onPress={() =>
                  navigation.navigate('MatchReplay', {
                    matchId: item.id,
                    isPublic: false,
                    title: item.title || `${item.playerAName} vs ${item.playerBName}`,
                  })
                }
              >
                <Play color="#ffffff" size={14} fill="#ffffff" />
                <Text style={styles.actionBtnPrimaryText}>Xem Replay</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.actionBtnSecondary}
                onPress={() =>
                  navigation.navigate('MatchStatistics', {
                    matchId: item.id,
                    isPublic: false,
                    title: item.title || `${item.playerAName} vs ${item.playerBName}`,
                    playerAName: item.playerAName,
                    playerBName: item.playerBName,
                  })
                }
              >
                <BarChart2 color="#059669" size={14} />
                <Text style={styles.actionBtnSecondaryText}>Thống kê</Text>
              </TouchableOpacity>
            </>
          ) : isReady ? (
            <TouchableOpacity
              style={[styles.actionBtnAi, triggeringId === item.id && styles.buttonDisabled]}
              disabled={triggeringId === item.id}
              onPress={() => handleTriggerAnalysis(item.id)}
            >
              {triggeringId === item.id ? (
                <ActivityIndicator size="small" color="#ffffff" />
              ) : (
                <>
                  <Sparkles color="#ffffff" size={14} />
                  <Text style={styles.actionBtnAiText}>Bắt đầu Phân Tích AI</Text>
                </>
              )}
            </TouchableOpacity>
          ) : isProcessing ? (
            <View style={styles.processingBar}>
              <ActivityIndicator size="small" color="#0284c7" />
              <Text style={styles.processingText}>GPU AI đang phân tích video...</Text>
            </View>
          ) : (
            <Text style={styles.pendingText}>Đang chuẩn bị video...</Text>
          )}
        </View>
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Đang tải danh sách trận đấu...</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          renderItem={renderItem}
          keyExtractor={(item) => String(item.id)}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#059669"
              colors={['#059669']}
            />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Video color="#cbd5e1" size={48} />
              <Text style={styles.emptyTitle}>Chưa có trận đấu nào</Text>
              <Text style={styles.emptyDesc}>
                Bấm vào nút "Tạo Trận Đấu Mới" bên dưới để tải video lên và phân tích chiến thuật!
              </Text>
            </View>
          }
        />
      )}

      {/* FLOATING ACTION BUTTON */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('CreateMatch')}
        activeOpacity={0.85}
      >
        <Plus color="#ffffff" size={24} />
        <Text style={styles.fabText}>Tạo trận mới</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  listContent: {
    padding: 16,
    paddingBottom: 90,
    gap: 12,
  },
  matchCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e2e8f0',
    borderWidth: 1,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 2,
    marginBottom: 12,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  matchTitle: {
    color: '#0f172a',
    fontSize: 15,
    fontWeight: '700',
    flex: 1,
    marginRight: 8,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  statusText: {
    fontSize: 11,
    fontWeight: '700',
  },
  matchPlayersRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderRadius: 8,
    padding: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  playersText: {
    color: '#1e293b',
    fontSize: 13,
    fontWeight: '600',
  },
  vs: {
    color: '#059669',
    fontWeight: '800',
    fontSize: 11,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 12,
  },
  dateText: {
    color: '#64748b',
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    paddingTop: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 9,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnPrimaryText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnSecondary: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnSecondaryText: {
    color: '#059669',
    fontSize: 12,
    fontWeight: '700',
  },
  actionBtnAi: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    paddingVertical: 10,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnAiText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  processingBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#eff6ff',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 8,
  },
  processingText: {
    color: '#0284c7',
    fontSize: 12,
    fontWeight: '600',
  },
  pendingText: {
    color: '#94a3b8',
    fontSize: 12,
    fontStyle: 'italic',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    color: '#64748b',
    marginTop: 12,
    fontSize: 14,
  },
  lockBox: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: '#ecfdf5',
    borderColor: '#a7f3d0',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  unauthTitle: {
    color: '#0f172a',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthDesc: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 20,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#059669',
    borderRadius: 12,
    paddingHorizontal: 24,
    height: 46,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptyContainer: {
    paddingVertical: 60,
    alignItems: 'center',
    gap: 8,
  },
  emptyTitle: {
    color: '#0f172a',
    fontSize: 16,
    fontWeight: '700',
    marginTop: 8,
  },
  emptyDesc: {
    color: '#64748b',
    fontSize: 13,
    textAlign: 'center',
    paddingHorizontal: 32,
    lineHeight: 18,
  },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#059669',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 24,
    gap: 6,
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 4,
  },
  fabText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
});
