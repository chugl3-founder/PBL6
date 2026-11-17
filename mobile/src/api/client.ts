import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';
import { ErrorResponse } from '../types/auth';

export const TOKEN_STORAGE_KEY = '@badminton_access_token';
export const REFRESH_TOKEN_STORAGE_KEY = '@badminton_refresh_token';
export const USER_STORAGE_KEY = '@badminton_user_profile';

// Thông báo cho AuthContext khi phiên đăng nhập hết hạn và không làm mới được
type AuthExpiredListener = () => void;
const authExpiredListeners = new Set<AuthExpiredListener>();

export const onAuthExpired = (listener: AuthExpiredListener) => {
  authExpiredListeners.add(listener);
  return () => {
    authExpiredListeners.delete(listener);
  };
};

const clearSessionAndNotify = async () => {
  await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
  authExpiredListeners.forEach((listener) => listener());
};

// Dùng chung một lần làm mới token cho nhiều request 401 đồng thời
let refreshPromise: Promise<string | null> | null = null;

export const refreshAccessToken = async (): Promise<string | null> => {
  if (!refreshPromise) {
    refreshPromise = (async () => {
      const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
      if (!refreshToken) return null;
      try {
        const res = await axios.post(`${ENV.API_BASE_URL}/auth/refresh-token`, { refreshToken });
        const newAccessToken: string | undefined = res.data?.accessToken;
        if (!newAccessToken) return null;
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newAccessToken);
        if (res.data?.refreshToken) {
          await AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, res.data.refreshToken);
        }
        return newAccessToken;
      } catch {
        return null;
      }
    })().finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
};

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: ENV.TIMEOUT_MS,
});

// Gắn Bearer Token từ AsyncStorage
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    } catch (e) {
      console.warn('Lỗi khi đọc token từ AsyncStorage:', e);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Gặp 401: làm mới token một lần; nếu không được thì đăng xuất để người dùng đăng nhập lại
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
    const isAuthCall = originalRequest?.url?.includes('/auth/');

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry && !isAuthCall) {
      originalRequest._retry = true;
      const hadToken = Boolean(originalRequest.headers?.Authorization);
      const newAccessToken = await refreshAccessToken();
      if (newAccessToken) {
        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return apiClient(originalRequest);
      }
      if (hadToken) {
        await clearSessionAndNotify();
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;
