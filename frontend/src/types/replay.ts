/** Analysis results shown on the Replay page: progress, stroke events and rallies. */

export type AnalysisState = 'NONE' | 'QUEUED' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'UNSUPPORTED' | 'CANCELLED';

export interface AnalysisStatus {
  analysisId: number | null;
  matchId: number;
  status: AnalysisState | string;
  progressPercent: number;
  currentStage: string;
  modelName?: string;
  modelVersion?: string;
  errorCode?: string | null;
  errorMessage?: string | null;
  /** Streaming results: how far the GPU worker has analysed, as one end time or several ranges. */
  analyzedUntilSeconds?: number | null;
  videoDurationSeconds?: number | null;
  analyzedRanges?: [number, number][] | null;
}

/** Analyses still running: the Replay page polls for new rallies while one is live. */
export const LIVE_ANALYSIS_STATES = ['QUEUED', 'PROCESSING'];

export interface AiEventData {
  id: number;
  eventOrder: number;
  timeSeconds: number;
  /** The half of the court the hitter was on; players change ends between games. */
  playerSide: 'UPPER' | 'LOWER';
  stroke: string;
  strokeSide: string;
  confidence: number;
  playerPositionCourt?: [number, number]; // [x, y] 0..1 (x across the court, y along it)
  opponentPositionCourt?: [number, number];
  contactShuttleProjectionCourt?: [number, number];
  landingPositionCourtProxy?: [number, number];
  hittingArea3x3?: number;
  landingArea3x3Proxy?: number;
  averageShuttleSpeedImagePerSecond?: number;
  averageWristSpeedImagePerSecond?: number;
  attackStateRule?: string;
  ballRound?: number;
  top2?: string[] | null;
  flightTimeToNextHitSeconds?: number;
}

export interface RallyData {
  id: number;
  rallyNumber: number;
  startEventId: number;
  endEventId: number;
  startTime: number;
  endTime: number;
  duration: number;
  totalStrokes: number;
  boundaryType: string;
  serverSide: string; // UPPER, LOWER
  winnerSide: string; // UPPER, LOWER
  winReason: string;
  scoreUpper: number;
  scoreLower: number;
  scoreText: string;
  /** Per player within the game, split by the backend (players change ends between games). */
  gameNumber?: number;
  scoreA?: number;
  scoreB?: number;
  winnerPlayer?: 'PLAYER_A' | 'PLAYER_B' | null;
  /** Who was on the upper half of the court during this rally. */
  upperPlayer?: string;
  /** Played after a player had already won the match: the AI picked up post-match play. */
  afterMatch?: boolean;
  strokeSequence: string[];
  isComplete: boolean;
}
