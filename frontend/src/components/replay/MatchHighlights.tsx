import React, { useMemo } from 'react';
import { PlayCircle, Loader2 } from 'lucide-react';
import { AiEventData } from '../court/Court2DViewer';
import { RallyData } from './RalliesExplorer';
import { analyzeLostPoints, CourtSide, PlaylistClip, sideName, toPlaylist } from './PointLossInsights';

interface MatchHighlightsProps {
  rallies: RallyData[];
  events: AiEventData[];
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  isAnalysisLive: boolean;
  onPlayPlaylist: (title: string, clips: PlaylistClip[]) => void;
  onOpenPointLoss: () => void;
}

interface Highlight {
  key: string;
  count: number;
  title: string;
  detail: string;
  tone: 'loss' | 'neutral';
  rallies: RallyData[];
}

/** A pattern needs at least this many rallies to be called out at the top of the page. */
const MIN_PATTERN_RALLIES = 2;

/**
 * "Điều đáng chú ý": the answers a coach opens the replay for, before any detail. The
 * biggest group of lost points per player and the longest rally, each playable as clips.
 */
export const MatchHighlights: React.FC<MatchHighlightsProps> = ({
  rallies,
  events,
  playerAName,
  playerBName,
  upperPlayer,
  isAnalysisLive,
  onPlayPlaylist,
  onOpenPointLoss,
}) => {
  const nameOf = (side: CourtSide) => sideName(side, upperPlayer, playerAName, playerBName);

  const highlights = useMemo(() => {
    const decided = rallies.filter(r => r.winnerSide === 'UPPER' || r.winnerSide === 'LOWER');
    const items: Highlight[] = [];
    for (const side of ['UPPER', 'LOWER'] as CourtSide[]) {
      const top = analyzeLostPoints(decided, events, side, nameOf).groups[0];
      if (top && top.rallies.length >= MIN_PATTERN_RALLIES) {
        items.push({
          key: `loss-${side}`,
          count: top.rallies.length,
          title: top.title,
          detail: `${top.rallies.length} điểm thua của ${nameOf(side)} • ${top.hint}`,
          tone: 'loss',
          rallies: top.rallies,
        });
      }
    }
    items.sort((a, b) => b.count - a.count);
    const longest = [...decided].sort((a, b) => b.totalStrokes - a.totalStrokes)[0];
    if (longest && longest.totalStrokes > 0) {
      items.push({
        key: 'longest',
        count: longest.totalStrokes,
        title: `Pha cầu dài nhất: ${longest.totalStrokes} cú`,
        detail: `${nameOf(longest.winnerSide as CourtSide)} thắng điểm • pha ${longest.rallyNumber}`,
        tone: 'neutral',
        rallies: [longest],
      });
    }
    return items.slice(0, 3);
  }, [rallies, events]); // eslint-disable-line react-hooks/exhaustive-deps

  if (highlights.length === 0 && !isAnalysisLive) return null;

  return (
    <section className="rounded-xl bg-sheet border border-ink/10 px-5 py-4" aria-labelledby="match-notes-title">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 id="match-notes-title" className="text-base font-semibold text-ink">Điều đáng chú ý trong trận</h2>
        <button
          type="button"
          onClick={onOpenPointLoss}
          className="text-sm font-medium text-pitch hover:text-pitch-deep hover:underline underline-offset-4"
        >
          Xem tất cả điểm thua
        </button>
      </div>

      {highlights.length === 0 ? (
        <p className="mt-3 text-sm text-ink/60 flex items-center gap-2">
          <Loader2 className="w-4 h-4 animate-spin text-pitch" />
          AI đang tổng hợp. Nhận định sẽ hiện khi đã phân tích xong vài pha cầu.
        </p>
      ) : (
        <ul className="mt-2 divide-y divide-ink/10">
          {highlights.map(item => (
            <li key={item.key} className="flex flex-wrap sm:flex-nowrap items-center gap-x-4 gap-y-2 py-3">
              <span
                className={`font-score text-4xl font-semibold leading-none w-12 text-right tabular-nums ${
                  item.tone === 'loss' ? 'text-loss' : 'text-ink'
                }`}
              >
                {item.count}
              </span>
              <div className="min-w-0 flex-1 basis-[calc(100%-4rem)] sm:basis-auto">
                <p className="text-[15px] font-medium text-ink leading-snug">{item.title}</p>
                <p className="text-sm text-ink/60 leading-snug">{item.detail}</p>
              </div>
              <button
                type="button"
                onClick={() => onPlayPlaylist(item.title, toPlaylist(item.rallies))}
                className="ml-16 sm:ml-0 shrink-0 flex items-center gap-1.5 rounded-md border border-pitch/30 px-3 py-1.5 text-sm font-medium text-pitch hover:bg-pitch-soft transition-colors"
              >
                <PlayCircle className="w-4 h-4" />
                {item.rallies.length > 1 ? `Xem ${item.rallies.length} pha` : 'Xem pha này'}
              </button>
            </li>
          ))}
        </ul>
      )}
      {isAnalysisLive && highlights.length > 0 && (
        <p className="mt-1 text-xs text-ink/50">Cập nhật theo kết quả AI mới nhất.</p>
      )}
    </section>
  );
};
