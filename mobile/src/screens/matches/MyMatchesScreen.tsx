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
  Loader,
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
    } catch (err) {
      console.error('Lỗi khi tải trận đấu của tôi:', err);
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
        return (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(52, 211, 153, 0.15)' }]}>
            <CheckCircle color="#34d399" size={12} />
            <Text style={[styles.statusText, { color: '#34d399' }]}>Đã phân tích</Text>
          </View>
        );
      case 'PROCESSING':
        return (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(56, 189, 248, 0.15)' }]}>
            <ActivityIndicator size="small" color="#38bdf8" style={{ transform: [{ scale: 0.6 }] }} />
            <Text style={[styles.statusText, { color: '#38bdf8' }]}>Đang phân tích AI...</Text>
          </View>
        );
      case 'FAILED':
        return (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(239, 68, 68, 0.15)' }]}>
            <AlertCircle color="#ef4444" size={12} />
            <Text style={[styles.statusText, { color: '#ef4444' }]}>Thất bại</Text>
          </View>
        );
      default:
        return (
          <View style={[styles.statusBadge, { backgroundColor: 'rgba(251, 191, 36, 0.15)' }]}>
            <Clock color="#fbbf24" size={12} />
            <Text style={[styles.statusText, { color: '#fbbf24' }]}>Chờ phân tích</Text>
          </View>
        );
    }
  };

  // Nếu chưa đăng nhập -> Hiển thị màn hình giới thiệu & nút Đăng nhập
  if (!user) {
    return (
      <View style={styles.centerContainer}>
        <View style={styles.lockBox}>
          <Lock color="#38bdf8" size={36} />
        </View>
        <Text style={styles.unauthTitle}>Quản Lý Trận Đấu Của Bạn</Text>
        <Text style={styles.unauthDesc}>
          Đăng nhập để tải lên video trận đấu cá nhân, yêu cầu AI phân tích và lưu trữ lịch sử trận đấu của bạn.
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

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <View>
          <Text style={styles.headerTitle}>Trận Đấu Của Tôi</Text>
          <Text style={styles.headerSubtitle}>Quản lý {matches.length} video trận đấu cá nhân</Text>
        </View>
        <TouchableOpacity
          style={styles.createBtn}
          onPress={() => navigation.navigate('CreateMatch')}
        >
          <Plus color="#ffffff" size={18} />
          <Text style={styles.createBtnText}>Tạo mới</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <View style={styles.centerContainer}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Đang tải danh sách trận đấu...</Text>
        </View>
      ) : (
        <FlatList
          data={matches}
          keyExtractor={(item) => String(item.id)}
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
              <Text style={styles.emptyTitle}>Chưa có trận đấu nào</Text>
              <Text style={styles.emptyDesc}>
                Nhấn vào nút "Tạo mới" ở trên để thêm trận đấu đầu tiên của bạn!
              </Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.matchCard}>
              <View style={styles.cardHeaderRow}>
                <Text style={styles.matchTitle} numberOfLines={1}>
                  {item.title || `${item.playerAName} vs ${item.playerBName}`}
                </Text>
                {getStatusBadge(item.status)}
              </View>

              <View style={styles.matchPlayersRow}>
                <Text style={styles.playersText}>
                  {item.playerAName} <Text style={styles.vs}>VS</Text> {item.playerBName}
                </Text>
                <Text style={styles.dateText}>{item.matchDate || 'Hôm nay'}</Text>
              </View>

              {/* Action Buttons */}
              <View style={styles.cardActions}>
                {item.status === 'COMPLETED' ? (
                  <>
                    <TouchableOpacity
                      style={styles.actionBtnPrimary}
                      onPress={() =>
                        navigation.navigate('MatchReplay', {
                          matchId: item.id,
                          isPublic: false,
                          title: item.title || undefined,
                        })
                      }
                    >
                      <Play color="#ffffff" size={14} fill="#ffffff" />
                      <Text style={styles.actionBtnPrimaryText}>Xem lại & AI</Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.actionBtnSecondary}
                      onPress={() =>
                        navigation.navigate('MatchStatistics', {
                          matchId: item.id,
                          isPublic: false,
                          title: item.title || undefined,
                          playerAName: item.playerAName,
                          playerBName: item.playerBName,
                        })
                      }
                    >
                      <BarChart2 color="#38bdf8" size={14} />
                      <Text style={styles.actionBtnSecondaryText}>Thống kê</Text>
                    </TouchableOpacity>
                  </>
                ) : (
                  <TouchableOpacity
                    style={[
                      styles.actionBtnAi,
                      triggeringId === item.id && styles.buttonDisabled,
                    ]}
                    disabled={triggeringId === item.id}
                    onPress={() => handleTriggerAnalysis(item.id)}
                  >
                    {triggeringId === item.id ? (
                      <ActivityIndicator size="small" color="#ffffff" />
                    ) : (
                      <>
                        <Sparkles color="#ffffff" size={14} />
                        <Text style={styles.actionBtnAiText}>Phân tích bằng AI</Text>
                      </>
                    )}
                  </TouchableOpacity>
                )}
              </View>
            </View>
          )}
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
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  headerTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
  },
  headerSubtitle: {
    color: '#94a3b8',
    fontSize: 12,
    marginTop: 2,
  },
  createBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0284c7',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 10,
    gap: 4,
  },
  createBtnText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  listContent: {
    padding: 16,
    gap: 14,
  },
  matchCard: {
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 16,
    padding: 14,
  },
  cardHeaderRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  matchTitle: {
    color: '#ffffff',
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
    marginBottom: 12,
  },
  playersText: {
    color: '#cbd5e1',
    fontSize: 13,
    fontWeight: '600',
  },
  vs: {
    color: '#38bdf8',
    fontWeight: '800',
    fontSize: 11,
  },
  dateText: {
    color: '#64748b',
    fontSize: 11,
  },
  cardActions: {
    flexDirection: 'row',
    gap: 10,
    borderTopWidth: 1,
    borderTopColor: '#1e3a5f',
    paddingTop: 10,
  },
  actionBtnPrimary: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    paddingVertical: 8,
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
    backgroundColor: 'rgba(56, 189, 248, 0.12)',
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  actionBtnSecondaryText: {
    color: '#38bdf8',
    fontSize: 12,
    fontWeight: '600',
  },
  actionBtnAi: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#8b5cf6',
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  actionBtnAiText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#0b1424',
  },
  loadingText: {
    color: '#94a3b8',
    marginTop: 12,
    fontSize: 14,
  },
  lockBox: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
  },
  unauthTitle: {
    color: '#ffffff',
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 8,
    textAlign: 'center',
  },
  unauthDesc: {
    color: '#94a3b8',
    fontSize: 13,
    textAlign: 'center',
    lineHeight: 19,
    marginBottom: 24,
  },
  loginBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#0284c7',
    borderRadius: 12,
    paddingHorizontal: 24,
    height: 48,
  },
  loginBtnText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '700',
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

