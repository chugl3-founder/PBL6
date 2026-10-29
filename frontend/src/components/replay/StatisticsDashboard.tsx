import React, { useState } from 'react';
import { 
  BarChart3, Trophy, Flame,
  Sparkles, Award, Lightbulb, Activity,
  PieChart as PieIcon, Users
} from 'lucide-react';

export interface MatchStatisticsData {
  id: number;
  matchId: number;
  analysisId: number;
  totalStrokes: number;
  totalRallies: number;
  avgStrokesPerRally: number;
  avgRallyDuration: number;
  playerAStrokes: number;
  playerBStrokes: number;
  forehandCount: number;
  backhandCount: number;
  aroundheadCount: number;
  unknownSideCount: number;
  avgConfidence: number;
  strokeDistribution?: Record<string, number>;
  summaryData?: any;
  radarChart?: {
    axes: string[];
    upper: number[];
    lower: number[];
  };
  coachInsights?: {
    insights: Array<{
      target: string;
      category: string;
      insight: string;
    }>;
  };
  tacticalPatterns?: {
    top_transitions_2gram?: Array<{ sequence?: string; from?: string; to?: string; count: number }>;
    top_sequences_3gram?: Array<{ sequence?: string; count: number }>;
    estimated_winning_combinations?: Record<string, any>;
  };
}

interface StatisticsDashboardProps {
  stats: MatchStatisticsData;
  playerAName?: string;
  playerBName?: string;
  compact?: boolean;
}

const STROKE_COLORS: Record<string, string> = {
  SMASH: '#ef4444',      // Đỏ rực
  DROP: '#06b6d4',       // Cyan
  CLEAR: '#eab308',      // Vàng amber
  SERVE: '#10b981',      // Xanh emerald
  LIFT: '#8b5cf6',       // Tím violet
  DRIVE: '#ec4899',      // Hồng pink
  NET_SHOT: '#3b82f6',   // Xanh dương
  NET_ATTACK: '#f97316', // Cam rực
  UNKNOWN: '#6b7280'     // Xám
};

const STROKE_VIETNAMESE: Record<string, string> = {
  SMASH: 'Đập cầu (Smash)',
  DROP: 'Bỏ nhỏ (Drop)',
  CLEAR: 'Phông cầu (Clear)',
  SERVE: 'Giao cầu (Serve)',
  LIFT: 'Hất cầu (Lift)',
  DRIVE: 'Tạt cầu (Drive)',
  NET_SHOT: 'Kéo lưới (Net Shot)',
  NET_ATTACK: 'Vồ lưới (Net Attack)',
  UNKNOWN: 'Khác'
};

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
  stats,
  playerAName = 'Player A',
  playerBName = 'Player B',
  compact = false
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [patternGram, setPatternGram] = useState<'3GRAM' | '2GRAM'>('3GRAM');

  // Chuẩn bị dữ liệu biểu đồ tròn phân bố cú đánh
  const distribution = stats.strokeDistribution || {};
  const strokeEntries = Object.entries(distribution)
    .sort((a, b) => b[1] - a[1]);

  const totalDistributedStrokes = strokeEntries.reduce((sum, item) => sum + item[1], 0) || stats.totalStrokes || 1;

  // Tính toán các lát cắt hình tròn SVG Donut Chart
  let accumulatedAngle = 0;
  const slices = strokeEntries.map(([stroke, count]) => {
    const percentage = (count / totalDistributedStrokes);
    const angle = percentage * 360;
    const startAngle = accumulatedAngle;
    accumulatedAngle += angle;
    return {
      stroke,
      count,
      percentage: Math.round(percentage * 1000) / 10,
      startAngle,
      angle,
      color: STROKE_COLORS[stroke.toUpperCase()] || '#94a3b8'
    };
  });

  // Helper chuyển góc polar sang tọa độ cartesian cho SVG
  const polarToCartesian = (centerX: number, centerY: number, radius: number, angleInDegrees: number) => {
    const angleInRadians = ((angleInDegrees - 90) * Math.PI) / 180.0;
    return {
      x: centerX + radius * Math.cos(angleInRadians),
      y: centerY + radius * Math.sin(angleInRadians)
    };
  };

  const createSvgArc = (x: number, y: number, radius: number, innerRadius: number, startAngle: number, endAngle: number) => {
    // Tránh lỗi cung 360 độ hoàn toàn bị chập đầu đuôi
    const adjustedEndAngle = Math.min(endAngle, startAngle + 359.99);
    const start = polarToCartesian(x, y, radius, adjustedEndAngle);
    const end = polarToCartesian(x, y, radius, startAngle);
    const innerStart = polarToCartesian(x, y, innerRadius, startAngle);
    const innerEnd = polarToCartesian(x, y, innerRadius, adjustedEndAngle);

    const arcSweep = adjustedEndAngle - startAngle <= 180 ? '0' : '1';

    return [
      `M ${start.x} ${start.y}`,
      `A ${radius} ${radius} 0 ${arcSweep} 0 ${end.x} ${end.y}`,
      `L ${innerStart.x} ${innerStart.y}`,
      `A ${innerRadius} ${innerRadius} 0 ${arcSweep} 1 ${innerEnd.x} ${innerEnd.y}`,
      'Z'
    ].join(' ');
  };

  // Tính toán tỷ lệ đối đầu Người chơi A & B
  const playerAStrokes = stats.playerAStrokes || Math.round(stats.totalStrokes / 2);
  const playerBStrokes = stats.playerBStrokes || (stats.totalStrokes - playerAStrokes);
  const playerAPercent = Math.round((playerAStrokes / (stats.totalStrokes || 1)) * 100);
  const playerBPercent = 100 - playerAPercent;

  // Thuận tay vs Trái tay (Gộp Around the head vào Thuận tay / Forehand vì bản chất cơ học là forehand)
  const effectiveForehand = (stats.forehandCount || 0) + (stats.aroundheadCount || 0);
  const effectiveBackhand = stats.backhandCount || 0;
  const knownHandedness = effectiveForehand + effectiveBackhand;
  const forehandPct = knownHandedness > 0 ? Math.round((effectiveForehand / knownHandedness) * 100) : 0;
  const backhandPct = knownHandedness > 0 ? (100 - forehandPct) : 0;
  const hasHandednessData = knownHandedness > 0;

  return (
    <div className="space-y-5 pb-4 text-white animate-fade-in">
      {/* 1. KEY OVERVIEW METRICS CARDS */}
      <div className={`grid ${compact ? 'grid-cols-2 gap-2.5' : 'grid-cols-2 md:grid-cols-4 gap-3'}`}>
        <div className="p-3.5 rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-lg relative overflow-hidden group hover:border-brand/40 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-brand/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold mb-1.5">
            <span>Tổng cú đánh</span>
            <Activity className="w-4 h-4 text-brand" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-white tracking-tight">
            {stats.totalStrokes}
          </div>
          <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
            <span>Toàn trận</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-lg relative overflow-hidden group hover:border-amber-400/40 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold mb-1.5">
            <span>Số pha cầu</span>
            <Trophy className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-amber-300 tracking-tight">
            {stats.totalRallies}
          </div>
          <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
            <span>Pha trọn vẹn</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-lg relative overflow-hidden group hover:border-emerald-400/40 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold mb-1.5">
            <span>Cú đánh TB/pha</span>
            <BarChart3 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-emerald-300 tracking-tight">
            {typeof stats.avgStrokesPerRally === 'number' ? stats.avgStrokesPerRally.toFixed(1) : stats.avgStrokesPerRally}
          </div>
          <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
            <span>Mức giằng co</span>
          </div>
        </div>

        <div className="p-3.5 rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-lg relative overflow-hidden group hover:border-cyan-400/40 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-white/50 text-xs font-semibold mb-1.5">
            <span>Độ tự tin TB</span>
            <Sparkles className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-cyan-300 tracking-tight">
            {(stats.avgConfidence * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-white/40 mt-1 flex items-center gap-1">
            <span>CoachAI+ Vision</span>
          </div>
        </div>
      </div>

      {/* 2. MAIN VISUALIZATION: STROKE DISTRIBUTION (DONUT) & PLAYER HEAD-TO-HEAD */}
      <div className={`grid ${compact ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-12 gap-5'}`}>
        
        {/* DONUT CHART: PHÂN BỐ CÚ ĐÁNH */}
        <div className={`${compact ? '' : 'lg:col-span-7'} p-4 rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-xl flex flex-col`}>
          <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-brand" />
              <h3 className="font-bold text-xs lg:text-sm text-white">Phân bố các loại cú đánh</h3>
            </div>
            <span className="text-[11px] text-white/40 bg-white/5 px-2 py-0.5 rounded-full border border-white/5 font-mono">
              {stats.totalStrokes} cú
            </span>
          </div>

          <div className={`flex ${compact ? 'flex-col' : 'flex-col md:flex-row'} items-center gap-4 flex-1`}>
            {/* SVG Interactive Donut Chart */}
            <div className="relative w-40 h-40 flex-shrink-0 flex items-center justify-center my-1">
              <svg viewBox="0 0 200 200" className="w-full h-full transform -rotate-90">
                {slices.map((slice) => {
                  const isHovered = hoveredSlice === slice.stroke;
                  return (
                    <path
                      key={slice.stroke}
                      d={createSvgArc(100, 100, isHovered ? 92 : 88, 56, slice.startAngle, slice.startAngle + slice.angle)}
                      fill={slice.color}
                      className="cursor-pointer transition-all duration-300 ease-out"
                      style={{
                        filter: isHovered ? `drop-shadow(0 0 8px ${slice.color})` : 'none',
                        opacity: hoveredSlice && !isHovered ? 0.45 : 1
                      }}
                      onMouseEnter={() => setHoveredSlice(slice.stroke)}
                      onMouseLeave={() => setHoveredSlice(null)}
                    />
                  );
                })}
              </svg>

              {/* Tâm Donut hiển thị Stroke đang hover hoặc Total */}
              <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
                {hoveredSlice ? (
                  <>
                    <span className="text-[10px] text-white/60 uppercase tracking-wider font-semibold">
                      {hoveredSlice}
                    </span>
                    <span className="text-xl font-black text-white">
                      {slices.find(s => s.stroke === hoveredSlice)?.count || 0}
                    </span>
                    <span className="text-[10px] text-brand font-bold">
                      {slices.find(s => s.stroke === hoveredSlice)?.percentage}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] text-white/50 uppercase tracking-wider font-semibold">CÚ ĐÁNH</span>
                    <span className="text-2xl font-black text-white">{stats.totalStrokes}</span>
                    <span className="text-[9px] text-emerald-400 font-semibold">100% Ghi nhận</span>
                  </>
                )}
              </div>
            </div>

            {/* Bảng chú giải Stroke Legend kèm tỉ lệ */}
            <div className="grid grid-cols-2 gap-1.5 flex-1 w-full text-[11px]">
              {slices.map((slice) => {
                const isHovered = hoveredSlice === slice.stroke;
                return (
                  <div
                    key={slice.stroke}
                    onMouseEnter={() => setHoveredSlice(slice.stroke)}
                    onMouseLeave={() => setHoveredSlice(null)}
                    className={`p-1.5 px-2 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isHovered 
                        ? 'bg-white/10 border-white/30 scale-[1.02]' 
                        : 'bg-white/[0.03] border-white/5 hover:bg-white/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: slice.color, boxShadow: isHovered ? `0 0 6px ${slice.color}` : 'none' }}
                      />
                      <span className="truncate font-medium text-white/90">
                        {STROKE_VIETNAMESE[slice.stroke.toUpperCase()] || slice.stroke}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      <span className="font-bold text-white font-mono">{slice.count}</span>
                      <span className="text-[9px] text-white/40 font-mono">({slice.percentage}%)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* PLAYER HEAD-TO-HEAD & HANDEDNESS RATIO */}
        <div className={`${compact ? '' : 'lg:col-span-5'} space-y-4 min-w-0`}>
          {/* Đối đầu Người chơi A vs B */}
          <div className={`${compact ? 'p-4' : 'p-5'} rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-xl`}>
            <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-400" />
                <h3 className="font-bold text-xs lg:text-sm text-white">So sánh khối lượng cú đánh</h3>
              </div>
              <span className="text-[11px] text-white/40">Upper vs Lower</span>
            </div>

            {/* Tên và số liệu 2 người chơi */}
            <div className="flex items-center justify-between mb-2 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-brand min-w-0">
                <span className="w-2 h-2 rounded-full bg-brand shrink-0" />
                <span className="truncate max-w-[110px]">{playerAName}</span>
                <span className="font-bold text-white font-mono shrink-0">({playerAStrokes})</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-400 min-w-0">
                <span className="font-bold text-white font-mono shrink-0">({playerBStrokes})</span>
                <span className="truncate max-w-[110px]">{playerBName}</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              </div>
            </div>

            {/* Thanh so sánh tương quan */}
            <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden flex p-0.5 border border-white/10">
              <div 
                className="h-full bg-gradient-to-r from-blue-600 to-brand rounded-l-full transition-all duration-500" 
                style={{ width: `${playerAPercent}%` }}
              />
              <div 
                className="h-full bg-gradient-to-r from-amber-500 to-amber-300 rounded-r-full transition-all duration-500" 
                style={{ width: `${playerBPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-white/50 mt-1.5 font-mono">
              <span>{playerAPercent}% khối lượng</span>
              <span>{playerBPercent}% khối lượng</span>
            </div>
          </div>

          {/* Kỹ thuật tay cầm vợt (Forehand vs Backhand vs Around-head) */}
          <div className={`${compact ? 'p-4' : 'p-5'} rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-xl`}>
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-400" />
                <h4 className="font-bold text-xs text-white uppercase tracking-wider">Kỹ thuật tay thực hiện</h4>
              </div>
              <span className="text-[11px] text-white/40 font-mono">Grip</span>
            </div>

            <div className="space-y-3">
              {/* Forehand */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/80">Thuận tay (Forehand)</span>
                  <span className="font-mono font-bold text-emerald-400">{effectiveForehand} ({forehandPct}%)</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${forehandPct}%` }} />
                </div>
              </div>

              {/* Backhand */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/80">Trái tay (Backhand)</span>
                  <span className="font-mono font-bold text-cyan-400">{effectiveBackhand} ({backhandPct}%)</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${backhandPct}%` }} />
                </div>
              </div>

              {!hasHandednessData && (
                <div className="pt-1.5 border-t border-white/5 text-[11px] text-white/40 italic flex items-center justify-between">
                  <span>* Chưa phát hiện dữ liệu góc mặt vợt (Grip)</span>
                  <span className="text-white/30 font-mono text-[10px]">{stats.totalStrokes} cú đánh UNKNOWN</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      {/* 3. BIỂU ĐỒ CỘT DỌC & BẢNG PHÂN TÍCH ĐỊNH LƯỢNG CHI TIẾT CÚ ĐÁNH */}
      {slices.length > 0 && (() => {
        const maxCount = Math.max(...slices.map(s => s.count), 1);
        return (
          <div className={`grid ${compact ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-12 gap-5'}`}>
            {/* Biểu đồ Cột dọc (Vertical Column Chart) */}
            <div className={`${compact ? '' : 'lg:col-span-6'} p-4 rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-xl`}>
              <div className="flex items-center justify-between mb-4 border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-emerald-400" />
                  <h3 className="font-bold text-xs lg:text-sm text-white">Biểu Đồ Cột Tần Suất Cú Đánh</h3>
                </div>
                <span className="text-[10px] text-white/40 font-mono">Đơn vị: số cú đánh</span>
              </div>

              <div className="h-44 flex items-end justify-between gap-2 pt-6 pb-2 px-2 border-b border-white/10">
                {slices.map((sl) => {
                  const heightPct = Math.max(Math.round((sl.count / maxCount) * 100), 8);
                  return (
                    <div
                      key={sl.stroke}
                      className="flex-1 flex flex-col items-center justify-end h-full group"
                    >
                      <span className="text-[10px] font-mono font-bold text-white mb-1 opacity-85 group-hover:opacity-100">
                        {sl.count}
                      </span>
                      <div
                        className="w-full max-w-[34px] rounded-t-xl transition-all duration-500 group-hover:brightness-125"
                        style={{
                          height: `${heightPct}%`,
                          backgroundColor: sl.color,
                          boxShadow: `0 0 12px ${sl.color}40`,
                        }}
                        title={`${STROKE_VIETNAMESE[sl.stroke.toUpperCase()] || sl.stroke}: ${sl.count} cú (${sl.percentage}%)`}
                      />
                    </div>
                  );
                })}
              </div>
              <div className="flex items-center justify-between gap-2 pt-2 px-1">
                {slices.map((sl) => (
                  <div key={sl.stroke} className="flex-1 text-center truncate">
                    <span className="text-[9px] font-mono font-semibold text-white/70 uppercase">
                      {sl.stroke.replace('_', ' ')}
                    </span>
                  </div>
                ))}
              </div>
            </div>

            {/* Bảng thống kê định lượng chi tiết theo loại cú đánh */}
            <div className={`${compact ? '' : 'lg:col-span-6'} p-4 rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-xl`}>
              <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5">
                <div className="flex items-center gap-2">
                  <Activity className="w-4 h-4 text-sky-400" />
                  <h3 className="font-bold text-xs lg:text-sm text-white">Bảng Phân Tích Định Lượng Cú Đánh</h3>
                </div>
                <span className="text-[10px] text-white/40 font-mono">Chi tiết tỷ trọng</span>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 uppercase text-[10px]">
                      <th className="pb-2">Loại Cú Đánh</th>
                      <th className="pb-2 text-right">Số Lượng</th>
                      <th className="pb-2 text-right">Tỷ Lệ</th>
                      <th className="pb-2 pl-3">Thanh Tỷ Trọng</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {slices.map((sl) => (
                      <tr key={sl.stroke} className="hover:bg-white/[0.03]">
                        <td className="py-2 font-medium text-white flex items-center gap-1.5">
                          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: sl.color }} />
                          <span className="truncate">{STROKE_VIETNAMESE[sl.stroke.toUpperCase()] || sl.stroke}</span>
                        </td>
                        <td className="py-2 text-right font-mono font-bold text-white">{sl.count}</td>
                        <td className="py-2 text-right font-mono text-sky-300">{sl.percentage}%</td>
                        <td className="py-2 pl-3 w-24">
                          <div className="w-full h-1.5 rounded-full bg-white/5 overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{ width: `${sl.percentage}%`, backgroundColor: sl.color }}
                            />
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 4. BIỂU ĐỒ RADAR NGŨ GIÁC 5 TRỤC ĐỐI ĐẦU (5-AXIS PENTAGON RADAR CHART) */}
      {stats.radarChart?.axes && stats.radarChart.axes.length >= 3 && (() => {
        const axes = stats.radarChart!.axes;
        const upperVals = stats.radarChart!.upper || [];
        const lowerVals = stats.radarChart!.lower || [];
        const numAxes = axes.length;
        const center = 110;
        const maxR = 75;

        const axisNameVi: Record<string, string> = {
          'Attack Stroke Share': 'Tấn công',
          'Defensive Stroke Share': 'Phòng thủ',
          'Net Stroke Share': 'Gài lưới',
          'Shot Variety': 'Đa dạng đòn',
          'Mean Model Confidence': 'Độ tự tin AI',
          'Fast Stroke Share': 'Nhịp độ nhanh',
          attack: 'Tấn công',
          defense: 'Phòng thủ',
          net_play: 'Gài lưới',
          consistency: 'Độ tự tin AI',
          variation: 'Đa dạng đòn',
          pace: 'Nhịp độ nhanh',
        };

        const getPoint = (idx: number, val: number) => {
          const angle = (Math.PI * 2 * idx) / numAxes - Math.PI / 2;
          const r = (Math.min(Math.max(val, 0), 100) / 100) * maxR;
          return {
            x: center + r * Math.cos(angle),
            y: center + r * Math.sin(angle),
          };
        };

        const upperPolygon = axes.map((_, i) => {
          const pt = getPoint(i, upperVals[i] ?? 70);
          return `${pt.x},${pt.y}`;
        }).join(' ');

        const lowerPolygon = axes.map((_, i) => {
          const pt = getPoint(i, lowerVals[i] ?? 70);
          return `${pt.x},${pt.y}`;
        }).join(' ');

        return (
          <div className={`${compact ? 'p-4' : 'p-5'} rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-xl`}>
            <div className="flex items-center justify-between mb-3 border-b border-white/5 pb-2.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="font-bold text-xs lg:text-sm text-white">
                  Biểu Đồ Radar {numAxes} Trục Chỉ Số Chiến Thuật
                </h3>
              </div>
              <div className="flex items-center gap-3 text-[11px]">
                <span className="flex items-center gap-1.5 text-sky-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-sm bg-sky-400 inline-block" />
                  {playerAName}
                </span>
                <span className="flex items-center gap-1.5 text-amber-400 font-semibold">
                  <span className="w-2.5 h-2.5 rounded-sm bg-amber-400 inline-block" />
                  {playerBName}
                </span>
              </div>
            </div>

            <div className={`grid ${compact ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-12 gap-4'} items-center`}>
              <div className={`${compact ? '' : 'md:col-span-6'} flex justify-center`}>
                <svg viewBox="0 0 220 220" className="w-52 h-52">
                  {/* Lưới đa giác đồng tâm (25%, 50%, 75%, 100%) */}
                  {[25, 50, 75, 100].map((lv) => {
                    const pts = axes
                      .map((_, i) => {
                        const p = getPoint(i, lv);
                        return `${p.x},${p.y}`;
                      })
                      .join(' ');
                    return (
                      <polygon
                        key={lv}
                        points={pts}
                        fill="none"
                        stroke="rgba(255,255,255,0.12)"
                        strokeWidth="1"
                      />
                    );
                  })}

                  {/* Trục nối từ tâm ra đỉnh */}
                  {axes.map((ax, i) => {
                    const outer = getPoint(i, 100);
                    const labelPt = getPoint(i, 122);
                    return (
                      <g key={ax}>
                        <line
                          x1={center}
                          y1={center}
                          x2={outer.x}
                          y2={outer.y}
                          stroke="rgba(255,255,255,0.15)"
                          strokeWidth="1"
                        />
                        <text
                          x={labelPt.x}
                          y={labelPt.y}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill="#cbd5e1"
                          fontSize="8.5"
                          fontWeight="bold"
                        >
                          {axisNameVi[ax] || ax}
                        </text>
                      </g>
                    );
                  })}

                  {/* Đa giác Player A (Upper) */}
                  <polygon
                    points={upperPolygon}
                    fill="rgba(56, 189, 248, 0.28)"
                    stroke="#38bdf8"
                    strokeWidth="2"
                  />

                  {/* Đa giác Player B (Lower) */}
                  <polygon
                    points={lowerPolygon}
                    fill="rgba(251, 191, 36, 0.25)"
                    stroke="#fbbf24"
                    strokeWidth="2"
                  />
                </svg>
              </div>

              {/* Bảng điểm 5 trục đối đầu */}
              <div className={`${compact ? '' : 'md:col-span-6'} overflow-x-auto`}>
                <table className="w-full text-left text-[11px]">
                  <thead>
                    <tr className="border-b border-white/10 text-white/50 uppercase text-[10px]">
                      <th className="pb-1.5">Chỉ Số</th>
                      <th className="pb-1.5 text-right text-sky-400">{playerAName}</th>
                      <th className="pb-1.5 text-right text-amber-400">{playerBName}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {axes.map((ax, i) => (
                      <tr key={ax}>
                        <td className="py-1.5 font-medium text-white/90">{axisNameVi[ax] || ax}</td>
                        <td className="py-1.5 text-right font-mono font-bold text-sky-300">
                          {upperVals[i] ?? 70}/100
                        </td>
                        <td className="py-1.5 text-right font-mono font-bold text-amber-300">
                          {lowerVals[i] ?? 70}/100
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. COACHAI+ 2.0 RADAR & TACTICAL INSIGHTS */}
      {stats.coachInsights?.insights && stats.coachInsights.insights.length > 0 && (
        <div className={`${compact ? 'p-4' : 'p-5'} rounded-2xl bg-gradient-to-r from-blue-950/40 via-[#111c30]/90 to-cyan-950/40 border border-brand/20 shadow-xl`}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-400 shrink-0" />
            <h3 className="font-bold text-xs lg:text-sm text-white">Nhận định chuyên môn AI (CoachAI+ Insights)</h3>
          </div>

          <div className={`grid ${compact ? 'grid-cols-1 gap-2.5' : 'grid-cols-1 md:grid-cols-2 gap-3'}`}>
            {stats.coachInsights.insights.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-white/[0.04] border border-white/10 flex items-start gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-brand/10 border border-brand/20 text-brand shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-white uppercase tracking-wider bg-white/10 px-2 py-0.5 rounded-md border border-white/5">
                      {item.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-white/10 text-white/80 font-medium truncate max-w-[150px]">
                      Mục tiêu: {item.target === 'upper' ? playerAName : playerBName}
                    </span>
                  </div>
                  <p className="text-[11px] text-white/80 leading-relaxed break-words">
                    {item.insight}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. TACTICAL PATTERNS (3-GRAM & 2-GRAM COMBINATIONS) */}
      {stats.tacticalPatterns && (() => {
        const list3Gram = stats.tacticalPatterns.top_sequences_3gram || [];
        const list2Gram = stats.tacticalPatterns.top_transitions_2gram || [];
        const activeList = (patternGram === '3GRAM' && list3Gram.length > 0) ? list3Gram : list2Gram;

        if (list3Gram.length === 0 && list2Gram.length === 0) return null;

        return (
          <div className={`${compact ? 'p-4' : 'p-5'} rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-xl`}>
            <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-400 shrink-0" />
                <h3 className="font-bold text-xs lg:text-sm text-white">
                  Chuỗi phối hợp chiến thuật phổ biến
                </h3>
              </div>

              {/* Tab Selector: 3-Gram vs 2-Gram */}
              <div className="flex items-center gap-1 bg-black/40 p-1 rounded-xl border border-white/5 text-[11px]">
                {list3Gram.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPatternGram('3GRAM')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      patternGram === '3GRAM'
                        ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 shadow-sm'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Chuỗi 3 đòn liên hoàn (3-Gram)
                  </button>
                )}
                {list2Gram.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPatternGram('2GRAM')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      patternGram === '2GRAM' || list3Gram.length === 0
                        ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30 shadow-sm'
                        : 'text-white/40 hover:text-white/80'
                    }`}
                  >
                    Cặp chuyển tiếp 2 đòn (2-Gram)
                  </button>
                )}
              </div>
            </div>

            <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3'}`}>
              {activeList.map((trans: any, idx: number) => {
                const rawSeq = trans.sequence || '';
                const parts = rawSeq
                  ? rawSeq.split('->').map((s: string) => s.trim().toUpperCase())
                  : [trans.from, trans.to].filter(Boolean).map((s: string) => s.toUpperCase());

                return (
                  <div key={idx} className="p-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between min-w-0 hover:border-white/10 transition-colors">
                    <div className="flex items-center gap-1.5 text-xs min-w-0 flex-wrap">
                      {parts.map((stroke: string, pIdx: number) => {
                        const color = STROKE_COLORS[stroke] || '#38bdf8';
                        return (
                          <React.Fragment key={pIdx}>
                            {pIdx > 0 && <span className="text-white/40 text-[10px] shrink-0">➜</span>}
                            <span
                              className="px-2 py-0.5 rounded-lg border font-bold uppercase text-[10px] sm:text-[11px] shrink-0 shadow-sm"
                              style={{
                                backgroundColor: `${color}22`,
                                borderColor: `${color}55`,
                                color: color
                              }}
                            >
                              {stroke.replace('_', ' ')}
                            </span>
                          </React.Fragment>
                        );
                      })}
                    </div>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0 ml-2">
                      {trans.count} lần
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })()}
    </div>
  );
};
