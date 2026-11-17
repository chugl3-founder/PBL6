import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';

export interface VideoCitation {
  match_id?: number;
  rally_number?: number;
  start_seconds: number;
  description?: string;
}

export interface CoachMessage {
  id: string | number;
  role: 'user' | 'assistant';
  content: string;
  video_citations?: VideoCitation[];
  created_at?: string;
}

export interface CoachSessionItem {
  session_id: string;
  user_id?: number | null;
  match_id?: number | null;
  title: string;
  created_at?: string;
}

export interface MatchOption {
  id: number;
  title: string;
  player_a: string;
  player_b: string;
  score: string;
  total_strokes: number;
}

export const coachApi = {
  getAuthHeaders: async (): Promise<Record<string, string>> => {
    const token = await AsyncStorage.getItem('access_token');
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }
    return headers;
  },

  getBrowserKey: async (): Promise<string> => {
    let key = await AsyncStorage.getItem('badminton_mobile_browser_key');
    if (!key) {
      key = 'mob_' + Math.random().toString(36).substring(2, 12);
      await AsyncStorage.setItem('badminton_mobile_browser_key', key);
    }
    return key;
  },

  sendMessage: async (
    message: string,
    sessionId?: string | null,
    matchId?: number
  ): Promise<{ session_id: string; reply: string; video_citations: VideoCitation[] }> => {
    const headers = await coachApi.getAuthHeaders();
    const browserKey = await coachApi.getBrowserKey();

    const payload = {
      message,
      session_id: sessionId || null,
      match_id: matchId || null,
      browser_key: browserKey,
    };

    const res = await axios.post(`${ENV.COACH_API_URL}/api/chat`, payload, {
      headers,
      timeout: 30000,
    });
    return res.data;
  },

  getSessions: async (matchId?: number): Promise<CoachSessionItem[]> => {
    const headers = await coachApi.getAuthHeaders();
    const browserKey = await coachApi.getBrowserKey();

    const params: Record<string, any> = { browser_key: browserKey };
    if (matchId) params.match_id = matchId;

    const res = await axios.get(`${ENV.COACH_API_URL}/api/chat/sessions`, {
      headers,
      params,
      timeout: 10000,
    });
    return res.data?.sessions || [];
  },

  getHistory: async (sessionId: string): Promise<CoachMessage[]> => {
    const headers = await coachApi.getAuthHeaders();
    const browserKey = await coachApi.getBrowserKey();

    const res = await axios.get(`${ENV.COACH_API_URL}/api/chat/history/${sessionId}`, {
      headers,
      params: { browser_key: browserKey },
      timeout: 15000,
    });
    return res.data?.messages || [];
  },

  getAvailableMatches: async (): Promise<MatchOption[]> => {
    const headers = await coachApi.getAuthHeaders();
    const res = await axios.get(`${ENV.COACH_API_URL}/api/matches/list`, {
      headers,
      timeout: 10000,
    });
    return res.data?.matches || [];
  },
};
