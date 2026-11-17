import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Outlet, Link, NavLink, useLocation, useNavigate } from 'react-router-dom';
import { ArrowLeft, ChevronDown, LogOut, User } from 'lucide-react';
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
 * The admin area wears the same ink scoreboard strip as the user pages, so moving between the two
 * feels like one product. A "Quản trị" tag beside the logo says where you are; the nav marks show
 * what needs attention (failed analyses in red, work in progress in orange).
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

  const navItems: { to: string; label: string; end?: boolean; mark?: React.ReactNode }[] = [
    { to: '/admin', label: 'Tổng quan', end: true },
    {
      to: '/admin/matches',
      label: 'Trận đấu',
      mark: waitingPublish > 0 && <NavMark tone="info" title={`${waitingPublish} trận đã phân tích, chưa công khai`}>{waitingPublish}</NavMark>,
    },
    { to: '/admin/users', label: 'Người dùng' },
    {
      to: '/admin/ai-monitor',
      label: 'Phân tích AI',
      mark:
        failed > 0 ? (
          <NavMark tone="loss" title={`${failed} phiên phân tích bị lỗi`}>{failed}</NavMark>
        ) : processing > 0 ? (
          <NavMark tone="progress" live title={`${processing} phiên đang chạy`}>{processing}</NavMark>
        ) : null,
    },
    { to: '/admin/content', label: 'Chia sẻ' },
  ];

  const navLink = ({ isActive }: { isActive: boolean }) =>
    `relative flex items-center gap-1.5 h-14 px-3 text-[15px] whitespace-nowrap transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 ${
      isActive
        ? 'text-white font-semibold after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-[#6FCF97]'
        : 'text-white/75 hover:text-white'
    }`;

  const initial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : null;
  const context: AdminOutletContext = { metrics, metricsLoading, metricsError, refreshMetrics };

  return (
    <div className="flex flex-col min-h-screen font-vn text-ink">
      <header className="sticky top-0 z-50 w-full bg-ink shadow-[inset_0_-1px_0_rgba(255,255,255,0.12)]">
        <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
          <div className="max-w-6xl mx-auto h-14 flex items-center gap-5">
            <Link
              to="/admin"
              className="shrink-0 flex items-center gap-2.5 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
              aria-label="BadmintonAI, trang quản trị"
            >
              <BrandLogo />
              <span className="rounded border border-white/25 px-1.5 py-0.5 text-xs font-semibold text-white/85">Quản trị</span>
            </Link>

            <nav className="hidden md:flex items-center min-w-0" aria-label="Điều hướng quản trị">
              {navItems.map((item) => (
                <NavLink key={item.to} to={item.to} end={item.end} className={navLink}>
                  {item.label}
                  {item.mark}
                </NavLink>
              ))}
            </nav>

            <div className="ml-auto flex items-center gap-2">
              <Link
                to="/"
                title="Về trang người dùng"
                className="hidden sm:flex items-center gap-1.5 h-9 px-2.5 rounded-md text-sm whitespace-nowrap text-white/80 hover:text-white hover:bg-white/10 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden />
                <span className="hidden xl:inline">Trang người dùng</span>
                <span className="xl:hidden sr-only">Về trang người dùng</span>
              </Link>
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen((open) => !open)}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  className="flex items-center gap-2 rounded-md px-1.5 h-9 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <span className="w-7 h-7 rounded-full overflow-hidden bg-white/15 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      initial ?? <User className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="hidden 2xl:inline max-w-[10rem] truncate">{user?.fullName || 'Quản trị viên'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>
                {accountOpen && (
                  <div role="menu" className="absolute right-0 mt-1.5 w-56 rounded-md bg-sheet border border-ink/10 shadow-lg py-1 text-sm text-ink">
                    <div className="px-3 py-2 border-b border-ink/10">
                      <p className="font-medium truncate">{user?.fullName || 'Quản trị viên'}</p>
                      <p className="text-xs text-ink/60 truncate">{user?.email}</p>
                    </div>
                    <Link to="/profile" role="menuitem" className="flex items-center gap-2 px-3 py-2 hover:bg-ink/5">
                      <User className="h-4 w-4 text-ink/70" />
                      Hồ sơ cá nhân
                    </Link>
                    <button
                      type="button"
                      role="menuitem"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-ink/5 text-loss"
                    >
                      <LogOut className="h-4 w-4" />
                      Đăng xuất
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Narrow screens: the sections scroll sideways under the strip. */}
        <nav className="md:hidden flex overflow-x-auto border-t border-white/10 px-2" aria-label="Điều hướng quản trị">
          {navItems.map((item) => (
            <NavLink key={item.to} to={item.to} end={item.end} className={navLink}>
              {item.label}
              {item.mark}
            </NavLink>
          ))}
        </nav>
      </header>

      <main className="flex-1 max-w-[1440px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <div className="max-w-6xl mx-auto pt-4 pb-16 min-w-0">
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
