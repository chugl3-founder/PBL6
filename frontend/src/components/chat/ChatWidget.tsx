import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { 
  Send, Bot, Play, Minimize2, History, Plus, ChevronLeft, 
  Mic, MicOff, Volume2, VolumeX, Scale, Loader2 
} from 'lucide-react';

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

const COACH_API_URL = 'http://localhost:8000';

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Xin chào! Tôi là **BadmintonAI Coach** — Huấn luyện viên ảo & Chuyên gia trinh sát chiến thuật của bạn.\n\nTôi có thể giải đáp **Luật BWF**, tư vấn **chiến thuật & kỹ thuật**, **so sánh phong độ giữa 2 trận đấu**, hoặc **phân tích số liệu và các pha cầu**.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showCompareModal, setShowCompareModal] = useState(false);
  const [sessionsList, setSessionsList] = useState<ChatSessionItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

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

  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Nhận diện matchId từ URL (ví dụ: /matches/2 hoặc /public-matches/2/replay)
  const matchMatch = location.pathname.match(/\/(?:matches|public-matches)\/(\d+)/);
  const currentMatchId = matchMatch ? parseInt(matchMatch[1], 10) : undefined;

  const storageKey = `badminton_chat_session_${currentMatchId || 'global'}`;

  // Kiểm tra hỗ trợ Web Speech API trên trình duyệt
  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (!SpeechRecognition) {
      setSpeechSupported(false);
    }
  }, []);

  // Tải danh sách các trận đấu có số liệu thống kê để phục vụ So sánh phong độ
  const fetchAvailableMatches = useCallback(async () => {
    if (availableMatches.length > 0) return;
    setLoadingMatches(true);
    try {
      const res = await fetch(`${COACH_API_URL}/api/matches/list`);
      const data = await res.json();
      if (data && data.matches) {
        setAvailableMatches(data.matches);
        if (data.matches.length >= 2) {
          // Gợi ý trận mốc A là trận hiện tại (nếu có), trận B là trận khác
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
    // Loại bỏ các cú pháp markdown trước khi đọc
    const cleanText = text
      .replace(/\[Pha cầu #\d+\s*-\s*\d+:\d+\]/g, '')
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

  // Tải chi tiết tin nhắn của một Session cụ thể
  const loadSessionMessages = useCallback(async (sid: string) => {
    try {
      const res = await fetch(`${COACH_API_URL}/api/chat/history/${sid}`);
      const data = await res.json();
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
  }, [storageKey]);

  // Tải danh sách tất cả các phiên chat từ Database
  const fetchSessions = useCallback(async () => {
    try {
      const res = await fetch(`${COACH_API_URL}/api/chat/sessions${currentMatchId ? `?match_id=${currentMatchId}` : ''}`);
      const data = await res.json();
      if (data && data.sessions) {
        setSessionsList(data.sessions);
        return data.sessions as ChatSessionItem[];
      }
    } catch (err) {
      console.warn('Lỗi lấy danh sách session:', err);
    }
    return [];
  }, [currentMatchId]);

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

      if (activeId) {
        setSessionId(activeId);
        await loadSessionMessages(activeId);
      } else {
        setSessionId(null);
        setMessages([WELCOME_MESSAGE]);
      }
    };

    initChat();
  }, [currentMatchId, storageKey, fetchSessions, loadSessionMessages]);

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
    if (isOpen && !showHistory && !showCompareModal) {
      scrollToBottom();
    }
  }, [messages, isOpen, showHistory, showCompareModal]);

  // Hàm điều hướng video player trên trang đến giây cụ thể
  const handleSeekVideo = (seconds: number) => {
    const video = document.querySelector('video') as HTMLVideoElement | null;
    if (video) {
      video.currentTime = seconds;
      video.play().catch(() => {});
    }
  };

  // Tạo cuộc trò chuyện mới
  const handleNewChat = () => {
    localStorage.removeItem(storageKey);
    setSessionId(null);
    setMessages([WELCOME_MESSAGE]);
    setShowHistory(false);
    setShowCompareModal(false);
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

    try {
      const response = await fetch(`${COACH_API_URL}/api/chat/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: query,
          match_id: currentMatchId,
          session_id: sessionId || undefined
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
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.replace('data: ', ''));
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
                content: '⚠️ Không thể kết nối tới BadmintonAI Coach Service. Vui lòng đảm bảo service Python cổng 8000 đang chạy.',
                isStreaming: false
              }
            : m
        )
      );
    } finally {
      setLoading(false);
    }
  };

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

  const quickPrompts = currentMatchId
    ? [
        `Phân tích trận đấu số ${currentMatchId} cho tôi?`,
        'So sánh phong độ trận này với trận #287',
        'Các pha cầu giằng co dài nhất trận này?',
        'Tỷ lệ thuận tay và trái tay của 2 tay vợt?'
      ]
    : [
        'So sánh phong độ giữa trận 294 và trận 287',
        'Luật giao cầu BWF mới nhất cao tối đa bao nhiêu?',
        'Chiến thuật khắc chế đối thủ hay đập cầu?',
        'Cách phòng ngừa chấn thương khớp gối trong cầu lông?'
      ];

  // Định dạng nội dung tin nhắn, hỗ trợ Headings, Lists, Bold, Clickable Citations và Markdown Tables
  const formatContent = (content: string) => {
    const rawLines = content.split('\n');
    const elements: React.ReactNode[] = [];
    let tableBuffer: string[] = [];

    const flushTable = (tableKey: string) => {
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
                  <th key={i} className="px-2.5 py-1.5 whitespace-nowrap">{renderBoldAndCitations(h)}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {dataRows.map((row, rIdx) => (
                <tr key={rIdx} className={rIdx % 2 === 1 ? 'bg-slate-50/70' : 'bg-white'}>
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="px-2.5 py-1.5 font-medium leading-snug">
                      {renderBoldAndCitations(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
    };

    rawLines.forEach((line, idx) => {
      if (line.trim().startsWith('|') && line.trim().endsWith('|')) {
        tableBuffer.push(line);
      } else {
        if (tableBuffer.length > 0) {
          flushTable(`table-${idx}`);
        }
        if (line.startsWith('### ')) {
          elements.push(<h4 key={idx} className="font-bold text-emerald-800 mt-2 mb-1 text-sm">{line.replace('### ', '')}</h4>);
        } else if (line.startsWith('## ')) {
          elements.push(<h3 key={idx} className="font-bold text-slate-900 mt-3 mb-1 text-base">{line.replace('## ', '')}</h3>);
        } else if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
          const text = line.trim().replace(/^[\*\-]\s+/, '');
          elements.push(
            <li key={idx} className="ml-4 list-disc text-sm text-slate-700 my-0.5 leading-relaxed">
              {renderBoldAndCitations(text)}
            </li>
          );
        } else if (line.trim() === '---') {
          elements.push(<hr key={idx} className="my-2 border-slate-200" />);
        } else if (!line.trim()) {
          elements.push(<div key={idx} className="h-1" />);
        } else {
          elements.push(<p key={idx} className="text-sm text-slate-700 my-0.5 leading-relaxed">{renderBoldAndCitations(line)}</p>);
        }
      }
    });

    if (tableBuffer.length > 0) {
      flushTable('table-end');
    }

    return elements;
  };

  const renderBoldAndCitations = (text: string) => {
    const regex = /(\*\*.*?\*\*|\[Pha cầu #\d+\s*-\s*\d+:\d+\])/g;
    const parts = text.split(regex);

    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="font-semibold text-slate-900">{part.slice(2, -2)}</strong>;
      }
      const citeMatch = part.match(/\[Pha cầu #(\d+)\s*-\s*(\d+):(\d+)\]/);
      if (citeMatch) {
        const rallyNum = parseInt(citeMatch[1], 10);
        const sec = parseInt(citeMatch[2], 10) * 60 + parseInt(citeMatch[3], 10);
        return (
          <button
            key={i}
            onClick={() => handleSeekVideo(sec)}
            title={`Bấm để tua video tới pha cầu #${rallyNum} (${citeMatch[2]}:${citeMatch[3]})`}
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-medium transition-all transform hover:scale-105 shadow-2xs"
          >
            <Play className="w-2.5 h-2.5 fill-current text-emerald-600" />
            {part}
          </button>
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
          aria-label="Mở trợ lý ảo AI"
        >
          <Bot className="w-7 h-7" />
          <span className="absolute top-1 right-1 w-3 h-3 bg-amber-400 rounded-full border-2 border-white animate-pulse" />
        </button>
      )}

      {/* CỬA SỔ CHAT POPUP (GIAO DIỆN SÁNG - LIGHT THEME) */}
      {isOpen && (
        <div className="flex flex-col w-[380px] sm:w-[460px] h-[600px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* HEADER TRẮNG SÁNG */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200/90">
            <div className="flex items-center gap-2.5">
              {showHistory || showCompareModal ? (
                <button
                  onClick={() => {
                    setShowHistory(false);
                    setShowCompareModal(false);
                  }}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Quay lại khung chat"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300/60 flex items-center justify-center text-emerald-700 shadow-2xs">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-slate-900">
                    {showCompareModal
                      ? 'So sánh phong độ 2 trận'
                      : showHistory
                      ? 'Lịch sử trò chuyện'
                      : 'BadmintonAI Coach'}
                  </h3>
                  {!showHistory && !showCompareModal && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-medium border border-emerald-300/50">
                      Trợ lý AI
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  {showCompareModal
                    ? 'Chọn 2 trận để AI đối chiếu chỉ số'
                    : showHistory
                    ? `${sessionsList.length} cuộc hội thoại đã lưu`
                    : currentMatchId
                    ? `Đang theo dõi trận #${currentMatchId}`
                    : 'Sẵn sàng hỗ trợ (Voice & RAG)'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              {/* NÚT TÍNH NĂNG 3: SO SÁNH PHONG ĐỘ 2 TRẬN */}
              <button
                onClick={() => {
                  fetchAvailableMatches();
                  setShowCompareModal(!showCompareModal);
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

          {/* CHẾ ĐỘ 1: PANEL SO SÁNH PHONG ĐỘ 2 TRẬN ĐẤU */}
          {showCompareModal ? (
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
                  onClick={() => setShowCompareModal(false)}
                  className="flex-1 py-2 rounded-xl border border-slate-200 bg-white hover:bg-slate-100 text-slate-700 text-xs font-medium transition-colors"
                >
                  Hủy
                </button>
                <button
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
            /* CHẾ ĐỘ 2: LỊCH SỬ HỘI THOẠI */
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
            /* CHẾ ĐỘ 3: KHUNG CHAT TIN NHẮN (NỀN TRẮNG SÁNG) */
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
                {messages.map(msg => (
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
                      onClick={() => handleSendMessage(p)}
                      className="shrink-0 px-2.5 py-1 rounded-full bg-slate-100 hover:bg-emerald-50 text-slate-700 hover:text-emerald-700 border border-slate-200/80 hover:border-emerald-200 text-xs transition-colors"
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
                        : 'Hỏi về luật BWF, so sánh 2 trận, chiến thuật...'
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
