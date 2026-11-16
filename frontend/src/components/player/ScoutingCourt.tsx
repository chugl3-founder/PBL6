import React, { useState } from 'react';
import type { ZoneCell } from '../../api/players';
import { CourtLines } from '../court/CourtLines';
import { COURT_RECT, COURT_VIEWBOX } from '../court/courtGeometry';
import { topZones } from '../../utils/playerProfile';

const ALONG = 12;
const ACROSS = 6;
const TARGET = '#4ADE80';
const THREAT = '#FF7A6B';

interface ScoutingCourtProps {
  /** Where the opponent loses points, on their half (along 0..5). */
  target: ZoneCell[];
  /** Where the opponent's shots land, on the reader's half (along 6..11). */
  threat: ZoneCell[];
  opponentName: string;
}

/**
 * The game plan drawn on one court: the opponent on the left, the reader on the right. Green cells
 * on the left are where to hit; red cells on the right are where to expect the shuttle.
 */
export const ScoutingCourt: React.FC<ScoutingCourtProps> = ({ target, threat, opponentName }) => {
  const [hovered, setHovered] = useState<string | null>(null);
  const cellW = COURT_RECT.width / ALONG;
  const cellH = COURT_RECT.height / ACROSS;
  const targetTotal = target.reduce((s, c) => s + c.count, 0);
  const threatTotal = threat.reduce((s, c) => s + c.count, 0);
  const targetMax = Math.max(1, ...target.map(c => c.count));
  const threatMax = Math.max(1, ...threat.map(c => c.count));
  // Cells are in the reader's view; mirrored back they name the zone as the opponent sees it.
  const targetTop = topZones(target.map(c => ({ ...c, along: 11 - c.along, across: 5 - c.across })), 2);
  const threatTop = topZones(threat, 2);

  const layer = (cells: ZoneCell[], color: string, max: number, total: number, kind: string) =>
    cells.map(c => {
      const key = `${kind}-${c.along}-${c.across}`;
      // The reader faces the net (left of the drawing): their left hand side is drawn at the bottom.
      const row = ACROSS - 1 - c.across;
      return (
        <rect
          key={key}
          x={COURT_RECT.x + c.along * cellW + 1}
          y={COURT_RECT.y + row * cellH + 1}
          width={cellW - 2}
          height={cellH - 2}
          rx={4}
          fill={color}
          fillOpacity={0.12 + 0.78 * (c.count / max)}
          stroke={hovered === key ? '#fff' : 'none'}
          strokeWidth={2}
          onMouseEnter={() => setHovered(key)}
        >
          <title>{`${c.count} lần · ${Math.round((c.count / Math.max(1, total)) * 100)}%`}</title>
        </rect>
      );
    });

  return (
    <div className="space-y-4">
      <div className="relative w-full aspect-[600/320] rounded-lg border-2 border-ink/15 overflow-hidden">
        <svg viewBox={`0 0 ${COURT_VIEWBOX.width} ${COURT_VIEWBOX.height}`} className="w-full h-full" onMouseLeave={() => setHovered(null)}>
          <rect width={COURT_VIEWBOX.width} height={COURT_VIEWBOX.height} fill="#083e20" />
          <CourtLines />
          {layer(target, TARGET, targetMax, targetTotal, 't')}
          {layer(threat, THREAT, threatMax, threatTotal, 'r')}
          <text x={160} y={14} fill="#fff" fillOpacity={0.9} fontSize={11} fontWeight={700} textAnchor="middle">
            Sân {opponentName}
          </text>
          <text x={440} y={14} fill="#fff" fillOpacity={0.9} fontSize={11} fontWeight={700} textAnchor="middle">
            Sân của bạn
          </text>
        </svg>
      </div>
      <div className="grid sm:grid-cols-2 gap-3">
        <div className="rounded-lg border border-ink/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="w-3 h-3 rounded-sm" style={{ background: TARGET }} /> Đánh vào đây
          </p>
          <p className="text-xs text-ink/70 mt-1">Nơi cú kết thúc rơi khi đối thủ mất điểm.</p>
          {targetTop.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {targetTop.map(z => (
                <li key={z.name} className="flex justify-between">
                  <span className="text-ink/80 first-letter:uppercase">{z.name} (sân đối thủ)</span>
                  <span className="font-semibold tabular-nums">{z.share}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-ink/65">Chưa đủ dữ liệu vị trí.</p>
          )}
        </div>
        <div className="rounded-lg border border-ink/10 p-3">
          <p className="flex items-center gap-2 text-sm font-semibold text-ink">
            <span className="w-3 h-3 rounded-sm" style={{ background: THREAT }} /> Cầu của đối thủ hay rơi
          </p>
          <p className="text-xs text-ink/70 mt-1">Chuẩn bị đỡ cầu ở các vùng này trên sân bạn.</p>
          {threatTop.length ? (
            <ul className="mt-2 space-y-1 text-sm">
              {threatTop.map(z => (
                <li key={z.name} className="flex justify-between">
                  <span className="text-ink/80 first-letter:uppercase">{z.name} (sân bạn)</span>
                  <span className="font-semibold tabular-nums">{z.share}%</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-2 text-xs text-ink/65">Chưa đủ dữ liệu vị trí.</p>
          )}
        </div>
      </div>
      <p className="text-[11px] text-ink/65">Trái/phải tính theo hướng người đứng ở vùng đó nhìn lên lưới. Điểm rơi là ước lượng, lệch khoảng 1–1,5 m.</p>
    </div>
  );
};
