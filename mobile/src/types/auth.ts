export interface User {
  id: number;
  email: string;
  fullName: string;
  role: 'ROLE_USER' | 'ROLE_ADMIN' | string;
  avatarUrl?: string;
  status?: string;
  createdAt?: string;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  fullName: string;
  email: string;
  password: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  tokenType: string;
  user: User;
}

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

