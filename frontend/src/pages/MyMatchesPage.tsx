import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { 
  Plus, 
  Video, 
  Calendar, 
  ArrowRight, 
  UploadCloud, 
  Sparkles, 
  Activity, 
  Layers,
  ChevronRight,
  Clock
} from 'lucide-react';
import apiClient from '../api/client';

interface MatchItem {
  id: number;
  title: string | null;
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  lowerPlayer: string;
  matchDate: string;
  status: 'DRAFT' | 'READY' | 'ANALYZING' | 'ANALYZED' | 'PUBLISHED' | string;
  createdAt: string;
}

export const MyMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<MatchItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStatus, setSelectedStatus] = useState<string>('ALL');
  const [error, setError] = useState<string | null>(null);

  const fetchMatches = async (statusFilter?: string) => {
    try {
      setLoading(true);
      setError(null);
      const params: Record<string, string | number> = { page: 0, size: 20 };
      if (statusFilter && statusFilter !== 'ALL') {
        params.status = statusFilter;
      }
      const res = await apiClient.get('/matches', { params });
      setMatches(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Không thể tải danh sách trận đấu.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMatches(selectedStatus);
  }, [selectedStatus]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'DRAFT':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-500/15 border border-amber-500/30 text-amber-300">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-400" />
            Bản nháp (Chưa có Video)
          </span>
        );
      case 'READY':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-brand/15 border border-brand/30 text-sky-300 shadow-glow-blue/40">
            <span className="w-1.5 h-1.5 rounded-full bg-brand" />
            Video sẵn sàng
          </span>
        );
      case 'ANALYZING':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-purple-500/15 border border-purple-500/30 text-purple-300 animate-pulse">
            <Sparkles className="w-3 h-3 text-purple-400" />
            Đang phân tích AI
          </span>
        );
      case 'ANALYZED':
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 shadow-glow-green/30">
            <Activity className="w-3 h-3 text-emerald-400" />
            Đã phân tích xong
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-slate-800 border border-slate-700 text-slate-300">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="space-y-8 pb-16 pt-2">
      {/* 1. Header Section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-6 sm:p-8 rounded-3xl bg-gradient-to-r from-card-bg via-[#162744] to-card-bg border border-white/10 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-80 h-80 bg-brand/10 rounded-full blur-3xl pointer-events-none" />

        <div className="space-y-2 z-10">
          <div className="inline-flex items-center space-x-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-medium text-sky-300">
            <Layers className="h-3.5 w-3.5 text-brand" />
            <span>Badminton Analytics Hub</span>
          </div>
          <h1 className="font-heading text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
            Trận đấu của tôi
          </h1>
          <p className="text-slate-300 text-sm max-w-xl">
            Quản lý kho dữ liệu trận đấu, theo dõi tiến độ tải lên video MinIO và mở báo cáo phân tích chiến thuật chi tiết.
          </p>
        </div>

        <div className="z-10 flex items-center gap-3">
          <Link
            to="/matches/create"
            className="inline-flex items-center space-x-2 px-5 py-3 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-full shadow-glow-blue transition-all duration-200"
          >
            <Plus className="h-4 w-4" />
            <span>Tạo trận đấu mới</span>
          </Link>
        </div>
      </div>

      {/* 2. Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-none">
        <div className="flex items-center gap-1.5 bg-card-bg/80 border border-white/10 p-1 rounded-2xl backdrop-blur-md">
          {[
            { id: 'ALL', label: 'Tất cả' },
            { id: 'DRAFT', label: 'Chờ Upload (DRAFT)' },
            { id: 'READY', label: 'Sẵn sàng (READY)' },
            { id: 'ANALYZING', label: 'Đang xử lý (ANALYZING)' },
            { id: 'ANALYZED', label: 'Đã hoàn tất (ANALYZED)' },
          ].map((tab) => (
            <button
              key={tab.id}
              onClick={() => setSelectedStatus(tab.id)}
              className={`px-4 py-2 rounded-xl text-xs font-medium transition-all ${
                selectedStatus === tab.id
                  ? 'bg-brand text-white shadow-glow-blue'
                  : 'text-slate-300 hover:text-white hover:bg-white/5'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* 3. Error state */}
      {error && (
        <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-sm">
          {error}
        </div>
      )}

      {/* 4. Match List Grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {[1, 2, 3, 4].map((n) => (
            <div key={n} className="h-48 rounded-2xl bg-card-bg/40 border border-white/5 animate-pulse" />
          ))}
        </div>
      ) : matches.length === 0 ? (
        /* Empty State */
        <div className="p-12 sm:p-16 rounded-3xl bg-card-bg/60 border border-white/10 text-center space-y-5 max-w-xl mx-auto shadow-xl">
          <div className="w-16 h-16 rounded-3xl bg-brand/10 border border-brand/20 flex items-center justify-center mx-auto text-brand">
            <Video className="w-8 h-8" />
          </div>
          <div className="space-y-1.5">
            <h3 className="font-heading text-lg font-bold text-white">Chưa có trận đấu nào</h3>
            <p className="text-slate-400 text-xs sm:text-sm">
              Bạn chưa tạo trận đấu nào {selectedStatus !== 'ALL' ? 'ở trạng thái này' : ''}. Hãy khởi tạo trận đấu để bắt đầu phân tích kỹ thuật!
            </p>
          </div>
          <Link
            to="/matches/create"
            className="inline-flex items-center space-x-2 px-6 py-3 bg-brand hover:bg-brand-hover text-white font-semibold text-sm rounded-full shadow-glow-blue transition-all"
          >
            <Plus className="h-4 w-4" />
            <span>Khởi tạo trận đấu đầu tiên</span>
          </Link>
        </div>
      ) : (
        /* Matches Bento Grid */
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          {matches.map((match) => (
            <div
              key={match.id}
              className="p-6 rounded-3xl bg-card-bg border border-white/10 hover:border-brand/40 hover:shadow-glow-blue/20 transition-all duration-300 space-y-5 relative group"
            >
              {/* Card Top: Match Title & Status */}
              <div className="flex items-start justify-between gap-3">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono text-brand font-bold">#{match.id}</span>
                    <span className="text-xs text-slate-400 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {match.matchDate}
                    </span>
                  </div>
                  <h3 className="font-heading text-lg font-bold text-white group-hover:text-sky-300 transition-colors">
                    {match.title || `Trận đấu #${match.id}`}
                  </h3>
                </div>
                {getStatusBadge(match.status)}
              </div>

              {/* Court Matchup Preview */}
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-white/5 flex items-center justify-between text-sm">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs">
                    {match.upperPlayer === 'PLAYER_A' ? 'A' : 'B'}
                  </div>
                  <div>
                    <div className="text-[11px] text-slate-400">Sân trên (Top Court)</div>
                    <div className="font-semibold text-white text-xs sm:text-sm">
                      {match.upperPlayer === 'PLAYER_A' ? match.playerAName : match.playerBName}
                    </div>
                  </div>
                </div>

                <div className="px-2.5 py-1 rounded-full bg-white/5 text-[11px] font-bold text-slate-400">
                  VS
                </div>

                <div className="flex items-center gap-2.5 text-right">
                  <div>
                    <div className="text-[11px] text-slate-400">Sân dưới (Bottom Court)</div>
                    <div className="font-semibold text-white text-xs sm:text-sm">
                      {match.lowerPlayer === 'PLAYER_A' ? match.playerAName : match.playerBName}
                    </div>
                  </div>
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold text-xs">
                    {match.lowerPlayer === 'PLAYER_A' ? 'A' : 'B'}
                  </div>
                </div>
              </div>

              {/* Card Bottom Actions */}
              <div className="pt-2 border-t border-white/5 flex items-center justify-between">
                <div className="text-xs text-slate-400 flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Tạo lúc: {new Date(match.createdAt).toLocaleDateString('vi-VN')}</span>
                </div>

                <div className="flex items-center gap-2">
                  {match.status === 'DRAFT' && (
                    <Link
                      to={`/matches/${match.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-brand hover:bg-brand-hover text-white shadow-glow-blue transition-all"
                    >
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Upload Video</span>
                    </Link>
                  )}

                  {match.status === 'READY' && (
                    <Link
                      to={`/matches/${match.id}`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white border border-white/15 transition-all"
                    >
                      <Video className="w-3.5 h-3.5 text-sky-400" />
                      <span>Xem Video & Phân tích</span>
                      <ChevronRight className="w-3.5 h-3.5" />
                    </Link>
                  )}

                  {match.status === 'ANALYZED' && (
                    <Link
                      to={`/public-matches/${match.id}/replay`}
                      className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-emerald-600 hover:bg-emerald-500 text-white shadow-glow-green transition-all"
                    >
                      <Activity className="w-3.5 h-3.5" />
                      <span>Xem Replay</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
