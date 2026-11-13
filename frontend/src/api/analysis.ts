import apiClient from './client';
import type { MatchStatisticsData } from '../components/replay/StatisticsDashboard';
import type { AiEventData, AnalysisStatus, RallyData } from '../types/replay';

/**
 * The AI analysis of a match: start, follow, retry, cancel, and the Replay data it produces. The Replay data
 * of a published match is read through /public-matches, which needs no sign-in.
 */

export const getAnalysisStatus = async (matchId: string | number) =>
  (await apiClient.get<AnalysisStatus>(`/matches/${matchId}/analysis/status`)).data;

export const dispatchAnalysis = async (matchId: string | number) => {
  await apiClient.post(`/matches/${matchId}/analysis/dispatch`);
};

export const retryAnalysis = async (matchId: string | number) => {
  await apiClient.post(`/matches/${matchId}/analysis/retry`);
};

export const cancelAnalysis = async (matchId: string | number) =>
  (await apiClient.post<AnalysisStatus>(`/matches/${matchId}/analysis/cancel`)).data;

/** Asks the GPU worker to analyse the part of the video the viewer jumped to first. A hint only. */
export const focusAnalysis = async (matchId: string | number, seconds: number) => {
  await apiClient.post(`/matches/${matchId}/analysis/focus`, { seconds: Math.floor(seconds) });
};

const replayBase = (matchId: string | number, isPublic: boolean) =>
  isPublic ? `/public-matches/${matchId}` : `/matches/${matchId}/analysis`;

export const getReplayEvents = async (matchId: string | number, isPublic = false) =>
  (await apiClient.get<AiEventData[]>(`${replayBase(matchId, isPublic)}/events`)).data;

export const getReplayRallies = async (matchId: string | number, isPublic = false) =>
  (await apiClient.get<RallyData[]>(`${replayBase(matchId, isPublic)}/rallies`)).data;

export const getReplayStatistics = async (matchId: string | number, isPublic = false) =>
  (await apiClient.get<MatchStatisticsData>(`${replayBase(matchId, isPublic)}/statistics`)).data;
