import React, { useEffect, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { ExternalLink, Inbox, RotateCcw, Trash2, Youtube } from 'lucide-react';
import { deleteMatchAsAdmin, listAdminMatches, publishMatch, restoreMatch, unpublishMatch } from '../../api/admin';
import { errorMessage } from '../../api/errors';
import type { Match } from '../../types/match';
import type { AdminOutletContext } from '../layout/AdminLayout';
import { EmptyState } from '../ui/EmptyState';
import { toast } from '../ui/toastBus';
import {
  ConfirmDialog,
  FilterTabs,
  IconAction,
  LoadError,
  LoadMore,
  MatchStatusBadge,
  Sheet,
  SectionHeader,
  SkeletonRows,
  TextAction,
  rowClass,
  tableClass,
  tdClass,
  thClass,
  theadClass,
} from './adminUi';
import { PAGE_SIZE, formatDate, formatDuration, loadErrorText, numberFormat } from './adminFormat';

const STATUSES = ['ALL', 'ANALYZED', 'PUBLISHED', 'ANALYZING', 'READY', 'DRAFT', 'DELETED'];

const players = (m: Match) => `${m.playerAName} gặp ${m.playerBName}`;

type Pending = { kind: 'delete' | 'unpublish'; match: Match };

/** /admin/matches: every match, publishing to the public library, and the recycle bin. */
export const MatchesSection: React.FC<AdminOutletContext> = ({ metrics, refreshMetrics }) => {
  const [params, setParams] = useSearchParams();
  const status = STATUSES.includes(params.get('status') ?? '') ? (params.get('status') as string) : 'ALL';
  const setStatus = (key: string) => setParams(key === 'ALL' ? {} : { status: key }, { replace: true });

  const [matches, setMatches] = useState<Match[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [busyId, setBusyId] = useState<number | null>(null);
  const [pending, setPending] = useState<Pending | null>(null);

  const fetchMatches = async (s: string, size = PAGE_SIZE, showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const page = await listAdminMatches(s, size);
      setMatches(page.data || []);
      setTotal(page.pagination?.totalElements ?? (page.data || []).length);
      setLoadError(null);
    } catch (err) {
      setLoadError(loadErrorText(err, 'danh sách trận'));
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(status);
  }, [status]);  

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchMatches(status, matches.length + PAGE_SIZE, false);
    } finally {
      setLoadingMore(false);
    }
  };

  /** A row whose state changed leaves a tab it no longer belongs to. */
  const replaceOrDrop = (updated: Match) => {
    const stays = status === 'ALL' || updated.status === status;
    setMatches((prev) => (stays ? prev.map((x) => (x.id === updated.id ? updated : x)) : prev.filter((x) => x.id !== updated.id)));
    if (!stays) setTotal((t) => t - 1);
  };

  const publish = async (match: Match) => {
    setBusyId(match.id);
    try {
      replaceOrDrop(await publishMatch(match.id));
      toast.success(`Đã công khai ${players(match)}.`);
      refreshMetrics();
    } catch (err) {
      toast.error(errorMessage(err, 'Không công khai được trận.'));
    } finally {
      setBusyId(null);
    }
  };

  const confirmPending = async () => {
    if (!pending) return;
    const { kind, match } = pending;
    setBusyId(match.id);
    try {
      if (kind === 'unpublish') {
        replaceOrDrop(await unpublishMatch(match.id));
        toast.success(`Đã gỡ ${players(match)} khỏi thư viện công khai.`);
      } else {
        await deleteMatchAsAdmin(match.id);
        setMatches((prev) => prev.filter((x) => x.id !== match.id));
        setTotal((t) => t - 1);
        toast.success(`Đã chuyển ${players(match)} vào thùng rác.`);
      }
      setPending(null);
      refreshMetrics();
    } catch (err) {
      toast.error(errorMessage(err, kind === 'unpublish' ? 'Không gỡ công khai được.' : 'Không xóa được trận.'));
    } finally {
      setBusyId(null);
    }
  };

  const restore = async (match: Match) => {
    setBusyId(match.id);
    try {
      await restoreMatch(match.id);
      setMatches((prev) => prev.filter((x) => x.id !== match.id));
      setTotal((t) => t - 1);
      toast.success(`Đã khôi phục ${players(match)}.`);
      refreshMetrics();
    } catch (err) {
      toast.error(errorMessage(err, 'Không khôi phục được trận.'));
    } finally {
      setBusyId(null);
    }
  };

  const b = metrics?.matchStatusBreakdown ?? {};
  const tabs = [
    { key: 'ALL', label: 'Tất cả', count: metrics?.totalMatches },
    { key: 'ANALYZED', label: 'Chờ công khai', count: metrics?.analyzedMatches },
    { key: 'PUBLISHED', label: 'Công khai', count: metrics?.publishedMatches },
    { key: 'ANALYZING', label: 'Đang phân tích', count: b.ANALYZING },
    { key: 'READY', label: 'Chưa phân tích', count: b.READY },
    { key: 'DRAFT', label: 'Chưa có video', count: metrics?.draftMatches },
    { key: 'DELETED', label: 'Thùng rác', count: metrics?.deletedMatches },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Trận đấu"
        description="Trận của mọi người dùng. Công khai một trận để khách xem được trên thư viện; trận bị xóa nằm trong thùng rác và khôi phục được."
      />

      <FilterTabs tabs={tabs} value={status} onChange={setStatus} label="Lọc trận theo trạng thái" />

      {loadError && <LoadError message={loadError} onRetry={() => fetchMatches(status)} />}

      <Sheet className="overflow-hidden">
        {loading ? (
          <SkeletonRows />
        ) : !loadError && matches.length === 0 ? (
          <EmptyState
            compact
            icon={Inbox}
            title={status === 'DELETED' ? 'Thùng rác trống' : status === 'ANALYZED' ? 'Không có trận nào chờ công khai' : 'Không có trận nào ở mục này'}
            description={status === 'ALL' ? 'Khi người dùng tạo trận, trận sẽ hiện ở đây.' : undefined}
            action={status !== 'ALL' ? { label: 'Xem tất cả trận', onClick: () => setStatus('ALL') } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Trận</th>
                  <th className={thClass}>Người tạo</th>
                  <th className={thClass}>Video và dữ liệu</th>
                  <th className={thClass}>Trạng thái</th>
                  <th className={`${thClass} text-right`}>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {matches.map((m) => {
                  const deleted = Boolean(m.deletedAt);
                  const busy = busyId === m.id;
                  const published = m.status === 'PUBLISHED';
                  const viewTo = published ? `/public-matches/${m.id}/replay` : `/matches/${m.id}`;
                  const title = m.title && m.title !== players(m) ? m.title : null;
                  return (
                    <tr key={m.id} className={rowClass}>
                      <td className={`${tdClass} max-w-[18rem]`}>
                        <span className="flex items-center gap-2 font-medium text-ink">
                          <span className="w-2 h-2 rounded-full bg-pa shrink-0" aria-hidden />
                          <span className="truncate">{m.playerAName}</span>
                        </span>
                        <span className="flex items-center gap-2 font-medium text-ink">
                          <span className="w-2 h-2 rounded-full bg-pb shrink-0" aria-hidden />
                          <span className="truncate">{m.playerBName}</span>
                        </span>
                        <span className="block text-xs text-ink/60 truncate mt-0.5">
                          {formatDate(m.matchDate)}
                          {title && <> · {title}</>}
                        </span>
                      </td>
                      <td className={`${tdClass} text-ink/70 max-w-[11rem] truncate`}>{m.ownerEmail || `Người dùng #${m.ownerId}`}</td>
                      <td className={`${tdClass} whitespace-nowrap text-ink/70`}>
                        <span className="flex items-center gap-1.5">
                          {m.youtubeVideoId && <Youtube className="w-4 h-4 text-ink/50" aria-label="YouTube" />}
                          {m.durationSeconds ? formatDuration(m.durationSeconds) : m.status === 'DRAFT' ? 'Chưa có video' : 'Chưa rõ độ dài'}
                        </span>
                        {m.totalRallies ? (
                          <span className="block text-xs text-ink/60 tabular-nums">
                            {m.totalRallies} pha · {numberFormat.format(m.totalStrokes ?? 0)} cú
                          </span>
                        ) : null}
                      </td>
                      <td className={tdClass}>
                        <MatchStatusBadge status={m.status} deletedAt={m.deletedAt} />
                      </td>
                      <td className={`${tdClass} text-right whitespace-nowrap`}>
                        <div className="inline-flex items-center gap-1.5">
                          {deleted ? (
                            <TextAction busy={busy} onClick={() => restore(m)}>
                              {!busy && <RotateCcw className="w-3.5 h-3.5" aria-hidden />}
                              Khôi phục
                            </TextAction>
                          ) : (
                            <>
                              {m.status === 'ANALYZED' && (m.totalRallies ? (
                                // Filled only in the "Chờ công khai" queue; in the full list it would drown the page in green.
                                <TextAction primary={status === 'ANALYZED'} busy={busy} onClick={() => publish(m)}>
                                  Công khai
                                </TextAction>
                              ) : (
                                <span className="text-xs text-ink/55" title="AI không tìm thấy pha cầu nào, không có gì để công khai">
                                  Không có pha cầu
                                </span>
                              ))}
                              {published && (
                                <TextAction busy={busy} onClick={() => setPending({ kind: 'unpublish', match: m })}>
                                  Gỡ công khai
                                </TextAction>
                              )}
                              <Link
                                to={viewTo}
                                target="_blank"
                                title="Mở trận trong tab mới"
                                aria-label={`Mở ${players(m)} trong tab mới`}
                                className="inline-flex items-center justify-center w-8 h-8 rounded-md text-ink/60 hover:text-ink hover:bg-ink/[0.06]"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </Link>
                              <IconAction label={`Xóa ${players(m)}`} danger disabled={busy} onClick={() => setPending({ kind: 'delete', match: m })}>
                                <Trash2 className="w-4 h-4" />
                              </IconAction>
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
        {!loading && total > matches.length && <LoadMore shown={matches.length} total={total} loading={loadingMore} onClick={loadMore} />}
      </Sheet>

      {pending && (
        <ConfirmDialog
          title={pending.kind === 'delete' ? 'Chuyển trận vào thùng rác?' : 'Gỡ trận khỏi thư viện công khai?'}
          confirmLabel={pending.kind === 'delete' ? 'Chuyển vào thùng rác' : 'Gỡ công khai'}
          busyLabel={pending.kind === 'delete' ? 'Đang xóa…' : 'Đang gỡ…'}
          danger={pending.kind === 'delete'}
          busy={busyId === pending.match.id}
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        >
          <strong className="text-ink">{players(pending.match)}</strong>{' '}
          {pending.kind === 'delete'
            ? 'sẽ biến mất khỏi danh sách của người tạo và khỏi thư viện. Bạn khôi phục được từ thùng rác.'
            : 'sẽ không còn hiện với khách. Người tạo vẫn xem được trận như bình thường.'}
        </ConfirmDialog>
      )}
    </div>
  );
};
