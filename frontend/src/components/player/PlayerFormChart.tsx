import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import type { PlayerMatchEntry } from '../../api/players';
import { replayPath } from '../../api/players';
import { formatDate, winRate } from '../../utils/playerProfile';

const W = 640;
const H = 200;
const PAD = { left: 36, right: 16, top: 16, bottom: 30 };

/** Share of points won in each analysed match, oldest to newest; a dot opens that replay. */
export const PlayerFormChart: React.FC<{ matches: PlayerMatchEntry[] }> = ({ matches }) => {
  const navigate = useNavigate();
  const [hovered, setHovered] = useState<number | null>(null);
  const points = [...matches]
    .filter(m => m.analyzed && m.ralliesWon + m.ralliesLost > 0)
    .reverse()
    .map(m => ({ match: m, rate: winRate(m.ralliesWon, m.ralliesLost) ?? 0 }));

  if (points.length === 0) {
    return <p className="text-sm text-ink/70 py-8 text-center">Chưa có trận nào xác định được người thắng từng pha cầu.</p>;
  }

  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;
  const x = (i: number) => PAD.left + (points.length === 1 ? innerW / 2 : (innerW * i) / (points.length - 1));
  const y = (rate: number) => PAD.top + innerH * (1 - rate / 100);
  const line = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(p.rate)}`).join(' ');
  const area = `${line} L${x(points.length - 1)},${y(0)} L${x(0)},${y(0)} Z`;
  const active = hovered != null ? points[hovered] : null;

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full h-auto" onMouseLeave={() => setHovered(null)}>
        <defs>
          <linearGradient id="form-area" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0%" stopColor="#2E7D5B" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#2E7D5B" stopOpacity={0} />
          </linearGradient>
        </defs>
        {[0, 25, 50, 75, 100].map(t => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="#16201B"
              strokeOpacity={t === 50 ? 0.25 : 0.07}
              strokeDasharray={t === 50 ? '4 4' : undefined}
            />
            <text x={PAD.left - 8} y={y(t) + 4} textAnchor="end" fontSize={10} fill="#16201B" fillOpacity={0.45}>
              {t}%
            </text>
          </g>
        ))}
        {points.length > 1 && <path d={area} fill="url(#form-area)" />}
        {points.length > 1 && <path d={line} fill="none" stroke="#2E7D5B" strokeWidth={2.5} strokeLinejoin="round" />}
        {points.map((p, i) => (
          <g
            key={p.match.matchId}
            className="cursor-pointer"
            onMouseEnter={() => setHovered(i)}
            onFocus={() => setHovered(i)}
            onClick={() => navigate(replayPath(p.match))}
            onKeyDown={e => {
              if (e.key === 'Enter') navigate(replayPath(p.match));
            }}
            tabIndex={0}
            role="link"
            aria-label={`Trận gặp ${p.match.opponent} ngày ${formatDate(p.match.matchDate)}: thắng ${p.rate}% điểm`}
          >
            <rect x={x(i) - 14} y={PAD.top} width={28} height={innerH} fill="transparent" />
            <circle
              cx={x(i)}
              cy={y(p.rate)}
              r={hovered === i ? 7 : 5}
              fill={p.rate >= 50 ? '#2E7D5B' : '#C2413A'}
              stroke="#fff"
              strokeWidth={2}
              className="transition-all"
            />
            <text x={x(i)} y={H - 10} textAnchor="middle" fontSize={10} fill="#16201B" fillOpacity={hovered === i ? 0.9 : 0.45}>
              {formatDate(p.match.matchDate).slice(0, 5)}
            </text>
          </g>
        ))}
      </svg>
      {active && hovered != null && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-3 py-2 text-xs text-white shadow-lg whitespace-nowrap"
          style={{ left: `${(x(hovered) / W) * 100}%`, top: `${(y(active.rate) / H) * 100 - 4}%` }}
        >
          <div className="font-semibold">gặp {active.match.opponent}</div>
          <div className="text-white/70 tabular-nums">
            {active.match.ralliesWon}–{active.match.ralliesLost} điểm · thắng {active.rate}%
          </div>
          <div className="text-white/50">Bấm để xem lại trận</div>
        </div>
      )}
    </div>
  );
};
