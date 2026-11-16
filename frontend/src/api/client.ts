import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import { clearSession, getAccessToken, getRefreshToken, saveTokens } from '../auth/session';

export interface ErrorDetail {
  field?: string;
  issue?: string;
}

export interface ErrorResponse {
  errorType: 'UPLOAD' | 'VALIDATION' | 'AI' | 'SYSTEM';
  code: string;
  message: string;
  details?: ErrorDetail[];
  timestamp?: string;
}

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 15000,
});

// Request Interceptor: Gắn Bearer Token
apiClient.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token && config.headers) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response Interceptor: Bắt lỗi chuẩn theo ErrorResponse
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<ErrorResponse>) => {
    // A 401 from login/register/password endpoints means wrong credentials, not an expired
    // session: let the page show the message instead of reloading /login and losing it.
    const isAuthRequest = (error.config?.url ?? '').startsWith('/auth/');
    if (error.response?.status === 401 && !isAuthRequest) {
      // Token hết hạn hoặc chưa đăng nhập
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      const refreshToken = getRefreshToken();

      if (refreshToken && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const baseURL = apiClient.defaults.baseURL || '/api';
          const res = await axios.post(`${baseURL}/auth/refresh-token`, { refreshToken });
          const newAccessToken = res.data.accessToken;
          saveTokens(newAccessToken, res.data.refreshToken);

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } catch {
          // Refresh thất bại -> xóa token và chuyển về đăng nhập
          clearSession();
          window.location.href = '/login';
        }
      } else if (!refreshToken) {
        clearSession();
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

