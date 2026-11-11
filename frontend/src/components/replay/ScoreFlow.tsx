import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Flame, PlayCircle } from 'lucide-react';
import { RallyData } from './RalliesExplorer';
import { PlaylistClip, toPlaylist } from './PointLossInsights';

type Side = 'UPPER' | 'LOWER';

// A run this long is worth calling out ("won 4 points in a row").
const MIN_STREAK = 4;
const MAX_STREAKS = 4;
const COLOR = { UPPER: '#2B59C3', LOWER: '#C9701F' } as const;

interface Point {
  rally: RallyData;
  index: number;
  game: number;
  upper: number;
  lower: number;
  /** Score before this rally, in the same game. */
  before: { upper: number; lower: number };
}

interface Streak {
  side: Side;
  points: Point[];
}

const useWidth = <T extends HTMLElement>() => {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
};

interface ScoreFlowProps {
  rallies: RallyData[];
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  currentTimeSeconds: number;
  onPlayRally: (rally: RallyData) => void;
  onPlayPlaylist: (title: string, clips: PlaylistClip[]) => void;
}

/** Lead after every point, game by game, with the scoring runs called out. */
export const ScoreFlow: React.FC<ScoreFlowProps> = ({
  rallies,
  playerAName,
  playerBName,
  upperPlayer,
  currentTimeSeconds,
  onPlayRally,
  onPlayPlaylist,
}) => {
  const upperName = upperPlayer === 'PLAYER_A' ? playerAName : playerBName;
  const lowerName = upperPlayer === 'PLAYER_A' ? playerBName : playerAName;
  const nameOf = (side: Side) => (side === 'UPPER' ? upperName : lowerName);

  const [containerRef, width] = useWidth<HTMLDivElement>();
  const [hovered, setHovered] = useState<number | null>(null);

  const points = useMemo<Point[]>(() => {
    const decided = rallies
      .filter(r => r.winnerSide === 'UPPER' || r.winnerSide === 'LOWER')
      .sort((a, b) => a.startTime - b.startTime);
    const out: Point[] = [];
    let game = 1;
    let prevTotal = -1;
    decided.forEach((rally, index) => {
      const upper = rally.scoreUpper ?? 0;
      const lower = rally.scoreLower ?? 0;
      // The score drops when a new game starts.
      if (index > 0 && upper + lower < prevTotal) game += 1;
      prevTotal = upper + lower;
      // The video may start mid-game (score read from the scoreboard): take the point back off.
      const before = {
        upper: Math.max(0, upper - (rally.winnerSide === 'UPPER' ? 1 : 0)),
        lower: Math.max(0, lower - (rally.winnerSide === 'LOWER' ? 1 : 0)),
      };
      out.push({ rally, index, game, upper, lower, before });
    });
    return out;
  }, [rallies]);

  const streaks = useMemo<Streak[]>(() => {
    const runs: Streak[] = [];
    let run: Streak | null = null;
    for (const p of points) {
      const side = p.rally.winnerSide as Side;
      if (run && run.side === side && run.points[run.points.length - 1].game === p.game) run.points.push(p);
      else {
        if (run && run.points.length >= MIN_STREAK) runs.push(run);
        run = { side, points: [p] };
      }
    }
    if (run && run.points.length >= MIN_STREAK) runs.push(run);
    return runs
      .sort((a, b) => b.points.length - a.points.length)
      .slice(0, MAX_STREAKS)
      .sort((a, b) => a.points[0].index - b.points[0].index);
  }, [points]);

  const ocrAnchored = rallies.some(r => r.winReason?.toLowerCase().startsWith('ocr_confirmed'));

  if (points.length < 2) {
    return (
      <div>
        <p className="text-xs text-ink/55 py-8 text-center">Chưa đủ pha cầu có người thắng để vẽ diễn biến tỉ số.</p>
      </div>
    );
  }

  // Geometry
  const H = 200;
  const pad = { left: 44, right: 8, top: 14, bottom: 40 };
  const plotW = Math.max(10, width - pad.left - pad.right);
  const plotH = H - pad.top - pad.bottom;
  const step = plotW / points.length;
  const maxLead = Math.max(3, ...points.map(p => Math.max(Math.abs(p.upper - p.lower), Math.abs(p.before.upper - p.before.lower))));
  const x = (i: number) => pad.left + (i + 0.5) * step;
  const y = (lead: number) => pad.top + plotH / 2 - (lead / maxLead) * (plotH / 2);
  const zeroY = y(0);

  // Step line of the lead, starting level at each game's 0-0.
  let path = '';
  points.forEach((p, i) => {
    const startOfGame = i === 0 || points[i - 1].game !== p.game;
    const lead = p.upper - p.lower;
    const prevLead = p.before.upper - p.before.lower;
    const x0 = pad.left + i * step;
    path += `${startOfGame ? 'M' : 'L'}${x0},${y(prevLead)} L${x(i)},${y(prevLead)} L${x(i)},${y(lead)} `;
    const endOfGame = i === points.length - 1 || points[i + 1].game !== p.game;
    if (endOfGame) path += `L${pad.left + (i + 1) * step},${y(lead)} `;
  });
  // Close each game's area down to the zero line.
  const areas = [...new Set(points.map(p => p.game))].map(game => {
    const inGame = points.filter(p => p.game === game);
    const first = inGame[0].index;
    const last = inGame[inGame.length - 1].index;
    const startLead = inGame[0].before.upper - inGame[0].before.lower;
    let d = `M${pad.left + first * step},${zeroY} L${pad.left + first * step},${y(startLead)} `;
    inGame.forEach(p => {
      const prevLead = p.before.upper - p.before.lower;
      d += `L${x(p.index)},${y(prevLead)} L${x(p.index)},${y(p.upper - p.lower)} `;
    });
    d += `L${pad.left + (last + 1) * step},${y(inGame[inGame.length - 1].upper - inGame[inGame.length - 1].lower)} L${pad.left + (last + 1) * step},${zeroY} Z`;
    return d;
  });

  const gameStarts = points.filter((p, i) => i > 0 && points[i - 1].game !== p.game);
  const nowIndex = (() => {
    let idx = -1;
    points.forEach((p, i) => { if (p.rally.startTime <= currentTimeSeconds) idx = i; });
    return idx;
  })();
  const stripY = H - pad.bottom + 10;
  const hoveredPoint = hovered != null ? points[hovered] : null;
  const isInStreak = (i: number) => streaks.some(s => s.points.some(p => p.index === i));

  const scorePair = (side: Side, s: { upper: number; lower: number }) =>
    side === 'UPPER' ? `${s.upper}–${s.lower}` : `${s.lower}–${s.upper}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <span className="text-xs text-ink/55">Ai dẫn điểm sau mỗi pha cầu</span>
        <div className="flex items-center gap-3 text-xs text-ink/70">
          {(['UPPER', 'LOWER'] as Side[]).map(side => (
            <span key={side} className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm" style={{ background: COLOR[side] }} aria-hidden />
              {nameOf(side)} dẫn
            </span>
          ))}
        </div>
      </div>

      <div ref={containerRef} className="relative w-full" onMouseLeave={() => setHovered(null)}>
        {width > 0 && (
          <svg width={width} height={H} role="img" aria-label={`Diễn biến tỉ số qua ${points.length} điểm`}>
            <defs>
              <clipPath id="sf-above"><rect x={0} y={0} width={width} height={zeroY} /></clipPath>
              <clipPath id="sf-below"><rect x={0} y={zeroY} width={width} height={H} /></clipPath>
            </defs>

            {/* Recessive grid: lead marks and the level line */}
            {[maxLead, Math.round(maxLead / 2), -Math.round(maxLead / 2), -maxLead].map(v => (
              <g key={v}>
                <line x1={pad.left} x2={pad.left + plotW} y1={y(v)} y2={y(v)} stroke="#16201B" strokeOpacity={0.06} />
                <text x={pad.left - 6} y={y(v) + 3} fontSize={10} fill="#16201B" fillOpacity={0.5} textAnchor="end">+{Math.abs(v)}</text>
              </g>
            ))}
            <line x1={pad.left} x2={pad.left + plotW} y1={zeroY} y2={zeroY} stroke="#16201B" strokeOpacity={0.3} />
            <text x={pad.left - 6} y={zeroY + 3} fontSize={10} fill="#16201B" fillOpacity={0.6} textAnchor="end">Hòa</text>

            {areas.map((d, i) => (
              <g key={i}>
                <path d={d} fill={COLOR.UPPER} fillOpacity={0.16} clipPath="url(#sf-above)" />
                <path d={d} fill={COLOR.LOWER} fillOpacity={0.16} clipPath="url(#sf-below)" />
              </g>
            ))}
            <path d={path} fill="none" stroke="#16201B" strokeOpacity={0.75} strokeWidth={2} strokeLinejoin="round" />

            {gameStarts.map(p => (
              <g key={p.index}>
                <line x1={pad.left + p.index * step} x2={pad.left + p.index * step} y1={pad.top - 4} y2={stripY + 10}
                  stroke="#16201B" strokeOpacity={0.35} strokeDasharray="3 3" />
                <text x={pad.left + p.index * step + 4} y={pad.top + 6} fontSize={10} fill="#16201B" fillOpacity={0.6}>Ván {p.game}</text>
              </g>
            ))}
            {gameStarts.length > 0 && (
              <text x={pad.left + 4} y={pad.top + 6} fontSize={10} fill="#16201B" fillOpacity={0.6}>Ván 1</text>
            )}

            {/* Who won each point: one block per rally, a gap between blocks */}
            {points.map((p, i) => (
              <rect key={p.rally.id} x={pad.left + i * step + (step > 4 ? 1 : 0)} y={stripY}
                width={Math.max(1, step - (step > 4 ? 2 : 0))} height={8} rx={step > 6 ? 2 : 0}
                fill={COLOR[p.rally.winnerSide as Side]} fillOpacity={hovered == null || hovered === i ? 1 : 0.45} />
            ))}
            {streaks.map(s => (
              <line key={s.points[0].index} x1={pad.left + s.points[0].index * step} x2={pad.left + (s.points[s.points.length - 1].index + 1) * step}
                y1={stripY + 13} y2={stripY + 13} stroke={COLOR[s.side]} strokeWidth={2} strokeLinecap="round" />
            ))}
            <text x={pad.left} y={H - 4} fontSize={10} fill="#16201B" fillOpacity={0.5}>Người ghi điểm từng pha →</text>

            {nowIndex >= 0 && (
              <line x1={x(nowIndex)} x2={x(nowIndex)} y1={pad.top - 4} y2={stripY + 8} stroke="#2E7D5B" strokeWidth={2} />
            )}
            {hoveredPoint && (
              <g pointerEvents="none">
                <line x1={x(hoveredPoint.index)} x2={x(hoveredPoint.index)} y1={pad.top - 4} y2={stripY + 8} stroke="#16201B" strokeOpacity={0.35} />
                <circle cx={x(hoveredPoint.index)} cy={y(hoveredPoint.upper - hoveredPoint.lower)} r={4.5}
                  fill={COLOR[hoveredPoint.rally.winnerSide as Side]} stroke="#ffffff" strokeWidth={2} />
              </g>
            )}

            {/* Hit targets: the whole column of each rally */}
            {points.map((p, i) => (
              <rect key={`hit-${p.rally.id}`} x={pad.left + i * step} y={0} width={step} height={H - 14}
                fill="transparent" className="cursor-pointer"
                onMouseEnter={() => setHovered(i)} onClick={() => onPlayRally(p.rally)} />
            ))}
          </svg>
        )}

        {hoveredPoint && (
          <div
            className="pointer-events-none absolute top-0 z-10 rounded-md bg-ink px-2.5 py-1.5 text-[11px] text-white shadow-lg whitespace-nowrap"
            style={{
              left: Math.min(Math.max(0, x(hoveredPoint.index) - 70), Math.max(0, width - 170)),
            }}
          >
            <div className="font-semibold">Pha {hoveredPoint.rally.rallyNumber} · {nameOf(hoveredPoint.rally.winnerSide as Side)} ghi điểm</div>
            <div className="text-white/75 tabular-nums">
              {upperName} {hoveredPoint.upper}–{hoveredPoint.lower} {lowerName}
              {isInStreak(hoveredPoint.index) && ' · trong chuỗi điểm liên tiếp'}
            </div>
            <div className="text-white/60">Bấm để xem pha này</div>
          </div>
        )}
      </div>

      {streaks.length > 0 ? (
        <div className="space-y-2">
          <p className="text-xs font-semibold text-ink/70 flex items-center gap-1.5">
            <Flame className="w-3.5 h-3.5 text-amber-700" />
            Chuỗi ghi điểm liên tiếp
          </p>
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {streaks.map(s => {
              const first = s.points[0];
              const last = s.points[s.points.length - 1];
              const title = `${nameOf(s.side)} ghi ${s.points.length} điểm liền`;
              return (
                <li key={first.index} className="rounded-lg border border-ink/10 bg-ink/[0.03] p-3 flex items-center gap-3">
                  <span className="w-1 self-stretch rounded-full" style={{ background: COLOR[s.side] }} aria-hidden />
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-ink">{title}</p>
                    <p className="text-xs text-ink/55 tabular-nums">
                      {points.some(p => p.game > 1) && `Ván ${first.game}: `}
                      từ {scorePair(s.side, first.before)} lên {scorePair(s.side, last)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onPlayPlaylist(title, toPlaylist(s.points.map(p => p.rally)))}
                    className="h-8 px-2.5 rounded-md border border-pitch/30 text-xs font-medium text-pitch hover:bg-pitch-soft flex items-center gap-1.5 shrink-0 transition-colors"
                  >
                    <PlayCircle className="w-3.5 h-3.5" />
                    Xem
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="text-xs text-ink/55">Không có chuỗi từ {MIN_STREAK} điểm liền trở lên: hai bên bám điểm sát nhau.</p>
      )}

      <p className="text-[11px] text-ink/50 leading-relaxed">
        Đường càng lên cao thì {upperName} dẫn càng nhiều, càng xuống thấp thì {lowerName} dẫn. Bấm vào biểu đồ để xem pha đó.
        {!ocrAnchored && ' Không đọc được bảng điểm, nên tỉ số do AI đếm từ 0–0 ở đầu video.'}
      </p>
    </div>
  );
};
