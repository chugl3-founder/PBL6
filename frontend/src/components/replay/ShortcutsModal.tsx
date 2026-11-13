import React from 'react';
import { Keyboard, X } from 'lucide-react';

/** The keyboard shortcuts of the Replay player (opened with "?"). */
export const ShortcutsModal: React.FC<{ onClose: () => void }> = ({ onClose }) => (
    <div 
      onClick={() => onClose()}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/[0.04] animate-fade-in"
    >
      <div 
        onClick={(e) => e.stopPropagation()}
        className="bg-sheet border border-ink/15 rounded-xl p-6 max-w-lg w-full space-y-4"
      >
        <div className="flex items-center justify-between border-b border-ink/10 pb-3">
          <div className="flex items-center gap-2.5 text-ink">
            <div className="w-9 h-9 rounded-xl bg-pitch/20 border border-pitch/40 flex items-center justify-center text-pitch">
              <Keyboard className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold">Phím Tắt Điều Khiển Video</h3>
              <p className="text-[11px] text-ink/70">Thao tác nhanh trên bàn phím khi xem trận đấu</p>
            </div>
          </div>
          <button
            onClick={() => onClose()}
            className="p-1.5 rounded-full hover:bg-ink/[0.06] text-ink/70 hover:text-ink transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-2 gap-2.5 text-xs">
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Phát / Tạm dừng</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">Space / K</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Tua lùi 5s</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">← / J</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Tua tới 5s</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">→ / L</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Tăng âm lượng</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">↑</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Giảm âm lượng</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">↓</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Tắt / Bật tiếng</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">M</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Cú đánh trước đó</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">[</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Cú đánh kế tiếp</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">]</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Toàn màn hình</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">F</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between">
            <span className="text-ink/70">Đổi tốc độ phát</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">&lt; / &gt;</kbd>
          </div>
          <div className="p-2.5 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-center justify-between col-span-2">
            <span className="text-ink/70">Mở bảng hướng dẫn này</span>
            <kbd className="px-2 py-0.5 rounded bg-ink/[0.06] border border-ink/15 tabular-nums text-[11px] text-pitch font-bold">?</kbd>
          </div>
        </div>

        <div className="border-t border-ink/10 pt-3 flex items-center justify-between text-[11px] text-ink/70">
          <span>Bấm phím <kbd className="px-1.5 py-0.5 rounded bg-ink/[0.06] tabular-nums text-ink">Esc</kbd> để đóng</span>
          <button
            onClick={() => onClose()}
            className="px-4 py-1.5 rounded-xl bg-pitch hover:bg-pitch-deep text-white text-xs font-semibold transition-colors"
          >
            Đã hiểu
          </button>
        </div>
      </div>
    </div>
);
