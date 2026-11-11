import type { PlayerProfile, PlayerRadar, ZoneCell } from '../api/players';
import { strokeLabel, strokeLabelLower } from './strokeLabels';

export const RADAR_AXES: Array<{ key: keyof PlayerRadar; label: string; short: string }> = [
  { key: 'attack', label: 'Tấn công', short: 'Tấn công' },
  { key: 'pace', label: 'Tốc độ', short: 'Tốc độ' },
  { key: 'shotVariety', label: 'Đa dạng cú đánh', short: 'Đa dạng' },
  { key: 'consistency', label: 'Ổn định', short: 'Ổn định' },
  { key: 'defense', label: 'Phòng thủ', short: 'Phòng thủ' },
  { key: 'netControl', label: 'Kiểm soát lưới', short: 'Lưới' },
];

const PLAYSTYLES: Record<string, { label: string; tone: string }> = {
  'Attack-oriented segment': { label: 'Thiên tấn công', tone: 'bg-loss/10 text-loss border-loss/25' },
  'Net-oriented segment': { label: 'Thiên đánh lưới', tone: 'bg-pa/10 text-pa border-pa/25' },
  'Defence-oriented segment': { label: 'Thiên phòng thủ', tone: 'bg-pitch/10 text-pitch-deep border-pitch/25' },
};

export const playstyleLabel = (label?: string | null) =>
  label ? PLAYSTYLES[label]?.label ?? label.replace(/ segment$/i, '') : null;

export const playstyleTone = (label?: string | null) =>
  (label && PLAYSTYLES[label]?.tone) || 'bg-ink/[0.05] text-ink/70 border-ink/15';

export const hasRadar = (radar?: PlayerRadar | null) =>
  Boolean(radar && RADAR_AXES.some(axis => radar[axis.key] != null));

/** Share of decided rallies won, 0..100, or null when no rally has a known winner. */
export const winRate = (won: number, lost: number) => (won + lost > 0 ? Math.round((won / (won + lost)) * 100) : null);

export const initials = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '?';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
};

export const formatDate = (iso?: string | null) => {
  if (!iso) return '—';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
};

export const RALLY_BUCKETS: Record<'SHORT' | 'MEDIUM' | 'LONG', { label: string; range: string }> = {
  SHORT: { label: 'Pha ngắn', range: '1–4 cú' },
  MEDIUM: { label: 'Pha trung bình', range: '5–9 cú' },
  LONG: { label: 'Pha dài', range: '10+ cú' },
};

/**
 * "cuối sân, cánh trái" for a cell on the player's normalised court. The player stands on the near
 * half (along 6..11) facing the net, so left and right are the player's own.
 */
export const zoneName = (cell: Pick<ZoneCell, 'along' | 'across'>) => {
  const along = (cell.along + 0.5) / 12;
  const depth = Math.abs(along - 0.5) * 2;
  const depthName = depth < 1 / 3 ? 'gần lưới' : depth < 2 / 3 ? 'giữa sân' : 'cuối sân';
  const across = (cell.across + 0.5) / 6;
  const sideName = across < 1 / 3 ? 'cánh trái' : across > 2 / 3 ? 'cánh phải' : 'giữa';
  return `${depthName}, ${sideName}`;
};

/** Zones grouped by name (3 x 3 per half) with their share of all cells, largest first. */
export const topZones = (cells: ZoneCell[], limit = 2) => {
  const total = cells.reduce((sum, c) => sum + c.count, 0);
  const byName = new Map<string, number>();
  for (const c of cells) byName.set(zoneName(c), (byName.get(zoneName(c)) ?? 0) + c.count);
  return [...byName.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([name, count]) => ({ name, count, share: total ? Math.round((count / total) * 100) : 0 }));
};

export interface Insight {
  tone: 'strength' | 'weakness' | 'info';
  title: string;
  detail: string;
}

/** Plain-language reading of the profile; only claims with enough data behind them are made. */
export const buildInsights = (p: PlayerProfile): Insight[] => {
  const insights: Insight[] = [];

  const axes = RADAR_AXES
    .map(axis => ({ ...axis, value: p.radar[axis.key] }))
    .filter((a): a is typeof a & { value: number } => a.value != null)
    .sort((a, b) => b.value - a.value);
  if (axes.length >= 3) {
    const best = axes[0];
    const worst = axes[axes.length - 1];
    if (best.value >= 65) {
      insights.push({
        tone: 'strength',
        title: `Nổi bật về ${best.label.toLowerCase()}`,
        detail: `Đạt ${best.value}/100, cao nhất trong 6 chỉ số lối chơi, tính trung bình qua ${p.analyzedMatchCount} trận.`,
      });
    }
    if (worst.value <= 50 && worst.key !== best.key) {
      insights.push({
        tone: 'weakness',
        title: `${worst.label} là mặt yếu nhất`,
        detail: `Chỉ đạt ${worst.value}/100, thấp nhất trong 6 chỉ số lối chơi.`,
      });
    }
  }

  const bestWeapon = [...p.strokes].filter(s => s.winners >= 2).sort((a, b) => b.winners - a.winners)[0];
  if (bestWeapon) {
    insights.push({
      tone: 'strength',
      title: `Vũ khí ghi điểm: ${strokeLabelLower(bestWeapon.stroke)}`,
      detail: `${bestWeapon.winners} pha cầu kết thúc có lợi bằng cú ${strokeLabelLower(bestWeapon.stroke)}, nhiều nhất trong các loại cú.`,
    });
  }

  const errorProne = [...p.strokes].filter(s => s.errors >= 2).sort((a, b) => b.errors - a.errors)[0];
  if (errorProne) {
    insights.push({
      tone: 'weakness',
      title: `Hay mất điểm sau cú ${strokeLabelLower(errorProne.stroke)}`,
      detail: `${errorProne.errors} lần pha cầu kết thúc bất lợi ngay sau cú ${strokeLabelLower(errorProne.stroke)} của VĐV.`,
    });
  }

  const buckets = p.rallyLength
    .filter(b => b.won + b.lost >= 4)
    .map(b => ({ ...b, rate: winRate(b.won, b.lost) ?? 0 }))
    .sort((a, b) => b.rate - a.rate);
  if (buckets.length >= 2 && buckets[0].rate - buckets[buckets.length - 1].rate >= 15) {
    const best = buckets[0];
    const worst = buckets[buckets.length - 1];
    insights.push({
      tone: 'info',
      title: `Hiệu quả hơn ở ${RALLY_BUCKETS[best.bucket].label.toLowerCase()}`,
      detail: `Thắng ${best.rate}% các ${RALLY_BUCKETS[best.bucket].label.toLowerCase()} (${RALLY_BUCKETS[best.bucket].range}), so với ${worst.rate}% ở ${RALLY_BUCKETS[worst.bucket].label.toLowerCase()}.`,
    });
  }

  const threat = p.concededBy[0];
  if (threat && threat.count >= 2) {
    insights.push({
      tone: 'weakness',
      title: `Bị ghi điểm nhiều bởi cú ${strokeLabelLower(threat.label)}`,
      detail: `${threat.count} điểm mất do đối thủ kết thúc bằng ${strokeLabel(threat.label).toLowerCase()}.`,
    });
  }

  const conceded = topZones(p.zones.conceded, 1)[0];
  if (conceded && conceded.count >= 3) {
    insights.push({
      tone: 'weakness',
      title: `Khoảng trống ở ${conceded.name}`,
      detail: `${conceded.share}% cú kết thúc của đối thủ rơi vào vùng này.`,
    });
  }

  const hands = p.handSides;
  const fore = (hands.FOREHAND ?? 0) + (hands.AROUNDHEAD ?? 0);
  const back = hands.BACKHAND ?? 0;
  if (fore + back >= 30) {
    const backShare = Math.round((back / (fore + back)) * 100);
    insights.push({
      tone: 'info',
      title: backShare >= 40 ? 'Trái tay được dùng nhiều' : 'Thiên về thuận tay',
      detail: `${backShare}% cú đánh bằng trái tay, ${100 - backShare}% thuận tay (gồm cú qua đầu).`,
    });
  }

  return insights;
};
