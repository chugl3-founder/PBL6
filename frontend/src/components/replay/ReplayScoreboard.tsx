import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, Film } from 'lucide-react';
import { playerPath } from '../../api/players';
import type { Match } from '../../types/match';
import type { RallyData } from '../../types/replay';

/** endTime is the last hit; broadcast scoreboards update about 3-6 s later. */
const SCORE_UPDATE_DELAY_SECONDS = 3;

interface ReplayScoreboardProps {
  match: Match;
  /** Rallies of the match itself, without play picked up after it was won. */
  inMatchRallies: RallyData[];
  /** True when the AI read the broadcast scoreboard (OCR) for at least one rally. */
  scoreFromScoreboard: boolean;
  currentTime: number;
  isPublic: boolean;
  playerAColor: string;
  playerBColor: string;
  /** Shown to the owner once the analysis is done; null hides the button. */
  onCreateHighlight: (() => void) | null;
}

/**
 * The broadcast-style header: one row per player with the score at the time being watched, the result of each
 * game seen in the video, and the highlight button. Scores are per player (scoreA/scoreB from the backend,
 * which follows the players across ends); older responses only have the AI's per-side count.
 */
export const ReplayScoreboard: React.FC<ReplayScoreboardProps> = ({
  match,
  inMatchRallies,
  scoreFromScoreboard,
  currentTime,
  isPublic,
  playerAColor,
  playerBColor,
  onCreateHighlight,
}) => {
  const toPlayerOrder = (upper: number, lower: number) =>
    match.upperPlayer === 'PLAYER_A' ? { playerA: upper, playerB: lower } : { playerA: lower, playerB: upper };
  const scoreAfter = (r: RallyData) =>
    r.scoreA != null && r.scoreB != null ? { playerA: r.scoreA, playerB: r.scoreB } : toPlayerOrder(r.scoreUpper, r.scoreLower);
  const scoreBefore = (r: RallyData) => {
    const after = scoreAfter(r);
    if (!r.isComplete) return after;
    const aWon = r.winnerPlayer ? r.winnerPlayer === 'PLAYER_A' : (r.winnerSide === 'UPPER') === (match.upperPlayer === 'PLAYER_A');
    const decided = r.winnerPlayer !== null && (r.winnerSide === 'UPPER' || r.winnerSide === 'LOWER');
    return decided
      ? { playerA: Math.max(0, after.playerA - (aWon ? 1 : 0)), playerB: Math.max(0, after.playerB - (aWon ? 0 : 1)) }
      : after;
  };

  const scoredRallies = inMatchRallies.filter((r) => r.scoreText);
  const firstRally = scoredRallies[0];
  const lastRally = scoredRallies[scoredRallies.length - 1];
  // Follow the video: the score after the latest finished rally, or the score before the first rally
  // (its point taken back) while that rally is still ahead.
  const finishedRally = [...scoredRallies]
    .reverse()
    .find((r) => r.endTime + SCORE_UPDATE_DELAY_SECONDS <= currentTime);
  const liveScore = finishedRally ? scoreAfter(finishedRally) : firstRally ? scoreBefore(firstRally) : null;
  const liveGame = (finishedRally ?? firstRally)?.gameNumber;
  const finalScore = lastRally ? scoreAfter(lastRally) : null;
  // Result of each game seen in the video: the score after its last rally.
  const gameResults = [...new Set(scoredRallies.map(r => r.gameNumber).filter((g): g is number => g != null))].map(game => {
    const inGame = scoredRallies.filter(r => r.gameNumber === game);
    return { game, ...scoreAfter(inGame[inGame.length - 1]) };
  });

  return (
    <header className="space-y-3">
      <Link
        to={isPublic ? "/public-matches" : `/matches/${match.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-ink/70 hover:text-ink transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        <span>{isPublic ? 'Thư viện công khai' : 'Thông tin trận đấu'}</span>
      </Link>
      <h1 className="sr-only">{match.playerAName} gặp {match.playerBName}</h1>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <div
          className="inline-block min-w-[13rem] rounded-md bg-ink text-white overflow-hidden"
          role="group"
          aria-label="Bảng điểm"
          title={scoreFromScoreboard
            ? 'Tỉ số đọc từ bảng điểm của video, cập nhật theo thời điểm đang xem'
            : 'Không đọc được bảng điểm: AI tự đếm số pha thắng từ 0-0 ở đầu video'}
        >
          {[
            { name: match.playerAName, score: liveScore?.playerA, bar: playerAColor.replace('text-', 'bg-') },
            { name: match.playerBName, score: liveScore?.playerB, bar: playerBColor.replace('text-', 'bg-') },
          ].map((row, index, rows) => {
            const other = rows[1 - index].score;
            const leading = row.score != null && other != null && row.score > other;
            return (
              <div key={row.name} className="flex items-center h-8 border-b border-white/10 last:border-b-0">
                <span className={`w-1 self-stretch ${row.bar}`} />
                <Link
                  to={playerPath(row.name)}
                  title={`Hồ sơ ${row.name}`}
                  className={`flex-1 min-w-0 truncate pl-2.5 pr-4 text-sm hover:underline underline-offset-2 ${leading ? 'font-semibold text-white' : 'font-medium text-white/70 hover:text-white'}`}
                >
                  {row.name}
                </Link>
                {row.score != null && (
                  <span className="w-8 self-stretch flex items-center justify-center bg-white/10 font-score text-lg font-semibold tabular-nums">
                    {row.score}
                  </span>
                )}
              </div>
            );
          })}
        </div>
        {liveScore && finalScore && (
          <p className="text-xs text-ink/70 leading-relaxed">
            {scoreFromScoreboard ? 'Tỉ số ở thời điểm đang xem' : 'Điểm ước tính ở thời điểm đang xem'}
            {gameResults.length > 1 && liveGame != null && `, ván ${liveGame}`}
            <br />
            {gameResults.length > 1
              ? <>Các ván: {gameResults.map(g => `${g.playerA}–${g.playerB}`).join(', ')}, {scoreFromScoreboard ? 'đọc từ bảng điểm' : 'AI ước tính'}</>
              : <>Cuối video {finalScore.playerA}–{finalScore.playerB}, {scoreFromScoreboard ? 'đọc từ bảng điểm' : 'AI ước tính'}</>}
          </p>
        )}
        {onCreateHighlight && (
          <button
            type="button"
            onClick={onCreateHighlight}
            className="ml-auto inline-flex items-center gap-2 px-4 h-9 rounded-md text-sm font-medium bg-pitch hover:bg-pitch-deep text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-pitch/50"
          >
            <Film className="w-4 h-4" />
            Tạo video highlight
          </button>
        )}
      </div>
    </header>
  );
};
