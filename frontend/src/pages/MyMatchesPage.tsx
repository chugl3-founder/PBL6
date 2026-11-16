import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import { deleteMatch, listMyMatches } from '../api/matches';
import { errorMessage } from '../api/errors';

interface MatchItem {
  id: number;
  title: string | null;
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  lowerPlayer: string;
  matchDate: string;
  status: 'DRAFT' | 'READY' | 'ANALYZING' | 'ANALYZED' | 'PUBLISHED' | string;
  createdAt: string;
  thumbnailUrl?: string | null;
  youtubeVideoId?: string | null;
  durationSeconds?: number | null;
  totalRallies?: number | null;
  totalStrokes?: number | null;
}

interface PaginationMeta {
  page: number;
  size: number;
  totalElements: number;
  totalPages: number;
}

const FILTERS = [
  { id: 'ALL', label: 'Tất cả' },
  { id: 'ANALYZED', label: 'Đã phân tích' },
  { id: 'ANALYZING', label: 'Đang phân tích' },
  { id: 'READY', label: 'Chưa phân tích' },
  { id: 'DRAFT', label: 'Chưa có video' },
];

/** What the match is waiting for, in the coach's words, and the one thing to do next. */
const nextStep = (match: MatchItem) => {
  switch (match.status) {
    case 'DRAFT':
      return { label: 'Chưa có video', badge: 'bg-white/90 text-ink', hint: 'Cần tải video', action: 'Tải video lên', to: `/matches/${match.id}`, primary: false };
    case 'READY':
      return { label: 'Chưa phân tích', badge: 'bg-white/90 text-ink', hint: 'Video đã sẵn sàng', action: 'Phân tích', to: `/matches/${match.id}`, primary: false };
    case 'ANALYZING':
      return { label: 'AI đang phân tích', badge: 'bg-pb text-white', hint: 'Xem được ngay', action: 'Xem ngay', to: `/matches/${match.id}/replay`, primary: true };
    default:
      return { label: 'Đã phân tích', badge: 'bg-pitch text-white', hint: '', action: 'Xem lại trận', to: `/matches/${match.id}/replay`, primary: true };
  }
};

const numberFormat = new Intl.NumberFormat('vi-VN');

const formatDuration = (seconds?: number | null) => {
  if (!seconds) return null;
  const total = Math.round(Number(seconds));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
};

/** Matches the summary strip reads at once; enough for a coach, and said so when exceeded. */
const SUMMARY_SIZE = 100;

interface Summary {
  matches: number;
  analyzed: number;
  analyzing: number;
  rallies: number;
  strokes: number;
  capped: boolean;
  byStatus: Record<string, number>;
}

/** A match without a picture yet: the court seen from the camera, faintly. */
const CourtPlaceholder: React.FC = () => (
  <svg viewBox="0 0 320 180" preserveAspectRatio="xMidYMid slice" className="absolute inset-0 w-full h-full" aria-hidden>
    <rect width="320" height="180" fill="#16201B" />
    <polygon points="112,26 208,26 262,160 58,160" fill="#2E7D5B" opacity="0.55" stroke="#fff" strokeOpacity="0.5" strokeWidth="1.5" />
    <line x1="86" y1="84" x2="234" y2="84" stroke="#fff" strokeOpacity="0.6" strokeWidth="2" />
    <line x1="160" y1="26" x2="160" y2="160" stroke="#fff" strokeOpacity="0.3" />
  </svg>
);

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : new Intl.DateTimeFormat('vi-VN').format(date);
};

export const MyMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<MatchItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [summary, setSummary] = useState<Summary | null>(null);

  const fetchSummary = async () => {
    try {
      const res = await listMyMatches({ page: 0, size: SUMMARY_SIZE });
      const all: MatchItem[] = res.data || [];
      const byStatus: Record<string, number> = {};
      for (const m of all) {
        const key = m.status === 'DRAFT' || m.status === 'READY' || m.status === 'ANALYZING' ? m.status : 'ANALYZED';
        byStatus[key] = (byStatus[key] ?? 0) + 1;
      }
      setSummary({
        matches: res.pagination?.totalElements ?? all.length,
        analyzed: byStatus.ANALYZED ?? 0,
        analyzing: byStatus.ANALYZING ?? 0,
        rallies: all.reduce((sum, m) => sum + (m.totalRallies ?? 0), 0),
        strokes: all.reduce((sum, m) => sum + (m.totalStrokes ?? 0), 0),
        capped: (res.pagination?.totalElements ?? 0) > all.length,
        byStatus,
      });
    } catch {
      setSummary(null); // the list below still works without the strip
    }
  };

  useEffect(() => {
    fetchSummary();
  }, []);

  const fetchMatches = async (statusFilter?: string, page: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      const res = await listMyMatches({
        page,
        size: 10,
        status: statusFilter && statusFilter !== 'ALL' ? statusFilter : undefined,
      });
      setMatches(res.data || []);
      setPagination(res.pagination || null);
    } catch (err) {
      setError(errorMessage(err, 'Không tải được danh sách trận.'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(0);
    fetchMatches(selectedStatus, 0);
  }, [selectedStatus]);

  const handlePageChange = (newPage: number) => {
    if (newPage >= 0 && pagination && newPage < pagination.totalPages) {
      setCurrentPage(newPage);
      fetchMatches(selectedStatus, newPage);
    }
  };

  const handleConfirmDelete = async () => {
    if (!matchToDelete) return;
    try {
      setIsDeleting(true);
      await deleteMatch(matchToDelete.id);
      setMatches((prev) => prev.filter((m) => m.id !== matchToDelete.id));
      setSuccessMsg(`Đã xóa "${matchToDelete.title || `${matchToDelete.playerAName} gặp ${matchToDelete.playerBName}`}"`);
      setMatchToDelete(null);
      fetchSummary();
      setTimeout(() => setSuccessMsg(null), 4000);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16 pt-4 font-vn">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-ink">Trận của tôi</h1>
        {summary && summary.matches > 0 && (
          <p className="text-sm text-ink/70 mt-1">
            {summary.matches} trận{summary.capped && ` (đếm trên ${SUMMARY_SIZE} trận gần nhất)`}
          </p>
        )}
      </header>


      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-pitch-soft text-pitch-deep text-sm" role="status">
          <CheckCircle2 className="w-4 h-4 shrink-0" aria-hidden />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-loss/10 text-loss text-sm" role="alert">
          <AlertTriangle className="w-4 h-4 shrink-0" aria-hidden />
          <span>{error}</span>
        </div>
      )}

      <div className="flex gap-1 border-b border-ink/10 overflow-x-auto" role="tablist" aria-label="Lọc theo trạng thái">
        {FILTERS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selectedStatus === tab.id}
            onClick={() => setSelectedStatus(tab.id)}
            className={`relative px-3 h-10 text-sm whitespace-nowrap transition-colors ${
              selectedStatus === tab.id
                ? 'text-ink font-medium after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-pitch'
                : 'text-ink/70 hover:text-ink'
            }`}
          >
            {tab.label}
            {summary && tab.id !== 'ALL' && summary.byStatus[tab.id] ? (
              <span className="ml-1.5 text-xs tabular-nums text-ink/65">{summary.byStatus[tab.id]}</span>
            ) : null}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {[1, 2, 3].map((n) => (
            <div key={n} className="rounded-lg bg-sheet border border-ink/10 h-72 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 && selectedStatus !== 'ALL' ? (
        <p className="rounded-lg bg-sheet border border-ink/10 px-6 py-10 text-center text-sm text-ink/70">Không có trận nào ở mục này.</p>
      ) : (
        <ul className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {matches.map((match) => {
            const step = nextStep(match);
            const upper = match.upperPlayer === 'PLAYER_B' ? match.playerBName : match.playerAName;
            const lower = match.upperPlayer === 'PLAYER_B' ? match.playerAName : match.playerBName;
            const players = `${match.playerAName} gặp ${match.playerBName}`;
            const title = match.title && match.title !== players ? match.title : null;
            const thumb = match.thumbnailUrl || (match.youtubeVideoId ? `https://img.youtube.com/vi/${match.youtubeVideoId}/mqdefault.jpg` : null);
            const duration = formatDuration(match.durationSeconds);
            return (
              <li key={match.id} className="group relative rounded-lg bg-sheet border border-ink/10 overflow-hidden flex flex-col hover:border-pitch/40 transition-colors">
                <Link to={step.to} className="block relative aspect-video overflow-hidden bg-ink" tabIndex={-1} aria-hidden>
                  {thumb ? (
                    <img src={thumb} alt="" width={320} height={180} loading="lazy" className="absolute inset-0 w-full h-full object-cover" />
                  ) : (
                    <CourtPlaceholder />
                  )}
                  <span className={`absolute top-2 left-2 inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold ${step.badge}`}>
                    {match.status === 'ANALYZING' && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                    {step.label}
                  </span>
                  {duration && (
                    <span className="absolute bottom-2 right-2 rounded bg-black/75 px-1.5 py-0.5 text-xs font-medium tabular-nums text-white">{duration}</span>
                  )}
                </Link>

                <div className="flex-1 flex flex-col gap-3 p-4">
                  <Link to={step.to} className="min-w-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/40 rounded">
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <span className="w-2 h-2 rounded-full bg-pa shrink-0" aria-hidden />
                      <span className="truncate">{upper}</span>
                    </span>
                    <span className="flex items-center gap-2 font-semibold text-ink">
                      <span className="w-2 h-2 rounded-full bg-pb shrink-0" aria-hidden />
                      <span className="truncate">{lower}</span>
                    </span>
                    <span className="block text-sm text-ink/70 truncate mt-1">
                      {formatDate(match.matchDate)}
                      {title && <> · {title}</>}
                    </span>
                  </Link>

                  <div className="mt-auto flex items-center gap-2">
                    {match.totalRallies ? (
                      <span className="text-sm text-ink/70 tabular-nums">
                        {match.totalRallies} pha · {numberFormat.format(match.totalStrokes ?? 0)} cú
                      </span>
                    ) : (
                      <span className="text-sm text-ink/70">{step.hint}</span>
                    )}
                    <Link
                      to={step.to}
                      className={`ml-auto inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-sm font-medium whitespace-nowrap transition-colors ${
                        step.primary ? 'bg-pitch hover:bg-pitch-deep text-white' : 'border border-ink/15 text-ink hover:border-pitch/50'
                      }`}
                    >
                      {step.primary && <Play className="w-3.5 h-3.5" aria-hidden />}
                      {step.action}
                    </Link>
                    <button
                      type="button"
                      onClick={() => setMatchToDelete(match)}
                      className="p-2 rounded-md text-ink/55 hover:text-loss hover:bg-loss/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-loss/40"
                      aria-label={`Xóa trận ${players}`}
                      title="Xóa trận"
                    >
                      <Trash2 className="w-4 h-4" aria-hidden />
                    </button>
                  </div>
                </div>
              </li>
            );
          })}

          {selectedStatus === 'ALL' && (
            <li>
              <Link
                to="/matches/create"
                className="h-full min-h-[18rem] rounded-lg border-2 border-dashed border-ink/20 hover:border-pitch/60 hover:bg-pitch-soft/40 flex flex-col items-center justify-center gap-3 p-6 text-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/40"
              >
                <span className="w-12 h-12 rounded-full bg-pitch text-white flex items-center justify-center">
                  <Plus className="w-6 h-6" aria-hidden />
                </span>
                <span className="font-semibold text-ink">{matches.length === 0 ? 'Thêm trận đầu tiên' : 'Thêm trận'}</span>
                <span className="text-sm text-ink/70 max-w-[16rem]">Tải video hoặc dán link YouTube, AI chỉ ra những điểm bị mất và vì sao.</span>
              </Link>
            </li>
          )}
        </ul>
      )}

      {pagination && pagination.totalPages > 1 && (
        <nav className="flex items-center justify-center gap-2" aria-label="Phân trang">
          <button
            type="button"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="p-2 rounded-md border border-ink/15 text-ink disabled:opacity-30 disabled:cursor-not-allowed hover:border-pitch/50"
            aria-label="Trang trước"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm text-ink/70 px-2">
            Trang {currentPage + 1} / {pagination.totalPages}
          </span>
          <button
            type="button"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= pagination.totalPages - 1}
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
          <div role="dialog" aria-modal="true" aria-labelledby="delete-title" className="w-full max-w-sm rounded-lg bg-sheet p-6 shadow-xl space-y-4">
            <h2 id="delete-title" className="text-lg font-semibold text-ink">Xóa trận này?</h2>
            <p className="text-sm text-ink/70 leading-relaxed">
              <strong className="text-ink">{matchToDelete.playerAName} gặp {matchToDelete.playerBName}</strong> sẽ không còn trong
              danh sách của bạn.
            </p>
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
