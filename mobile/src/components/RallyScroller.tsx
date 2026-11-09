import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  StyleSheet,
} from 'react-native';
import { RallyData } from '../types/replay';
import { Trophy, Clock, Zap } from 'lucide-react-native';

interface RallyScrollerProps {
  rallies: RallyData[];
  currentTime: number;
  selectedRallyId?: number;
  onSelectRally: (rally: RallyData) => void;
  playerAName?: string;
  playerBName?: string;
}

export const RallyScroller: React.FC<RallyScrollerProps> = ({
  rallies,
  currentTime,
  selectedRallyId,
  onSelectRally,
  playerAName = 'Vận Động Viên A',
  playerBName = 'Vận Động Viên B',
}) => {
  const flatListRef = useRef<FlatList>(null);

  // Tìm rally đang phát dựa trên currentTime
  const activeRally = rallies.find(
    (r) => currentTime >= r.startTime && currentTime <= r.endTime
  );

  const activeId = activeRally ? activeRally.id : selectedRallyId;

  // Tự động cuộn đến rally đang diễn ra
  useEffect(() => {
    if (activeRally) {
      const idx = rallies.findIndex((r) => r.id === activeRally.id);
      if (idx !== -1 && flatListRef.current) {
        flatListRef.current.scrollToIndex({
          index: idx,
          animated: true,
          viewPosition: 0.5,
        });
      }
    }
  }, [activeRally?.id]);

  const renderItem = ({ item }: { item: RallyData }) => {
    const isActive = item.id === activeId;
    const winnerName =
      item.winnerSide === 'UPPER' ? playerAName : playerBName;

    return (
      <TouchableOpacity
        style={[styles.rallyCard, isActive && styles.activeCard]}
        onPress={() => onSelectRally(item)}
        activeOpacity={0.7}
      >
        <View style={styles.cardHeader}>
          <Text style={[styles.rallyNumber, isActive && styles.activeText]}>
            Pha cầu #{item.rallyNumber}
          </Text>
          <View style={styles.timeTag}>
            <Clock color="#94a3b8" size={11} style={{ marginRight: 3 }} />
            <Text style={styles.timeText}>{item.duration.toFixed(1)}s</Text>
          </View>
        </View>

        {/* Điểm số */}
        <View style={styles.scoreRow}>
          <Text style={styles.scoreText}>
            Tỷ số: <Text style={styles.scoreHighlight}>{item.scoreUpper} - {item.scoreLower}</Text>
          </Text>
          <View style={styles.strokeBadge}>
            <Zap color="#38bdf8" size={11} style={{ marginRight: 2 }} />
            <Text style={styles.strokeBadgeText}>{item.totalStrokes} chạm</Text>
          </View>
        </View>

        {/* Người chiến thắng pha cầu */}
        {item.winnerSide ? (
          <View style={styles.winnerRow}>
            <Trophy color="#fbbf24" size={12} style={{ marginRight: 4 }} />
            <Text style={styles.winnerText} numberOfLines={1}>
              Thắng: {winnerName} ({item.winReason || 'Điểm trực tiếp'})
            </Text>
          </View>
        ) : null}
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <FlatList
        ref={flatListRef}
        data={rallies}
        renderItem={renderItem}
        keyExtractor={(item) => String(item.id)}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContent}
        onScrollToIndexFailed={() => {}}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 6,
  },
  listContent: {
    paddingHorizontal: 12,
    gap: 10,
  },
  rallyCard: {
    width: 200,
    backgroundColor: '#13233e',
    borderColor: '#1e3a5f',
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  activeCard: {
    borderColor: '#38bdf8',
    backgroundColor: '#172c4e',
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  rallyNumber: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700',
  },
  activeText: {
    color: '#38bdf8',
  },
  timeTag: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  timeText: {
    color: '#94a3b8',
    fontSize: 11,
    fontFamily: 'monospace',
  },
  scoreRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  scoreText: {
    color: '#94a3b8',
    fontSize: 12,
  },
  scoreHighlight: {
    color: '#ffffff',
    fontWeight: '800',
  },
  strokeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(56, 189, 248, 0.15)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  strokeBadgeText: {
    color: '#38bdf8',
    fontSize: 10,
    fontWeight: '700',
  },
  winnerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  winnerText: {
    color: '#fbbf24',
    fontSize: 11,
    fontWeight: '600',
    flex: 1,
  },
});

