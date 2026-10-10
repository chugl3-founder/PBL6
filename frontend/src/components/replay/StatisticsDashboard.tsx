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
    top_transitions_2gram?: Array<{ from: string; to: string; count: number }>;
    estimated_winning_combinations?: {
      upper: string[][];
      lower: string[][];
    };
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

  // Thuận tay vs Trái tay vs Khác
  const totalHandedness = (stats.forehandCount + stats.backhandCount + stats.aroundheadCount) || stats.totalStrokes || 1;
  const forehandPct = Math.round((stats.forehandCount / totalHandedness) * 100);
  const backhandPct = Math.round((stats.backhandCount / totalHandedness) * 100);
  const aroundheadPct = 100 - forehandPct - backhandPct;

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

            <div className="space-y-2.5">
              {/* Forehand */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/80">Thuận tay (Forehand)</span>
                  <span className="font-mono font-bold text-emerald-400">{stats.forehandCount} ({forehandPct}%)</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${forehandPct}%` }} />
                </div>
              </div>

              {/* Backhand */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/80">Trái tay (Backhand)</span>
                  <span className="font-mono font-bold text-cyan-400">{stats.backhandCount} ({backhandPct}%)</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${backhandPct}%` }} />
                </div>
              </div>

              {/* Around the head */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-white/80">Vòng đầu (Around the head)</span>
                  <span className="font-mono font-bold text-purple-400">{stats.aroundheadCount} ({aroundheadPct}%)</span>
                </div>
                <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden">
                  <div className="h-full bg-purple-400 rounded-full transition-all duration-500" style={{ width: `${aroundheadPct}%` }} />
                </div>
              </div>
            </div>
          </div>

        </div>
      </div>

      {/* 3. COACHAI+ 2.0 RADAR & TACTICAL INSIGHTS */}
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

      {/* 4. TACTICAL PATTERNS (2-GRAM COMBINATIONS) */}
      {stats.tacticalPatterns?.top_transitions_2gram && stats.tacticalPatterns.top_transitions_2gram.length > 0 && (
        <div className={`${compact ? 'p-4' : 'p-5'} rounded-2xl bg-[#111c30]/90 border border-white/10 shadow-xl`}>
          <div className="flex items-center gap-2 mb-3">
            <Award className="w-4 h-4 text-emerald-400 shrink-0" />
            <h3 className="font-bold text-xs lg:text-sm text-white">Chuỗi phối hợp chiến thuật phổ biến</h3>
          </div>

          <div className={`grid ${compact ? 'grid-cols-1 gap-2' : 'grid-cols-1 sm:grid-cols-3 gap-3'}`}>
            {stats.tacticalPatterns.top_transitions_2gram.map((trans, idx) => (
              <div key={idx} className="p-2.5 px-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between min-w-0">
                <div className="flex items-center gap-2 text-xs min-w-0">
                  <span className="px-2 py-0.5 rounded-lg bg-blue-500/15 border border-blue-500/30 font-bold uppercase text-blue-400 text-[11px] shrink-0">
                    {trans.from}
                  </span>
                  <span className="text-white/40 text-[11px] shrink-0">➜</span>
                  <span className="px-2 py-0.5 rounded-lg bg-amber-500/15 border border-amber-500/30 font-bold uppercase text-amber-400 text-[11px] shrink-0">
                    {trans.to}
                  </span>
                </div>
                <span className="text-[11px] font-mono font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0 ml-2">
                  {trans.count} lần
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
