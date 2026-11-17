import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import {
  Send,
  Sparkles,
  Scale,
  History,
  Plus,
  Bot,
  User,
  Play,
  X,
  ChevronRight,
} from 'lucide-react-native';
import { RootStackParamList } from '../../navigation/types';
import { coachApi, CoachMessage, CoachSessionItem, MatchOption } from '../../api/coachApi';

const STYLE_OPTIONS = [
  { id: 'attack', label: 'Tấn công dồn dập (Smash liên tục)' },
  { id: 'defense', label: 'Phòng thủ phản công (Kéo dài pha cầu)' },
  { id: 'balanced', label: 'Linh hoạt, điều cầu 4 góc sân' },
];

const SHOT_OPTIONS = [
  { id: 'smash', label: 'Cú đập cầu uy lực (Smash)' },
  { id: 'drop', label: 'Bỏ nhỏ tinh tế & Chặt cầu sát lưới' },
  { id: 'drive', label: 'Đánh cầu nhanh phản tạt (Drive)' },
  { id: 'defense_clear', label: 'Phòng thủ bền bỉ & Phông cầu sâu' },
];

const PACE_OPTIONS = [
  { id: 'fast', label: 'Nhịp độ rất nhanh, áp đảo ngay từ đầu' },
  { id: 'marathon', label: 'Giằng co dai dẳng, đọ thể lực' },
  { id: 'tactical', label: 'Đổi nhịp liên tục, cài bẫy chiến thuật' },
];

const QUICK_PROMPTS = [
  '🎯 Gợi ý trận đấu theo sở thích',
  '⚖️ So sánh phong độ 2 trận',
  'Quy định chiều cao giao cầu BWF mới nhất?',
  'Cách khắc chế đối thủ hay smash cắm vạch?',
];

export const CoachScreen: React.FC = () => {
  const navigation = useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [messages, setMessages] = useState<CoachMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        'Xin chào! Tôi là **BadmintonAI Coach** — Huấn luyện viên ảo & Trinh sát chiến thuật của bạn.\n\nTôi có thể giải đáp **Luật BWF**, tư vấn **kỹ thuật & chiến thuật**, **so sánh phong độ giữa 2 trận đấu**, hoặc **gợi ý trận đấu phù hợp theo sở thích** của bạn.',
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Modals
  const [showHistoryModal, setShowHistoryModal] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);

  // Data for Modals
  const [sessions, setSessions] = useState<CoachSessionItem[]>([]);
  const [availableMatches, setAvailableMatches] = useState<MatchOption[]>([]);
  const [selectedMatchA, setSelectedMatchA] = useState<number | null>(null);
  const [selectedMatchB, setSelectedMatchB] = useState<number | null>(null);

  // Survey States
  const [selectedStyle, setSelectedStyle] = useState(STYLE_OPTIONS[0].label);
  const [selectedShot, setSelectedShot] = useState(SHOT_OPTIONS[0].label);
  const [selectedPace, setSelectedPace] = useState(PACE_OPTIONS[0].label);

  const flatListRef = useRef<FlatList>(null);

  useEffect(() => {
    loadSessions();
  }, []);

  const loadSessions = async () => {
    try {
      const list = await coachApi.getSessions();
      setSessions(list);
    } catch {
      // Ignored
    }
  };

  const loadAvailableMatches = async () => {
    try {
      const matches = await coachApi.getAvailableMatches();
      setAvailableMatches(matches);
      if (matches.length >= 2) {
        setSelectedMatchA(matches[0].id);
        setSelectedMatchB(matches[1].id);
      }
    } catch {
      Alert.alert('Thông báo', 'Không thể tải danh sách trận đấu để so sánh.');
    }
  };

  const handleSend = async (customMessage?: string) => {
    const textToSend = customMessage || inputText.trim();
    if (!textToSend || loading) return;

    const userMsg: CoachMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: textToSend,
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customMessage) setInputText('');
    setLoading(true);

    try {
      const response = await coachApi.sendMessage(textToSend, sessionId);
      if (response?.session_id) {
        setSessionId(response.session_id);
      }

      const aiMsg: CoachMessage = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response.reply,
        video_citations: response.video_citations || [],
      };

      setMessages((prev) => [...prev, aiMsg]);
      loadSessions();
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: 'Xin lỗi, Huấn luyện viên AI đang bận hoặc gặp sự cố mạng. Vui lòng thử lại sau giây lát!',
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setSessionId(null);
    setMessages([
      {
        id: 'welcome',
        role: 'assistant',
        content:
          'Xin chào! Tôi là **BadmintonAI Coach** — Huấn luyện viên ảo & Trinh sát chiến thuật của bạn.\n\nTôi có thể giải đáp **Luật BWF**, tư vấn **kỹ thuật & chiến thuật**, **so sánh phong độ giữa 2 trận đấu**, hoặc **gợi ý trận đấu phù hợp theo sở thích** của bạn.',
      },
    ]);
  };

  const handleSelectSession = async (sid: string) => {
    setShowHistoryModal(false);
    setLoading(true);
    try {
      const history = await coachApi.getHistory(sid);
      if (history.length > 0) {
        setSessionId(sid);
        setMessages(history);
      }
    } catch {
      Alert.alert('Lỗi', 'Không thể tải lại lịch sử cuộc trò chuyện này.');
    } finally {
      setLoading(false);
    }
  };

  const handleApplyRecommend = () => {
    setShowRecommendModal(false);
    const prompt = `Tôi muốn bạn gợi ý các trận đấu phù hợp với tôi dựa trên các sở thích sau:
- Phong cách thi đấu: ${selectedStyle}
- Kỹ thuật / Đòn đánh muốn xem: ${selectedShot}
- Nhịp độ trận đấu: ${selectedPace}
Hãy phân tích vì sao các trận đấu này phù hợp và nêu các pha cầu tiêu biểu.`;
    handleSend(prompt);
  };

  const handleApplyCompare = () => {
    if (!selectedMatchA || !selectedMatchB) {
      Alert.alert('Thông báo', 'Vui lòng chọn 2 trận đấu để so sánh.');
      return;
    }
    if (selectedMatchA === selectedMatchB) {
      Alert.alert('Thông báo', 'Vui lòng chọn 2 trận đấu khác nhau.');
      return;
    }
    setShowCompareModal(false);
    const prompt = `Hãy so sánh phong độ và chỉ số kỹ thuật giữa trận #${selectedMatchA} và trận #${selectedMatchB} cho tôi?`;
    handleSend(prompt);
  };

  const handleNavigateToMatch = (matchId: number) => {
    navigation.navigate('MatchReplay', {
      matchId,
      isPublic: true,
      title: `Trận đấu #${matchId}`,
    });
  };

  const renderMessageContent = (text: string) => {
    const parts = text.split(/(\[Pha cầu #\d+\s*-\s*\d+:\d+\]|\[Xem trận(?:\s*đấu)?\s*#\d+\])/g);

    return (
      <Text style={styles.messageText}>
        {parts.map((part, index) => {
          const rallyMatch = part.match(/\[Pha cầu #(\d+)\s*-\s*(\d+):(\d+)\]/);
          if (rallyMatch) {
            const detectedMatchIdMatch = text.match(/(?:Trận|trận)\s*#(\d+)/);
            const targetId = detectedMatchIdMatch ? parseInt(detectedMatchIdMatch[1], 10) : 3;
            return (
              <TouchableOpacity
                key={index}
                style={styles.rallyBadge}
                onPress={() => handleNavigateToMatch(targetId)}
                activeOpacity={0.7}
              >
                <Play size={10} color="#059669" fill="#059669" />
                <Text style={styles.rallyBadgeText}>{part}</Text>
              </TouchableOpacity>
            );
          }

          const matchLink = part.match(/\[Xem trận(?:\s*đấu)?\s*#(\d+)\]/);
          if (matchLink) {
            const mId = parseInt(matchLink[1], 10);
            return (
              <TouchableOpacity
                key={index}
                style={styles.matchBadge}
                onPress={() => handleNavigateToMatch(mId)}
                activeOpacity={0.7}
              >
                <Play size={11} color="#ffffff" fill="#ffffff" />
                <Text style={styles.matchBadgeText}>Xem trận #{mId}</Text>
              </TouchableOpacity>
            );
          }

          return <Text key={index}>{part}</Text>;
        })}
      </Text>
    );
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      {/* HEADER */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <View style={styles.botIconWrapper}>
            <Bot size={20} color="#059669" />
          </View>
          <View>
            <View style={styles.titleRow}>
              <Text style={styles.headerTitle}>AI Coach</Text>
              <View style={styles.badgeAi}>
                <Text style={styles.badgeAiText}>Trợ lý AI</Text>
              </View>
            </View>
            <Text style={styles.headerSubtitle}>Tư vấn chiến thuật & Phân tích RAG</Text>
          </View>
        </View>

        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.headerBtn}
            onPress={() => {
              loadSessions();
              setShowHistoryModal(true);
            }}
          >
            <History size={18} color="#64748b" />
          </TouchableOpacity>
          <TouchableOpacity style={styles.headerBtn} onPress={handleNewChat}>
            <Plus size={20} color="#64748b" />
          </TouchableOpacity>
        </View>
      </View>

      {/* QUICK PROMPTS BAR */}
      <View style={styles.quickBar}>
        <TouchableOpacity
          style={styles.sparkleBtn}
          onPress={() => setShowRecommendModal(true)}
        >
          <Sparkles size={14} color="#d97706" />
          <Text style={styles.sparkleBtnText}>Gợi ý trận</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.compareBtn}
          onPress={() => {
            loadAvailableMatches();
            setShowCompareModal(true);
          }}
        >
          <Scale size={14} color="#059669" />
          <Text style={styles.compareBtnText}>So sánh</Text>
        </TouchableOpacity>

        {QUICK_PROMPTS.slice(2).map((prompt, idx) => (
          <TouchableOpacity
            key={idx}
            style={styles.quickPromptPill}
            onPress={() => handleSend(prompt)}
          >
            <Text style={styles.quickPromptText} numberOfLines={1}>
              {prompt}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* MESSAGE LIST */}
      <FlatList
        ref={flatListRef}
        data={messages}
        keyExtractor={(item, index) => item.id?.toString() || index.toString()}
        contentContainerStyle={styles.messageList}
        onContentSizeChange={() => flatListRef.current?.scrollToEnd({ animated: true })}
        renderItem={({ item }) => {
          const isUser = item.role === 'user';
          return (
            <View
              style={[
                styles.messageRow,
                isUser ? styles.messageRowUser : styles.messageRowAssistant,
              ]}
            >
              {!isUser && (
                <View style={styles.avatarBot}>
                  <Bot size={14} color="#059669" />
                </View>
              )}
              <View
                style={[
                  styles.messageBubble,
                  isUser ? styles.bubbleUser : styles.bubbleAssistant,
                ]}
              >
                {renderMessageContent(item.content)}
              </View>
              {isUser && (
                <View style={styles.avatarUser}>
                  <User size={14} color="#ffffff" />
                </View>
              )}
            </View>
          );
        }}
      />

      {loading && (
        <View style={styles.loadingRow}>
          <ActivityIndicator size="small" color="#059669" />
          <Text style={styles.loadingText}>Huấn luyện viên đang suy nghĩ & tra cứu số liệu...</Text>
        </View>
      )}

      {/* INPUT BAR */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          placeholder="Hỏi chiến thuật, so sánh trận đấu hoặc luật BWF..."
          placeholderTextColor="#94a3b8"
          value={inputText}
          onChangeText={setInputText}
          multiline
        />
        <TouchableOpacity
          style={[styles.sendBtn, !inputText.trim() && styles.sendBtnDisabled]}
          onPress={() => handleSend()}
          disabled={!inputText.trim() || loading}
        >
          <Send size={18} color="#ffffff" />
        </TouchableOpacity>
      </View>

      {/* MODAL 1: GỢI Ý TRẬN ĐẤU */}
      <Modal visible={showRecommendModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Sparkles size={20} color="#d97706" />
                <Text style={styles.modalTitle}>Khảo Sát Gợi Ý Trận Đấu</Text>
              </View>
              <TouchableOpacity onPress={() => setShowRecommendModal(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.questionTitle}>1. Phong cách thi đấu bạn yêu thích:</Text>
            {STYLE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionCard,
                  selectedStyle === opt.label && styles.optionCardActive,
                ]}
                onPress={() => setSelectedStyle(opt.label)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedStyle === opt.label && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.questionTitle}>2. Kỹ thuật bạn muốn quan sát:</Text>
            {SHOT_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionCard,
                  selectedShot === opt.label && styles.optionCardActive,
                ]}
                onPress={() => setSelectedShot(opt.label)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedShot === opt.label && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <Text style={styles.questionTitle}>3. Nhịp độ trận đấu:</Text>
            {PACE_OPTIONS.map((opt) => (
              <TouchableOpacity
                key={opt.id}
                style={[
                  styles.optionCard,
                  selectedPace === opt.label && styles.optionCardActive,
                ]}
                onPress={() => setSelectedPace(opt.label)}
              >
                <Text
                  style={[
                    styles.optionText,
                    selectedPace === opt.label && styles.optionTextActive,
                  ]}
                >
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}

            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyRecommend}>
              <Text style={styles.applyBtnText}>Nhận Gợi Ý Từ AI</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 2: SO SÁNH 2 TRẬN ĐẤU */}
      <Modal visible={showCompareModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Scale size={20} color="#059669" />
                <Text style={styles.modalTitle}>So Sánh Phong Độ 2 Trận</Text>
              </View>
              <TouchableOpacity onPress={() => setShowCompareModal(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            <Text style={styles.questionTitle}>Chọn Trận Đấu Thứ Nhất (Trận A):</Text>
            <FlatList
              data={availableMatches}
              keyExtractor={(item) => `a-${item.id}`}
              style={{ maxHeight: 130 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.matchSelectRow,
                    selectedMatchA === item.id && styles.matchSelectRowActive,
                  ]}
                  onPress={() => setSelectedMatchA(item.id)}
                >
                  <Text style={styles.matchSelectText}>
                    #{item.id} - {item.player_a} vs {item.player_b} ({item.total_strokes} cú đánh)
                  </Text>
                </TouchableOpacity>
              )}
            />

            <Text style={styles.questionTitle}>Chọn Trận Đấu Thứ Hai (Trận B):</Text>
            <FlatList
              data={availableMatches}
              keyExtractor={(item) => `b-${item.id}`}
              style={{ maxHeight: 130 }}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.matchSelectRow,
                    selectedMatchB === item.id && styles.matchSelectRowActive,
                  ]}
                  onPress={() => setSelectedMatchB(item.id)}
                >
                  <Text style={styles.matchSelectText}>
                    #{item.id} - {item.player_a} vs {item.player_b} ({item.total_strokes} cú đánh)
                  </Text>
                </TouchableOpacity>
              )}
            />

            <TouchableOpacity style={styles.applyBtn} onPress={handleApplyCompare}>
              <Text style={styles.applyBtnText}>Bắt Đầu Đối Chiếu & So Sánh</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* MODAL 3: LỊCH SỬ HỘI THOẠI */}
      <Modal visible={showHistoryModal} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <History size={20} color="#0284c7" />
                <Text style={styles.modalTitle}>Lịch Sử Trò Chuyện ({sessions.length})</Text>
              </View>
              <TouchableOpacity onPress={() => setShowHistoryModal(false)}>
                <X size={20} color="#64748b" />
              </TouchableOpacity>
            </View>

            {sessions.length === 0 ? (
              <Text style={styles.emptySessionsText}>Chưa có phiên trò chuyện nào được lưu.</Text>
            ) : (
              <FlatList
                data={sessions}
                keyExtractor={(item) => item.session_id}
                style={{ maxHeight: 350 }}
                renderItem={({ item }) => (
                  <TouchableOpacity
                    style={styles.sessionItem}
                    onPress={() => handleSelectSession(item.session_id)}
                  >
                    <View style={{ flex: 1 }}>
                      <Text style={styles.sessionTitle} numberOfLines={1}>
                        {item.title}
                      </Text>
                      {item.created_at && (
                        <Text style={styles.sessionDate}>
                          {new Date(item.created_at).toLocaleString('vi-VN')}
                        </Text>
                      )}
                    </View>
                    <ChevronRight size={16} color="#94a3b8" />
                  </TouchableOpacity>
                )}
              />
            )}
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
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
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  botIconWrapper: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#a7f3d0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  badgeAi: {
    backgroundColor: '#d1fae5',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeAiText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#065f46',
  },
  headerSubtitle: {
    fontSize: 11,
    color: '#64748b',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerBtn: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    gap: 8,
  },
  sparkleBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fef3c7',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#fde68a',
  },
  sparkleBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#b45309',
  },
  compareBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#a7f3d0',
  },
  compareBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
  },
  quickPromptPill: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    maxWidth: 160,
  },
  quickPromptText: {
    fontSize: 12,
    color: '#475569',
  },
  messageList: {
    padding: 16,
    gap: 12,
  },
  messageRow: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    marginVertical: 4,
  },
  messageRowUser: {
    justifyContent: 'flex-end',
  },
  messageRowAssistant: {
    justifyContent: 'flex-start',
  },
  avatarBot: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#d1fae5',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  avatarUser: {
    width: 26,
    height: 26,
    borderRadius: 8,
    backgroundColor: '#0284c7',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 4,
  },
  messageBubble: {
    maxWidth: '82%',
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 16,
  },
  bubbleAssistant: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopLeftRadius: 4,
  },
  bubbleUser: {
    backgroundColor: '#0284c7',
    borderTopRightRadius: 4,
  },
  messageText: {
    fontSize: 13,
    lineHeight: 20,
    color: '#1e293b',
  },
  rallyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#ecfdf5',
    borderWidth: 1,
    borderColor: '#6ee7b7',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
    marginVertical: 2,
  },
  rallyBadgeText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#065f46',
  },
  matchBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#059669',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    marginVertical: 2,
  },
  matchBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: '#ffffff',
  },
  loadingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 20,
    paddingBottom: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#059669',
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#ffffff',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 8,
  },
  input: {
    flex: 1,
    minHeight: 40,
    maxHeight: 100,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    fontSize: 13,
    color: '#0f172a',
  },
  sendBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#059669',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    backgroundColor: '#cbd5e1',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    maxHeight: '85%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a',
  },
  questionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#334155',
    marginTop: 10,
    marginBottom: 6,
  },
  optionCard: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
    marginBottom: 6,
  },
  optionCardActive: {
    borderColor: '#d97706',
    backgroundColor: '#fef3c7',
  },
  optionText: {
    fontSize: 12,
    color: '#475569',
  },
  optionTextActive: {
    color: '#92400e',
    fontWeight: '600',
  },
  matchSelectRow: {
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 6,
  },
  matchSelectRowActive: {
    borderColor: '#059669',
    backgroundColor: '#ecfdf5',
  },
  matchSelectText: {
    fontSize: 12,
    color: '#334155',
  },
  applyBtn: {
    backgroundColor: '#059669',
    paddingVertical: 12,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  applyBtnText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '700',
  },
  emptySessionsText: {
    fontSize: 13,
    color: '#94a3b8',
    textAlign: 'center',
    paddingVertical: 20,
  },
  sessionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  sessionTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  sessionDate: {
    fontSize: 11,
    color: '#94a3b8',
    marginTop: 2,
  },
});
