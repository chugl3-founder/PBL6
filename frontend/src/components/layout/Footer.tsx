import React from 'react';
import { Link } from 'react-router-dom';
import { BrandLogo } from '../brand/BrandLogo';
import { isSignedIn } from '../../auth/session';

/** The landing page's ending, a shade below the closing band's mat so the two read as one. */
export const Footer: React.FC = () => {
  return (
    <footer className="mt-auto bg-[#0A2A1D] text-sm text-white/60 font-vn">
      <div className="max-w-[1440px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto py-8 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex flex-col sm:flex-row sm:items-center gap-x-4 gap-y-2">
            <BrandLogo />
            <span>PBL6, Trường Đại học Bách Khoa, Đại học Đà Nẵng</span>
          </div>
          <nav className="flex flex-wrap items-center gap-x-6 gap-y-2" aria-label="Liên kết cuối trang">
            <Link to="/public-matches" className="hover:text-white transition-colors">Thư viện trận</Link>
            <Link to="/players" className="hover:text-white transition-colors">Vận động viên</Link>
            {!isSignedIn() && (
              <>
                <Link to="/login" className="hover:text-white transition-colors">Đăng nhập</Link>
                <Link to="/register" className="hover:text-white transition-colors">Đăng ký</Link>
              </>
            )}
          </nav>
        </div>
      </div>
    </footer>
  );
};
