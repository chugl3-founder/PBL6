import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { ENV } from '../config/env';
import { ErrorResponse } from '../types/auth';

export const TOKEN_STORAGE_KEY = '@badminton_access_token';
export const REFRESH_TOKEN_STORAGE_KEY = '@badminton_refresh_token';
export const USER_STORAGE_KEY = '@badminton_user_profile';

const apiClient = axios.create({
  baseURL: ENV.API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: ENV.TIMEOUT_MS,
});

// Request Interceptor: Gắn Bearer Token từ AsyncStorage
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

// Response Interceptor: Tự động refresh token khi gặp HTTP 401
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponse>) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && originalRequest && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        const refreshToken = await AsyncStorage.getItem(REFRESH_TOKEN_STORAGE_KEY);
        if (refreshToken) {
          const res = await axios.post(`${ENV.API_BASE_URL}/auth/refresh-token`, {
            refreshToken,
          });

          const newAccessToken = res.data.accessToken;
          const newRefreshToken = res.data.refreshToken;

          await AsyncStorage.setItem(TOKEN_STORAGE_KEY, newAccessToken);
          if (newRefreshToken) {
            await AsyncStorage.setItem(REFRESH_TOKEN_STORAGE_KEY, newRefreshToken);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        }
      } catch (refreshErr) {
        // Refresh token không hợp lệ hoặc đã hết hạn -> xóa bộ nhớ đệm
        await AsyncStorage.multiRemove([TOKEN_STORAGE_KEY, REFRESH_TOKEN_STORAGE_KEY, USER_STORAGE_KEY]);
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

