import React, { useState } from 'react';
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  Video,
  Users,
  Cpu,
  Shield,
  LogOut,
  ArrowLeft,
  Menu,
  X,
  Activity,
} from 'lucide-react';
import apiClient from '../../api/client';

export const AdminLayout: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const userJson = localStorage.getItem('user_info');
  const user = userJson ? JSON.parse(userJson) : null;

  const navItems = [
    {
      path: '/admin',
      exact: true,
      label: 'Tổng quan & Thống kê',
      desc: 'Biểu đồ & chỉ số hệ thống (VS-19)',
      icon: LayoutDashboard,
    },
    {
      path: '/admin/matches',
      exact: false,
      label: 'Quản lý Trận đấu',
      desc: 'Kiểm duyệt & Thùng rác (VS-16)',
      icon: Video,
    },
    {
      path: '/admin/users',
      exact: false,
      label: 'Quản lý Người dùng',
      desc: 'Tài khoản & Khóa/Mở khóa (VS-17)',
      icon: Users,
    },
    {
      path: '/admin/ai-monitor',
      exact: false,
      label: 'Giám sát Worker AI',
      desc: 'Tiến trình & Retry khẩn cấp (VS-18)',
      icon: Cpu,
    },
  ];

  const isItemActive = (item: typeof navItems[0]) => {
    if (item.exact) {
      return location.pathname === '/admin' || location.pathname === '/admin/';
    }
    return location.pathname.startsWith(item.path);
  };

  const currentNav = navItems.find(isItemActive) || navItems[0];

  const handleLogout = async () => {
    const refreshToken = localStorage.getItem('refresh_token');
    try {
      if (refreshToken) {
        await apiClient.post('/auth/logout', { refreshToken });
      }
    } catch {
      // ignore
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user_info');
      navigate('/login');
    }
  };

  return (
    <div className="min-h-screen bg-[#070e1b] text-white flex overflow-x-hidden">
      {/* SIDEBAR TRÁI CỐ ĐỊNH TRÊN DESKTOP */}
      <aside className="hidden lg:flex lg:flex-col lg:w-72 lg:fixed lg:inset-y-0 bg-[#0b1528] border-r border-white/10 z-40 select-none">
        {/* Brand Header Admin */}
        <div className="h-16 px-6 flex items-center justify-between border-b border-white/10">
          <Link to="/admin" className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-600 to-brand flex items-center justify-center text-white shadow-lg">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <div className="font-heading font-black text-base tracking-tight text-white flex items-center gap-1.5">
                <span>Badminton</span>
                <span className="text-sky-400">Admin</span>
              </div>
              <div className="text-[10px] text-purple-300 font-semibold uppercase tracking-wider">
                Control Center
              </div>
            </div>
          </Link>
        </div>

        {/* Danh mục điều hướng chính */}
        <div className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
          <div className="px-3 pb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400">
            Phân Hệ Quản Trị
          </div>
          {navItems.map((item) => {
            const Icon = item.icon;
            const active = isItemActive(item);
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-start gap-3.5 px-4 py-3.5 rounded-2xl transition-all ${
                  active
                    ? 'bg-gradient-to-r from-brand/25 to-purple-600/20 border border-brand/40 text-white shadow-glow-blue'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <div
                  className={`p-2 rounded-xl mt-0.5 shrink-0 ${
                    active
                      ? 'bg-brand text-white shadow-md'
                      : 'bg-white/5 text-slate-400'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-xs font-bold truncate">{item.label}</div>
                  <div className="text-[11px] text-slate-400 truncate mt-0.5">
                    {item.desc}
                  </div>
                </div>
              </Link>
            );
          })}
        </div>

        {/* Footer Sidebar: Chuyển về Client & Thông tin Admin */}
        <div className="p-4 border-t border-white/10 space-y-3 bg-[#081020]">
          <Link
            to="/"
            className="w-full px-4 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-sky-300 hover:text-white flex items-center justify-center gap-2 transition"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Quay về Giao diện Người dùng</span>
          </Link>

          <div className="flex items-center justify-between px-2 pt-1">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-purple-500/20 border border-purple-500/40 text-purple-300 flex items-center justify-center font-bold text-xs shrink-0">
                {(user?.fullName || user?.email || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  {user?.fullName || 'Quản trị viên'}
                </div>
                <div className="text-[10px] text-slate-400 truncate">
                  {user?.email || 'admin@badminton.vn'}
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* DRAWER MENU TRÊN MOBILE */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-72 max-w-[85vw] bg-[#0b1528] border-r border-white/15 flex flex-col z-10">
            <div className="h-16 px-5 flex items-center justify-between border-b border-white/10">
              <div className="flex items-center gap-2.5">
                <Shield className="w-5 h-5 text-purple-400" />
                <span className="font-bold text-sm text-white">Badminton Admin</span>
              </div>
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="flex-1 p-4 space-y-2 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const active = isItemActive(item);
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-bold ${
                      active
                        ? 'bg-brand text-white'
                        : 'text-slate-300 hover:bg-white/5'
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="p-4 border-t border-white/10">
              <Link
                to="/"
                className="w-full py-2.5 rounded-xl bg-white/5 text-xs font-semibold text-sky-300 flex items-center justify-center gap-2"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Về trang chủ Client</span>
              </Link>
            </div>
          </div>
        </div>
      )}

      {/* KHU VỰC NỘI DUNG CHÍNH BÊN PHẢI */}
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0">
        {/* Topbar riêng của Admin */}
        <header className="sticky top-0 z-30 h-16 bg-[#070e1b]/90 backdrop-blur-xl border-b border-white/10 px-4 sm:px-8 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 rounded-xl bg-white/5 border border-white/10 text-slate-300 hover:text-white"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="min-w-0">
              <h1 className="text-sm sm:text-base font-extrabold text-white truncate">
                {currentNav.label}
              </h1>
              <p className="text-[11px] text-slate-400 truncate hidden sm:block">
                {currentNav.desc}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <span className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/25 text-emerald-400 text-xs font-semibold">
              <Activity className="w-3.5 h-3.5" />
              <span>Hệ thống trực tuyến</span>
            </span>
            <Link
              to="/"
              className="px-3.5 py-1.5 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-slate-200 hover:text-white transition flex items-center gap-1.5"
            >
              <ArrowLeft className="w-3.5 h-3.5 text-sky-400" />
              <span className="hidden sm:inline">Giao diện Client</span>
            </Link>
          </div>
        </header>

        {/* Main Workspace không bị tràn */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-[1440px] w-full mx-auto min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  );
};

