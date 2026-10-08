import React from 'react';
import { Play, Search, Video, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';

export const HomePage: React.FC = () => {
  return (
    <div className="space-y-8">
      {/* Hero Section */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-700 text-white rounded-2xl p-8 sm:p-12 shadow-sm">
        <div className="max-w-2xl space-y-4">
          <span className="inline-flex items-center space-x-1.5 px-3 py-1 rounded-full bg-emerald-500/30 text-emerald-100 text-xs font-semibold">
            <Zap className="h-3.5 w-3.5" />
            <span>Phân tích Thông minh bằng AI</span>
          </span>
          <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight">
            Nền Tảng Phân Tích Cầu Lông & Xem Lại Trận Đấu
          </h1>
          <p className="text-emerald-50 text-sm sm:text-base leading-relaxed">
            Tự động phát hiện các cú đập cầu (Smash), bỏ nhỏ (Drop), phông cầu (Clear), phân nhóm pha cầu (Rallies) và trực quan hóa dữ liệu thống kê trực tiếp trên thanh video.
          </p>
          <div className="pt-2 flex flex-wrap gap-3">
            <Link
              to="/my-matches"
              className="px-5 py-2.5 bg-white text-emerald-800 font-semibold rounded-lg shadow-sm hover:bg-emerald-50 transition text-sm"
            >
              Tải lên trận đấu
            </Link>
            <a
              href="#public-library"
              className="px-5 py-2.5 bg-emerald-500/20 text-white font-semibold rounded-lg hover:bg-emerald-500/30 transition text-sm"
            >
              Xem trận đấu mẫu
            </a>
          </div>
        </div>
      </div>

      {/* Public Match Library Section */}
      <section id="public-library" className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-slate-900">Thư viện Trận đấu Công khai</h2>
            <p className="text-sm text-slate-500">Khám phá và xem lại các pha cầu của các trận đấu đã phân tích</p>
          </div>
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              placeholder="Tìm kiếm tay vợt, tiêu đề..."
              className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        {/* Placeholder Match Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-2">
          {[1, 2, 3].map((item) => (
            <div key={item} className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition flex flex-col">
              <div className="aspect-video bg-slate-100 flex items-center justify-center relative group">
                <Video className="h-10 w-10 text-slate-400" />
                <Link
                  to={`/public-matches/${item}/replay`}
                  className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white font-medium space-x-2 text-sm"
                >
                  <Play className="h-6 w-6 text-emerald-400 fill-emerald-400" />
                  <span>Xem Replay (Preview 5p)</span>
                </Link>
              </div>
              <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                <div>
                  <div className="flex items-center justify-between text-xs text-slate-400 mb-1">
                    <span>Đơn nam • 08/10/2026</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-50 text-emerald-700 font-semibold">PUBLISHED</span>
                  </div>
                  <h3 className="font-semibold text-slate-800 text-sm line-clamp-1">
                    Nguyễn Tiến Minh VS Lee Chong Wei (Trận mẫu #{item})
                  </h3>
                </div>
                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-xs text-slate-500">
                  <span>48 Cú đánh • 6 Pha cầu</span>
                  <Link to={`/public-matches/${item}/replay`} className="text-emerald-600 font-medium hover:underline">
                    Xem Replay &rarr;
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
};

