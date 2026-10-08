import React from 'react';
import { Users, Video, Cpu, AlertTriangle } from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  return (
    <div className="space-y-6">
      <div className="pb-4 border-b border-slate-200">
        <h1 className="text-2xl font-bold text-slate-800">Quản Trị Hệ Thống (Admin Console)</h1>
        <p className="text-sm text-slate-500">Giám sát tài nguyên, duyệt trận đấu và theo dõi sức khỏe worker AI</p>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Tổng số người dùng', val: '128', icon: Users, color: 'text-blue-600 bg-blue-50' },
          { label: 'Tổng số trận đấu', val: '45', icon: Video, color: 'text-emerald-600 bg-emerald-50' },
          { label: 'Worker AI Đang xử lý', val: '2', icon: Cpu, color: 'text-purple-600 bg-purple-50' },
          { label: 'Phân tích Thất bại', val: '1', icon: AlertTriangle, color: 'text-rose-600 bg-rose-50' },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <div key={idx} className="bg-white p-5 border border-slate-200 rounded-xl shadow-sm flex items-center space-x-4">
              <div className={`p-3 rounded-lg ${item.color}`}>
                <Icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-400 font-medium">{item.label}</p>
                <p className="text-2xl font-bold text-slate-800">{item.val}</p>
              </div>
            </div>
          );
        })}
      </div>

      <div className="p-8 bg-white border border-slate-200 rounded-xl text-center text-slate-500 text-sm">
        Bảng điều khiển chi tiết (User List, Match Curation, AI Monitor) sẽ được hoàn thiện ở các Vertical Slices tiếp theo.
      </div>
    </div>
  );
};

