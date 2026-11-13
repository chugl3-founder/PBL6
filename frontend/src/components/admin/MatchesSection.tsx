import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Globe,
  EyeOff,
  Loader2,
  ExternalLink,
  Trash2,
  RotateCcw,
  AlertTriangle,
  X,
} from 'lucide-react';
import { deleteMatchAsAdmin, listAdminMatches, publishMatch, restoreMatch, unpublishMatch } from '../../api/admin';
import { errorMessage } from '../../api/errors';
import type { DashboardMetrics } from '../../types/admin';
import type { Match } from '../../types/match';
import { LoadError, LoadMore, MatchStatusBadge } from './adminUi';
import { Feedback, PAGE_SIZE, loadErrorText } from './adminFormat';

const filterTabs = [
  { key: 'ALL', label: 'Tất cả hoạt động' },
  { key: 'PUBLISHED', label: 'Đang công khai' },
  { key: 'ANALYZED', label: 'Đã phân tích' },
  { key: 'DRAFT', label: 'Bản nháp' },
  { key: 'DELETED', label: 'Thùng rác (Đã xóa)' },
];

interface MatchesSectionProps {
  dashboardMetrics: DashboardMetrics | null;
  showFeedback: Feedback;
  /** Publishing, deleting and restoring change the overview numbers. */
  onChanged: () => void;
}

/** /admin/matches: every match, publishing to the public library and the recycle bin (VS-16). */
export const MatchesSection: React.FC<MatchesSectionProps> = ({ dashboardMetrics, showFeedback, onChanged }) => {
  const [matches, setMatches] = useState<Match[]>([]);
  const [matchesTotal, setMatchesTotal] = useState(0);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<Match | null>(null);

  const fetchMatches = async (status: string, size = PAGE_SIZE, showSpinner = true) => {
    try {
      if (showSpinner) setMatchesLoading(true);
      const page = await listAdminMatches(status, size);
      setMatches(page.data || []);
      setMatchesTotal(page.pagination?.totalElements ?? (page.data || []).length);
      setLoadError(null);
    } catch (err) {
      console.error('Lỗi khi tải danh sách trận đấu cho Admin:', err);
      setLoadError(loadErrorText(err, 'danh sách trận đấu'));
    } finally {
      if (showSpinner) setMatchesLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(filterStatus);
  }, [filterStatus]);  

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchMatches(filterStatus, matches.length + PAGE_SIZE, false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleTogglePublish = async (matchId: number, currentStatus: string) => {
    try {
      setActionLoadingId(matchId);
      const unpublishing = currentStatus === 'PUBLISHED';
      const updated = unpublishing ? await unpublishMatch(matchId) : await publishMatch(matchId);
      setMatches((prev) => prev.map((m) => (m.id === matchId ? updated : m)));
      showFeedback(
        'success',
        unpublishing
          ? `Đã gỡ công khai trận đấu #${matchId} về chế độ riêng tư.`
          : `Đã duyệt xuất bản trận đấu #${matchId} lên Thư viện công khai!`,
      );
      onChanged();
    } catch (err) {
      showFeedback('error', errorMessage(err, 'Không thể cập nhật trạng thái xuất bản của trận đấu.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!matchToDelete) return;
    const matchId = matchToDelete.id;
    try {
      setActionLoadingId(matchId);
      await deleteMatchAsAdmin(matchId);
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      setMatchToDelete(null);
      showFeedback('success', `Đã xóa mềm trận đấu #${matchId} vào Thùng rác.`);
      onChanged();
    } catch (err) {
      showFeedback('error', errorMessage(err, 'Không thể xóa trận đấu.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestoreMatch = async (matchId: number) => {
    try {
      setActionLoadingId(matchId);
      await restoreMatch(matchId);
      if (filterStatus === 'DELETED') {
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
      } else {
        fetchMatches(filterStatus);
      }
      showFeedback('success', `Đã khôi phục thành công trận đấu #${matchId} từ Thùng rác!`);
      onChanged();
    } catch (err) {
      showFeedback('error', errorMessage(err, 'Không thể khôi phục trận đấu.'));
    } finally {
      setActionLoadingId(null);
    }
  };

  return (
    <>
      <div className="space-y-5 min-w-0">
        {/* 4 Thẻ tóm tắt nhanh dành riêng cho phân hệ Trận đấu */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
          <div className="bg-[#0f1d35]/85 border border-white/10 rounded-2xl p-4">
            <div className="text-[11px] text-slate-400">Tổng trận đang hoạt động</div>
            <div className="text-xl font-black text-white mt-0.5">
              {dashboardMetrics?.totalMatches ?? '–'}
            </div>
          </div>
          <div className="bg-[#0f1d35]/85 border border-emerald-500/25 rounded-2xl p-4">
            <div className="text-[11px] text-emerald-300">Đang công khai (PUBLISHED)</div>
            <div className="text-xl font-black text-emerald-400 mt-0.5">
              {dashboardMetrics?.publishedMatches ?? '–'}
            </div>
          </div>
          <div className="bg-[#0f1d35]/85 border border-sky-500/25 rounded-2xl p-4">
            <div className="text-[11px] text-sky-300">Đã phân tích chờ duyệt (ANALYZED)</div>
            <div className="text-xl font-black text-sky-400 mt-0.5">
              {dashboardMetrics?.analyzedMatches ?? '–'}
            </div>
          </div>
          <div className="bg-[#0f1d35]/85 border border-rose-500/25 rounded-2xl p-4">
            <div className="text-[11px] text-rose-300">Trong thùng rác (DELETED)</div>
            <div className="text-xl font-black text-rose-400 mt-0.5">
              {dashboardMetrics?.deletedMatches ?? '–'}
            </div>
          </div>
        </div>

        <section className="bg-[#0f1d35]/90 border border-white/10 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl min-w-0">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-400" />
                <span>Danh Sách Trận Đấu & Kiểm Duyệt Thư Viện Công Khai</span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Duyệt xuất bản (Publish), gỡ công khai (Unpublish), xóa mềm vi phạm hoặc khôi phục từ thùng rác (VS-16)
              </p>
            </div>

            {/* Bộ lọc */}
            <div className="flex flex-wrap items-center gap-2 text-xs">
              {filterTabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setFilterStatus(tab.key)}
                  className={`px-3.5 py-1.5 rounded-full font-semibold transition-all ${
                    filterStatus === tab.key
                      ? tab.key === 'DELETED'
                        ? 'bg-rose-600 text-white shadow-lg'
                        : 'bg-brand text-white shadow-glow-blue'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>
          </div>

          {matchesLoading && (
            <div className="py-16 flex flex-col items-center justify-center space-y-3">
              <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
              <span className="text-xs text-slate-400">Đang tải danh sách trận đấu…</span>
            </div>
          )}

          {!matchesLoading && loadError && (
            <LoadError message={loadError} onRetry={() => fetchMatches(filterStatus)} />
          )}

          {!matchesLoading && !loadError && matches.length === 0 && (
            <div className="py-12 text-center text-slate-400 text-sm">
              {filterStatus === 'DELETED'
                ? 'Thùng rác đang trống. Không có trận đấu nào bị xóa mềm.'
                : 'Không tìm thấy trận đấu nào với bộ lọc hiện tại.'}
            </div>
          )}

          {!matchesLoading && matches.length > 0 && (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                    <th className="pb-3 px-3">Trận Đấu & Người Tạo</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Nguồn Video</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Thời Lượng / Dữ Liệu AI</th>
                    <th className="pb-3 px-3 whitespace-nowrap">Trạng Thái</th>
                    <th className="pb-3 px-3 text-right whitespace-nowrap">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {matches.map((item) => {
                    const isPublished = item.status === 'PUBLISHED';
                    const isDeleted = Boolean(item.deletedAt);
                    const isOperating = actionLoadingId === item.id;
                    const canPublish =
                      !isDeleted &&
                      (item.status === 'ANALYZED' ||
                        item.status === 'PUBLISHED' ||
                        (item.totalStrokes && item.totalStrokes > 0));

                    return (
                      <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                        <td className="py-4 px-3 max-w-xs">
                          <div className="font-bold text-white text-sm line-clamp-1">
                            {item.title || `${item.playerAName} vs ${item.playerBName}`}
                          </div>
                          <div className="text-sky-400 text-xs mt-0.5 font-medium">
                            {item.playerAName}{' '}
                            <span className="text-white/40 font-normal">đối đầu</span>{' '}
                            {item.playerBName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Mã: #{item.id} • Chủ sở hữu: {item.ownerEmail || `User #${item.ownerId}`}
                          </div>
                        </td>

                        <td className="py-4 px-3 whitespace-nowrap">
                          {item.youtubeVideoId ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
                              <span>YouTube Nhúng</span>
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">
                              <span>MinIO S3</span>
                            </span>
                          )}
                        </td>

                        <td className="py-4 px-3 text-slate-300 whitespace-nowrap">
                          <div>
                            {item.durationSeconds
                              ? `${Math.floor(item.durationSeconds / 60)} phút`
                              : item.status === 'DRAFT'
                              ? 'Chưa có video'
                              : 'Chưa rõ thời lượng'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.totalRallies || 0} pha cầu • {item.totalStrokes || 0} cú đánh
                          </div>
                        </td>

                        <td className="py-4 px-3 whitespace-nowrap">
                          <MatchStatusBadge status={item.status} deletedAt={item.deletedAt} />
                        </td>

                        <td className="py-4 px-3 text-right whitespace-nowrap">
                          <div className="inline-flex items-center gap-2">
                            {isDeleted ? (
                              <button
                                type="button"
                                disabled={isOperating}
                                onClick={() => handleRestoreMatch(item.id)}
                                className="px-3.5 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 font-bold transition-all flex items-center gap-1.5"
                              >
                                {isOperating ? (
                                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <>
                                    <RotateCcw className="w-3.5 h-3.5" />
                                    <span>Khôi phục</span>
                                  </>
                                )}
                              </button>
                            ) : (
                              <>
                                <Link
                                  to={
                                    isPublished
                                      ? `/public-matches/${item.id}/replay`
                                      : `/matches/${item.id}`
                                  }
                                  target="_blank"
                                  className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10"
                                  title="Xem chi tiết / Phát lại trận đấu"
                                >
                                  <ExternalLink className="w-4 h-4" />
                                </Link>

                                <button
                                  type="button"
                                  disabled={isOperating || !canPublish}
                                  onClick={() => handleTogglePublish(item.id, item.status)}
                                  title={
                                    !canPublish
                                      ? 'Chỉ có thể xuất bản trận đấu đã hoàn tất phân tích AI'
                                      : isPublished
                                      ? 'Gỡ khỏi Thư viện công khai'
                                      : 'Xuất bản lên Thư viện công khai'
                                  }
                                  className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 disabled:opacity-40 disabled:cursor-not-allowed ${
                                    isPublished
                                      ? 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border border-amber-500/30'
                                      : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-glow-blue'
                                  }`}
                                >
                                  {isOperating ? (
                                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                  ) : isPublished ? (
                                    <>
                                      <EyeOff className="w-3.5 h-3.5" />
                                      <span>Gỡ công khai</span>
                                    </>
                                  ) : (
                                    <>
                                      <Globe className="w-3.5 h-3.5" />
                                      <span>Xuất bản</span>
                                    </>
                                  )}
                                </button>

                                <button
                                  type="button"
                                  disabled={isOperating}
                                  onClick={() => setMatchToDelete(item)}
                                  className="p-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/25 text-rose-400 border border-rose-500/25 transition-colors"
                                  title="Xóa mềm trận đấu vào Thùng rác"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}

          {!matchesLoading && matchesTotal > matches.length && (
            <LoadMore shown={matches.length} total={matchesTotal} loading={loadingMore} onClick={() => loadMore()} />
          )}
        </section>
      </div>

      {/* Modal xác nhận xóa mềm trận đấu */}
      {matchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-3xl bg-[#0f1a2e] border border-white/15 p-6 shadow-2xl space-y-5">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center text-rose-400">
                  <AlertTriangle className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-heading font-bold text-white text-base">
                    Xác nhận xóa mềm trận đấu
                  </h3>
                  <p className="text-xs text-slate-400">Trận đấu #{matchToDelete.id}</p>
                </div>
              </div>
              <button
                onClick={() => setMatchToDelete(null)}
                className="text-white/40 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Bạn có chắc chắn muốn chuyển trận đấu{' '}
              <strong className="text-white">
                {matchToDelete.title ||
                  `${matchToDelete.playerAName} vs ${matchToDelete.playerBName}`}
              </strong>{' '}
              vào Thùng rác? Bạn có thể khôi phục lại trận đấu này bất kỳ lúc nào trong tab{' '}
              <strong>Thùng rác (Đã xóa)</strong>.
            </p>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setMatchToDelete(null)}
                className="px-4 py-2 rounded-full bg-white/5 hover:bg-white/10 text-xs font-semibold text-slate-300 border border-white/10 transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                disabled={actionLoadingId === matchToDelete.id}
                onClick={handleConfirmDelete}
                className="px-5 py-2 rounded-full bg-rose-600 hover:bg-rose-500 text-xs font-bold text-white shadow-lg transition flex items-center gap-1.5"
              >
                {actionLoadingId === matchToDelete.id ? (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Trash2 className="w-3.5 h-3.5" />
                )}
                <span>Xác nhận xóa</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
