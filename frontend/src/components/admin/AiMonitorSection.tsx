import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Cpu, ExternalLink, RotateCcw } from 'lucide-react';
import { listAnalyses, retryAnalysisAsAdmin } from '../../api/admin';
import { errorMessage } from '../../api/errors';
import type { AdminAnalysis } from '../../types/admin';
import type { AdminOutletContext } from '../layout/AdminLayout';
import { EmptyState } from '../ui/EmptyState';
import { toast } from '../ui/toastBus';
import {
  AiStatusBadge,
  FilterTabs,
  LoadError,
  LoadMore,
  SectionHeader,
  Sheet,
  SkeletonRows,
  TextAction,
  rowClass,
  tableClass,
  tdClass,
  thClass,
  theadClass,
} from './adminUi';
import { PAGE_SIZE, formatDateTime, loadErrorText, timeAgo } from './adminFormat';

/** The list refreshes itself this often while the page is open. */
const POLL_MS = 5000;

const STATUSES = ['ALL', 'PROCESSING', 'QUEUED', 'FAILED', 'COMPLETED', 'CANCELLED'];
const RETRYABLE = ['FAILED', 'UNSUPPORTED', 'CANCELLED'];

/** /admin/ai-monitor: every AI analysis, refreshed while open, with retry for the ones that stopped. */
export const AiMonitorSection: React.FC<AdminOutletContext> = ({ metrics, refreshMetrics }) => {
  const [params, setParams] = useSearchParams();
  const status = STATUSES.includes(params.get('status') ?? '') ? (params.get('status') as string) : 'ALL';
  const setStatus = (key: string) => setParams(key === 'ALL' ? {} : { status: key }, { replace: true });

  const [analyses, setAnalyses] = useState<AdminAnalysis[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);

  const fetchAnalyses = async (s: string, showSpinner = true, size = PAGE_SIZE) => {
    try {
      if (showSpinner) setLoading(true);
      const page = await listAnalyses(s, size);
      setAnalyses(page.data || []);
      setTotal(page.pagination?.totalElements ?? (page.data || []).length);
      setLoadError(null);
    } catch (err) {
      setLoadError(loadErrorText(err, 'danh sách phiên phân tích'));
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchAnalyses(status, true);
  }, [status]);  

  // Refresh while open, skipping hidden tabs.
  useEffect(() => {
    const timer = setInterval(() => {
      if (!document.hidden) fetchAnalyses(status, false, Math.max(PAGE_SIZE, analyses.length));
    }, POLL_MS);
    return () => clearInterval(timer);
  }, [status, analyses.length]);  

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchAnalyses(status, false, analyses.length + PAGE_SIZE);
    } finally {
      setLoadingMore(false);
    }
  };

  const retry = async (a: AdminAnalysis) => {
    setBusyId(a.id);
    try {
      const res = await retryAnalysisAsAdmin(a.id);
      toast.success(`Đã chạy lại phân tích trận #${a.matchId} (phiên mới #${res.analysisId}).`);
      await fetchAnalyses(status, false, Math.max(PAGE_SIZE, analyses.length));
      refreshMetrics();
    } catch (err) {
      toast.error(errorMessage(err, 'Không chạy lại được phiên phân tích.'));
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả', count: metrics?.totalAiAnalyses },
    { key: 'PROCESSING', label: 'Đang chạy' },
    { key: 'QUEUED', label: 'Chờ đến lượt' },
    { key: 'FAILED', label: 'Lỗi', count: metrics?.aiStatusBreakdown?.FAILED },
    { key: 'COMPLETED', label: 'Hoàn tất', count: metrics?.completedAiAnalyses },
    { key: 'CANCELLED', label: 'Đã hủy', count: metrics?.aiStatusBreakdown?.CANCELLED },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Phân tích AI"
        description="Mọi lần AI phân tích video, cập nhật mỗi 5 giây. Phiên bị lỗi hoặc đã hủy có thể chạy lại cho người dùng."
      />

      <FilterTabs tabs={tabs} value={status} onChange={setStatus} label="Lọc phiên phân tích theo trạng thái" />

      {loadError && <LoadError message={loadError} onRetry={() => fetchAnalyses(status, true)} />}

      <Sheet className="overflow-hidden">
        {loading ? (
          <SkeletonRows />
        ) : !loadError && analyses.length === 0 ? (
          <EmptyState
            compact
            icon={Cpu}
            title={status === 'FAILED' ? 'Không có phiên nào bị lỗi' : 'Không có phiên phân tích nào ở mục này'}
            action={status !== 'ALL' ? { label: 'Xem tất cả phiên', onClick: () => setStatus('ALL') } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Phiên</th>
                  <th className={thClass}>Trận</th>
                  <th className={thClass}>Tình trạng</th>
                  <th className={thClass}>Thời gian</th>
                  <th className={`${thClass} text-right`}>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {analyses.map((a) => {
                  const running = a.status === 'PROCESSING' || a.status === 'QUEUED';
                  const canRetry = RETRYABLE.includes(a.status);
                  const model = [a.modelName, a.modelVersion].filter(Boolean).join(' ');
                  return (
                    <tr key={a.id} className={rowClass}>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        <p className="font-medium text-ink tabular-nums" title={model || undefined}>#{a.id}</p>
                        <p className="text-xs text-ink/60">{a.isCurrent ? 'Kết quả đang dùng' : 'Lần chạy cũ'}</p>
                      </td>
                      <td className={`${tdClass} max-w-[18rem]`}>
                        <p className="font-medium text-ink truncate">
                          {a.playerAName || 'Người chơi A'} gặp {a.playerBName || 'Người chơi B'}
                        </p>
                        <p className="text-xs text-ink/60 truncate">{a.ownerEmail || 'Hệ thống'}</p>
                      </td>
                      <td className={`${tdClass} min-w-[14rem] max-w-[20rem]`}>
                        <AiStatusBadge status={a.status} />
                        {running && (
                          <div className="mt-2">
                            <div className="h-1.5 rounded-full bg-ink/[0.08] overflow-hidden">
                              <div className="h-full bg-pb transition-[width] duration-500" style={{ width: `${Math.max(a.progressPercent || 0, 3)}%` }} />
                            </div>
                            <p className="mt-1 text-xs text-ink/60 truncate tabular-nums">
                              {a.progressPercent || 0}%{a.currentStage && <> · {a.currentStage}</>}
                            </p>
                          </div>
                        )}
                        {/* Only a stopped session has a reason worth showing; a completed one may keep an old note. */}
                        {canRetry && (a.errorCode || a.errorMessage) && (
                          <p
                            className={`mt-1.5 text-xs line-clamp-2 ${a.status === 'CANCELLED' ? 'text-ink/60' : 'text-loss'}`}
                            title={a.errorMessage ?? undefined}
                          >
                            {a.errorMessage || a.errorCode}
                            {a.errorCode && a.errorMessage && <span className="opacity-70"> ({a.errorCode})</span>}
                          </p>
                        )}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-ink/70`}>
                        <p title={formatDateTime(a.createdAt)}>Bắt đầu {timeAgo(a.startedAt || a.createdAt)}</p>
                        {a.completedAt && (
                          <p className="text-xs text-ink/60" title={formatDateTime(a.completedAt)}>
                            Xong {timeAgo(a.completedAt)}
                          </p>
                        )}
                      </td>
                      <td className={`${tdClass} text-right whitespace-nowrap`}>
                        <div className="inline-flex items-center gap-1.5">
                          {canRetry && (
                            <TextAction primary={a.status !== 'CANCELLED'} busy={busyId === a.id} onClick={() => retry(a)}>
                              {busyId !== a.id && <RotateCcw className="w-3.5 h-3.5" aria-hidden />}
                              Chạy lại
                            </TextAction>
                          )}
                          {a.matchId && (
                            <Link
                              to={`/matches/${a.matchId}`}
                              target="_blank"
                              title="Mở trận trong tab mới"
                              aria-label={`Mở trận #${a.matchId} trong tab mới`}
                              className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink/60 hover:text-ink hover:bg-ink/[0.06]"
                            >
                              <ExternalLink className="w-4 h-4" />
                            </Link>
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
        {!loading && total > analyses.length && <LoadMore shown={analyses.length} total={total} loading={loadingMore} onClick={loadMore} />}
      </Sheet>
    </div>
  );
};
