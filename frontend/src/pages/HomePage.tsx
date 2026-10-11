import React, { useState, useEffect } from 'react';
import { Play, Video, ArrowRight, BarChart3, Crosshair, TrendingUp, Globe, Clock, Loader2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import apiClient from '../api/client';

export const HomePage: React.FC = () => {
  const [featuredMatches, setFeaturedMatches] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchFeatured = async () => {
      try {
        setLoading(true);
        const res = await apiClient.get('/public-matches?page=0&size=3');
        setFeaturedMatches(res.data.data || []);
      } catch (err) {
        console.error('Lỗi khi tải trận đấu tiêu biểu:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchFeatured();
  }, []);

  const formatDuration = (seconds?: number) => {
    if (!seconds) return '45:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  return (
    <div className="space-y-20 pb-20 pt-6">
      {/* 1. HERO SECTION */}
      <section className="relative min-h-[640px] rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-br from-[#122340] via-[#0f1d35] to-[#0c1626] flex flex-col justify-between p-8 sm:p-14 lg:p-16 shadow-2xl">
        <div
          className="absolute inset-0 bg-cover bg-center opacity-45 mix-blend-screen pointer-events-none brightness-110 contrast-105"
          style={{
            backgroundImage: `url('/images/arena-court-blue.jpg')`
          }}
        />

        <div className="absolute -top-32 right-10 w-[750px] h-[750px] bg-brand/30 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[600px] h-[600px] bg-sky-400/25 rounded-full blur-[120px] pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6 pt-4">
          {/* Badge */}
          <div className="inline-flex items-center space-x-2 px-3.5 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/20 text-white text-xs font-semibold tracking-wide shadow-sm">
            <span className="w-2 h-2 rounded-full bg-brand animate-ping" />
            <span>TRÍ TUỆ NHÂN TẠO & THỊ GIÁC MÁY TÍNH CHO CẦU LÔNG</span>
          </div>

          {/* Heading */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-6xl font-extrabold text-white tracking-tight leading-[1.15]">
            Phân tích hiệu suất & <br />
            chiến thuật đỉnh cao cho <br />
            <span className="tech-highlight-line mt-1.5 shadow-glow-blue">cầu lông hiện đại.</span>
          </h1>

          <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
            Nền tảng số hóa chuyên sâu dành cho mọi sân đấu, vận động viên và huấn luyện viên. Bóc tách tự động từng cú đánh, tốc độ cầu, vị trí di chuyển và thống kê đối đầu trực quan bằng AI.
          </p>

          {/* CTAs */}
          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/my-matches"
              className="rounded-full bg-brand hover:bg-brand-hover text-white font-semibold px-7 py-3.5 text-sm shadow-glow-blue transition-all duration-200 flex items-center gap-2"
            >
              <Video className="h-4 w-4" />
              <span>Bắt đầu phân tích trận đấu</span>
            </Link>
            <Link
              to="/public-matches"
              className="rounded-full bg-white/10 hover:bg-white/15 text-white font-semibold px-6 py-3.5 text-sm border border-white/20 backdrop-blur-md transition-all duration-200 flex items-center gap-2"
            >
              <Globe className="h-4 w-4 text-sky-400" />
              <span>Khám phá Thư viện công khai</span>
              <ArrowRight className="h-4 w-4 text-white/70" />
            </Link>
          </div>
        </div>

        {/* Hero Bottom Telemetry Strip */}
        <div className="relative z-10 pt-10 border-t border-white/15 grid grid-cols-2 sm:grid-cols-4 gap-6 text-sm">
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="font-heading text-2xl font-bold text-white tracking-tight">100%</div>
            <div className="text-slate-300 text-xs mt-0.5">Tự động cắt pha cầu (Rally)</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="font-heading text-2xl font-bold text-sky-400 tracking-tight">&lt; 200ms</div>
            <div className="text-slate-300 text-xs mt-0.5">Tốc độ điều phối tác vụ AI</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="font-heading text-2xl font-bold text-white tracking-tight">Sân 2D</div>
            <div className="text-slate-300 text-xs mt-0.5">Mô phỏng tọa độ & quỹ đạo cầu</div>
          </div>
          <div className="bg-white/5 backdrop-blur-sm p-3.5 rounded-2xl border border-white/10">
            <div className="font-heading text-2xl font-bold text-sky-400 tracking-tight">S3 Cloud</div>
            <div className="text-slate-300 text-xs mt-0.5">Tải lên trực tiếp video lớn</div>
          </div>
        </div>
      </section>

      {/* 2. FEATURE SPOTLIGHT */}
      <section className="space-y-8">
        <div className="text-center max-w-2xl mx-auto space-y-2">
          <h2 className="font-heading text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Công Cụ Chuyên Sâu Cho Vận Động Viên & Huấn Luyện Viên
          </h2>
          <p className="text-slate-300 text-sm">
            Mọi tính năng cần thiết để biến video ghi hình trận đấu thành dữ liệu phân tích kỹ chiến thuật chuẩn xác.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Card 1 */}
          <div className="card-light-blue p-8 space-y-4 flex flex-col justify-between group shadow-lg">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-sky-300">
                <Crosshair className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white">Nhận Diện Từng Cú Đánh</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Tự động phân loại các kỹ thuật Smash, Drop, Clear, Drive, Net Shot và đo lường vận tốc cầu kèm độ tin cậy AI.
              </p>
            </div>
            <Link
              to="/public-matches"
              className="pt-4 text-xs font-semibold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
            >
              <span>Xem dữ liệu mẫu</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 2 */}
          <div className="card-light-blue p-8 space-y-4 flex flex-col justify-between group shadow-lg">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-sky-300">
                <TrendingUp className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white">Sơ Đồ Sân 2D & Điểm Rơi</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Tái hiện trực quan vị trí đứng của hai tay vợt, hướng di chuyển và điểm rơi quả cầu trên mặt sân tiêu chuẩn theo thời gian thực.
              </p>
            </div>
            <Link
              to="/public-matches"
              className="pt-4 text-xs font-semibold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
            >
              <span>Khám phá sơ đồ 2D</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {/* Card 3 */}
          <div className="card-light-blue p-8 space-y-4 flex flex-col justify-between group shadow-lg">
            <div className="space-y-3">
              <div className="w-12 h-12 rounded-2xl bg-brand/20 border border-brand/40 flex items-center justify-center text-sky-300">
                <BarChart3 className="h-6 w-6" />
              </div>
              <h3 className="font-heading text-lg font-bold text-white">Pha Cầu & Thống Kê Đối Đầu</h3>
              <p className="text-slate-300 text-sm leading-relaxed">
                Nhảy nhanh đến bất kỳ đợt cầu (Rally) nào mà không cần tua qua thời gian nghỉ, đồng thời tổng hợp biểu đồ thống kê toàn trận.
              </p>
            </div>
            <Link
              to="/public-matches"
              className="pt-4 text-xs font-semibold text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform"
            >
              <span>Trải nghiệm điều hướng Rally</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>
        </div>
      </section>

      {/* 3. TRẬN ĐẤU TIÊU BIỂU (FEATURED PUBLIC MATCHES PREVIEW) */}
      <section className="space-y-6 pt-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="font-heading text-2xl font-bold text-white tracking-tight flex items-center gap-2">
              <Globe className="w-6 h-6 text-sky-400" />
              <span>Trận Đấu Công Khai Tiêu Biểu</span>
            </h2>
            <p className="text-sm text-slate-300 mt-1">
              Trải nghiệm ngay các trận đấu giải quốc tế đã được phân tích đầy đủ dữ liệu AI
            </p>
          </div>

          <Link
            to="/public-matches"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-full bg-brand/15 hover:bg-brand text-sky-300 hover:text-white border border-brand/30 text-xs sm:text-sm font-semibold transition-all"
          >
            <span>Mở Thư viện công khai</span>
            <ArrowRight className="w-4 h-4" />
          </Link>
        </div>

        {loading ? (
          <div className="py-16 flex flex-col items-center justify-center space-y-3">
            <Loader2 className="w-8 h-8 text-sky-400 animate-spin" />
            <span className="text-sm text-slate-300">Đang tải trận đấu tiêu biểu...</span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {featuredMatches.map((item) => (
              <div
                key={item.id}
                className="card-light-blue overflow-hidden flex flex-col group transition-all duration-300 shadow-xl hover:border-sky-400/40"
              >
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

                  <div className="absolute top-3 left-3 px-2.5 py-0.5 rounded-full bg-slate-900/80 backdrop-blur-sm border border-white/15 text-[11px] font-semibold text-white flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
                    <span>{item.courtName || 'Giải Đấu Quốc Tế'}</span>
                  </div>

                  <div className="absolute bottom-3 right-3 px-2 py-0.5 rounded-full bg-slate-950/80 backdrop-blur-sm font-mono text-xs text-white flex items-center gap-1">
                    <Clock className="w-3 h-3 text-sky-400" />
                    <span>{formatDuration(item.durationSeconds)}</span>
                  </div>

                  <Link
                    to={`/public-matches/${item.id}/replay`}
                    className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200 bg-black/40 backdrop-blur-[2px]"
                  >
                    <div className="w-12 h-12 rounded-full bg-brand text-white shadow-glow-blue flex items-center justify-center scale-90 group-hover:scale-100 transition-transform">
                      <Play className="h-5 w-5 fill-white translate-x-0.5" />
                    </div>
                  </Link>
                </div>

                <div className="p-6 flex-1 flex flex-col justify-between space-y-4">
                  <div>
                    <Link to={`/public-matches/${item.id}/replay`}>
                      <h3 className="font-heading font-bold text-white text-base group-hover:text-sky-400 transition-colors line-clamp-2">
                        {item.title || `${item.playerAName} vs ${item.playerBName}`}
                      </h3>
                    </Link>
                    <div className="text-xs text-sky-400 font-medium mt-1">
                      {item.playerAName} <span className="text-white/40 font-normal">đối đầu</span> {item.playerBName}
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-xs text-slate-200 pt-2 border-t border-white/10">
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
                    className="w-full py-2.5 rounded-full bg-white/10 hover:bg-brand text-white font-semibold text-xs flex items-center justify-center gap-1.5 transition-colors border border-white/10"
                  >
                    <span>Xem phân tích trận đấu</span>
                    <ArrowRight className="h-3.5 w-3.5" />
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};
