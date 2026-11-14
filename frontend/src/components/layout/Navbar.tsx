import React, { useEffect, useRef, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, LogOut, User, Plus, ChevronDown } from 'lucide-react';
import apiClient from '../../api/client';

/**
 * A thin ink strip in the language of a broadcast scoreboard: links follow the logo,
 * the current section carries a court-green line, account actions sit in one menu.
 */
export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  const userJson = localStorage.getItem('user_info');
  const user = userJson ? JSON.parse(userJson) : null;
  const isAdmin = user?.role === 'ROLE_ADMIN';
  const [accountOpen, setAccountOpen] = useState(false);
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

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch (err) {
      // Ignored: Still cleanup client session
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      navigate('/login');
    }
  };

  const navLink = (active: boolean) =>
    `relative flex items-center h-12 px-3 text-sm transition-colors ${
      active
        ? 'text-white font-medium after:absolute after:inset-x-3 after:bottom-0 after:h-[3px] after:bg-pitch'
        : 'text-white/65 hover:text-white'
    }`;

  const initial = user?.fullName ? user.fullName.charAt(0).toUpperCase() : null;

  return (
    <header className="sticky top-0 z-50 w-full bg-ink font-vn print:hidden">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 h-12 flex items-center gap-6">
        <Link to="/" className="flex items-center gap-2 shrink-0" aria-label="BadmintonAI, trang chủ">
          <span className="w-6 h-6 rounded bg-pitch flex items-center justify-center text-white">
            <Activity className="h-4 w-4" />
          </span>
          <span className="font-semibold text-[15px] text-white">BadmintonAI</span>
        </Link>

        <nav className="hidden md:flex items-center" aria-label="Điều hướng chính">
          {token && (
            <Link
              to="/my-matches"
              className={navLink(location.pathname === '/my-matches' || /^\/matches\/\d+/.test(location.pathname))}
            >
              Trận của tôi
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
                className="flex items-center gap-1.5 rounded bg-pitch hover:bg-pitch-deep px-3 h-8 text-sm font-medium text-white transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span className="hidden sm:inline">Trận mới</span>
              </Link>
              <div className="relative" ref={accountRef}>
                <button
                  type="button"
                  onClick={() => setAccountOpen(open => !open)}
                  aria-haspopup="menu"
                  aria-expanded={accountOpen}
                  className="flex items-center gap-2 rounded px-1.5 h-8 text-sm text-white/80 hover:text-white hover:bg-white/10 transition-colors"
                >
                  <span className="w-6 h-6 rounded-full overflow-hidden bg-white/15 flex items-center justify-center text-xs font-semibold text-white shrink-0">
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
              <Link to="/login" className="text-sm text-white/75 hover:text-white px-3 h-8 flex items-center transition-colors">
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="rounded bg-pitch hover:bg-pitch-deep px-3 h-8 flex items-center text-sm font-medium text-white transition-colors"
              >
                Đăng ký
              </Link>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
