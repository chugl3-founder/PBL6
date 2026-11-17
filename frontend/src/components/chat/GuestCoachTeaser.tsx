import React, { useEffect, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Bot, X, Scale, Sparkles, BookOpen } from 'lucide-react';

/**
 * Guests see the same chat bubble as signed-in users, so the AI Coach stays discoverable;
 * opening it explains what the coach does and asks them to sign in instead of starting a chat.
 */
export const GuestCoachTeaser: React.FC = () => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const location = useLocation();

  useEffect(() => setOpen(false), [location.pathname]);

  useEffect(() => {
    if (!open) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);

  // The sign-in pages already ask for an account; the bubble would only repeat them.
  if (/^\/(login|register|forgot-password|reset-password)\/?$/.test(location.pathname)) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50 font-sans" ref={ref}>
      {open && (
        <div
          role="dialog"
          aria-label="AI Coach"
          className="absolute bottom-[4.5rem] right-0 w-[320px] rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl"
        >
          <button
            type="button"
            onClick={() => setOpen(false)}
            className="absolute top-3 right-3 p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100"
            aria-label="Đóng"
          >
            <X className="w-4 h-4" />
          </button>
          <div className="flex items-center gap-2.5">
            <span className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700">
              <Bot className="w-5 h-5" />
            </span>
            <h3 className="font-semibold text-slate-900">BadmintonAI Coach</h3>
          </div>
          <p className="mt-3 text-sm text-slate-600 leading-relaxed">
            Trợ lý AI đọc dữ liệu trận đấu đã phân tích để trả lời bạn.
          </p>
          <ul className="mt-3 space-y-2 text-sm text-slate-700">
            <li className="flex items-center gap-2">
              <BookOpen className="w-4 h-4 text-emerald-600 shrink-0" /> Giải đáp luật BWF, chiến thuật
            </li>
            <li className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-amber-500 shrink-0" /> Gợi ý trận theo sở thích
            </li>
            <li className="flex items-center gap-2">
              <Scale className="w-4 h-4 text-emerald-600 shrink-0" /> So sánh phong độ giữa 2 trận
            </li>
          </ul>
          <div className="mt-5 flex gap-2">
            <Link
              to="/login"
              className="flex-1 text-center rounded-lg bg-emerald-600 hover:bg-emerald-700 px-3 py-2 text-sm font-semibold text-white"
            >
              Đăng nhập để dùng
            </Link>
            <Link
              to="/register"
              className="rounded-lg border border-slate-200 hover:bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-700"
            >
              Đăng ký
            </Link>
          </div>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        aria-expanded={open}
        className="relative flex items-center justify-center w-14 h-14 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-xl shadow-emerald-900/20 border-2 border-white hover:border-emerald-200 transition-all duration-300 hover:scale-110 active:scale-95"
        aria-label="Trợ lý AI Coach"
      >
        <Bot className="w-7 h-7" />
      </button>
    </div>
  );
};
