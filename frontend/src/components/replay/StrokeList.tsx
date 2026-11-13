import React from 'react';
import { Play, AlertTriangle, ChevronRight } from 'lucide-react';
import { strokeLabel, LOW_CONFIDENCE } from '../../utils/strokeLabels';
import { normalizeStrokeSide, strokeSideLabel } from '../../utils/strokeSide';
import type { AiEventData } from '../../types/replay';

const getStrokeBadgeClass = (stroke: string) => {
  switch (stroke.toUpperCase()) {
    case 'SMASH':
    case 'NET_ATTACK':
      return 'bg-rose-500/20 text-rose-700 border-rose-500/40';
    case 'DROP':
    case 'NET_SHOT':
      return 'bg-sky-500/20 text-sky-700 border-sky-500/40';
    case 'CLEAR':
    case 'LIFT':
      return 'bg-amber-500/20 text-amber-700 border-amber-500/40';
    case 'DRIVE':
    case 'PUSH':
      return 'bg-emerald-500/20 text-emerald-700 border-emerald-500/40';
    case 'SERVE':
      return 'bg-purple-500/20 text-purple-700 border-purple-500/40';
    default:
      return 'bg-blue-500/20 text-blue-700 border-blue-500/40';
  }
};

interface StrokeListProps {
  filteredEvents: AiEventData[];
  selectedEvent: AiEventData | null;
  handleSeekToEvent: (event: AiEventData) => void;
  /** Follows the stroke being played; the page scrolls this container. */
  strokesContainerRef: React.RefObject<HTMLDivElement>;
  autoScrollStrokes: boolean;
  onToggleAutoScroll: () => void;
  hitByStartingUpper: (event: AiEventData) => boolean;
  upperName: string;
  lowerName: string;
}

/** Every recognised stroke in order; clicking one seeks the video to it. */
export const StrokeList: React.FC<StrokeListProps> = ({
  filteredEvents,
  selectedEvent,
  handleSeekToEvent,
  strokesContainerRef,
  autoScrollStrokes,
  onToggleAutoScroll,
  hitByStartingUpper,
  upperName,
  lowerName,
}) => (
    <>
      {/* Thanh tiện ích Tự động cuộn theo video */}
      <div className="flex items-center justify-between pb-2 px-1 text-xs text-ink/70">
        <span className="text-[11px] text-ink/70">
          {filteredEvents.length} cú đánh đã nhận diện
        </span>
        <button
          type="button"
          onClick={onToggleAutoScroll}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-[11px] font-semibold transition-all ${
            autoScrollStrokes
              ? 'bg-pitch-soft text-pitch-deep border border-pitch/30'
              : 'bg-ink/[0.04] text-ink/65 hover:text-ink/70 border border-ink/10'
          }`}
          title={autoScrollStrokes ? 'Đang tự động cuộn danh sách theo cú đánh đang phát' : 'Nhấp để bật tự động cuộn'}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${autoScrollStrokes ? 'bg-pitch animate-ping' : 'bg-ink/15'}`} />
          <span>{autoScrollStrokes ? 'Tự cuộn: BẬT' : 'Tự cuộn: TẮT'}</span>
        </button>
      </div>

      {/* List cuộn dọc các cú đánh */}
      <div 
        ref={strokesContainerRef}
        className="flex-1 overflow-y-auto space-y-2 pr-1.5 scrollbar-thin"
      >
        {filteredEvents.map((evt) => {
          const isActive = selectedEvent?.id === evt.id;
          const isLowConf = evt.confidence < LOW_CONFIDENCE;
          const badgeClass = getStrokeBadgeClass(evt.stroke);

          return (
            <div
              key={evt.id}
              id={`stroke-item-${evt.id}`}
              onClick={() => handleSeekToEvent(evt)}
              className={`p-3 rounded-lg border transition-all duration-200 cursor-pointer flex items-center justify-between ${
                isActive
                  ? 'bg-pitch/25 border-pitch ring-2 ring-pitch/30 scale-[1.01]'
                  : isLowConf
                  ? 'bg-amber-500/5 border-amber-500/25 hover:bg-amber-500/10'
                  : 'bg-ink/[0.04] border-ink/10 hover:bg-ink/[0.06] hover:border-ink/15'
              }`}
            >
              <div className="flex items-center gap-3">
                {/* Số thứ tự & Indicator phát */}
                <div
                  className={`w-7 h-7 rounded-xl flex items-center justify-center tabular-nums text-xs font-bold shrink-0 transition-transform ${
                    isActive 
                      ? 'bg-pitch text-white scale-105' 
                      : isLowConf
                      ? 'bg-amber-500/20 text-amber-700 border border-amber-500/30'
                      : 'bg-ink/[0.06] text-ink/70'
                  }`}
                >
                  {isActive ? (
                    <Play className="w-3.5 h-3.5 fill-current text-ink" />
                  ) : (
                    `#${evt.eventOrder}`
                  )}
                </div>

                {/* Thông tin cú đánh */}
                <div className="space-y-0.5">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className={`px-2 py-0.5 rounded-lg text-xs font-bold border ${badgeClass}`}>
                      {strokeLabel(evt.stroke)}
                    </span>
                    {strokeSideLabel(evt.strokeSide) && (
                      <span className={`text-[11px] px-1.5 py-0.5 rounded tabular-nums font-medium border ${
                        normalizeStrokeSide(evt.strokeSide) === 'FOREHAND'
                          ? 'bg-emerald-500/10 text-emerald-700 border-emerald-500/20'
                          : 'bg-purple-500/10 text-purple-700 border-purple-500/20'
                      }`}>
                        {strokeSideLabel(evt.strokeSide)}
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink/70 flex items-center gap-1.5">
                    {/* The colour and name follow the player, not the half they stand on now. */}
                    <span className={`w-1.5 h-1.5 rounded-full ${hitByStartingUpper(evt) ? 'bg-pa' : 'bg-amber-400'}`} />
                    <span className="font-semibold">{hitByStartingUpper(evt) ? upperName : lowerName}</span>
                    <span className="text-ink/40">•</span>
                    <span className="tabular-nums text-ink/70">{evt.timeSeconds.toFixed(1)}s</span>
                  </div>
                </div>
              </div>

              {/* Chỉ báo khi AI không chắc chắn; không hiện phần trăm hay vận tốc pixel */}
              <div className="text-right flex items-center gap-2">
                {isLowConf && (
                  <span
                    title="AI không chắc chắn về cú này"
                    className="text-[11px] text-amber-700 font-semibold flex items-center gap-1 bg-amber-500/15 px-1.5 py-0.5 rounded border border-amber-500/30"
                  >
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-700" />
                    cần xem lại
                  </span>
                )}
                <ChevronRight className={`w-4 h-4 transition-transform ${isActive ? 'text-pitch translate-x-0.5' : 'text-ink/40'}`} />
              </div>
            </div>
          );
        })}
      </div>
    </>
);
