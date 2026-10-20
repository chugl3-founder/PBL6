import apiClient from './client';
import { AiEventData, RallyData, MatchStatisticsData } from '../types/replay';

export const replayApi = {
  // Lấy danh sách AI Events
  getAiEvents: async (matchId: number | string, isPublic = true): Promise<AiEventData[]> => {
    const endpoint = isPublic
      ? `/public-matches/${matchId}/events`
      : `/matches/${matchId}/analysis/events`;
    const res = await apiClient.get<AiEventData[]>(endpoint);
    return res.data || [];
  },

  // Lấy danh sách Rallies (Pha cầu)
  getRallies: async (matchId: number | string, isPublic = true): Promise<RallyData[]> => {
    const endpoint = isPublic
      ? `/public-matches/${matchId}/rallies`
      : `/matches/${matchId}/analysis/rallies`;
    const res = await apiClient.get<RallyData[]>(endpoint);
    return res.data || [];
  },

  // Lấy Thống kê trận đấu
  getStatistics: async (matchId: number | string, isPublic = true): Promise<MatchStatisticsData> => {
    const endpoint = isPublic
      ? `/public-matches/${matchId}/statistics`
      : `/matches/${matchId}/analysis/statistics`;
    const res = await apiClient.get<MatchStatisticsData>(endpoint);
    return res.data;
  },
};

