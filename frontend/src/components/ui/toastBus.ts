import type { NoticeTone } from './Notice';

export const TOAST_EVENT = 'badminton:toast';

export interface ToastItem {
  id: number;
  tone: NoticeTone;
  message: string;
}

const emit = (tone: NoticeTone, message: string) =>
  window.dispatchEvent(new CustomEvent<Omit<ToastItem, 'id'>>(TOAST_EVENT, { detail: { tone, message } }));

/** A short confirmation of something just done (saved, deleted, copied); it goes away by itself. */
export const toast = {
  success: (message: string) => emit('success', message),
  error: (message: string) => emit('error', message),
  info: (message: string) => emit('info', message),
};
