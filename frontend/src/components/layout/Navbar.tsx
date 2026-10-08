import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, LogOut, Video, Shield, User, Zap } from 'lucide-react';

export const Navbar: React.FC = () => {
  const navigate = useNavigate();
  const token = localStorage.getItem('access_token');
  const userJson = localStorage.getItem('user_info');
  const user = userJson ? JSON.parse(userJson) : null;
  const isAdmin = user?.role === 'ROLE_ADMIN';

  const handleLogout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    localStorage.removeItem('user_info');
    navigate('/login');
  };

  return (
    <header className="glass-panel sticky top-0 z-50 border-b border-slate-800/80 backdrop-blur-xl">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo with Neon Cyber Glow */}
        <Link to="/" className="flex items-center space-x-2.5 group">
          <div className="p-2 rounded-lg bg-court/10 border border-court/30 text-court group-hover:shadow-neon-court transition-all duration-300">
            <Activity className="h-5 w-5 text-court" />
          </div>
          <span className="font-extrabold text-lg tracking-tight text-white flex items-center gap-1.5">
            BADMINTON<span className="text-court drop-shadow-[0_0_8px_rgba(34,197,94,0.6)]">AI</span>
            <span className="text-[10px] font-mono tracking-widest uppercase bg-slate-800 text-court-cyan px-1.5 py-0.5 rounded border border-court-cyan/30">
              PRO
            </span>
          </span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-6 text-sm font-medium text-slate-300">
          <Link 
            to="/" 
            className="hover:text-court transition-colors flex items-center gap-1.5"
          >
            <span>Thư viện trận đấu</span>
          </Link>
          
          {token && (
            <Link 
              to="/my-matches" 
              className="flex items-center space-x-1.5 hover:text-court transition-colors"
            >
              <Video className="h-4 w-4 text-court" />
              <span>Trận đấu của tôi</span>
            </Link>
          )}

          {isAdmin && (
            <Link 
              to="/admin" 
              className="flex items-center space-x-1.5 text-purple-400 hover:text-purple-300 transition-colors bg-purple-950/40 px-2.5 py-1 rounded-md border border-purple-800/50"
            >
              <Shield className="h-4 w-4" />
              <span>Quản trị (Admin)</span>
            </Link>
          )}
        </nav>

        {/* Auth CTA Controls */}
        <div className="flex items-center space-x-3">
          {token ? (
            <div className="flex items-center space-x-3">
              <div className="flex items-center space-x-2 text-sm bg-slate-900/80 px-3 py-1.5 rounded-lg border border-slate-800 text-slate-300">
                <div className="w-6 h-6 rounded-full bg-court/20 text-court flex items-center justify-center font-bold text-xs">
                  {user?.full_name ? user.full_name.charAt(0).toUpperCase() : <User className="h-3.5 w-3.5" />}
                </div>
                <span className="font-medium hidden sm:inline">{user?.full_name || 'Tài khoản'}</span>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-950/30 rounded-lg transition-colors border border-transparent hover:border-red-900/50"
                title="Đăng xuất"
              >
                <LogOut className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-3">
              <Link
                to="/login"
                className="text-sm font-medium text-slate-300 hover:text-white px-3 py-1.5 rounded-lg transition-colors"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="flex items-center gap-1.5 text-sm font-semibold bg-court hover:bg-emerald-400 text-slate-950 px-4 py-2 rounded-lg shadow-neon-court transition-all duration-200"
              >
                <Zap className="h-4 w-4 fill-slate-950" />
                <span>Bắt đầu ngay</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
