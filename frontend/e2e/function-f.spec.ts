import { expect, test, type APIRequestContext, type Page } from '@playwright/test';
import { apiContext, loginAs, readState, videoTime, type E2EState } from './helpers';

// Function F — Phát lại trận đấu (Replay) và thống kê AI (WT-06..WT-11).
// Uses the match analysed in WT-05, or an existing one via E2E_REPLAY_MATCH_ID
// together with its owner's E2E_REPLAY_EMAIL / E2E_REPLAY_PASSWORD.

interface Ev { id: number; timeSeconds: number; stroke: string }
interface Rally { startTime: number; endTime: number; strokeSequence: string[] }

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
  }));
});

async function openReplay(page: Page): Promise<void> {
  await loginAs(page, owner);
  await page.goto(`/matches/${matchId}/replay`);
  await expect(page.getByText(/AI TIMELINE CÚ ĐÁNH/)).toBeVisible({ timeout: 30_000 });
  await page.locator('video').first().evaluate(async (v: HTMLVideoElement) => {
    if (v.readyState < 1) await new Promise((r) => v.addEventListener('loadedmetadata', r, { once: true }));
    v.pause();
  });
}

const markers = (page: Page) => page.locator('[class*="group/pin"]');

test('WT-06 Mở trang Replay của trận đã phân tích', async ({ page }) => {
  await loginAs(page, owner);
  await page.goto(`/matches/${matchId}`);
  await page.getByRole('link', { name: 'Xem Video Replay & Thống Kê AI' }).click();
  await expect(page).toHaveURL(new RegExp(`/matches/${matchId}/replay$`));

  await expect(page.getByText(`AI TIMELINE CÚ ĐÁNH (${events.length} SỰ KIỆN)`)).toBeVisible({ timeout: 30_000 });
  await expect(page.getByTitle(`Cú đánh (${events.length})`)).toBeVisible();
  await expect(page.getByTitle(`Pha cầu (${rallies.length})`)).toBeVisible();
  for (const legend of ['Smash / Vồ lưới', 'Drop / Bỏ nhỏ', 'Clear / Phông sâu', 'Drive / Tạt cầu', 'Serve / Giao cầu']) {
    await expect(page.getByText(legend)).toBeVisible();
  }
  const duration = await page.locator('video').first().evaluate((v: HTMLVideoElement) =>
    v.readyState >= 1 ? v.duration : new Promise<number>((r) => v.addEventListener('loadedmetadata', () => r(v.duration), { once: true })));
  expect(duration).toBeGreaterThan(0);
});

test('WT-07 Nhảy đến cú đánh khi bấm vào timeline và dùng phím tắt', async ({ page }) => {
  await openReplay(page);
  // Dense rallies make neighbouring pins overlap; click the most isolated one.
  const gap = (i: number) => Math.min(
    i > 0 ? events[i].timeSeconds - events[i - 1].timeSeconds : Infinity,
    i < events.length - 1 ? events[i + 1].timeSeconds - events[i].timeSeconds : Infinity,
  );
  const idx = events.reduce((best, _e, i) => (gap(i) > gap(best) ? i : best), 0);
  await markers(page).nth(idx).click();
  await expect.poll(() => videoTime(page)).toBeGreaterThan(events[idx].timeSeconds - 1);
  expect(Math.abs((await videoTime(page)) - events[idx].timeSeconds)).toBeLessThanOrEqual(1);

  // Drive playback only through the app's shortcuts so its isPlaying state stays in sync.
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  const paused = () => page.locator('video').first().evaluate((v: HTMLVideoElement) => v.paused);
  const p0 = await paused();
  await page.keyboard.press('Space');
  await expect.poll(paused).toBe(!p0);
  await page.keyboard.press('Space');
  await expect.poll(paused).toBe(p0);
  if (!(await paused())) {
    await page.keyboard.press('Space');
    await expect.poll(paused).toBe(true);
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
  await page.getByTitle(`Pha cầu (${rallies.length})`).click();
  const idx = Math.floor(rallies.length / 2);
  await page.getByRole('button', { name: 'Phát pha này' }).nth(idx).click();

  await expect.poll(() => videoTime(page)).toBeGreaterThan(rallies[idx].startTime - 1);
  expect(Math.abs((await videoTime(page)) - rallies[idx].startTime)).toBeLessThanOrEqual(1.5);
  await expect.poll(() => page.locator('video').first().evaluate((v: HTMLVideoElement) => v.paused)).toBe(false);
  await expect(page.getByText('Bên ghi điểm:').nth(idx)).toBeVisible();
  await expect(page.getByText('Chuỗi cú đánh:').first()).toBeVisible();
});

test('WT-09 Lọc cú đánh theo loại', async ({ page }) => {
  const smashes = events.filter((e) => e.stroke.toUpperCase() === 'SMASH').length;
  test.skip(smashes === 0, 'match has no SMASH');
  await openReplay(page);
  await page.getByRole('button', { name: 'SMASH', exact: true }).click();
  await expect(page.getByText(`AI TIMELINE CÚ ĐÁNH (${smashes} SỰ KIỆN)`)).toBeVisible();
  await expect(page.getByTitle(`Cú đánh (${smashes})`)).toBeVisible();
  await expect(markers(page)).toHaveCount(smashes);
  await expect(page.getByRole('button', { name: 'SMASH', exact: true })).toHaveClass(/bg-brand/);

  await page.getByRole('button', { name: 'ALL', exact: true }).click();
  await expect(page.getByText(`AI TIMELINE CÚ ĐÁNH (${events.length} SỰ KIỆN)`)).toBeVisible();
});

test('WT-10 Xem tab Chiến thuật và thống kê', async ({ page }) => {
  const stats = await (await api.get(`/api/matches/${matchId}/analysis/statistics`)).json();
  await openReplay(page);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));
  await page.getByTitle('Chiến thuật').click();
  await expect(page.getByText('Đang tải dữ liệu thống kê chuyên sâu...')).toBeHidden({ timeout: 3_000 });

  expect(stats.totalStrokes).toBe(events.length);
  expect(stats.totalRallies).toBe(rallies.length);
  await expect(page.locator('svg, canvas').first()).toBeVisible();
  expect(errors).toEqual([]);
});

test('WT-11 Giới hạn xem thử 300 giây đối với khách chưa đăng nhập', async ({ page, browser }) => {
  test.setTimeout(3 * 60_000);
  const publicApi = await apiContext();
  const list = (await (await publicApi.get('/api/public-matches', { params: { page: 0, size: 50 } })).json()).data ?? [];
  let publicId: number | undefined;
  for (const m of list) {
    const video = await publicApi.get(`/api/public-matches/${m.id}/video`);
    if (video.ok() && Number((await video.json()).durationSeconds) > 300) { publicId = m.id; break; }
  }
  test.skip(!publicId, 'no PUBLISHED match longer than 5 minutes');

  const seekTo = async (p: Page, seconds: number) => {
    await p.locator('input[type="range"]').first().evaluate((el: HTMLInputElement, s) => {
      const setter = Object.getOwnPropertyDescriptor(HTMLInputElement.prototype, 'value')!.set!;
      setter.call(el, String(s));
      el.dispatchEvent(new Event('input', { bubbles: true }));
      el.dispatchEvent(new Event('change', { bubbles: true }));
    }, seconds);
  };
  const modal = (p: Page) => p.getByText('Hết Thời Lượng Xem Thử');
  // 'k' toggles play/pause and the embedded YouTube player's initial state varies,
  // so toggle until playback carries the video past second 300 (or 4 tries).
  const playPast300 = async (p: Page) => {
    for (let attempt = 0; attempt < 4; attempt++) {
      await p.keyboard.press('k');
      if (await modal(p).isVisible({ timeout: 0 }).catch(() => false)) return;
      try {
        await expect(modal(p)).toBeVisible({ timeout: 12_000 });
        return;
      } catch { /* still paused: toggle again */ }
    }
  };

  await page.goto(`/public-matches/${publicId}/replay`);
  await expect(page.getByText(/AI TIMELINE CÚ ĐÁNH/)).toBeVisible({ timeout: 30_000 });
  await page.waitForTimeout(5_000);
  await expect(modal(page)).toBeHidden();
  await seekTo(page, 295);
  await page.locator('body').click({ position: { x: 5, y: 5 } });
  await playPast300(page);
  await expect(modal(page)).toBeVisible();
  await expect(page.getByText('Đăng nhập ngay')).toBeVisible();
  await expect(page.getByText('Tạo tài khoản')).toBeVisible();

  const member = await browser.newPage();
  await loginAs(member, readState());
  await member.goto(`/public-matches/${publicId}/replay`);
  await expect(member.getByText(/AI TIMELINE CÚ ĐÁNH/)).toBeVisible({ timeout: 30_000 });
  await seekTo(member, 295);
  await member.locator('body').click({ position: { x: 5, y: 5 } });
  await playPast300(member); // never sees the modal, so this exhausts all toggles (~50 s)
  await expect(modal(member)).toBeHidden();
  await member.close();
});
