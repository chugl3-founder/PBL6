import axios from 'axios';
import type { ErrorResponse } from './client';

/**
 * The server's message from an ErrorResponse when there is one, otherwise the given fallback. Lets callers
 * write `catch (err) { setError(errorMessage(err, '...')) }` without typing the error as any.
 */
export const errorMessage = (err: unknown, fallback: string): string => {
  if (axios.isAxiosError<ErrorResponse>(err)) {
    return err.response?.data?.message || fallback;
  }
  return fallback;
};

/** True when the request never reached the server (offline, server down, CORS). */
export const isNetworkError = (err: unknown) =>
  axios.isAxiosError(err) && (err.code === 'ERR_NETWORK' || !err.response);

/** The HTTP status of a failed request, if it got an answer. */
export const errorStatus = (err: unknown) => (axios.isAxiosError(err) ? err.response?.status : undefined);
