import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, CheckCircle2, ChevronDown, ChevronUp, Download, Film, Loader2, X } from 'lucide-react';
import { HighlightReel, isRendering } from '../../api/highlights';
import { useHighlightJobs } from './useHighlightJobs';

/**
 * Floating panel in the bottom-right corner, like the upload panel of Google Drive: follows highlight renders
 * on every page so the user can keep working, and offers the finished video when it is ready.
 */
export const HighlightTray: React.FC = () => {
  const { trayReels, dismiss } = useHighlightJobs();
  const [collapsed, setCollapsed] = useState(false);
  const running = trayReels.filter(isRendering).length;
  const done = trayReels.filter(r => r.status === 'COMPLETED').length;

  // Open the panel again when a render finishes, so the result is not missed.
  const prevRunning = useRef(running);
  useEffect(() => {
    if (running < prevRunning.current) setCollapsed(false);
    prevRunning.current = running;
  }, [running]);

  if (trayReels.length === 0) return null;

  const heading = running > 0
    ? `Đang dựng ${running} video highlight`
    : done > 0
      ? `Đã dựng xong ${done} video`
      : 'Dựng video không thành công';

  return (
    <aside
      aria-label="Tiến độ dựng video highlight"
      className="fixed bottom-4 right-4 z-40 w-[22rem] max-w-[calc(100vw-2rem)] rounded-lg bg-sheet shadow-[0_12px_40px_-12px_rgba(22,32,27,0.45)] border border-ink/10 font-vn print:hidden"
    >
      <header className="flex items-center gap-2 pl-4 pr-2 h-12 rounded-t-lg bg-ink text-white">
        {running > 0 ? <Loader2 className="w-4 h-4 animate-spin text-[#6FCF97]" /> : <Film className="w-4 h-4 text-[#6FCF97]" />}
        <h2 className="flex-1 text-sm font-semibold" aria-live="polite">{heading}</h2>
        <button
          type="button"
          onClick={() => setCollapsed(c => !c)}
          aria-label={collapsed ? 'Mở rộng' : 'Thu gọn'}
          aria-expanded={!collapsed}
          className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10"
        >
          {collapsed ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
        {running === 0 && (
          <button
            type="button"
            onClick={() => trayReels.forEach(r => dismiss(r.id))}
            aria-label="Đóng"
            className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        )}
      </header>

      {!collapsed && (
        <ul className="max-h-72 overflow-y-auto divide-y divide-ink/10">
          {trayReels.map(reel => (
            <TrayItem key={reel.id} reel={reel} onDismiss={() => dismiss(reel.id)} />
          ))}
        </ul>
      )}
    </aside>
  );
};

const TrayItem: React.FC<{ reel: HighlightReel; onDismiss: () => void }> = ({ reel, onDismiss }) => {
  const rendering = isRendering(reel);
  return (
    <li className="px-4 py-3">
      <div className="flex items-start gap-2">
        <span className="mt-0.5 shrink-0">
          {rendering && <Loader2 className="w-4 h-4 animate-spin text-pitch" />}
          {reel.status === 'COMPLETED' && <CheckCircle2 className="w-4 h-4 text-pitch" />}
          {reel.status === 'FAILED' && <AlertTriangle className="w-4 h-4 text-loss" />}
        </span>
        <div className="flex-1 min-w-0">
          <p className="truncate text-sm font-medium text-ink" title={reel.title}>{reel.title}</p>
          <p className="truncate text-xs text-ink/60">{reel.playerAName} gặp {reel.playerBName} · {reel.clipCount} pha</p>
        </div>
        {!rendering && (
          <button
            type="button"
            onClick={onDismiss}
            aria-label={`Ẩn ${reel.title}`}
            className="-mr-1 p-1 rounded text-ink/40 hover:text-ink hover:bg-ink/5"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {rendering && (
        <div className="mt-2 pl-6">
          <div className="flex justify-between text-xs text-ink/60 tabular-nums">
            <span>{reel.status === 'QUEUED' ? 'Đang chờ máy dựng…' : 'Đang dựng'}</span>
            <span>{reel.progressPercent}%</span>
          </div>
          <div className="mt-1 h-1.5 rounded-full bg-ink/10 overflow-hidden">
            <div className="h-full bg-pitch transition-[width] duration-500" style={{ width: `${Math.max(3, reel.progressPercent)}%` }} />
          </div>
        </div>
      )}
      {reel.status === 'COMPLETED' && (
        <div className="mt-2 pl-6 flex gap-2">
          <Link
            to={`/highlights?watch=${reel.id}`}
            className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md text-xs font-medium text-pitch-deep border border-pitch/30 hover:bg-pitch-soft"
          >
            <Film className="w-3.5 h-3.5" /> Xem
          </Link>
          {reel.downloadUrl && (
            <a
              href={reel.downloadUrl}
              className="inline-flex items-center gap-1 px-2.5 h-7 rounded-md text-xs font-medium text-white bg-pitch hover:bg-pitch-deep"
            >
              <Download className="w-3.5 h-3.5" /> Tải về
            </a>
          )}
        </div>
      )}
      {reel.status === 'FAILED' && (
        <p className="mt-1 pl-6 text-xs text-loss">{reel.errorMessage ?? 'Dựng video thất bại.'}</p>
      )}
    </li>
  );
};
