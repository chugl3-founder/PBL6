import apiClient from './client';
import { clearSession, getRefreshToken, saveSession, SessionUser } from '../auth/session';
import type { UserAccount } from '../types/admin';

/** Sign-in, sign-up, password reset and the signed-in user's own profile. */

/** Signs in and stores the session; returns the user so the caller can route admins elsewhere. */
export const login = async (email: string, password: string) => {
  const { accessToken, refreshToken, user } = (await apiClient.post<{
    accessToken: string;
    refreshToken: string;
    user: SessionUser;
  }>('/auth/login', { email, password })).data;
  saveSession(accessToken, refreshToken, user);
  return user;
};

/** Ends the session on the server when possible; the local session is cleared in any case. */
export const logout = async () => {
  const refreshToken = getRefreshToken();
  try {
    if (refreshToken) await apiClient.post('/auth/logout', { refreshToken });
  } catch {
    // The server session expires by itself.
  } finally {
    clearSession();
  }
};

export const register = async (input: {
  email: string;
  password: string;
  fullName: string;
  badmintonLevel?: string;
  gender?: string;
}) => {
  await apiClient.post('/auth/register', input);
};

export const requestPasswordReset = async (email: string) => {
  await apiClient.post('/auth/forgot-password', { email });
};

export const resetPassword = async (token: string | null, newPassword: string) => {
  await apiClient.post('/auth/reset-password', { token, newPassword });
};

export const getMyProfile = async () => (await apiClient.get<UserAccount>('/users/me')).data;

export const updateMyProfile = async (input: {
  fullName: string;
  age: number | null;
  gender?: string;
  badmintonLevel?: string;
}) => (await apiClient.put<UserAccount>('/users/me', input)).data;

export const uploadAvatar = async (file: File) => {
  const form = new FormData();
  form.append('avatar', file);
  return (await apiClient.post<{ avatarUrl: string }>('/users/me/avatar', form, {
    headers: { 'Content-Type': 'multipart/form-data' },
  })).data;
};
