import React, { useMemo, useState } from 'react';
import { PlayCircle, ShieldCheck, Info } from 'lucide-react';
import { AiEventData, RallyData } from '../../types/replay';
import { PlaylistClip, CourtSide, sideName, analyzeLostPoints, toPlaylist } from '../../utils/pointLoss';

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
