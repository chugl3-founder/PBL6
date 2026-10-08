import React from 'react';
import { Play, Search, Video, Zap, Activity, Cpu, ShieldCheck, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section - Cyberpunk Sports Tech Style */}
      <div className="relative rounded-3xl overflow-hidden glass-panel border border-slate-800 p-8 sm:p-14">
        {/* Glow Background Gradient Orbs */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-court/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-court-cyan/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 max-w-3xl space-y-6">
          <div className="inline-flex items-center space-x-2 px-3 py-1.5 rounded-full bg-court/10 border border-court/30 text-court text-xs font-semibold uppercase tracking-wider">
            <Zap className="h-3.5 w-3.5" />
            <span>AI Computer Vision Analytics Hub</span>
          </div>

          <h1 className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white leading-tight">
            Nền Tảng Phân Tích <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-court to-court-cyan">
              Cầu Lông Kỹ Thuật Số
            </span>
          </h1>

          <p className="text-slate-300 text-base sm:text-lg leading-relaxed">
            Tự động bóc tách từng pha cầu (Rallies), nhận diện cú đập Smash tốc độ cao, điểm rơi quả cầu và trực quan hóa bản đồ nhiệt (Landing Heatmap) chính xác đến từng khung hình.
          </p>

          <div className="pt-2 flex flex-wrap items-center gap-4">
            <Link
              to="/my-matches"
              className="px-6 py-3 bg-court hover:bg-emerald-400 text-slate-950 font-bold rounded-xl shadow-neon-court transition-all duration-200 flex items-center gap-2 text-sm"
            >
              <Video className="h-4 w-4" />
              <span>Tải lên trận đấu</span>
            </Link>
            <a
              href="#public-library"
              className="px-6 py-3 glass-panel hover:bg-slate-800/80 text-white font-semibold rounded-xl border border-slate-700 hover:border-court/40 transition-all duration-200 text-sm flex items-center gap-2"
            >
              <span>Xem trận đấu mẫu</span>
              <ChevronRight className="h-4 w-4 text-slate-400" />
            </a>
          </div>

          {/* Feature Tech Badges */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-court/10 text-court border border-court/20">
                <Activity className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-xs">Pha cầu (Rallies)</div>
                <div className="text-slate-400 text-[11px]">Cắt lọc tự động 100%</div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-court-cyan/10 text-court-cyan border border-court-cyan/20">
                <Cpu className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-xs">Hawk-Eye Sync</div>
                <div className="text-slate-400 text-[11px]">Mô phỏng 3D điểm rơi</div>
              </div>
            </div>
            <div className="flex items-center gap-3 col-span-2 sm:col-span-1">
              <div className="p-2 rounded-lg bg-purple-500/10 text-purple-400 border border-purple-500/20">
                <ShieldCheck className="h-4 w-4" />
              </div>
              <div className="text-left">
                <div className="text-white font-semibold text-xs">Dữ liệu Chuẩn hóa</div>
                <div className="text-slate-400 text-[11px]">Bảo mật & Trực quan</div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Public Match Library Section */}
      <section id="public-library" className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-white flex items-center gap-2.5">
              <span>Trận Đấu Phân Tích Nổi Bật</span>
              <span className="w-2 h-2 rounded-full bg-court animate-ping" />
            </h2>
            <p className="text-sm text-slate-400 mt-1">Khám phá và xem lại các pha cầu của các trận đấu đã phân tích</p>
          </div>
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3.5 top-3 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tay vợt, giải đấu..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-900/90 border border-slate-800 rounded-xl text-sm text-white placeholder-slate-500 focus:outline-none focus:border-court focus:ring-1 focus:ring-court transition"
            />
          </div>
        </div>

        {/* Demo Match Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[
            { id: 1, title: 'Chung kết Đơn Nam: Viktor Axelsen vs Shi Yuqi', duration: '52:14', rallies: 48, smashes: 72, court: 'Sân 1' },
            { id: 2, title: 'Bán kết Toàn Anh: Lee Zii Jia vs Anthony Ginting', duration: '45:30', rallies: 39, smashes: 61, court: 'Sân 2' },
            { id: 3, title: 'Tập huấn Chuyên sâu CLB: Trận giao hữu Top 1', duration: '31:10', rallies: 24, smashes: 35, court: 'Sân 3' },
          ].map((item) => (
            <div 
              key={item.id} 
              className="glass-panel glass-panel-hover rounded-2xl overflow-hidden flex flex-col group border border-slate-800"
            >
              {/* Video Thumbnail Mockup */}
              <div className="aspect-video bg-slate-900/90 flex items-center justify-center relative overflow-hidden">
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent z-10" />
                <Video className="h-10 w-10 text-slate-700 group-hover:scale-110 transition-transform duration-300" />
                
                {/* Court Tag */}
                <div className="absolute top-3 left-3 z-20 px-2.5 py-1 rounded-md bg-slate-950/80 border border-slate-800 text-[11px] font-mono text-court-cyan">
                  {item.court}
                </div>

                {/* Duration Badge */}
                <div className="absolute bottom-3 right-3 z-20 px-2 py-0.5 rounded bg-black/80 font-mono text-xs text-slate-300">
                  {item.duration}
                </div>

                {/* Play Button Overlay */}
                <Link
                  to={`/matches/${item.id}`}
                  className="absolute z-20 inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-300"
                >
                  <div className="p-4 rounded-full bg-court text-slate-950 shadow-neon-court scale-90 group-hover:scale-100 transition-transform">
                    <Play className="h-6 w-6 fill-slate-950 translate-x-0.5" />
                  </div>
                </Link>
              </div>

              {/* Card Meta Content */}
              <div className="p-5 flex-1 flex flex-col justify-between space-y-4">
                <h3 className="font-bold text-white text-base group-hover:text-court transition-colors line-clamp-2">
                  {item.title}
                </h3>

                <div className="grid grid-cols-2 gap-2 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
                    <span className="text-slate-500 block text-[10px]">Pha cầu (Rallies)</span>
                    <span className="font-mono font-bold text-court text-sm">{item.rallies}</span>
                  </div>
                  <div className="bg-slate-900/60 p-2 rounded-lg border border-slate-800/50">
                    <span className="text-slate-500 block text-[10px]">Cú Smash phát hiện</span>
                    <span className="font-mono font-bold text-stroke-smash text-sm">{item.smashes}</span>
                  </div>
                </div>

                <Link
                  to={`/matches/${item.id}`}
                  className="w-full py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-slate-200 hover:text-white font-medium text-xs flex items-center justify-center gap-1.5 border border-slate-800 transition"
                >
                  <span>Phân tích Replay</span>
                  <ChevronRight className="h-3.5 w-3.5 text-slate-400" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};
