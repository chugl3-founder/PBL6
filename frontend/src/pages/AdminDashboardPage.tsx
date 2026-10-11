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
  Shield,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import { Link, useLocation } from 'react-router-dom';
import apiClient from '../api/client';

type AdminSection = 'OVERVIEW' | 'MATCHES' | 'USERS' | 'AI_MONITOR';

export const AdminDashboardPage: React.FC = () => {
  const location = useLocation();

  const resolveSection = (pathname: string): AdminSection => {
    if (pathname.includes('/users')) return 'USERS';
    if (pathname.includes('/ai-monitor')) return 'AI_MONITOR';
    if (pathname.includes('/matches')) return 'MATCHES';
    return 'OVERVIEW';
  };

  const [activeSection, setActiveSection] = useState<AdminSection>(() =>
    resolveSection(location.pathname)
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

  // State Giám sát Phân tích AI (VS-18)
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [analysesTotal, setAnalysesTotal] = useState<number>(0);
  const [analysesLoading, setAnalysesLoading] = useState(true);
  const [aiStatusFilter, setAiStatusFilter] = useState<string>('ALL');
  const [aiActionLoadingId, setAiActionLoadingId] = useState<number | null>(null);

  // State Bảng Chỉ số Quản trị Tổng quan (VS-19)
  const [dashboardMetrics, setDashboardMetrics] = useState<any | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);

  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const currentUserJson = localStorage.getItem('user_info');
  const currentUser = currentUserJson ? JSON.parse(currentUserJson) : null;

  useEffect(() => {
    setActiveSection(resolveSection(location.pathname));
  }, [location.pathname]);

  useEffect(() => {
    fetchDashboardMetrics();
  }, []);

  useEffect(() => {
    fetchMatches(filterStatus);
  }, [filterStatus]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchUsers(userSearch, userStatusFilter);
    }, 250);
    return () => clearTimeout(timer);
  }, [userSearch, userStatusFilter]);

  useEffect(() => {
    fetchAnalyses(aiStatusFilter, true);
  }, [aiStatusFilter]);

  // Tự động làm mới danh sách phiên AI mỗi 2.5s khi đang ở phân hệ AI_MONITOR hoặc có phiên đang QUEUED/PROCESSING
  useEffect(() => {
    const hasActiveJob = analyses.some((a) => a.status === 'QUEUED' || a.status === 'PROCESSING');
    if (activeSection !== 'AI_MONITOR' && !hasActiveJob) return;

    const pollInterval = setInterval(() => {
      fetchAnalyses(aiStatusFilter, false);
      fetchDashboardMetrics();
    }, 2500);
    return () => clearInterval(pollInterval);
  }, [activeSection, aiStatusFilter, analyses]);

  const fetchDashboardMetrics = async () => {
    try {
      setMetricsLoading(true);
      const res = await apiClient.get('/admin/dashboard');
      setDashboardMetrics(res.data);
    } catch (err: any) {
      console.error('Lỗi khi tải chỉ số tổng quan Dashboard Admin:', err);
    } finally {
      setMetricsLoading(false);
    }
  };

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

  const fetchAnalyses = async (status: string, showSpinner = true) => {
    try {
      if (showSpinner) setAnalysesLoading(true);
      const params = new URLSearchParams({ page: '0', size: '50' });
      if (status !== 'ALL') params.append('status', status);
      const res = await apiClient.get(`/admin/ai-analyses?${params.toString()}`);
      setAnalyses(res.data.data || []);
      if (res.data.pagination?.totalElements !== undefined) {
        setAnalysesTotal(res.data.pagination.totalElements);
      }
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách phiên phân tích AI cho Admin:', err);
    } finally {
      if (showSpinner) setAnalysesLoading(false);
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
        setMatches((prev) => prev.map((m) => (m.id === matchId ? res.data : m)));
        showFeedback('success', `Đã gỡ công khai trận đấu #${matchId} về chế độ riêng tư.`);
      } else {
        const res = await apiClient.post(`/admin/matches/${matchId}/publish`);
        setMatches((prev) => prev.map((m) => (m.id === matchId ? res.data : m)));
        showFeedback('success', `Đã duyệt xuất bản trận đấu #${matchId} lên Thư viện công khai!`);
      }
      fetchDashboardMetrics();
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
      setMatches((prev) => prev.filter((m) => m.id !== matchId));
      setMatchToDelete(null);
      showFeedback('success', `Đã xóa mềm trận đấu #${matchId} vào Thùng rác.`);
      fetchDashboardMetrics();
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
        setMatches((prev) => prev.filter((m) => m.id !== matchId));
      } else {
        fetchMatches(filterStatus);
      }
      showFeedback('success', `Đã khôi phục thành công trận đấu #${matchId} từ Thùng rác!`);
      fetchDashboardMetrics();
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
        status: nextStatus,
      });
      setUsers((prev) => prev.map((u) => (u.id === userItem.id ? res.data : u)));
      showFeedback(
        'success',
        nextStatus === 'LOCKED'
          ? `Đã khóa tài khoản người dùng "${userItem.email}".`
          : `Đã mở khóa tài khoản người dùng "${userItem.email}".`
      );
      fetchDashboardMetrics();
    } catch (err: any) {
      showFeedback(
        'error',
        err.response?.data?.message || 'Không thể cập nhật trạng thái tài khoản.'
      );
    } finally {
      setUserActionLoadingId(null);
    }
  };

  const handleAdminRetryAnalysis = async (analysisItem: any) => {
    try {
      setAiActionLoadingId(analysisItem.id);
      setFeedbackMsg(null);
      const res = await apiClient.post(`/admin/ai-analyses/${analysisItem.id}/retry`);
      showFeedback(
        'success',
        res.data?.message ||
          `Đã kích hoạt chạy lại phiên phân tích AI mới #${res.data?.analysisId} cho trận đấu #${analysisItem.matchId}!`
      );
      await fetchAnalyses(aiStatusFilter, false);
      await fetchMatches(filterStatus);
      await fetchDashboardMetrics();
    } catch (err: any) {
      showFeedback(
        'error',
        err.response?.data?.message || 'Không thể chạy lại phiên phân tích AI.'
      );
    } finally {
      setAiActionLoadingId(null);
    }
  };

  const publishedCount = matches.filter((m) => m.status === 'PUBLISHED' && !m.deletedAt).length;

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
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 font-bold whitespace-nowrap">
          <span>ĐÃ XÓA MỀM</span>
        </span>
      );
    }
    switch (status) {
      case 'PUBLISHED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold whitespace-nowrap">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Đang công khai</span>
          </span>
        );
      case 'ANALYZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-semibold whitespace-nowrap">
            <span>Đã phân tích AI</span>
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-semibold whitespace-nowrap">
            <span>Sẵn sàng video</span>
          </span>
        );
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold whitespace-nowrap">
            <span>Bản nháp</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700/50 border border-white/10 text-slate-300 whitespace-nowrap">
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

  const getAiStatusBadge = (status: string) => {
    switch (status) {
      case 'COMPLETED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold whitespace-nowrap">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Hoàn tất (COMPLETED)</span>
          </span>
        );
      case 'PROCESSING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/15 border border-sky-500/30 text-sky-300 font-bold whitespace-nowrap">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Đang xử lý (PROCESSING)</span>
          </span>
        );
      case 'QUEUED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-indigo-500/15 border border-indigo-500/30 text-indigo-300 font-bold whitespace-nowrap">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            <span>Trong hàng đợi (QUEUED)</span>
          </span>
        );
      case 'FAILED':
      case 'UNSUPPORTED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 font-bold whitespace-nowrap">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>Thất bại ({status})</span>
          </span>
        );
      case 'CANCELLED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-500/15 border border-amber-500/30 text-amber-300 font-semibold whitespace-nowrap">
            <span>Đã hủy (CANCELLED)</span>
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/5 border border-white/10 text-slate-300 whitespace-nowrap">
            <span>{status}</span>
          </span>
        );
    }
  };

  const totalUsersMetric = dashboardMetrics?.totalUsers ?? (usersTotal || users.length);
  const totalMatchesMetric = dashboardMetrics?.totalMatches ?? matches.length;
  const publishedMatchesMetric = dashboardMetrics?.publishedMatches ?? publishedCount;
  const aiSuccessRateMetric =
    dashboardMetrics?.aiSuccessRate !== undefined ? `${dashboardMetrics.aiSuccessRate}%` : '100%';

  return (
    <div className="space-y-6 pb-12 min-w-0">
      {/* Thông báo phản hồi chung */}
      {feedbackMsg && (
        <div
          className={`p-4 rounded-2xl border text-sm font-medium flex items-center justify-between gap-2.5 transition-all ${
            feedbackMsg.type === 'success'
              ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
          }`}
        >
          <div className="flex items-center gap-2.5">
            {feedbackMsg.type === 'success' ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
            ) : (
              <AlertTriangle className="w-5 h-5 flex-shrink-0" />
            )}
            <span>{feedbackMsg.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedbackMsg(null)}
            className="text-white/50 hover:text-white p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* =====================================================================
          TRANG 1: TỔNG QUAN & BIỂU ĐỒ THỐNG KÊ HỆ THỐNG (/admin - VS-19)
         ===================================================================== */}
      {activeSection === 'OVERVIEW' && (
        <div className="space-y-6">
          {/* Thanh tiêu đề nhỏ & nút làm mới */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-xl font-black text-white tracking-tight">
                Tổng Quan Vận Hành & Thống Kê Hệ Thống
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Số liệu tổng hợp thời gian thực từ PostgreSQL cho toàn bộ các phân hệ Quản trị (VS-19)
              </p>
            </div>
            <button
              type="button"
              onClick={fetchDashboardMetrics}
              disabled={metricsLoading}
              className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-sky-300 flex items-center gap-2 transition"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading ? 'animate-spin' : ''}`} />
              <span>Làm mới dữ liệu</span>
            </button>
          </div>

          {/* 4 Thẻ KPI Tổng quan có link điều hướng nhanh */}
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
            {[
              {
                label: 'Tổng số người dùng',
                val: totalUsersMetric,
                sub: `${dashboardMetrics?.activeUsers ?? totalUsersMetric} hoạt động • ${dashboardMetrics?.lockedUsers ?? 0} đã khóa`,
                icon: Users,
                color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
                to: '/admin/users',
              },
              {
                label: 'Tổng số trận đấu',
                val: totalMatchesMetric,
                sub: `${dashboardMetrics?.analyzedMatches ?? 0} đã phân tích • ${dashboardMetrics?.deletedMatches ?? 0} thùng rác`,
                icon: Video,
                color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
                to: '/admin/matches',
              },
              {
                label: 'Trận đấu Công khai',
                val: publishedMatchesMetric,
                sub: 'Đang hiển thị trên Thư viện công khai',
                icon: Globe,
                color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
                to: '/admin/matches',
              },
              {
                label: 'Tỷ lệ AI Thành công',
                val: aiSuccessRateMetric,
                sub: `${dashboardMetrics?.completedAiAnalyses ?? 0} hoàn tất • ${dashboardMetrics?.failedAiAnalyses ?? 0} lỗi • ${dashboardMetrics?.processingAiAnalyses ?? 0} đang chạy`,
                icon: Cpu,
                color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
                to: '/admin/ai-monitor',
              },
            ].map((item, idx) => {
              const Icon = item.icon;
              return (
                <Link
                  key={idx}
                  to={item.to}
                  className="bg-[#0f1d35]/90 hover:bg-[#132544] p-5 border border-white/10 hover:border-brand/40 rounded-2xl shadow-lg flex items-center justify-between gap-3 transition group"
                >
                  <div className="flex items-center gap-3.5 min-w-0">
                    <div className={`p-3 rounded-xl border shrink-0 ${item.color}`}>
                      <Icon className="h-6 w-6" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs text-slate-400 font-medium truncate">{item.label}</p>
                      <p className="text-2xl font-black text-white tracking-tight mt-0.5">{item.val}</p>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.sub}</p>
                    </div>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition shrink-0" />
                </Link>
              );
            })}
          </div>

          {/* KHU VỰC BIỂU ĐỒ TRỰC QUAN & BẢNG TỔNG HỢP */}
          {dashboardMetrics &&
            (() => {
              const matchChartItems = [
                {
                  key: 'PUBLISHED',
                  label: 'Đang công khai (PUBLISHED)',
                  count: dashboardMetrics.publishedMatches || 0,
                  color: '#10b981',
                },
                {
                  key: 'ANALYZED',
                  label: 'Đã phân tích AI (ANALYZED)',
                  count: dashboardMetrics.analyzedMatches || 0,
                  color: '#0ea5e9',
                },
                {
                  key: 'READY',
                  label: 'Sẵn sàng video (READY)',
                  count: dashboardMetrics.matchStatusBreakdown?.READY || 0,
                  color: '#6366f1',
                },
                {
                  key: 'ANALYZING',
                  label: 'Đang chạy AI (ANALYZING)',
                  count: dashboardMetrics.matchStatusBreakdown?.ANALYZING || 0,
                  color: '#a855f7',
                },
                {
                  key: 'DRAFT',
                  label: 'Bản nháp (DRAFT)',
                  count: dashboardMetrics.draftMatches || 0,
                  color: '#f59e0b',
                },
                {
                  key: 'DELETED',
                  label: 'Thùng rác (DELETED)',
                  count: dashboardMetrics.deletedMatches || 0,
                  color: '#f43f5e',
                },
              ];
              const totalAllMatches =
                matchChartItems.reduce((acc, item) => acc + item.count, 0) || 1;

              const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
                const rad = ((angleDeg - 90) * Math.PI) / 180.0;
                return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
              };
              const createArc = (
                x: number,
                y: number,
                r: number,
                ir: number,
                startAngle: number,
                endAngle: number
              ) => {
                const adjEnd = Math.min(endAngle, startAngle + 359.99);
                const start = polarToCartesian(x, y, r, adjEnd);
                const end = polarToCartesian(x, y, r, startAngle);
                const innerStart = polarToCartesian(x, y, ir, startAngle);
                const innerEnd = polarToCartesian(x, y, ir, adjEnd);
                const largeArc = adjEnd - startAngle <= 180 ? '0' : '1';
                return [
                  `M ${start.x} ${start.y}`,
                  `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
                  `L ${innerStart.x} ${innerStart.y}`,
                  `A ${ir} ${ir} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
                  'Z',
                ].join(' ');
              };

              let accAngle = 0;
              const donutSlices = matchChartItems
                .filter((it) => it.count > 0)
                .map((it) => {
                  const pct = it.count / totalAllMatches;
                  const angle = pct * 360;
                  const startAngle = accAngle;
                  accAngle += angle;
                  return {
                    ...it,
                    pct: Math.round(pct * 1000) / 10,
                    startAngle,
                    angle,
                  };
                });

              const totalAi = dashboardMetrics.totalAiAnalyses || 1;
              const aiBarItems = [
                {
                  label: 'Hoàn tất (COMPLETED)',
                  count: dashboardMetrics.completedAiAnalyses || 0,
                  pct:
                    Math.round(((dashboardMetrics.completedAiAnalyses || 0) / totalAi) * 1000) / 10,
                  barClass: 'from-emerald-500 to-teal-400',
                  textClass: 'text-emerald-400',
                },
                {
                  label: 'Đang xử lý / Hàng đợi (PROCESSING / QUEUED)',
                  count: dashboardMetrics.processingAiAnalyses || 0,
                  pct:
                    Math.round(((dashboardMetrics.processingAiAnalyses || 0) / totalAi) * 1000) /
                    10,
                  barClass: 'from-sky-500 to-indigo-400',
                  textClass: 'text-sky-300',
                },
                {
                  label: 'Gặp sự cố (FAILED / UNSUPPORTED)',
                  count: dashboardMetrics.failedAiAnalyses || 0,
                  pct: Math.round(((dashboardMetrics.failedAiAnalyses || 0) / totalAi) * 1000) / 10,
                  barClass: 'from-rose-600 to-rose-400',
                  textClass: 'text-rose-400',
                },
                {
                  label: 'Đã hủy (CANCELLED)',
                  count: dashboardMetrics.aiStatusBreakdown?.CANCELLED || 0,
                  pct:
                    Math.round(
                      ((dashboardMetrics.aiStatusBreakdown?.CANCELLED || 0) / totalAi) * 1000
                    ) / 10,
                  barClass: 'from-amber-500 to-yellow-400',
                  textClass: 'text-amber-300',
                },
              ];

              const totalUsr = dashboardMetrics.totalUsers || 1;
              const activeUsrPct =
                Math.round(((dashboardMetrics.activeUsers || 0) / totalUsr) * 1000) / 10;
              const lockedUsrPct =
                Math.round(((dashboardMetrics.lockedUsers || 0) / totalUsr) * 1000) / 10;

              const gaugeRadius = 52;
              const gaugeCircumference = 2 * Math.PI * gaugeRadius;
              const successRateVal = Number(dashboardMetrics.aiSuccessRate || 0);
              const gaugeOffset =
                gaugeCircumference - (successRateVal / 100) * gaugeCircumference;

              return (
                <div className="space-y-6">
                  {/* HÀNG 1: 2 CỘT CÂN ĐỐI (6 COLS + 6 COLS) */}
                  <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                    {/* Cột Trái (6 cols): Biểu đồ tròn Donut Phân bố Trận đấu */}
                    <div className="xl:col-span-6 bg-[#0f1d35]/90 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-w-0">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3.5 gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Video className="w-4 h-4 text-sky-400 shrink-0" />
                            <span className="truncate">Biểu Đồ Cơ Cấu Trận Đấu</span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            Tỷ trọng các trạng thái trận đấu trên toàn hệ thống
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-mono font-bold shrink-0">
                          Tổng: {totalAllMatches}
                        </span>
                      </div>

                      <div className="flex flex-col sm:flex-row items-center gap-6 my-5">
                        {/* SVG Donut Chart */}
                        <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                          <svg viewBox="0 0 200 200" className="w-full h-full">
                            {donutSlices.map((sl) => (
                              <path
                                key={sl.key}
                                d={createArc(
                                  100,
                                  100,
                                  88,
                                  54,
                                  sl.startAngle,
                                  sl.startAngle + sl.angle
                                )}
                                fill={sl.color}
                                className="transition-all duration-300 hover:opacity-90"
                              />
                            ))}
                          </svg>
                          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-semibold">
                              Đang hoạt động
                            </span>
                            <span className="text-2xl font-black text-white">
                              {dashboardMetrics.totalMatches}
                            </span>
                            <span className="text-[10px] text-emerald-400 font-bold">
                              +{dashboardMetrics.deletedMatches} thùng rác
                            </span>
                          </div>
                        </div>

                        {/* Chú giải chi tiết Donut */}
                        <div className="flex-1 w-full space-y-2 text-xs min-w-0">
                          {matchChartItems.map((it) => {
                            const pct = Math.round((it.count / totalAllMatches) * 1000) / 10;
                            return (
                              <div
                                key={it.key}
                                className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5"
                              >
                                <div className="flex items-center gap-2 min-w-0">
                                  <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0"
                                    style={{ backgroundColor: it.color }}
                                  />
                                  <span className="text-slate-200 truncate text-[11px]">
                                    {it.label}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5 font-mono shrink-0 ml-2">
                                  <span className="font-bold text-white">{it.count}</span>
                                  <span className="text-[10px] text-slate-400">({pct}%)</span>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Công khai:{' '}
                          <strong className="text-emerald-400">
                            {dashboardMetrics.publishedMatches}
                          </strong>{' '}
                          • Chờ duyệt:{' '}
                          <strong className="text-sky-300">
                            {dashboardMetrics.analyzedMatches}
                          </strong>
                        </span>
                        <Link
                          to="/admin/matches"
                          className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                        >
                          <span>Đi tới Quản lý Trận đấu</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>

                    {/* Cột Phải (6 cols): Biểu đồ Cột ngang Tiến trình AI & Đồng hồ Gauge Tỷ lệ Thành công */}
                    <div className="xl:col-span-6 bg-[#0f1d35]/90 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 min-w-0">
                      <div className="flex items-center justify-between border-b border-white/10 pb-3.5 gap-2">
                        <div className="min-w-0">
                          <h3 className="text-sm font-bold text-white flex items-center gap-2">
                            <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
                            <span className="truncate">
                              Biểu Đồ Hiệu Suất AI Worker (CoachAI+ 2.0)
                            </span>
                          </h3>
                          <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                            Phân bố kết quả xử lý video và tỷ lệ hoàn thành của hàng đợi AI
                          </p>
                        </div>
                        <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono font-bold shrink-0">
                          {dashboardMetrics.totalAiAnalyses} phiên AI
                        </span>
                      </div>

                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center py-2">
                        {/* Radial Gauge Chart cho Tỷ lệ AI Thành công */}
                        <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-[#142544]/60 border border-white/10">
                          <div className="relative w-32 h-32 flex items-center justify-center">
                            <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                              <circle
                                cx="70"
                                cy="70"
                                r={gaugeRadius}
                                stroke="rgba(255,255,255,0.08)"
                                strokeWidth="12"
                                fill="transparent"
                              />
                              <circle
                                cx="70"
                                cy="70"
                                r={gaugeRadius}
                                stroke="#a855f7"
                                strokeWidth="12"
                                strokeDasharray={gaugeCircumference}
                                strokeDashoffset={gaugeOffset}
                                strokeLinecap="round"
                                fill="transparent"
                                className="transition-all duration-700 ease-out"
                              />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                              <span className="text-xl font-black text-white">
                                {successRateVal}%
                              </span>
                              <span className="text-[10px] text-purple-300 font-semibold uppercase">
                                Thành công
                              </span>
                            </div>
                          </div>
                          <p className="text-[11px] text-slate-400 text-center mt-2">
                            {dashboardMetrics.completedAiAnalyses} hoàn tất /{' '}
                            {dashboardMetrics.failedAiAnalyses} lỗi
                          </p>
                        </div>

                        {/* Horizontal Bar Chart cho từng trạng thái AI */}
                        <div className="sm:col-span-7 space-y-3 min-w-0">
                          {aiBarItems.map((bar, idx) => (
                            <div key={idx} className="space-y-1">
                              <div className="flex items-center justify-between text-xs gap-2">
                                <span className="text-slate-200 font-medium truncate">
                                  {bar.label}
                                </span>
                                <span className={`font-mono font-bold shrink-0 ${bar.textClass}`}>
                                  {bar.count} ({bar.pct}%)
                                </span>
                              </div>
                              <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/10">
                                <div
                                  className={`h-full rounded-full bg-gradient-to-r ${bar.barClass} transition-all duration-500`}
                                  style={{ width: `${Math.max(bar.pct, bar.count > 0 ? 4 : 0)}%` }}
                                />
                              </div>
                            </div>
                          ))}

                          {/* Thanh Stacked Bar Tỷ lệ Tài khoản Người dùng */}
                          <div className="pt-2.5 border-t border-white/10 space-y-1">
                            <div className="flex items-center justify-between text-xs gap-2">
                              <span className="text-slate-300 font-semibold flex items-center gap-1.5 truncate">
                                <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                                <span className="truncate">Tài khoản Hoạt động vs Đã khóa</span>
                              </span>
                              <span className="font-mono text-[11px] text-emerald-400 shrink-0">
                                {dashboardMetrics.activeUsers} / {dashboardMetrics.lockedUsers}
                              </span>
                            </div>
                            <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden flex border border-white/10">
                              <div
                                className="h-full bg-emerald-500 transition-all duration-500"
                                style={{ width: `${activeUsrPct}%` }}
                              />
                              <div
                                className="h-full bg-rose-500 transition-all duration-500"
                                style={{ width: `${lockedUsrPct}%` }}
                              />
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                        <span className="text-slate-400">
                          Đang xử lý:{' '}
                          <strong className="text-sky-300">
                            {dashboardMetrics.processingAiAnalyses}
                          </strong>{' '}
                          • Lỗi cần Retry:{' '}
                          <strong className="text-rose-400">
                            {dashboardMetrics.failedAiAnalyses}
                          </strong>
                        </span>
                        <Link
                          to="/admin/ai-monitor"
                          className="text-purple-300 hover:text-purple-200 font-bold flex items-center gap-1"
                        >
                          <span>Đi tới Giám sát AI</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  </div>

                  {/* HÀNG 2: BẢNG THỐNG KÊ TỔNG HỢP CHI TIẾT CÁC PHÂN HỆ */}
                  <div className="bg-[#0f1d35]/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 min-w-0">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                      <div>
                        <h3 className="text-sm font-bold text-white flex items-center gap-2">
                          <Globe className="w-4 h-4 text-emerald-400" />
                          <span>Bảng Số Liệu Thống Kê Tổng Hợp Toàn Hệ Thống</span>
                        </h3>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Chỉ số định lượng, tỷ trọng phần trăm và lối tắt điều hướng nhanh đến từng phân hệ
                        </p>
                      </div>
                      <span className="text-[11px] text-slate-400 font-mono">
                        Đồng bộ trực tiếp từ PostgreSQL
                      </span>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                            <th className="pb-3 px-3 whitespace-nowrap">Phân Hệ Quản Trị</th>
                            <th className="pb-3 px-3">Chỉ Số Chi Tiết</th>
                            <th className="pb-3 px-3 text-right whitespace-nowrap">Số Lượng</th>
                            <th className="pb-3 px-3 text-right whitespace-nowrap">Tỷ Trọng (%)</th>
                            <th className="pb-3 px-3 whitespace-nowrap">Minh Họa Tỷ Trọng</th>
                            <th className="pb-3 px-3 text-right whitespace-nowrap">Trạng Thái</th>
                            <th className="pb-3 px-3 text-right whitespace-nowrap">Thao Tác</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                          {[
                            {
                              module: 'Người dùng (VS-17)',
                              metric: 'Tài khoản đang hoạt động (ACTIVE)',
                              count: dashboardMetrics.activeUsers,
                              total: dashboardMetrics.totalUsers || 1,
                              color: 'bg-emerald-500',
                              badge: 'Bình thường',
                              badgeCls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                              link: '/admin/users',
                            },
                            {
                              module: 'Người dùng (VS-17)',
                              metric: 'Tài khoản bị khóa vi phạm (LOCKED)',
                              count: dashboardMetrics.lockedUsers,
                              total: dashboardMetrics.totalUsers || 1,
                              color: 'bg-rose-500',
                              badge:
                                dashboardMetrics.lockedUsers > 0 ? 'Đang kiểm soát' : 'An toàn',
                              badgeCls: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
                              link: '/admin/users',
                            },
                            {
                              module: 'Trận đấu & Thư viện (VS-16)',
                              metric: 'Trận đấu đã xuất bản công khai (PUBLISHED)',
                              count: dashboardMetrics.publishedMatches,
                              total: totalAllMatches,
                              color: 'bg-emerald-400',
                              badge: 'Công khai',
                              badgeCls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                              link: '/admin/matches',
                            },
                            {
                              module: 'Trận đấu & Thư viện (VS-16)',
                              metric: 'Trận đấu đã phân tích AI chờ xuất bản (ANALYZED)',
                              count: dashboardMetrics.analyzedMatches,
                              total: totalAllMatches,
                              color: 'bg-sky-400',
                              badge: 'Sẵn sàng duyệt',
                              badgeCls: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
                              link: '/admin/matches',
                            },
                            {
                              module: 'Trận đấu & Thư viện (VS-16)',
                              metric: 'Trận đấu trong Thùng rác xóa mềm (DELETED)',
                              count: dashboardMetrics.deletedMatches,
                              total: totalAllMatches,
                              color: 'bg-rose-400',
                              badge: 'Lưu trữ tạm',
                              badgeCls: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
                              link: '/admin/matches',
                            },
                            {
                              module: 'Tiến trình AI (VS-18)',
                              metric: 'Phiên phân tích AI hoàn tất (COMPLETED)',
                              count: dashboardMetrics.completedAiAnalyses,
                              total: dashboardMetrics.totalAiAnalyses || 1,
                              color: 'bg-purple-400',
                              badge: 'Ổn định',
                              badgeCls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                              link: '/admin/ai-monitor',
                            },
                            {
                              module: 'Tiến trình AI (VS-18)',
                              metric: 'Phiên phân tích AI gặp lỗi (FAILED / UNSUPPORTED)',
                              count: dashboardMetrics.failedAiAnalyses,
                              total: dashboardMetrics.totalAiAnalyses || 1,
                              color: 'bg-rose-500',
                              badge:
                                dashboardMetrics.failedAiAnalyses > 0
                                  ? 'Cần kiểm tra / Retry'
                                  : 'Tốt',
                              badgeCls:
                                dashboardMetrics.failedAiAnalyses > 0
                                  ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
                                  : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                              link: '/admin/ai-monitor',
                            },
                          ].map((row, rIdx) => {
                            const pct = Math.round((row.count / row.total) * 1000) / 10;
                            return (
                              <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                                <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                                  {row.module}
                                </td>
                                <td className="py-3 px-3 text-slate-300">{row.metric}</td>
                                <td className="py-3 px-3 text-right font-mono font-bold text-white text-sm whitespace-nowrap">
                                  {row.count}
                                </td>
                                <td className="py-3 px-3 text-right font-mono text-sky-300 whitespace-nowrap">
                                  {pct}%
                                </td>
                                <td className="py-3 px-3 w-40">
                                  <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                                    <div
                                      className={`h-full rounded-full ${row.color}`}
                                      style={{ width: `${Math.max(pct, row.count > 0 ? 4 : 0)}%` }}
                                    />
                                  </div>
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  <span
                                    className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${row.badgeCls}`}
                                  >
                                    {row.badge}
                                  </span>
                                </td>
                                <td className="py-3 px-3 text-right whitespace-nowrap">
                                  <Link
                                    to={row.link}
                                    className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                                  >
                                    <span>Chi tiết</span>
                                    <ArrowRight className="w-3 h-3" />
                                  </Link>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
        </div>
      )}

      {/* =====================================================================
          TRANG 2: QUẢN LÝ TRẬN ĐẤU & THƯ VIỆN CÔNG KHAI (/admin/matches - VS-16)
         ===================================================================== */}
      {activeSection === 'MATCHES' && (
        <div className="space-y-5 min-w-0">
          {/* 4 Thẻ tóm tắt nhanh dành riêng cho phân hệ Trận đấu */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[#0f1d35]/85 border border-white/10 rounded-2xl p-4">
              <div className="text-[11px] text-slate-400">Tổng trận đang hoạt động</div>
              <div className="text-xl font-black text-white mt-0.5">
                {dashboardMetrics?.totalMatches ?? matches.length}
              </div>
            </div>
            <div className="bg-[#0f1d35]/85 border border-emerald-500/25 rounded-2xl p-4">
              <div className="text-[11px] text-emerald-300">Đang công khai (PUBLISHED)</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {dashboardMetrics?.publishedMatches ?? publishedCount}
              </div>
            </div>
            <div className="bg-[#0f1d35]/85 border border-sky-500/25 rounded-2xl p-4">
              <div className="text-[11px] text-sky-300">Đã phân tích chờ duyệt (ANALYZED)</div>
              <div className="text-xl font-black text-sky-400 mt-0.5">
                {dashboardMetrics?.analyzedMatches ?? 0}
              </div>
            </div>
            <div className="bg-[#0f1d35]/85 border border-rose-500/25 rounded-2xl p-4">
              <div className="text-[11px] text-rose-300">Trong thùng rác (DELETED)</div>
              <div className="text-xl font-black text-rose-400 mt-0.5">
                {dashboardMetrics?.deletedMatches ?? 0}
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
                                : 'Chưa có video'}
                            </div>
                            <div className="text-[11px] text-slate-500">
                              {item.totalRallies || 0} pha cầu • {item.totalStrokes || 0} cú đánh
                            </div>
                          </td>

                          <td className="py-4 px-3 whitespace-nowrap">
                            {getStatusLabel(item.status, item.deletedAt)}
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
          </section>
        </div>
      )}

      {/* =====================================================================
          TRANG 3: QUẢN LÝ NGƯỜI DÙNG & KHÓA/MỞ KHÓA TÀI KHOẢN (/admin/users - VS-17)
         ===================================================================== */}
      {activeSection === 'USERS' && (
        <div className="space-y-5 min-w-0">
          {/* 3 Thẻ tóm tắt nhanh dành riêng cho phân hệ Người dùng */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
            <div className="bg-[#0f1d35]/85 border border-white/10 rounded-2xl p-4">
              <div className="text-[11px] text-slate-400">Tổng số tài khoản hệ thống</div>
              <div className="text-xl font-black text-white mt-0.5">
                {dashboardMetrics?.totalUsers ?? (usersTotal || users.length)}
              </div>
            </div>
            <div className="bg-[#0f1d35]/85 border border-emerald-500/25 rounded-2xl p-4">
              <div className="text-[11px] text-emerald-300">Đang hoạt động (ACTIVE)</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {dashboardMetrics?.activeUsers ?? users.filter((u) => u.status === 'ACTIVE').length}
              </div>
            </div>
            <div className="bg-[#0f1d35]/85 border border-rose-500/25 rounded-2xl p-4">
              <div className="text-[11px] text-rose-300">Đã bị khóa (LOCKED)</div>
              <div className="text-xl font-black text-rose-400 mt-0.5">
                {dashboardMetrics?.lockedUsers ?? users.filter((u) => u.status === 'LOCKED').length}
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
                      <th className="pb-3 px-3 whitespace-nowrap">Vai Trò</th>
                      <th className="pb-3 px-3 whitespace-nowrap">Trình Độ & Hồ Sơ</th>
                      <th className="pb-3 px-3 whitespace-nowrap">Trạng Thái</th>
                      <th className="pb-3 px-3 text-right whitespace-nowrap">Hành Động</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {users.map((u) => {
                      const isLocked = u.status === 'LOCKED';
                      const isSelf =
                        currentUser?.email &&
                        u.email?.toLowerCase() === currentUser.email.toLowerCase();
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
                                    <span className="px-2 py-0.2 rounded-full bg-brand/20 border border-brand/40 text-[10px] text-sky-300 font-semibold">
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
          </section>
        </div>
      )}

      {/* =====================================================================
          TRANG 4: GIÁM SÁT TIẾN TRÌNH AI & RETRY KHẨN CẤP (/admin/ai-monitor - VS-18)
         ===================================================================== */}
      {activeSection === 'AI_MONITOR' && (
        <div className="space-y-5 min-w-0">
          {/* 4 Thẻ tóm tắt nhanh dành riêng cho phân hệ Giám sát AI */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5">
            <div className="bg-[#0f1d35]/85 border border-white/10 rounded-2xl p-4">
              <div className="text-[11px] text-slate-400">Tổng số phiên AI</div>
              <div className="text-xl font-black text-white mt-0.5">
                {dashboardMetrics?.totalAiAnalyses ?? (analysesTotal || analyses.length)}
              </div>
            </div>
            <div className="bg-[#0f1d35]/85 border border-emerald-500/25 rounded-2xl p-4">
              <div className="text-[11px] text-emerald-300">Hoàn tất (COMPLETED)</div>
              <div className="text-xl font-black text-emerald-400 mt-0.5">
                {dashboardMetrics?.completedAiAnalyses ?? 0}
              </div>
            </div>
            <div className="bg-[#0f1d35]/85 border border-sky-500/25 rounded-2xl p-4">
              <div className="text-[11px] text-sky-300">Đang xử lý / Hàng đợi</div>
              <div className="text-xl font-black text-sky-400 mt-0.5">
                {dashboardMetrics?.processingAiAnalyses ?? 0}
              </div>
            </div>
            <div className="bg-[#0f1d35]/85 border border-rose-500/25 rounded-2xl p-4">
              <div className="text-[11px] text-rose-300">Gặp lỗi cần Retry (FAILED)</div>
              <div className="text-xl font-black text-rose-400 mt-0.5">
                {dashboardMetrics?.failedAiAnalyses ?? 0}
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

            {!analysesLoading && analyses.length === 0 && (
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
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 border border-emerald-500/30 text-[10px] text-emerald-300 font-semibold">
                                  Phiên hiện tại
                                </span>
                              ) : (
                                <span className="px-2 py-0.5 rounded-full bg-white/5 border border-white/10 text-[10px] text-slate-400">
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
                            <div>{getAiStatusBadge(a.status)}</div>
                            {(a.status === 'PROCESSING' || a.status === 'QUEUED') && (
                              <div className="mt-2 w-44 space-y-1">
                                <div className="w-full h-1.5 rounded-full bg-white/10 overflow-hidden">
                                  <div
                                    className="h-full bg-brand transition-all duration-300"
                                    style={{ width: `${a.progressPercent || 10}%` }}
                                  />
                                </div>
                                <div className="text-[10px] text-sky-300 truncate">
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
          </section>
        </div>
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
    </div>
  );
};
