import apiClient from './client';
import type { PlayerRadar, ZoneCell } from './players';

export type KeyCategory = 'TARGET' | 'EXPLOIT' | 'THREAT' | 'TEMPO' | 'STYLE';

export interface ScoutingClip {
  matchId: number;
  published: boolean;
  seconds: number;
  label: string;
}

export interface ScoutingKeyPoint {
  category: KeyCategory;
  title: string;
  detail: string;
  evidence: string;
  clips: ScoutingClip[];
}

export interface ScoutingSubject {
  name: string;
  matchCount: number;
  analyzedMatchCount: number;
  ralliesWon: number;
  ralliesLost: number;
  playstyle: string | null;
  radar: PlayerRadar;
}

export interface ScoutingPlan {
  opponent: ScoutingSubject;
  ownPlayer: ScoutingSubject | null;
  headToHead: {
    matches: number;
    ownWon: number;
    ownLost: number;
    list: Array<{ matchId: number; matchDate: string | null; published: boolean; ownWon: number; ownLost: number }>;
  } | null;
  keys: ScoutingKeyPoint[];
  /** Reader's view: the opponent's half is along 0..5. */
  targetZones: ZoneCell[];
  /** Reader's view: the reader's own half is along 6..11. */
  threatZones: ZoneCell[];
  threats: Array<{ stroke: string; count: number; total: number }>;
  weaknesses: Array<{ stroke: string; count: number; total: number }>;
  rallyLength: Array<{ bucket: 'SHORT' | 'MEDIUM' | 'LONG'; won: number; lost: number }>;
  quality: { analyzedMatches: number; decidedRallies: number; level: 'LOW' | 'MEDIUM' | 'HIGH'; note: string };
}

export interface ScoutingReport {
  id: number;
  title: string;
  opponentName: string;
  ownPlayerName: string | null;
  coachNotes: string | null;
  shareToken: string | null;
  owner: boolean;
  generatedAt: string;
  updatedAt: string;
  plan: ScoutingPlan | null;
}

export const listReports = async () => (await apiClient.get<ScoutingReport[]>('/scouting-reports')).data;

export const createReport = async (body: { opponentName: string; ownPlayerName?: string; title?: string }) =>
  (await apiClient.post<ScoutingReport>('/scouting-reports', body)).data;

export const getReport = async (id: string | number) => (await apiClient.get<ScoutingReport>(`/scouting-reports/${id}`)).data;

export const getSharedReport = async (token: string) =>
  (await apiClient.get<ScoutingReport>(`/scouting-reports/shared/${encodeURIComponent(token)}`)).data;

export const updateReport = async (id: number, body: { title?: string; coachNotes?: string }) =>
  (await apiClient.patch<ScoutingReport>(`/scouting-reports/${id}`, body)).data;

export const regenerateReport = async (id: number) =>
  (await apiClient.post<ScoutingReport>(`/scouting-reports/${id}/regenerate`)).data;

export const shareReport = async (id: number) => (await apiClient.post<ScoutingReport>(`/scouting-reports/${id}/share`)).data;

export const unshareReport = async (id: number) => (await apiClient.delete<ScoutingReport>(`/scouting-reports/${id}/share`)).data;

export const deleteReport = async (id: number) => {
  await apiClient.delete(`/scouting-reports/${id}`);
};

/** Public replays open for anyone; private ones only for their owner (the report's author). */
export const clipPath = (clip: ScoutingClip) =>
  `${clip.published ? '/public-matches' : '/matches'}/${clip.matchId}/replay?t=${Math.floor(clip.seconds)}`;

export const sharedReportUrl = (token: string) => `${window.location.origin}/scouting/shared/${token}`;
