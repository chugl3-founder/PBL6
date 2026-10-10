import React from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Activity, LogOut, Video, Shield, User, PlusCircle } from 'lucide-react';
import apiClient from '../../api/client';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const token = localStorage.getItem('access_token');
  const userJson = localStorage.getItem('user_info');
  const user = userJson ? JSON.parse(userJson) : null;
  const isAdmin = user?.role === 'ROLE_ADMIN';

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

  const navLinks = [
    { label: 'Platform & Analysis', to: '/' },
    { label: 'Public Matches', to: '/#public-library' },
  ];

  return (
    <header className="sticky top-0 z-50 w-full bg-[#0b1322]/90 backdrop-blur-xl border-b border-white/10 shadow-lg transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo - BadPro+ Style */}
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center text-white shadow-glow-blue">
            <Activity className="h-5 w-5" />
          </div>
          <span className="font-heading font-extrabold text-lg tracking-tight text-white flex items-center">
            Badminton<span className="text-brand">AI</span>
            <span className="ml-1 text-[11px] font-bold text-brand-hover tracking-wider bg-brand/10 border border-brand/30 px-1.5 py-0.2 rounded-md">
              PRO+
            </span>
          </span>
        </Link>

        {/* Center Navigation Links */}
        <nav className="hidden md:flex items-center space-x-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.to;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  isActive 
                    ? 'text-white bg-white/10' 
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                {link.label}
              </Link>
            );
          })}

          {token && (
            <>
              <Link
                to="/my-matches"
                className={`flex items-center space-x-1.5 px-4 py-2 rounded-full text-sm font-medium transition-colors ${
                  location.pathname === '/my-matches'
                    ? 'text-white bg-white/10'
                    : 'text-white/70 hover:text-white hover:bg-white/5'
                }`}
              >
                <Video className="h-4 w-4 text-brand" />
                <span>Trận đấu của tôi</span>
              </Link>
              <Link
                to="/matches/create"
                className={`flex items-center space-x-1.5 px-3.5 py-1.5 rounded-full text-xs font-semibold transition-all ${
                  location.pathname === '/matches/create'
                    ? 'bg-brand text-white shadow-glow-blue'
                    : 'bg-brand/10 border border-brand/30 text-brand hover:bg-brand hover:text-white'
                }`}
              >
                <PlusCircle className="h-3.5 w-3.5" />
                <span>Tạo trận mới</span>
              </Link>
            </>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center space-x-1.5 px-3 py-1.5 rounded-full text-xs font-semibold text-purple-400 bg-purple-950/40 border border-purple-800/40 hover:bg-purple-900/30 transition-colors"
            >
              <Shield className="h-3.5 w-3.5" />
              <span>Admin Panel</span>
            </Link>
          )}
        </nav>

        {/* Right CTA Actions */}
        <div className="flex items-center space-x-3">
          {token ? (
            <div className="flex items-center space-x-3">
              <Link
                to="/profile"
                className="flex items-center space-x-2 text-sm bg-white/5 hover:bg-white/10 px-3.5 py-1.5 rounded-full border border-white/10 hover:border-brand/40 text-white/90 transition-colors"
                title="Hồ sơ cá nhân"
              >
                <div className="w-6 h-6 rounded-full overflow-hidden bg-brand/20 text-brand flex items-center justify-center font-bold text-xs shrink-0">
                  {user?.avatarUrl ? (
                    <img src={user.avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : user?.fullName ? (
                    user.fullName.charAt(0).toUpperCase()
                  ) : (
                    <User className="h-3.5 w-3.5" />
                  )}
                </div>
                <span className="font-medium text-xs hidden sm:inline">{user?.fullName || 'Vận động viên'}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-2 text-white/50 hover:text-red-400 hover:bg-white/5 rounded-full transition-colors"
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="text-sm font-semibold text-white/75 hover:text-white px-3.5 py-1.5 transition-colors"
              >
                Sign in
              </Link>
              <Link
                to="/register"
                className="rounded-full bg-brand hover:bg-brand-hover px-4 py-2 text-sm font-semibold text-white shadow-glow-blue transition-all duration-200"
              >
                Get Started
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
