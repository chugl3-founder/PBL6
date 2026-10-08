import React from 'react';
import { Plus, Video, Calendar, ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export const MyMatchesPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-bold text-slate-800">Trận đấu của tôi</h1>
          <p className="text-sm text-slate-500">Quản lý và theo dõi tiến trình phân tích các video trận đấu</p>
        </div>
        <button
          onClick={() => alert('Tính năng Tạo trận đấu sẽ được kích hoạt ở các Vertical Slices tiếp theo!')}
          className="inline-flex items-center space-x-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium text-sm rounded-lg shadow-sm transition"
        >
          <Plus className="h-4 w-4" />
          <span>Tạo trận đấu mới</span>
        </button>
      </div>

      {/* Placeholder Match List */}
      <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between text-xs font-semibold text-slate-400 uppercase tracking-wider">
          <span>Thông tin trận đấu</span>
          <span>Trạng thái</span>
        </div>
        
        <div className="divide-y divide-slate-100">
          {[
            { id: 10, title: 'Trận bán kết giao hữu CLB 2026', playerA: 'Nguyễn Văn A', playerB: 'Trần Văn B', status: 'ANALYZED', statusColor: 'bg-emerald-50 text-emerald-700' },
            { id: 11, title: 'Trận tập kỹ thuật đập cầu Smash', playerA: 'Lê Văn C', playerB: 'Nguyễn Văn A', status: 'READY', statusColor: 'bg-blue-50 text-blue-700' },
          ].map((match) => (
            <div key={match.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition">
              <div className="space-y-1">
                <div className="flex items-center space-x-2">
                  <Video className="h-4 w-4 text-emerald-600" />
                  <span className="font-semibold text-slate-800 text-sm">{match.title}</span>
                </div>
                <div className="text-xs text-slate-500 flex items-center space-x-3">
                  <span>{match.playerA} vs {match.playerB}</span>
                  <span>•</span>
                  <span className="flex items-center space-x-1">
                    <Calendar className="h-3 w-3" />
                    <span>08/10/2026</span>
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-3">
                <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${match.statusColor}`}>
                  {match.status}
                </span>
                <Link
                  to={`/matches/${match.id}/replay`}
                  className="inline-flex items-center space-x-1 text-sm font-medium text-emerald-600 hover:text-emerald-700 hover:underline"
                >
                  <span>Xem Replay</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

