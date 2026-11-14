import React from 'react';
import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto border-t border-ink/10 bg-sheet py-8 text-sm text-ink/70 font-vn">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded bg-pitch flex items-center justify-center text-white">
            <Activity className="h-3.5 w-3.5" />
          </div>
          <span className="font-semibold text-ink">BadmintonAI</span>
          <span className="text-ink/65">PBL6, Trường Đại học Bách Khoa, Đại học Đà Nẵng</span>
        </div>
        <nav className="flex flex-wrap items-center gap-5">
          <Link to="/" className="hover:text-ink transition-colors">Trang chủ</Link>
          <Link to="/public-matches" className="hover:text-ink transition-colors">Thư viện công khai</Link>
          {!localStorage.getItem('access_token') && (
            <>
              <Link to="/login" className="hover:text-ink transition-colors">Đăng nhập</Link>
              <Link to="/register" className="hover:text-ink transition-colors">Đăng ký</Link>
            </>
          )}
        </nav>
      </div>
    </footer>
  );
};
