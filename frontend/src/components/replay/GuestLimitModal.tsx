import React from 'react';
import { Link } from 'react-router-dom';
import { Clock, LogIn, UserPlus } from 'lucide-react';

/** Guests may watch the first 5 minutes of a public match; then this asks them to sign in. */
export const GuestLimitModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/[0.04] p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-md from-[#14233c] to-[#0d1627] border border-ink/15 rounded-xl p-6 sm:p-7 text-ink space-y-6 text-center">
        <div className="w-16 h-16 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-700 mx-auto flex items-center justify-center">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h3 className="font-heading text-xl font-bold text-ink">Hết Thời Lượng Xem Thử</h3>
          <p className="text-xs sm:text-sm text-slate-700 leading-relaxed">
            Khách vãng lai được xem trước tối đa <strong>5 phút (300 giây)</strong> trận đấu công khai. Vui lòng đăng nhập hoặc đăng ký tài khoản để tiếp tục xem toàn bộ video và trải nghiệm telemetry phân tích không giới hạn.
          </p>
        </div>

        <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
          <Link
            to="/login"
            className="w-full py-3 rounded-full bg-pitch hover:bg-pitch-deep text-white text-xs font-bold transition-all flex items-center justify-center gap-2"
          >
            <LogIn className="w-4 h-4" />
            <span>Đăng nhập ngay</span>
          </Link>
          <Link
            to="/register"
            className="w-full py-3 rounded-full bg-ink/[0.06] hover:bg-ink/[0.08] text-ink text-xs font-semibold transition-colors border border-ink/15 flex items-center justify-center gap-2"
          >
            <UserPlus className="w-4 h-4" />
            <span>Tạo tài khoản</span>
          </Link>
        </div>

        <button
          onClick={() => onClose()}
          className="text-xs text-ink/65 hover:text-ink transition-colors"
        >
          Đóng thông báo
        </button>
      </div>
    </div>
);
