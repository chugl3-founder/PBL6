import React from 'react';
import { AlertTriangle, Layers, Target, Trophy, MapPin } from 'lucide-react';

export type ReplaySideTab = 'STROKES' | 'RALLIES' | 'POINTS' | 'TACTICS' | 'COURT';

interface ReplaySideTabsProps {
  activeTab: ReplaySideTab;
  setActiveTab: (tab: ReplaySideTab) => void;
  ralliesCount: number;
  strokesCount: number;
}

/** The tab strip of the panel beside the video: rallies, lost points, strokes, tactics, court. */
export const ReplaySideTabs: React.FC<ReplaySideTabsProps> = ({ activeTab, setActiveTab, ralliesCount, strokesCount }) => (
    <div className="grid grid-cols-5 gap-1 p-1 bg-ink/[0.04] rounded-lg border border-ink/10 mb-3 text-xs">
      <button
        type="button"
        onClick={() => setActiveTab('RALLIES')}
        className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
          activeTab === 'RALLIES'
            ? 'bg-pitch text-white '
            : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
        }`}
        title={`Pha cầu (${ralliesCount})`}
      >
        <Trophy className="w-3.5 h-3.5 text-amber-700 shrink-0" />
        <span className="truncate max-w-full">Pha cầu</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('POINTS')}
        className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
          activeTab === 'POINTS'
            ? 'bg-pitch text-white '
            : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
        }`}
        title="Vì sao mất điểm"
      >
        <AlertTriangle className="w-3.5 h-3.5 text-rose-700 shrink-0" />
        <span className="truncate max-w-full">Mất điểm</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('STROKES')}
        className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
          activeTab === 'STROKES'
            ? 'bg-pitch text-white '
            : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
        }`}
        title={`Cú đánh (${strokesCount})`}
      >
        <Layers className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate max-w-full">Cú đánh</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('TACTICS')}
        className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
          activeTab === 'TACTICS'
            ? 'bg-pitch text-white '
            : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
        }`}
        title="Chiến thuật"
      >
        <Target className="w-3.5 h-3.5 text-rose-700 shrink-0" />
        <span className="truncate max-w-full">Lối chơi</span>
      </button>
      <button
        type="button"
        onClick={() => setActiveTab('COURT')}
        className={`py-1.5 px-0.5 rounded-md font-semibold transition-all flex flex-col items-center justify-center gap-0.5 min-w-0 text-[11px] leading-tight whitespace-nowrap ${
          activeTab === 'COURT'
            ? 'bg-pitch text-white '
            : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
        }`}
        title="Cú đang phát trên sơ đồ sân"
      >
        <MapPin className="w-3.5 h-3.5 text-emerald-700 shrink-0" />
        <span className="truncate max-w-full">Sân</span>
      </button>
    </div>
);
