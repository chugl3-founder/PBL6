import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { apiContext, loginAs, readState, videoTime, type E2EState } from './helpers';

// Function F — Phát lại trận đấu (Replay) và thống kê AI (WT-06..WT-11).
// Uses the match analysed in WT-05 (run both files in one invocation: global setup makes a new
// account each run), or an existing one via E2E_REPLAY_MATCH_ID with its owner's
// E2E_REPLAY_EMAIL / E2E_REPLAY_PASSWORD.

interface Ev { id: number; timeSeconds: number; stroke: string }
interface Rally {
  startTime: number; endTime: number; strokeSequence: string[];
  winnerSide?: string | null; winnerPlayer?: string | null; afterMatch?: boolean; beforeMatch?: boolean;
}

/** The rallies the replay lists: points only (no warm-up, post-match play or lets), as isShownRally. */
const isShown = (r: Rally) => !r.afterMatch && !r.beforeMatch
  && (!r.winnerSide || r.winnerSide === 'UPPER' || r.winnerSide === 'LOWER' || Boolean(r.winnerPlayer));

let owner: E2EState;
let matchId: number;
let api: APIRequestContext;
let events: Ev[];
let rallies: Rally[];

test.beforeAll(async () => {
  owner = readState();
  matchId = Number(process.env.E2E_REPLAY_MATCH_ID || owner.matchId);
  if (process.env.E2E_REPLAY_EMAIL) {
    const login = await (await apiContext()).post('/api/auth/login', {
      data: { email: process.env.E2E_REPLAY_EMAIL, password: process.env.E2E_REPLAY_PASSWORD },
    });
    const body = await login.json();
    owner = { ...owner, accessToken: body.accessToken, refreshToken: body.refreshToken, user: body.user };
  }
  api = await apiContext(owner.accessToken);
  events = (await (await api.get(`/api/matches/${matchId}/analysis/events`)).json()).map((e: Ev) => ({
    ...e, timeSeconds: Number(e.timeSeconds),
  }));
  rallies = (await (await api.get(`/api/matches/${matchId}/analysis/rallies`)).json()).map((r: Rally) => ({
    ...r, startTime: Number(r.startTime), endTime: Number(r.endTime),
  })).filter(isShown);
});

async function openReplay(page: Page): Promise<void> {
  await loginAs(page, owner);
  await page.goto(`/matches/${matchId}/replay`);
  await expect(page.getByRole('heading', { name: 'Diễn biến trận' })).toBeVisible({ timeout: 30_000 });
  await page.locator('video').first().evaluate(async (v: HTMLVideoElement) => {
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    v.pause();
  });
}

/** Hit markers on the "Diễn biến trận" strip, one per distinct hit time ("<cú> của <người> lúc mm:ss"). */
const markers = (page: Page) => page.getByRole('button', { name: / của .+ lúc \d+:\d\d$/ });
const distinctTimes = (list: Ev[]) => new Set(list.map((e) => e.timeSeconds)).size;
const rallyRows = (page: Page) => page.getByText(/^Pha \d+$/).locator('xpath=ancestor::button[1]');
const isPaused = (page: Page) => page.locator('video').first().evaluate((v: HTMLVideoElement) => v.paused);

test('WT-06 Mở trang Replay của trận đã phân tích', async ({ page }) => {
  await loginAs(page, owner);
  await page.goto(`/matches/${matchId}`);
  await page.getByRole('link', { name: /Xem lại trận đấu/ }).click();
  await expect(page).toHaveURL(new RegExp(`/matches/${matchId}/replay$`));

  await expect(page.getByRole('heading', { name: 'Diễn biến trận' })).toBeVisible({ timeout: 30_000 });
  await expect(page.getByText(`${rallies.length} pha cầu`).first()).toBeVisible();
  await expect(markers(page)).toHaveCount(distinctTimes(events));
  await expect(rallyRows(page)).toHaveCount(rallies.length);
  for (const tab of ['Tỉ số', 'Bản đồ nhiệt', 'Thống kê']) {
    await expect(page.getByRole('tab', { name: tab })).toBeVisible();
  }
  const duration = await page.locator('video').first().evaluate((v: HTMLVideoElement) =>
    v.readyState >= 1 ? v.duration : new Promise<number>((r) => v.addEventListener('loadedmetadata', () => r(v.duration), { once: true })));
  expect(duration).toBeGreaterThan(0);
});

test('WT-07 Nhảy đến cú đánh khi bấm vào timeline và dùng phím tắt', async ({ page }) => {
  await openReplay(page);
  // Dense rallies make neighbouring pins overlap; click the most isolated one.
  const times = [...new Set(events.map((e) => e.timeSeconds))].sort((a, b) => a - b);
  const gap = (i: number) => Math.min(
    i > 0 ? times[i] - times[i - 1] : Infinity,
    i < times.length - 1 ? times[i + 1] - times[i] : Infinity,
  );
  const idx = times.reduce((best, _t, i) => (gap(i) > gap(best) ? i : best), 0);
  await markers(page).nth(idx).click();
  await expect.poll(() => videoTime(page)).toBeGreaterThan(times[idx] - 1);
  expect(Math.abs((await videoTime(page)) - times[idx])).toBeLessThanOrEqual(1);

  // Drive playback only through the app's shortcuts so its isPlaying state stays in sync.
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  const p0 = await isPaused(page);
  await page.keyboard.press('Space');
  await expect.poll(() => isPaused(page)).toBe(!p0);
  await page.keyboard.press('Space');
  await expect.poll(() => isPaused(page)).toBe(p0);
  if (!(await isPaused(page))) {
    await page.keyboard.press('Space');
    await expect.poll(() => isPaused(page)).toBe(true);
  }

  const t0 = await videoTime(page);
  await page.keyboard.press('ArrowRight');
  await expect.poll(() => videoTime(page)).toBeCloseTo(t0 + 5, 0);
  await page.keyboard.press('ArrowLeft');
  await expect.poll(() => videoTime(page)).toBeCloseTo(t0, 0);

  await page.keyboard.press('?');
  await expect(page.getByText('Phím Tắt Điều Khiển Video')).toBeVisible();
  await page.keyboard.press('Escape');
  await expect(page.getByText('Phím Tắt Điều Khiển Video')).toBeHidden();
});

test('WT-08 Phát lại một pha cầu từ danh sách', async ({ page }) => {
  test.skip(rallies.length < 3, 'match has fewer than 3 rallies');
  await openReplay(page);
  const idx = Math.floor(rallies.length / 2);
  await rallyRows(page).nth(idx).click();

  await expect.poll(() => videoTime(page)).toBeGreaterThan(rallies[idx].startTime - 1);
  expect(Math.abs((await videoTime(page)) - rallies[idx].startTime)).toBeLessThanOrEqual(1.5);
  await expect.poll(() => isPaused(page)).toBe(false);
  await expect(rallyRows(page).nth(idx)).toHaveClass(/bg-pitch-soft/);
});

test('WT-09 Lọc cú đánh theo loại', async ({ page }) => {
  const labels: Record<string, string> = { SMASH: 'Đập cầu', DROP: 'Bỏ nhỏ', CLEAR: 'Phông cầu', NET_SHOT: 'Kéo lưới', SERVE: 'Giao cầu' };
  const byStroke = (code: string) => events.filter((e) => e.stroke.toUpperCase() === code);
  const stroke = Object.keys(labels).find((code) => byStroke(code).length > 0);
  test.skip(!stroke, 'match has none of the filterable strokes');
  await openReplay(page);
  const filter = page.getByRole('group', { name: 'Lọc cú đánh' });
  const chip = (name: string) => filter.getByRole('button', { name, exact: true });

  await chip(labels[stroke!]).click();
  await expect(chip(labels[stroke!])).toHaveAttribute('aria-pressed', 'true');
  await expect(markers(page)).toHaveCount(distinctTimes(byStroke(stroke!)));

  await chip('Tất cả').click();
  await expect(markers(page)).toHaveCount(distinctTimes(events));
});

test('WT-10 Xem phân tích cả trận và thống kê', async ({ page }) => {
  const stats = await (await api.get(`/api/matches/${matchId}/analysis/statistics`)).json();
  expect(stats.totalStrokes).toBe(events.length);
  expect(stats.totalRallies).toBeGreaterThanOrEqual(rallies.length); // the list leaves out lets and play outside the match

  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await openReplay(page);
  for (const tab of ['Bản đồ nhiệt', 'Thống kê', 'Tỉ số']) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('tab', { name: tab })).toHaveAttribute('aria-selected', 'true');
  }
  for (const side of ['Mất điểm', 'Cú đánh', 'Lối chơi', 'Sân', 'Pha cầu']) {
    await page.getByRole('button', { name: new RegExp(`^${side}$`) }).first().click();
  }
  expect(errors).toEqual([]);
});

test('WT-11 Giới hạn xem thử 300 giây đối với khách chưa đăng nhập', async ({ page, browser }) => {
  const publicApi = await apiContext();
  const list = (await (await publicApi.get('/api/public-matches', { params: { page: 0, size: 20 } })).json()).data ?? [];
  const publicId = (list as { id: number; totalRallies: number }[]).find((m) => m.totalRallies > 10)?.id;
  test.skip(!publicId, 'no public match with rallies');

  /** Clicks the first rally in the list after the 5-minute guest preview window. */
  const clickLateRally = async (p: Page) => {
    const rows = rallyRows(p);
    await expect(rows.first()).toBeVisible({ timeout: 30_000 });
    const count = await rows.count();
    let cutoff = 300;
    for (let i = 0; i < count; i++) {
      const m = (await rows.nth(i).innerText()).match(/(\d{1,2}):(\d{2})/);
      if (!m) continue;
      const sec = Number(m[1]) * 60 + Number(m[2]);
      if (i === 0) cutoff = sec + 301;
      if (sec >= cutoff) return rows.nth(i).click();
    }
    throw new Error('no rally after 5-minute preview window');
  };
  const modal = (p: Page) => p.getByRole('dialog', { name: 'Hết thời lượng xem thử' });

  await page.goto(`/public-matches/${publicId}/replay`);
  await clickLateRally(page);
  await expect(modal(page)).toBeVisible({ timeout: 15_000 });
  await expect(modal(page).getByRole('link', { name: 'Đăng nhập ngay' })).toBeVisible();
  await expect(modal(page).getByRole('link', { name: 'Tạo tài khoản' })).toBeVisible();

  const member = await browser.newPage();
  await loginAs(member, readState());
  await member.goto(`/public-matches/${publicId}/replay`);
  await clickLateRally(member);
  await member.waitForTimeout(3_000);
  await expect(modal(member)).toHaveCount(0);
  await member.close();
});
