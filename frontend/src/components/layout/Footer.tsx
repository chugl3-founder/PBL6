import React from 'react';
import { Activity } from 'lucide-react';

export const Footer: React.FC = () => {
  return (
    <footer className="glass-panel border-t border-slate-800/80 mt-auto py-8 text-slate-400">
      <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4 text-sm">
        <div className="flex items-center space-x-2">
          <Activity className="h-4 w-4 text-court" />
          <span className="text-white font-semibold">BadmintonAI Pro</span>
          <span className="text-slate-600">|</span>
          <span className="text-xs text-slate-400">Đại học Bách Khoa - ĐH Đà Nẵng</span>
        </div>
        <p className="text-xs text-slate-500">
          © 2026 PBL6 Badminton Match Analysis Platform. All rights reserved.
        </p>
      </div>
    </footer>
  );
};
