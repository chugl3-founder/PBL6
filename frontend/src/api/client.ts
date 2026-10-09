import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';

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
    const token = localStorage.getItem('access_token');
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
    if (error.response?.status === 401) {
      // Token hết hạn hoặc chưa đăng nhập
      const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };
      const refreshToken = localStorage.getItem('refresh_token');

      if (refreshToken && !originalRequest._retry) {
        originalRequest._retry = true;
        try {
          const baseURL = apiClient.defaults.baseURL || '/api';
          const res = await axios.post(`${baseURL}/auth/refresh-token`, { refreshToken });
          const newAccessToken = res.data.accessToken;
          const newRefreshToken = res.data.refreshToken;
          localStorage.setItem('access_token', newAccessToken);
          if (newRefreshToken) {
            localStorage.setItem('refresh_token', newRefreshToken);
          }

          if (originalRequest.headers) {
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
          }
          return apiClient(originalRequest);
        } catch {
          // Refresh thất bại -> xóa token và chuyển về đăng nhập
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user_info');
          window.location.href = '/login';
        }
      } else if (!refreshToken) {
        localStorage.removeItem('access_token');
        localStorage.removeItem('user_info');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default apiClient;

