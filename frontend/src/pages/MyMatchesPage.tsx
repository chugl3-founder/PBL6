import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Video, 
  Calendar, 
  ArrowRight, 
  UploadCloud, 
  Sparkles, 
  Activity, 
  Layers,
  ChevronRight,
  Clock,
  Trash2,
  AlertTriangle,
  X,
  CheckCircle2,
  ChevronLeft
} from 'lucide-react';
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

export const MyMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [pagination, setPagination] = useState<PaginationMeta | null>(null);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Modal Xóa mềm
  const [matchToDelete, setMatchToDelete] = useState<MatchItem | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchMatches = async (statusFilter?: string, page: number = 0) => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page, size: 8 };
      if (statusFilter && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await apiClient.get('/matches', { params });
      setMatches(res.data.data || []);
      setPagination(res.data.pagination || null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách trận đấu.');
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
      setSuccessMsg(`Đã xóa mềm thành công trận đấu #${matchToDelete.id}`);
      setMatchToDelete(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể xóa trận đấu.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Bản nháp (Chưa có Video)
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand/15 border border-brand/30 text-sky-300 shadow-glow-blue/40">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            Video sẵn sàng
          </span>
        );
      case 'ANALYZING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300 animate-pulse">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Đang phân tích AI
          </span>
        );
      case 'ANALYZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-glow-green/30">
            <Activity className="w-3 h-3 text-emerald-400" />
            Đã phân tích xong
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-16 pt-2">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-card-bg via-[#162744] to-card-bg border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-sky-300">
            <Layers className="h-3.5 w-3.5 text-brand" />
            <span>Badminton Analytics Hub</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Trận đấu của tôi
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Quản lý kho dữ liệu trận đấu, theo dõi tiến độ tải lên video MinIO, xóa mềm an toàn và mở báo cáo phân tích chi tiết.
          </p>
        </div>

        <div className="z-10 flex items-center gap-3">
          <Link
            to="/matches/create"
            className="inline-flex items-center space-x-2 px-5 py-3 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-full shadow-glow-blue transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo trận đấu mới</span>
          </Link>
        </div>
      </div>

      {/* Thông báo Thành công / Lỗi */}
      {successMsg && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-sm animate-fade-in shadow-lg">
          <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {error && (
        <div className="flex items-center gap-2.5 p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm shadow-lg">
          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* 2. Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-1.5 bg-card-bg/80 border border-white/10 p-1 rounded-2xl backdrop-blur-md overflow-x-auto scrollbar-none">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'DRAFT', label: 'Chờ Upload (DRAFT)' },
            { id: 'READY', label: 'Sẵn sàng (READY)' },
            { id: 'ANALYZING', label: 'Đang xử lý (ANALYZING)' },
            { id: 'ANALYZED', label: 'Đã hoàn tất (ANALYZED)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                selectedStatus === tab.id
                  ? 'bg-brand text-white shadow-glow-blue'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {pagination && pagination.totalElements > 0 && (
          <span className="text-xs text-slate-400">
            Tổng cộng: <strong className="text-white">{pagination.totalElements}</strong> trận đấu
          </span>
        )}
      </div>

      {/* 3. Match List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-48 rounded-2xl bg-card-bg/40 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        /* Empty State */
        <div className="p-12 sm:p-16 rounded-3xl bg-card-bg/60 border border-white/10 text-center space-y-5 max-w-xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto text-brand">
            <Video className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-heading text-lg font-bold text-white">Chưa có trận đấu nào</h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              Bạn chưa tạo trận đấu nào {selectedStatus !== 'ALL' ? 'ở trạng thái này' : ''}. Hãy khởi tạo trận đấu để bắt đầu phân tích kỹ thuật!
            </p>
          </div>
          <Link
            to="/matches/create"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-full shadow-glow-blue transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Khởi tạo trận đấu đầu tiên</span>
          </Link>
        </div>
      ) : (
        /* Matches Bento Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {matches.map((match) => (
            <div
              key={match.id}
              className="p-6 rounded-3xl bg-card-bg border border-white/10 hover:border-brand/40 hover:shadow-glow-blue/20 transition-all duration-300 space-y-5 relative group flex flex-col justify-between"
            >
              {/* Card Top: Match Title & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-brand font-bold">#{match.id}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {match.matchDate}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                    {match.title || `Trận đấu #${match.id}`}
                  </h3>
                </div>
                {getStatusBadge(match.status)}
              </div>

              {/* Court Matchup Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                    {match.upperPlayer === 'PLAYER_A' ? 'A' : 'B'}
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Sân trên (Top Court)</div>
                    <div className="font-semibold text-white text-xs sm:text-sm">
                      {match.upperPlayer === 'PLAYER_A' ? match.playerAName : match.playerBName}
                    </div>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-bold text-slate-400">
                  VS
                </div>

                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <div className="text-[11px] text-slate-400">Sân dưới (Bottom Court)</div>
                    <div className="font-semibold text-white text-xs sm:text-sm">
                      {match.lowerPlayer === 'PLAYER_A' ? match.playerAName : match.playerBName}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {match.lowerPlayer === 'PLAYER_A' ? 'A' : 'B'}
                  </div>
                </div>
              </div>

              {/* Card Bottom Actions */}
              <div className="pt-3 border-t border-white/5 flex items-center justify-between gap-2">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Tạo lúc: {new Date(match.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>

                <div className="flex items-center gap-2">
                  {/* Nút Xóa Mềm */}
                  <button
                    onClick={() => setMatchToDelete(match)}
                    className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 border border-transparent hover:border-rose-500/30 transition-all"
                    title="Xóa trận đấu (Soft Delete)"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>

                  {/* Nút Chức năng theo trạng thái */}
                  {match.status === 'DRAFT' && (
                    <Link
                      to={`/matches/${match.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-hover text-white shadow-glow-blue transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Video</span>
                    </Link>
                  )}

                  {match.status === 'READY' && (
                    <Link
                      to={`/matches/${match.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all"
                    >
                      <Video className="w-3.5 h-3.5 text-sky-400" />
                      <span>Xem Video & Phân tích</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {match.status === 'ANALYZED' && (
                    <Link
                      to={`/public-matches/${match.id}/replay`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-green transition-all"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Xem Replay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 4. Pagination Controls */}
      {pagination && pagination.totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 pt-6">
          <button
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 0}
            className="p-2 rounded-xl bg-card-bg border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-xs text-slate-300 px-3 py-1.5 rounded-xl bg-card-bg border border-white/10">
            Trang <strong className="text-white">{currentPage + 1}</strong> / {pagination.totalPages}
          </span>
          <button
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage >= pagination.totalPages - 1}
            className="p-2 rounded-xl bg-card-bg border border-white/10 text-white disabled:opacity-30 disabled:cursor-not-allowed hover:bg-white/10 transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* 5. Modal Xác Nhận Xóa Mềm (Soft Delete) */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-md rounded-3xl bg-[#0e1726] border border-white/15 p-6 sm:p-7 shadow-2xl space-y-6 relative overflow-hidden">
            <div className="absolute top-0 right-0 w-48 h-48 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

            <div className="flex items-start justify-between">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <button
                onClick={() => setMatchToDelete(null)}
                className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-2">
              <h3 className="font-heading text-xl font-bold text-white">Xác nhận xóa trận đấu</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Bạn có chắc chắn muốn xóa trận đấu{' '}
                <strong className="text-white">
                  "{matchToDelete.title || `Trận đấu #${matchToDelete.id}`}"
                </strong>{' '}
                không?
              </p>
              <p className="text-xs text-slate-400 bg-slate-900/60 p-3 rounded-xl border border-white/5">
                💡 Trận đấu sẽ được đưa vào thùng rác và ẩn khỏi danh sách của bạn (xóa mềm). Toàn bộ video và dữ liệu liên quan vẫn được lưu trữ an toàn.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-full text-xs font-semibold text-slate-300 hover:text-white hover:bg-white/5 border border-white/10 transition-colors"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmDelete}
                disabled={isDeleting}
                className="px-5 py-2.5 rounded-full text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white shadow-lg shadow-rose-900/40 transition-all flex items-center gap-1.5"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>{isDeleting ? 'Đang xóa...' : 'Xác nhận xóa'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
