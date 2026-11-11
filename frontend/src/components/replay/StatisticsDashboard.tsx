import React, { useState } from 'react';
import { 
  BarChart3, Trophy, Flame,
  Sparkles, Award, Lightbulb, Activity,
  PieChart as PieIcon, Users, Target
} from 'lucide-react';
import { TacticsBreakdown, StructuredTacticsData } from './TacticsBreakdown';

interface CoachInsight {
  target: string;
  category: string;
  insight: string;
}

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
    /** 'percent_of_rally_strokes' since the style radar was rebuilt; older analyses have no unit. */
    unit?: string;
    extra?: Record<string, { rally_strokes?: number; stroke_types_used?: number; median_flight_seconds?: number | null }>;
  };
  // The AI pipeline stores a plain list; older/mock analyses wrap it in { insights }.
  coachInsights?: CoachInsight[] | { insights: CoachInsight[] };
  tacticalPatterns?: {
    top_transitions_2gram?: Array<{ sequence?: string; from?: string; to?: string; count: number }>;
    top_sequences_3gram?: Array<{ sequence?: string; count: number }>;
    estimated_winning_combinations?: Record<string, any>;
  };
  structuredTactics?: StructuredTacticsData | null;
}

interface StatisticsDashboardProps {
  stats: MatchStatisticsData;
  playerAName?: string;
  playerBName?: string;
  /** Which player stands on the upper half of the video ('PLAYER_A' | 'PLAYER_B'). */
  upperPlayer?: string;
  compact?: boolean;
  /** Seek the replay video; enables "watch" buttons on tactic rallies. */
  onSeekTime?: (seconds: number, label: string) => void;
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

type DashboardTab = 'STROKES' | 'TACTICS' | 'STYLE';

const DASHBOARD_TABS: Array<{ key: DashboardTab; label: string; Icon: React.FC<{ className?: string }> }> = [
  { key: 'STROKES', label: 'Cú đánh', Icon: PieIcon },
  { key: 'TACTICS', label: 'Chiến thuật', Icon: Target },
  { key: 'STYLE', label: 'Phong cách & nhận định', Icon: Lightbulb }
];

const EmptyTab: React.FC<{ text: string }> = ({ text }) => (
  <div className="p-8 rounded-lg bg-sheet border border-ink/10 text-center text-xs text-ink/55">
    {text}
  </div>
);

export const StatisticsDashboard: React.FC<StatisticsDashboardProps> = ({
  stats,
  playerAName = 'Player A',
  playerBName = 'Player B',
  upperPlayer = 'PLAYER_A',
  compact = false,
  onSeekTime
}) => {
  const [hoveredSlice, setHoveredSlice] = useState<string | null>(null);
  const [patternGram, setPatternGram] = useState<'3GRAM' | '2GRAM'>('3GRAM');
  const [activeTab, setActiveTab] = useState<DashboardTab>('STROKES');
  // The sidebar (compact) has no room for tabs, so it shows every section.
  const showTab = (tab: DashboardTab) => compact || activeTab === tab;
  const coachInsights: CoachInsight[] = Array.isArray(stats.coachInsights)
    ? stats.coachInsights
    : stats.coachInsights?.insights || [];
  const hasStyleData = Boolean(
    (stats.radarChart?.axes && stats.radarChart.axes.length >= 3) || coachInsights.length > 0
  );
  // Insight targets are 'upper'/'lower' in older data and player names (or "General") otherwise.
  const insightTargetName = (target: string) =>
    target === 'upper' || target === 'lower'
      ? (target === 'upper') === (upperPlayer === 'PLAYER_A') ? playerAName : playerBName
      : target === 'General' ? 'Cả trận' : target;

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
    <div className="space-y-5 pb-4 text-ink animate-fade-in">
      {/* 1. KEY OVERVIEW METRICS CARDS */}
      <div className={`grid ${compact ? 'grid-cols-2 gap-2.5' : 'grid-cols-2 md:grid-cols-4 gap-3'}`}>
        <div className="p-3.5 rounded-lg bg-sheet border border-ink/10 relative overflow-hidden group hover:border-pitch/40 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-pitch/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-ink/55 text-xs font-semibold mb-1.5">
            <span>Tổng cú đánh</span>
            <Activity className="w-4 h-4 text-pitch" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-ink tracking-tight">
            {stats.totalStrokes}
          </div>
          <div className="text-[10px] text-ink/50 mt-1 flex items-center gap-1">
            <span>Toàn trận</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-sheet border border-ink/10 relative overflow-hidden group hover:border-amber-400/40 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-amber-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-ink/55 text-xs font-semibold mb-1.5">
            <span>Số pha cầu</span>
            <Trophy className="w-4 h-4 text-amber-700" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-amber-700 tracking-tight">
            {stats.totalRallies}
          </div>
          <div className="text-[10px] text-ink/50 mt-1 flex items-center gap-1">
            <span>Pha trọn vẹn</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-sheet border border-ink/10 relative overflow-hidden group hover:border-emerald-400/40 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-ink/55 text-xs font-semibold mb-1.5">
            <span>Cú đánh TB/pha</span>
            <BarChart3 className="w-4 h-4 text-emerald-700" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-emerald-700 tracking-tight">
            {typeof stats.avgStrokesPerRally === 'number' ? stats.avgStrokesPerRally.toFixed(1) : stats.avgStrokesPerRally}
          </div>
          <div className="text-[10px] text-ink/50 mt-1 flex items-center gap-1">
            <span>Mức giằng co</span>
          </div>
        </div>

        <div className="p-3.5 rounded-lg bg-sheet border border-ink/10 relative overflow-hidden group hover:border-cyan-400/40 transition-all">
          <div className="absolute top-0 right-0 w-20 h-20 bg-cyan-500/10 rounded-full blur-xl pointer-events-none" />
          <div className="flex items-center justify-between text-ink/55 text-xs font-semibold mb-1.5">
            <span>Độ tự tin TB</span>
            <Sparkles className="w-4 h-4 text-cyan-700" />
          </div>
          <div className="text-2xl lg:text-3xl font-black text-cyan-700 tracking-tight">
            {(stats.avgConfidence * 100).toFixed(1)}%
          </div>
          <div className="text-[10px] text-ink/50 mt-1 flex items-center gap-1">
            <span>CoachAI+ Vision</span>
          </div>
        </div>
      </div>

      {/* TAB CHUYỂN NHÓM PHÂN TÍCH */}
      {!compact && (
        <div className="flex items-center gap-1 bg-ink/[0.04] p-1 rounded-lg border border-ink/10 text-xs w-full sm:w-fit overflow-x-auto">
          {DASHBOARD_TABS.map(({ key, label, Icon }) => (
            <button
              key={key}
              type="button"
              onClick={() => setActiveTab(key)}
              className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl font-bold whitespace-nowrap transition-all ${
                activeTab === key
                  ? 'bg-pitch text-white '
                  : 'text-ink/55 hover:text-ink hover:bg-ink/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {label}
            </button>
          ))}
        </div>
      )}

      {/* 2. MAIN VISUALIZATION: STROKE DISTRIBUTION (DONUT) & PLAYER HEAD-TO-HEAD */}
      {showTab('STROKES') && (
      <div className={`grid ${compact ? 'grid-cols-1 gap-4' : 'grid-cols-1 lg:grid-cols-12 gap-5'}`}>
        
        {/* DONUT CHART: PHÂN BỐ CÚ ĐÁNH */}
        <div className={`${compact ? '' : 'lg:col-span-7'} p-4 rounded-lg bg-sheet border border-ink/10 flex flex-col`}>
          <div className="flex items-center justify-between mb-3 border-b border-ink/10 pb-2.5">
            <div className="flex items-center gap-2">
              <PieIcon className="w-4 h-4 text-pitch" />
              <h3 className="font-bold text-xs lg:text-sm text-ink">Phân bố các loại cú đánh</h3>
            </div>
            <span className="text-[11px] text-ink/50 bg-ink/[0.04] px-2 py-0.5 rounded-full border border-ink/10 tabular-nums">
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
                    <span className="text-[10px] text-ink/60 font-semibold">
                      {hoveredSlice}
                    </span>
                    <span className="text-xl font-black text-ink">
                      {slices.find(s => s.stroke === hoveredSlice)?.count || 0}
                    </span>
                    <span className="text-[10px] text-pitch font-bold">
                      {slices.find(s => s.stroke === hoveredSlice)?.percentage}%
                    </span>
                  </>
                ) : (
                  <>
                    <span className="text-[9px] text-ink/55 font-semibold">CÚ ĐÁNH</span>
                    <span className="text-2xl font-black text-ink">{stats.totalStrokes}</span>
                    <span className="text-[9px] text-emerald-700 font-semibold">100% Ghi nhận</span>
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
                        ? 'bg-ink/[0.06] border-ink/20 scale-[1.02]' 
                        : 'bg-ink/[0.03] border-ink/10 hover:bg-ink/[0.06]'
                    }`}
                  >
                    <div className="flex items-center gap-1.5 overflow-hidden">
                      <span 
                        className="w-2 h-2 rounded-full flex-shrink-0" 
                        style={{ backgroundColor: slice.color, boxShadow: isHovered ? `0 0 6px ${slice.color}` : 'none' }}
                      />
                      <span className="truncate font-medium text-ink/85">
                        {STROKE_VIETNAMESE[slice.stroke.toUpperCase()] || slice.stroke}
                      </span>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-1">
                      <span className="font-bold text-ink tabular-nums">{slice.count}</span>
                      <span className="text-[9px] text-ink/50 tabular-nums">({slice.percentage}%)</span>
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
          <div className={`${compact ? 'p-4' : 'p-5'} rounded-lg bg-sheet border border-ink/10 `}>
            <div className="flex items-center justify-between mb-4 border-b border-ink/10 pb-3">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-amber-700" />
                <h3 className="font-bold text-xs lg:text-sm text-ink">So sánh khối lượng cú đánh</h3>
              </div>
              <span className="text-[11px] text-ink/50">Upper vs Lower</span>
            </div>

            {/* Tên và số liệu 2 người chơi */}
            <div className="flex items-center justify-between mb-2 text-xs font-semibold">
              <div className="flex items-center gap-1.5 text-pitch min-w-0">
                <span className="w-2 h-2 rounded-full bg-pitch shrink-0" />
                <span className="truncate max-w-[110px]">{playerAName}</span>
                <span className="font-bold text-ink tabular-nums shrink-0">({playerAStrokes})</span>
              </div>
              <div className="flex items-center gap-1.5 text-amber-700 min-w-0">
                <span className="font-bold text-ink tabular-nums shrink-0">({playerBStrokes})</span>
                <span className="truncate max-w-[110px]">{playerBName}</span>
                <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              </div>
            </div>

            {/* Thanh so sánh tương quan */}
            <div className="h-2.5 w-full bg-ink/[0.04] rounded-full overflow-hidden flex p-0.5 border border-ink/10">
              <div 
                className="h-full bg-pitch rounded-l-full transition-all duration-500" 
                style={{ width: `${playerAPercent}%` }}
              />
              <div 
                className="h-full rounded-r-full transition-all duration-500" 
                style={{ width: `${playerBPercent}%` }}
              />
            </div>

            <div className="flex justify-between items-center text-[10px] text-ink/55 mt-1.5 tabular-nums">
              <span>{playerAPercent}% khối lượng</span>
              <span>{playerBPercent}% khối lượng</span>
            </div>
          </div>

          {/* Kỹ thuật tay cầm vợt (Forehand vs Backhand vs Around-head) */}
          <div className={`${compact ? 'p-4' : 'p-5'} rounded-lg bg-sheet border border-ink/10 `}>
            <div className="flex items-center justify-between mb-3 border-b border-ink/10 pb-2">
              <div className="flex items-center gap-2">
                <Flame className="w-4 h-4 text-emerald-700" />
                <h4 className="font-bold text-xs text-ink">Kỹ thuật tay thực hiện</h4>
              </div>
              <span className="text-[11px] text-ink/50 tabular-nums">Grip</span>
            </div>

            <div className="space-y-3">
              {/* Forehand */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink/75">Thuận tay (Forehand)</span>
                  <span className="tabular-nums font-bold text-emerald-700">{effectiveForehand} ({forehandPct}%)</span>
                </div>
                <div className="h-2 w-full bg-ink/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-emerald-400 rounded-full transition-all duration-500" style={{ width: `${forehandPct}%` }} />
                </div>
              </div>

              {/* Backhand */}
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-ink/75">Trái tay (Backhand)</span>
                  <span className="tabular-nums font-bold text-cyan-700">{effectiveBackhand} ({backhandPct}%)</span>
                </div>
                <div className="h-2 w-full bg-ink/[0.04] rounded-full overflow-hidden">
                  <div className="h-full bg-cyan-400 rounded-full transition-all duration-500" style={{ width: `${backhandPct}%` }} />
                </div>
              </div>

              {!hasHandednessData && (
                <div className="pt-1.5 border-t border-ink/10 text-[11px] text-ink/50 italic flex items-center justify-between">
                  <span>* Chưa phát hiện dữ liệu góc mặt vợt (Grip)</span>
                  <span className="text-ink/40 tabular-nums text-[10px]">{stats.totalStrokes} cú đánh UNKNOWN</span>
                </div>
              )}
            </div>
          </div>

        </div>
      </div>

      )}

      {showTab('STYLE') && !hasStyleData && (
        <EmptyTab text="Trận này chưa có dữ liệu phong cách & nhận định. Chạy lại phân tích AI để tạo." />
      )}

      {/* 4. PHONG CÁCH ĐÁNH: tỉ lệ 4 nhóm cú (cùng đơn vị %), cộng lại ~100% */}
      {showTab('STYLE') && stats.radarChart?.unit === 'percent_of_rally_strokes' && (() => {
        const radar = stats.radarChart!;
        const axes = radar.axes;
        const upperIsA = upperPlayer === 'PLAYER_A';
        const series = [
          { name: playerAName, color: upperIsA ? '#2B59C3' : '#C9701F', values: (upperIsA ? radar.upper : radar.lower) || [], extra: radar.extra?.[upperIsA ? 'upper' : 'lower'] },
          { name: playerBName, color: upperIsA ? '#C9701F' : '#2B59C3', values: (upperIsA ? radar.lower : radar.upper) || [], extra: radar.extra?.[upperIsA ? 'lower' : 'upper'] },
        ];
        const AXES: Record<string, { label: string; hint: string }> = {
          attack_share: { label: 'Tấn công', hint: 'đập, vồ lưới' },
          net_share: { label: 'Kéo lưới', hint: 'cú ngắn sát lưới' },
          defence_share: { label: 'Phòng thủ', hint: 'phông, hất cầu' },
          placement_share: { label: 'Điều cầu', hint: 'tạt, bỏ nhỏ' },
        };
        const numAxes = axes.length;
        const center = 130;
        const maxR = 82;
        const top = Math.max(...series.flatMap(sr => sr.values), 0);
        const scaleMax = Math.max(40, Math.ceil(top / 10) * 10);
        const point = (idx: number, val: number) => {
          const angle = (Math.PI * 2 * idx) / numAxes - Math.PI / 2;
          const r = (Math.min(Math.max(val, 0), scaleMax) / scaleMax) * maxR;
          return { x: center + r * Math.cos(angle), y: center + r * Math.sin(angle) };
        };
        // Fixed pixel gap between the outer ring and the axis names, so dots never sit on a label.
        const labelAt = (idx: number) => {
          const angle = (Math.PI * 2 * idx) / numAxes - Math.PI / 2;
          return { x: center + (maxR + 22) * Math.cos(angle), y: center + (maxR + 16) * Math.sin(angle) };
        };
        // Ring values sit on the diagonal between the first two axes.
        const tickAt = (val: number) => {
          const r = (val / scaleMax) * maxR;
          return { x: center + r * Math.cos(-Math.PI / 4) + 2, y: center + r * Math.sin(-Math.PI / 4) - 2 };
        };
        const ring = (val: number) => axes.map((_, i) => { const pt = point(i, val); return `${pt.x},${pt.y}`; }).join(' ');
        const fmtSeconds = (v?: number | null) => (v == null ? '–' : `${v.toFixed(2).replace('.', ',')} giây`);

        return (
          <div className={`${compact ? 'p-4' : 'p-5'} rounded-lg bg-sheet border border-ink/10`}>
            <div className="flex items-center justify-between mb-3 border-b border-ink/10 pb-2.5 flex-wrap gap-2">
              <div>
                <h3 className="font-semibold text-sm text-ink">Phong cách đánh</h3>
                <p className="text-xs text-ink/55">Mỗi người dùng nhóm cú nào bao nhiêu phần trăm (không tính giao cầu)</p>
              </div>
              <div className="flex items-center gap-3 text-xs text-ink/75">
                {series.map(sr => (
                  <span key={sr.name} className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-sm inline-block" style={{ background: sr.color }} />
                    {sr.name}
                  </span>
                ))}
              </div>
            </div>

            <div className={`grid ${compact ? 'grid-cols-1 gap-3' : 'grid-cols-1 md:grid-cols-12 gap-4'} items-center`}>
              <div className={`${compact ? '' : 'md:col-span-5'} flex justify-center`}>
                <svg viewBox="0 0 260 260" className="w-full max-w-[300px] h-auto" role="img" aria-label="Biểu đồ tỉ lệ nhóm cú của hai người chơi">
                  {[0.25, 0.5, 0.75, 1].map(f => (
                    <polygon key={f} points={ring(scaleMax * f)} fill="none" stroke="#16201B" strokeOpacity={0.1} />
                  ))}
                  {[scaleMax / 2, scaleMax].map(v => {
                    const t = tickAt(v);
                    return <text key={v} x={t.x} y={t.y} fontSize="8" fill="#16201B" fillOpacity={0.45}>{v}%</text>;
                  })}
                  {axes.map((ax, i) => {
                    const outer = point(i, scaleMax);
                    const label = labelAt(i);
                    return (
                      <g key={ax}>
                        <line x1={center} y1={center} x2={outer.x} y2={outer.y} stroke="#16201B" strokeOpacity={0.12} />
                        <text x={label.x} y={label.y} textAnchor="middle" dominantBaseline="middle" fill="#16201B" fillOpacity={0.75} fontSize="10" fontWeight="600">
                          {AXES[ax]?.label ?? ax}
                        </text>
                      </g>
                    );
                  })}
                  {series.map(sr => (
                    <g key={sr.name}>
                      <polygon points={axes.map((_, i) => { const pt = point(i, sr.values[i] ?? 0); return `${pt.x},${pt.y}`; }).join(' ')}
                        fill={sr.color} fillOpacity={0.14} stroke={sr.color} strokeWidth={2} strokeLinejoin="round" />
                      {axes.map((ax, i) => {
                        const pt = point(i, sr.values[i] ?? 0);
                        return (
                          <circle key={ax} cx={pt.x} cy={pt.y} r={4} fill={sr.color} stroke="#ffffff" strokeWidth={2}>
                            <title>{`${sr.name}: ${AXES[ax]?.label ?? ax} ${sr.values[i] ?? 0}%`}</title>
                          </circle>
                        );
                      })}
                    </g>
                  ))}
                </svg>
              </div>

              <div className={`${compact ? '' : 'md:col-span-7'} overflow-x-auto`}>
                <table className="w-full text-left text-xs">
                  <thead>
                    <tr className="border-b border-ink/10 text-ink/55">
                      <th className="pb-1.5 font-medium">Nhóm cú</th>
                      {series.map(sr => <th key={sr.name} className="pb-1.5 text-right font-medium text-ink/75">{sr.name}</th>)}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-ink/10">
                    {axes.map((ax, i) => (
                      <tr key={ax}>
                        <td className="py-1.5 text-ink/85">
                          {AXES[ax]?.label ?? ax} <span className="text-ink/50">({AXES[ax]?.hint})</span>
                        </td>
                        {series.map(sr => (
                          <td key={sr.name} className="py-1.5 text-right tabular-nums font-semibold text-ink">{sr.values[i] ?? 0}%</td>
                        ))}
                      </tr>
                    ))}
                    <tr>
                      <td className="py-1.5 text-ink/85">
                        Nhịp đánh <span className="text-ink/50">(cầu bay tới đối thủ, trung vị)</span>
                      </td>
                      {series.map(sr => (
                        <td key={sr.name} className="py-1.5 text-right tabular-nums font-semibold text-ink">{fmtSeconds(sr.extra?.median_flight_seconds)}</td>
                      ))}
                    </tr>
                    <tr>
                      <td className="py-1.5 text-ink/85">
                        Số loại cú hay dùng <span className="text-ink/50">(mỗi loại ≥ 5%)</span>
                      </td>
                      {series.map(sr => (
                        <td key={sr.name} className="py-1.5 text-right tabular-nums font-semibold text-ink">{sr.extra?.stroke_types_used ?? '–'}/7</td>
                      ))}
                    </tr>
                  </tbody>
                </table>
                <p className="text-[11px] text-ink/50 mt-2 leading-relaxed">
                  Đây là tỉ lệ loại cú AI nhận ra trong đoạn video, không phải điểm năng lực. Nhịp đánh càng nhỏ thì cầu đi càng nhanh.
                </p>
              </div>
            </div>
          </div>
        );
      })()}

      {/* 5. COACHAI+ 2.0 RADAR & TACTICAL INSIGHTS */}
      {showTab('STYLE') && coachInsights.length > 0 && (
        <div className={`${compact ? 'p-4' : 'p-5'} rounded-lg border border-pitch/20 `}>
          <div className="flex items-center gap-2 mb-3">
            <Lightbulb className="w-4 h-4 text-amber-700 shrink-0" />
            <h3 className="font-bold text-xs lg:text-sm text-ink">Nhận định từ AI</h3>
          </div>

          <div className={`grid ${compact ? 'grid-cols-1 gap-2.5' : 'grid-cols-1 md:grid-cols-2 gap-3'}`}>
            {coachInsights.map((item, idx) => (
              <div key={idx} className="p-3 rounded-xl bg-ink/[0.04] border border-ink/10 flex items-start gap-2.5 min-w-0">
                <div className="p-1.5 rounded-lg bg-pitch/10 border border-pitch/20 text-pitch shrink-0 mt-0.5">
                  <Sparkles className="w-3.5 h-3.5" />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-1.5 mb-1.5 flex-wrap">
                    <span className="text-[11px] font-bold text-ink bg-ink/[0.06] px-2 py-0.5 rounded-md border border-ink/10">
                      {item.category}
                    </span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-ink/[0.06] text-ink/75 font-medium truncate max-w-[150px]">
                      Mục tiêu: {insightTargetName(item.target)}
                    </span>
                  </div>
                  <p className="text-[11px] text-ink/75 leading-relaxed break-words">
                    {item.insight}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 6. CHIẾN THUẬT COACHAI+ (HIỆU QUẢ & TUA VIDEO) */}
      {showTab('TACTICS') && (
        <TacticsBreakdown
          tactics={stats.structuredTactics}
          playerAName={playerAName}
          playerBName={playerBName}
          upperPlayer={upperPlayer}
          compact={compact}
          onSeekTime={onSeekTime}
        />
      )}

      {/* 7. TACTICAL PATTERNS (3-GRAM & 2-GRAM COMBINATIONS) */}
      {showTab('TACTICS') && stats.tacticalPatterns && (() => {
        const list3Gram = stats.tacticalPatterns.top_sequences_3gram || [];
        const list2Gram = stats.tacticalPatterns.top_transitions_2gram || [];
        const activeList = (patternGram === '3GRAM' && list3Gram.length > 0) ? list3Gram : list2Gram;

        if (list3Gram.length === 0 && list2Gram.length === 0) return null;

        return (
          <div className={`${compact ? 'p-4' : 'p-5'} rounded-lg bg-sheet border border-ink/10 `}>
            <div className="flex items-center justify-between mb-3.5 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <Award className="w-4 h-4 text-emerald-700 shrink-0" />
                <h3 className="font-bold text-xs lg:text-sm text-ink">
                  Chuỗi cú đánh lặp lại nhiều nhất
                </h3>
              </div>

              {/* Tab Selector: 3-Gram vs 2-Gram */}
              <div className="flex items-center gap-1 bg-ink/[0.04] p-1 rounded-xl border border-ink/10 text-[11px]">
                {list3Gram.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPatternGram('3GRAM')}
                    className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                      patternGram === '3GRAM'
                        ? 'bg-emerald-500/20 text-emerald-700 border border-emerald-500/30 shadow-sm'
                        : 'text-ink/50 hover:text-ink/75'
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
                        ? 'bg-blue-500/20 text-pa border border-blue-500/30 shadow-sm'
                        : 'text-ink/50 hover:text-ink/75'
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
                  <div key={idx} className="p-2.5 px-3 rounded-xl bg-ink/[0.03] border border-ink/10 flex items-center justify-between min-w-0 hover:border-ink/10 transition-colors">
                    <div className="flex items-center gap-1.5 text-xs min-w-0 flex-wrap">
                      {parts.map((stroke: string, pIdx: number) => {
                        const color = STROKE_COLORS[stroke] || '#38bdf8';
                        return (
                          <React.Fragment key={pIdx}>
                            {pIdx > 0 && <span className="text-ink/50 text-[10px] shrink-0">➜</span>}
                            <span
                              className="px-2 py-0.5 rounded-lg border font-bold text-[10px] sm:text-[11px] shrink-0 shadow-sm"
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
                    <span className="text-[11px] tabular-nums font-bold text-emerald-700 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 shrink-0 ml-2">
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
