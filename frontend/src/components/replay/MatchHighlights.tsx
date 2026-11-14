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
  detailLines: string[];
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
          detailLines: [`${top.rallies.length} điểm thua của ${nameOf(side)}`, top.hint],
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
        detailLines: [`${nameOf(longest.winnerSide as CourtSide)} thắng điểm ở pha ${longest.rallyNumber}`],
        tone: 'neutral',
        rallies: [longest],
      });
    }
    return items.slice(0, 3);
  }, [rallies, events]); // eslint-disable-line react-hooks/exhaustive-deps

  if (highlights.length === 0 && !isAnalysisLive) return null;

  return (
    <section
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg bg-sheet border border-ink/10 px-3 py-2"
      aria-label="Điều đáng chú ý trong trận"
    >
      <span className="text-sm font-semibold text-ink/70 shrink-0">Đáng chú ý</span>
      {highlights.length === 0 ? (
        <span className="text-sm text-ink/70 flex items-center gap-1.5">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-pitch" />
          AI đang tổng hợp, nhận định sẽ hiện sau vài pha cầu
        </span>
      ) : (
        highlights.map(item => {
          const tipId = `match-note-${item.key}`;
          return (
            <div key={item.key} className="group relative min-w-0 max-w-full">
              <button
                type="button"
                aria-describedby={tipId}
                onClick={() => onPlayPlaylist(item.title, toPlaylist(item.rallies))}
                className="flex items-center gap-2 min-w-0 max-w-full rounded-md border border-ink/10 bg-ground/60 pl-2 pr-2.5 py-1 text-sm text-ink hover:border-pitch/40 hover:bg-pitch-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50 transition-colors"
              >
                <PlayCircle className="w-4 h-4 shrink-0 text-pitch" />
                <span className="truncate">{item.title}</span>
                <span
                  className={`shrink-0 rounded px-1.5 text-xs font-semibold tabular-nums ${
                    item.tone === 'loss' ? 'bg-loss/10 text-loss' : 'bg-ink/[0.06] text-ink/70'
                  }`}
                >
                  {item.tone === 'loss' ? `${item.count} điểm thua` : `pha ${item.rallies[0].rallyNumber}`}
                </span>
              </button>
              <div
                id={tipId}
                role="tooltip"
                className="pointer-events-none absolute left-0 top-full z-30 mt-2 w-max max-w-[18rem] rounded-lg bg-ink px-3 py-2 text-[13px] leading-snug text-white shadow-[0_10px_30px_-10px_rgba(22,32,27,0.6)] opacity-0 translate-y-1 transition duration-150 group-hover:opacity-100 group-hover:translate-y-0 group-focus-within:opacity-100 group-focus-within:translate-y-0 motion-reduce:transition-none"
              >
                <span aria-hidden className="absolute -top-1 left-4 h-2 w-2 rotate-45 bg-ink" />
                {item.detailLines.map((line, i) => (
                  <p key={i} className={i === 0 ? 'font-medium' : 'text-white/70'}>{line}</p>
                ))}
                <p className="mt-1.5 text-[11px] text-white/45">Bấm để xem {item.rallies.length > 1 ? `${item.rallies.length} pha` : 'pha này'}</p>
              </div>
            </div>
          );
        })
      )}
      <button
        type="button"
        onClick={onOpenPointLoss}
        className="ml-auto shrink-0 text-sm font-medium text-pitch hover:text-pitch-deep hover:underline underline-offset-4"
      >
        Tất cả điểm thua
      </button>
    </section>
  );
};
