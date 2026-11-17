import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { Search, UserX, X } from 'lucide-react';
import { listUsers, setUserStatus } from '../../api/admin';
import { errorMessage } from '../../api/errors';
import { getSessionUser } from '../../auth/session';
import type { UserAccount } from '../../types/admin';
import type { AdminOutletContext } from '../layout/AdminLayout';
import { EmptyState } from '../ui/EmptyState';
import { toast } from '../ui/toastBus';
import {
  ConfirmDialog,
  FilterTabs,
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
import { PAGE_SIZE, formatDate, getLevelLabel, loadErrorText } from './adminFormat';

const STATUSES = ['ALL', 'ACTIVE', 'LOCKED'];

/** /admin/users: accounts, with search and lock/unlock. A locked user is signed out on their next request. */
export const UsersSection: React.FC<AdminOutletContext> = ({ metrics, refreshMetrics }) => {
  const [params, setParams] = useSearchParams();
  const status = STATUSES.includes(params.get('status') ?? '') ? (params.get('status') as string) : 'ALL';
  const setStatus = (key: string) => setParams(key === 'ALL' ? {} : { status: key }, { replace: true });

  const [users, setUsers] = useState<UserAccount[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [search, setSearch] = useState('');
  const [busyId, setBusyId] = useState<number | null>(null);
  const [toLock, setToLock] = useState<UserAccount | null>(null);
  const me = getSessionUser();

  const fetchUsers = async (q: string, s: string, size = PAGE_SIZE, showSpinner = true) => {
    try {
      if (showSpinner) setLoading(true);
      const page = await listUsers(q, s, size);
      setUsers(page.data || []);
      setTotal(page.pagination?.totalElements ?? (page.data || []).length);
      setLoadError(null);
    } catch (err) {
      setLoadError(loadErrorText(err, 'danh sách người dùng'));
    } finally {
      if (showSpinner) setLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => fetchUsers(search, status), 250);
    return () => clearTimeout(timer);
  }, [search, status]);  

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchUsers(search, status, users.length + PAGE_SIZE, false);
    } finally {
      setLoadingMore(false);
    }
  };

  const changeStatus = async (u: UserAccount, next: 'ACTIVE' | 'LOCKED') => {
    setBusyId(u.id);
    try {
      const updated = await setUserStatus(u.id, next);
      const stays = status === 'ALL' || updated.status === status;
      setUsers((prev) => (stays ? prev.map((x) => (x.id === u.id ? updated : x)) : prev.filter((x) => x.id !== u.id)));
      if (!stays) setTotal((t) => t - 1);
      toast.success(next === 'LOCKED' ? `Đã khóa tài khoản ${u.email}.` : `Đã mở khóa tài khoản ${u.email}.`);
      setToLock(null);
      refreshMetrics();
    } catch (err) {
      toast.error(errorMessage(err, 'Không đổi được trạng thái tài khoản.'));
    } finally {
      setBusyId(null);
    }
  };

  const tabs = [
    { key: 'ALL', label: 'Tất cả', count: metrics?.totalUsers },
    { key: 'ACTIVE', label: 'Đang hoạt động', count: metrics?.activeUsers },
    { key: 'LOCKED', label: 'Đã khóa', count: metrics?.lockedUsers },
  ];

  return (
    <div className="space-y-5">
      <SectionHeader
        title="Người dùng"
        description="Tìm tài khoản và khóa khi cần. Người bị khóa bị đăng xuất ngay ở lần thao tác kế tiếp."
      />

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-ink/10">
        <FilterTabs tabs={tabs} value={status} onChange={setStatus} label="Lọc người dùng theo trạng thái" bordered={false} />
        <label className="relative mb-2 w-full sm:w-72">
          <span className="sr-only">Tìm người dùng</span>
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-ink/45" aria-hidden />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên hoặc email"
            className="w-full h-9 pl-9 pr-8 rounded-md border border-ink/15 bg-sheet text-sm text-ink placeholder:text-ink/45 focus:outline-none focus:border-pitch focus:ring-2 focus:ring-pitch/20"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded text-ink/45 hover:text-ink"
              aria-label="Xóa từ khóa"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </label>
      </div>

      {loadError && <LoadError message={loadError} onRetry={() => fetchUsers(search, status)} />}

      <Sheet className="overflow-hidden">
        {loading ? (
          <SkeletonRows />
        ) : !loadError && users.length === 0 ? (
          <EmptyState
            compact
            icon={UserX}
            title={search ? `Không tìm thấy ai khớp với "${search}"` : 'Không có tài khoản nào ở mục này'}
            action={search ? { label: 'Xóa từ khóa', onClick: () => setSearch('') } : undefined}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={tableClass}>
              <thead className={theadClass}>
                <tr>
                  <th className={thClass}>Người dùng</th>
                  <th className={thClass}>Vai trò</th>
                  <th className={thClass}>Trình độ</th>
                  <th className={thClass}>Tham gia</th>
                  <th className={thClass}>Trạng thái</th>
                  <th className={`${thClass} text-right`}>
                    <span className="sr-only">Thao tác</span>
                  </th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => {
                  const locked = u.status === 'LOCKED';
                  const self = Boolean(me?.email && u.email?.toLowerCase() === me.email.toLowerCase());
                  const admin = u.role === 'ROLE_ADMIN';
                  return (
                    <tr key={u.id} className={rowClass}>
                      <td className={tdClass}>
                        <div className="flex items-center gap-3 min-w-0">
                          <span className="w-8 h-8 rounded-full overflow-hidden bg-pitch-soft text-pitch-deep flex items-center justify-center text-xs font-semibold shrink-0">
                            {u.avatarUrl ? (
                              <img src={u.avatarUrl} alt="" className="w-full h-full object-cover" />
                            ) : (
                              (u.fullName || u.email || '?').charAt(0).toUpperCase()
                            )}
                          </span>
                          <div className="min-w-0">
                            <p className="font-medium text-ink truncate">
                              {u.fullName || 'Chưa đặt tên'}
                              {self && <span className="ml-1.5 text-xs font-normal text-ink/60">(bạn)</span>}
                            </p>
                            <p className="text-xs text-ink/60 truncate">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className={`${tdClass} whitespace-nowrap`}>
                        {admin ? <Pill tone="info">Quản trị viên</Pill> : <span className="text-ink/70">Người dùng</span>}
                      </td>
                      <td className={`${tdClass} whitespace-nowrap text-ink/70`}>{getLevelLabel(u.badmintonLevel)}</td>
                      <td className={`${tdClass} whitespace-nowrap text-ink/70 tabular-nums`}>{formatDate(u.createdAt)}</td>
                      <td className={tdClass}>
                        {locked ? <Pill tone="loss">Đã khóa</Pill> : <Pill tone="pitch">Hoạt động</Pill>}
                      </td>
                      <td className={`${tdClass} text-right whitespace-nowrap`}>
                        {self ? (
                          <span className="text-xs text-ink/50">Không tự khóa được</span>
                        ) : locked ? (
                          <TextAction busy={busyId === u.id} onClick={() => changeStatus(u, 'ACTIVE')}>
                            Mở khóa
                          </TextAction>
                        ) : (
                          <TextAction
                            busy={busyId === u.id}
                            onClick={() => setToLock(u)}
                            className="hover:!border-loss hover:!text-loss"
                          >
                            Khóa
                          </TextAction>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {!loading && total > users.length && <LoadMore shown={users.length} total={total} loading={loadingMore} onClick={loadMore} />}
      </Sheet>

      {toLock && (
        <ConfirmDialog
          title="Khóa tài khoản này?"
          confirmLabel="Khóa tài khoản"
          busyLabel="Đang khóa…"
          danger
          busy={busyId === toLock.id}
          onConfirm={() => changeStatus(toLock, 'LOCKED')}
          onCancel={() => setToLock(null)}
        >
          <strong className="text-ink">{toLock.fullName || toLock.email}</strong> sẽ bị đăng xuất và không đăng nhập lại được cho đến khi
          bạn mở khóa. Trận và báo cáo của họ vẫn được giữ nguyên.
        </ConfirmDialog>
      )}
    </div>
  );
};
