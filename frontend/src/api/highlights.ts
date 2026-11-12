import apiClient from './client';

export interface HighlightCandidate {
  rallyId: number;
  rallyNumber: number;
  startTime: number;
  endTime: number;
  clipStart: number;
  clipEnd: number;
  totalStrokes: number;
  winnerSide: string;
  /** Game of the match and the per-player score (A, B of the match) the rally was played at. */
  gameNumber: number;
  scoreABefore: number;
  scoreBBefore: number;
  score: number;
  label: string;
  reasons: string[];
  suggested: boolean;
}

export interface HighlightSuggestions {
  matchId: number;
  analysisId: number;
  defaultTitle: string;
  maxReelSeconds: number;
  maxClips: number;
  candidates: HighlightCandidate[];
}

export type HighlightStatus = 'QUEUED' | 'RENDERING' | 'COMPLETED' | 'FAILED';

export interface HighlightReel {
  id: number;
  matchId: number;
  playerAName: string;
  playerBName: string;
  analysisId: number;
  title: string;
  status: HighlightStatus;
  progressPercent: number;
  clipCount: number;
  durationSeconds: number | null;
  fileSize: number | null;
  errorMessage: string | null;
  videoUrl: string | null;
  downloadUrl: string | null;
  createdAt: string;
  completedAt: string | null;
}

/** Seconds of the intro card the media worker puts before the clips. */
export const INTRO_SECONDS = 3;

export const getHighlightSuggestions = async (matchId: string | number) =>
  (await apiClient.get<HighlightSuggestions>(`/matches/${matchId}/highlights/suggestions`)).data;

export const isRendering = (reel: HighlightReel) => reel.status === 'QUEUED' || reel.status === 'RENDERING';

/** Every reel of the signed-in user, across matches. */
export const listMyHighlightReels = async () => (await apiClient.get<HighlightReel[]>('/highlights')).data;

export const listHighlightReels = async (matchId: string | number) =>
  (await apiClient.get<HighlightReel[]>(`/matches/${matchId}/highlights`)).data;

export const createHighlightReel = async (matchId: string | number, body: { title?: string; rallyIds: number[] }) =>
  (await apiClient.post<HighlightReel>(`/matches/${matchId}/highlights`, body)).data;

export const deleteHighlightReel = async (matchId: string | number, reelId: number) => {
  await apiClient.delete(`/matches/${matchId}/highlights/${reelId}`);
};
