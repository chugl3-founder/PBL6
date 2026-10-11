import React, { useState, useEffect } from 'react';
import {
  Users,
  Video,
  Cpu,
  Globe,
  EyeOff,
  Loader2,
  CheckCircle2,
  ExternalLink,
  Trash2,
  RotateCcw,
  AlertTriangle,
  X,
  Search,
  Lock,
  Unlock,
  Shield
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client';

export const AdminDashboardPage: React.FC = () => {
  const location = useLocation();
  const [activeSection, setActiveSection] = useState<'MATCHES' | 'USERS'>(
    location.pathname.includes('/users') ? 'USERS' : 'MATCHES'
  );

  // State Quản lý Trận đấu (VS-16)
  const [matches, setMatches] = useState<any[]>([]);
  const [matchesLoading, setMatchesLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [matchToDelete, setMatchToDelete] = useState<any | null>(null);

  // State Quản lý Người dùng (VS-17)
  const [users, setUsers] = useState<any[]>([]);
  const [usersTotal, setUsersTotal] = useState<number>(0);
  const [usersLoading, setUsersLoading] = useState(true);
  const [userSearch, setUserSearch] = useState<string>('');
  const [userStatusFilter, setUserStatusFilter] = useState<string>('ALL');
  const [userActionLoadingId, setUserActionLoadingId] = useState<number | null>(null);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentUserJson = localStorage.getItem('user_info');
  const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;

  useEffect(() => {
    if (location.pathname.includes('/users')) {
      setActiveSection('USERS');
    } else if (location.pathname.includes('/matches')) {
      setActiveSection('MATCHES');
    }
  }, [location.pathname]);

  useEffect(() => {
    fetchMatches(filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(userSearch, userStatusFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearch, userStatusFilter]);

  const fetchMatches = async (status: string) => {
    try {
      setMatchesLoading(true);
      let url = `/admin/matches?page=0&size=50`;
      if (status === 'DELETED') {
        url = `/admin/matches?status=DELETED&includeDeleted=true&page=0&size=50`;
      } else if (status !== 'ALL') {
        url = `/admin/matches?status=${status}&page=0&size=50`;
      }
      const res = await apiClient.get(url);
      setMatches(res.data.data || []);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách trận đấu cho Admin:', err);
    } finally {
      setMatchesLoading(false);
    }
  };

  const fetchUsers = async (search: string, status: string) => {
    try {
      setUsersLoading(true);
      const params = new URLSearchParams({ page: '0', size: '50' });
      if (search.trim()) params.append('search', search.trim());
      if (status !== 'ALL') params.append('status', status);
      const res = await apiClient.get(`/admin/users?${params.toString()}`);
      setUsers(res.data.data || []);
      if (res.data.pagination?.totalElements !== undefined) {
        setUsersTotal(res.data.pagination.totalElements);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách người dùng cho Admin:', err);
    } finally {
      setUsersLoading(false);
    }
  };

  const showFeedback = (type: 'success' | 'error', text: string) => {
    setFeedbackMsg({ type, text });
    setTimeout(() => setFeedbackMsg(null), 4500);
  };

  const handleTogglePublish = async (matchId: number, currentStatus: string) => {
    try {
      setActionLoadingId(matchId);
      setFeedbackMsg(null);
      if (currentStatus === 'PUBLISHED') {
        const res = await apiClient.post(`/admin/matches/${matchId}/unpublish`);
        setMatches(prev => prev.map(m => m.id === matchId ? res.data : m));
        showFeedback('success', `Đã gỡ công khai trận đấu #${matchId} về chế độ riêng tư.`);
      } else {
        const res = await apiClient.post(`/admin/matches/${matchId}/publish`);
        setMatches(prev => prev.map(m => m.id === matchId ? res.data : m));
        showFeedback('success', `Đã duyệt xuất bản trận đấu #${matchId} lên Thư viện công khai!`);
      }
    } catch (err: any) {
      showFeedback(
        'error',
        err.response?.data?.message || 'Không thể cập nhật trạng thái xuất bản của trận đấu.'
      );
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleConfirmDelete = async () => {
    if (!matchToDelete) return;
    const matchId = matchToDelete.id;
    try {
      setActionLoadingId(matchId);
      await apiClient.delete(`/admin/matches/${matchId}`);
      setMatches(prev => prev.filter(m => m.id !== matchId));
      setMatchToDelete(null);
      showFeedback('success', `Đã xóa mềm trận đấu #${matchId} vào Thùng rác.`);
    } catch (err: any) {
      showFeedback('error', err.response?.data?.message || 'Không thể xóa trận đấu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRestoreMatch = async (matchId: number) => {
    try {
      setActionLoadingId(matchId);
      await apiClient.post(`/admin/matches/${matchId}/restore`);
      if (filterStatus === 'DELETED') {
        setMatches(prev => prev.filter(m => m.id !== matchId));
      } else {
        fetchMatches(filterStatus);
      }
      showFeedback('success', `Đã khôi phục thành công trận đấu #${matchId} từ Thùng rác!`);
    } catch (err: any) {
      showFeedback('error', err.response?.data?.message || 'Không thể khôi phục trận đấu.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleToggleUserStatus = async (userItem: any) => {
    const nextStatus = userItem.status === 'LOCKED' ? 'ACTIVE' : 'LOCKED';
    try {
      setUserActionLoadingId(userItem.id);
      setFeedbackMsg(null);
      const res = await apiClient.put(`/admin/users/${userItem.id}/status`, {
        status: nextStatus
      });
      setUsers(prev => prev.map(u => u.id === userItem.id ? res.data : u));
      showFeedback(
        'success',
        nextStatus === 'LOCKED'
          ? `Đã khóa tài khoản người dùng "${userItem.email}".`
          : `Đã mở khóa tài khoản người dùng "${userItem.email}".`
      );
    } catch (err: any) {
      showFeedback(
        'error',
        err.response?.data?.message || 'Không thể cập nhật trạng thái tài khoản.'
      );
    } finally {
      setUserActionLoadingId(null);
    }
  };

  const publishedCount = matches.filter(m => m.status === 'PUBLISHED' && !m.deletedAt).length;

  const filterTabs = [
    { key: 'ALL', label: 'Tất cả hoạt động' },
    { key: 'PUBLISHED', label: 'Đang công khai' },
    { key: 'ANALYZED', label: 'Đã phân tích' },
    { key: 'DRAFT', label: 'Bản nháp' },
    { key: 'DELETED', label: 'Thùng rác (Đã xóa)' },
  ];

  const getStatusLabel = (status: string, deletedAt?: string | null) => {
    if (deletedAt) {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold">
          <span>ĐÃ XÓA MỀM</span>
        </span>
      );
    }
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Đang công khai</span>
          </span>
        );
      case 'ANALYZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold">
            <span>Đã phân tích AI</span>
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold">
            <span>Sẵn sàng video</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold">
            <span>Bản nháp</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700/50 border border-white/10 text-slate-300">
            <span>{status}</span>
          </span>
        );
    }
  };

  const getLevelLabel = (level?: string) => {
    switch (level) {
      case 'BEGINNER':
        return 'Mới chơi';
      case 'INTERMEDIATE':
        return 'Phong trào';
      case 'ADVANCED':
        return 'Nâng cao';
      case 'PRO':
        return 'Chuyên nghiệp';
      default:
        return level || 'Phong trào';
    }
  };

  return (
    <div className="space-y-8 pb-16">
      {/* Tiêu đề trang & Chuyển đổi phân hệ Quản trị */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/10">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight">Quản Trị Hệ Thống</h1>
          <p className="text-sm text-slate-300 mt-1">
            Kiểm duyệt Thư viện trận đấu công khai (VS-16) và Quản lý tài khoản người dùng (VS-17)
          </p>
        </div>

        {/* Navigation Tabs giữa Quản lý Trận đấu & Quản lý Người dùng */}
        <div className="flex items-center gap-2 p-1.5 rounded-2xl bg-[#122340]/90 border border-white/15">
          <button
            type="button"
            onClick={() => setActiveSection('MATCHES')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSection === 'MATCHES'
                ? 'bg-brand text-white shadow-glow-blue'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Video className="w-4 h-4" />
            <span>Quản lý Trận đấu</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveSection('USERS')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
              activeSection === 'USERS'
                ? 'bg-brand text-white shadow-glow-blue'
                : 'text-slate-300 hover:text-white hover:bg-white/5'
            }`}
          >
            <Users className="w-4 h-4" />
            <span>Quản lý Người dùng ({usersTotal || users.length})</span>
          </button>
        </div>
      </div>

      {/* Thẻ chỉ số tổng quan */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng số người dùng', val: usersTotal || users.length, icon: Users, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
          { label: 'Trận đấu hiển thị', val: matches.length, icon: Video, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
          { label: 'Trận đấu Công khai', val: publishedCount, icon: Globe, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Trạng thái Worker AI', val: 'Sẵn sàng', icon: Cpu, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-[#122340]/60 p-5 border border-white/10 rounded-2xl shadow-lg flex items-center space-x-4">
              <div className={`p-3 rounded-xl border ${item.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                <p className="text-2xl font-bold text-white tracking-tight">{item.val}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Thông báo phản hồi */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium flex items-center gap-2.5 transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          {feedbackMsg.type === 'success' ? (
            <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          ) : (
            <AlertTriangle className="w-5 h-5 flex-shrink-0" />
          )}
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* PHÂN HỆ 1: QUẢN LÝ TRẬN ĐẤU & THƯ VIỆN CÔNG KHAI (VS-16) */}
      {activeSection === 'MATCHES' && (
        <section className="bg-[#0f1d35]/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Globe className="w-5 h-5 text-sky-400" />
                <span>Quản Lý Trận Đấu & Kiểm Duyệt Thư Viện Công Khai</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
                Duyệt xuất bản (Publish), gỡ công khai (Unpublish), xóa vi phạm hoặc khôi phục từ thùng rác
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
              <span className="text-xs text-slate-400">Đang tải danh sách trận đấu...</span>
            </div>
          )}

          {!matchesLoading && matches.length === 0 && (
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
                    <th className="pb-3 px-3">Nguồn Video</th>
                    <th className="pb-3 px-3">Thời Lượng / Dữ Liệu AI</th>
                    <th className="pb-3 px-3">Trạng Thái</th>
                    <th className="pb-3 px-3 text-right">Hành Động</th>
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
                            {item.playerAName} <span className="text-white/40 font-normal">đối đầu</span> {item.playerBName}
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            Mã: #{item.id} • Chủ sở hữu: {item.ownerEmail || `User #${item.ownerId}`}
                          </div>
                        </td>

                        <td className="py-4 px-3">
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

                        <td className="py-4 px-3 text-slate-300">
                          <div>
                            {item.durationSeconds ? `${Math.floor(item.durationSeconds / 60)} phút` : 'Chưa có video'}
                          </div>
                          <div className="text-[11px] text-slate-500">
                            {item.totalRallies || 0} pha cầu • {item.totalStrokes || 0} cú đánh
                          </div>
                        </td>

                        <td className="py-4 px-3">
                          {getStatusLabel(item.status, item.deletedAt)}
                        </td>

                        <td className="py-4 px-3 text-right">
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
        </section>
      )}

      {/* PHÂN HỆ 2: QUẢN LÝ NGƯỜI DÙNG & KHÓA/MỞ KHÓA TÀI KHOẢN (VS-17) */}
      {activeSection === 'USERS' && (
        <section className="bg-[#0f1d35]/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-white/10 pb-5">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
                <Users className="w-5 h-5 text-sky-400" />
                <span>Quản Lý Tài Khoản Người Dùng</span>
              </h2>
              <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
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
                  placeholder="Tìm theo email hoặc họ tên..."
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
              <span className="text-xs text-slate-400">Đang tải danh sách người dùng...</span>
            </div>
          )}

          {!usersLoading && users.length === 0 && (
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
                    <th className="pb-3 px-3">Vai Trò</th>
                    <th className="pb-3 px-3">Trình Độ & Hồ Sơ</th>
                    <th className="pb-3 px-3">Trạng Thái</th>
                    <th className="pb-3 px-3 text-right">Hành Động</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {users.map((u) => {
                    const isLocked = u.status === 'LOCKED';
                    const isSelf = currentUser?.email && u.email?.toLowerCase() === currentUser.email.toLowerCase();
                    const isUpdating = userActionLoadingId === u.id;

                    return (
                      <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Người Dùng */}
                        <td className="py-4 px-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-full bg-brand/20 border border-brand/30 text-sky-300 flex items-center justify-center font-bold text-xs shrink-0 overflow-hidden">
                              {u.avatarUrl ? (
                                <img src={u.avatarUrl} alt={u.fullName || u.email} className="w-full h-full object-cover" />
                              ) : (
                                (u.fullName || u.email || 'U').charAt(0).toUpperCase()
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-white text-sm flex items-center gap-1.5">
                                <span>{u.fullName || 'Chưa cập nhật tên'}</span>
                                {isSelf && (
                                  <span className="px-2 py-0.2 rounded-full bg-brand/20 border border-brand/40 text-[10px] text-sky-300 font-semibold">
                                    Bạn
                                  </span>
                                )}
                              </div>
                              <div className="text-slate-400 font-mono text-[11px]">{u.email}</div>
                            </div>
                          </div>
                        </td>

                        {/* Vai Trò */}
                        <td className="py-4 px-3">
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

                        {/* Trình Độ & Ngày tạo */}
                        <td className="py-4 px-3 text-slate-300">
                          <div className="font-medium text-sky-400">{getLevelLabel(u.badmintonLevel)}</div>
                          <div className="text-[11px] text-slate-500">
                            ID: #{u.id} • Tham gia: {u.createdAt ? new Date(u.createdAt).toLocaleDateString('vi-VN') : 'N/A'}
                          </div>
                        </td>

                        {/* Trạng Thái */}
                        <td className="py-4 px-3">
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

                        {/* Hành Động */}
                        <td className="py-4 px-3 text-right">
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
        </section>
      )}

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
                  <h3 className="font-heading font-bold text-white text-base">Xác nhận xóa mềm trận đấu</h3>
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
                {matchToDelete.title || `${matchToDelete.playerAName} vs ${matchToDelete.playerBName}`}
              </strong>{' '}
              vào Thùng rác? Bạn có thể khôi phục lại trận đấu này bất kỳ lúc nào trong tab <strong>Thùng rác (Đã xóa)</strong>.
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
    </div>
  );
};
