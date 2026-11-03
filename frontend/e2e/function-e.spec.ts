import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { expect, test } from '@playwright/test';
import { apiContext, loginAs, readState, SAMPLE_VIDEO, writeState } from './helpers';

// Function E — Tạo trận đấu, tải video và kích hoạt phân tích AI (WT-01..WT-05).
// Runs in file order on one worker: WT-01 creates the match that WT-03 and WT-05
// upload to and analyse; a failing case does not stop the ones after it.

const PLAYER_A = 'Nguyễn Tiến Minh';
const PLAYER_B = 'Lee Chong Wei';

test.beforeEach(async ({ page }) => {
  await loginAs(page, readState());
});

function matchUrl(): string {
  return `/matches/${readState().matchId}`;
}

test('WT-01 Tạo trận đấu mới với thông tin hợp lệ', async ({ page }) => {
  await page.goto('/matches/create');
  await page.getByPlaceholder('VD: Nguyễn Tiến Minh').fill(PLAYER_A);
  await page.getByPlaceholder('VD: Lee Chong Wei').fill(PLAYER_B);
  await page.locator('input[type="date"]').fill('2026-11-01');
  await page.getByRole('button', { name: /Sân trên \(Xa\)/ }).first().click();
  await page.getByRole('button', { name: 'Tạo Trận Đấu & Tiếp Tục' }).click();

  await expect(page).toHaveURL(/\/matches\/\d+$/);
  writeState({ matchId: Number(page.url().split('/').pop()) });
  await expect(page.getByText('Bản nháp (Chờ tải video)')).toBeVisible();
  await expect(page.getByText(`Trận đấu: ${PLAYER_A} vs ${PLAYER_B}`).first()).toBeVisible();
  await expect(page.getByText(PLAYER_A).first()).toBeVisible();
  await expect(page.getByText(PLAYER_B).first()).toBeVisible();
});

test('WT-02 Không cho tạo trận khi thiếu tên vận động viên', async ({ page }) => {
  const api = await apiContext(readState().accessToken);
  const before = (await (await api.get('/api/matches', { params: { page: 0, size: 100 } })).json()).data.length;

  await page.goto('/matches/create');
  const playerA = page.getByPlaceholder('VD: Nguyễn Tiến Minh');
  await page.getByPlaceholder('VD: Lee Chong Wei').fill(PLAYER_B);
  await page.getByRole('button', { name: 'Tạo Trận Đấu & Tiếp Tục' }).click();
  expect(await playerA.evaluate((el: HTMLInputElement) => el.validity.valueMissing)).toBe(true);
  await expect(page).toHaveURL(/\/matches\/create$/);

  await playerA.fill('   ');
  await page.getByRole('button', { name: 'Tạo Trận Đấu & Tiếp Tục' }).click();
  await expect(page.getByText('Vui lòng nhập họ tên của cả 2 vận động viên.')).toBeVisible();

  const after = (await (await api.get('/api/matches', { params: { page: 0, size: 100 } })).json()).data.length;
  expect(after).toBe(before);
});

test('WT-03 Tải video hợp lệ lên trận đấu', async ({ page }) => {
  test.skip(!fs.existsSync(SAMPLE_VIDEO), `sample video missing: ${SAMPLE_VIDEO}`);
  test.setTimeout(10 * 60_000);
  await page.goto(matchUrl());
  await page.locator('input[type="file"]').setInputFiles(SAMPLE_VIDEO);
  await page.getByRole('button', { name: 'Bắt đầu tải lên MinIO' }).click();

  await expect(page.getByText(/\d{1,3}%/).first()).toBeVisible();
  await expect(page.getByText('Video sẵn sàng')).toBeVisible({ timeout: 9 * 60_000 });
  await expect(page.locator('video').first()).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bắt đầu Phân tích AI' })).toBeVisible();
});

test('WT-04 Báo lỗi khi tải video sai định dạng hoặc quá dung lượng', async ({ page }) => {
  const api = await apiContext(readState().accessToken);
  const draft = await api.post('/api/matches', {
    data: { playerAName: PLAYER_A, playerBName: PLAYER_B, upperPlayer: 'PLAYER_A', lowerPlayer: 'PLAYER_B', matchDate: '2026-11-01', title: 'WT-04 draft' },
  });
  const draftId = (await draft.json()).id;
  const big = path.join(os.tmpdir(), 'e2e_520mb.mp4');
  fs.writeFileSync(big, '');
  fs.truncateSync(big, 520 * 1024 * 1024); // sparse file: only the size matters

  await page.goto(`/matches/${draftId}`);
  const fileInput = page.locator('input[type="file"]');
  await fileInput.setInputFiles(big);
  await expect(page.getByText('Dung lượng file vượt quá giới hạn tối đa 500MB.')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Bắt đầu tải lên MinIO' })).toBeDisabled();

  await fileInput.setInputFiles({ name: 'sample.avi', mimeType: 'video/x-msvideo', buffer: Buffer.alloc(1024 * 1024) });
  await page.getByRole('button', { name: 'Bắt đầu tải lên MinIO' }).click();
  await expect(page.getByText('Định dạng video không được hỗ trợ. Vui lòng chọn file MP4.')).toBeVisible();
  await expect(page.getByText('Bản nháp (Chờ tải video)')).toBeVisible();
  fs.unlinkSync(big);
});

test('WT-05 Kích hoạt phân tích AI và theo dõi đến khi hoàn tất', async ({ page }) => {
  test.setTimeout(40 * 60_000);
  await page.goto(matchUrl());
  const statusPolls: number[] = [];
  page.on('request', (req) => {
    if (req.url().includes('/analysis/status')) statusPolls.push(Date.now());
  });

  await page.getByRole('button', { name: 'Bắt đầu Phân tích AI' }).click();
  await expect(page.getByText('Đang phân tích AI')).toBeVisible();
  await expect(page.getByText('Mã phản hồi: HTTP 202 Accepted')).toBeVisible();
  await expect(page.getByRole('button', { name: 'Hủy phân tích' })).toBeVisible();

  await page.waitForTimeout(7_000);
  const recent = statusPolls.filter((t) => t > Date.now() - 7_000);
  expect(recent.length).toBeGreaterThanOrEqual(3); // polled roughly every 2 s without reload

  await expect(page.getByText('Trận đấu đã phân tích thành công! Dữ liệu Replay & Thống kê đã sẵn sàng.'))
    .toBeVisible({ timeout: 38 * 60_000 });
  await expect(page.getByText('Đã phân tích').first()).toBeVisible();
  await expect(page.getByRole('link', { name: 'Xem Video Replay & Thống Kê AI' })).toBeVisible();
});
