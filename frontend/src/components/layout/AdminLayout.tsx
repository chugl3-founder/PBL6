import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { Activity, ArrowLeft, ChevronDown, Film, LayoutDashboard, LogOut, Share2, User, Users } from 'lucide-react';
import { logout } from '../../api/auth';
import { getDashboardMetrics } from '../../api/admin';
import { getSessionUser } from '../../auth/session';
import { BrandLogo } from '../brand/BrandLogo';
import { Toaster } from '../ui/Toast';
import { loadErrorText } from '../admin/adminFormat';
import type { DashboardMetrics } from '../../types/admin';

/** While analyses or reels are running, the numbers (and the nav marks) refresh this often. */
const METRICS_POLL_MS = 5000;

/** What every admin page gets from the layout: the system numbers and a way to refresh them. */
export interface AdminOutletContext {
  metrics: DashboardMetrics | null;
  metricsLoading: boolean;
  metricsError: string | null;
  refreshMetrics: () => void;
}

/**
 * The admin console: a fixed ink sidebar (sections, what needs attention, the account) beside the
 * work area, so every section is one click away however wide the content gets. Narrow screens get
 * the ink strip with the sections scrolling sideways. The nav marks show what needs attention
 * (failed analyses in red, work in progress in orange).
 */
export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = getSessionUser();
  const [accountOpen, setAccountOpen] = useState(false);
  const accountRef = useRef<HTMLDivElement>(null);

  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [metricsLoading, setMetricsLoading] = useState(false);
  const [metricsError, setMetricsError] = useState<string | null>(null);

  const refreshMetrics = useCallback(async () => {
    try {
      setMetricsLoading(true);
      setMetrics(await getDashboardMetrics());
      setMetricsError(null);
    } catch (err) {
      setMetricsError(loadErrorText(err, 'số liệu hệ thống'));
    } finally {
      setMetricsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshMetrics();
  }, [refreshMetrics]);

  const running = (metrics?.processingAiAnalyses ?? 0) > 0 || (metrics?.matchStatusBreakdown?.ANALYZING ?? 0) > 0;
  useEffect(() => {
    if (!running) return;
    const timer = setInterval(() => !document.hidden && refreshMetrics(), METRICS_POLL_MS);
    return () => clearInterval(timer);
  }, [running, refreshMetrics]);

  // Same page background and type as the user pages.
  useEffect(() => {
    document.body.classList.add('theme-court');
    return () => document.body.classList.remove('theme-court');
  }, []);

  useEffect(() => {
    if (!accountOpen) return;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !accountRef.current?.contains(event.target as Node)) {
        setAccountOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [accountOpen]);

  useEffect(() => setAccountOpen(false), [location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignored: the local session is cleared in any case
    } finally {
      navigate('/login');
    }
  };

  const failed = metrics?.failedAiAnalyses ?? 0;
  const processing = metrics?.processingAiAnalyses ?? 0;
  const waitingPublish = metrics?.analyzedMatches ?? 0;

  const navItems: { to: string; label: string; icon: React.FC<{ className?: string }>; end?: boolean; mark?: React.ReactNode }[] = [
    { to: '/admin', label: 'Tổng quan', icon: LayoutDashboard, end: true },
    {
      to: '/admin/matches',
      label: 'Trận đấu',
      icon: Film,
      mark: waitingPublish > 0 && <NavMark tone="info" title={`${waitingPublish} trận đã phân tích, chưa công khai`}>{waitingPublish}</NavMark>,
    },
    { to: '/admin/users', label: 'Người dùng', icon: Users },
    {
      to: '/admin/ai-monitor',
      label: 'Phân tích AI',
      icon: Activity,
      mark:
        failed > 0 ? (
          <NavMark tone="loss" title={`${failed} phiên phân tích bị lỗi`}>{failed}</NavMark>
        ) : processing > 0 ? (
          <NavMark tone="progress" live title={`${processing} phiên đang chạy`}>{processing}</NavMark>
        ) : null,
    },
    { to: '/admin/content', label: 'Chia sẻ & highlight', icon: Share2 },
  ];

  const sideLink = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-3 h-10 px-3 rounded-md text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40 ${
      isActive
        ? 'bg-white/10 text-white font-semibold before:absolute before:left-0 before:inset-y-2 before:w-[3px] before:rounded-r before:bg-[#6FCF97]'
        : 'text-white/70 hover:text-white hover:bg-white/5'
    }`;

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-1.5 h-14 px-3 text-[15px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 ${
      isActive
        ? 'text-white font-semibold after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-[#6FCF97]'
        : 'text-white/75 hover:text-white'
    }`;

  const initial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : null;
  const context: AdminOutletContext = { metrics, metricsLoading, metricsError, refreshMetrics };

  const avatar = (
    <span className="w-8 h-8 rounded-full overflow-hidden bg-white/15 flex items-center justify-center text-xs font-semibold text-white shrink-0">
      {user?.avatarUrl ? <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" /> : initial ?? <User className="h-4 w-4" />}
    </span>
  );

  return (
    <div className="min-h-screen md:flex font-vn text-ink">
      {/* Wide screens: the sections, what needs attention and the account down the left side. */}
      <aside className="hidden md:flex sticky top-0 h-screen w-56 shrink-0 flex-col bg-ink text-white" aria-label="Quản trị">
        <Link
          to="/admin"
          className="flex flex-col justify-center gap-0.5 h-16 px-4 border-b border-white/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40"
          aria-label="BadmintonAI, trang quản trị"
        >
          <BrandLogo />
          <span className="pl-9 text-[11px] font-semibold uppercase tracking-wider text-[#6FCF97]">Trang quản trị</span>
        </Link>

        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1" aria-label="Điều hướng quản trị">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={sideLink}>
              <item.icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {item.mark}
            </NavLink>
          ))}
        </nav>

        <div className="border-t border-white/10 p-3 space-y-1">
          <Link
            to="/"
            className="flex items-center gap-3 h-10 px-3 rounded-md text-sm text-white/70 hover:text-white hover:bg-white/5 transition-colors"
          >
            <ArrowLeft className="h-[18px] w-[18px]" aria-hidden />
            Về trang người dùng
          </Link>
          <div className="flex items-center gap-2.5 px-3 pt-3">
            {avatar}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{user?.fullName || 'Quản trị viên'}</p>
              <p className="text-xs text-white/55 truncate">{user?.email}</p>
            </div>
          </div>
          <div className="flex gap-1 px-1.5 pt-1">
            <Link
              to="/profile"
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-white/70 hover:text-white hover:bg-white/5"
            >
              <User className="h-3.5 w-3.5" /> Hồ sơ
            </Link>
            <button
              type="button"
              onClick={handleLogout}
              className="flex-1 flex items-center justify-center gap-1.5 h-8 rounded-md text-xs text-white/70 hover:text-[#F2A7A7] hover:bg-white/5"
            >
              <LogOut className="h-3.5 w-3.5" /> Đăng xuất
            </button>
          </div>
        </div>
      </aside>

      {/* Narrow screens: the ink strip, with the sections scrolling sideways under it. */}
      <header className="md:hidden sticky top-0 z-50 bg-ink">
        <div className="h-14 flex items-center gap-3 px-4">
          <Link to="/admin" className="flex items-center gap-2" aria-label="BadmintonAI, trang quản trị">
            <BrandLogo />
          </Link>
          <div className="ml-auto relative" ref={accountRef}>
            <button
              type="button"
              onClick={() => setAccountOpen((open) => !open)}
              aria-haspopup="menu"
              aria-expanded={accountOpen}
              className="flex items-center gap-1.5 rounded-md px-1.5 h-9 text-white/80 hover:bg-white/10"
            >
              {avatar}
              <ChevronDown className={`h-3.5 w-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
            </button>
            {accountOpen && (
              <div role="menu" className="absolute right-0 mt-1.5 w-52 rounded-md bg-sheet border border-ink/10 shadow-lg py-1 text-sm text-ink">
                <Link to="/" role="menuitem" className="flex items-center gap-2 px-3 py-2 hover:bg-ink/5">
                  <ArrowLeft className="h-4 w-4 text-ink/70" /> Về trang người dùng
                </Link>
                <Link to="/profile" role="menuitem" className="flex items-center gap-2 px-3 py-2 hover:bg-ink/5">
                  <User className="h-4 w-4 text-ink/70" /> Hồ sơ cá nhân
                </Link>
                <button type="button" role="menuitem" onClick={handleLogout} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-ink/5 text-loss">
                  <LogOut className="h-4 w-4" /> Đăng xuất
                </button>
              </div>
            )}
          </div>
        </div>
        <nav className="flex overflow-x-auto border-t border-white/10 px-2" aria-label="Điều hướng quản trị">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLink}>
              {item.label}
              {item.mark}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 min-w-0 px-4 sm:px-6 lg:px-8 py-6 lg:py-8">
        <div className="max-w-7xl mx-auto pb-16 min-w-0">
          <Outlet context={context} />
        </div>
      </main>
      <Toaster />
    </div>
  );
};

const MARK_TONE = {
  loss: 'bg-loss',
  progress: 'bg-pb',
  info: 'bg-pa',
} as const;

/** A count on a nav link, the same shape as the "đang phân tích" mark in the user navbar. */
const NavMark: React.FC<{ tone: keyof typeof MARK_TONE; live?: boolean; title: string; children: React.ReactNode }> = ({
  tone,
  live,
  title,
  children,
}) => (
  <span className={`inline-flex items-center gap-1 rounded-full px-1.5 h-5 text-xs font-semibold text-white tabular-nums ${MARK_TONE[tone]}`} title={title}>
    {live && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden />}
    {children}
    <span className="sr-only">: {title}</span>
  </span>
);
