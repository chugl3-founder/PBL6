import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { LogOut, User, Plus, ChevronDown } from 'lucide-react';
import apiClient from '../../api/client';
import { BrandLogo } from '../brand/BrandLogo';
import { useHighlightJobs } from '../highlight/useHighlightJobs';
import { isRendering } from '../../api/highlights';
import { logout } from '../../api/auth';
import { getAccessToken, getSessionUser } from '../../auth/session';

/**
 * An ink strip in the language of a broadcast scoreboard: links follow the logo, the current
 * section carries a court-green line, account actions sit in one menu. Its bottom edge is a
 * thin white line, like a court line under the scoreboard.
 */
export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = getAccessToken();
  const user = getSessionUser();
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const [accountOpen, setAccountOpen] = useState(false);
  const renderingCount = useHighlightJobs().reels.filter(isRendering).length;
  const accountRef = useRef<HTMLDivElement>(null);

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

  // Matches the AI is working on right now: a live mark on "Trận của tôi", refreshed per page.
  const [analyzingCount, setAnalyzingCount] = useState(0);
  useEffect(() => {
    if (!token) {
      setAnalyzingCount(0);
      return;
    }
    let cancelled = false;
    apiClient
      .get('/matches', { params: { status: 'ANALYZING', page: 0, size: 1 } })
      .then(res => !cancelled && setAnalyzingCount(res.data.pagination?.totalElements ?? 0))
      .catch(() => !cancelled && setAnalyzingCount(0));
    return () => {
      cancelled = true;
    };
  }, [token, location.pathname]);

  const handleLogout = async () => {
    try {
      await logout();
    } catch {
      // Ignored: the local session is cleared in any case
    } finally {
      navigate('/login');
    }
  };

  const navLink = (active: boolean) =>
    `relative flex items-center gap-1.5 h-14 px-3 text-[15px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/40 ${
      active
        ? 'text-white font-semibold after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:rounded-t after:bg-[#6FCF97]'
        : 'text-white/75 hover:text-white'
    }`;

  const initial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : null;

  return (
    <header className="sticky top-0 z-50 w-full bg-ink font-vn print:hidden shadow-[inset_0_-1px_0_rgba(255,255,255,0.12)]">
      {/* Same outer padding and inner width as the page body, so the logo lines up with the content */}
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
      <div className="max-w-6xl mx-auto h-14 flex items-center gap-6">
        <Link to="/" className="shrink-0 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40" aria-label="BadmintonAI, trang chủ">
          <BrandLogo />
        </Link>

        <nav className="hidden md:flex items-center" aria-label="Điều hướng chính">
          {token && (
            <Link
              to="/my-matches"
              className={navLink(location.pathname === '/my-matches' || /^\/matches\/\d+/.test(location.pathname))}
            >
              Trận của tôi
              {analyzingCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-pb px-1.5 h-5 text-xs font-semibold text-white tabular-nums"
                  title={`${analyzingCount} trận AI đang phân tích`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden />
                  {analyzingCount}
                  <span className="sr-only"> trận đang phân tích</span>
                </span>
              )}
            </Link>
          )}
          <Link to="/public-matches" className={navLink(location.pathname.startsWith('/public-matches'))}>
            Thư viện
          </Link>
          <Link to="/players" className={navLink(location.pathname.startsWith('/players'))}>
            Vận động viên
          </Link>
          {token && (
            <Link to="/scouting" className={navLink(location.pathname.startsWith('/scouting'))}>
              Trinh sát
            </Link>
          )}
          {token && (
            <Link to="/highlights" className={navLink(location.pathname.startsWith('/highlights'))}>
              Highlight
              {renderingCount > 0 && (
                <span
                  className="inline-flex items-center gap-1 rounded-full bg-pb px-1.5 h-5 text-xs font-semibold text-white tabular-nums"
                  title={`${renderingCount} video đang dựng`}
                >
                  <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" aria-hidden />
                  {renderingCount}
                  <span className="sr-only"> video đang dựng</span>
                </span>
              )}
            </Link>
          )}
          {!token && (
            <a href="/#features" className={navLink(false)}>
              Tính năng
            </a>
          )}
          {isAdmin && (
            <Link to="/admin" className={navLink(location.pathname.startsWith('/admin'))}>
              Quản trị
            </Link>
          )}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          {token ? (
            <>
              <Link
                to="/matches/create"
                className="flex items-center gap-1.5 rounded-md bg-pitch hover:bg-pitch-deep px-3.5 h-9 text-sm font-semibold text-white transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50"
              >
                <Plus className="h-4 w-4" aria-hidden />
                <span className="hidden sm:inline">Trận mới</span>
              </Link>
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen(open => !open)}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  className="flex items-center gap-2 rounded-md px-1.5 h-9 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/40"
                >
                  <span className="w-7 h-7 rounded-full overflow-hidden bg-white/15 flex items-center justify-center text-xs font-semibold text-white shrink-0">
                    {user?.avatarUrl ? (
                      <img src={user.avatarUrl} alt="" className="w-full h-full object-cover" />
                    ) : initial ?? (
                      <User className="h-3.5 w-3.5" />
                    )}
                  </span>
                  <span className="hidden lg:inline max-w-[10rem] truncate">{user?.fullName || 'Tài khoản'}</span>
                  <ChevronDown className={`h-3.5 w-3.5 transition-transform ${accountOpen ? 'rotate-180' : ''}`} />
                </button>
                {accountOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 mt-1.5 w-48 rounded-md bg-sheet border border-ink/10 shadow-lg py-1 text-sm text-ink"
                  >
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
            </>
          ) : (
            <>
              <Link to="/login" className="text-[15px] text-white/80 hover:text-white px-3 h-9 flex items-center transition-colors">
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="rounded-md bg-pitch hover:bg-pitch-deep px-3.5 h-9 flex items-center text-sm font-semibold text-white transition-colors"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
      </div>
    </header>
  );
};
