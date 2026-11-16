import axios, { AxiosProgressEvent } from 'axios';
import apiClient from './client';
import type { Match, MatchVideo, Paged } from '../types/match';

/** Matches the signed-in user owns, their video, and the public library. */

export interface CreateMatchInput {
  playerAName: string;
  playerBName: string;
  upperPlayer: string;
  lowerPlayer: string;
  matchDate?: string;
  title?: string;
  description?: string;
}

export type UpdateMatchInput = Partial<Pick<Match,
  'playerAName' | 'playerBName' | 'upperPlayer' | 'lowerPlayer' | 'matchDate' | 'title' | 'description'
  | 'startGame' | 'startScoreA' | 'startScoreB'>>;

export const getMatch = async (id: string | number) => (await apiClient.get<Match>(`/matches/${id}`)).data;

export const listMyMatches = async (params: { page: number; size: number; status?: string }) =>
  (await apiClient.get<Paged<Match>>('/matches', { params })).data;

export const createMatch = async (input: CreateMatchInput) => (await apiClient.post<Match>('/matches', input)).data;

export const updateMatch = async (id: string | number, input: UpdateMatchInput) =>
  (await apiClient.put<Match>(`/matches/${id}`, input)).data;

export const deleteMatch = async (id: string | number) => {
  await apiClient.delete(`/matches/${id}`);
};

export const getMatchVideo = async (id: string | number) =>
  (await apiClient.get<MatchVideo>(`/matches/${id}/video`)).data;

export const attachYoutubeVideo = async (id: string | number, url: string) =>
  (await apiClient.post<MatchVideo>(`/matches/${id}/videos/youtube`, { url })).data;

export interface UploadCallbacks {
  onStage: (stage: 'uploading' | 'verifying') => void;
  onProgress: (percent: number) => void;
  /** e.g. "3.2 MB/s"; only reported for the direct upload to object storage. */
  onSpeed?: (speed: string) => void;
}

/**
 * Uploads a video straight to object storage with a presigned URL (NFR-VID-04), then registers it. When
 * presigning or the storage PUT fails, the file goes through the backend instead. A failure while
 * registering does not upload the whole video a second time.
 */
export const uploadMatchVideo = async (id: string | number, file: File, cb: UploadCallbacks): Promise<MatchVideo> => {
  let storagePath: string;
  try {
    const presigned = (await apiClient.post<{ uploadUrl: string; storagePath: string }>(
      `/matches/${id}/videos/upload-url`,
      { fileName: file.name, fileSize: file.size, mimeType: file.type || 'video/mp4' },
    )).data;
    storagePath = presigned.storagePath;
    cb.onStage('uploading');
    let since = Date.now();
    let lastLoaded = 0;
    await axios.put(presigned.uploadUrl, file, {
      timeout: 600000,
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (!e.total) return;
        cb.onProgress(Math.round((e.loaded * 100) / e.total));
        const elapsed = (Date.now() - since) / 1000;
        if (elapsed > 0.5) {
          cb.onSpeed?.(`${((e.loaded - lastLoaded) / elapsed / (1024 * 1024)).toFixed(1)} MB/s`);
          since = Date.now();
          lastLoaded = e.loaded;
        }
      },
    });
  } catch (presignErr) {
    console.warn('Presigned PUT không khả dụng, tự động chuyển sang Direct Upload:', presignErr);
    cb.onStage('uploading');
    const form = new FormData();
    form.append('file', file);
    return (await apiClient.post<MatchVideo>(`/matches/${id}/videos/direct-upload`, form, {
      timeout: 600000,
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e: AxiosProgressEvent) => {
        if (e.total) cb.onProgress(Math.round((e.loaded * 100) / e.total));
      },
    })).data;
  }

  cb.onStage('verifying');
  return (await apiClient.post<MatchVideo>(`/matches/${id}/videos/complete`, {
    storagePath,
    fileName: file.name,
    fileSize: file.size,
  })).data;
};

export const listPublicMatches = async (params: { page: number; size: number; search?: string }) =>
  (await apiClient.get<Paged<Match>>('/public-matches', { params })).data;

export const getPublicMatch = async (id: string | number) =>
  (await apiClient.get<Match>(`/public-matches/${id}`)).data;

export const getPublicMatchVideo = async (id: string | number) =>
  (await apiClient.get<MatchVideo>(`/public-matches/${id}/video`)).data;
