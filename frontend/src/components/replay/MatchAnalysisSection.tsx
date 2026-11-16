import React, { useState } from 'react';
import { CourtHeatmap } from '../court/CourtHeatmap';
import { ScoreFlow } from './ScoreFlow';
import { StatisticsDashboard, MatchStatisticsData } from './StatisticsDashboard';
import type { PlaylistClip } from '../../utils/pointLoss';
import type { Match } from '../../types/match';
import type { AiEventData, RallyData } from '../../types/replay';

interface MatchAnalysisSectionProps {
  match: Match;
  /** Re-expressed as the side each player started on (usePlayerSides). */
  playerRallies: RallyData[];
  playerEvents: AiEventData[];
  playerStatistics: MatchStatisticsData | null;
  currentTime: number;
  handlePlayRally: (rally: RallyData) => void;
  handlePlayPlaylist: (title: string, clips: PlaylistClip[]) => void;
  handleSeekToTime: (seconds: number, label: string) => void;
}

/** "Phân tích cả trận": score flow, heatmap and statistics; every "Xem" seeks the video above. */
export const MatchAnalysisSection: React.FC<MatchAnalysisSectionProps> = ({
  match,
  playerRallies,
  playerEvents,
  playerStatistics,
  currentTime,
  handlePlayRally,
  handlePlayPlaylist,
  handleSeekToTime,
}) => {
  const [analysisTab, setAnalysisTab] = useState<'FLOW' | 'HEATMAP' | 'STATS'>('FLOW');

  return (
    <section className="rounded-xl bg-sheet border border-ink/10 p-4 sm:p-6 space-y-5" aria-labelledby="match-analysis-title">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 border-b border-ink/10 pb-4">
        <div>
          <h2 id="match-analysis-title" className="text-lg font-semibold text-ink">Phân tích cả trận</h2>
          <p className="text-xs text-ink/70 mt-0.5">
            {match.playerAName} và {match.playerBName}: tỉ số, vị trí trên sân và số liệu cú đánh
          </p>
        </div>
        <div className="grid grid-cols-3 gap-1 p-1 bg-ink/[0.04] rounded-lg border border-ink/10 text-xs sm:w-[420px]" role="tablist">
          {([
            ['FLOW', 'Tỉ số'],
            ['HEATMAP', 'Bản đồ nhiệt'],
            ['STATS', 'Thống kê'],
          ] as const).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={analysisTab === key}
              onClick={() => setAnalysisTab(key)}
              className={`py-2 px-2 rounded-md font-semibold truncate transition-colors ${
                analysisTab === key ? 'bg-pitch text-white' : 'text-ink/70 hover:text-ink hover:bg-ink/[0.04]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className={analysisTab === 'HEATMAP' ? 'max-w-4xl' : ''}>
        {analysisTab === 'FLOW' && (
          <ScoreFlow
            rallies={playerRallies}
            playerAName={match.playerAName}
            playerBName={match.playerBName}
            upperPlayer={match.upperPlayer}
            currentTimeSeconds={currentTime}
            onPlayRally={handlePlayRally}
            onPlayPlaylist={handlePlayPlaylist}
          />
        )}
        {analysisTab === 'HEATMAP' && (
          <CourtHeatmap
            events={playerEvents}
            playerAName={match.playerAName}
            playerBName={match.playerBName}
            upperPlayer={match.upperPlayer}
            onPlayPlaylist={handlePlayPlaylist}
          />
        )}
        {analysisTab === 'STATS' && (
          playerStatistics ? (
            <StatisticsDashboard
              stats={playerStatistics}
              playerAName={match.playerAName}
              playerBName={match.playerBName}
              upperPlayer={match.upperPlayer}
              compact={false}
              onSeekTime={handleSeekToTime}
            />
          ) : (
            <p className="text-xs text-ink/70 py-8 text-center">Số liệu sẽ có khi AI phân tích xong.</p>
          )
        )}
      </div>
    </section>
  );
};
