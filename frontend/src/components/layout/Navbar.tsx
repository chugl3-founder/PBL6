import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Activity, LogOut, Video, Shield } from 'lucide-react';

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
    <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Logo */}
        <Link to="/" className="flex items-center space-x-2 text-emerald-600 font-bold text-xl tracking-tight">
          <Activity className="h-6 w-6 text-emerald-600" />
          <span>Badminton<span className="text-slate-800">AI</span></span>
        </Link>

        {/* Navigation Links */}
        <nav className="flex items-center space-x-6 text-sm font-medium text-slate-600">
          <Link to="/" className="hover:text-emerald-600 transition">
            Thư viện công khai
          </Link>
          
          {token && (
            <Link to="/my-matches" className="flex items-center space-x-1 hover:text-emerald-600 transition">
              <Video className="h-4 w-4" />
              <span>Trận đấu của tôi</span>
            </Link>
          )}

          {isAdmin && (
            <Link to="/admin" className="flex items-center space-x-1 text-purple-600 hover:text-purple-700 transition">
              <Shield className="h-4 w-4" />
              <span>Quản trị (Admin)</span>
            </Link>
          )}
        </nav>

        {/* User Account / Auth Actions */}
        <div className="flex items-center space-x-3">
          {token ? (
            <div className="flex items-center space-x-3">
              <Link to="/profile" className="flex items-center space-x-2 text-slate-700 hover:text-emerald-600">
                <div className="w-8 h-8 rounded-full bg-emerald-100 text-emerald-700 flex items-center justify-center font-semibold text-xs">
                  {user?.fullName?.charAt(0) || 'U'}
                </div>
                <span className="text-sm font-medium hidden sm:inline">{user?.fullName || 'Người dùng'}</span>
              </Link>
              <button
                onClick={handleLogout}
                className="p-1.5 text-slate-400 hover:text-rose-600 transition"
                title="Đăng xuất"
              >
                <LogOut className="h-5 w-5" />
              </button>
            </div>
          ) : (
            <div className="flex items-center space-x-2">
              <Link
                to="/login"
                className="px-3 py-1.5 text-sm font-medium text-slate-700 hover:text-emerald-600 transition"
              >
                Đăng nhập
              </Link>
              <Link
                to="/register"
                className="px-3.5 py-1.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm transition"
              >
                Đăng ký
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

