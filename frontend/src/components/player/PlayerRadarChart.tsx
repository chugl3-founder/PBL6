import React from 'react';
import type { PlayerRadar } from '../../api/players';
import { RADAR_AXES } from '../../utils/playerProfile';

interface Series {
  radar: PlayerRadar;
  color: string;
  dashed?: boolean;
  label?: string;
}

interface PlayerRadarChartProps {
  series: Series[];
  /** Pixel size of the square chart. */
  size?: number;
  /** Axis names and values around the chart; off for thumbnails. */
  showLabels?: boolean;
}

const RINGS = [25, 50, 75, 100];

/** Six-axis style radar (0..100) with optional overlays, drawn in plain SVG. */
export const PlayerRadarChart: React.FC<PlayerRadarChartProps> = ({ series, size = 300, showLabels = true }) => {
  const pad = showLabels ? 78 : 4;
  const view = 200 + pad * 2;
  const c = view / 2;
  const r = 100;
  const n = RADAR_AXES.length;
  const point = (i: number, value: number): [number, number] => {
    const angle = (Math.PI * 2 * i) / n - Math.PI / 2;
    return [c + Math.cos(angle) * r * (value / 100), c + Math.sin(angle) * r * (value / 100)];
  };
  const polygon = (radar: PlayerRadar) =>
    RADAR_AXES.map((axis, i) => point(i, Math.max(0, Math.min(100, radar[axis.key] ?? 0))).join(',')).join(' ');
  const main = series[0]?.radar;

  return (
    <svg
      viewBox={`0 0 ${view} ${view}`}
      width={size}
      height={size}
      className="max-w-full h-auto"
      role="img"
      aria-label={
        main
          ? `Biểu đồ lối chơi: ${RADAR_AXES.map(a => `${a.label} ${main[a.key] ?? 'chưa có'}`).join(', ')}`
          : 'Biểu đồ lối chơi'
      }
    >
      {RINGS.map(ring => (
        <polygon
          key={ring}
          points={RADAR_AXES.map((_, i) => point(i, ring).join(',')).join(' ')}
          fill={ring === 100 ? 'rgba(46,125,91,0.04)' : 'none'}
          stroke="#16201B"
          strokeOpacity={ring === 100 ? 0.18 : 0.08}
          strokeWidth={1}
        />
      ))}
      {RADAR_AXES.map((_, i) => {
        const [x, y] = point(i, 100);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="#16201B" strokeOpacity={0.08} />;
      })}

      {[...series].reverse().map((s, idx) => (
        <polygon
          key={idx}
          points={polygon(s.radar)}
          fill={s.dashed ? 'none' : s.color}
          fillOpacity={0.16}
          stroke={s.color}
          strokeWidth={s.dashed ? 1.75 : 2.25}
          strokeDasharray={s.dashed ? '5 4' : undefined}
          strokeLinejoin="round"
          className="transition-all duration-500"
        />
      ))}

      {main &&
        RADAR_AXES.map((axis, i) => {
          const value = main[axis.key];
          if (value == null) return null;
          const [x, y] = point(i, value);
          return <circle key={axis.key} cx={x} cy={y} r={showLabels ? 3.5 : 2.5} fill={series[0].color} stroke="#fff" strokeWidth={1.5} />;
        })}

      {showLabels &&
        RADAR_AXES.map((axis, i) => {
          const [x, y] = point(i, 128);
          const anchor = Math.abs(x - c) < 4 ? 'middle' : x > c ? 'start' : 'end';
          const value = main?.[axis.key];
          return (
            <g key={axis.key}>
              <text x={x} y={y - 2} textAnchor={anchor} fontSize={11} fontWeight={600} fill="#16201B" fillOpacity={0.7}>
                {axis.short}
              </text>
              <text
                x={x}
                y={y + 15}
                textAnchor={anchor}
                fontSize={15}
                fontWeight={700}
                fill={series[0]?.color ?? '#16201B'}
                fontFamily='"Barlow Condensed", sans-serif'
              >
                {value ?? '–'}
              </text>
            </g>
          );
        })}
    </svg>
  );
};
