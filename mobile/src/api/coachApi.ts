import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';
import { TOKEN_STORAGE_KEY } from './client';

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
    const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
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
    matchId?: number,
    onChunk?: (chunk: string) => void
  ): Promise<{ session_id: string; reply: string; video_citations: VideoCitation[] }> => {
    const headers = await coachApi.getAuthHeaders();
    const browserKey = await coachApi.getBrowserKey();

    const payload = {
      message,
      session_id: sessionId || null,
      match_id: matchId || null,
      browser_key: browserKey,
    };

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', `${ENV.API_BASE_URL}/coach/chat/stream`);
      for (const [k, v] of Object.entries(headers)) {
        xhr.setRequestHeader(k, v);
      }
      xhr.timeout = 45000;

      let seenIndex = 0;
      let reply = '';
      let sessionIdRet = sessionId || '';
      let citations: VideoCitation[] = [];

      const processChunk = (chunk: string) => {
        const lines = chunk.split('\n\n');
        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data:')) {
            try {
              const data = JSON.parse(trimmed.slice(5));
              if (data.text) {
                reply += data.text;
                onChunk?.(data.text);
              }
              if (data.session_id) sessionIdRet = data.session_id;
              if (data.video_citations) citations = data.video_citations;
            } catch {
              // Ignore partial JSON
            }
          }
        }
      };

      xhr.onprogress = () => {
        const newText = xhr.responseText.substring(seenIndex);
        const lastDoubleNewline = newText.lastIndexOf('\n\n');
        if (lastDoubleNewline !== -1) {
          const toProcess = newText.substring(0, lastDoubleNewline + 2);
          seenIndex += lastDoubleNewline + 2;
          processChunk(toProcess);
        }
      };

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          const remaining = xhr.responseText.substring(seenIndex);
          if (remaining.trim()) processChunk(remaining);
          resolve({ session_id: sessionIdRet, reply, video_citations: citations });
        } else {
          reject(new Error(`Coach request failed with status ${xhr.status}`));
        }
      };

      xhr.onerror = () => reject(new Error('Network error calling AI Coach'));
      xhr.ontimeout = () => reject(new Error('Timeout calling AI Coach'));
      xhr.send(JSON.stringify(payload));
    });
  },

  getSessions: async (matchId?: number): Promise<CoachSessionItem[]> => {
    const headers = await coachApi.getAuthHeaders();
    const browserKey = await coachApi.getBrowserKey();

    const params: Record<string, any> = { browser_key: browserKey };
    if (matchId) params.match_id = matchId;

    const res = await axios.get(`${ENV.API_BASE_URL}/coach/sessions`, {
      headers,
      params,
      timeout: 10000,
    });
    return res.data?.sessions || [];
  },

  getHistory: async (sessionId: string): Promise<CoachMessage[]> => {
    const headers = await coachApi.getAuthHeaders();
    const browserKey = await coachApi.getBrowserKey();

    const res = await axios.get(`${ENV.API_BASE_URL}/coach/sessions/${sessionId}/messages`, {
      headers,
      params: { browser_key: browserKey },
      timeout: 15000,
    });
    return res.data?.messages || [];
  },

  getAvailableMatches: async (): Promise<MatchOption[]> => {
    const headers = await coachApi.getAuthHeaders();
    const res = await axios.get(`${ENV.API_BASE_URL}/coach/matches`, {
      headers,
      timeout: 10000,
    });
    return res.data?.matches || [];
  },
};
