import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TextInput,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Search, Trophy, Flame, ChevronRight, User } from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { playerApi, PlayerSummary } from '../../api/playerApi';

export const PlayersScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [players, setPlayers] = useState<PlayerSummary[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadPlayers();
  }, [search]);

  const loadPlayers = async () => {
    try {
      setLoading(true);
      const list = await playerApi.listPlayers(search);
      setPlayers(list);
    } catch {
      // Ignored
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const onRefresh = () => {
    setRefreshing(true);
    loadPlayers();
  };

  const handleSelectPlayer = (name: string) => {
    navigation.navigate('PlayerProfile', { name });
  };

  const renderPlayerCard = ({ item }: { item: PlayerSummary }) => {
    const totalRallies = (item.ralliesWon || 0) + (item.ralliesLost || 0);
    const winRate = totalRallies > 0 ? Math.round((item.ralliesWon / totalRallies) * 100) : 0;

    return (
      <TouchableOpacity
        style={styles.card}
        onPress={() => handleSelectPlayer(item.name)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatar}>
            <User size={22} color="#059669" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={styles.playerName}>{item.name}</Text>
            <Text style={styles.playstyle}>
              {item.playstyle || 'Phong cách linh hoạt'}
            </Text>
          </View>
          <ChevronRight size={18} color="#94a3b8" />
        </View>

        <View style={styles.statsRow}>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Trận đấu</Text>
            <Text style={styles.statValue}>{item.matchCount}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Cú đánh</Text>
            <Text style={styles.statValue}>{item.totalShots || 0}</Text>
          </View>
          <View style={styles.statBox}>
            <Text style={styles.statLabel}>Tỷ lệ thắng pha</Text>
            <Text style={[styles.statValue, { color: '#059669' }]}>{winRate}%</Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      {/* SEARCH BAR */}
      <View style={styles.searchContainer}>
        <Search size={18} color="#94a3b8" />
        <TextInput
          style={styles.searchInput}
          placeholder="Tìm kiếm tay vợt (Momota, Axelsen, Tiến Minh...)"
          placeholderTextColor="#94a3b8"
          value={search}
          onChangeText={setSearch}
          clearButtonMode="while-editing"
        />
      </View>

      {loading && !refreshing ? (
        <View style={styles.center}>
          <ActivityIndicator size="large" color="#059669" />
          <Text style={styles.loadingText}>Đang tải danh sách vận động viên...</Text>
        </View>
      ) : (
        <FlatList
          data={players}
          keyExtractor={(item) => item.name}
          renderItem={renderPlayerCard}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={['#059669']} />
          }
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Flame size={40} color="#cbd5e1" />
              <Text style={styles.emptyText}>Không tìm thấy vận động viên nào</Text>
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
    backgroundColor: '#f8fafc',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    marginHorizontal: 16,
    marginVertical: 12,
    paddingHorizontal: 14,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    height: 44,
    fontSize: 13,
    color: '#0f172a',
  },
  listContent: {
    paddingHorizontal: 16,
    paddingBottom: 24,
    gap: 12,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  playerName: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a',
  },
  playstyle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#f8fafc',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#f1f5f9',
  },
  statBox: {
    flex: 1,
    alignItems: 'center',
  },
  statLabel: {
    fontSize: 10,
    color: '#64748b',
    textTransform: 'uppercase',
    fontWeight: '600',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '700',
    color: '#0f172a',
    marginTop: 2,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 13,
    color: '#64748b',
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
    gap: 10,
  },
  emptyText: {
    fontSize: 14,
    color: '#94a3b8',
  },
});
