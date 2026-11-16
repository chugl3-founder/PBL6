import type { AiEventData, RallyData } from '../types/replay';
import { strokeLabelLower } from './strokeLabels';

/** Lost points grouped by how the rally ended, and rallies as playable clips. */

/** One rally of a playlist: played from a little before its first hit to after its last. */
export interface PlaylistClip {
  start: number;
  end: number;
  label: string;
}

export type CourtSide = 'UPPER' | 'LOWER';

export interface LossGroup {
  key: string;
  title: string;
  hint: string;
  ownShot: boolean;
  rallies: RallyData[];
}

export interface LostPointsAnalysis {
  lost: RallyData[];
  confirmed: number;
  ownShots: number;
  groups: LossGroup[];
}

export const sideName = (side: CourtSide, upperPlayer: string, playerAName: string, playerBName: string) => {
  const upperName = upperPlayer === 'PLAYER_A' ? playerAName : playerBName;
  const lowerName = upperPlayer === 'PLAYER_A' ? playerBName : playerAName;
  return side === 'UPPER' ? upperName : lowerName;
};

/**
 * Groups the rallies a player lost by how they ended. The AI only proposes the grouping;
 * the clips are the evidence, since the last hit of a rally is sometimes missed (an error
 * into the net), so the cause is described as a tendency, never asserted.
 */
export const analyzeLostPoints = (
  rallies: RallyData[],
  events: AiEventData[],
  player: CourtSide,
  nameOf: (side: CourtSide) => string,
): LostPointsAnalysis => {
  const opponent: CourtSide = player === 'UPPER' ? 'LOWER' : 'UPPER';
  const lost = rallies.filter(r => r.winnerSide === opponent);
  const confirmed = lost.filter(r => (r.winReason ?? '').startsWith('ocr_confirmed')).length;
  const groups = new Map<string, LossGroup>();

  for (const rally of lost) {
    const hits = events
      .filter(e => e.timeSeconds >= rally.startTime - 0.05 && e.timeSeconds <= rally.endTime + 0.05)
      .sort((a, b) => a.timeSeconds - b.timeSeconds);
    const last = hits[hits.length - 1];
    if (!last) continue;
    let group: Omit<LossGroup, 'rallies'>;
    if (last.playerSide === player) {
      group = {
        key: `own-${last.stroke}`,
        title: `${nameOf(player)} kết thúc pha cầu bằng cú ${strokeLabelLower(last.stroke)}`,
        hint: 'Thường là cú đánh hỏng: ra ngoài hoặc chạm lưới',
        ownShot: true,
      };
    } else {
      const setup = [...hits].reverse().find(e => e.playerSide === player);
      group = {
        key: `opp-${last.stroke}-${setup?.stroke ?? 'none'}`,
        title: `${nameOf(opponent)} ăn điểm bằng cú ${strokeLabelLower(last.stroke)}`,
        hint: setup
          ? `ngay sau cú ${strokeLabelLower(setup.stroke)} của ${nameOf(player)}`
          : 'ngay từ đầu pha cầu',
        ownShot: false,
      };
    }
    const existing = groups.get(group.key);
    if (existing) existing.rallies.push(rally);
    else groups.set(group.key, { ...group, rallies: [rally] });
  }

  const ordered = [...groups.values()].sort((a, b) => b.rallies.length - a.rallies.length);
  return {
    lost,
    confirmed,
    groups: ordered,
    ownShots: ordered.filter(g => g.ownShot).reduce((n, g) => n + g.rallies.length, 0),
  };
};

export const toPlaylist = (rallies: RallyData[]): PlaylistClip[] =>
  [...rallies]
    .sort((a, b) => a.startTime - b.startTime)
    .map(r => ({ start: r.startTime, end: r.endTime, label: `Pha ${r.rallyNumber}` }));
