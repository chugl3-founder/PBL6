import client from './client';

export interface PlayerRadar {
  attack: number | null;
  defense: number | null;
  netControl: number | null;
  shotVariety: number | null;
  consistency: number | null;
  pace: number | null;
}

export interface PlayerSummary {
  name: string;
  matchCount: number;
  analyzedMatchCount: number;
  lastMatchDate: string | null;
  ralliesWon: number;
  ralliesLost: number;
  totalShots: number;
  radar: PlayerRadar;
  playstyle: string | null;
}

export interface LabelCount {
  label: string;
  count: number;
}

export interface StrokeStat {
  stroke: string;
  total: number;
  winners: number;
  errors: number;
}

export interface PlayerMatchEntry {
  matchId: number;
  title: string | null;
  matchDate: string | null;
  status: string;
  owned: boolean;
  analyzed: boolean;
  side: 'UPPER' | 'LOWER';
  opponent: string;
  shots: number;
  ralliesWon: number;
  ralliesLost: number;
  avgDistanceMeters: number | null;
  playstyle: string | null;
  radar: PlayerRadar;
}

export interface PlayerProfile {
  name: string;
  matchCount: number;
  analyzedMatchCount: number;
  firstMatchDate: string | null;
  lastMatchDate: string | null;
  totals: { shots: number; ralliesWon: number; ralliesLost: number; avgDistanceMeters: number | null };
  radar: PlayerRadar;
  playstyles: LabelCount[];
  strokes: StrokeStat[];
  handSides: Record<string, number>;
  rallyLength: Array<{ bucket: 'SHORT' | 'MEDIUM' | 'LONG'; won: number; lost: number }>;
  concededBy: LabelCount[];
  opponents: Array<{ name: string; matches: number; ralliesWon: number; ralliesLost: number }>;
  matches: PlayerMatchEntry[];
}

export interface TrainingFocus {
  key: string;
  kind: 'ERROR' | 'CONCEDED';
  stroke: string;
  count: number;
  share: number;
  trend: 'IMPROVING' | 'WORSENING' | 'STABLE' | 'NOT_ENOUGH_DATA';
}

export interface TrainingFocusData {
  player: string;
  matchesAnalyzed: number;
  pointsLost: number;
  focuses: TrainingFocus[];
}

export const playerApi = {
  listPlayers: async (search?: string): Promise<PlayerSummary[]> => {
    const res = await client.get<PlayerSummary[]>('/players', {
      params: search?.trim() ? { search: search.trim() } : undefined,
    });
    return res.data;
  },

  getProfile: async (name: string): Promise<PlayerProfile> => {
    const res = await client.get<PlayerProfile>('/players/profile', {
      params: { name },
    });
    return res.data;
  },

  getTrainingFocus: async (name: string): Promise<TrainingFocusData> => {
    const res = await client.get<TrainingFocusData>('/players/training-focus', {
      params: { name },
    });
    return res.data;
  },
};
