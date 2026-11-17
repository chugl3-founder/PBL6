import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Send, Bot, Play, Minimize2, History, Plus, ChevronLeft, 
  Mic, MicOff, Volume2, VolumeX, Scale, Loader2,
  Sparkles, CheckCircle2, Target, Shield, Zap
} from 'lucide-react';
import { ASK_COACH_EVENT, AskCoachDetail, playRallies } from '../../utils/coachEvents';

interface Citation {
  rally_number: number;
  timestamp: string;
  seconds: number;
}

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  video_citations?: Citation[];
  timestamp?: string;
  isStreaming?: boolean;
}

interface ChatSessionItem {
  session_id: string;
  title: string;
  match_id?: number | null;
  created_at?: string;
}

interface MatchOption {
  id: number;
  title: string;
  player_a: string;
  player_b: string;
  score: string;
  total_strokes: number;
}

// The coach is part of the Spring Boot API, so it goes through the same base URL (Vite proxies /api).
const COACH_API_URL = `${import.meta.env.VITE_API_URL || '/api'}/coach`;

// crypto.randomUUID only exists on HTTPS or localhost; a server opened by plain-HTTP IP falls back to getRandomValues.
function randomId(): string {
  if (typeof crypto.randomUUID === 'function') return crypto.randomUUID();
  const b = crypto.getRandomValues(new Uint8Array(16));
  b[6] = (b[6] & 0x0f) | 0x40;
  b[8] = (b[8] & 0x3f) | 0x80;
  const h = Array.from(b, (x) => x.toString(16).padStart(2, '0')).join('');
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`;
}

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Xin chào! Tôi là **BadmintonAI Coach** — Huấn luyện viên ảo & Chuyên gia trinh sát chiến thuật của bạn.\n\nTôi có thể giải đáp **Luật BWF**, tư vấn **chiến thuật & kỹ thuật**, **so sánh phong độ giữa 2 trận đấu**, hoặc **gợi ý trận đấu phù hợp theo sở thích & phong cách của bạn**.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

// Các tùy chọn cho Khảo sát sở thích gợi ý trận đấu
const STYLE_OPTIONS = [
  { id: 'attack', label: '⚔️ Tấn công áp đảo, đập cầu uy lực', desc: 'Thích xem những pha smash cháy sân như Viktor Axelsen, Lee Zii Jia' },
  { id: 'defense', label: '🛡️ Phòng thủ phản công, kiểm soát bền bỉ', desc: 'Kiểm soát nhịp độ, điều cầu 4 góc mẫu mực như Kento Momota' },
  { id: 'speed', label: '⚡ Tốc độ cao, bắt lưới & phản tạt nhanh', desc: 'Di chuyển thần tốc, gài lưới chớp nhoáng như Anthony Ginting' },
  { id: 'tactical', label: '🧠 Tinh quái, điều cầu biến hóa', desc: 'Đánh lừa hướng cầu, kỹ thuật tinh tế như Chou Tien Chen, Shi Yuqi' },
];

const SHOT_OPTIONS = [
  { id: 'smash', label: '💥 Jump smash cắm sàn / Đập chéo sân' },
  { id: 'drop', label: '🪶 Drop shot siết lưới / Cắt cầu rơi sát mép' },
  { id: 'net', label: '🏸 Gài lưới đổi hướng & Chụp lưới phản xạ' },
  { id: 'footwork', label: '🏃 Bộ chân di chuyển 4 góc & Thủ cầu búng góc' },
];

const PACE_OPTIONS = [
  { id: 'finals', label: '🏆 Đỉnh cao chung kết giải lớn (World Tour / All England)' },
  { id: 'marathon', label: '⏳ Siêu marathon giằng co nghẹt thở (> 20 cú đánh/pha)' },
  { id: 'fast', label: '⚡ Tiết tấu nhanh gọn, kết thúc dứt khoát' },
];

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [showRecommendModal, setShowRecommendModal] = useState(false);
  const [sessionsList, setSessionsList] = useState<ChatSessionItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Browser key: UUID cố định lưu trong localStorage, dùng để phân tách lịch sử chat riêng từng thiết bị
  const [browserKey] = useState<string>(() => {
    const STORAGE_KEY = 'badminton_coach_browser_key';
    let key = localStorage.getItem(STORAGE_KEY);
    if (!key) {
      key = randomId();
      localStorage.setItem(STORAGE_KEY, key);
    }
    return key;
  });

  // Tính năng 1: Voice Mic (Speech-to-Text) & Text-to-Speech (TTS)
  const [isListening, setIsListening] = useState(false);
  const [speakingMessageId, setSpeakingMessageId] = useState<string | null>(null);
  const [speechSupported, setSpeechSupported] = useState(true);
  const recognitionRef = useRef<any>(null);

  // Tính năng 3: So sánh phong độ giữa 2 trận đấu
  const [availableMatches, setAvailableMatches] = useState<MatchOption[]>([]);
  const [selectedMatchA, setSelectedMatchA] = useState<number | ''>('');
  const [selectedMatchB, setSelectedMatchB] = useState<number | ''>('');
  const [loadingMatches, setLoadingMatches] = useState(false);

  // Tính năng Mới: Khảo sát sở thích để Gợi ý trận đấu
  const [selectedStyle, setSelectedStyle] = useState<string>(STYLE_OPTIONS[0].label);
  const [selectedShot, setSelectedShot] = useState<string>(SHOT_OPTIONS[0].label);
  const [selectedPace, setSelectedPace] = useState<string>(PACE_OPTIONS[0].label);

  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // Set once the user starts or continues a conversation: a restore still loading must not replace it.
  const userActedRef = useRef(false);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Nhận diện matchId từ URL (ví dụ: /matches/2 hoặc /public-matches/2/replay)
  const matchMatch = location.pathname.match(/\/(?:matches|public-matches)\/(\d+)/);
  const currentMatchId = matchMatch ? parseInt(matchMatch[1], 10) : undefined;

  // Cô lập phiên chat theo từng Người dùng / Khách để ngăn ngừa rò rỉ tin nhắn giữa các tài khoản
  const userJson = localStorage.getItem('user_info');
  let currentUserId: string = 'guest';
  try {
    const parsedUser = userJson ? JSON.parse(userJson) : null;
    if (parsedUser?.id) {
      currentUserId = `u_${parsedUser.id}`;
    } else if (browserKey) {
      currentUserId = `guest_${browserKey.slice(0, 8)}`;
    }
  } catch {
    currentUserId = 'guest';
  }

  // One conversation per user, kept while moving between pages; the match being viewed goes with each
  // question (match_id) instead of opening a separate conversation per page.
  const storageKey = `badminton_chat_session_${currentUserId}`;

  // Kiểm tra hỗ trợ Web Speech API trên trình duyệt
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Tải danh sách các trận đấu có số liệu thống kê để phục vụ So sánh phong độ (có truyền JWT xác thực)
  const fetchAvailableMatches = useCallback(async () => {
    if (availableMatches.length > 0) return;
    setLoadingMatches(true);
    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${COACH_API_URL}/matches`, { headers });
      const data = await res.json();
      if (data && data.matches) {
        setAvailableMatches(data.matches);
        if (data.matches.length >= 2) {
          const defaultA = currentMatchId && data.matches.some((m: MatchOption) => m.id === currentMatchId)
            ? currentMatchId
            : data.matches[0].id;
          const otherMatches = data.matches.filter((m: MatchOption) => m.id !== defaultA);
          const defaultB = otherMatches.length > 0 ? otherMatches[0].id : data.matches[1].id;
          setSelectedMatchA(defaultA);
          setSelectedMatchB(defaultB);
        }
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách trận đấu:', err);
    } finally {
      setLoadingMatches(false);
    }
  }, [availableMatches.length, currentMatchId]);

  // Bật/tắt ghi âm micro giọng nói (Speech-to-Text)
  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      alert('Trình duyệt của bạn chưa hỗ trợ Web Speech API. Hãy sử dụng Google Chrome hoặc Microsoft Edge.');
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = 'vi-VN';
      recognition.interimResults = true;
      recognition.continuous = false;

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        let transcript = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          transcript += event.results[i][0].transcript;
        }
        if (transcript.trim()) {
          setInput(transcript);
        }
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech Recognition error:', event.error);
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err) {
      console.warn('Lỗi khởi động mic:', err);
      setIsListening(false);
    }
  };

  // Đọc to câu trả lời của AI Coach bằng Text-to-Speech
  const handleSpeakMessage = (msgId: string, text: string) => {
    if (!('speechSynthesis' in window)) {
      alert('Trình duyệt không hỗ trợ Text-to-Speech');
      return;
    }

    if (speakingMessageId === msgId) {
      window.speechSynthesis.cancel();
      setSpeakingMessageId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const cleanText = text
      .replace(/\[Pha cầu #\d+\s*-\s*\d+:\d+\]/g, '')
      .replace(/\[Xem trận(?:\s*đấu)?\s*#\d+\]/g, '')
      .replace(/[*#_`|>-]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.lang = 'vi-VN';
    utterance.rate = 1.05;
    utterance.pitch = 1.0;

    utterance.onend = () => setSpeakingMessageId(null);
    utterance.onerror = () => setSpeakingMessageId(null);

    setSpeakingMessageId(msgId);
    window.speechSynthesis.speak(utterance);
  };

  // Tải chi tiết tin nhắn của một Session cụ thể (bảo vệ quyền riêng tư qua browserKey và JWT)
  const loadSessionMessages = useCallback(async (sid: string, restoring = false) => {
    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`${COACH_API_URL}/sessions/${sid}/messages?browser_key=${encodeURIComponent(browserKey)}`, { headers });
      if (!res.ok) {
        if (res.status === 403 || res.status === 401) {
          console.warn('Không có quyền truy cập session này.');
          localStorage.removeItem(storageKey);
          setSessionId(null);
          setMessages([WELCOME_MESSAGE]);
        }
        return;
      }
      const data = await res.json();
      if (restoring && userActedRef.current) return; // the user moved on while this was loading
      if (data && data.messages && data.messages.length > 0) {
        const loaded: Message[] = data.messages.map((m: any) => ({
          id: m.id,
          role: m.role,
          content: m.content,
          video_citations: m.video_citations || [],
          timestamp: m.created_at ? new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : undefined
        }));
        setMessages([WELCOME_MESSAGE, ...loaded]);
        setSessionId(sid);
        localStorage.setItem(storageKey, sid);
      }
    } catch (err) {
      console.warn('Lỗi tải tin nhắn session:', err);
    }
  }, [storageKey, browserKey]);

  // Tải danh sách tất cả các phiên chat của riêng người dùng từ Database
  const fetchSessions = useCallback(async () => {
    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const queryParams = new URLSearchParams({ browser_key: browserKey });

      const res = await fetch(`${COACH_API_URL}/sessions?${queryParams.toString()}`, { headers });
      const data = await res.json();
      if (data && data.sessions) {
        setSessionsList(data.sessions);
        return data.sessions as ChatSessionItem[];
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách session:', err);
    }
    return [];
  }, [browserKey]);

  // 1. Tự động khôi phục lịch sử chat từ Database Supabase khi load trang
  useEffect(() => {
    const initChat = async () => {
      let activeId = localStorage.getItem(storageKey);
      
      if (!activeId) {
        const list = await fetchSessions();
        if (list.length > 0) {
          activeId = list[0].session_id;
        }
      }

      if (userActedRef.current) return;
      if (activeId) {
        setSessionId(activeId);
        await loadSessionMessages(activeId, true);
      } else {
        setSessionId(null);
        setMessages([WELCOME_MESSAGE]);
      }
    };

    initChat();
  }, [storageKey, fetchSessions, loadSessionMessages]);

  // 2. Bấm ra ngoài hoặc bấm Escape thì tự động ẩn khung chat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (chatWindowRef.current && !chatWindowRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && !showHistory && !showCompareModal && !showRecommendModal) {
      scrollToBottom();
    }
  }, [messages, isOpen, showHistory, showCompareModal, showRecommendModal]);

  // Điều hướng video player trên trang đến giây cụ thể (hỗ trợ cả HTML5 Video, YouTube iframe & mở tab Replay nếu ở trang khác)
  const handleSeekVideo = (seconds: number, targetMatchId?: string | number | null) => {
    const currentPath = window.location.pathname;
    const pathMatch = currentPath.match(/\/(?:public-matches|matches)\/(\d+)/);
    const currentUrlMatchId = pathMatch ? pathMatch[1] : null;
    const isOnReplayPage = currentPath.includes('/replay') || (Boolean(currentUrlMatchId) && !currentPath.includes('/edit'));

    const effectiveTargetId = targetMatchId 
      ? String(targetMatchId) 
      : (currentUrlMatchId || (currentMatchId ? String(currentMatchId) : null));

    // Nếu đang ở đúng trang replay của trận đó (hoặc đang ở trang replay và không có chỉ định id khác):
    if (isOnReplayPage && (!effectiveTargetId || effectiveTargetId === currentUrlMatchId)) {
      // 1. Phát CustomEvent cho MatchReplayPage (xử lý cả YouTube iframe lẫn HTML5 video)
      window.dispatchEvent(new CustomEvent('badminton:seek-video', { detail: { seconds } }));

      // 2. Tua trực tiếp thẻ HTML5 video nếu có
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (video) {
        video.currentTime = seconds;
        video.play().catch(() => {});
      }
    } else if (effectiveTargetId) {
      // Nếu đang ở trang khác (trang chủ, danh sách) hoặc ở trận khác: Mở Replay của trận đó trong tab mới kèm tham số ?t=seconds
      const targetUrl = `/public-matches/${effectiveTargetId}/replay?t=${seconds}`;
      window.open(targetUrl, '_blank');
    } else {
      // Fallback
      window.dispatchEvent(new CustomEvent('badminton:seek-video', { detail: { seconds } }));
      const video = document.querySelector('video') as HTMLVideoElement | null;
      if (video) {
        video.currentTime = seconds;
        video.play().catch(() => {});
      }
    }
  };

  // Tạo cuộc trò chuyện mới
  const handleNewChat = () => {
    userActedRef.current = true;
    localStorage.removeItem(storageKey);
    setSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    setShowHistory(false);
    setShowCompareModal(false);
    setShowRecommendModal(false);
    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
    if (speakingMessageId) {
      window.speechSynthesis?.cancel();
      setSpeakingMessageId(null);
    }
  };

  // Gửi tin nhắn với cơ chế STREAMING
  const handleSendMessage = async (textToSend?: string) => {
    userActedRef.current = true;
    const query = textToSend || input;
    if (!query.trim() || loading) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      setIsListening(false);
    }

    const userMsg: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: query,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    const aiMsgId = (Date.now() + 1).toString();
    const initialAiMsg: Message = {
      id: aiMsgId,
      role: 'assistant',
      content: '',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isStreaming: true
    };

    setMessages(prev => [...prev, userMsg, initialAiMsg]);
    if (!textToSend) setInput('');
    setLoading(true);
    setShowCompareModal(false);
    setShowRecommendModal(false);

    try {
      const token = localStorage.getItem('access_token');
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const response = await fetch(`${COACH_API_URL}/chat/stream`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          message: query,
          match_id: currentMatchId,
          session_id: sessionId || undefined,
          browser_key: browserKey
        })
      });

      if (!response.ok || !response.body) {
        throw new Error('Không thể kết nối máy chủ streaming');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      let accumulatedText = '';
      let buffer = '';

      while (true) {
        const { value, done } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5));
              if (data.text) {
                accumulatedText += data.text;
                setMessages(prev =>
                  prev.map(m =>
                    m.id === aiMsgId ? { ...m, content: accumulatedText, isStreaming: true } : m
                  )
                );
              }
              if (data.done) {
                if (data.session_id) {
                  setSessionId(data.session_id);
                  localStorage.setItem(storageKey, data.session_id);
                  fetchSessions();
                }
                setMessages(prev =>
                  prev.map(m =>
                    m.id === aiMsgId
                      ? {
                          ...m,
                          content: accumulatedText,
                          video_citations: data.video_citations || [],
                          isStreaming: false
                        }
                      : m
                  )
                );
              }
            } catch (err) {
              // Ignore line parse error
            }
          }
        }
      }
    } catch (err) {
      setMessages(prev =>
        prev.map(m =>
          m.id === aiMsgId
            ? {
                ...m,
                content: '⚠️ Không kết nối được tới Huấn luyện viên AI. Bạn vui lòng thử lại sau ít phút nhé.',
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

  // Trang khác (hồ sơ VĐV, tab Vì sao mất điểm) nhờ Coach trả lời một câu hỏi: mở khung chat rồi gửi luôn
  const sendRef = useRef(handleSendMessage);
  sendRef.current = handleSendMessage;
  useEffect(() => {
    const onAsk = (e: Event) => {
      const message = (e as CustomEvent<AskCoachDetail>).detail?.message?.trim();
      if (!message) return;
      setIsOpen(true);
      setShowHistory(false);
      setShowCompareModal(false);
      setShowRecommendModal(false);
      if (loading) setInput(message);
      else sendRef.current(message);
    };
    window.addEventListener(ASK_COACH_EVENT, onAsk);
    return () => window.removeEventListener(ASK_COACH_EVENT, onAsk);
  }, [loading]);

  // Các pha cầu khác nhau mà câu trả lời đã nêu, theo thứ tự xuất hiện
  const citedRallies = (msg: Message) => {
    const seen = new Set<number>();
    return (msg.video_citations ?? []).filter(c => !seen.has(c.rally_number) && seen.add(c.rally_number));
  };
  const onReplayPage = /\/(?:matches|public-matches)\/\d+\/replay/.test(location.pathname);

  // Kích hoạt so sánh phong độ 2 trận từ modal
  const handleExecuteComparison = () => {
    if (!selectedMatchA || !selectedMatchB) return;
    if (selectedMatchA === selectedMatchB) {
      alert('Vui lòng chọn 2 trận đấu khác nhau để so sánh phong độ.');
      return;
    }
    const matchAInfo = availableMatches.find(m => m.id === selectedMatchA);
    const matchBInfo = availableMatches.find(m => m.id === selectedMatchB);
    const labelA = matchAInfo ? `${matchAInfo.player_a} vs ${matchAInfo.player_b}` : `#${selectedMatchA}`;
    const labelB = matchBInfo ? `${matchBInfo.player_a} vs ${matchBInfo.player_b}` : `#${selectedMatchB}`;

    const prompt = `Hãy phân tích và so sánh chi tiết phong độ thi đấu giữa Trận #${selectedMatchA} (${labelA}) và Trận #${selectedMatchB} (${labelB}). Lập bảng so sánh chỉ số trực quan và đưa ra nhận xét chiến thuật của HLV.`;
    handleSendMessage(prompt);
  };

  // Kích hoạt khảo sát sở thích & Gợi ý trận đấu từ Questionnaire Modal
  const handleExecuteRecommendation = () => {
    const prompt = `Hãy gợi ý cho tôi các trận đấu cầu lông phù hợp nhất với sở thích của tôi:
- Phong cách chơi ưa thích: ${selectedStyle}
- Kỹ thuật / Cú đánh muốn học hỏi: ${selectedShot}
- Nhịp độ và tính chất trận đấu: ${selectedPace}
Hãy phân tích chi tiết vì sao các trận đấu này phù hợp với tôi và kèm thẻ xem trận đấu!`;
    handleSendMessage(prompt);
  };

  const quickPrompts = currentMatchId
    ? [
        `Phân tích trận đấu số ${currentMatchId} cho tôi?`,
        '🎯 Gợi ý trận đấu phù hợp theo sở thích',
        'So sánh trận này với trận trước đó của cùng vận động viên',
        'Các pha cầu giằng co dài nhất trận này?'
      ]
    : [
        '🎯 Gợi ý trận đấu phù hợp theo sở thích',
        'So sánh phong độ hai trận gần nhất trong thư viện',
        'Luật giao cầu BWF mới nhất cao tối đa bao nhiêu?',
        'Chiến thuật khắc chế đối thủ hay đập cầu?'
      ];

  // Định dạng nội dung tin nhắn, hỗ trợ Headings, Lists, Bold, Clickable Citations, Match Links và Markdown Tables
  const formatContent = (content: string) => {
    const rawLines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    // Tìm match_id bao quát trong cả nội dung tin nhắn nếu có
    const globalMatchId = content.match(/\[Xem trận(?:\s*đấu)?\s*#(\d+)\]/)?.[1]
      || content.match(/(?:Trận|trận)\s*#(\d+)/)?.[1]
      || (currentMatchId ? String(currentMatchId) : null);

    const flushTable = (tableKey: string, tableMatchId?: string | null) => {
      if (tableBuffer.length === 0) return;
      
      const rows = tableBuffer.map(r => 
        r.trim().replace(/^\||\|$/g, '').split('|').map(cell => cell.trim())
      );
      tableBuffer = [];

      if (rows.length < 2) return;
      const headers = rows[0];
      const dataRows = rows.slice(1).filter(r => !r.every(c => /^:?-+:?$/.test(c)));

      elements.push(
        <div key={tableKey} className="my-2.5 overflow-x-auto rounded-lg border border-slate-200 shadow-2xs">
          <table className="w-full text-xs text-left text-slate-700 bg-white">
            <thead className="bg-slate-100 text-slate-900 font-semibold border-b border-slate-200">
              <tr>
                {headers.map((h, i) => (
                  <th key={i} className="px-2.5 py-1.5 whitespace-nowrap">{renderBoldAndCitations(h, tableMatchId)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 font-medium leading-snug">
                      {renderBoldAndCitations(cell, tableMatchId)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    let currentSectionMatchId: string | null = globalMatchId;

    rawLines.forEach((line, idx) => {
      // Nhận diện trận đấu cụ thể nếu dòng/tiêu đề đề cập đến một trận nhất định
      const lineMatchId = line.match(/\[Xem trận(?:\s*đấu)?\s*#(\d+)\]/)?.[1]
        || line.match(/(?:Trận|trận)\s*#(\d+)/)?.[1]
        || currentSectionMatchId;

      if (line.match(/(?:Trận|trận)\s*#(\d+)/)) {
        currentSectionMatchId = line.match(/(?:Trận|trận)\s*#(\d+)/)![1];
      }

      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        tableBuffer.push(line);
      } else {
        if (tableBuffer.length > 0) {
          flushTable(`table-${idx}`, currentSectionMatchId);
        }
        const heading = line.match(/^(#{1,6})\s+(.*)$/);
        if (heading && heading[1].length >= 3) {
          elements.push(<h4 key={idx} className="font-bold text-emerald-800 mt-2 mb-1 text-sm">{renderBoldAndCitations(heading[2].replace(/\*\*/g, ''), lineMatchId)}</h4>);
        } else if (heading) {
          elements.push(<h3 key={idx} className="font-bold text-slate-900 mt-3 mb-1 text-base">{renderBoldAndCitations(heading[2].replace(/\*\*/g, ''), lineMatchId)}</h3>);
        } else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          const text = line.trim().replace(/^[\*\-]\s+/, '');
          elements.push(
            <li key={idx} className="ml-4 list-disc text-sm text-slate-700 my-0.5 leading-relaxed">
              {renderBoldAndCitations(text, lineMatchId)}
            </li>
          );
        } else if (line.trim() === '---') {
          elements.push(<hr key={idx} className="my-2 border-slate-200" />);
        } else if (!line.trim()) {
          elements.push(<div key={idx} className="h-1" />);
        } else {
          elements.push(<p key={idx} className="text-sm text-slate-700 my-0.5 leading-relaxed">{renderBoldAndCitations(line, lineMatchId)}</p>);
        }
      }
    });

    if (tableBuffer.length > 0) {
      flushTable('table-end', currentSectionMatchId);
    }

    return elements;
  };

  const renderBoldAndCitations = (text: string, targetMatchId?: string | null) => {
    // Regex nhận diện in đậm, mốc video [Pha cầu #X - mm:ss], và nút xem trận [Xem trận đấu #X]
    // Also ***bold italic***, *italic* (no space just inside the stars, so "2 * 3" stays text) and `code`.
    const regex =
      /(\*\*\*[^*]+?\*\*\*|\*\*.*?\*\*|\*(?!\s)[^*]+?(?<!\s)\*|`[^`]+`|\[Pha cầu #\d+\s*-\s*\d+:\d+\]|\[Xem trận(?:\s*đấu)?\s*#\d+\])/g;
    const parts = text.split(regex);

    // Bold and italic text is rendered again inside, so a [Xem trận đấu #X] link or a rally time the
    // coach wrote within **…** still becomes a link.
    return parts.map((part, i) => {
      if (part.length > 6 && part.startsWith('***') && part.endsWith('***')) {
        return <strong key={i} className="font-semibold italic text-slate-900">{renderBoldAndCitations(part.slice(3, -3), targetMatchId)}</strong>;
      }
      if (part.length > 4 && part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900">{renderBoldAndCitations(part.slice(2, -2), targetMatchId)}</strong>;
      }
      if (part.length > 2 && part.startsWith('*') && part.endsWith('*')) {
        return <em key={i}>{renderBoldAndCitations(part.slice(1, -1), targetMatchId)}</em>;
      }
      if (part.length > 2 && part.startsWith('`') && part.endsWith('`')) {
        return <code key={i} className="px-1 py-0.5 rounded bg-slate-100 text-[0.85em] font-mono">{part.slice(1, -1)}</code>;
      }
      
      // Mốc xem video pha cầu cụ thể
      const citeMatch = part.match(/\[Pha cầu #(\d+)\s*-\s*(\d+):(\d+)\]/);
      if (citeMatch) {
        const rallyNum = parseInt(citeMatch[1], 10);
        const sec = parseInt(citeMatch[2], 10) * 60 + parseInt(citeMatch[3], 10);
        return (
          <button
            key={i}
            onClick={() => handleSeekVideo(sec, targetMatchId)}
            title={`Bấm để tua video tới pha cầu #${rallyNum} (${citeMatch[2]}:${citeMatch[3]})${targetMatchId ? ` - Trận #${targetMatchId}` : ''}`}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-medium transition-all transform hover:scale-105 shadow-2xs cursor-pointer"
          >
            <Play className="w-2.5 h-2.5 fill-current text-emerald-600" />
            {part}
          </button>
        );
      }

      // Thẻ liên kết mở xem trận đấu được gợi ý
      const matchLink = part.match(/\[Xem trận(?:\s*đấu)?\s*#(\d+)\]/);
      if (matchLink) {
        const matchId = matchLink[1];
        return (
          <a
            key={i}
            href={`/public-matches/${matchId}/replay`}
            target="_blank"
            rel="noopener noreferrer"
            title={`Bấm để xem video trận đấu #${matchId}`}
            className="inline-flex items-center gap-1.5 mx-1 my-0.5 px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold shadow-xs transition-transform hover:scale-105"
          >
            <Play className="w-3 h-3 fill-current" />
            Xem trận #{matchId} ngay
          </a>
        );
      }

      return part;
    });
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" ref={chatWindowRef}>
      {/* NÚT BẬT/TẮT CHAT FLOATING (CHỈ ICON, KHÔNG CHỮ, GIAO DIỆN SÁNG GỌN) */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="group relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-900/20 border-2 border-white hover:border-emerald-200 transition-all duration-300 hover:scale-110 active:scale-95"
          aria-label="Trợ lý AI Coach"
          title="Trợ lý AI Coach"
        >
          <Bot className="w-7 h-7" />
          <span className="absolute top-1 right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* CỬA SỔ CHAT POPUP (GIAO DIỆN SÁNG - LIGHT THEME) */}
      {isOpen && (
        <div className="flex flex-col w-[380px] sm:w-[480px] h-[610px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* HEADER TRẮNG SÁNG */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200/90">
            <div className="flex items-center gap-2">
              {showHistory || showCompareModal || showRecommendModal ? (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => {
                      setShowHistory(false);
                      setShowCompareModal(false);
                      setShowRecommendModal(false);
                    }}
                    className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                    title="Quay lại khung chat"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <h3 className="font-semibold text-sm text-slate-900">
                    {showRecommendModal
                      ? 'Gợi ý trận đấu'
                      : showCompareModal
                      ? 'So sánh phong độ'
                      : 'Lịch sử hội thoại'}
                  </h3>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 border border-emerald-300/60 flex items-center justify-center text-emerald-700 shadow-2xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <span className="px-2 py-0.5 rounded-full text-xs bg-emerald-100 text-emerald-800 font-semibold border border-emerald-300/50">
                    Trợ lý AI
                  </span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-1">
              {/* NÚT MỚI: GỢI Ý TRẬN ĐẤU THEO SỞ THÍCH */}
              <button
                onClick={() => {
                  setShowRecommendModal(!showRecommendModal);
                  setShowCompareModal(false);
                  setShowHistory(false);
                }}
                title="Khảo sát sở thích & Gợi ý trận đấu"
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
                  showRecommendModal
                    ? 'bg-amber-500 text-white shadow-xs'
                    : 'text-amber-700 bg-amber-50 hover:bg-amber-100 border border-amber-200'
                }`}
              >
                <Sparkles className="w-4 h-4 text-amber-500 hover:text-amber-600" />
                <span className="hidden sm:inline">Gợi ý trận</span>
              </button>

              {/* NÚT: SO SÁNH PHONG ĐỘ 2 TRẬN */}
              <button
                onClick={() => {
                  fetchAvailableMatches();
                  setShowCompareModal(!showCompareModal);
                  setShowRecommendModal(false);
                  setShowHistory(false);
                }}
                title="So sánh phong độ giữa 2 trận đấu"
                className={`p-1.5 rounded-lg transition-colors flex items-center gap-1 text-xs font-medium ${
                  showCompareModal
                    ? 'bg-emerald-600 text-white'
                    : 'text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200'
                }`}
              >
                <Scale className="w-4 h-4" />
                <span className="hidden sm:inline">So sánh</span>
              </button>

              {/* LỊCH SỬ CHAT */}
              <button
                onClick={() => {
                  fetchSessions();
                  setShowHistory(!showHistory);
                  setShowCompareModal(false);
                  setShowRecommendModal(false);
                }}
                title={showHistory ? 'Xem khung chat hiện tại' : 'Xem lịch sử hội thoại'}
                className={`p-1.5 rounded-lg transition-colors ${
                  showHistory ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <History className="w-4 h-4" />
              </button>

              {/* TẠO MỚI */}
              <button
                onClick={handleNewChat}
                title="Bắt đầu cuộc trò chuyện mới (+)"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* THU NHỎ */}
              <button
                onClick={() => setIsOpen(false)}
                title="Thu nhỏ"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CHẾ ĐỘ 1: PANEL KHẢO SÁT SỞ THÍCH GỢI Ý TRẬN ĐẤU */}
          {showRecommendModal ? (
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col justify-between space-y-4">
              <div className="space-y-4">
                <div className="bg-amber-50 border border-amber-200/80 rounded-xl p-3 text-xs text-amber-900 leading-relaxed">
                  <p className="font-semibold mb-1 flex items-center gap-1.5 text-amber-800">
                    <Sparkles className="w-4 h-4 text-amber-600" />
                    Hệ thống gợi ý trận đấu thông minh (Match Recommender):
                  </p>
                  Hãy chọn các tiêu chí bạn quan tâm nhất. AI Coach sẽ đối chiếu dữ liệu thống kê của các trận đấu để gợi ý những màn so tài đỉnh cao phù hợp nhất với bạn!
                </div>

                {/* CÂU HỎI 1: PHONG CÁCH CHƠI */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Target className="w-3.5 h-3.5 text-emerald-600" />
                    1. Bạn yêu thích phong cách thi đấu nào nhất?
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {STYLE_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedStyle(opt.label)}
                        className={`w-full text-left p-2.5 rounded-xl border text-xs transition-all flex items-start gap-2.5 ${
                          selectedStyle === opt.label
                            ? 'bg-emerald-50 border-emerald-500 text-emerald-950 font-medium shadow-2xs ring-1 ring-emerald-400'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 mt-0.5 shrink-0 ${
                            selectedStyle === opt.label ? 'text-emerald-600 fill-emerald-100' : 'text-slate-300'
                          }`}
                        />
                        <div>
                          <div className="font-semibold">{opt.label}</div>
                          <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CÂU HỎI 2: CÚ ĐÁNH / KỸ THUẬT MUỐN HỌC */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-amber-500" />
                    2. Cú đánh hoặc kỹ thuật bạn muốn học hỏi?
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {SHOT_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedShot(opt.label)}
                        className={`w-full text-left p-2 rounded-xl border text-xs transition-all flex items-center gap-2 ${
                          selectedShot === opt.label
                            ? 'bg-amber-50 border-amber-500 text-amber-950 font-medium shadow-2xs ring-1 ring-amber-400'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            selectedShot === opt.label ? 'text-amber-600 fill-amber-100' : 'text-slate-300'
                          }`}
                        />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* CÂU HỎI 3: NHỊP ĐỘ & TÍNH CHẤT TRẬN ĐẤU */}
                <div>
                  <label className="block text-xs font-bold text-slate-800 mb-2 flex items-center gap-1.5">
                    <Shield className="w-3.5 h-3.5 text-blue-500" />
                    3. Nhịp độ và tính chất trận đấu mong muốn?
                  </label>
                  <div className="grid grid-cols-1 gap-1.5">
                    {PACE_OPTIONS.map(opt => (
                      <button
                        key={opt.id}
                        type="button"
                        onClick={() => setSelectedPace(opt.label)}
                        className={`w-full text-left p-2 rounded-xl border text-xs transition-all flex items-center gap-2 ${
                          selectedPace === opt.label
                            ? 'bg-blue-50 border-blue-500 text-blue-950 font-medium shadow-2xs ring-1 ring-blue-400'
                            : 'bg-white border-slate-200 hover:border-slate-300 text-slate-700'
                        }`}
                      >
                        <CheckCircle2
                          className={`w-4 h-4 shrink-0 ${
                            selectedPace === opt.label ? 'text-blue-600 fill-blue-100' : 'text-slate-300'
                          }`}
                        />
                        <span>{opt.label}</span>
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* NÚT XÁC NHẬN HOÀN THÀNH */}
              <div className="pt-3 border-t border-slate-200 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowRecommendModal(false)}
                  className="flex-1 py-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleExecuteRecommendation}
                  disabled={loading}
                  className="flex-[2] py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-emerald-600 hover:from-amber-600 hover:to-emerald-700 disabled:opacity-50 text-white text-xs font-semibold transition-all shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Sparkles className="w-4 h-4 fill-current" />
                  Xác nhận & Gợi ý ngay
                </button>
              </div>
            </div>
          ) : showCompareModal ? (
            /* CHẾ ĐỘ 2: PANEL SO SÁNH PHONG ĐỘ 2 TRẬN ĐẤU */
            <div className="flex-1 p-4 overflow-y-auto bg-slate-50 flex flex-col justify-between">
              <div className="space-y-4">
                <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-3 text-xs text-emerald-900 leading-relaxed">
                  <p className="font-semibold mb-1 flex items-center gap-1.5">
                    <Scale className="w-4 h-4 text-emerald-700" />
                    Tính năng so sánh phong độ chéo (Cross-match Analytics):
                  </p>
                  AI Coach sẽ lấy số liệu kỹ thuật thực tế của cả 2 trận (tỷ lệ thuận/trái tay, thời lượng rally, các loại điểm số) để đối chiếu sự tiến bộ, điểm rơi thể lực và chiến thuật.
                </div>

                {loadingMatches ? (
                  <div className="py-12 flex flex-col items-center justify-center text-slate-500 gap-2">
                    <Loader2 className="w-6 h-6 animate-spin text-emerald-600" />
                    <span className="text-xs">Đang tải danh sách trận đấu...</span>
                  </div>
                ) : (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Trận đấu A (Mốc đối chiếu):
                      </label>
                      <select
                        value={selectedMatchA}
                        onChange={e => setSelectedMatchA(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      >
                        {availableMatches.map(m => (
                          <option key={`a-${m.id}`} value={m.id}>
                            #{m.id} - {m.player_a} vs {m.player_b} ({m.total_strokes} cú đánh)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="flex justify-center my-1 text-slate-400">
                      <span className="text-xs font-bold uppercase tracking-wider bg-slate-200/70 px-2 py-0.5 rounded-full">
                        Đối đầu với
                      </span>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-slate-700 mb-1">
                        Trận đấu B (Trận so sánh):
                      </label>
                      <select
                        value={selectedMatchB}
                        onChange={e => setSelectedMatchB(Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:border-emerald-600 shadow-2xs"
                      >
                        {availableMatches.map(m => (
                          <option key={`b-${m.id}`} value={m.id}>
                            #{m.id} - {m.player_a} vs {m.player_b} ({m.total_strokes} cú đánh)
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-slate-200 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setShowCompareModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
                  type="button"
                  onClick={handleExecuteComparison}
                  disabled={!selectedMatchA || !selectedMatchB || selectedMatchA === selectedMatchB || loading}
                  className="flex-1 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white text-xs font-medium transition-colors shadow-sm flex items-center justify-center gap-1.5"
                >
                  <Scale className="w-3.5 h-3.5" />
                  So sánh ngay
                </button>
              </div>
            </div>
          ) : showHistory ? (
            /* CHẾ ĐỘ 3: LỊCH SỬ HỘI THOẠI */
            <div className="flex-1 p-3 overflow-y-auto bg-slate-50 divide-y divide-slate-200/80">
              <div className="mb-2 flex items-center justify-between px-1">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Các phiên trò chuyện</span>
                <button
                  onClick={handleNewChat}
                  className="flex items-center gap-1 text-xs text-emerald-700 font-medium hover:underline"
                >
                  <Plus className="w-3.5 h-3.5" /> Tạo phiên mới
                </button>
              </div>

              {sessionsList.length === 0 ? (
                <div className="text-center py-12 text-slate-400 text-xs">
                  Chưa có lịch sử cuộc trò chuyện nào được lưu.
                </div>
              ) : (
                sessionsList.map(s => (
                  <button
                    key={s.session_id}
                    onClick={() => {
                      loadSessionMessages(s.session_id);
                      setShowHistory(false);
                    }}
                    className={`w-full text-left p-3 rounded-xl transition-all my-1 flex flex-col gap-1 ${
                      sessionId === s.session_id
                        ? 'bg-emerald-50 border border-emerald-300/80 text-emerald-950 font-medium shadow-2xs'
                        : 'bg-white hover:bg-slate-100/90 border border-slate-200 text-slate-700'
                    }`}
                  >
                    <div className="text-sm line-clamp-2 leading-snug">
                      {s.title}
                    </div>
                    <div className="text-[11px] text-slate-400 flex items-center justify-between">
                      <span>{s.match_id ? `Trận đấu #${s.match_id}` : 'Hỏi đáp chung'}</span>
                      <span>{s.created_at ? new Date(s.created_at).toLocaleDateString() : ''}</span>
                    </div>
                  </button>
                ))
              )}
            </div>
          ) : (
            /* CHẾ ĐỘ 4: KHUNG CHAT TIN NHẮN (NỀN TRẮNG SÁNG) */
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
                {/* An answer with no text yet is shown by the "Coach đang suy nghĩ" line below, not as an empty bubble. */}
                {messages.filter(msg => !(msg.role === 'assistant' && msg.isStreaming && !msg.content)).map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 shadow-2xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none shadow-2xs'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap">{msg.content}</p>
                      ) : (
                        <div>
                          {formatContent(msg.content)}
                          {msg.isStreaming && (
                            <span className="inline-block w-1.5 h-3.5 ml-1 bg-emerald-600 animate-pulse align-middle" />
                          )}
                        </div>
                      )}

                      {msg.role === 'assistant' && !msg.isStreaming && onReplayPage && citedRallies(msg).length >= 2 && (
                        <button
                          type="button"
                          onClick={() => {
                            const cited = citedRallies(msg);
                            playRallies(
                              cited.map(c => ({ rallyNumber: c.rally_number, seconds: c.seconds })),
                              `Coach AI · ${cited.length} pha`
                            );
                          }}
                          className="mt-2 w-full h-8 rounded-lg border border-emerald-300 bg-emerald-50 text-xs font-semibold text-emerald-800 hover:bg-emerald-100 flex items-center justify-center gap-1.5 transition-colors"
                        >
                          <Play className="w-3.5 h-3.5" />
                          Phát liên tục {citedRallies(msg).length} pha
                        </button>
                      )}

                      <div className="flex items-center justify-between mt-1.5 pt-1 border-t border-slate-100/60 text-[10px]">
                        {msg.role === 'assistant' && msg.content && (
                          <button
                            onClick={() => handleSpeakMessage(msg.id, msg.content)}
                            title={speakingMessageId === msg.id ? 'Dừng đọc giọng nói' : 'Đọc câu trả lời bằng giọng nói (Voice)'}
                            className={`flex items-center gap-1 transition-colors px-1 py-0.5 rounded ${
                              speakingMessageId === msg.id
                                ? 'text-rose-600 font-bold bg-rose-50 animate-pulse'
                                : 'text-slate-400 hover:text-emerald-700 hover:bg-slate-100'
                            }`}
                          >
                            {speakingMessageId === msg.id ? (
                              <>
                                <VolumeX className="w-3 h-3 text-rose-600" />
                                <span>Đang đọc...</span>
                              </>
                            ) : (
                              <>
                                <Volume2 className="w-3 h-3" />
                                <span>Nghe Coach đọc</span>
                              </>
                            )}
                          </button>
                        )}
                        <span
                          className={`ml-auto ${
                            msg.role === 'user' ? 'text-emerald-100/80' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </span>
                      </div>
                    </div>
                  </div>
                ))}

                {loading && messages[messages.length - 1]?.content === '' && (
                  <div className="flex gap-2.5 justify-start items-center">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 rounded-bl-none text-slate-500 text-xs flex items-center gap-2 shadow-2xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Coach đang suy nghĩ và phân tích dữ liệu...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* GỢI Ý CÂU HỎI NHANH */}
              {messages.length <= 2 && (
                <div className="px-3 py-2 bg-white border-t border-slate-100 flex gap-1.5 overflow-x-auto no-scrollbar">
                  {quickPrompts.map((p, i) => (
                    <button
                      key={i}
                      onClick={() => {
                        if (p.includes('Gợi ý trận đấu')) {
                          setShowRecommendModal(true);
                        } else {
                          handleSendMessage(p);
                        }
                      }}
                      className={`shrink-0 px-2.5 py-1 rounded-full text-xs transition-colors border ${
                        p.includes('Gợi ý trận đấu')
                          ? 'bg-amber-50 hover:bg-amber-100 text-amber-800 border-amber-200 font-medium'
                          : 'bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border-slate-200/80 hover:border-emerald-200'
                      }`}
                    >
                      {p}
                    </button>
                  ))}
                </div>
              )}

              {/* BANNER KHI ĐANG LẮNG NGHE GIỌNG NÓI VOICE MIC */}
              {isListening && (
                <div className="px-3 py-1.5 bg-rose-50 border-t border-rose-200 flex items-center justify-between text-xs text-rose-700 animate-pulse">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600 animate-ping inline-block" />
                    <span className="font-medium">Đang lắng nghe giọng nói của bạn... Hãy nói câu hỏi!</span>
                  </div>
                  <button
                    onClick={toggleListening}
                    className="p-1 rounded hover:bg-rose-100 text-rose-800 text-[11px] font-bold underline"
                  >
                    Dừng
                  </button>
                </div>
              )}

              {/* THANH GÕ CÂU HỎI & NÚT MICROPHONE GIỌNG NÓI */}
              <div className="p-3 bg-white border-t border-slate-200">
                <form
                  onSubmit={e => {
                    e.preventDefault();
                    handleSendMessage();
                  }}
                  className="flex items-center gap-2"
                >
                  <input
                    type="text"
                    value={input}
                    onChange={e => setInput(e.target.value)}
                    placeholder={
                      isListening
                        ? 'Đang nhận diện giọng nói...'
                        : currentMatchId
                        ? `Hỏi Coach về trận #${currentMatchId} hoặc so sánh phong độ...`
                        : 'Hỏi về luật BWF, gợi ý trận đấu, chiến thuật...'
                    }
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                    disabled={loading}
                  />

                  {/* NÚT 1: MICROPHONE VOICE MIC (SPEECH-TO-TEXT) */}
                  <button
                    type="button"
                    onClick={toggleListening}
                    title={
                      !speechSupported
                        ? 'Trình duyệt không hỗ trợ Web Speech API'
                        : isListening
                        ? 'Bấm để dừng ghi âm giọng nói'
                        : 'Bấm để nói bằng giọng nói (Voice Mic)'
                    }
                    className={`p-2 rounded-xl transition-all shrink-0 shadow-2xs ${
                      isListening
                        ? 'bg-rose-600 text-white animate-pulse ring-2 ring-rose-400'
                        : 'bg-slate-100 hover:bg-emerald-50 text-slate-600 hover:text-emerald-700 border border-slate-200'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                  </button>

                  {/* NÚT 2: GỬI TIN NHẮN */}
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    aria-label="Gửi tin nhắn"
                    title="Gửi tin nhắn"
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition-colors shrink-0 shadow-2xs"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};
