import React, { useState, useEffect } from 'react';
import { Play, Search, Video, ArrowRight, Globe, Sparkles, Clock, Trophy, Zap, Loader2, LogIn } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

export const PublicMatchesPage: React.FC = () => {
  const [matches, setMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const isLoggedIn = Boolean(localStorage.getItem('access_token'));

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMatches(search);
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const fetchMatches = async (keyword: string) => {
    try {
      setLoading(true);
      const url = keyword.trim()
        ? `/public-matches?page=0&size=24&search=${encodeURIComponent(keyword.trim())}`
        : `/public-matches?page=0&size=24`;
      const res = await apiClient.get(url);
      setMatches(res.data.data || []);
    } catch (err) {
      console.error('Lỗi khi tải danh sách trận đấu công khai:', err);
    } finally {
      setLoading(false);
    }
  };

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '45:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const totalRalliesCount = matches.reduce((sum, m) => sum + (m.totalRallies || 0), 0);
  const totalStrokesCount = matches.reduce((sum, m) => sum + (m.totalStrokes || 0), 0);

  return (
    <div className="space-y-10 pb-20 pt-4">
      {/* 1. HEADER BANNER THƯ VIỆN TRẬN ĐẤU CÔNG KHAI */}
      <section className="relative rounded-3xl overflow-hidden border border-white/15 bg-gradient-to-br from-[#122340] via-[#0f1d35] to-[#0a1324] p-8 sm:p-10 lg:p-12 shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-30 mix-blend-screen pointer-events-none"
          style={{ backgroundImage: `url('/images/arena-court-blue.jpg')` }}
        />
        <div className="absolute -top-24 right-10 w-[500px] h-[500px] bg-brand/25 rounded-full blur-[130px] pointer-events-none" />

        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-8">
          <div className="max-w-2xl space-y-4">
            <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-sky-300 text-xs font-semibold tracking-wide">
              <Globe className="w-3.5 h-3.5 text-brand" />
              <span>KHO DỮ LIỆU GIẢI ĐẤU CẦU LÔNG AI</span>
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl font-extrabold text-white tracking-tight leading-tight">
              Thư Viện Trận Đấu Công Khai
            </h1>

            <p className="text-slate-200 text-sm sm:text-base leading-relaxed">
              Khám phá các trận đấu giải quốc tế đã được phân tích sẵn bằng trí tuệ nhân tạo. Theo dõi trực quan từng cú đánh, vận tốc cầu, sơ đồ sân 2D và thống kê chiến thuật theo thời gian thực.
            </p>
          </div>

          {/* Thống kê tổng quan thư viện */}
          <div className="grid grid-cols-3 gap-3 sm:gap-4 shrink-0">
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center text-sky-400 mb-1">
                <Video className="w-4 h-4" />
              </div>
              <div className="font-heading text-xl sm:text-2xl font-black text-white">{matches.length}</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Trận đấu</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center text-amber-400 mb-1">
                <Trophy className="w-4 h-4" />
              </div>
              <div className="font-heading text-xl sm:text-2xl font-black text-white">{totalRalliesCount}</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Pha cầu</div>
            </div>
            <div className="bg-white/5 backdrop-blur-md border border-white/10 rounded-2xl p-4 text-center">
              <div className="flex items-center justify-center text-emerald-400 mb-1">
                <Zap className="w-4 h-4" />
              </div>
              <div className="font-heading text-xl sm:text-2xl font-black text-sky-400">{totalStrokesCount}</div>
              <div className="text-[11px] text-slate-300 mt-0.5">Cú đánh AI</div>
            </div>
          </div>
        </div>

        {/* Thông báo chế độ xem thử cho Khách vãng lai */}
        {!isLoggedIn && (
          <div className="relative z-10 mt-6 pt-5 border-t border-white/10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-2.5 text-xs sm:text-sm text-amber-200">
              <Clock className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>Chế độ Khách vãng lai:</strong> Bạn được xem trước miễn phí <strong>5 phút (300 giây)</strong> đầu tiên mỗi trận đấu. Đăng nhập để mở khóa toàn bộ thời lượng!
              </span>
            </div>
            <Link
              to="/login"
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 rounded-full bg-brand hover:bg-brand-hover text-white text-xs font-bold shadow-glow-blue transition shrink-0"
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập ngay</span>
            </Link>
          </div>
        )}
      </section>

      {/* 2. THANH TÌM KIẾM & BỘ LỌC */}
      <section className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-white">
          <Sparkles className="w-5 h-5 text-brand" />
          <h2 className="font-heading text-lg sm:text-xl font-bold">
            Danh Sách Trận Đấu Đã Phân Tích ({matches.length})
          </h2>
        </div>

        <div className="relative w-full sm:w-96">
          <Search className="absolute left-4 top-3 h-4 w-4 text-white/50" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Tìm theo tên vận động viên, giải đấu..."
            className="w-full pl-11 pr-9 py-2.5 bg-[#14233c] border border-white/15 rounded-full text-sm text-white placeholder-white/40 focus:outline-none focus:border-brand focus:ring-1 focus:ring-brand transition shadow-inner"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch('')}
              className="absolute right-3.5 top-2.5 text-white/40 hover:text-white text-base leading-none"
              title="Xóa từ khóa"
            >
              ×
            </button>
          )}
        </div>
      </section>

      {/* 3. DANH SÁCH THẺ TRẬN ĐẤU */}
      {loading ? (
        <div className="py-24 flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-9 h-9 text-sky-400 animate-spin" />
          <span className="text-sm text-slate-300 font-medium">Đang tải thư viện trận đấu công khai...</span>
        </div>
      ) : matches.length === 0 ? (
        <div className="py-16 text-center border border-white/10 rounded-3xl bg-[#0f1d35]/60 p-8 space-y-3">
          <Video className="w-12 h-12 text-white/30 mx-auto" />
          <h3 className="text-base font-bold text-white">Không tìm thấy trận đấu nào</h3>
          <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
            {search
              ? `Không có trận đấu nào khớp với từ khóa "${search}". Vui lòng thử lại với tên vận động viên hoặc giải đấu khác.`
              : 'Hiện chưa có trận đấu nào được xuất bản trong thư viện công khai.'}
          </p>
          {search && (
            <button
              onClick={() => setSearch('')}
              className="px-4 py-2 rounded-full bg-white/10 hover:bg-white/15 text-xs text-sky-400 font-semibold transition mt-2"
            >
              Hiển thị tất cả trận đấu
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {matches.map((item) => (
            <div
              key={item.id}
              className="card-light-blue overflow-hidden flex flex-col group transition-all duration-300 shadow-xl hover:border-sky-400/40"
            >
              {/* Thumbnail */}
              <div className="aspect-video bg-[#0b1424] flex items-center justify-center relative overflow-hidden">
                {item.thumbnailUrl ? (
                  <img
                    src={item.thumbnailUrl}
                    alt={item.title || 'Trận đấu cầu lông'}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  />
                ) : (
                  <Video className="h-10 w-10 text-white/30 group-hover:scale-110 transition-transform duration-300" />
                )}

                {/* Giải đấu / Sân */}
                <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/15 text-[11px] font-semibold text-white flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                  <span>{item.courtName || 'Giải Đấu Quốc Tế'}</span>
                </div>

                {/* Thời lượng */}
                <div className="absolute bottom-3 right-3 px-2.5 py-0.5 rounded-full bg-slate-950/85 backdrop-blur-sm font-mono text-xs text-white flex items-center gap-1">
                  <Clock className="w-3 h-3 text-sky-400" />
                  <span>{formatDuration(item.durationSeconds)}</span>
                </div>

                {/* Nút Play khi di chuột */}
                <Link
                  to={`/public-matches/${item.id}/replay`}
                  className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[2px]"
                >
                  <div className="w-12 h-12 rounded-full bg-brand text-white shadow-glow-blue flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                    <Play className="h-5 w-5 fill-white translate-x-0.5" />
                  </div>
                </Link>
              </div>

              {/* Nội dung thẻ */}
              <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                <div>
                  <Link to={`/public-matches/${item.id}/replay`}>
                    <h3 className="font-heading font-bold text-white text-base group-hover:text-sky-400 transition-colors line-clamp-2">
                      {item.title || `${item.playerAName} vs ${item.playerBName}`}
                    </h3>
                  </Link>
                  <div className="text-xs text-sky-400 font-medium mt-1.5 flex items-center gap-1.5">
                    <span>{item.playerAName}</span>
                    <span className="text-white/40 font-normal">đối đầu</span>
                    <span>{item.playerBName}</span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-200 pt-3 border-t border-white/10">
                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px]">Số pha cầu</span>
                    <span className="font-heading font-bold text-white text-sm">{item.totalRallies || 0} pha</span>
                  </div>
                  <div className="bg-white/10 p-2.5 rounded-xl border border-white/5">
                    <span className="text-slate-400 block text-[11px]">Cú đánh AI</span>
                    <span className="font-heading font-bold text-sky-400 text-sm">{item.totalStrokes || 0} cú đánh</span>
                  </div>
                </div>

                <Link
                  to={`/public-matches/${item.id}/replay`}
                  className="w-full py-2.5 rounded-full bg-white/10 hover:bg-brand text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10 shadow-sm"
                >
                  <span>Xem phân tích trận đấu</span>
                  <ArrowRight className="h-3.5 w-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

