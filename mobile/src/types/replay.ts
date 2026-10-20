export interface AiEventData {
  id: number;
  eventOrder: number;
  timeSeconds: number;
  playerSide: 'UPPER' | 'LOWER';
  stroke: string;
  strokeSide: string;
  confidence: number;
  playerPositionCourt?: [number, number]; // [x, y] 0..1
  opponentPositionCourt?: [number, number]; // [x, y] 0..1
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
  strokeSequence: string[];
  isComplete: boolean;
}

export interface MatchStatisticsData {
  id: number;
  matchId: number;
  analysisId: number;
  totalStrokes: number;
  totalRallies: number;
  avgStrokesPerRally: number;
  avgRallyDuration: number;
  playerAStrokes: number;
  playerBStrokes: number;
  forehandCount: number;
  backhandCount: number;
  aroundheadCount: number;
  unknownSideCount: number;
  avgConfidence: number;
  strokeDistribution?: Record<string, number>;
  radarChart?: {
    axes: string[];
    upper: number[];
    lower: number[];
  };
  coachInsights?: {
    insights: Array<{
      target: string;
      category: string;
      insight: string;
    }>;
  };
  tacticalPatterns?: {
    top_transitions_2gram?: Array<{ from: string; to: string; count: number }>;
    estimated_winning_combinations?: {
      upper: string[][];
      lower: string[][];
    };
  };
}

