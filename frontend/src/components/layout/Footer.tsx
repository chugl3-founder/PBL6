import React from 'react';
import { Activity } from 'lucide-react';
import { Link } from 'react-router-dom';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-white/10 mt-auto py-12 text-white/50 bg-[#03070a]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-6">
          <div className="flex items-center space-x-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand flex items-center justify-center text-white">
              <Activity className="h-4 w-4" />
            </div>
            <span className="font-heading font-bold text-white text-base">
              Badminton<span className="text-brand">AI</span> Pro+
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-6 text-sm">
            <Link to="/" className="hover:text-white transition-colors">Platform</Link>
            <Link to="/#public-library" className="hover:text-white transition-colors">Match Analysis</Link>
            <Link to="/login" className="hover:text-white transition-colors">Sign in</Link>
            <Link to="/register" className="hover:text-white transition-colors">Create account</Link>
          </div>
        </div>

        <div className="pt-6 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-white/40">
          <p>© 2026 BadmintonAI Platform. PBL6 - Trường Đại học Bách Khoa, Đại học Đà Nẵng.</p>
          <p>Federation-grade match intelligence & computer vision telemetry.</p>
        </div>
      </div>
    </footer>
  );
};
