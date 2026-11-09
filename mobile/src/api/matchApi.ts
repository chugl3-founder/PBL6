import apiClient from './client';
import { MatchData, VideoData, CreateMatchRequest } from '../types/match';

export interface PageResponse<T> {
  data: T[];
  totalElements?: number;
  totalPages?: number;
  currentPage?: number;
}

export const matchApi = {
  // Trận đấu công khai
  getPublicMatches: async (page = 0, size = 20, search = ''): Promise<MatchData[]> => {
    const params = new URLSearchParams({ page: String(page), size: String(size) });
    if (search.trim()) {
      params.append('search', search.trim());
    }
    const res = await apiClient.get<PageResponse<MatchData> | MatchData[]>(`/public-matches?${params.toString()}`);
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data?.data || [];
  },

  getPublicMatchDetail: async (id: number | string): Promise<MatchData> => {
    const res = await apiClient.get<MatchData>(`/public-matches/${id}`);
    return res.data;
  },

  getPublicMatchVideo: async (id: number | string): Promise<VideoData> => {
    const res = await apiClient.get<VideoData>(`/public-matches/${id}/video`);
    return res.data;
  },

  // Trận đấu cá nhân (Yêu cầu đăng nhập)
  getMyMatches: async (page = 0, size = 20): Promise<MatchData[]> => {
    const res = await apiClient.get<PageResponse<MatchData> | MatchData[]>(`/matches?page=${page}&size=${size}`);
    if (Array.isArray(res.data)) {
      return res.data;
    }
    return res.data?.data || [];
  },

  getMyMatchDetail: async (id: number | string): Promise<MatchData> => {
    const res = await apiClient.get<MatchData>(`/matches/${id}`);
    return res.data;
  },

  getMyMatchVideo: async (id: number | string): Promise<VideoData> => {
    const res = await apiClient.get<VideoData>(`/matches/${id}/video`);
    return res.data;
  },

  createMatch: async (data: CreateMatchRequest): Promise<MatchData> => {
    const res = await apiClient.post<MatchData>('/matches', data);
    return res.data;
  },

  // Kích hoạt Mock Phân tích AI
  triggerAiAnalysis: async (matchId: number | string): Promise<any> => {
    const res = await apiClient.post(`/matches/${matchId}/analysis/start`);
    return res.data;
  },

  // Tải video trận đấu lên hệ thống
  uploadVideoDirect: async (
    matchId: number | string,
    fileUri: string,
    fileName: string,
    mimeType: string,
    onProgress?: (percent: number) => void
  ): Promise<VideoData> => {
    const formData = new FormData();
    formData.append('file', {
      uri: fileUri,
      name: fileName || 'video.mp4',
      type: mimeType || 'video/mp4',
    } as any);

    const res = await apiClient.post<VideoData>(
      `/matches/${matchId}/videos/direct-upload`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        timeout: 120000, // 2 phút cho file video lớn
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total && onProgress) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            onProgress(percent);
          }
        },
      }
    );
    return res.data;
  },
};

