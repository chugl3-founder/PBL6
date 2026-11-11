import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Trash2, AlertTriangle, CheckCircle2, ChevronLeft, ChevronRight, Play } from 'lucide-react';
import apiClient from '../api/client';

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
      return { label: 'Chưa có video', tone: 'text-ink/50', action: 'Tải video lên', to: `/matches/${match.id}`, primary: false };
    case 'READY':
      return { label: 'Chưa phân tích', tone: 'text-ink/50', action: 'Phân tích', to: `/matches/${match.id}`, primary: false };
    case 'ANALYZING':
      return { label: 'AI đang phân tích', tone: 'text-pb', action: 'Xem ngay', to: `/matches/${match.id}/replay`, primary: true };
    default:
      return { label: 'Đã phân tích', tone: 'text-pitch', action: 'Xem lại trận', to: `/matches/${match.id}/replay`, primary: true };
  }
};

const formatDate = (value: string) => {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleDateString('vi-VN');
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

  const fetchMatches = async (statusFilter?: string, page: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, size: 10 };
      if (statusFilter && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await apiClient.get('/matches', { params });
      setMatches(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không tải được danh sách trận.');
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
      await apiClient.delete(`/matches/${matchToDelete.id}`);
      setMatches((prev) => prev.filter((m) => m.id !== matchToDelete.id));
      setSuccessMsg(`Đã xóa "${matchToDelete.title || `${matchToDelete.playerAName} gặp ${matchToDelete.playerBName}`}"`);
      setMatchToDelete(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không xóa được trận.');
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
    <div className="max-w-5xl mx-auto space-y-6 pb-16 pt-4">
      <header className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-ink">Trận của tôi</h1>
          {pagination && pagination.totalElements > 0 && (
            <p className="text-sm text-ink/55 mt-1">{pagination.totalElements} trận</p>
          )}
        </div>
      </header>

      {successMsg && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-pitch-soft text-pitch-deep text-sm">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}
      {error && (
        <div className="flex items-center gap-2 px-4 py-3 rounded-md bg-loss/10 text-loss text-sm">
          <AlertTriangle className="w-4 h-4 shrink-0" />
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
                : 'text-ink/55 hover:text-ink'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="rounded-lg bg-sheet border border-ink/10 divide-y divide-ink/10">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-[76px] animate-pulse bg-ink/[0.02]" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        <div className="rounded-lg bg-sheet border border-ink/10 px-6 py-14 text-center space-y-4">
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-ink">
              {selectedStatus === 'ALL' ? 'Bạn chưa có trận nào' : 'Không có trận nào ở mục này'}
            </h2>
            {selectedStatus === 'ALL' && (
              <p className="text-sm text-ink/60">Tải video một trận lên, AI sẽ chỉ ra những điểm bị mất và vì sao.</p>
            )}
          </div>
          {selectedStatus === 'ALL' && (
            <Link
              to="/matches/create"
              className="inline-flex items-center gap-1.5 rounded-md bg-pitch hover:bg-pitch-deep px-4 h-10 text-sm font-semibold text-white transition-colors"
            >
              <Plus className="h-4 w-4" />
              Thêm trận đầu tiên
            </Link>
          )}
        </div>
      ) : (
        <ul className="rounded-lg bg-sheet border border-ink/10 divide-y divide-ink/10">
          {matches.map((match) => {
            const step = nextStep(match);
            const upper = match.upperPlayer === 'PLAYER_B' ? match.playerBName : match.playerAName;
            const lower = match.upperPlayer === 'PLAYER_B' ? match.playerAName : match.playerBName;
            const players = `${match.playerAName} gặp ${match.playerBName}`;
            const title = match.title && match.title !== players ? match.title : null;
            return (
              <li key={match.id} className="group flex items-center gap-4 px-4 sm:px-5 py-4 hover:bg-ink/[0.02] transition-colors">
                <Link to={step.to} className="flex-1 min-w-0 flex items-center gap-4">
                  <span className="flex flex-col gap-1 shrink-0" aria-hidden>
                    <span className="w-1 h-4 rounded-full bg-pa" />
                    <span className="w-1 h-4 rounded-full bg-pb" />
                  </span>
                  <span className="min-w-0">
                    <span className="block font-semibold text-ink truncate">
                      {upper} <span className="font-normal text-ink/40">gặp</span> {lower}
                    </span>
                    <span className="block text-sm text-ink/55 truncate">
                      {formatDate(match.matchDate)}
                      {title && <> · {title}</>}
                    </span>
                  </span>
                </Link>

                <span className={`hidden sm:inline text-sm whitespace-nowrap ${step.tone}`}>
                  {match.status === 'ANALYZING' && (
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-pb mr-1.5 align-middle animate-pulse" />
                  )}
                  {step.label}
                </span>

                <Link
                  to={step.to}
                  className={`inline-flex items-center gap-1.5 rounded-md px-3 h-9 text-sm font-medium whitespace-nowrap transition-colors ${
                    step.primary
                      ? 'bg-pitch hover:bg-pitch-deep text-white'
                      : 'border border-ink/15 text-ink hover:border-pitch/50'
                  }`}
                >
                  {step.primary && <Play className="w-3.5 h-3.5" />}
                  {step.action}
                </Link>

                <button
                  type="button"
                  onClick={() => setMatchToDelete(match)}
                  className="p-2 rounded-md text-ink/30 hover:text-loss hover:bg-loss/10 sm:opacity-0 sm:group-hover:opacity-100 focus:opacity-100 transition"
                  aria-label={`Xóa trận ${players}`}
                  title="Xóa trận"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </li>
            );
          })}
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
          <span className="text-sm text-ink/60 px-2">
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
                {isDeleting ? 'Đang xóa...' : 'Xóa trận'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
