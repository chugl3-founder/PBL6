import React, { useMemo, useState } from 'react';
import { PlayCircle, ShieldCheck, Info } from 'lucide-react';
import { AiEventData } from '../court/Court2DViewer';
import { RallyData } from './RalliesExplorer';
import { strokeLabelLower } from '../../utils/strokeLabels';

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

interface PointLossInsightsProps {
  rallies: RallyData[];
  events: AiEventData[];
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  onPlayPlaylist: (title: string, clips: PlaylistClip[]) => void;
}

/** "Vì sao mất điểm": the lost points of one player, grouped and playable as playlists. */
export const PointLossInsights: React.FC<PointLossInsightsProps> = ({
  rallies,
  events,
  playerAName,
  playerBName,
  upperPlayer,
  onPlayPlaylist,
}) => {
  const nameOf = (side: CourtSide) => sideName(side, upperPlayer, playerAName, playerBName);
  const [player, setPlayer] = useState<CourtSide>('LOWER');

  const decided = rallies.filter(r => r.winnerSide === 'UPPER' || r.winnerSide === 'LOWER');
  const analysis = useMemo(
    () => analyzeLostPoints(decided, events, player, nameOf),
    [decided, events, player] // eslint-disable-line react-hooks/exhaustive-deps
  );

  if (decided.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-64 text-center text-ink/70 space-y-3 px-4">
        <Info className="w-10 h-10 text-ink/30" />
        <p className="text-xs">Chưa xác định được người thắng của các pha cầu. Kết quả sẽ có khi AI phân tích xong.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-2 gap-1 p-1 rounded-xl bg-ink/[0.04] border border-ink/10 text-xs">
        {(['LOWER', 'UPPER'] as CourtSide[]).map(side => (
          <button
            key={side}
            type="button"
            onClick={() => setPlayer(side)}
            className={`py-1.5 px-2 rounded-lg font-bold truncate transition-colors ${
              player === side ? 'bg-ink text-white' : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
            }`}
          >
            {nameOf(side)}
          </button>
        ))}
      </div>

      <div className="rounded-lg border border-loss/20 bg-loss/5 p-3 space-y-1">
        <p className="text-sm font-bold text-ink">
          {nameOf(player)} mất {analysis.lost.length} điểm
        </p>
        {analysis.lost.length > 0 && (
          <p className="text-xs text-ink/70">
            {analysis.ownShots} điểm kết thúc bằng cú của chính {nameOf(player)},{' '}
            {analysis.lost.length - analysis.ownShots} điểm do đối thủ ăn điểm.
          </p>
        )}
        <p className="text-xs text-ink/70 flex items-center gap-1">
          <ShieldCheck className="w-3 h-3 text-emerald-700 shrink-0" />
          {analysis.confirmed}/{analysis.lost.length} điểm đã đối chiếu với bảng tỉ số trên video
        </p>
      </div>

      {analysis.groups.map(group => (
        <div key={group.key} className="rounded-lg border border-ink/10 bg-ink/[0.03] p-3 space-y-2">
          <div className="flex items-start gap-3">
            <div className="font-score text-3xl font-semibold text-loss leading-none w-8 shrink-0 text-center tabular-nums">{group.rallies.length}</div>
            <div className="min-w-0 space-y-0.5">
              <p className="text-xs font-semibold text-ink">{group.title}</p>
              <p className="text-xs text-ink/70">{group.hint}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onPlayPlaylist(group.title, toPlaylist(group.rallies))}
            className="w-full h-8 rounded-md border border-pitch/30 text-xs font-medium text-pitch hover:bg-pitch-soft flex items-center justify-center gap-1.5 transition-colors"
          >
            <PlayCircle className="w-3.5 h-3.5" />
            Xem liền {group.rallies.length} pha này
          </button>
        </div>
      ))}

      <p className="text-xs text-ink/65 leading-relaxed px-1">
        AI gom nhóm theo cú đánh cuối của mỗi pha cầu. Cú hỏng cuối pha (vào lưới) đôi khi không được nhận
        diện, nên hãy xem clip để tự xác nhận.
      </p>
    </div>
  );
};
