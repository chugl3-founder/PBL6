import type { RallyData } from '../types/replay';

/**
 * The rally winner as the side the player started the match on (game 1), so UPPER/LOWER keep naming the same
 * player in every game. The AI's winnerSide is the court half, and players change ends between games.
 */
export const winnerByStartingSide = (rally: RallyData, upperPlayer: string): string => {
  if (!rally.winnerPlayer) return rally.winnerSide;
  return (rally.winnerPlayer === 'PLAYER_A') === (upperPlayer === 'PLAYER_A') ? 'UPPER' : 'LOWER';
};

/** "21-15" in player A-B order when the backend split the games, else the stored per-side text. */
export const rallyScoreText = (rally: RallyData) =>
  rally.scoreA != null && rally.scoreB != null
    ? `${rally.scoreA}-${rally.scoreB}`
    : rally.scoreText || `${rally.scoreUpper}-${rally.scoreLower}`;

/**
 * True for a rally shown as a point: not warm-up or post-match play the AI picked up, and not a let
 * (the AI saw no point won). A rally still waiting for its winner while the AI streams is kept.
 */
export const isShownRally = (rally: RallyData): boolean => {
  if (rally.afterMatch || rally.beforeMatch) return false;
  const side = rally.winnerSide;
  return !side || side === 'UPPER' || side === 'LOWER' || Boolean(rally.winnerPlayer);
};
