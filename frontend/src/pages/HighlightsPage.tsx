import React, { useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { AlertTriangle, Download, Film, Loader2, Play, Trash2, X } from 'lucide-react';
import { HighlightReel, isRendering } from '../api/highlights';
import { useHighlightJobs } from '../components/highlight/useHighlightJobs';

const formatDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

/** Every highlight video of the user, across matches; ?watch=<id> opens one in the player. */
export const HighlightsPage: React.FC = () => {
  const { reels, loaded, loadError, remove, refresh } = useHighlightJobs();
  const [params, setParams] = useSearchParams();
  const watchId = Number(params.get('watch')) || null;
  const watching = reels.find(r => r.id === watchId && r.status === 'COMPLETED') ?? null;

  // Presigned links expire; reload the list when the page opens.
  useEffect(() => {
    refresh();
  }, [refresh]);

  const open = (reel: HighlightReel) => setParams({ watch: String(reel.id) });
  const close = () => setParams({});

  const handleDelete = async (reel: HighlightReel) => {
    if (!window.confirm(`Xóa video "${reel.title}"? Không khôi phục được.`)) return;
    try {
      await remove(reel);
      if (watchId === reel.id) close();
    } catch {
      window.alert('Không xóa được video. Hãy thử lại.');
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-4 space-y-6 font-vn">
      <header>
        <h1 className="text-2xl font-semibold text-ink">Video highlight</h1>
        <p className="mt-1 text-sm text-ink/70">
          Video dựng tự động từ những pha cầu hay nhất. Tạo video mới ở trang xem lại của một trận đã phân tích.
        </p>
      </header>

      {!loaded && loadError ? (
        <div role="alert" className="flex items-center gap-3 rounded-lg border border-loss/30 bg-loss/5 px-4 py-3 text-sm text-ink">
          <AlertTriangle className="w-4 h-4 shrink-0 text-loss" />
          <span className="flex-1">{loadError}</span>
          <button
            type="button"
            onClick={() => refresh()}
            className="px-3 h-8 rounded-md border border-ink/20 bg-sheet font-medium hover:bg-ground focus:outline-none focus-visible:ring-2 focus-visible:ring-pitch"
          >
            Thử lại
          </button>
        </div>
      ) : !loaded ? (
        <p className="flex items-center gap-2 text-sm text-ink/70">
          <Loader2 className="w-4 h-4 animate-spin text-pitch" /> Đang tải…
        </p>
      ) : reels.length === 0 ? (
        <div className="rounded-lg border border-dashed border-ink/20 bg-sheet px-6 py-12 text-center">
          <Film className="mx-auto w-8 h-8 text-ink/30" />
          <p className="mt-3 font-medium text-ink">Chưa có video highlight nào</p>
          <p className="mt-1 text-sm text-ink/70">
            Mở một trận đã phân tích, bấm <strong>Tạo video highlight</strong> ở đầu trang xem lại.
          </p>
          <Link
            to="/my-matches"
            className="mt-4 inline-flex items-center px-4 h-9 rounded-md text-sm font-medium bg-pitch hover:bg-pitch-deep text-white"
          >
            Đến Trận của tôi
          </Link>
        </div>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {reels.map(reel => (
            <ReelCard key={reel.id} reel={reel} onOpen={() => open(reel)} onDelete={() => handleDelete(reel)} />
          ))}
        </ul>
      )}

      {watching && watching.videoUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/70"
          onMouseDown={e => e.target === e.currentTarget && close()}
        >
          <div role="dialog" aria-modal="true" aria-label={watching.title} className="w-full max-w-5xl rounded-lg bg-ink overflow-hidden shadow-xl">
            <div className="flex items-center gap-3 px-4 h-12 text-white">
              <p className="flex-1 truncate text-sm font-semibold">{watching.title}</p>
              {watching.downloadUrl && (
                <a href={watching.downloadUrl} className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md text-xs font-medium bg-pitch hover:bg-pitch-deep">
                  <Download className="w-3.5 h-3.5" /> Tải về
                </a>
              )}
              <button type="button" onClick={close} aria-label="Đóng" className="p-1.5 rounded-md text-white/70 hover:text-white hover:bg-white/10">
                <X className="w-5 h-5" />
              </button>
            </div>
            <video key={watching.id} src={watching.videoUrl} controls autoPlay className="w-full aspect-video bg-black" />
          </div>
        </div>
      )}
    </div>
  );
};

const ReelCard: React.FC<{ reel: HighlightReel; onOpen: () => void; onDelete: () => void }> = ({ reel, onOpen, onDelete }) => {
  const rendering = isRendering(reel);
  return (
    <li className="flex flex-col rounded-lg bg-sheet border border-ink/10 overflow-hidden">
      <button
        type="button"
        onClick={onOpen}
        disabled={reel.status !== 'COMPLETED'}
        aria-label={`Xem ${reel.title}`}
        className="group relative aspect-video bg-ink disabled:cursor-default"
      >
        {reel.status === 'COMPLETED' && reel.videoUrl ? (
          <>
            {/* #t skips the title card so the thumbnail shows play. */}
            <video src={`${reel.videoUrl}#t=5`} preload="metadata" muted className="w-full h-full object-cover" />
            <span className="absolute inset-0 flex items-center justify-center bg-ink/20 group-hover:bg-ink/40 transition-colors">
              <span className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center">
                <Play className="w-5 h-5 text-ink translate-x-0.5" />
              </span>
            </span>
            {reel.durationSeconds != null && (
              <span className="absolute bottom-2 right-2 rounded bg-ink/80 px-1.5 text-xs font-medium text-white tabular-nums">
                {formatDuration(reel.durationSeconds)}
              </span>
            )}
          </>
        ) : rendering ? (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 text-white/80 text-sm">
            <Loader2 className="w-6 h-6 animate-spin text-[#6FCF97]" />
            {reel.status === 'QUEUED' ? 'Đang chờ máy dựng…' : `Đang dựng ${reel.progressPercent}%`}
            <span className="w-2/3 h-1.5 rounded-full bg-white/15 overflow-hidden">
              <span className="block h-full bg-[#6FCF97] transition-[width] duration-500" style={{ width: `${Math.max(3, reel.progressPercent)}%` }} />
            </span>
          </span>
        ) : (
          <span className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-6 text-center text-sm text-white/80">
            <AlertTriangle className="w-6 h-6 text-loss" />
            {reel.errorMessage ?? 'Dựng video thất bại.'}
          </span>
        )}
      </button>

      <div className="flex-1 flex flex-col gap-1 p-4">
        <p className="font-medium text-ink line-clamp-2" title={reel.title}>{reel.title}</p>
        <Link to={`/matches/${reel.matchId}/replay`} className="text-sm text-pitch-deep hover:underline underline-offset-2 truncate">
          {reel.playerAName} gặp {reel.playerBName}
        </Link>
        <p className="text-xs text-ink/60">
          {reel.clipCount} pha
          {reel.fileSize != null && ` · ${(reel.fileSize / 1e6).toFixed(1)} MB`}
          {' · '}
          {new Date(reel.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
        </p>
        <div className="mt-auto pt-3 flex items-center gap-2">
          {reel.status === 'COMPLETED' && reel.downloadUrl && (
            <a
              href={reel.downloadUrl}
              className="inline-flex items-center gap-1 px-3 h-8 rounded-md text-xs font-medium text-white bg-pitch hover:bg-pitch-deep"
            >
              <Download className="w-3.5 h-3.5" /> Tải về
            </a>
          )}
          {!rendering && (
            <button
              type="button"
              onClick={onDelete}
              aria-label={`Xóa ${reel.title}`}
              className="ml-auto p-1.5 rounded-md text-ink/50 hover:text-loss hover:bg-loss/10"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </li>
  );
};
