import apiClient from './client';
import type { AdminAnalysis, AdminHighlight, AdminSharedReport, DashboardMetrics, UserAccount } from '../types/admin';
import type { Match, Paged } from '../types/match';

/** Admin APIs: overview numbers, every match, user accounts and the AI analysis monitor. */

export const getDashboardMetrics = async () => (await apiClient.get<DashboardMetrics>('/admin/dashboard')).data;

/** status: 'ALL', a match status, or 'DELETED' for the recycle bin. */
export const listAdminMatches = async (status: string, size: number) => {
  const params: Record<string, string | number | boolean> = { page: 0, size };
  if (status === 'DELETED') {
    params.status = 'DELETED';
    params.includeDeleted = true;
  } else if (status !== 'ALL') {
    params.status = status;
  }
  return (await apiClient.get<Paged<Match>>('/admin/matches', { params })).data;
};

export const publishMatch = async (id: number) => (await apiClient.post<Match>(`/admin/matches/${id}/publish`)).data;

export const unpublishMatch = async (id: number) => (await apiClient.post<Match>(`/admin/matches/${id}/unpublish`)).data;

export const deleteMatchAsAdmin = async (id: number) => {
  await apiClient.delete(`/admin/matches/${id}`);
};

export const restoreMatch = async (id: number) => {
  await apiClient.post(`/admin/matches/${id}/restore`);
};

export const listUsers = async (search: string, status: string, size: number) => {
  const params: Record<string, string | number> = { page: 0, size };
  if (search.trim()) params.search = search.trim();
  if (status !== 'ALL') params.status = status;
  return (await apiClient.get<Paged<UserAccount>>('/admin/users', { params })).data;
};

export const setUserStatus = async (id: number, status: 'ACTIVE' | 'LOCKED') =>
  (await apiClient.put<UserAccount>(`/admin/users/${id}/status`, { status })).data;

export const listAnalyses = async (status: string, size: number) => {
  const params: Record<string, string | number> = { page: 0, size };
  if (status !== 'ALL') params.status = status;
  return (await apiClient.get<Paged<AdminAnalysis>>('/admin/ai-analyses', { params })).data;
};

export const retryAnalysisAsAdmin = async (id: number) =>
  (await apiClient.post<{ analysisId: number; message?: string }>(`/admin/ai-analyses/${id}/retry`)).data;

/** Scouting reports that are open to anyone with the link. */
export const listSharedReports = async (size: number) =>
  (await apiClient.get<Paged<AdminSharedReport>>('/admin/content/shared-reports', { params: { page: 0, size } })).data;

/** Turns the link off; the report stays with its owner. */
export const revokeSharedReport = async (id: number) => {
  await apiClient.post(`/admin/content/shared-reports/${id}/revoke`);
};

/** status: ALL, ACTIVE (queued or rendering), COMPLETED or FAILED. */
export const listAdminHighlights = async (status: string, size: number) =>
  (await apiClient.get<Paged<AdminHighlight>>('/admin/content/highlights', { params: { status, page: 0, size } })).data;

export const deleteHighlightAsAdmin = async (id: number) => {
  await apiClient.delete(`/admin/content/highlights/${id}`);
};
