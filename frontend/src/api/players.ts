import apiClient from './client';

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
  /** The player's shot ended a rally they won. */
  winners: number;
  /** The player's shot ended a rally they lost. */
  errors: number;
}

export interface ZoneCell {
  /** 0..11 from the far baseline; the player is always on 6..11. */
  along: number;
  /** 0..5 across the court. */
  across: number;
  count: number;
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
  zones: { position: ZoneCell[]; landing: ZoneCell[]; conceded: ZoneCell[] };
  opponents: Array<{ name: string; matches: number; ralliesWon: number; ralliesLost: number }>;
  matches: PlayerMatchEntry[];
}

export const fetchPlayers = async (search: string): Promise<PlayerSummary[]> => {
  const res = await apiClient.get<PlayerSummary[]>('/players', { params: search.trim() ? { search: search.trim() } : {} });
  return res.data;
};

export const fetchPlayerProfile = async (name: string): Promise<PlayerProfile> => {
  const res = await apiClient.get<PlayerProfile>('/players/profile', { params: { name } });
  return res.data;
};

/** Route of a player's profile page. */
export const playerPath = (name: string) => `/players/${encodeURIComponent(name.trim())}`;

/** Owners open their own replay (full video); everyone else the public one. */
export const replayPath = (match: Pick<PlayerMatchEntry, 'matchId' | 'owned'>) =>
  match.owned ? `/matches/${match.matchId}/replay` : `/public-matches/${match.matchId}/replay`;
