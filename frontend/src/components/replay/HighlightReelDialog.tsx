import React, { useEffect, useMemo, useState } from 'react';
import { AxiosError } from 'axios';
import { CheckSquare, Download, Film, ListVideo, Loader2, Play, RotateCcw, Square, Trash2, X, AlertTriangle } from 'lucide-react';
import { ErrorResponse } from '../../api/client';
import {
  HighlightCandidate,
  HighlightReel,
  HighlightSuggestions,
  INTRO_SECONDS,
  createHighlightReel,
  getHighlightSuggestions,
  isRendering,
} from '../../api/highlights';
import { useHighlightJobs } from '../highlight/HighlightJobsContext';
import { RallyPreviewPlayer } from './RallyPreviewPlayer';

interface HighlightReelDialogProps {
  matchId: string;
  open: boolean;
  onClose: () => void;
  /** Player A and B of the match: the scores below are per player, whichever half they play on. */
  nameA: string;
  nameB: string;
  /** The match video, to preview rallies inside the dialog. */
  videoUrl?: string;
  youtubeVideoId?: string;
}

const errorMessage = (e: unknown, fallback: string) =>
  (e as AxiosError<ErrorResponse>)?.response?.data?.message ?? fallback;

const formatDuration = (seconds: number) => {
  const s = Math.max(0, Math.round(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const clipSeconds = (c: HighlightCandidate) => c.clipEnd - c.clipStart;

/** What the preview player is showing: one rally, or the selected rallies one after another. */
interface PreviewState {
  queue: number[];
  index: number;
  token: number;
  autoPlay: boolean;
}

/**
 * Builds a highlight MP4: the AI picks the best rallies, the owner watches and adjusts the list, the media worker
 * renders it. Rallies play in the dialog itself, so judging one does not lose the selection.
 */
export const HighlightReelDialog: React.FC<HighlightReelDialogProps> = ({
  matchId,
  open,
  onClose,
  nameA,
  nameB,
  videoUrl,
  youtubeVideoId,
}) => {
  const [suggestions, setSuggestions] = useState<HighlightSuggestions | null>(null);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [title, setTitle] = useState('');
  const [sortBy, setSortBy] = useState<'score' | 'order'>('score');
  // Shared with the tray and the Highlight page: one list, polled in one place.
  const jobs = useHighlightJobs();
  const reels = useMemo(() => jobs.reels.filter(r => String(r.matchId) === String(matchId)), [jobs.reels, matchId]);
  const [loading, setLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [watching, setWatching] = useState<number | null>(null);
  const [preview, setPreview] = useState<PreviewState | null>(null);

  // Load once, on first open.
  useEffect(() => {
    if (!open || suggestions || loading) return;
    setLoading(true);
    setLoadError(null);
    getHighlightSuggestions(matchId)
      .then(s => {
        setSuggestions(s);
        setSelected(new Set(s.candidates.filter(c => c.suggested).map(c => c.rallyId)));
        setTitle(s.defaultTitle);
      })
      .catch(e => setLoadError(errorMessage(e, 'Không tải được danh sách pha cầu.')))
      .finally(() => setLoading(false));
  }, [open, matchId]); // eslint-disable-line react-hooks/exhaustive-deps

  const rendering = reels.some(isRendering);

  // Never resume with sound when the dialog opens again.
  useEffect(() => {
    if (!open) setPreview(p => (p ? { ...p, autoPlay: false } : p));
  }, [open]);

  const candidates = useMemo(() => {
    const list = [...(suggestions?.candidates ?? [])];
    if (sortBy === 'score') list.sort((a, b) => b.score - a.score || a.rallyNumber - b.rallyNumber);
    return list;
  }, [suggestions, sortBy]);
  const byId = useMemo(() => new Map((suggestions?.candidates ?? []).map(c => [c.rallyId, c])), [suggestions]);

  // Cue the top rally, without sound, so the player is never empty.
  useEffect(() => {
    if (open && !preview && candidates.length > 0) {
      setPreview({ queue: [candidates[0].rallyId], index: 0, token: 0, autoPlay: false });
    }
  }, [open, candidates]); // eslint-disable-line react-hooks/exhaustive-deps

  const chosen = useMemo(
    () => (suggestions?.candidates ?? []).filter(c => selected.has(c.rallyId)),
    [suggestions, selected],
  );
  const totalSeconds = chosen.reduce((sum, c) => sum + clipSeconds(c), 0);
  const maxSeconds = suggestions?.maxReelSeconds ?? 180;
  const maxClips = suggestions?.maxClips ?? 20;
  const overLimit = totalSeconds > maxSeconds || chosen.length > maxClips;

  const current = preview ? byId.get(preview.queue[preview.index]) ?? null : null;
  const playingQueue = preview != null && preview.queue.length > 1;

  const toggle = (id: number) =>
    setSelected(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const watchRally = (id: number) =>
    setPreview(p => ({ queue: [id], index: 0, token: (p?.token ?? 0) + 1, autoPlay: true }));

  const replay = () => setPreview(p => (p ? { ...p, token: p.token + 1, autoPlay: true } : p));

  // "Xem liền": the selected rallies in match order, as the reel will play them.
  const watchSelected = () => {
    if (chosen.length === 0) return;
    setPreview(p => ({ queue: chosen.map(c => c.rallyId), index: 0, token: (p?.token ?? 0) + 1, autoPlay: true }));
  };

  const handleClipEnded = () =>
    setPreview(p => (p && p.index + 1 < p.queue.length ? { ...p, index: p.index + 1, token: p.token + 1 } : p));

  // ↑/↓ move through the list and play, Space ticks the rally being watched.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
        return;
      }
      const target = e.target as HTMLElement;
      if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.tagName === 'VIDEO') return;
      if ((e.key === 'ArrowDown' || e.key === 'ArrowUp') && candidates.length > 0) {
        e.preventDefault();
        const at = current ? candidates.findIndex(c => c.rallyId === current.rallyId) : -1;
        const next = Math.min(candidates.length - 1, Math.max(0, at + (e.key === 'ArrowDown' ? 1 : -1)));
        watchRally(candidates[next].rallyId);
        document.getElementById(`hl-rally-${candidates[next].rallyId}`)?.scrollIntoView({ block: 'nearest' });
      } else if (e.key === ' ' && current) {
        e.preventDefault();
        toggle(current.rallyId);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose, candidates, current]); // eslint-disable-line react-hooks/exhaustive-deps

  const submit = async () => {
    if (chosen.length === 0 || overLimit) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const reel = await createHighlightReel(matchId, { title: title.trim() || undefined, rallyIds: chosen.map(c => c.rallyId) });
      // Rendering runs on the server: hand it to the tray and let the user get back to the match.
      jobs.track(reel);
      setPreview(p => (p ? { ...p, autoPlay: false } : p));
      onClose();
    } catch (e) {
      setSubmitError(errorMessage(e, 'Không tạo được video highlight.'));
    } finally {
      setSubmitting(false);
    }
  };

  const remove = async (reel: HighlightReel) => {
    if (!window.confirm(`Xóa video "${reel.title}"?`)) return;
    try {
      await jobs.remove(reel);
      if (watching === reel.id) setWatching(null);
    } catch (e) {
      window.alert(errorMessage(e, 'Không xóa được video.'));
    }
  };

  if (!open) return null;

  const currentOn = current ? selected.has(current.rallyId) : false;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40"
      onMouseDown={e => e.target === e.currentTarget && onClose()}
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="highlight-title"
        className="w-full max-w-6xl h-[calc(100vh-2rem)] max-h-[860px] flex flex-col rounded-lg bg-sheet shadow-xl"
      >
        <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-ink/10">
          <div>
            <h2 id="highlight-title" className="text-lg font-semibold text-ink flex items-center gap-2">
              <Film className="w-5 h-5 text-pitch" />
              Video highlight
            </h2>
            <p className="text-sm text-ink/70 mt-0.5">
              AI đã chọn sẵn các pha hay nhất. Bấm vào một pha để xem lại, tick để thêm vào video.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Đóng"
            className="p-1.5 rounded-md text-ink/60 hover:text-ink hover:bg-ink/5"
          >
            <X className="w-5 h-5" />
          </button>
        </header>

        {loading && (
          <p className="flex items-center gap-2 px-6 py-4 text-sm text-ink/70">
            <Loader2 className="w-4 h-4 animate-spin text-pitch" /> Đang chấm điểm các pha cầu…
          </p>
        )}
        {loadError && (
          <p className="flex items-center gap-2 px-6 py-4 text-sm text-loss">
            <AlertTriangle className="w-4 h-4" /> {loadError}
          </p>
        )}

        {suggestions && (
          <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[minmax(0,1.25fr)_minmax(0,1fr)]">
            {/* Left: watch the rally, decide, name the video. */}
            <div className="min-h-0 overflow-y-auto px-6 py-4 space-y-4 lg:border-r border-ink/10">
              <RallyPreviewPlayer
                videoUrl={videoUrl}
                youtubeVideoId={youtubeVideoId}
                clip={current ? { start: current.clipStart, end: current.clipEnd } : null}
                playToken={preview?.token ?? 0}
                autoPlay={preview?.autoPlay ?? false}
                onEnded={handleClipEnded}
              />

              {current && (
                <div className="flex items-start gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-ink/60 tabular-nums">
                      {playingQueue && `Đang xem liền ${preview!.index + 1}/${preview!.queue.length} · `}
                      Pha {current.rallyNumber} · {formatDuration(clipSeconds(current))} · ván {current.gameNumber}, trước pha{' '}
                      {nameA} {current.scoreABefore}–{current.scoreBBefore} {nameB}
                    </p>
                    <p className="mt-0.5 font-semibold text-ink">{current.label}</p>
                    {current.reasons.length > 0 && (
                      <p className="text-sm text-ink/70">{current.reasons.join(' · ')}</p>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={replay}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm font-medium text-ink border border-ink/15 hover:border-ink/30"
                  >
                    <RotateCcw className="w-4 h-4" /> Phát lại
                  </button>
                  <button
                    type="button"
                    onClick={() => toggle(current.rallyId)}
                    aria-pressed={currentOn}
                    className={`shrink-0 inline-flex items-center gap-1.5 px-3 h-9 rounded-md text-sm font-medium ${
                      currentOn
                        ? 'text-pitch-deep bg-pitch-soft border border-pitch/30 hover:bg-pitch-soft/70'
                        : 'text-white bg-pitch hover:bg-pitch-deep'
                    }`}
                  >
                    {currentOn ? <CheckSquare className="w-4 h-4" /> : <Square className="w-4 h-4" />}
                    {currentOn ? 'Đã chọn' : 'Chọn pha này'}
                  </button>
                </div>
              )}

              <label className="block">
                <span className="text-sm font-semibold text-ink/70">Tiêu đề video</span>
                <input
                  value={title}
                  onChange={e => setTitle(e.target.value)}
                  maxLength={200}
                  className="mt-1 w-full h-9 rounded-md border border-ink/15 px-3 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-pitch/40"
                />
              </label>

              {reels.length > 0 && (
                <section aria-label="Video đã tạo" className="space-y-2">
                  <h3 className="text-sm font-semibold text-ink/70">Video đã tạo cho trận này</h3>
                  <ul className="space-y-2">
                    {reels.map(reel => (
                      <ReelRow
                        key={reel.id}
                        reel={reel}
                        watching={watching === reel.id}
                        onWatch={() => setWatching(watching === reel.id ? null : reel.id)}
                        onDelete={() => remove(reel)}
                      />
                    ))}
                  </ul>
                </section>
              )}
            </div>

            {/* Right: the rallies. A row plays the rally; its box adds it to the video. */}
            <section aria-label="Chọn pha cầu" className="min-h-0 flex flex-col">
              <div className="flex items-center justify-between gap-2 px-4 py-3 border-b border-ink/10">
                <h3 className="text-sm font-semibold text-ink/70">
                  Pha cầu <span className="font-normal">({candidates.length})</span>
                </h3>
                <div className="flex rounded-md border border-ink/15 text-xs overflow-hidden" role="group" aria-label="Sắp xếp">
                  {(['score', 'order'] as const).map(key => (
                    <button
                      key={key}
                      type="button"
                      onClick={() => setSortBy(key)}
                      aria-pressed={sortBy === key}
                      className={`px-2.5 h-7 ${sortBy === key ? 'bg-pitch text-white' : 'text-ink/70 hover:bg-ink/5'}`}
                    >
                      {key === 'score' ? 'Nổi bật nhất' : 'Thứ tự trận'}
                    </button>
                  ))}
                </div>
              </div>

              {candidates.length === 0 ? (
                <p className="px-4 py-3 text-sm text-ink/70">Phân tích chưa có pha cầu hoàn chỉnh nào để dựng highlight.</p>
              ) : (
                <ul className="flex-1 min-h-0 overflow-y-auto divide-y divide-ink/10">
                  {candidates.map(c => {
                    const on = selected.has(c.rallyId);
                    const isCurrent = current?.rallyId === c.rallyId;
                    return (
                      <li
                        key={c.rallyId}
                        id={`hl-rally-${c.rallyId}`}
                        className={`flex items-center text-sm transition-colors ${
                          isCurrent ? 'bg-pitch-soft shadow-[inset_3px_0_0_theme(colors.pitch.DEFAULT)]' : on ? 'bg-pitch-soft/40' : 'hover:bg-ink/[0.03]'
                        }`}
                      >
                        <button
                          type="button"
                          onClick={() => toggle(c.rallyId)}
                          aria-pressed={on}
                          aria-label={`${on ? 'Bỏ' : 'Chọn'} pha ${c.rallyNumber}`}
                          className="self-stretch pl-4 pr-2 flex items-center"
                        >
                          {on ? <CheckSquare className="w-4 h-4 text-pitch" /> : <Square className="w-4 h-4 text-ink/40" />}
                        </button>
                        <button
                          type="button"
                          onClick={() => watchRally(c.rallyId)}
                          aria-current={isCurrent || undefined}
                          className="flex-1 min-w-0 flex items-center gap-3 pr-4 py-2 text-left"
                        >
                          <span className="w-14 shrink-0 text-ink/60 tabular-nums">Pha {c.rallyNumber}</span>
                          <span className="flex-1 min-w-0">
                            <span className="block truncate font-medium text-ink">{c.label}</span>
                            {c.reasons.length > 0 && (
                              <span className="block truncate text-xs text-ink/60">{c.reasons.join(' · ')}</span>
                            )}
                          </span>
                          {c.suggested && (
                            <span className="shrink-0 rounded px-1.5 text-[11px] font-semibold bg-pitch/10 text-pitch-deep">AI gợi ý</span>
                          )}
                          <span
                            className="w-24 shrink-0 text-right text-xs text-ink/60 tabular-nums"
                            title={`Ván ${c.gameNumber}, trước pha: ${nameA} ${c.scoreABefore} – ${c.scoreBBefore} ${nameB}`}
                          >
                            V{c.gameNumber} {c.scoreABefore}–{c.scoreBBefore} · {formatDuration(clipSeconds(c))}
                          </span>
                          <Play className={`w-3.5 h-3.5 shrink-0 ${isCurrent ? 'text-pitch' : 'text-ink/30'}`} />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              )}
            </section>
          </div>
        )}

        {suggestions && (
          <footer className="px-6 py-4 border-t border-ink/10 space-y-2">
            <div className="flex items-center gap-3 text-sm">
              <span className={`tabular-nums ${overLimit ? 'text-loss font-medium' : 'text-ink/70'}`}>
                {chosen.length} pha · {formatDuration(totalSeconds + (chosen.length ? INTRO_SECONDS : 0))} / {formatDuration(maxSeconds)}
              </span>
              <div className="flex-1 h-1.5 rounded-full bg-ink/10 overflow-hidden" aria-hidden>
                <div
                  className={`h-full ${overLimit ? 'bg-loss' : 'bg-pitch'}`}
                  style={{ width: `${Math.min(100, (totalSeconds / maxSeconds) * 100)}%` }}
                />
              </div>
            </div>
            {overLimit && (
              <p className="text-xs text-loss">
                Tối đa {formatDuration(maxSeconds)} và {maxClips} pha để video vừa giới hạn lưu trữ. Hãy bỏ bớt pha.
              </p>
            )}
            {submitError && <p className="text-xs text-loss">{submitError}</p>}
            <div className="flex items-center justify-end gap-2">
              <span className="mr-auto text-xs text-ink/50">↑ ↓ chuyển pha · Space chọn/bỏ</span>
              <button
                type="button"
                onClick={watchSelected}
                disabled={chosen.length === 0}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-md text-sm font-medium text-ink border border-ink/15 hover:border-ink/30 disabled:opacity-50"
              >
                <ListVideo className="w-4 h-4" /> Xem liền các pha đã chọn
              </button>
              <button
                type="button"
                onClick={submit}
                disabled={chosen.length === 0 || overLimit || submitting || rendering}
                title={rendering ? 'Đang dựng một video, hãy đợi xong' : undefined}
                className="inline-flex items-center gap-1.5 px-4 h-9 rounded-md text-sm font-medium bg-pitch hover:bg-pitch-deep text-white disabled:opacity-50"
              >
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Film className="w-4 h-4" />}
                Tạo video
              </button>
            </div>
          </footer>
        )}
      </div>
    </div>
  );
};

const ReelRow: React.FC<{
  reel: HighlightReel;
  watching: boolean;
  onWatch: () => void;
  onDelete: () => void;
}> = ({ reel, watching, onWatch, onDelete }) => {
  const active = reel.status === 'QUEUED' || reel.status === 'RENDERING';
  return (
    <li className="rounded-md border border-ink/10 bg-ground/40">
      <div className="flex items-center gap-3 px-3 py-2 text-sm">
        <div className="flex-1 min-w-0">
          <p className="truncate font-medium text-ink">{reel.title}</p>
          <p className="text-xs text-ink/60">
            {reel.clipCount} pha
            {reel.durationSeconds != null && ` · ${formatDuration(reel.durationSeconds)}`}
            {reel.fileSize != null && ` · ${(reel.fileSize / 1e6).toFixed(1)} MB`}
            {' · '}
            {new Date(reel.createdAt).toLocaleString('vi-VN', { dateStyle: 'short', timeStyle: 'short' })}
          </p>
        </div>

        {active && (
          <div className="w-40 shrink-0" aria-live="polite">
            <p className="text-xs text-ink/70 flex items-center gap-1">
              <Loader2 className="w-3 h-3 animate-spin text-pitch" />
              {reel.status === 'QUEUED' ? 'Đang chờ máy dựng…' : `Đang dựng ${reel.progressPercent}%`}
            </p>
            <div className="mt-1 h-1.5 rounded-full bg-ink/10 overflow-hidden">
              <div className="h-full bg-pitch transition-[width] duration-500" style={{ width: `${reel.progressPercent}%` }} />
            </div>
          </div>
        )}
        {reel.status === 'FAILED' && (
          <p className="max-w-[16rem] text-xs text-loss" title={reel.errorMessage ?? undefined}>
            {reel.errorMessage ?? 'Dựng video thất bại.'}
          </p>
        )}
        {reel.status === 'COMPLETED' && reel.videoUrl && (
          <>
            <button
              type="button"
              onClick={onWatch}
              aria-expanded={watching}
              className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md text-xs font-medium text-pitch-deep border border-pitch/30 hover:bg-pitch-soft"
            >
              <Play className="w-3.5 h-3.5" /> {watching ? 'Ẩn' : 'Xem'}
            </button>
            {reel.downloadUrl && (
              <a
                href={reel.downloadUrl}
                className="inline-flex items-center gap-1 px-2.5 h-8 rounded-md text-xs font-medium text-white bg-pitch hover:bg-pitch-deep"
              >
                <Download className="w-3.5 h-3.5" /> Tải về
              </a>
            )}
          </>
        )}
        {!active && (
          <button
            type="button"
            onClick={onDelete}
            aria-label={`Xóa ${reel.title}`}
            className="p-1.5 rounded-md text-ink/50 hover:text-loss hover:bg-loss/10"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        )}
      </div>
      {watching && reel.videoUrl && (
        <video src={reel.videoUrl} controls autoPlay className="w-full aspect-video bg-black rounded-b-md" />
      )}
    </li>
  );
};
