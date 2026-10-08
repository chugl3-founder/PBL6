import React from 'react';

export const Footer: React.FC = () => {
  return (
    <footer className="bg-white border-t border-slate-200 mt-auto py-6">
      <div className="max-w-7xl mx-auto px-4 text-center text-sm text-slate-500">
        <p>© 2026 PBL6 Badminton Match Analysis Platform. Đại học Bách Khoa - ĐH Đà Nẵng.</p>
        <p className="mt-1 text-xs text-slate-400">
          Nền tảng phân tích video cầu lông & hỗ trợ Replay trận đấu thông minh.
        </p>
      </div>
    </footer>
  );
};

