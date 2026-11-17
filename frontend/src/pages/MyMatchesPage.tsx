import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AlertTriangle,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  Cpu,
  Film,
  Inbox,
  LayoutGrid,
  List,
  Play,
  Plus,
  RefreshCw,
  Search,
  Sparkles,
  Trash2,
  Trophy,
  Upload,
  X,
} from 'lucide-react';
import { deleteMatch, listMyMatches } from '../api/matches';
import { getAnalysisStatus } from '../api/analysis';
import { errorMessage } from '../api/errors';
import { EmptyState } from '../components/ui/EmptyState';
import { Notice } from '../components/ui/Notice';
import { toast } from '../components/ui/toastBus';
import type { Match } from '../types/match';
import type { AnalysisStatus } from '../types/replay';

/* ------------------------------------------------------------------ helpers */

type Group = 'WAITING' | 'ANALYZING' | 'ANALYZED' | 'FAILED';

const FILTERS: { id: 'ALL' | Group; label: string }[] = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ANALYZING', label: 'Đang phân tích' },
  { id: 'ANALYZED', label: 'Đã phân tích' },
  { id: 'WAITING', label: 'Chờ phân tích' },
  { id: 'FAILED', label: 'Lỗi phân tích' },
];

const SORTS = [
  { id: 'created-desc', label: 'Mới thêm gần đây' },
  { id: 'created-asc', label: 'Thêm lâu nhất' },
  { id: 'date-desc', label: 'Ngày thi đấu mới nhất' },
  { id: 'rallies-desc', label: 'Nhiều pha cầu nhất' },
  { id: 'name-asc', label: 'Tên đấu thủ A-Z' },
] as const;
type SortId = (typeof SORTS)[number]['id'];

const PAGE_SIZE = 12;
const FETCH_SIZE = 100;
const MAX_FETCH_PAGES = 5;
const POLL_MS = 4000;
const FAILED_STATES = ['FAILED', 'UNSUPPORTED'];

const numberFormat = new Intl.NumberFormat('vi-VN');

const isFailed = (match: Match, status?: AnalysisStatus) =>
  match.status === 'READY' && !!status && FAILED_STATES.includes(String(status.status));

const groupOf = (match: Match, status?: AnalysisStatus): Group => {
  if (isFailed(match, status)) return 'FAILED';
  if (match.status === 'DRAFT' || match.status === 'READY') return 'WAITING';
  if (match.status === 'ANALYZING') return 'ANALYZING';
  return 'ANALYZED';
};

const playersOf = (match: Match) => {
  const upperIsB = match.upperPlayer === 'PLAYER_B';
  return {
    upper: upperIsB ? match.playerBName : match.playerAName,
    lower: upperIsB ? match.playerAName : match.playerBName,
    upperSlot: upperIsB ? 'B' : 'A',
  } as const;
};

const thumbOf = (match: Match) =>
  match.thumbnailUrl || (match.youtubeVideoId ? `https://img.youtube.com/vi/${match.youtubeVideoId}/mqdefault.jpg` : null);

const clock = (seconds?: number | null) => {
  if (seconds == null || !Number.isFinite(Number(seconds))) return null;
  const total = Math.max(0, Math.round(Number(seconds)));
  const h = Math.floor(total / 3600);
  const m = Math.floor((total % 3600) / 60);
  const s = String(total % 60).padStart(2, '0');
  return h ? `${h}:${String(m).padStart(2, '0')}:${s}` : `${m}:${s}`;
};

const humanMinutes = (seconds: number) => {
  if (seconds < 60) return 'dưới 1 phút';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} phút`;
  return `${Math.floor(minutes / 60)} giờ ${minutes % 60} phút`;
};

const formatDate = (value?: string | null) => {
  if (!value) return '';
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN').format(date);
};

const relativeTime = (value?: string | null) => {
  if (!value) return '';
  const diff = (Date.now() - new Date(value).getTime()) / 1000;
  if (!Number.isFinite(diff)) return '';
  if (diff < 60) return 'vừa xong';
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  if (diff < 86400 * 7) return `${Math.floor(diff / 86400)} ngày trước`;
  return formatDate(value);
};

/** "streaming: Đang phân tích..." -> "Đang phân tích...". */
const stageText = (status?: AnalysisStatus) => {
  if (!status) return 'Đang kết nối máy phân tích…';
  const raw = status.currentStage || '';
  const text = raw.replace(/^[a-z_]+:\s*/i, '').trim();
  if (!text || /^[a-z_]+$/i.test(text)) return status.status === 'QUEUED' ? 'Đang chờ trong hàng đợi' : 'Đang phân tích';
  return text;
};

/** Where the run is: queued, warming up, analysing, done. Works for the mock engine and the GPU worker alike. */
const phaseOf = (status?: AnalysisStatus) => {
  if (!status || status.status === 'QUEUED' || status.status === 'NONE') return 0;
  if (status.status === 'COMPLETED') return 3;
  return (status.progressPercent ?? 0) > 0 ? 2 : 1;
};
const PHASES = ['Hàng đợi', 'Khởi động', 'Phân tích', 'Hoàn tất'];

const etaOf = (status?: AnalysisStatus) => {
  if (!status?.startedAt) return null;
  const elapsed = (Date.now() - new Date(status.startedAt).getTime()) / 1000;
  const p = status.progressPercent ?? 0;
  if (!Number.isFinite(elapsed) || elapsed <= 0) return null;
  return { elapsed, remaining: p >= 5 && p < 100 ? (elapsed * (100 - p)) / p : null };
};

/** What the match is waiting for, and the one thing to do next. */
const nextStep = (match: Match, status?: AnalysisStatus) => {
  if (isFailed(match, status)) {
    return { label: 'Phân tích lỗi', badge: 'bg-loss text-white', action: 'Thử lại', to: `/matches/${match.id}`, primary: false, icon: RefreshCw };
  }
  switch (match.status) {
    case 'DRAFT':
      return { label: 'Chưa có video', badge: 'bg-white/90 text-ink', action: 'Tải video', to: `/matches/${match.id}`, primary: false, icon: Upload };
    case 'READY':
      return { label: 'Chờ phân tích', badge: 'bg-white/90 text-ink', action: 'Phân tích', to: `/matches/${match.id}`, primary: false, icon: Sparkles };
    case 'ANALYZING':
      return { label: 'AI đang phân tích', badge: 'bg-pb text-white', action: 'Xem ngay', to: `/matches/${match.id}/replay`, primary: true, icon: Play };
    default:
      return { label: match.status === 'PUBLISHED' ? 'Đã công khai' : 'Đã phân tích', badge: 'bg-pitch text-white', action: 'Xem lại', to: `/matches/${match.id}/replay`, primary: true, icon: Play };
  }
};

const readView = (): 'grid' | 'list' => {
  try {
    return localStorage.getItem('myMatches.view') === 'list' ? 'list' : 'grid';
  } catch {
    return 'grid';
  }
};

/* --------------------------------------------------------------- small bits */

const CourtPlaceholder: React.FC = () => (
  <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden>
    <rect width="320" height="180" fill="#16201B" />
    <polygon points="112,26 208,26 262,160 58,160" fill="#2E7D5B" opacity="0.55" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" />
    <line x1="86" y1="84" x2="234" y2="84" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" />
    <line x1="160" y1="26" x2="160" y2="160" stroke="#fff" strokeOpacity="0.3" />
  </svg>
);

/** className must set the position: "absolute inset-0" inside a sized box, or "relative aspect-video". */
const Thumb: React.FC<{ match: Match; className: string }> = ({ match, className }) => {
  const thumb = thumbOf(match);
  return (
    <div className={`overflow-hidden bg-ink ${className}`}>
      {thumb ? <img src={thumb} alt="" loading="lazy" className="absolute inset-0 w-full h-full object-cover" /> : <CourtPlaceholder />}
    </div>
  );
};

const ProgressBar: React.FC<{ percent: number; live?: boolean; tone?: string; thin?: boolean }> = ({ percent, live, tone = 'bg-pb', thin }) => (
  <div
    className={`relative w-full ${thin ? 'h-1' : 'h-2'} rounded-full bg-ink/10 overflow-hidden`}
    role="progressbar"
    aria-valuemin={0}
    aria-valuemax={100}
    aria-valuenow={percent}
  >
    <div className={`h-full rounded-full ${tone} transition-[width] duration-700`} style={{ width: `${Math.max(live ? 3 : 0, percent)}%` }} />
    {live && <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent,rgba(255,255,255,.45),transparent)] animate-[shimmer_1.8s_infinite] bg-[length:40%_100%] bg-no-repeat" />}
  </div>
);

/** The game scores beside a player's name, scoreboard style. */
const ScoreLine: React.FC<{ name: string; dot: string; scores: number[]; won: boolean; lostGames: boolean[] }> = ({ name, dot, scores, won, lostGames }) => (
  <div className="flex items-center gap-2 min-w-0">
    <span className={`w-2 h-2 rounded-full shrink-0 ${dot}`} aria-hidden />
    <span className={`truncate ${won ? 'font-bold text-ink' : 'font-semibold text-ink/85'}`}>{name}</span>
    {won && <Trophy className="w-3.5 h-3.5 text-pb shrink-0" aria-label="Thắng" />}
    {scores.length > 0 && (
      <span className="ml-auto flex gap-1.5 font-score text-base tabular-nums">
        {scores.map((s, i) => (
          <span key={i} className={`w-6 text-center ${lostGames[i] ? 'text-ink/40' : 'text-ink font-semibold'}`}>
            {s}
          </span>
        ))}
      </span>
    )}
  </div>
);

const Scoreboard: React.FC<{ match: Match }> = ({ match }) => {
  const { upper, lower, upperSlot } = playersOf(match);
  const games = match.result?.games ?? [];
  const a = games.map((g) => g.scoreA);
  const b = games.map((g) => g.scoreB);
  const upperScores = upperSlot === 'A' ? a : b;
  const lowerScores = upperSlot === 'A' ? b : a;
  const winner = match.result?.winner;
  const upperWon = !!winner && (winner === 'PLAYER_A') === (upperSlot === 'A');
  const lowerWon = !!winner && !upperWon;
  return (
    <div className="space-y-0.5">
      <ScoreLine name={upper} dot="bg-pa" scores={upperScores} won={upperWon} lostGames={upperScores.map((s, i) => s < lowerScores[i])} />
      <ScoreLine name={lower} dot="bg-pb" scores={lowerScores} won={lowerWon} lostGames={lowerScores.map((s, i) => s < upperScores[i])} />
    </div>
  );
};

/* ------------------------------------------------------- live analysis panel */

const LiveAnalysisCard: React.FC<{ match: Match; status?: AnalysisStatus }> = ({ match, status }) => {
  const { upper, lower } = playersOf(match);
  const percent = status?.progressPercent ?? 0;
  const phase = phaseOf(status);
  const eta = etaOf(status);
  const covered = status?.analyzedUntilSeconds;
  const total = status?.videoDurationSeconds ?? match.durationSeconds;
  return (
    <li className="rounded-xl bg-sheet border border-pb/25 shadow-sm p-4 flex flex-col sm:flex-row gap-4">
      <Link to={`/matches/${match.id}/replay`} className="relative shrink-0 sm:w-48 rounded-lg overflow-hidden" tabIndex={-1} aria-hidden>
        <Thumb match={match} className="relative aspect-video" />
        <span className="absolute inset-0 bg-ink/40 flex items-center justify-center">
          <span className="font-score text-3xl font-bold text-white tabular-nums drop-shadow">{percent}%</span>
        </span>
      </Link>

      <div className="flex-1 min-w-0 space-y-3">
        <div className="flex flex-wrap items-start gap-x-3 gap-y-1">
          <div className="min-w-0">
            <p className="font-semibold text-ink truncate">
              {upper} <span className="text-ink/50 font-normal">gặp</span> {lower}
            </p>
            <p className="text-sm text-ink/70 flex items-center gap-1.5">
              <Cpu className="w-3.5 h-3.5 text-pb shrink-0" aria-hidden />
              <span className="truncate">{stageText(status)}</span>
            </p>
          </div>
          <div className="ml-auto flex gap-2">
            <Link to={`/matches/${match.id}`} className="inline-flex items-center rounded-md px-3 h-9 text-sm font-medium border border-ink/15 text-ink hover:border-pitch/50">
              Chi tiết
            </Link>
            <Link to={`/matches/${match.id}/replay`} className="inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-sm font-medium bg-pitch hover:bg-pitch-deep text-white">
              <Play className="w-3.5 h-3.5" aria-hidden /> Xem ngay
            </Link>
          </div>
        </div>

        <ProgressBar percent={percent} live={phase < 3} />

        <ol className="grid grid-cols-4 gap-1 text-[11px] sm:text-xs" aria-label="Các bước phân tích">
          {PHASES.map((label, i) => (
            <li key={label} className="flex items-center gap-1.5 min-w-0">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  i < phase ? 'bg-pitch' : i === phase ? 'bg-pb animate-pulse' : 'bg-ink/15'
                }`}
                aria-hidden
              />
              <span className={`truncate ${i === phase ? 'text-ink font-medium' : i < phase ? 'text-ink/70' : 'text-ink/45'}`}>{label}</span>
            </li>
          ))}
        </ol>

        <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-ink/65 tabular-nums">
          {covered != null && total ? (
            <span className="flex items-center gap-1">
              <Film className="w-3.5 h-3.5" aria-hidden /> Đã quét {clock(covered)} / {clock(total)}
            </span>
          ) : null}
          {eta && (
            <span className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" aria-hidden /> Đã chạy {humanMinutes(eta.elapsed)}
            </span>
          )}
          {eta?.remaining != null && <span>Còn khoảng {humanMinutes(eta.remaining)}</span>}
          <span className="text-ink/50">Các pha cầu hiện dần trên Replay khi AI phân tích tới.</span>
        </div>
      </div>
    </li>
  );
};

/* ---------------------------------------------------------------- the page */

export const MyMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [totalOnServer, setTotalOnServer] = useState(0);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<number, AnalysisStatus>>({});
  const [filter, setFilter] = useState<'ALL' | Group>('ALL');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<SortId>('created-desc');
  const [view, setView] = useState<'grid' | 'list'>(readView);
  const [page, setPage] = useState(0);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  /** Every match of the coach, a few hundred at most, so filters and search work on the whole list. */
  const load = useCallback(async (quiet = false) => {
    try {
      if (quiet) setRefreshing(true);
      else setLoading(true);
      setError(null);
      const first = await listMyMatches({ page: 0, size: FETCH_SIZE });
      let all: Match[] = first.data || [];
      const pages = Math.min(first.pagination?.totalPages ?? 1, MAX_FETCH_PAGES);
      if (pages > 1) {
        const rest = await Promise.all(
          Array.from({ length: pages - 1 }, (_, i) => listMyMatches({ page: i + 1, size: FETCH_SIZE })),
        );
        all = all.concat(...rest.map((r) => r.data || []));
      }
      setMatches(all);
      setTotalOnServer(first.pagination?.totalElements ?? all.length);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách trận.'));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    try {
      localStorage.setItem('myMatches.view', view);
    } catch {
      /* per-viewer convenience only */
    }
  }, [view]);

  // "/" focuses the search box, like most lists on the web.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement;
      if (event.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName) && !target.isContentEditable) {
        event.preventDefault();
        searchRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, []);

  /* ---- analysis status: live polling for running analyses, a one-off check for failed ones */

  const analyzingIds = useMemo(() => matches.filter((m) => m.status === 'ANALYZING').map((m) => m.id), [matches]);
  const readyIds = useMemo(() => matches.filter((m) => m.status === 'READY').slice(0, 20).map((m) => m.id), [matches]);

  const fetchStatuses = useCallback(async (ids: number[]) => {
    if (!ids.length) return [];
    const results = await Promise.allSettled(ids.map((id) => getAnalysisStatus(id)));
    const fresh: AnalysisStatus[] = [];
    results.forEach((r) => r.status === 'fulfilled' && fresh.push(r.value));
    setStatuses((prev) => {
      const next = { ...prev };
      fresh.forEach((s) => (next[s.matchId] = s));
      return next;
    });
    return fresh;
  }, []);

  useEffect(() => {
    fetchStatuses(readyIds);
  }, [readyIds, fetchStatuses]);

  const analyzingKey = analyzingIds.join(',');
  useEffect(() => {
    if (!analyzingIds.length) return;
    let stopped = false;
    const tick = async () => {
      const fresh = await fetchStatuses(analyzingIds);
      if (stopped) return;
      const finished = fresh.filter((s) => !['QUEUED', 'PROCESSING'].includes(String(s.status)));
      if (finished.length) {
        finished.forEach((s) => {
          const m = matches.find((x) => x.id === s.matchId);
          const name = m ? `${m.playerAName} gặp ${m.playerBName}` : `Trận #${s.matchId}`;
          if (s.status === 'COMPLETED') toast.success(`AI đã phân tích xong "${name}"`);
          else if (FAILED_STATES.includes(String(s.status))) toast.error(`Phân tích "${name}" không thành công`);
        });
        load(true);
      }
    };
    tick();
    const timer = window.setInterval(() => {
      if (document.visibilityState === 'visible') tick();
    }, POLL_MS);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [analyzingKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ---- derived lists */

  const counts = useMemo(() => {
    const byGroup: Record<Group, number> = { WAITING: 0, ANALYZING: 0, ANALYZED: 0, FAILED: 0 };
    let rallies = 0;
    let strokes = 0;
    let seconds = 0;
    for (const m of matches) {
      byGroup[groupOf(m, statuses[m.id])] += 1;
      rallies += m.totalRallies ?? 0;
      strokes += m.totalStrokes ?? 0;
      seconds += Number(m.durationSeconds ?? 0);
    }
    return { byGroup, rallies, strokes, seconds };
  }, [matches, statuses]);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = matches.filter((m) => {
      if (filter !== 'ALL' && groupOf(m, statuses[m.id]) !== filter) return false;
      if (!q) return true;
      return [m.playerAName, m.playerBName, m.title, m.description].some((s) => s && s.toLowerCase().includes(q));
    });
    const time = (v?: string | null) => (v ? new Date(v).getTime() || 0 : 0);
    const sorted = [...list];
    switch (sort) {
      case 'created-asc':
        sorted.sort((a, b) => time(a.createdAt) - time(b.createdAt));
        break;
      case 'date-desc':
        sorted.sort((a, b) => time(b.matchDate) - time(a.matchDate));
        break;
      case 'rallies-desc':
        sorted.sort((a, b) => (b.totalRallies ?? 0) - (a.totalRallies ?? 0));
        break;
      case 'name-asc':
        sorted.sort((a, b) => a.playerAName.localeCompare(b.playerAName, 'vi'));
        break;
      default:
        sorted.sort((a, b) => time(b.createdAt) - time(a.createdAt));
    }
    return sorted;
  }, [matches, statuses, filter, query, sort]);

  useEffect(() => setPage(0), [filter, query, sort]);

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const pageItems = visible.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  useEffect(() => {
    if (page > 0 && page >= totalPages) setPage(totalPages - 1);
  }, [page, totalPages]);

  const analyzingMatches = matches.filter((m) => m.status === 'ANALYZING');
  const failedMatches = matches.filter((m) => isFailed(m, statuses[m.id]));

  /* ---- delete */

  const handleConfirmDelete = async () => {
    if (!matchToDelete) return;
    try {
      setIsDeleting(true);
      await deleteMatch(matchToDelete.id);
      setMatches((prev) => prev.filter((m) => m.id !== matchToDelete.id));
      setTotalOnServer((n) => Math.max(0, n - 1));
      toast.success(`Đã xóa "${matchToDelete.title || `${matchToDelete.playerAName} gặp ${matchToDelete.playerBName}`}"`);
      setMatchToDelete(null);
    } catch (err) {
      setError(errorMessage(err, 'Không xóa được trận.'));
    } finally {
      setIsDeleting(false);
    }
  };

  useEffect(() => {
    if (!matchToDelete) return;
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && !isDeleting && setMatchToDelete(null);
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [matchToDelete, isDeleting]);

  const hasMatches = matches.length > 0;
  // One line of numbers under the title; zeros say nothing, so they are left out.
  const summaryParts = [
    `${numberFormat.format(totalOnServer)} trận`,
    counts.seconds ? `${humanMinutes(counts.seconds)} video` : null,
    counts.rallies ? `${numberFormat.format(counts.rallies)} pha cầu` : null,
    counts.strokes ? `${numberFormat.format(counts.strokes)} cú đánh` : null,
  ].filter(Boolean);

  /* ---- render */

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 pt-4 font-vn">
      <header className="flex flex-wrap items-end gap-3">
        <div className="min-w-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-ink">Trận của tôi</h1>
          {!loading && hasMatches && <p className="text-sm text-ink/65 mt-1 tabular-nums">{summaryParts.join(' · ')}</p>}
        </div>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            onClick={() => load(true)}
            disabled={refreshing || loading}
            className="inline-flex items-center justify-center w-10 h-10 rounded-md border border-ink/15 text-ink/70 hover:text-ink hover:border-pitch/50 disabled:opacity-50"
            title="Tải lại danh sách"
            aria-label="Tải lại danh sách"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} aria-hidden />
          </button>
          <Link to="/matches/create" className="inline-flex items-center gap-1.5 rounded-md px-4 h-10 text-sm font-semibold bg-pitch hover:bg-pitch-deep text-white">
            <Plus className="w-4 h-4" aria-hidden /> Thêm trận
          </Link>
        </div>
      </header>

      {error && (
        <Notice tone="error" action={{ label: 'Thử lại', onClick: () => load() }} onClose={() => setError(null)}>
          {error}
        </Notice>
      )}

      {totalOnServer > matches.length && (
        <Notice tone="info">
          Đang hiển thị {numberFormat.format(matches.length)} trận gần nhất trên tổng {numberFormat.format(totalOnServer)} trận.
        </Notice>
      )}

      {/* Running analyses, live. */}
      {analyzingMatches.length > 0 && (
        <section aria-labelledby="live-title" className="space-y-3">
          <div className="flex items-center gap-2">
            <span className="relative flex w-2.5 h-2.5">
              <span className="absolute inline-flex w-full h-full rounded-full bg-pb opacity-60 animate-ping" />
              <span className="relative inline-flex w-2.5 h-2.5 rounded-full bg-pb" />
            </span>
            <h2 id="live-title" className="font-semibold text-ink">
              Đang phân tích <span className="text-ink/55 font-normal tabular-nums">({analyzingMatches.length})</span>
            </h2>
            <span className="ml-auto text-xs text-ink/55">Tự cập nhật mỗi {POLL_MS / 1000} giây</span>
          </div>
          <ul className="space-y-3">
            {analyzingMatches.map((m) => (
              <LiveAnalysisCard key={m.id} match={m} status={statuses[m.id]} />
            ))}
          </ul>
        </section>
      )}

      {/* Failed analyses need the coach. */}
      {failedMatches.length > 0 && filter !== 'FAILED' && (
        <Notice
          tone="error"
          action={{ label: 'Xem các trận lỗi', onClick: () => setFilter('FAILED') }}
          hint="Thường do góc quay không chuẩn hoặc người chơi bị che khuất lâu. Bạn có thể phân tích lại."
        >
          {failedMatches.length} trận phân tích không thành công.
        </Notice>
      )}

      {/* Toolbar: status tabs, search, sort, view. */}
      {hasMatches && (
        <div className="space-y-3">
          <div className="flex gap-1 border-b border-ink/10 overflow-x-auto" role="tablist" aria-label="Lọc theo trạng thái">
            {FILTERS.filter((t) => t.id === 'ALL' || counts.byGroup[t.id] > 0 || filter === t.id).map((tab) => {
              const count = tab.id === 'ALL' ? matches.length : counts.byGroup[tab.id];
              const active = filter === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  role="tab"
                  aria-selected={active}
                  onClick={() => setFilter(tab.id)}
                  className={`relative px-3 h-10 text-sm whitespace-nowrap transition-colors ${
                    active
                      ? 'text-ink font-medium after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-pitch'
                      : 'text-ink/70 hover:text-ink'
                  }`}
                >
                  {tab.label}
                  <span
                    className={`ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 text-xs tabular-nums ${
                      tab.id === 'FAILED' ? 'bg-loss/10 text-loss' : active ? 'bg-pitch-soft text-pitch-deep' : 'bg-ink/5 text-ink/65'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <label className="relative flex-1 min-w-[14rem]">
              <span className="sr-only">Tìm trận</span>
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/45" aria-hidden />
              <input
                ref={searchRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Tìm theo tên đấu thủ, tiêu đề…"
                className="w-full h-10 rounded-md border border-ink/15 bg-sheet pl-9 pr-16 text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:ring-2 focus:ring-pitch/40 focus:border-pitch/50"
              />
              {query ? (
                <button
                  type="button"
                  onClick={() => setQuery('')}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink/50 hover:text-ink"
                  aria-label="Xóa tìm kiếm"
                >
                  <X className="w-4 h-4" />
                </button>
              ) : (
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 hidden sm:inline rounded border border-ink/15 px-1.5 text-[11px] text-ink/45">/</kbd>
              )}
            </label>

            <label className="relative">
              <span className="sr-only">Sắp xếp</span>
              <ArrowUpDown className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-ink/45 pointer-events-none" aria-hidden />
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortId)}
                className="h-10 rounded-md border border-ink/15 bg-sheet pl-9 pr-8 text-sm text-ink focus:outline-none focus:ring-2 focus:ring-pitch/40"
              >
                {SORTS.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <div className="inline-flex rounded-md border border-ink/15 bg-sheet p-0.5" role="group" aria-label="Kiểu hiển thị">
              {(['grid', 'list'] as const).map((v) => {
                const Icon = v === 'grid' ? LayoutGrid : List;
                return (
                  <button
                    key={v}
                    type="button"
                    onClick={() => setView(v)}
                    aria-pressed={view === v}
                    title={v === 'grid' ? 'Dạng lưới' : 'Dạng danh sách'}
                    className={`h-9 w-9 inline-flex items-center justify-center rounded ${view === v ? 'bg-pitch-soft text-pitch-deep' : 'text-ink/55 hover:text-ink'}`}
                  >
                    <Icon className="w-4 h-4" aria-hidden />
                  </button>
                );
              })}
            </div>
          </div>

          {(query || filter !== 'ALL') && (
            <p className="text-sm text-ink/65">
              {visible.length} kết quả
              {query && (
                <>
                  {' '}cho “<span className="text-ink">{query}</span>”
                </>
              )}
            </p>
          )}
        </div>
      )}

      {/* The list. */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <div key={n} className="rounded-xl bg-sheet border border-ink/10 overflow-hidden">
              <div className="aspect-video bg-ink/10 animate-pulse" />
              <div className="p-4 space-y-2">
                <div className="h-4 w-3/4 rounded bg-ink/10 animate-pulse" />
                <div className="h-4 w-1/2 rounded bg-ink/10 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      ) : !hasMatches && !error ? (
        <div className="rounded-2xl border-2 border-dashed border-ink/15 bg-sheet px-6 py-12 text-center space-y-6">
          <div className="space-y-2">
            <h2 className="text-xl font-semibold text-ink">Chưa có trận nào</h2>
            <p className="text-sm text-ink/70 max-w-md mx-auto">Ba bước để có bản phân tích đầu tiên:</p>
          </div>
          <ol className="grid sm:grid-cols-3 gap-4 max-w-3xl mx-auto text-left">
            {[
              { icon: Plus, title: 'Tạo trận', text: 'Nhập tên hai đấu thủ và ai đứng phía trên sân.' },
              { icon: Upload, title: 'Thêm video', text: 'Tải file lên hoặc dán link YouTube, chọn đoạn cần phân tích.' },
              { icon: Sparkles, title: 'AI phân tích', text: 'Theo dõi tiến trình ngay tại đây, xem Replay khi pha cầu đầu tiên xong.' },
            ].map((s, i) => (
              <li key={s.title} className="rounded-xl bg-ground p-4">
                <span className="w-8 h-8 rounded-full bg-pitch text-white inline-flex items-center justify-center text-sm font-bold">{i + 1}</span>
                <p className="font-semibold text-ink mt-2 flex items-center gap-1.5">
                  <s.icon className="w-4 h-4 text-pitch" aria-hidden /> {s.title}
                </p>
                <p className="text-sm text-ink/70 mt-1">{s.text}</p>
              </li>
            ))}
          </ol>
          <Link to="/matches/create" className="inline-flex items-center gap-1.5 rounded-md px-5 h-11 text-sm font-semibold bg-pitch hover:bg-pitch-deep text-white">
            <Plus className="w-4 h-4" aria-hidden /> Thêm trận đầu tiên
          </Link>
        </div>
      ) : visible.length === 0 && hasMatches ? (
        <EmptyState
          icon={Inbox}
          title={query ? 'Không tìm thấy trận phù hợp' : 'Không có trận nào ở mục này'}
          description={query ? 'Thử tên đấu thủ khác hoặc bỏ bớt bộ lọc.' : 'Các trận của bạn đang ở trạng thái khác.'}
          action={{
            label: 'Xem tất cả trận',
            onClick: () => {
              setFilter('ALL');
              setQuery('');
            },
          }}
        />
      ) : view === 'grid' ? (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {pageItems.map((match) => (
            <MatchCard key={match.id} match={match} status={statuses[match.id]} onDelete={setMatchToDelete} />
          ))}
          {filter === 'ALL' && !query && page === totalPages - 1 && (
            <li>
              <Link
                to="/matches/create"
                className="h-full min-h-[18rem] rounded-xl border-2 border-dashed border-ink/20 hover:border-pitch/60 hover:bg-pitch-soft/40 flex flex-col items-center justify-center gap-3 p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/40"
              >
                <span className="w-12 h-12 rounded-full bg-pitch text-white flex items-center justify-center">
                  <Plus className="w-6 h-6" aria-hidden />
                </span>
                <span className="font-semibold text-ink">Thêm trận</span>
                <span className="text-sm text-ink/70 max-w-[16rem]">Tải video hoặc dán link YouTube, AI chỉ ra những điểm bị mất và vì sao.</span>
              </Link>
            </li>
          )}
        </ul>
      ) : (
        <ul className="rounded-xl bg-sheet border border-ink/10 divide-y divide-ink/10 overflow-hidden">
          {pageItems.map((match) => (
            <MatchRow key={match.id} match={match} status={statuses[match.id]} onDelete={setMatchToDelete} />
          ))}
        </ul>
      )}

      {!loading && totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Phân trang">
          <button
            type="button"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={page === 0}
            className="p-2 rounded-md border border-ink/15 text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:border-pitch/50"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {Array.from({ length: totalPages }, (_, i) => i)
            .filter((i) => i === 0 || i === totalPages - 1 || Math.abs(i - page) <= 1)
            .map((i, idx, arr) => (
              <React.Fragment key={i}>
                {idx > 0 && i - arr[idx - 1] > 1 && <span className="text-ink/40 px-1">…</span>}
                <button
                  type="button"
                  onClick={() => setPage(i)}
                  aria-current={i === page ? 'page' : undefined}
                  className={`min-w-[2.25rem] h-9 rounded-md text-sm tabular-nums ${
                    i === page ? 'bg-pitch text-white font-semibold' : 'border border-ink/15 text-ink hover:border-pitch/50'
                  }`}
                >
                  {i + 1}
                </button>
              </React.Fragment>
            ))}
          <button
            type="button"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
            className="p-2 rounded-md border border-ink/15 text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:border-pitch/50"
            aria-label="Trang sau"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </nav>
      )}

      {matchToDelete && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-ink/40"
          onMouseDown={(event) => event.target === event.currentTarget && !isDeleting && setMatchToDelete(null)}
        >
          <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-xl bg-sheet p-6 shadow-xl space-y-4">
            <div className="flex items-start gap-3">
              <span className="w-10 h-10 rounded-full bg-loss/10 text-loss flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" aria-hidden />
              </span>
              <div>
                <h2 id="delete-title" className="text-lg font-semibold text-ink">Xóa trận này?</h2>
                <p className="text-sm text-ink/70 leading-relaxed mt-1">
                  <strong className="text-ink">
                    {matchToDelete.playerAName} gặp {matchToDelete.playerBName}
                  </strong>{' '}
                  cùng kết quả phân tích sẽ không còn trong danh sách của bạn.
                </p>
              </div>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                disabled={isDeleting}
                className="px-4 h-9 rounded-md text-sm font-medium text-ink border border-ink/15 hover:border-ink/30"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-4 h-9 rounded-md text-sm font-medium bg-loss hover:bg-loss/90 text-white disabled:opacity-60"
              >
                {isDeleting ? 'Đang xóa…' : 'Xóa trận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------- list items */

interface ItemProps {
  match: Match;
  status?: AnalysisStatus;
  onDelete: (match: Match) => void;
}

const MatchMeta: React.FC<{ match: Match }> = ({ match }) => {
  const players = `${match.playerAName} gặp ${match.playerBName}`;
  const title = match.title && match.title !== players ? match.title : null;
  return (
    <span className="block text-sm text-ink/65 truncate">
      {formatDate(match.matchDate)}
      {title && <> · {title}</>}
      <span className="text-ink/45"> · thêm {relativeTime(match.createdAt)}</span>
    </span>
  );
};

const ActionButtons: React.FC<ItemProps> = ({ match, status, onDelete }) => {
  const step = nextStep(match, status);
  const Icon = step.icon;
  return (
    <>
      <Link
        to={step.to}
        className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-sm font-medium whitespace-nowrap transition-colors ${
          step.primary
            ? 'bg-pitch hover:bg-pitch-deep text-white'
            : isFailed(match, status)
              ? 'border border-loss/40 text-loss hover:bg-loss/5'
              : 'border border-ink/15 text-ink hover:border-pitch/50'
        }`}
      >
        <Icon className="w-3.5 h-3.5" aria-hidden />
        {step.action}
      </Link>
      <button
        type="button"
        onClick={() => onDelete(match)}
        className="p-2 rounded-md text-ink/55 hover:text-loss hover:bg-loss/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss/40"
        aria-label={`Xóa trận ${match.playerAName} gặp ${match.playerBName}`}
        title="Xóa trận"
      >
        <Trash2 className="w-4 h-4" aria-hidden />
      </button>
    </>
  );
};

const Footnote: React.FC<{ match: Match; status?: AnalysisStatus }> = ({ match, status }) => {
  if (match.status === 'ANALYZING') {
    const p = status?.progressPercent ?? 0;
    return (
      <span className="flex-1 min-w-0 space-y-1">
        <span className="flex justify-between text-xs text-ink/65">
          <span className="truncate">{stageText(status)}</span>
          <span className="tabular-nums font-medium text-ink">{p}%</span>
        </span>
        <ProgressBar percent={p} live thin />
      </span>
    );
  }
  if (isFailed(match, status)) {
    return <span className="text-sm text-loss truncate">{status?.errorMessage || 'Lần phân tích trước không thành công'}</span>;
  }
  if (match.totalRallies) {
    return (
      <span className="text-sm text-ink/70 tabular-nums">
        {match.totalRallies} pha · {numberFormat.format(match.totalStrokes ?? 0)} cú
      </span>
    );
  }
  return <span className="text-sm text-ink/60">{match.status === 'DRAFT' ? 'Cần tải video' : 'Video đã sẵn sàng'}</span>;
};

const MatchCard: React.FC<ItemProps> = (props) => {
  const { match, status } = props;
  const step = nextStep(match, status);
  const duration = clock(match.durationSeconds);
  return (
    <li className="group relative rounded-xl bg-sheet border border-ink/10 overflow-hidden flex flex-col shadow-sm hover:shadow-md hover:-translate-y-0.5 hover:border-pitch/40 transition-all">
      <Link to={step.to} className="block relative aspect-video overflow-hidden" tabIndex={-1} aria-hidden>
        <Thumb match={match} className="absolute inset-0 group-hover:scale-[1.03] transition-transform duration-500" />
        <span className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-transparent" />
        <span className={`absolute top-2 left-2 inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${step.badge}`}>
          {match.status === 'ANALYZING' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
          {step.label}
          {match.status === 'ANALYZING' && status && <span className="tabular-nums">· {status.progressPercent}%</span>}
        </span>
        {duration && (
          <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">{duration}</span>
        )}
        {step.primary && (
          <span className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
            <span className="w-12 h-12 rounded-full bg-white/90 text-pitch-deep flex items-center justify-center shadow-lg">
              <Play className="w-5 h-5 ml-0.5 fill-current" />
            </span>
          </span>
        )}
        {match.status === 'ANALYZING' && (
          <span className="absolute inset-x-0 bottom-0 h-1 bg-black/30">
            <span className="block h-full bg-pb transition-[width] duration-700" style={{ width: `${Math.max(3, status?.progressPercent ?? 0)}%` }} />
          </span>
        )}
      </Link>

      <div className="flex-1 flex flex-col gap-3 p-4">
        <Link to={step.to} className="min-w-0 space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/40 rounded">
          <Scoreboard match={match} />
          <MatchMeta match={match} />
        </Link>
        <div className="mt-auto flex items-center gap-2">
          <Footnote match={match} status={status} />
          <span className="ml-auto flex items-center gap-1">
            <ActionButtons {...props} />
          </span>
        </div>
      </div>
    </li>
  );
};

const MatchRow: React.FC<ItemProps> = (props) => {
  const { match, status } = props;
  const step = nextStep(match, status);
  const duration = clock(match.durationSeconds);
  return (
    <li className="flex items-center gap-4 p-3 hover:bg-ground/60 transition-colors">
      <Link to={step.to} className="relative shrink-0 w-32 rounded-md overflow-hidden" tabIndex={-1} aria-hidden>
        <Thumb match={match} className="relative aspect-video" />
        {duration && <span className="absolute bottom-1 right-1 rounded bg-black/75 px-1 text-[11px] tabular-nums text-white">{duration}</span>}
      </Link>
      <Link to={step.to} className="flex-1 min-w-0 space-y-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/40 rounded">
        <div className="max-w-md">
          <Scoreboard match={match} />
        </div>
        <MatchMeta match={match} />
      </Link>
      <div className="hidden md:flex w-56 shrink-0 flex-col gap-1">
        <span className={`self-start inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${step.badge === 'bg-white/90 text-ink' ? 'bg-ink/5 text-ink' : step.badge}`}>
          {step.label}
        </span>
        <Footnote match={match} status={status} />
      </div>
      <span className="flex items-center gap-1 shrink-0">
        <ActionButtons {...props} />
      </span>
    </li>
  );
};
