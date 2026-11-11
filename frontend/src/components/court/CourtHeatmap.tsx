import React, { useMemo, useState } from 'react';
import { PlayCircle } from 'lucide-react';
import { AiEventData } from './Court2DViewer';
import { COURT_RECT, COURT_VIEWBOX, CourtLines } from './CourtLines';
import { strokeLabel, strokeLabelLower } from '../../utils/strokeLabels';
import type { PlaylistClip } from '../replay/PointLossInsights';

type Side = 'UPPER' | 'LOWER';
type Mode = 'POSITION' | 'LANDING';

// Cells: 6 per half along the court (~1.1 m), 6 across (~1 m).
const ALONG_BINS = 12;
const ACROSS_BINS = 6;
// A clip shows the build-up to the shot and where it goes.
const CLIP_LEAD_SECONDS = 2;
const CLIP_TAIL_SECONDS = 1.5;
// One hue, light to dark: the more shots, the more opaque.
const HEAT_COLOR = '#F5C542';

interface Cell {
  along: number;
  across: number;
  shots: AiEventData[];
}

const clamp01 = (v: number) => Math.min(0.999, Math.max(0, v));

const formatClock = (secs: number) => {
  const m = Math.floor(secs / 60);
  const s = Math.floor(secs % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
};

/** "cuối sân, cánh trái": depth from the net and side as seen from the camera. */
const zoneName = (point: [number, number]) => {
  const depth = Math.abs(point[1] - 0.5) * 2;
  const depthName = depth < 1 / 3 ? 'gần lưới' : depth < 2 / 3 ? 'giữa sân' : 'cuối sân';
  const sideName = point[0] < 1 / 3 ? 'cánh trái' : point[0] > 2 / 3 ? 'cánh phải' : 'giữa';
  return `${depthName}, ${sideName}`;
};

const toClips = (shots: AiEventData[]): PlaylistClip[] => {
  const clips: PlaylistClip[] = [];
  for (const shot of [...shots].sort((a, b) => a.timeSeconds - b.timeSeconds)) {
    const start = Math.max(0, shot.timeSeconds - CLIP_LEAD_SECONDS);
    const end = shot.timeSeconds + CLIP_TAIL_SECONDS;
    const last = clips[clips.length - 1];
    if (last && start <= last.end) last.end = end;
    else clips.push({ start, end, label: `${strokeLabel(shot.stroke)} lúc ${formatClock(shot.timeSeconds)}` });
  }
  return clips;
};

interface CourtHeatmapProps {
  events: AiEventData[];
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  onPlayPlaylist: (title: string, clips: PlaylistClip[]) => void;
}

/** Where a player stands when hitting, or where their shots land, over the whole match. */
export const CourtHeatmap: React.FC<CourtHeatmapProps> = ({
  events,
  playerAName,
  playerBName,
  upperPlayer,
  onPlayPlaylist,
}) => {
  const upperName = upperPlayer === 'PLAYER_A' ? playerAName : playerBName;
  const lowerName = upperPlayer === 'PLAYER_A' ? playerBName : playerAName;
  const nameOf = (side: Side) => (side === 'UPPER' ? upperName : lowerName);

  const [player, setPlayer] = useState<Side>('LOWER');
  const [mode, setMode] = useState<Mode>('LANDING');
  const [stroke, setStroke] = useState<string>('ALL');
  const [hovered, setHovered] = useState<string | null>(null);

  const playerShots = useMemo(() => events.filter(e => e.playerSide === player), [events, player]);

  const strokeOptions = useMemo(() => {
    const counts = new Map<string, number>();
    for (const e of playerShots) counts.set(e.stroke, (counts.get(e.stroke) ?? 0) + 1);
    return [...counts.entries()].sort((a, b) => b[1] - a[1]);
  }, [playerShots]);

  const pointOf = (e: AiEventData) => (mode === 'POSITION' ? e.playerPositionCourt : e.landingPositionCourtProxy);

  const { cells, placed, max } = useMemo(() => {
    const byKey = new Map<string, Cell>();
    let placedCount = 0;
    for (const e of playerShots) {
      if (stroke !== 'ALL' && e.stroke !== stroke) continue;
      const p = pointOf(e);
      if (!p || p.length !== 2) continue;
      const along = Math.floor(clamp01(p[1]) * ALONG_BINS);
      const across = Math.floor(clamp01(p[0]) * ACROSS_BINS);
      const key = `${along}-${across}`;
      const cell = byKey.get(key) ?? { along, across, shots: [] };
      cell.shots.push(e);
      byKey.set(key, cell);
      placedCount += 1;
    }
    const list = [...byKey.entries()];
    return { cells: list, placed: placedCount, max: Math.max(1, ...list.map(([, c]) => c.shots.length)) };
  }, [playerShots, stroke, mode]); // eslint-disable-line react-hooks/exhaustive-deps

  const cellW = COURT_RECT.width / ALONG_BINS;
  const cellH = COURT_RECT.height / ACROSS_BINS;
  const cellCentre = (c: Cell): [number, number] => [(c.across + 0.5) / ACROSS_BINS, (c.along + 0.5) / ALONG_BINS];

  // Top zones in plain words: the 3 x 3 zone of each cell, summed.
  const topZones = useMemo(() => {
    const zones = new Map<string, number>();
    for (const [, c] of cells) {
      const name = zoneName(cellCentre(c));
      zones.set(name, (zones.get(name) ?? 0) + c.shots.length);
    }
    return [...zones.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
  }, [cells]); // eslint-disable-line react-hooks/exhaustive-deps

  const hoveredCell = cells.find(([key]) => key === hovered)?.[1];
  const strokeText = stroke === 'ALL' ? 'cú' : `cú ${strokeLabelLower(stroke)}`;
  const subject = mode === 'POSITION'
    ? `Chỗ ${nameOf(player)} đứng khi đánh ${stroke === 'ALL' ? '' : strokeLabelLower(stroke)}`.trim()
    : `Chỗ ${strokeText} của ${nameOf(player)} rơi`;

  const segment = 'grid gap-1 p-1 rounded-lg bg-ink/[0.04] border border-ink/10 text-xs';
  const segBtn = (active: boolean) =>
    `py-1.5 px-2 rounded-md font-semibold truncate transition-colors ${
      active ? 'bg-ink text-white' : 'text-ink/60 hover:text-ink hover:bg-ink/[0.04]'
    }`;

  return (
    <div className="space-y-4">
      <p className="text-xs text-ink/55">{subject}</p>

      {/* Filters in one row above the court */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className={`${segment} grid-cols-2`} role="group" aria-label="Người chơi">
          {(['LOWER', 'UPPER'] as Side[]).map(side => (
            <button key={side} type="button" aria-pressed={player === side}
              onClick={() => { setPlayer(side); setStroke('ALL'); }} className={segBtn(player === side)}>
              {nameOf(side)}
            </button>
          ))}
        </div>
        <div className={`${segment} grid-cols-2`} role="group" aria-label="Hiển thị">
          <button type="button" aria-pressed={mode === 'LANDING'} onClick={() => setMode('LANDING')} className={segBtn(mode === 'LANDING')}>
            Cầu rơi
          </button>
          <button type="button" aria-pressed={mode === 'POSITION'} onClick={() => setMode('POSITION')} className={segBtn(mode === 'POSITION')}>
            Chỗ đứng
          </button>
        </div>
        <select
          value={stroke}
          onChange={e => setStroke(e.target.value)}
          aria-label="Loại cú"
          className="h-[34px] rounded-lg border border-ink/15 bg-sheet px-2 text-xs font-semibold text-ink"
        >
          <option value="ALL">Mọi loại cú ({playerShots.length})</option>
          {strokeOptions.map(([code, n]) => (
            <option key={code} value={code}>{strokeLabel(code)} ({n})</option>
          ))}
        </select>
      </div>

      <div className="relative w-full aspect-[600/320] rounded-lg border-2 border-ink/15 overflow-hidden">
        <svg viewBox={`0 0 ${COURT_VIEWBOX.width} ${COURT_VIEWBOX.height}`} className="w-full h-full" onMouseLeave={() => setHovered(null)}>
          <rect width={COURT_VIEWBOX.width} height={COURT_VIEWBOX.height} fill="#083e20" />
          <CourtLines />
          {cells.map(([key, c]) => {
            const share = c.shots.length / max;
            const x = COURT_RECT.x + c.along * cellW;
            const y = COURT_RECT.y + c.across * cellH;
            return (
              <rect
                key={key}
                x={x + 1}
                y={y + 1}
                width={cellW - 2}
                height={cellH - 2}
                rx={4}
                fill={HEAT_COLOR}
                fillOpacity={0.12 + 0.78 * share}
                stroke={hovered === key ? '#ffffff' : 'none'}
                strokeWidth={2}
                className="cursor-pointer"
                onMouseEnter={() => setHovered(key)}
                onFocus={() => setHovered(key)}
                onClick={() => onPlayPlaylist(`${subject}: ${zoneName(cellCentre(c))}`, toClips(c.shots))}
                tabIndex={0}
                role="button"
                aria-label={`${c.shots.length} cú ở ${zoneName(cellCentre(c))}, bấm để xem`}
                onKeyDown={e => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onPlayPlaylist(`${subject}: ${zoneName(cellCentre(c))}`, toClips(c.shots));
                  }
                }}
              />
            );
          })}
          <text x={160} y={14} fill="#ffffff" fillOpacity={0.85} fontSize={11} fontWeight={600} textAnchor="middle">
            Sân {upperName}
          </text>
          <text x={440} y={14} fill="#ffffff" fillOpacity={0.85} fontSize={11} fontWeight={600} textAnchor="middle">
            Sân {lowerName}
          </text>
        </svg>

        {hoveredCell && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2.5 py-1.5 text-[11px] text-white shadow-lg whitespace-nowrap"
            style={{
              left: `${((COURT_RECT.x + (hoveredCell.along + 0.5) * cellW) / COURT_VIEWBOX.width) * 100}%`,
              top: `${((COURT_RECT.y + hoveredCell.across * cellH) / COURT_VIEWBOX.height) * 100}%`,
            }}
          >
            <span className="font-semibold tabular-nums">{hoveredCell.shots.length} cú</span>
            <span className="text-white/70"> · {Math.round((hoveredCell.shots.length / Math.max(1, placed)) * 100)}% · {zoneName(cellCentre(hoveredCell))}</span>
            <div className="text-white/60">Bấm để xem các cú này</div>
          </div>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-ink/60">
        <div className="flex items-center gap-2">
          <span>Ít</span>
          <span
            className="h-2.5 w-24 rounded-sm"
            style={{ background: `linear-gradient(to right, ${HEAT_COLOR}22, ${HEAT_COLOR})`, border: '1px solid rgba(22,32,27,0.15)' }}
            aria-hidden
          />
          <span>Nhiều</span>
        </div>
        <span className="tabular-nums">{placed} cú có vị trí</span>
      </div>

      {placed > 0 ? (
        <div className="rounded-lg bg-ink/[0.04] border border-ink/10 p-3 space-y-2 text-xs text-ink/75">
          <p>
            Nhiều nhất ở{' '}
            {topZones.map(([name, n], i) => (
              <span key={name}>
                {i > 0 && ', sau đó '}
                <span className="font-semibold text-ink">{name}</span>{' '}
                <span className="tabular-nums">({Math.round((n / placed) * 100)}%)</span>
              </span>
            ))}
            .
          </p>
          <button
            type="button"
            onClick={() => onPlayPlaylist(subject, toClips(cells.flatMap(([, c]) => c.shots)))}
            className="w-full h-8 rounded-md border border-pitch/30 text-xs font-medium text-pitch hover:bg-pitch-soft flex items-center justify-center gap-1.5 transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Xem liền {placed} cú này
          </button>
        </div>
      ) : (
        <p className="text-xs text-ink/55">Chưa có cú nào có vị trí cho lựa chọn này.</p>
      )}

      <p className="text-[11px] text-ink/50 leading-relaxed">
        Bấm một ô để xem các cú ở đó. Trái/phải tính theo góc nhìn camera.
        {mode === 'LANDING' && ' Chỗ cầu rơi là ước lượng, lấy theo chỗ đối thủ đứng đỡ cầu, lệch khoảng 1–1,5 m.'}
      </p>
    </div>
  );
};
