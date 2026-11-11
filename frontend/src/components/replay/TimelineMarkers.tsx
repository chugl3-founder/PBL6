import React from 'react';
import { AiEventData } from '../court/Court2DViewer';

interface TimelineMarkersProps {
  events: AiEventData[];
  durationSeconds: number;
  currentTimeSeconds: number;
  currentEvent: AiEventData | null;
  onSeekToEvent: (event: AiEventData) => void;
  /**
   * While the AI is still streaming results: the [start, end] seconds whose hits are final.
   * Several ranges once the viewer made the AI jump ahead; null when the analysis is done.
   */
  analyzedRanges?: [number, number][] | null;
}

export const TimelineMarkers: React.FC<TimelineMarkersProps> = ({
  events,
  durationSeconds,
  currentTimeSeconds,
  currentEvent,
  onSeekToEvent,
  analyzedRanges = null,
}) => {
  if (!durationSeconds || durationSeconds <= 0) return null;

  const pct = (seconds: number) => Math.max(0, Math.min(100, (seconds / durationSeconds) * 100));
  // Not-yet-analysed gaps between the analysed ranges; each gap's left edge is a working AI frontier.
  const pendingGaps: [number, number][] = [];
  if (analyzedRanges) {
    let cursor = 0;
    for (const [start, end] of [...analyzedRanges].sort((x, y) => x[0] - y[0])) {
      if (start > cursor + 0.5) pendingGaps.push([cursor, start]);
      cursor = Math.max(cursor, end);
    }
    if (cursor < durationSeconds - 0.5) pendingGaps.push([cursor, durationSeconds]);
  }

  const getMarkerColor = (stroke: string) => {
    switch (stroke.toUpperCase()) {
      case 'SMASH':
      case 'NET_ATTACK':
        return '#f43f5e'; // Rose
      case 'DROP':
      case 'NET_SHOT':
        return '#38bdf8'; // Sky
      case 'CLEAR':
      case 'LIFT':
        return '#facc15'; // Amber
      case 'DRIVE':
      case 'PUSH':
        return '#10b981'; // Emerald
      case 'SERVE':
        return '#c084fc'; // Purple
      default:
        return '#3b82f6'; // Blue
    }
  };

  return (
    <div className="relative w-full h-8 flex items-center group cursor-pointer my-2">
      {/* Background Track */}
      <div className="absolute inset-x-0 h-2 bg-slate-800 rounded-full overflow-hidden border border-white/10">
        {/* Playhead progress fill */}
        <div
          className="h-full bg-brand/40 transition-all duration-100"
          style={{ width: `${Math.min(100, (currentTimeSeconds / durationSeconds) * 100)}%` }}
        />
      </div>

      {/* Not yet analysed: hatched gaps, a glowing AI frontier at the start of each */}
      {pendingGaps.map(([start, end], index) => (
        <React.Fragment key={`gap-${index}`}>
          <div
            className="absolute h-2 timeline-pending pointer-events-none"
            style={{ left: `${pct(start)}%`, width: `${pct(end) - pct(start)}%` }}
          />
          {start > 0 && (
            <div
              className="absolute top-0 bottom-0 w-0.5 bg-cyan-300 shadow-[0_0_10px_#67e8f9] frontier-glow z-10 pointer-events-none -translate-x-1/2"
              style={{ left: `${pct(start)}%` }}
            />
          )}
        </React.Fragment>
      ))}
      {pendingGaps.length > 0 && (
        <div
          className="absolute -top-4 text-[10px] font-semibold text-cyan-300 whitespace-nowrap pointer-events-none -translate-x-1/2"
          style={{ left: `${Math.min(92, Math.max(8, pct(pendingGaps[0][0])))}%` }}
        >
          AI đang phân tích…
        </div>
      )}

      {/* Current Playhead indicator bar */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#ffffff] z-20 pointer-events-none -translate-x-1/2"
        style={{ left: `${Math.min(100, (currentTimeSeconds / durationSeconds) * 100)}%` }}
      />

      {/* Stroke Event Markers Pin */}
      {events.map((event) => {
        const leftPercent = (event.timeSeconds / durationSeconds) * 100;
        const isActive = currentEvent?.timeSeconds === event.timeSeconds;
        const markerColor = getMarkerColor(event.stroke);

        return (
          <div
            // Keyed by time: provisional rows get new ids on every refresh, but a hit
            // already on the timeline must not re-mount (and re-animate).
            key={`hit-${event.timeSeconds}`}
            onClick={(e) => {
              e.stopPropagation();
              onSeekToEvent(event);
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 hover:z-30 transition-transform cursor-pointer group/pin marker-arrive"
            style={{ left: `${leftPercent}%` }}
          >
            {/* Dot pin */}
            <div
              className={`w-3.5 h-3.5 rounded-full border-2 transition-all duration-200 flex items-center justify-center ${
                isActive
                  ? 'scale-150 border-white shadow-[0_0_12px_#ffffff]'
                  : 'border-slate-900 group-hover/pin:scale-125'
              }`}
              style={{ backgroundColor: markerColor }}
            />

            {/* Hover Tooltip */}
            <div className="absolute bottom-6 left-1/2 -translate-x-1/2 hidden group-hover/pin:flex flex-col items-center pointer-events-none whitespace-nowrap z-40">
              <div className="bg-slate-950/95 border border-white/20 text-white rounded-xl px-2.5 py-1 text-[11px] shadow-2xl space-y-0.5 backdrop-blur-md">
                <div className="font-bold flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: markerColor }} />
                  <span>{event.stroke}</span>
                  <span className="text-white/40">#{event.eventOrder}</span>
                </div>
                <div className="text-[10px] text-white/60">
                  {event.timeSeconds.toFixed(1)}s • {event.playerSide} • {(event.confidence * 100).toFixed(0)}%
                </div>
              </div>
              <div className="w-2 h-2 bg-slate-950 border-r border-b border-white/20 rotate-45 -mt-1" />
            </div>
          </div>
        );
      })}
    </div>
  );
};

