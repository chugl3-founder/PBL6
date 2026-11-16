import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Cpu,
  Loader2,
  ExternalLink,
  RotateCcw,
} from 'lucide-react';
import { listAnalyses, retryAnalysisAsAdmin } from '../../api/admin';
import { errorMessage } from '../../api/errors';
import type { AdminAnalysis, DashboardMetrics } from '../../types/admin';
import { LoadError, LoadMore, AiStatusBadge } from './adminUi';
import { Feedback, PAGE_SIZE, loadErrorText } from './adminFormat';

/** The list refreshes itself this often while the monitor is open. */
const POLL_MS = 5000;

interface AiMonitorSectionProps {
  dashboardMetrics: DashboardMetrics | null;
  showFeedback: Feedback;
  /** Refreshes the overview numbers along with the list. */
  onChanged: () => void;
}

/** /admin/ai-monitor: every AI analysis, refreshed while open, with retry for failed ones (VS-18). */
export const AiMonitorSection: React.FC<AiMonitorSectionProps> = ({ dashboardMetrics, showFeedback, onChanged }) => {
  const [analyses, setAnalyses] = useState<AdminAnalysis[]>([]);
  const [analysesTotal, setAnalysesTotal] = useState(0);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [aiStatusFilter, setAiStatusFilter] = useState<string>('ALL');
  const [aiActionLoadingId, setAiActionLoadingId] = useState<number | null>(null);

  const fetchAnalyses = async (status: string, showSpinner = true, size = PAGE_SIZE) => {
    try {
      if (showSpinner) setAnalysesLoading(true);
      const page = await listAnalyses(status, size);
      setAnalyses(page.data || []);
      if (page.pagination?.totalElements !== undefined) {
        setAnalysesTotal(page.pagination.totalElements);
      }
      setLoadError(null);
    } catch (err) {
      console.error('Lỗi khi tải danh sách phiên phân tích AI cho Admin:', err);
      setLoadError(loadErrorText(err, 'danh sách phiên phân tích AI'));
    } finally {
      if (showSpinner) setAnalysesLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses(aiStatusFilter, true);
  }, [aiStatusFilter]);  

  // Refresh while open, skipping hidden tabs.
  useEffect(() => {
    const timer = setInterval(() => {
      if (document.hidden) return;
      fetchAnalyses(aiStatusFilter, false, Math.max(PAGE_SIZE, analyses.length));
      onChanged();
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [aiStatusFilter, analyses.length]); // eslint-disable-line react-hooks/exhaustive-deps

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchAnalyses(aiStatusFilter, false, analyses.length + PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleAdminRetryAnalysis = async (analysisItem: AdminAnalysis) => {
    try {
      setAiActionLoadingId(analysisItem.id);
      const res = await retryAnalysisAsAdmin(analysisItem.id);
      showFeedback(
        'success',
        res.message ||
          `Đã kích hoạt chạy lại phiên phân tích AI mới #${res.analysisId} cho trận đấu #${analysisItem.matchId}!`,
      );
      await fetchAnalyses(aiStatusFilter, false, Math.max(PAGE_SIZE, analyses.length));
      onChanged();
    } catch (err) {
      showFeedback('error', errorMessage(err, 'Không thể chạy lại phiên phân tích AI.'));
    } finally {
      setAiActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* 4 Thẻ tóm tắt nhanh dành riêng cho phân hệ Giám sát AI */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="bg-[#0f1d35]/85 border border-white/10 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400">Tổng số phiên AI</div>
          <div className="text-xl font-black text-white mt-0.5">
            {dashboardMetrics?.totalAiAnalyses ?? '–'}
          </div>
        </div>
        <div className="bg-[#0f1d35]/85 border border-emerald-500/25 rounded-2xl p-4">
          <div className="text-[11px] text-emerald-300">Hoàn tất (COMPLETED)</div>
          <div className="text-xl font-black text-emerald-400 mt-0.5">
            {dashboardMetrics?.completedAiAnalyses ?? '–'}
          </div>
        </div>
        <div className="bg-[#0f1d35]/85 border border-sky-500/25 rounded-2xl p-4">
          <div className="text-[11px] text-sky-300">Đang xử lý / Hàng đợi</div>
          <div className="text-xl font-black text-sky-400 mt-0.5">
            {dashboardMetrics?.processingAiAnalyses ?? '–'}
          </div>
        </div>
        <div className="bg-[#0f1d35]/85 border border-rose-500/25 rounded-2xl p-4">
          <div className="text-[11px] text-rose-300">Gặp lỗi cần Retry (FAILED)</div>
          <div className="text-xl font-black text-rose-400 mt-0.5">
            {dashboardMetrics?.failedAiAnalyses ?? '–'}
          </div>
        </div>
      </div>

      <section className="bg-[#0f1d35]/90 border border-white/10 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Cpu className="w-5 h-5 text-purple-400" />
              <span>Giám Sát Tiến Trình Phân Tích AI & Điều Phối Khẩn Cấp</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Theo dõi thời gian thực các phiên xử lý AI trong toàn hệ thống, tra cứu mã lỗi và kích hoạt chạy lại khẩn cấp (VS-18)
            </p>
          </div>

          {/* Bộ lọc trạng thái AI */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            {[
              { key: 'ALL', label: 'Tất cả phiên AI' },
              { key: 'PROCESSING', label: 'Đang xử lý' },
              { key: 'QUEUED', label: 'Trong hàng đợi' },
              { key: 'COMPLETED', label: 'Hoàn tất' },
              { key: 'FAILED', label: 'Gặp sự cố (FAILED)' },
              { key: 'CANCELLED', label: 'Đã hủy' },
            ].map((st) => (
              <button
                key={st.key}
                onClick={() => setAiStatusFilter(st.key)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                  aiStatusFilter === st.key
                    ? st.key === 'FAILED'
                      ? 'bg-rose-600 text-white shadow-lg'
                      : 'bg-brand text-white shadow-glow-blue'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                }`}
              >
                {st.label}
              </button>
            ))}
          </div>
        </div>

        {analysesLoading && (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
            <span className="text-xs text-slate-400">
              Đang tải danh sách phiên phân tích AI...
            </span>
          </div>
        )}

        {!analysesLoading && loadError && (
          <LoadError message={loadError} onRetry={() => fetchAnalyses(aiStatusFilter, true)} />
        )}

        {!analysesLoading && !loadError && analyses.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">
            Không có phiên phân tích AI nào phù hợp với bộ lọc hiện tại.
          </div>
        )}

        {!analysesLoading && analyses.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 px-3 whitespace-nowrap">Phiên AI & Mô Hình</th>
                  <th className="pb-3 px-3">Trận Đấu & Người Tạo</th>
                  <th className="pb-3 px-3 whitespace-nowrap">Trạng Thái & Tiến Độ</th>
                  <th className="pb-3 px-3">Chi Tiết Lỗi / Thời Gian</th>
                  <th className="pb-3 px-3 text-right whitespace-nowrap">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {analyses.map((a) => {
                  const canRetry =
                    a.status === 'FAILED' ||
                    a.status === 'UNSUPPORTED' ||
                    a.status === 'CANCELLED';
                  const isRetrying = aiActionLoadingId === a.id;

                  return (
                    <tr key={a.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-3 whitespace-nowrap">
                        <div className="font-bold text-white text-sm flex items-center gap-2">
                          <span>Phiên #{a.id}</span>
                          {a.isCurrent ? (
                            <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[11px] text-emerald-300 font-semibold">
                              Phiên hiện tại
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[11px] text-slate-400">
                              Lịch sử cũ
                            </span>
                          )}
                        </div>
                        <div className="text-purple-300 font-mono text-[11px] mt-0.5">
                          {a.modelName || 'CoachAI+'} ({a.modelVersion || '2.0'})
                        </div>
                      </td>

                      <td className="py-4 px-3 max-w-xs">
                        <div className="font-bold text-white text-xs line-clamp-1">
                          {a.matchTitle ||
                            `${a.playerAName || 'Player A'} vs ${a.playerBName || 'Player B'}`}
                        </div>
                        <div className="text-sky-400 text-[11px] mt-0.5">
                          Trận #{a.matchId} • {a.playerAName} vs {a.playerBName}
                        </div>
                        <div className="text-slate-500 text-[11px]">
                          Chủ sở hữu: {a.ownerEmail || 'Hệ thống'}
                        </div>
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        <div><AiStatusBadge status={a.status} /></div>
                        {(a.status === 'PROCESSING' || a.status === 'QUEUED') && (
                          <div className="mt-2 w-44 space-y-1">
                            <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                              <div
                                className="h-full bg-brand transition-all duration-300"
                                style={{ width: `${a.progressPercent || 10}%` }}
                              />
                            </div>
                            <div className="text-[11px] text-sky-300 truncate">
                              {a.progressPercent || 0}% •{' '}
                              {a.currentStage || 'Đang khởi tạo...'}
                            </div>
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-3 max-w-xs">
                        {a.errorCode || a.errorMessage ? (
                          <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/25 space-y-0.5">
                            {a.errorCode && (
                              <div className="font-mono font-bold text-rose-400 text-[11px]">
                                Mã lỗi: {a.errorCode}
                              </div>
                            )}
                            {a.errorMessage && (
                              <div className="text-rose-200/90 text-[11px] line-clamp-2">
                                {a.errorMessage}
                              </div>
                            )}
                          </div>
                        ) : (
                          <div className="text-slate-400 text-[11px] space-y-0.5 whitespace-nowrap">
                            <div>
                              Tạo lúc:{' '}
                              {a.createdAt
                                ? new Date(a.createdAt).toLocaleString('vi-VN')
                                : 'N/A'}
                            </div>
                            {a.completedAt && (
                              <div className="text-emerald-400/80">
                                Hoàn tất: {new Date(a.completedAt).toLocaleString('vi-VN')}
                              </div>
                            )}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-3 text-right whitespace-nowrap">
                        <div className="inline-flex items-center gap-2">
                          {a.matchId && (
                            <Link
                              to={`/matches/${a.matchId}`}
                              target="_blank"
                              className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10"
                              title="Xem trang chi tiết trận đấu"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
                          )}

                          <button
                            type="button"
                            disabled={!canRetry || isRetrying}
                            onClick={() => handleAdminRetryAnalysis(a)}
                            title={
                              canRetry
                                ? 'Kích hoạt chạy lại khẩn cấp phiên phân tích AI này'
                                : 'Chỉ khả dụng cho các phiên bị lỗi (FAILED / UNSUPPORTED) hoặc đã hủy'
                            }
                            className="px-3.5 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-bold transition-all flex items-center gap-1.5 disabled:opacity-35 disabled:cursor-not-allowed"
                          >
                            {isRetrying ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : (
                              <>
                                <RotateCcw className="w-3.5 h-3.5" />
                                <span>Thử lại (Retry)</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!analysesLoading && analysesTotal > analyses.length && (
          <LoadMore shown={analyses.length} total={analysesTotal} loading={loadingMore} onClick={() => loadMore()} />
        )}
      </section>
    </div>
  );
};
