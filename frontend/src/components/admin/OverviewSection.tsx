import React from 'react';
import { Link } from 'react-router-dom';
import {
  Users,
  Video,
  Cpu,
  Globe,
  ArrowRight,
  RefreshCw,
} from 'lucide-react';
import type { DashboardMetrics } from '../../types/admin';

interface OverviewSectionProps {
  dashboardMetrics: DashboardMetrics | null;
  metricsLoading: boolean;
  fetchDashboardMetrics: () => void;
}

/** /admin: system-wide numbers and charts (VS-19). */
export const OverviewSection: React.FC<OverviewSectionProps> = ({ dashboardMetrics, metricsLoading, fetchDashboardMetrics }) => {
  const totalUsersMetric = dashboardMetrics?.totalUsers ?? '–';
  const totalMatchesMetric = dashboardMetrics?.totalMatches ?? '–';
  const publishedMatchesMetric = dashboardMetrics?.publishedMatches ?? '–';
  const aiSuccessRateMetric =
    dashboardMetrics?.aiSuccessRate !== undefined ? `${dashboardMetrics.aiSuccessRate}%` : '–';

  return (
    <div className="space-y-6">
      {/* Thanh tiêu đề nhỏ & nút làm mới */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-white tracking-tight">
            Tổng Quan Vận Hành & Thống Kê Hệ Thống
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Số liệu tổng hợp thời gian thực từ PostgreSQL cho toàn bộ các phân hệ Quản trị (VS-19)
          </p>
        </div>
        <button
          type="button"
          onClick={fetchDashboardMetrics}
          disabled={metricsLoading}
          className="self-start sm:self-auto px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-semibold text-sky-300 flex items-center gap-2 transition"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${metricsLoading ? 'animate-spin' : ''}`} />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 4 Thẻ KPI Tổng quan có link điều hướng nhanh */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {[
          {
            label: 'Tổng số người dùng',
            val: totalUsersMetric,
            sub: `${dashboardMetrics?.activeUsers ?? '–'} hoạt động • ${dashboardMetrics?.lockedUsers ?? '–'} đã khóa`,
            icon: Users,
            color: 'text-sky-400 bg-sky-500/10 border-sky-500/20',
            to: '/admin/users',
          },
          {
            label: 'Tổng số trận đấu',
            val: totalMatchesMetric,
            sub: `${dashboardMetrics?.analyzedMatches ?? '–'} đã phân tích • ${dashboardMetrics?.deletedMatches ?? '–'} thùng rác`,
            icon: Video,
            color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
            to: '/admin/matches',
          },
          {
            label: 'Trận đấu Công khai',
            val: publishedMatchesMetric,
            sub: 'Đang hiển thị trên Thư viện công khai',
            icon: Globe,
            color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
            to: '/admin/matches',
          },
          {
            label: 'Tỷ lệ AI Thành công',
            val: aiSuccessRateMetric,
            sub: `${dashboardMetrics?.completedAiAnalyses ?? '–'} hoàn tất • ${dashboardMetrics?.failedAiAnalyses ?? '–'} lỗi • ${dashboardMetrics?.processingAiAnalyses ?? '–'} đang chạy`,
            icon: Cpu,
            color: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
            to: '/admin/ai-monitor',
          },
        ].map((item, idx) => {
          const Icon = item.icon;
          return (
            <Link
              key={idx}
              to={item.to}
              className="bg-[#0f1d35]/90 hover:bg-[#132544] p-5 border border-white/10 hover:border-brand/40 rounded-2xl shadow-lg flex items-center justify-between gap-3 transition group"
            >
              <div className="flex items-center gap-3.5 min-w-0">
                <div className={`p-3 rounded-xl border shrink-0 ${item.color}`}>
                  <Icon className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="text-xs text-slate-400 font-medium truncate">{item.label}</p>
                  <p className="text-2xl font-black text-white tracking-tight mt-0.5">{item.val}</p>
                  <p className="text-[11px] text-slate-400 mt-0.5 truncate">{item.sub}</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-0.5 transition shrink-0" />
            </Link>
          );
        })}
      </div>

      {/* KHU VỰC BIỂU ĐỒ TRỰC QUAN & BẢNG TỔNG HỢP */}
      {dashboardMetrics &&
        (() => {
          const matchChartItems = [
            {
              key: 'PUBLISHED',
              label: 'Đang công khai (PUBLISHED)',
              count: dashboardMetrics.publishedMatches || 0,
              color: '#10b981',
            },
            {
              key: 'ANALYZED',
              label: 'Đã phân tích AI (ANALYZED)',
              count: dashboardMetrics.analyzedMatches || 0,
              color: '#0ea5e9',
            },
            {
              key: 'READY',
              label: 'Sẵn sàng video (READY)',
              count: dashboardMetrics.matchStatusBreakdown?.READY || 0,
              color: '#6366f1',
            },
            {
              key: 'ANALYZING',
              label: 'Đang chạy AI (ANALYZING)',
              count: dashboardMetrics.matchStatusBreakdown?.ANALYZING || 0,
              color: '#a855f7',
            },
            {
              key: 'DRAFT',
              label: 'Bản nháp (DRAFT)',
              count: dashboardMetrics.draftMatches || 0,
              color: '#f59e0b',
            },
            {
              key: 'DELETED',
              label: 'Thùng rác (DELETED)',
              count: dashboardMetrics.deletedMatches || 0,
              color: '#f43f5e',
            },
          ];
          const totalAllMatches =
            matchChartItems.reduce((acc, item) => acc + item.count, 0) || 1;

          const polarToCartesian = (cx: number, cy: number, r: number, angleDeg: number) => {
            const rad = ((angleDeg - 90) * Math.PI) / 180.0;
            return { x: cx + r * Math.cos(rad), y: cy + r * Math.sin(rad) };
          };
          const createArc = (
            x: number,
            y: number,
            r: number,
            ir: number,
            startAngle: number,
            endAngle: number
          ) => {
            const adjEnd = Math.min(endAngle, startAngle + 359.99);
            const start = polarToCartesian(x, y, r, adjEnd);
            const end = polarToCartesian(x, y, r, startAngle);
            const innerStart = polarToCartesian(x, y, ir, startAngle);
            const innerEnd = polarToCartesian(x, y, ir, adjEnd);
            const largeArc = adjEnd - startAngle <= 180 ? '0' : '1';
            return [
              `M ${start.x} ${start.y}`,
              `A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`,
              `L ${innerStart.x} ${innerStart.y}`,
              `A ${ir} ${ir} 0 ${largeArc} 1 ${innerEnd.x} ${innerEnd.y}`,
              'Z',
            ].join(' ');
          };

          let accAngle = 0;
          const donutSlices = matchChartItems
            .filter((it) => it.count > 0)
            .map((it) => {
              const pct = it.count / totalAllMatches;
              const angle = pct * 360;
              const startAngle = accAngle;
              accAngle += angle;
              return {
                ...it,
                pct: Math.round(pct * 1000) / 10,
                startAngle,
                angle,
              };
            });

          const totalAi = dashboardMetrics.totalAiAnalyses || 1;
          const aiBarItems = [
            {
              label: 'Hoàn tất (COMPLETED)',
              count: dashboardMetrics.completedAiAnalyses || 0,
              pct:
                Math.round(((dashboardMetrics.completedAiAnalyses || 0) / totalAi) * 1000) / 10,
              barClass: 'from-emerald-500 to-teal-400',
              textClass: 'text-emerald-400',
            },
            {
              label: 'Đang xử lý / Hàng đợi (PROCESSING / QUEUED)',
              count: dashboardMetrics.processingAiAnalyses || 0,
              pct:
                Math.round(((dashboardMetrics.processingAiAnalyses || 0) / totalAi) * 1000) /
                10,
              barClass: 'from-sky-500 to-indigo-400',
              textClass: 'text-sky-300',
            },
            {
              label: 'Gặp sự cố (FAILED / UNSUPPORTED)',
              count: dashboardMetrics.failedAiAnalyses || 0,
              pct: Math.round(((dashboardMetrics.failedAiAnalyses || 0) / totalAi) * 1000) / 10,
              barClass: 'from-rose-600 to-rose-400',
              textClass: 'text-rose-400',
            },
            {
              label: 'Đã hủy (CANCELLED)',
              count: dashboardMetrics.aiStatusBreakdown?.CANCELLED || 0,
              pct:
                Math.round(
                  ((dashboardMetrics.aiStatusBreakdown?.CANCELLED || 0) / totalAi) * 1000
                ) / 10,
              barClass: 'from-amber-500 to-yellow-400',
              textClass: 'text-amber-300',
            },
          ];

          const totalUsr = dashboardMetrics.totalUsers || 1;
          const activeUsrPct =
            Math.round(((dashboardMetrics.activeUsers || 0) / totalUsr) * 1000) / 10;
          const lockedUsrPct =
            Math.round(((dashboardMetrics.lockedUsers || 0) / totalUsr) * 1000) / 10;

          const gaugeRadius = 52;
          const gaugeCircumference = 2 * Math.PI * gaugeRadius;
          const successRateVal = Number(dashboardMetrics.aiSuccessRate || 0);
          const gaugeOffset =
            gaugeCircumference - (successRateVal / 100) * gaugeCircumference;

          return (
            <div className="space-y-6">
              {/* HÀNG 1: 2 CỘT CÂN ĐỐI (6 COLS + 6 COLS) */}
              <div className="grid grid-cols-1 xl:grid-cols-12 gap-6">
                {/* Cột Trái (6 cols): Biểu đồ tròn Donut Phân bố Trận đấu */}
                <div className="xl:col-span-6 bg-[#0f1d35]/90 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between min-w-0">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3.5 gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Video className="w-4 h-4 text-sky-400 shrink-0" />
                        <span className="truncate">Biểu Đồ Cơ Cấu Trận Đấu</span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        Tỷ trọng các trạng thái trận đấu trên toàn hệ thống
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-mono font-bold shrink-0">
                      Tổng: {totalAllMatches}
                    </span>
                  </div>

                  <div className="flex flex-col sm:flex-row items-center gap-6 my-5">
                    {/* SVG Donut Chart */}
                    <div className="relative w-44 h-44 shrink-0 flex items-center justify-center">
                      <svg viewBox="0 0 200 200" className="w-full h-full">
                        {donutSlices.map((sl) => (
                          <path
                            key={sl.key}
                            d={createArc(
                              100,
                              100,
                              88,
                              54,
                              sl.startAngle,
                              sl.startAngle + sl.angle
                            )}
                            fill={sl.color}
                            className="transition-all duration-300 hover:opacity-90"
                          />
                        ))}
                      </svg>
                      <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                        <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold">
                          Đang hoạt động
                        </span>
                        <span className="text-2xl font-black text-white">
                          {dashboardMetrics.totalMatches}
                        </span>
                        <span className="text-[11px] text-emerald-400 font-bold">
                          +{dashboardMetrics.deletedMatches} thùng rác
                        </span>
                      </div>
                    </div>

                    {/* Chú giải chi tiết Donut */}
                    <div className="flex-1 w-full space-y-2 text-xs min-w-0">
                      {matchChartItems.map((it) => {
                        const pct = Math.round((it.count / totalAllMatches) * 1000) / 10;
                        return (
                          <div
                            key={it.key}
                            className="flex items-center justify-between px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/5"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span
                                className="w-2.5 h-2.5 rounded-full shrink-0"
                                style={{ backgroundColor: it.color }}
                              />
                              <span className="text-slate-200 truncate text-[11px]">
                                {it.label}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5 font-mono shrink-0 ml-2">
                              <span className="font-bold text-white">{it.count}</span>
                              <span className="text-[11px] text-slate-400">({pct}%)</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Công khai:{' '}
                      <strong className="text-emerald-400">
                        {dashboardMetrics.publishedMatches}
                      </strong>{' '}
                      • Chờ duyệt:{' '}
                      <strong className="text-sky-300">
                        {dashboardMetrics.analyzedMatches}
                      </strong>
                    </span>
                    <Link
                      to="/admin/matches"
                      className="text-sky-400 hover:text-sky-300 font-bold flex items-center gap-1"
                    >
                      <span>Đi tới Quản lý Trận đấu</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>

                {/* Cột Phải (6 cols): Biểu đồ Cột ngang Tiến trình AI & Đồng hồ Gauge Tỷ lệ Thành công */}
                <div className="xl:col-span-6 bg-[#0f1d35]/90 border border-white/10 rounded-3xl p-6 shadow-xl flex flex-col justify-between space-y-4 min-w-0">
                  <div className="flex items-center justify-between border-b border-white/10 pb-3.5 gap-2">
                    <div className="min-w-0">
                      <h3 className="text-sm font-bold text-white flex items-center gap-2">
                        <Cpu className="w-4 h-4 text-purple-400 shrink-0" />
                        <span className="truncate">
                          Biểu Đồ Hiệu Suất AI Worker (CoachAI+ 2.0)
                        </span>
                      </h3>
                      <p className="text-[11px] text-slate-400 mt-0.5 truncate">
                        Phân bố kết quả xử lý video và tỷ lệ hoàn thành của hàng đợi AI
                      </p>
                    </div>
                    <span className="px-2.5 py-1 rounded-full bg-purple-500/10 border border-purple-500/20 text-purple-300 text-xs font-mono font-bold shrink-0">
                      {dashboardMetrics.totalAiAnalyses} phiên AI
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-12 gap-5 items-center py-2">
                    {/* Radial Gauge Chart cho Tỷ lệ AI Thành công */}
                    <div className="sm:col-span-5 flex flex-col items-center justify-center p-4 rounded-2xl bg-[#142544]/60 border border-white/10">
                      <div className="relative w-32 h-32 flex items-center justify-center">
                        <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
                          <circle
                            cx="70"
                            cy="70"
                            r={gaugeRadius}
                            stroke="rgba(255,255,255,0.08)"
                            strokeWidth="12"
                            fill="transparent"
                          />
                          <circle
                            cx="70"
                            cy="70"
                            r={gaugeRadius}
                            stroke="#a855f7"
                            strokeWidth="12"
                            strokeDasharray={gaugeCircumference}
                            strokeDashoffset={gaugeOffset}
                            strokeLinecap="round"
                            fill="transparent"
                            className="transition-all duration-700 ease-out"
                          />
                        </svg>
                        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                          <span className="text-xl font-black text-white">
                            {successRateVal}%
                          </span>
                          <span className="text-[11px] text-purple-300 font-semibold uppercase">
                            Thành công
                          </span>
                        </div>
                      </div>
                      <p className="text-[11px] text-slate-400 text-center mt-2">
                        {dashboardMetrics.completedAiAnalyses} hoàn tất /{' '}
                        {dashboardMetrics.failedAiAnalyses} lỗi
                      </p>
                    </div>

                    {/* Horizontal Bar Chart cho từng trạng thái AI */}
                    <div className="sm:col-span-7 space-y-3 min-w-0">
                      {aiBarItems.map((bar, idx) => (
                        <div key={idx} className="space-y-1">
                          <div className="flex items-center justify-between text-xs gap-2">
                            <span className="text-slate-200 font-medium truncate">
                              {bar.label}
                            </span>
                            <span className={`font-mono font-bold shrink-0 ${bar.textClass}`}>
                              {bar.count} ({bar.pct}%)
                            </span>
                          </div>
                          <div className="w-full h-2.5 rounded-full bg-white/5 overflow-hidden p-0.5 border border-white/10">
                            <div
                              className={`h-full rounded-full bg-gradient-to-r ${bar.barClass} transition-all duration-500`}
                              style={{ width: `${Math.max(bar.pct, bar.count > 0 ? 4 : 0)}%` }}
                            />
                          </div>
                        </div>
                      ))}

                      {/* Thanh Stacked Bar Tỷ lệ Tài khoản Người dùng */}
                      <div className="pt-2.5 border-t border-white/10 space-y-1">
                        <div className="flex items-center justify-between text-xs gap-2">
                          <span className="text-slate-300 font-semibold flex items-center gap-1.5 truncate">
                            <Users className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="truncate">Tài khoản Hoạt động vs Đã khóa</span>
                          </span>
                          <span className="font-mono text-[11px] text-emerald-400 shrink-0">
                            {dashboardMetrics.activeUsers} / {dashboardMetrics.lockedUsers}
                          </span>
                        </div>
                        <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden flex border border-white/10">
                          <div
                            className="h-full bg-emerald-500 transition-all duration-500"
                            style={{ width: `${activeUsrPct}%` }}
                          />
                          <div
                            className="h-full bg-rose-500 transition-all duration-500"
                            style={{ width: `${lockedUsrPct}%` }}
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-white/10 flex items-center justify-between text-xs">
                    <span className="text-slate-400">
                      Đang xử lý:{' '}
                      <strong className="text-sky-300">
                        {dashboardMetrics.processingAiAnalyses}
                      </strong>{' '}
                      • Lỗi cần Retry:{' '}
                      <strong className="text-rose-400">
                        {dashboardMetrics.failedAiAnalyses}
                      </strong>
                    </span>
                    <Link
                      to="/admin/ai-monitor"
                      className="text-purple-300 hover:text-purple-200 font-bold flex items-center gap-1"
                    >
                      <span>Đi tới Giám sát AI</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>
                  </div>
                </div>
              </div>

              {/* HÀNG 2: BẢNG THỐNG KÊ TỔNG HỢP CHI TIẾT CÁC PHÂN HỆ */}
              <div className="bg-[#0f1d35]/90 border border-white/10 rounded-3xl p-6 shadow-xl space-y-4 min-w-0">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/10 pb-3.5">
                  <div>
                    <h3 className="text-sm font-bold text-white flex items-center gap-2">
                      <Globe className="w-4 h-4 text-emerald-400" />
                      <span>Bảng Số Liệu Thống Kê Tổng Hợp Toàn Hệ Thống</span>
                    </h3>
                    <p className="text-[11px] text-slate-400 mt-0.5">
                      Chỉ số định lượng, tỷ trọng phần trăm và lối tắt điều hướng nhanh đến từng phân hệ
                    </p>
                  </div>
                  <span className="text-[11px] text-slate-400 font-mono">
                    Đồng bộ trực tiếp từ PostgreSQL
                  </span>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-white/10 text-slate-400 font-semibold uppercase tracking-wider text-[11px]">
                        <th className="pb-3 px-3 whitespace-nowrap">Phân Hệ Quản Trị</th>
                        <th className="pb-3 px-3">Chỉ Số Chi Tiết</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Số Lượng</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Tỷ Trọng (%)</th>
                        <th className="pb-3 px-3 whitespace-nowrap">Minh Họa Tỷ Trọng</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Trạng Thái</th>
                        <th className="pb-3 px-3 text-right whitespace-nowrap">Thao Tác</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5">
                      {[
                        {
                          module: 'Người dùng (VS-17)',
                          metric: 'Tài khoản đang hoạt động (ACTIVE)',
                          count: dashboardMetrics.activeUsers,
                          total: dashboardMetrics.totalUsers || 1,
                          color: 'bg-emerald-500',
                          badge: 'Bình thường',
                          badgeCls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                          link: '/admin/users',
                        },
                        {
                          module: 'Người dùng (VS-17)',
                          metric: 'Tài khoản bị khóa vi phạm (LOCKED)',
                          count: dashboardMetrics.lockedUsers,
                          total: dashboardMetrics.totalUsers || 1,
                          color: 'bg-rose-500',
                          badge:
                            dashboardMetrics.lockedUsers > 0 ? 'Đang kiểm soát' : 'An toàn',
                          badgeCls: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
                          link: '/admin/users',
                        },
                        {
                          module: 'Trận đấu & Thư viện (VS-16)',
                          metric: 'Trận đấu đã xuất bản công khai (PUBLISHED)',
                          count: dashboardMetrics.publishedMatches,
                          total: totalAllMatches,
                          color: 'bg-emerald-400',
                          badge: 'Công khai',
                          badgeCls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                          link: '/admin/matches',
                        },
                        {
                          module: 'Trận đấu & Thư viện (VS-16)',
                          metric: 'Trận đấu đã phân tích AI chờ xuất bản (ANALYZED)',
                          count: dashboardMetrics.analyzedMatches,
                          total: totalAllMatches,
                          color: 'bg-sky-400',
                          badge: 'Sẵn sàng duyệt',
                          badgeCls: 'text-sky-300 bg-sky-500/15 border-sky-500/30',
                          link: '/admin/matches',
                        },
                        {
                          module: 'Trận đấu & Thư viện (VS-16)',
                          metric: 'Trận đấu trong Thùng rác xóa mềm (DELETED)',
                          count: dashboardMetrics.deletedMatches,
                          total: totalAllMatches,
                          color: 'bg-rose-400',
                          badge: 'Lưu trữ tạm',
                          badgeCls: 'text-amber-300 bg-amber-500/15 border-amber-500/30',
                          link: '/admin/matches',
                        },
                        {
                          module: 'Tiến trình AI (VS-18)',
                          metric: 'Phiên phân tích AI hoàn tất (COMPLETED)',
                          count: dashboardMetrics.completedAiAnalyses,
                          total: dashboardMetrics.totalAiAnalyses || 1,
                          color: 'bg-purple-400',
                          badge: 'Ổn định',
                          badgeCls: 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                          link: '/admin/ai-monitor',
                        },
                        {
                          module: 'Tiến trình AI (VS-18)',
                          metric: 'Phiên phân tích AI gặp lỗi (FAILED / UNSUPPORTED)',
                          count: dashboardMetrics.failedAiAnalyses,
                          total: dashboardMetrics.totalAiAnalyses || 1,
                          color: 'bg-rose-500',
                          badge:
                            dashboardMetrics.failedAiAnalyses > 0
                              ? 'Cần kiểm tra / Retry'
                              : 'Tốt',
                          badgeCls:
                            dashboardMetrics.failedAiAnalyses > 0
                              ? 'text-rose-300 bg-rose-500/15 border-rose-500/30'
                              : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30',
                          link: '/admin/ai-monitor',
                        },
                      ].map((row, rIdx) => {
                        const pct = Math.round((row.count / row.total) * 1000) / 10;
                        return (
                          <tr key={rIdx} className="hover:bg-white/[0.02] transition-colors">
                            <td className="py-3 px-3 font-bold text-white whitespace-nowrap">
                              {row.module}
                            </td>
                            <td className="py-3 px-3 text-slate-300">{row.metric}</td>
                            <td className="py-3 px-3 text-right font-mono font-bold text-white text-sm whitespace-nowrap">
                              {row.count}
                            </td>
                            <td className="py-3 px-3 text-right font-mono text-sky-300 whitespace-nowrap">
                              {pct}%
                            </td>
                            <td className="py-3 px-3 w-40">
                              <div className="w-full h-2 rounded-full bg-white/5 overflow-hidden border border-white/10">
                                <div
                                  className={`h-full rounded-full ${row.color}`}
                                  style={{ width: `${Math.max(pct, row.count > 0 ? 4 : 0)}%` }}
                                />
                              </div>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <span
                                className={`inline-flex px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${row.badgeCls}`}
                              >
                                {row.badge}
                              </span>
                            </td>
                            <td className="py-3 px-3 text-right whitespace-nowrap">
                              <Link
                                to={row.link}
                                className="inline-flex items-center gap-1 text-sky-400 hover:text-sky-300 font-semibold"
                              >
                                <span>Chi tiết</span>
                                <ArrowRight className="w-3 h-3" />
                              </Link>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          );
        })()}
    </div>
  );
};
