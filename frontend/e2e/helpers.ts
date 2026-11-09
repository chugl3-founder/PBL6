import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { request, type APIRequestContext, type Page } from '@playwright/test';

const E2E_DIR = path.dirname(fileURLToPath(import.meta.url));
export const STATE_FILE = path.join(E2E_DIR, '.e2e-state.json');
export const SAMPLE_VIDEO =
  process.env.E2E_SAMPLE_VIDEO ||
  path.resolve(E2E_DIR, '../../AI_Classifier/work_dirs/eval_clips/test_5min_ginting_lee_45mb.mp4');

export interface E2EState {
  email: string;
  password: string;
  accessToken: string;
  refreshToken: string;
  user: unknown;
  matchId?: number;
}

export function readState(): E2EState {
  return JSON.parse(fs.readFileSync(STATE_FILE, 'utf-8'));
}

export function writeState(patch: Partial<E2EState>): void {
  const current = fs.existsSync(STATE_FILE) ? readState() : {};
  fs.writeFileSync(STATE_FILE, JSON.stringify({ ...current, ...patch }, null, 2));
}

export async function apiContext(token?: string): Promise<APIRequestContext> {
  return request.newContext({
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    extraHTTPHeaders: token ? { Authorization: `Bearer ${token}` } : {},
  });
}

/** Log the browser in by seeding the same localStorage keys LoginPage writes. */
export async function loginAs(page: Page, state: E2EState): Promise<void> {
  await page.addInitScript((s) => {
    localStorage.setItem('access_token', s.accessToken);
    localStorage.setItem('refresh_token', s.refreshToken);
    localStorage.setItem('user_info', JSON.stringify(s.user));
  }, state);
}

/** Current time of the HTML5 player on the replay page, in seconds. */
export async function videoTime(page: Page): Promise<number> {
  return page.locator('video').first().evaluate((v: HTMLVideoElement) => v.currentTime);
}
