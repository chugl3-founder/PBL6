import React, { useState, useEffect } from 'react';
import { Play, Video, ArrowRight, BarChart3, Crosshair, TrendingUp, Globe, Clock, Loader2, Zap, Cloud } from 'lucide-react';
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
    <div className="space-y-20 pb-20 pt-4">
      {/* 1. HERO SECTION (TĂNG KÍCH THƯỚC KHUNG, TĂNG ĐỘ SÁNG CHUẨN ẢNH 2) */}
      <section className="relative min-h-[680px] lg:min-h-[720px] rounded-3xl overflow-hidden border border-white/20 bg-gradient-to-br from-[#123160] via-[#0e274f] to-[#0a1c38] flex flex-col justify-between p-8 sm:p-12 lg:p-16 shadow-2xl">
        {/* Background Court Image - Sáng rõ nét */}
        <div
          className="absolute inset-0 bg-cover bg-center pointer-events-none brightness-110 contrast-105"
          style={{
            backgroundImage: `url('/images/arena-court-blue.jpg')`
          }}
        />

        {/* Lớp gradient xanh dịu giữ độ sáng của sân và đảm bảo độ tương phản chữ */}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0c2652]/85 via-[#0d2a5a]/45 to-transparent pointer-events-none" />
        <div className="absolute inset-0 bg-gradient-to-t from-[#091f42]/70 via-transparent to-transparent pointer-events-none" />
        
        {/* Lớp ánh sáng xanh thể thao (Cyan & Royal Blue Glow) */}
        <div className="absolute -top-24 right-10 w-[750px] h-[750px] bg-sky-400/20 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-[650px] h-[650px] bg-brand/25 rounded-full blur-[140px] pointer-events-none" />

        {/* Hero Content */}
        <div className="relative z-10 max-w-4xl space-y-6 pt-4">
          {/* Heading */}
          <h1 className="font-heading text-4xl sm:text-5xl lg:text-[60px] font-extrabold text-white tracking-tight leading-[1.12]">
            Phân tích hiệu suất và <br />
            chiến thuật đỉnh cao <br />
            cho cầu lông hiện đại.
          </h1>

          {/* Subtitle */}
          <p className="text-slate-200 text-base sm:text-lg leading-relaxed max-w-2xl font-normal">
            Theo dõi cú đánh, tốc độ cầu, vị trí di chuyển và diễn biến trận đấu <br className="hidden sm:inline" />
            trên một nền tảng trực quan dành cho vận động viên và huấn luyện viên.
          </p>

          {/* CTAs */}
          <div className="pt-3 flex flex-wrap items-center gap-4">
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

        {/* Hero Bottom 4 Feature Cards (Rộng rãi, sáng khối kính xanh) */}
        <div className="relative z-10 pt-12 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4 sm:gap-5">
          {/* Card 1: Tự động phân đoạn trận đấu */}
          <div className="bg-[#122e5a]/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/20 flex items-center gap-4 shadow-xl hover:border-sky-400/50 hover:bg-[#16376b]/80 transition-all">
            <div className="w-12 h-12 rounded-full bg-[#007aff] flex items-center justify-center text-white shrink-0 shadow-glow-blue">
              <Zap className="w-5 h-5 fill-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-[15px] leading-snug">
                Tự động phân đoạn trận đấu
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed mt-1">
                Nhận diện và tách các pha diễn biến chính.
              </p>
            </div>
          </div>

          {/* Card 2: Phân tích cú đánh */}
          <div className="bg-[#122e5a]/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/20 flex items-center gap-4 shadow-xl hover:border-sky-400/50 hover:bg-[#16376b]/80 transition-all">
            <div className="w-12 h-12 rounded-full bg-[#007aff] flex items-center justify-center text-white shrink-0 shadow-glow-blue">
              <BarChart3 className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-[15px] leading-snug">
                Phân tích cú đánh
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed mt-1">
                Thống kê loại cú đánh, tốc độ và độ chính xác.
              </p>
            </div>
          </div>

          {/* Card 3: Phân tích di chuyển */}
          <div className="bg-[#122e5a]/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/20 flex items-center gap-4 shadow-xl hover:border-sky-400/50 hover:bg-[#16376b]/80 transition-all">
            <div className="w-12 h-12 rounded-full bg-[#007aff] flex items-center justify-center text-white shrink-0 shadow-glow-blue">
              <svg className="w-5 h-5 text-white fill-current" viewBox="0 0 24 24">
                <path d="M13.49 5.48c1.1 0 2-.9 2-2s-.9-2-2-2-2 .9-2 2 .9 2 2 2zm-3.6 3.48L7.1 22.95h2.12l1.79-7.98 2.1 1.99v6h2v-7.5l-2.09-1.99.59-3.01c1.29 1.54 3.29 2.54 5.49 2.54v-2c-1.9 0-3.51-.99-4.3-2.4l-1-1.6c-.39-.6-.99-1-1.7-1-.3 0-.5.1-.8.1L6.1 8.28V13h2V9.67l1.79-.71z" />
              </svg>
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-[15px] leading-snug">
                Phân tích di chuyển
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed mt-1">
                Theo dõi vị trí và vùng hoạt động trên sân.
              </p>
            </div>
          </div>

          {/* Card 4: Lưu trữ đám mây */}
          <div className="bg-[#122e5a]/70 backdrop-blur-md p-4 sm:p-5 rounded-2xl border border-white/20 flex items-center gap-4 shadow-xl hover:border-sky-400/50 hover:bg-[#16376b]/80 transition-all">
            <div className="w-12 h-12 rounded-full bg-[#007aff] flex items-center justify-center text-white shrink-0 shadow-glow-blue">
              <Cloud className="w-5 h-5 text-white" />
            </div>
            <div>
              <h3 className="font-bold text-white text-sm sm:text-[15px] leading-snug">
                Lưu trữ đám mây
              </h3>
              <p className="text-slate-300 text-xs leading-relaxed mt-1">
                Tải lên và quản lý video dễ dàng.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 2. FEATURE SPOTLIGHT (GIỮ NGUYÊN) */}
      <section id="features" className="space-y-8">
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

      {/* 3. TRẬN ĐẤU TIÊU BIỂU (GIỮ NGUYÊN) */}
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
