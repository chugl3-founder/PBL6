import React from 'react';
import { AiEventData, RallyData } from '../../types/replay';
import { strokeLabel } from '../../utils/strokeLabels';
import { isShownRally } from '../../utils/rallies';

interface TimelineMarkersProps {
  events: AiEventData[];
  durationSeconds: number;
  currentTimeSeconds: number;
  currentEvent: AiEventData | null;
  onSeekToEvent: (event: AiEventData) => void;
  /** Rallies drawn as segments in the colour of the player who won the point. */
  rallies?: RallyData[];
  upperName?: string;
  lowerName?: string;
  onSelectRally?: (rally: RallyData) => void;
  /**
   * While the AI is still streaming results: the [start, end] seconds whose hits are final.
   * Several ranges once the viewer made the AI jump ahead; null when the analysis is done.
   */
  analyzedRanges?: [number, number][] | null;
  /** Part of the video the strip spans, in seconds; [0, durationSeconds] when left out. */
  view?: { start: number; end: number };
}

const clock = (seconds: number) => {
  const s = Math.max(0, Math.floor(seconds));
  const h = Math.floor(s / 3600);
  const mmss = `${Math.floor((s % 3600) / 60)}:${String(s % 60).padStart(2, '0')}`;
  return h > 0 ? `${h}:${mmss.padStart(5, '0')}` : mmss;
};

/**
 * "Diễn biến trận": the match on one strip of court green. Each rally is a block in the
 * colour of the player who won the point, so runs of points read at a glance; each hit is
 * a white dot on top. Unanalysed video is hatched while the AI is still working.
 */
export const TimelineMarkers: React.FC<TimelineMarkersProps> = ({
  events,
  durationSeconds,
  currentTimeSeconds,
  currentEvent,
  onSeekToEvent,
  rallies = [],
  upperName = '',
  lowerName = '',
  onSelectRally,
  analyzedRanges = null,
  view,
}) => {
  if (!durationSeconds || durationSeconds <= 0) return null;

  const viewStart = view?.start ?? 0;
  const viewEnd = view && view.end > view.start ? view.end : durationSeconds;
  const inView = (seconds: number) => seconds >= viewStart && seconds <= viewEnd;
  const pct = (seconds: number) =>
    Math.max(0, Math.min(100, ((seconds - viewStart) / (viewEnd - viewStart)) * 100));
  const pendingGaps: [number, number][] = [];
  if (analyzedRanges) {
    let cursor = viewStart;
    for (const [start, end] of [...analyzedRanges].sort((x, y) => x[0] - y[0])) {
      if (start > cursor + 0.5) pendingGaps.push([cursor, start]);
      cursor = Math.max(cursor, end);
    }
    if (cursor < viewEnd - 0.5) pendingGaps.push([cursor, viewEnd]);
  }
  const playhead = inView(currentTimeSeconds) ? pct(currentTimeSeconds) : null;

  return (
    <div className="space-y-1.5">
      <div className="relative h-9">
        {/* The court mat */}
        <div className="absolute inset-x-0 top-1.5 h-6 rounded-md bg-pitch overflow-hidden">
          {/* Rallies, coloured by who won the point */}
          {rallies.filter(rally => isShownRally(rally) && rally.endTime >= viewStart && rally.startTime <= viewEnd).map(rally => {
            // Warm-up, post-match play and lets (no point) stay grey: only points are coloured by their winner.
            const counts = !rally.afterMatch && !rally.beforeMatch;
            const side = counts ? rally.winnerSide : null;
            const won = side === 'UPPER' ? 'bg-pa' : side === 'LOWER' ? 'bg-pb' : 'bg-white/40';
            const label = side === 'UPPER' ? `${upperName} thắng điểm`
              : side === 'LOWER' ? `${lowerName} thắng điểm`
              : rally.beforeMatch ? 'trước trận, không tính điểm'
              : rally.afterMatch ? 'sau trận, không tính điểm'
              : rally.winnerSide ? 'không ai ghi điểm' : 'đang xác định người ghi điểm';
            return (
              <button
                key={`rally-${rally.rallyNumber}-${rally.startTime}`}
                type="button"
                onClick={() => onSelectRally?.(rally)}
                title={`Pha ${rally.rallyNumber}: ${label} (${clock(rally.startTime)})`}
                aria-label={`Pha ${rally.rallyNumber}, ${label}`}
                className={`absolute inset-y-0 ${won} opacity-90 hover:opacity-100 transition-opacity`}
                style={{
                  left: `${pct(rally.startTime)}%`,
                  width: `max(4px, ${pct(rally.endTime) - pct(rally.startTime)}%)`,
                }}
              />
            );
          })}
          {/* Not analysed yet */}
          {pendingGaps.map(([start, end], index) => (
            <div
              key={`gap-${index}`}
              className="absolute inset-y-0 timeline-pending pointer-events-none"
              style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
            />
          ))}
        </div>

        {/* Hits */}
        {events.filter(event => inView(event.timeSeconds)).map(event => {
          const isActive = currentEvent?.timeSeconds === event.timeSeconds;
          const player = event.playerSide === 'UPPER' ? upperName : lowerName;
          return (
            <button
              // Keyed by time: provisional rows get new ids on every refresh, but a hit
              // already on the strip must not re-mount (and re-animate).
              key={`hit-${event.timeSeconds}`}
              type="button"
              onClick={e => {
                e.stopPropagation();
                onSeekToEvent(event);
              }}
              title={`${strokeLabel(event.stroke)}, ${player}, ${clock(event.timeSeconds)}`}
              aria-label={`${strokeLabel(event.stroke)} của ${player} lúc ${clock(event.timeSeconds)}`}
              className="absolute top-[18px] -translate-x-1/2 -translate-y-1/2 z-10 p-1 marker-arrive"
              style={{ left: `${pct(event.timeSeconds)}%` }}
            >
              <span
                className={`block rounded-full bg-white ${
                  isActive ? 'w-3 h-3 ring-2 ring-ink' : 'w-1.5 h-1.5 opacity-80 hover:opacity-100 hover:scale-150 transition-transform'
                }`}
              />
            </button>
          );
        })}

        {/* Playhead */}
        {playhead != null && (
          <div
            className="absolute top-0 bottom-0 w-0.5 bg-ink z-20 pointer-events-none -translate-x-1/2"
            style={{ left: `${playhead}%` }}
          />
        )}
      </div>

      <div className="flex justify-between text-[11px] text-ink/65 tabular-nums">
        <span>{clock(viewStart)}</span>
        {pendingGaps.length > 0 && (
          <span className="text-ink/70">Phần sọc: AI chưa phân tích tới</span>
        )}
        <span>{clock(viewEnd)}</span>
      </div>
    </div>
  );
};
