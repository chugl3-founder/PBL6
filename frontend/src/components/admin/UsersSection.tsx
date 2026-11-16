import React, { useEffect, useState } from 'react';
import {
  Users,
  Loader2,
  Search,
  Lock,
  Unlock,
  Shield,
} from 'lucide-react';
import { listUsers, setUserStatus } from '../../api/admin';
import { errorMessage } from '../../api/errors';
import { getSessionUser } from '../../auth/session';
import type { DashboardMetrics, UserAccount } from '../../types/admin';
import { LoadError, LoadMore } from './adminUi';
import { Feedback, PAGE_SIZE, getLevelLabel, loadErrorText } from './adminFormat';

interface UsersSectionProps {
  dashboardMetrics: DashboardMetrics | null;
  showFeedback: Feedback;
  /** Locking an account changes the overview numbers. */
  onChanged: () => void;
}

/** /admin/users: accounts, with search and lock/unlock (VS-17). */
export const UsersSection: React.FC<UsersSectionProps> = ({ dashboardMetrics, showFeedback, onChanged }) => {
  const [users, setUsers] = useState<UserAccount[]>([]);
  const [usersTotal, setUsersTotal] = useState(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loadingMore, setLoadingMore] = useState(false);
  const [userSearch, setUserSearch] = useState('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');
  const [userActionLoadingId, setUserActionLoadingId] = useState<number | null>(null);
  const currentUser = getSessionUser();

  const fetchUsers = async (search: string, status: string, size = PAGE_SIZE, showSpinner = true) => {
    try {
      if (showSpinner) setUsersLoading(true);
      const page = await listUsers(search, status, size);
      setUsers(page.data || []);
      if (page.pagination?.totalElements !== undefined) {
        setUsersTotal(page.pagination.totalElements);
      }
      setLoadError(null);
    } catch (err) {
      console.error('Lỗi khi tải danh sách người dùng cho Admin:', err);
      setLoadError(loadErrorText(err, 'danh sách người dùng'));
    } finally {
      if (showSpinner) setUsersLoading(false);
    }
  };

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(userSearch, userStatusFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearch, userStatusFilter]);  

  const loadMore = async () => {
    setLoadingMore(true);
    try {
      await fetchUsers(userSearch, userStatusFilter, users.length + PAGE_SIZE, false);
    } finally {
      setLoadingMore(false);
    }
  };

  const handleToggleUserStatus = async (userItem: UserAccount) => {
    const nextStatus = userItem.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    try {
      setUserActionLoadingId(userItem.id);
      const updated = await setUserStatus(userItem.id, nextStatus);
      setUsers((prev) => prev.map((u) => (u.id === userItem.id ? updated : u)));
      showFeedback(
        'success',
        nextStatus === 'LOCKED'
          ? `Đã khóa tài khoản người dùng "${userItem.email}".`
          : `Đã mở khóa tài khoản người dùng "${userItem.email}".`,
      );
      onChanged();
    } catch (err) {
      showFeedback('error', errorMessage(err, 'Không thể cập nhật trạng thái tài khoản.'));
    } finally {
      setUserActionLoadingId(null);
    }
  };

  return (
    <div className="space-y-5 min-w-0">
      {/* 3 Thẻ tóm tắt nhanh dành riêng cho phân hệ Người dùng */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="bg-[#0f1d35]/85 border border-white/10 rounded-2xl p-4">
          <div className="text-[11px] text-slate-400">Tổng số tài khoản hệ thống</div>
          <div className="text-xl font-black text-white mt-0.5">
            {dashboardMetrics?.totalUsers ?? '–'}
          </div>
        </div>
        <div className="bg-[#0f1d35]/85 border border-emerald-500/25 rounded-2xl p-4">
          <div className="text-[11px] text-emerald-300">Đang hoạt động (ACTIVE)</div>
          <div className="text-xl font-black text-emerald-400 mt-0.5">
            {dashboardMetrics?.activeUsers ?? '–'}
          </div>
        </div>
        <div className="bg-[#0f1d35]/85 border border-rose-500/25 rounded-2xl p-4">
          <div className="text-[11px] text-rose-300">Đã bị khóa (LOCKED)</div>
          <div className="text-xl font-black text-rose-400 mt-0.5">
            {dashboardMetrics?.lockedUsers ?? '–'}
          </div>
        </div>
      </div>

      <section className="bg-[#0f1d35]/90 border border-white/10 rounded-3xl p-5 sm:p-7 space-y-5 shadow-xl min-w-0">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-sky-400" />
              <span>Danh Sách Tài Khoản Người Dùng</span>
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Tra cứu thông tin vận động viên, kiểm soát quyền truy cập và khóa/mở khóa tài khoản vi phạm (VS-17)
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Ô tìm kiếm người dùng */}
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3.5 top-2.5 h-4 w-4 text-white/40" />
              <input
                type="text"
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                placeholder="Tìm theo email hoặc họ tên…"
                className="w-full pl-10 pr-8 py-2 bg-[#14233c] border border-white/15 rounded-full text-xs text-white placeholder-white/40 focus:outline-none focus:border-brand transition"
              />
              {userSearch && (
                <button
                  type="button"
                  onClick={() => setUserSearch('')}
                  className="absolute right-3 top-2 text-white/40 hover:text-white text-sm"
                >
                  ×
                </button>
              )}
            </div>

            {/* Bộ lọc trạng thái */}
            <div className="flex items-center gap-1.5 text-xs">
              {[
                { key: 'ALL', label: 'Tất cả' },
                { key: 'ACTIVE', label: 'Đang hoạt động' },
                { key: 'LOCKED', label: 'Đã khóa' },
              ].map((st) => (
                <button
                  key={st.key}
                  onClick={() => setUserStatusFilter(st.key)}
                  className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                    userStatusFilter === st.key
                      ? st.key === 'LOCKED'
                        ? 'bg-rose-600 text-white'
                        : 'bg-brand text-white shadow-glow-blue'
                      : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                  }`}
                >
                  {st.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {usersLoading && (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
            <span className="text-xs text-slate-400">Đang tải danh sách người dùng…</span>
          </div>
        )}

        {!usersLoading && loadError && (
          <LoadError message={loadError} onRetry={() => fetchUsers(userSearch, userStatusFilter)} />
        )}

        {!usersLoading && !loadError && users.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">
            Không tìm thấy người dùng nào phù hợp với điều kiện lọc.
          </div>
        )}

        {!usersLoading && users.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 px-3">Người Dùng</th>
                  <th className="pb-3 px-3 whitespace-nowrap">Vai Trò</th>
                  <th className="pb-3 px-3 whitespace-nowrap">Trình Độ & Hồ Sơ</th>
                  <th className="pb-3 px-3 whitespace-nowrap">Trạng Thái</th>
                  <th className="pb-3 px-3 text-right whitespace-nowrap">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.map((u) => {
                  const isLocked = u.status === 'LOCKED';
                  const isSelf = Boolean(
                    currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase()
                  );
                  const isUpdating = userActionLoadingId === u.id;

                  return (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="py-4 px-3">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-full bg-brand/20 border border-brand/30 text-sky-300 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                            {u.avatarUrl ? (
                              <img
                                src={u.avatarUrl}
                                alt={u.fullName || u.email}
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              (u.fullName || u.email || 'U').charAt(0).toUpperCase()
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-white text-sm flex items-center gap-1.5">
                              <span>{u.fullName || 'Chưa cập nhật tên'}</span>
                              {isSelf && (
                                <span className="px-2 py-0.2 rounded-full bg-brand/20 border border-brand/40 text-[11px] text-sky-300 font-semibold">
                                  Bạn
                                </span>
                              )}
                            </div>
                            <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                          </div>
                        </div>
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        {u.role === 'ROLE_ADMIN' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-purple-500/15 border border-purple-500/30 text-purple-300 font-semibold">
                            <Shield className="w-3 h-3" />
                            <span>Quản trị viên</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300">
                            <span>Vận động viên</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-3 text-slate-300 whitespace-nowrap">
                        <div className="font-medium text-sky-400">
                          {getLevelLabel(u.badmintonLevel)}
                        </div>
                        <div className="text-[11px] text-slate-500">
                          ID: #{u.id} • Tham gia:{' '}
                          {u.createdAt
                            ? new Date(u.createdAt).toLocaleDateString('vi-VN')
                            : 'N/A'}
                        </div>
                      </td>

                      <td className="py-4 px-3 whitespace-nowrap">
                        {isLocked ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold">
                            <Lock className="w-3 h-3" />
                            <span>Đã khóa (LOCKED)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>Đang hoạt động</span>
                          </span>
                        )}
                      </td>

                      <td className="py-4 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          disabled={isUpdating || isSelf}
                          onClick={() => handleToggleUserStatus(u)}
                          title={
                            isSelf
                              ? 'Không thể tự khóa tài khoản của chính mình'
                              : isLocked
                              ? 'Mở khóa tài khoản người dùng này'
                              : 'Khóa tài khoản người dùng vi phạm'
                          }
                          className={`inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed ${
                            isLocked
                              ? 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                              : 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                          }`}
                        >
                          {isUpdating ? (
                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                          ) : isLocked ? (
                            <>
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Mở khóa</span>
                            </>
                          ) : (
                            <>
                              <Lock className="w-3.5 h-3.5" />
                              <span>Khóa tài khoản</span>
                            </>
                          )}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {!usersLoading && usersTotal > users.length && (
          <LoadMore shown={users.length} total={usersTotal} loading={loadingMore} onClick={() => loadMore()} />
        )}
      </section>
    </div>
  );
};
