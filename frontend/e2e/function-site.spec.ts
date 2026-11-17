import { expect, test, type Page } from '@playwright/test';
import { apiContext, loginAs, readState } from './helpers';

// Site-wide pass over every page, as a guest and as a signed-in user (WT-S01..WT-S22).
// Read-only apart from the coach question: nothing here creates matches or reports.

const nav = (page: Page) => page.locator('nav[aria-label="Điều hướng chính"]');

/** Fails the test on uncaught page errors and on any 5xx answer from the API. */
function watchErrors(page: Page): () => void {
  const problems: string[] = [];
  page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
  page.on('response', (r) => {
    if (r.url().includes('/api/') && r.status() >= 500) problems.push(`${r.status()} ${r.url()}`);
  });
  return () => expect(problems, problems.join('\n')).toEqual([]);
}

/** First public match that has rallies after the 5-minute guest preview. */
async function publicMatchId(): Promise<number> {
  const api = await apiContext();
  const list = await (await api.get('/api/public-matches', { params: { page: 0, size: 20 } })).json();
  const match = (list.data as { id: number; totalRallies: number }[]).find((m) => m.totalRallies > 10);
  expect(match, 'a public match with rallies').toBeTruthy();
  return match!.id;
}

/** Clicks the first rally that starts at 05:00 or later in the replay rally list. */
async function clickRallyAfterPreview(page: Page): Promise<void> {
  const labels = page.getByText(/^Pha \d+$/);
  await expect(labels.first()).toBeVisible({ timeout: 30_000 });
  for (let i = 0; i < Math.min(await labels.count(), 40); i++) {
    const row = labels.nth(i).locator('xpath=ancestor::*[self::button or self::li or @role="button"][1]');
    const m = (await row.innerText()).match(/(\d{1,2}):(\d{2})/);
    if (m && Number(m[1]) * 60 + Number(m[2]) >= 300) {
      await row.click();
      return;
    }
  }
  throw new Error('no rally after 05:00 in the list');
}

test.describe('Khách chưa đăng nhập', () => {
  test('WT-S01 Trang chủ: menu, CTA, logo cuộn lên đầu', async ({ page }) => {
    const done = watchErrors(page);
    await page.goto('/');
    await expect(page.getByRole('link', { name: /Phân tích trận của bạn/ }).first()).toBeVisible();
    await expect(page.getByRole('link', { name: /Xem thư viện trận/ }).first()).toBeVisible();
    await expect(nav(page)).toContainText('Thư viện');
    await expect(nav(page)).toContainText('Vận động viên');
    await expect(nav(page)).not.toContainText('Tính năng');
    await expect(nav(page).getByLabel('cần đăng nhập')).toHaveCount(2);

    await page.evaluate(() => window.scrollTo(0, 1500));
    await page.getByRole('link', { name: 'BadmintonAI, trang chủ' }).click();
    await expect.poll(() => page.evaluate(() => window.scrollY)).toBe(0);
    done();
  });

  test('WT-S02 CTA "Xem thư viện trận" mở thư viện', async ({ page }) => {
    await page.goto('/');
    await page.getByRole('link', { name: /Xem thư viện trận/ }).first().click();
    await expect(page).toHaveURL(/\/public-matches$/);
  });

  test('WT-S03 Thư viện: danh sách, tìm kiếm, mở replay', async ({ page }) => {
    const done = watchErrors(page);
    await page.goto('/public-matches');
    await expect(page.getByRole('heading', { name: 'Thư viện trận đấu' })).toBeVisible();
    const cards = page.locator('a[href*="/public-matches/"][href$="/replay"]');
    await expect(cards.first()).toBeVisible({ timeout: 20_000 });
    const before = await cards.count();

    await page.getByPlaceholder('Tìm vận động viên, giải đấu').fill('zzzz-khong-co-tran-nay');
    await expect.poll(() => cards.count(), { timeout: 10_000 }).toBeLessThan(before);
    await page.getByPlaceholder('Tìm vận động viên, giải đấu').fill('');
    await expect.poll(() => cards.count(), { timeout: 10_000 }).toBe(before);

    await cards.first().click();
    await expect(page).toHaveURL(/\/public-matches\/\d+\/replay$/);
    await expect(page.getByText(/^Pha 1$/).first()).toBeVisible({ timeout: 30_000 });
    done();
  });

  test('WT-S04 Replay công khai: giới hạn xem thử 5 phút và nút trong thông báo', async ({ page }) => {
    const done = watchErrors(page);
    await page.goto(`/public-matches/${await publicMatchId()}/replay`);
    await clickRallyAfterPreview(page);
    const modal = page.getByRole('dialog', { name: 'Hết thời lượng xem thử' });
    await expect(modal).toBeVisible({ timeout: 15_000 });
    await expect(modal.locator('> div')).toHaveCSS('background-color', 'rgb(255, 255, 255)');
    await modal.getByRole('button', { name: 'Đóng thông báo' }).click();
    await expect(modal).toBeHidden();

    await clickRallyAfterPreview(page);
    await page.getByRole('link', { name: 'Đăng nhập ngay' }).click();
    await expect(page).toHaveURL(/\/login$/);
    done();
  });

  test('WT-S05 Vận động viên: danh sách, tìm kiếm, hồ sơ và các tab', async ({ page }) => {
    const done = watchErrors(page);
    await page.goto('/players');
    await expect(page.getByRole('heading', { name: 'Vận động viên' })).toBeVisible();
    const players = page.locator('a[href^="/players/"]');
    await expect(players.first()).toBeVisible({ timeout: 20_000 });
    await players.first().click();
    await expect(page).toHaveURL(/\/players\/.+/);
    for (const tab of ['Cú đánh', 'Vị trí trên sân', 'Trận đấu', 'Tổng quan']) {
      const t = page.getByRole('tab', { name: new RegExp(tab) });
      await t.click();
      await expect(t).toHaveAttribute('aria-selected', 'true');
    }
    await expect(page.getByText(/Đối thủ|Lịch sử trận đấu|Hồ sơ lối chơi/).first()).toBeVisible();
    done();
  });

  for (const path of ['/my-matches', '/matches/create', '/profile', '/scouting', '/highlights', '/admin']) {
    test(`WT-S06 Trang cần đăng nhập ${path} chuyển về /login`, async ({ page }) => {
      await page.goto(path);
      await expect(page).toHaveURL(/\/login$/);
    });
  }

  test('WT-S07 AI Coach: khách chỉ thấy thẻ mời đăng nhập, API trả 401', async ({ page }) => {
    await page.goto('/players');
    await expect(page.getByRole('button', { name: 'Mở trợ lý ảo AI' })).toHaveCount(0);
    await page.getByRole('button', { name: 'Trợ lý AI Coach' }).click();
    const teaser = page.getByRole('dialog', { name: 'AI Coach' });
    await expect(teaser).toContainText('So sánh phong độ');
    await page.mouse.click(10, 400);
    await expect(teaser).toBeHidden();

    await page.getByRole('button', { name: 'Trợ lý AI Coach' }).click();
    await teaser.getByRole('link', { name: 'Đăng ký' }).click();
    await expect(page).toHaveURL(/\/register$/);
    await expect(page.getByRole('button', { name: 'Trợ lý AI Coach' })).toHaveCount(0);

    const api = await apiContext();
    expect((await api.post('/api/coach/chat/stream', { data: { message: 'hi' } })).status()).toBe(401);
    expect((await api.get('/api/coach/sessions')).status()).toBe(401);
  });

  test('WT-S08 Đăng nhập sai mật khẩu báo lỗi', async ({ page }) => {
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(readState().email);
    await page.locator('input[type="password"]').fill('SaiMatKhau@999');
    await page.locator('form button[type="submit"]').click();
    await expect(page.locator('[role="alert"]').first()).toBeVisible({ timeout: 10_000 });
    await expect(page).toHaveURL(/\/login$/);
  });

  test('WT-S09 Đăng ký: không gửi được khi để trống', async ({ page }) => {
    await page.goto('/register');
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/register$/);
    const invalid = await page.locator('form input:invalid').count();
    const alert = await page.locator('[role="alert"]').count();
    expect(invalid + alert).toBeGreaterThan(0);
  });

  test('WT-S10 Quên mật khẩu hiển thị biểu mẫu', async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('link', { name: /Quên mật khẩu/ }).click();
    await expect(page).toHaveURL(/\/forgot-password$/);
    await expect(page.getByPlaceholder('vandongvien@example.com')).toBeVisible();
  });

  test('WT-S11 Đường dẫn không tồn tại quay về trang chủ', async ({ page }) => {
    await page.goto('/khong-ton-tai');
    await expect(page).toHaveURL(/\/$/);
  });
});

test.describe('Người dùng đã đăng nhập', () => {
  test('WT-S12 Đăng nhập bằng biểu mẫu vào "Trận của tôi"', async ({ page }) => {
    const done = watchErrors(page);
    const { email, password } = readState();
    await page.goto('/login');
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/my-matches$/, { timeout: 15_000 });
    await expect(page.getByRole('heading', { name: 'Trận của tôi' })).toBeVisible();
    await expect(nav(page).getByLabel('cần đăng nhập')).toHaveCount(0);
    done();
  });

  test('WT-S13 Bấm mục bị khóa, đăng nhập xong quay lại đúng trang', async ({ page }) => {
    const { email, password } = readState();
    await page.goto('/');
    await nav(page).getByRole('link', { name: /Highlight/ }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.locator('input[type="email"]').fill(email);
    await page.locator('input[type="password"]').fill(password);
    await page.locator('form button[type="submit"]').click();
    await expect(page).toHaveURL(/\/highlights$/, { timeout: 15_000 });
  });

  test.describe('trang làm việc', () => {
    test.beforeEach(async ({ page }) => loginAs(page, readState()));

    test('WT-S14 Menu và các trang chính đều mở được', async ({ page }) => {
      const done = watchErrors(page);
      const pages: [string, RegExp][] = [
        ['/my-matches', /Trận của tôi/],
        ['/matches/create', /Trận mới/],
        ['/profile', /Hồ sơ cá nhân/],
        ['/scouting', /Trinh sát đối thủ/],
        ['/highlights', /Video highlight/],
        ['/public-matches', /Thư viện trận đấu/],
        ['/players', /Vận động viên/],
      ];
      for (const [path, heading] of pages) {
        await page.goto(path);
        await expect(page.getByRole('heading', { name: heading }).first(), path).toBeVisible({ timeout: 20_000 });
      }
      done();
    });

    test('WT-S15 Tạo trận: thiếu tên vận động viên thì không tạo', async ({ page }) => {
      await page.goto('/matches/create');
      await page.getByPlaceholder('VD: Nguyễn Tiến Minh').fill('');
      await page.locator('form button[type="submit"]').first().click();
      await expect(page).toHaveURL(/\/matches\/create$/);
    });

    test('WT-S16 Hồ sơ cá nhân hiển thị thông tin tài khoản', async ({ page }) => {
      await page.goto('/profile');
      await expect(page.getByPlaceholder('Nguyễn Văn A')).toHaveValue(/E2E Tester/, { timeout: 15_000 });
    });

    test('WT-S17 Trinh sát: tìm đối thủ gợi ý tên', async ({ page }) => {
      await page.goto('/scouting');
      await page.getByPlaceholder('Tìm đối thủ sắp gặp…').fill('a');
      await expect(page.getByRole('option').first()).toBeVisible({ timeout: 15_000 });
    });

    test('WT-S18 Replay công khai: người đăng nhập xem quá 5 phút không bị chặn', async ({ page }) => {
      await page.goto(`/public-matches/${await publicMatchId()}/replay`);
      await clickRallyAfterPreview(page);
      await page.waitForTimeout(3_000);
      await expect(page.getByRole('dialog', { name: 'Hết thời lượng xem thử' })).toHaveCount(0);
    });

    test('WT-S19 Người dùng thường vào /admin bị đưa về trang chủ', async ({ page }) => {
      await page.goto('/admin');
      await expect(page).toHaveURL(/\/$/);
    });

    test('WT-S20 AI Coach trả lời, có lịch sử và cuộc trò chuyện mới', async ({ page }) => {
      test.setTimeout(120_000);
      const done = watchErrors(page);
      await page.goto('/players');
      await expect(page.getByRole('button', { name: 'Trợ lý AI Coach' })).toHaveCount(0);
      await page.getByRole('button', { name: 'Mở trợ lý ảo AI' }).click();
      const input = page.getByPlaceholder(/Hỏi về luật BWF/);
      await input.fill('Một ván đấu đơn kết thúc ở bao nhiêu điểm?');
      await input.press('Enter');
      await expect(page.getByText(/21/).last()).toBeVisible({ timeout: 90_000 });
      // The stream must also end cleanly: a broken end (e.g. the ASYNC dispatch denied) replaces the answer.
      await expect(page.getByTitle('Bắt đầu cuộc trò chuyện mới (+)')).toBeEnabled();
      await page.waitForTimeout(5_000);
      await expect(page.getByText(/Không kết nối được tới Huấn luyện viên AI/)).toHaveCount(0);

      await page.getByTitle('Xem lịch sử hội thoại').click();
      await expect(page.getByRole('heading', { name: 'Lịch sử hội thoại' })).toBeVisible();
      await page.getByTitle('Quay lại khung chat').click();
      await page.getByTitle('Bắt đầu cuộc trò chuyện mới (+)').click();
      await expect(page.getByText(/Xin chào! Tôi là/).last()).toBeVisible();
      done();
    });

    test('WT-S23 AI Coach hiển thị đúng định dạng câu trả lời', async ({ page }) => {
      // A fixed answer instead of Gemini, so every markdown form appears every time.
      const answer = [
        '#### Luật giao cầu',
        '* *Lưu ý trước đây:* luật dùng **thắt lưng**, nay là ***1,15 m***.',
        'Cú `smash` mạnh nhất; 2 * 3 vẫn là phép nhân.',
      ].join('\n');
      await page.route('**/api/coach/chat/stream', (route) =>
        route.fulfill({
          status: 200,
          contentType: 'text/event-stream',
          body: `data: ${JSON.stringify({ text: answer })}\n\ndata: ${JSON.stringify({ done: true })}\n\n`,
        }),
      );
      await page.goto('/players');
      await page.getByRole('button', { name: 'Mở trợ lý ảo AI' }).click();
      const input = page.getByPlaceholder(/Hỏi về luật BWF/);
      await input.fill('Luật giao cầu?');
      await input.press('Enter');

      await expect(page.getByRole('heading', { name: 'Luật giao cầu' })).toBeVisible();
      await expect(page.locator('em', { hasText: 'Lưu ý trước đây:' })).toBeVisible();
      await expect(page.locator('strong', { hasText: 'thắt lưng' })).toBeVisible();
      await expect(page.locator('strong.italic', { hasText: '1,15 m' })).toBeVisible();
      await expect(page.locator('code', { hasText: 'smash' })).toBeVisible();
      await expect(page.getByText('2 * 3 vẫn là phép nhân.', { exact: false })).toBeVisible();
      const shown = await page.getByText(/Lưu ý trước đây/).locator('xpath=ancestor::li[1]').innerText();
      expect(shown).not.toMatch(/[*#`]/);
    });

    test('WT-S21 AI Coach: Gợi ý trận và So sánh mở đúng màn', async ({ page }) => {
      await page.goto('/players');
      await page.getByRole('button', { name: 'Mở trợ lý ảo AI' }).click();
      await page.getByRole('button', { name: /Gợi ý trận/ }).first().click();
      await expect(page.getByRole('heading', { name: 'Gợi ý trận đấu' })).toBeVisible();
      await page.getByTitle('Quay lại khung chat').click();
      await page.getByRole('button', { name: /So sánh/ }).first().click();
      await expect(page.getByRole('heading', { name: 'So sánh phong độ' })).toBeVisible();
    });

  });

  test('WT-S22 Đăng xuất: về trang đăng nhập, chatbot biến mất', async ({ page }) => {
      // Signs in through the form: loginAs would re-seed the token on every page load.
      const { email, password } = readState();
      await page.goto('/login');
      await page.locator('input[type="email"]').fill(email);
      await page.locator('input[type="password"]').fill(password);
      await page.locator('form button[type="submit"]').click();
      await expect(page).toHaveURL(/\/my-matches$/, { timeout: 15_000 });
      await page.getByRole('button', { name: /E2E Tester/ }).click();
      await page.getByRole('menuitem', { name: /Đăng xuất/ }).or(page.getByRole('button', { name: /Đăng xuất/ })).first().click();
      await expect(page).toHaveURL(/\/login$/);
      await expect(page.getByRole('button', { name: 'Mở trợ lý ảo AI' })).toHaveCount(0);
      await page.goto('/my-matches');
      await expect(page).toHaveURL(/\/login$/);
  });
});
