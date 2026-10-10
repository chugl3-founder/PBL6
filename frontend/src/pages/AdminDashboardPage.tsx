import React, { useState, useEffect } from 'react';
import { Users, Video, Cpu, Globe, EyeOff, Loader2, CheckCircle2, ExternalLink } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

export const AdminDashboardPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('ALL');
  const [actionLoadingId, setActionLoadingId] = useState<number | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetchMatches(filterStatus);
  }, [filterStatus]);

  const fetchMatches = async (status: string) => {
    try {
      setLoading(true);
      const url = status === 'ALL'
        ? `/admin/matches?page=0&size=50`
        : `/admin/matches?status=${status}&page=0&size=50`;
      const res = await apiClient.get(url);
      setMatches(res.data.data || []);
    } catch (err: any) {
      console.error('Lỗi khi tải danh sách trận đấu cho Admin:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleTogglePublish = async (matchId: number, currentStatus: string) => {
    try {
      setActionLoadingId(matchId);
      setFeedbackMsg(null);
      if (currentStatus === 'PUBLISHED') {
        const res = await apiClient.post(`/admin/matches/${matchId}/unpublish`);
        setMatches(prev => prev.map(m => m.id === matchId ? res.data : m));
        setFeedbackMsg({ type: 'success', text: `Đã hủy công khai trận đấu #${matchId}` });
      } else {
        const res = await apiClient.post(`/admin/matches/${matchId}/publish`);
        setMatches(prev => prev.map(m => m.id === matchId ? res.data : m));
        setFeedbackMsg({ type: 'success', text: `Đã xuất bản trận đấu #${matchId} vào Thư viện công khai` });
      }
    } catch (err: any) {
      console.error('Lỗi khi đổi trạng thái xuất bản:', err);
      setFeedbackMsg({
        type: 'error',
        text: err.response?.data?.message || 'Không thể cập nhật trạng thái trận đấu.'
      });
    } finally {
      setActionLoadingId(null);
      setTimeout(() => setFeedbackMsg(null), 4000);
    }
  };

  const publishedCount = matches.filter(m => m.status === 'PUBLISHED').length;

  return (
    <div className="space-y-8 pb-16">
      {/* Page Title */}
      <div className="pb-4 border-b border-white/10">
        <h1 className="text-2xl font-black text-white tracking-tight">Quản Trị Hệ Thống (Admin Console)</h1>
        <p className="text-sm text-slate-300 mt-1">Giám sát tài nguyên hệ thống, duyệt và quản lý Thư viện trận đấu công khai (VS-14)</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng số người dùng', val: '128', icon: Users, color: 'text-sky-400 bg-sky-500/10 border-sky-500/20' },
          { label: 'Tổng số trận đấu', val: matches.length || '4', icon: Video, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
          { label: 'Trận đấu Công khai', val: publishedCount, icon: Globe, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' },
          { label: 'Worker AI Đang chạy', val: 'Idle (Ready)', icon: Cpu, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-[#122340]/60 p-5 border border-white/10 rounded-2xl shadow-lg flex items-center space-x-4">
              <div className={`p-3 rounded-xl border ${item.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                <p className="text-2xl font-bold text-white tracking-tight">{item.val}</p>
              </div>
            </div>
          );
        })}
      </div>

      {/* Feedback Toast */}
      {feedbackMsg && (
        <div className={`p-4 rounded-2xl border text-sm font-medium flex items-center gap-2.5 transition-all ${
          feedbackMsg.type === 'success' 
            ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-300' 
            : 'bg-rose-500/15 border-rose-500/30 text-rose-300'
        }`}>
          <CheckCircle2 className="w-5 h-5 flex-shrink-0" />
          <span>{feedbackMsg.text}</span>
        </div>
      )}

      {/* Match Curation Section (VS-14) */}
      <section className="bg-[#0f1d35]/80 border border-white/10 rounded-3xl p-6 sm:p-8 space-y-6 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-white/10 pb-5">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
              <Globe className="w-5 h-5 text-sky-400" />
              <span>Quản Lý Thư Viện Trận Đấu Công Khai</span>
            </h2>
            <p className="text-xs sm:text-sm text-slate-400 mt-0.5">
              Duyệt, xuất bản hoặc gỡ các trận đấu hiển thị trên Thư viện công khai trang chủ
            </p>
          </div>

          {/* Filter Pills */}
          <div className="flex flex-wrap items-center gap-2 text-xs">
            {['ALL', 'PUBLISHED', 'COMPLETED', 'PROCESSING'].map((status) => (
              <button
                key={status}
                onClick={() => setFilterStatus(status)}
                className={`px-3 py-1.5 rounded-full font-semibold transition-all ${
                  filterStatus === status
                    ? 'bg-brand text-white shadow-glow-blue'
                    : 'bg-white/5 hover:bg-white/10 text-white/70 border border-white/10'
                }`}
              >
                {status === 'ALL' ? 'Tất cả' : status}
              </button>
            ))}
          </div>
        </div>

        {/* Loading */}
        {loading && (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-7 h-7 text-sky-400 animate-spin" />
            <span className="text-xs text-slate-400">Đang tải danh sách trận đấu...</span>
          </div>
        )}

        {/* Empty */}
        {!loading && matches.length === 0 && (
          <div className="py-12 text-center text-slate-400 text-sm">
            Không tìm thấy trận đấu nào với bộ lọc hiện tại.
          </div>
        )}

        {/* Matches Table */}
        {!loading && matches.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="pb-3 px-3">Trận Đấu</th>
                  <th className="pb-3 px-3">Nguồn Video</th>
                  <th className="pb-3 px-3">Thời Lượng / Cú Đánh</th>
                  <th className="pb-3 px-3">Trạng Thái</th>
                  <th className="pb-3 px-3 text-right">Hành Động</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {matches.map((item) => {
                  const isPublished = item.status === 'PUBLISHED';
                  const isOperating = actionLoadingId === item.id;
                  return (
                    <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                      {/* Trận Đấu */}
                      <td className="py-4 px-3 max-w-xs">
                        <div className="font-bold text-white text-sm line-clamp-1">
                          {item.title || `${item.playerAName} vs ${item.playerBName}`}
                        </div>
                        <div className="text-slate-400 text-xs mt-0.5">
                          {item.playerAName} <span className="text-white/40">vs</span> {item.playerBName}
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          ID: #{item.id} • {item.courtName || 'Tournament'}
                        </div>
                      </td>

                      {/* Nguồn Video */}
                      <td className="py-4 px-3">
                        {item.youtubeVideoId ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 font-medium">
                            <span>YouTube Embed</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 font-medium">
                            <span>MinIO S3</span>
                          </span>
                        )}
                      </td>

                      {/* Thời Lượng / Cú Đánh */}
                      <td className="py-4 px-3 text-slate-300">
                        <div>{item.durationSeconds ? `${Math.floor(item.durationSeconds / 60)} phút` : 'N/A'}</div>
                        <div className="text-[11px] text-slate-500">
                          {item.totalRallies || 0} rallies • {item.totalStrokes || 0} strokes
                        </div>
                      </td>

                      {/* Trạng Thái */}
                      <td className="py-4 px-3">
                        {isPublished ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 font-bold">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                            <span>PUBLISHED (Công khai)</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-slate-700/50 border border-white/10 text-slate-300">
                            <span>{item.status}</span>
                          </span>
                        )}
                      </td>

                      {/* Hành Động */}
                      <td className="py-4 px-3 text-right">
                        <div className="inline-flex items-center gap-2">
                          {/* Replay preview link */}
                          <Link
                            to={isPublished ? `/public-matches/${item.id}/replay` : `/matches/${item.id}/replay`}
                            target="_blank"
                            className="p-2 rounded-xl bg-white/5 hover:bg-white/10 text-white/80 hover:text-white transition-colors border border-white/10"
                            title="Mở xem phát lại"
                          >
                            <ExternalLink className="w-4 h-4" />
                          </Link>

                          {/* Toggle Publish button */}
                          <button
                            type="button"
                            disabled={isOperating}
                            onClick={() => handleTogglePublish(item.id, item.status)}
                            className={`px-3.5 py-1.5 rounded-xl font-bold transition-all flex items-center gap-1.5 ${
                              isPublished
                                ? 'bg-rose-500/15 hover:bg-rose-500/25 text-rose-300 border border-rose-500/30'
                                : 'bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/40 shadow-glow-blue'
                            }`}
                          >
                            {isOperating ? (
                              <Loader2 className="w-3.5 h-3.5 animate-spin" />
                            ) : isPublished ? (
                              <>
                                <EyeOff className="w-3.5 h-3.5" />
                                <span>Gỡ công khai</span>
                              </>
                            ) : (
                              <>
                                <Globe className="w-3.5 h-3.5" />
                                <span>Xuất bản</span>
                              </>
                            )}
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
};
