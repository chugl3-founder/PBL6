import type { UserAccount } from '../types/admin';

/**
 * The signed-in session kept in localStorage: tokens and the user shown in the navigation. The only module
 * that knows the storage keys; everything else asks here.
 */

const ACCESS_TOKEN = 'access_token';
const REFRESH_TOKEN = 'refresh_token';
const USER_INFO = 'user_info';

export type SessionUser = Pick<UserAccount, 'id' | 'email' | 'role' | 'fullName'> & Partial<UserAccount>;

export const getAccessToken = () => localStorage.getItem(ACCESS_TOKEN);

export const getRefreshToken = () => localStorage.getItem(REFRESH_TOKEN);

export const isSignedIn = () => Boolean(getAccessToken());

export const getSessionUser = (): SessionUser | null => {
  const json = localStorage.getItem(USER_INFO);
  if (!json) return null;
  try {
    return JSON.parse(json) as SessionUser;
  } catch {
    return null;
  }
};

export const isAdmin = () => getSessionUser()?.role === 'ROLE_ADMIN';

export const saveSession = (accessToken: string, refreshToken: string | undefined, user: SessionUser) => {
  localStorage.setItem(ACCESS_TOKEN, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN, refreshToken);
  localStorage.setItem(USER_INFO, JSON.stringify(user));
};

/** After a token refresh: the user stays the same. */
export const saveTokens = (accessToken: string, refreshToken?: string) => {
  localStorage.setItem(ACCESS_TOKEN, accessToken);
  if (refreshToken) localStorage.setItem(REFRESH_TOKEN, refreshToken);
};

/** Merges profile changes (name, avatar) into the stored user. */
export const updateSessionUser = (changes: Partial<SessionUser>) => {
  const current = getSessionUser() ?? {};
  localStorage.setItem(USER_INFO, JSON.stringify({ ...current, ...changes }));
};

export const clearSession = () => {
  localStorage.removeItem(ACCESS_TOKEN);
  localStorage.removeItem(REFRESH_TOKEN);
  localStorage.removeItem(USER_INFO);
};
