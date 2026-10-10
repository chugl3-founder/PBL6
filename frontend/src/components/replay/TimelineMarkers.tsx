import React from 'react';
import { AiEventData } from '../court/Court2DViewer';

interface TimelineMarkersProps {
  events: AiEventData[];
  durationSeconds: number;
  currentTimeSeconds: number;
  currentEvent: AiEventData | null;
  onSeekToEvent: (event: AiEventData) => void;
}

export const TimelineMarkers: React.FC<TimelineMarkersProps> = ({
  events,
  durationSeconds,
  currentTimeSeconds,
  currentEvent,
  onSeekToEvent,
}) => {
  if (!durationSeconds || durationSeconds <= 0) return null;

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

      {/* Current Playhead indicator bar */}
      <div
        className="absolute top-0 bottom-0 w-1 bg-white shadow-[0_0_10px_#ffffff] z-20 pointer-events-none -translate-x-1/2"
        style={{ left: `${Math.min(100, (currentTimeSeconds / durationSeconds) * 100)}%` }}
      />

      {/* Stroke Event Markers Pin */}
      {events.map((event) => {
        const leftPercent = (event.timeSeconds / durationSeconds) * 100;
        const isActive = currentEvent?.id === event.id;
        const markerColor = getMarkerColor(event.stroke);

        return (
          <div
            key={event.id}
            onClick={(e) => {
              e.stopPropagation();
              onSeekToEvent(event);
            }}
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 z-10 hover:z-30 transition-transform cursor-pointer group/pin"
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

