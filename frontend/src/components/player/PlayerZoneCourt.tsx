import React, { useMemo, useState } from 'react';
import type { PlayerProfile, ZoneCell } from '../../api/players';
import { CourtLines } from '../court/CourtLines';
import { COURT_RECT, COURT_VIEWBOX } from '../court/courtGeometry';
import { topZones, zoneName } from '../../utils/playerProfile';

type Layer = 'position' | 'landing' | 'conceded';

const ALONG_BINS = 12;
const ACROSS_BINS = 6;

const LAYERS: Record<Layer, { label: string; color: string; caption: (name: string) => string; unit: string }> = {
  position: {
    label: 'Vị trí đánh',
    color: '#F5C542',
    caption: name => `Chỗ ${name} đứng khi chạm cầu`,
    unit: 'cú',
  },
  landing: {
    label: 'Điểm rơi',
    color: '#67D4F5',
    caption: name => `Chỗ cầu của ${name} rơi bên sân đối thủ`,
    unit: 'cú',
  },
  conceded: {
    label: 'Bị ghi điểm',
    color: '#FF7A6B',
    caption: name => `Chỗ cú kết thúc của đối thủ rơi khi ${name} mất điểm`,
    unit: 'điểm',
  },
};

/** The player's court tendencies over every analysed match, mirrored so the player is on the right. */
export const PlayerZoneCourt: React.FC<{ profile: PlayerProfile }> = ({ profile }) => {
  const [layer, setLayer] = useState<Layer>('position');
  const [hovered, setHovered] = useState<string | null>(null);
  const cells = profile.zones[layer];
  const meta = LAYERS[layer];

  const { total, max } = useMemo(
    () => ({
      total: cells.reduce((sum, c) => sum + c.count, 0),
      max: Math.max(1, ...cells.map(c => c.count)),
    }),
    [cells],
  );
  const top = useMemo(() => topZones(cells, 3), [cells]);

  const cellW = COURT_RECT.width / ALONG_BINS;
  const cellH = COURT_RECT.height / ACROSS_BINS;
  const keyOf = (c: ZoneCell) => `${c.along}-${c.across}`;
  // The player faces the net (left of the drawing), so their left hand side is drawn at the bottom.
  const rowOf = (c: ZoneCell) => ACROSS_BINS - 1 - c.across;
  const hoveredCell = cells.find(c => keyOf(c) === hovered);

  return (
    <div className="grid lg:grid-cols-[1fr_260px] gap-5">
      <div className="space-y-3 min-w-0">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="inline-grid grid-cols-3 gap-1 p-1 rounded-lg bg-ink/[0.04] border border-ink/10 text-xs" role="group" aria-label="Lớp bản đồ">
            {(Object.keys(LAYERS) as Layer[]).map(key => (
              <button
                key={key}
                type="button"
                aria-pressed={layer === key}
                onClick={() => {
                  setLayer(key);
                  setHovered(null);
                }}
                className={`flex items-center gap-1.5 py-1.5 px-3 rounded-md font-semibold transition-colors ${
                  layer === key ? 'bg-ink text-white' : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
                }`}
              >
                <span className="w-2 h-2 rounded-full" style={{ background: LAYERS[key].color }} aria-hidden />
                {LAYERS[key].label}
              </button>
            ))}
          </div>
          <p className="text-xs text-ink/70">{meta.caption(profile.name)}</p>
        </div>

        <div className="relative w-full aspect-[600/320] rounded-lg border-2 border-ink/15 overflow-hidden">
          <svg
            viewBox={`0 0 ${COURT_VIEWBOX.width} ${COURT_VIEWBOX.height}`}
            className="w-full h-full"
            onMouseLeave={() => setHovered(null)}
          >
            <rect width={COURT_VIEWBOX.width} height={COURT_VIEWBOX.height} fill="#083e20" />
            <CourtLines />
            {/* The player's own half, lightly lit */}
            <rect x={300} y={20} width={280} height={280} fill="#ffffff" fillOpacity={0.035} />
            {cells.map(c => {
              const share = c.count / max;
              const key = keyOf(c);
              return (
                <rect
                  key={key}
                  x={COURT_RECT.x + c.along * cellW + 1}
                  y={COURT_RECT.y + rowOf(c) * cellH + 1}
                  width={cellW - 2}
                  height={cellH - 2}
                  rx={4}
                  fill={meta.color}
                  fillOpacity={0.1 + 0.8 * share}
                  stroke={hovered === key ? '#ffffff' : 'none'}
                  strokeWidth={2}
                  onMouseEnter={() => setHovered(key)}
                  className="transition-[fill-opacity] duration-300"
                />
              );
            })}
            <text x={160} y={14} fill="#ffffff" fillOpacity={0.75} fontSize={11} fontWeight={600} textAnchor="middle">
              Sân đối thủ
            </text>
            <text x={440} y={14} fill="#ffffff" fillOpacity={0.95} fontSize={11} fontWeight={700} textAnchor="middle">
              Sân {profile.name}
            </text>
            <text x={590} y={160} fill="#ffffff" fillOpacity={0.5} fontSize={9} textAnchor="middle" transform="rotate(90 590 160)">
              cuối sân
            </text>
          </svg>

          {hoveredCell && (
            <div
              className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full rounded-md bg-ink px-2.5 py-1.5 text-[11px] text-white shadow-lg whitespace-nowrap"
              style={{
                left: `${((COURT_RECT.x + (hoveredCell.along + 0.5) * cellW) / COURT_VIEWBOX.width) * 100}%`,
                top: `${((COURT_RECT.y + rowOf(hoveredCell) * cellH) / COURT_VIEWBOX.height) * 100}%`,
              }}
            >
              <span className="font-semibold tabular-nums">
                {hoveredCell.count} {meta.unit}
              </span>
              <span className="text-white/70">
                {' '}· {Math.round((hoveredCell.count / Math.max(1, total)) * 100)}% · {zoneName(hoveredCell)}
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-ink/70">
          <span>Ít</span>
          <span
            className="h-2.5 w-24 rounded-sm border border-ink/15"
            style={{ background: `linear-gradient(to right, ${meta.color}22, ${meta.color})` }}
            aria-hidden
          />
          <span>Nhiều</span>
          <span className="ml-auto tabular-nums">
            {total} {meta.unit} có vị trí
          </span>
        </div>
      </div>

      <aside className="space-y-3">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-ink/65">Vùng nổi bật</h3>
        {top.length === 0 ? (
          <p className="text-sm text-ink/70">Chưa có dữ liệu vị trí cho lớp này.</p>
        ) : (
          <ol className="space-y-2">
            {top.map((zone, i) => (
              <li key={zone.name} className="rounded-lg border border-ink/10 bg-ground/60 p-3">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-sm font-semibold text-ink first-letter:uppercase">
                    <span className="text-ink/35 mr-1.5 font-score">{i + 1}</span>
                    {zone.name}
                  </span>
                  <span className="font-score text-xl font-bold tabular-nums" style={{ color: layer === 'position' ? '#B8860B' : layer === 'landing' ? '#1F8FB5' : '#C2413A' }}>
                    {zone.share}%
                  </span>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-ink/[0.06] overflow-hidden">
                  <div className="h-full rounded-full transition-all duration-500" style={{ width: `${zone.share}%`, background: meta.color }} />
                </div>
              </li>
            ))}
          </ol>
        )}
        <p className="text-[11px] leading-relaxed text-ink/65">
          Gộp từ {profile.analyzedMatchCount} trận đã phân tích; trận đứng sân trên được lật lại để VĐV luôn ở bên phải.
          Trái/phải theo hướng VĐV nhìn lên lưới.
          {layer !== 'position' && ' Điểm rơi là ước lượng từ vị trí người đỡ cầu, lệch khoảng 1–1,5 m.'}
        </p>
      </aside>
    </div>
  );
};
