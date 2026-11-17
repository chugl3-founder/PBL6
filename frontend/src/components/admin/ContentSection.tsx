import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ExternalLink, Film, Link2, Link2Off, Play, Trash2 } from 'lucide-react';
import { deleteHighlightAsAdmin, listAdminHighlights, listSharedReports, revokeSharedReport } from '../../api/admin';
import { errorMessage } from '../../api/errors';
import type { AdminHighlight, AdminSharedReport } from '../../types/admin';
import type { AdminOutletContext } from '../layout/AdminLayout';
import { EmptyState } from '../ui/EmptyState';
import { toast } from '../ui/toastBus';
import {
  ConfirmDialog,
  FilterTabs,
  IconAction,
  LoadError,
  LoadMore,
  Pill,
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
import { PAGE_SIZE, formatDateTime, formatDuration, formatSize, loadErrorText, timeAgo } from './adminFormat';

/**
 * /admin/content: what users make beyond matches. Scouting reports can be opened by anyone holding
 * their link, so the admin can turn a link off; highlight reels take storage, so the admin can remove them.
 */
export const ContentSection: React.FC<AdminOutletContext> = ({ metrics, refreshMetrics }) => {
  const [params, setParams] = useSearchParams();
  const view = params.get('view') === 'highlights' ? 'highlights' : 'reports';

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Chia sẻ & highlight"
        description="Báo cáo trinh sát đang mở bằng link và video highlight người dùng đã dựng."
      />
      <FilterTabs
        label="Chọn loại nội dung"
        value={view}
        onChange={(key) => setParams(key === 'reports' ? {} : { view: key }, { replace: true })}
        tabs={[
          { key: 'reports', label: 'Link trinh sát đang mở', count: metrics?.sharedReports },
          { key: 'highlights', label: 'Video highlight', count: metrics?.highlightReels },
        ]}
      />
      {view === 'reports' ? <SharedReports onChanged={refreshMetrics} /> : <Highlights onChanged={refreshMetrics} />}
    </div>
  );
};

const SharedReports: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [reports, setReports] = useState<AdminSharedReport[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toRevoke, setToRevoke] = useState<AdminSharedReport | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchReports = async (size = PAGE_SIZE, showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const page = await listSharedReports(size);
      setReports(page.data || []);
      setTotal(page.pagination?.totalElements ?? (page.data || []).length);
      setLoadError(null);
    } catch (err) {
      setLoadError(loadErrorText(err, 'danh sách link chia sẻ'));
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReports();
  }, []);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchReports(reports.length + PAGE_SIZE, false);
    } finally {
      setLoadingMore(false);
    }
  };

  const revoke = async () => {
    if (!toRevoke) return;
    setBusy(true);
    try {
      await revokeSharedReport(toRevoke.id);
      setReports((prev) => prev.filter((r) => r.id !== toRevoke.id));
      setTotal((t) => t - 1);
      toast.success(`Đã tắt link của "${toRevoke.title}".`);
      setToRevoke(null);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, 'Không tắt được link chia sẻ.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {loadError && <LoadError message={loadError} onRetry={() => fetchReports()} />}
      <Sheet className="overflow-hidden">
        {loading ? (
          <SkeletonRows rows={4} />
        ) : !loadError && reports.length === 0 ? (
          <EmptyState compact icon={Link2} title="Không có link trinh sát nào đang mở" description="Khi người dùng chia sẻ một báo cáo trinh sát, link sẽ hiện ở đây." />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Báo cáo</th>
                  <th className={thClass}>Người chia sẻ</th>
                  <th className={thClass}>Cập nhật</th>
                  <th className={`${thClass} text-right`}>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reports.map((r) => (
                  <tr key={r.id} className={rowClass}>
                    <td className={`${tdClass} max-w-[24rem]`}>
                      <p className="font-medium text-ink truncate">{r.title}</p>
                      <p className="text-xs text-ink/60 truncate">
                        {r.ownPlayerName ? `${r.ownPlayerName} gặp ${r.opponentName}` : `Đối thủ: ${r.opponentName}`}
                      </p>
                    </td>
                    <td className={`${tdClass} max-w-[16rem]`}>
                      <p className="text-ink truncate">{r.ownerName || r.ownerEmail}</p>
                      {r.ownerName && <p className="text-xs text-ink/60 truncate">{r.ownerEmail}</p>}
                    </td>
                    <td className={`${tdClass} whitespace-nowrap text-ink/70`} title={formatDateTime(r.updatedAt)}>
                      {timeAgo(r.updatedAt)}
                    </td>
                    <td className={`${tdClass} text-right whitespace-nowrap`}>
                      <div className="inline-flex items-center gap-1.5">
                        <a
                          href={`/scouting/shared/${r.shareToken}`}
                          target="_blank"
                          rel="noreferrer"
                          title="Mở link như khách"
                          aria-label={`Mở link của ${r.title} như khách`}
                          className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink/60 hover:text-ink hover:bg-ink/[0.06]"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                        <TextAction onClick={() => setToRevoke(r)} className="hover:!border-loss hover:!text-loss">
                          <Link2Off className="w-3.5 h-3.5" aria-hidden />
                          Tắt link
                        </TextAction>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > reports.length && <LoadMore shown={reports.length} total={total} loading={loadingMore} onClick={loadMore} />}
      </Sheet>

      {toRevoke && (
        <ConfirmDialog
          title="Tắt link chia sẻ?"
          confirmLabel="Tắt link"
          busyLabel="Đang tắt…"
          danger
          busy={busy}
          onConfirm={revoke}
          onCancel={() => setToRevoke(null)}
        >
          Ai đang giữ link <strong className="text-ink">{toRevoke.title}</strong> sẽ không mở được nữa. Báo cáo vẫn còn trong tài khoản của người
          tạo, và họ có thể chia sẻ lại bằng link mới.
        </ConfirmDialog>
      )}
    </>
  );
};

const REEL_STATUS: Record<string, { label: string; tone: 'pitch' | 'progress' | 'loss' }> = {
  COMPLETED: { label: 'Đã dựng xong', tone: 'pitch' },
  RENDERING: { label: 'Đang dựng', tone: 'progress' },
  QUEUED: { label: 'Chờ dựng', tone: 'progress' },
  FAILED: { label: 'Lỗi', tone: 'loss' },
};

const Highlights: React.FC<{ onChanged: () => void }> = ({ onChanged }) => {
  const [status, setStatus] = useState('ALL');
  const [reels, setReels] = useState<AdminHighlight[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [toDelete, setToDelete] = useState<AdminHighlight | null>(null);
  const [busy, setBusy] = useState(false);

  const fetchReels = async (s: string, size = PAGE_SIZE, showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const page = await listAdminHighlights(s, size);
      setReels(page.data || []);
      setTotal(page.pagination?.totalElements ?? (page.data || []).length);
      setLoadError(null);
    } catch (err) {
      setLoadError(loadErrorText(err, 'danh sách video highlight'));
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchReels(status);
  }, [status]);

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchReels(status, reels.length + PAGE_SIZE, false);
    } finally {
      setLoadingMore(false);
    }
  };

  const remove = async () => {
    if (!toDelete) return;
    setBusy(true);
    try {
      await deleteHighlightAsAdmin(toDelete.id);
      setReels((prev) => prev.filter((r) => r.id !== toDelete.id));
      setTotal((t) => t - 1);
      toast.success(`Đã xóa video "${toDelete.title}".`);
      setToDelete(null);
      onChanged();
    } catch (err) {
      toast.error(errorMessage(err, 'Không xóa được video highlight.'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div className="flex flex-wrap gap-1.5" role="group" aria-label="Lọc video theo tình trạng">
        {[
          { key: 'ALL', label: 'Tất cả' },
          { key: 'ACTIVE', label: 'Đang dựng' },
          { key: 'COMPLETED', label: 'Đã xong' },
          { key: 'FAILED', label: 'Lỗi' },
        ].map((f) => (
          <button
            key={f.key}
            type="button"
            aria-pressed={status === f.key}
            onClick={() => setStatus(f.key)}
            className={`h-8 px-3 rounded-full text-sm transition-colors ${
              status === f.key ? 'bg-ink text-white' : 'border border-ink/15 bg-sheet text-ink/80 hover:border-ink/30'
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loadError && <LoadError message={loadError} onRetry={() => fetchReels(status)} />}

      <Sheet className="overflow-hidden">
        {loading ? (
          <SkeletonRows rows={4} />
        ) : !loadError && reels.length === 0 ? (
          <EmptyState
            compact
            icon={Film}
            title="Không có video highlight nào ở mục này"
            action={status !== 'ALL' ? { label: 'Xem tất cả video', onClick: () => setStatus('ALL') } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Video</th>
                  <th className={thClass}>Người tạo</th>
                  <th className={thClass}>Tình trạng</th>
                  <th className={thClass}>Tạo lúc</th>
                  <th className={`${thClass} text-right`}>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {reels.map((r) => {
                  const s = REEL_STATUS[r.status] ?? { label: r.status, tone: 'progress' as const };
                  const meta = [`${r.clipCount} pha`, formatDuration(r.durationSeconds), formatSize(r.fileSize)].filter(Boolean).join(' · ');
                  return (
                    <tr key={r.id} className={rowClass}>
                      <td className={`${tdClass} max-w-[22rem]`}>
                        <p className="font-medium text-ink truncate">{r.title}</p>
                        <p className="text-xs text-ink/60 truncate">
                          {r.playerAName} gặp {r.playerBName}
                        </p>
                      </td>
                      <td className={`${tdClass} max-w-[14rem] truncate text-ink/70`}>{r.ownerEmail}</td>
                      <td className={`${tdClass} min-w-[11rem]`}>
                        <Pill tone={s.tone} live={r.status === 'RENDERING'}>
                          {s.label}
                          {r.status === 'RENDERING' && ` ${r.progressPercent}%`}
                        </Pill>
                        <p className="mt-1 text-xs text-ink/60 tabular-nums">{meta}</p>
                        {r.errorMessage && <p className="mt-1 text-xs text-loss line-clamp-2">{r.errorMessage}</p>}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-ink/70`} title={formatDateTime(r.createdAt)}>
                        {timeAgo(r.createdAt)}
                      </td>
                      <td className={`${tdClass} text-right whitespace-nowrap`}>
                        <div className="inline-flex items-center gap-1.5">
                          {r.videoUrl && (
                            <a
                              href={r.videoUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-ink/15 bg-sheet text-sm font-medium text-ink hover:border-pitch hover:text-pitch-deep"
                            >
                              <Play className="w-3.5 h-3.5" aria-hidden />
                              Xem
                            </a>
                          )}
                          <IconAction label={`Xóa video ${r.title}`} danger onClick={() => setToDelete(r)}>
                            <Trash2 className="w-4 h-4" />
                          </IconAction>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > reels.length && <LoadMore shown={reels.length} total={total} loading={loadingMore} onClick={loadMore} />}
      </Sheet>

      {toDelete && (
        <ConfirmDialog
          title="Xóa video highlight?"
          confirmLabel="Xóa video"
          busyLabel="Đang xóa…"
          danger
          busy={busy}
          onConfirm={remove}
          onCancel={() => setToDelete(null)}
        >
          <strong className="text-ink">{toDelete.title}</strong> và file video sẽ bị xóa hẳn, không khôi phục được. Trận gốc không bị ảnh hưởng;
          người tạo có thể dựng lại video mới.
        </ConfirmDialog>
      )}
    </>
  );
};
