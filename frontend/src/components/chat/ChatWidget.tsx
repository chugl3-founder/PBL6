import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import { Send, Bot, Play, Minimize2, History, Plus, ChevronLeft } from 'lucide-react';

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

const COACH_API_URL = 'http://localhost:8000';

const WELCOME_MESSAGE: Message = {
  id: 'welcome',
  role: 'assistant',
  content: 'Xin chào! Tôi là **BadmintonAI Coach** — Huấn luyện viên ảo & Chuyên gia trinh sát chiến thuật của bạn.\n\nTôi có thể giải đáp **Luật BWF**, tư vấn **chiến thuật & kỹ thuật**, hoặc **phân tích số liệu và các pha cầu** của trận đấu.',
  timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
};

export const ChatWidget: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [sessionsList, setSessionsList] = useState<ChatSessionItem[]>([]);
  const [messages, setMessages] = useState<Message[]>([WELCOME_MESSAGE]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const location = useLocation();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatWindowRef = useRef<HTMLDivElement>(null);

  // Nhận diện matchId từ URL (ví dụ: /matches/2 hoặc /public-matches/2/replay)
  const matchMatch = location.pathname.match(/\/(?:matches|public-matches)\/(\d+)/);
  const currentMatchId = matchMatch ? parseInt(matchMatch[1], 10) : undefined;

  const storageKey = `badminton_chat_session_${currentMatchId || 'global'}`;

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

  // 1. Tự động khôi phục lịch sử chat từ Database Supabase khi reload / load trang
  useEffect(() => {
    const initChat = async () => {
      let activeId = localStorage.getItem(storageKey);
      
      // Nếu chưa có trong localStorage, tự động lấy session gần nhất từ Database Supabase
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

  // 2. Bấm ra ngoài màn hình hoặc bấm phím Escape thì tự động ẩn khung chat
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
    if (isOpen && !showHistory) {
      scrollToBottom();
    }
  }, [messages, isOpen, showHistory]);

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
  };

  // Gửi tin nhắn với cơ chế STREAMING: AI trả về đến đâu hiển thị ngay đến đó
  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || input;
    if (!query.trim() || loading) return;

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

  const quickPrompts = currentMatchId
    ? [
        `Phân tích trận đấu số ${currentMatchId} cho tôi?`,
        'Các pha cầu giằng co dài nhất trận này?',
        'Tỷ lệ thuận tay và trái tay của 2 tay vợt?',
        'Luật giao cầu BWF 2025 quy định thế nào?'
      ]
    : [
        'Luật giao cầu BWF mới nhất cao tối đa bao nhiêu?',
        'Chiến thuật khắc chế đối thủ hay đập cầu?',
        'Cách phòng ngừa chấn thương khớp gối trong cầu lông?',
        'Bài tập tăng lực phát cầu và gập cổ tay?'
      ];

  const formatContent = (content: string) => {
    return content.split('\n').map((line, idx) => {
      if (line.startsWith('### ')) {
        return <h4 key={idx} className="font-bold text-emerald-800 mt-2 mb-1 text-sm">{line.replace('### ', '')}</h4>;
      }
      if (line.startsWith('## ')) {
        return <h3 key={idx} className="font-bold text-slate-900 mt-3 mb-1 text-base">{line.replace('## ', '')}</h3>;
      }
      if (line.trim().startsWith('* ') || line.trim().startsWith('- ')) {
        const text = line.trim().replace(/^[\*\-]\s+/, '');
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-slate-700 my-0.5 leading-relaxed">
            {renderBoldAndCitations(text)}
          </li>
        );
      }
      if (line.trim() === '---') {
        return <hr key={idx} className="my-2 border-slate-200" />;
      }
      if (!line.trim()) {
        return <div key={idx} className="h-1.5" />;
      }
      return <p key={idx} className="text-sm text-slate-700 my-0.5 leading-relaxed">{renderBoldAndCitations(line)}</p>;
    });
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
            className="inline-flex items-center gap-1 mx-1 px-2 py-0.5 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-mono font-medium transition-all transform hover:scale-105 shadow-xs"
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
        <div className="flex flex-col w-[380px] sm:w-[440px] h-[580px] bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden">
          {/* HEADER TRẮNG SÁNG TINH TẾ */}
          <div className="flex items-center justify-between px-4 py-3 bg-slate-50 border-b border-slate-200/90">
            <div className="flex items-center gap-2.5">
              {showHistory ? (
                <button
                  onClick={() => setShowHistory(false)}
                  className="p-1 rounded-lg hover:bg-slate-200 text-slate-600 transition-colors"
                  title="Quay lại khung chat"
                >
                  <ChevronLeft className="w-5 h-5" />
                </button>
              ) : (
                <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-300/60 flex items-center justify-center text-emerald-700 shadow-xs">
                  <Bot className="w-5 h-5" />
                </div>
              )}
              <div>
                <div className="flex items-center gap-1.5">
                  <h3 className="font-semibold text-sm text-slate-900">
                    {showHistory ? 'Lịch sử trò chuyện' : 'BadmintonAI Coach'}
                  </h3>
                  {!showHistory && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-100 text-emerald-700 font-medium border border-emerald-300/50">
                      Trợ lý AI
                    </span>
                  )}
                </div>
                <p className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                  {showHistory
                    ? `${sessionsList.length} cuộc hội thoại đã lưu`
                    : currentMatchId
                    ? `Đang theo dõi trận #${currentMatchId}`
                    : 'Sẵn sàng hỗ trợ'}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                onClick={() => {
                  fetchSessions();
                  setShowHistory(!showHistory);
                }}
                title={showHistory ? "Xem khung chat hiện tại" : "Xem tất cả lịch sử hội thoại cũ"}
                className={`p-1.5 rounded-lg transition-colors ${
                  showHistory ? 'bg-emerald-100 text-emerald-800' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-200/60'
                }`}
              >
                <History className="w-4 h-4" />
              </button>
              <button
                onClick={handleNewChat}
                title="Bắt đầu cuộc trò chuyện mới (+)"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              >
                <Plus className="w-4 h-4" />
              </button>
              <button
                onClick={() => setIsOpen(false)}
                title="Thu nhỏ"
                className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-200/60 transition-colors"
              >
                <Minimize2 className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* CHẾ ĐỘ 1: DANH SÁCH LỊCH SỬ CÁC CUỘC TRÒ CHUYỆN (SESSIONS DRAWER) */}
          {showHistory ? (
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
                        ? 'bg-emerald-50 border border-emerald-300/80 text-emerald-950 font-medium shadow-xs'
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
            /* CHẾ ĐỘ 2: KHUNG CHAT TIN NHẮN (NỀN TRẮNG SÁNG) */
            <>
              <div className="flex-1 p-4 overflow-y-auto space-y-3.5 bg-slate-50/60">
                {messages.map(msg => (
                  <div
                    key={msg.id}
                    className={`flex gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5 shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div
                      className={`max-w-[85%] rounded-2xl px-3.5 py-2.5 text-sm ${
                        msg.role === 'user'
                          ? 'bg-emerald-600 text-white rounded-br-none shadow-sm'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none shadow-xs'
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

                      {msg.timestamp && (
                        <div
                          className={`text-[10px] mt-1.5 text-right ${
                            msg.role === 'user' ? 'text-emerald-100/80' : 'text-slate-400'
                          }`}
                        >
                          {msg.timestamp}
                        </div>
                      )}
                    </div>
                  </div>
                ))}

                {loading && messages[messages.length - 1]?.content === '' && (
                  <div className="flex gap-2.5 justify-start items-center">
                    <div className="w-7 h-7 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                      <Bot className="w-4 h-4 animate-spin" />
                    </div>
                    <div className="bg-white border border-slate-200 rounded-2xl px-3.5 py-2 rounded-bl-none text-slate-500 text-xs flex items-center gap-2 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                      <span>Coach đang suy nghĩ và tra cứu...</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* GỢI Ý CÂU HỎI NHANH (QUICK PROMPTS NỀN SÁNG) */}
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

              {/* THANH GÕ CÂU HỎI */}
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
                    placeholder={currentMatchId ? `Hỏi Coach về trận #${currentMatchId} hoặc luật cầu lông...` : 'Hỏi về luật BWF, chiến thuật, chấn thương...'}
                    className="flex-1 bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 placeholder-slate-400 focus:outline-none focus:bg-white focus:border-emerald-600 focus:ring-1 focus:ring-emerald-600 transition-colors"
                    disabled={loading}
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="p-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 disabled:opacity-40 disabled:hover:bg-emerald-600 text-white transition-colors shrink-0 shadow-xs"
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
