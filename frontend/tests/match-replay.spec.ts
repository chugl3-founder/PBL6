import { test, expect } from '@playwright/test';

test.describe('Kiểm thử Giao diện Desktop: Match Replay & Video Analysis', () => {
  const MATCH_ID = '101';

  // Thiết lập Mock Data trước mỗi test case để test hoạt động độc lập và ổn định
  test.beforeEach(async ({ page }) => {
    // 0. Mock Video Stream để trình duyệt không bị chặn bởi ORB/CORS
    await page.route('**/sample-video.mp4', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'video/mp4',
        body: Buffer.from(
          'AAAAIGZ0eXBpc29tAAACAGlzb21pc28yYXZjMW1wNDEAAAAIZnJlZQAAAAYtZGF0AAAC',
          'base64'
        ),
      });
    });

    // 1. Mock thông tin trận đấu (khớp đầy đủ interface MatchData)
    await page.route(`**/public-matches/${MATCH_ID}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: Number(MATCH_ID),
          title: 'Trận Chung Kết Đơn Nam - Giải Vô Địch',
          playerAName: 'Nguyễn Văn A',
          playerBName: 'Trần Văn B',
          upperPlayer: 'PLAYER_A',
          lowerPlayer: 'PLAYER_B',
          matchDate: '2026-10-25',
          status: 'PROCESSED',
        }),
      });
    });

    // 2. Mock thông tin Video (thời lượng 600s = 10 phút)
    await page.route(`**/public-matches/${MATCH_ID}/video`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          id: 1,
          matchId: Number(MATCH_ID),
          fileName: 'match_101.mp4',
          storagePath: 'matches/101/video.mp4',
          videoUrl: '/sample-video.mp4',
          durationSeconds: 600,
          videoSourceType: 'DIRECT',
        }),
      });
    });

    // 3. Mock danh sách sự kiện AI gắn cờ cú đánh (Stroke Markers)
    await page.route(`**/public-matches/${MATCH_ID}/events`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            matchId: Number(MATCH_ID),
            timeSeconds: 15.0,
            stroke: 'SMASH',
            strokeSide: 'FOREHAND',
            playerSide: 'LOWER',
            confidence: 0.95,
            eventOrder: 1,
            shuttleX: 0.5,
            shuttleY: 0.8,
          },
          {
            id: 2,
            matchId: Number(MATCH_ID),
            timeSeconds: 45.0,
            stroke: 'CLEAR',
            strokeSide: 'BACKHAND',
            playerSide: 'UPPER',
            confidence: 0.88,
            eventOrder: 2,
            shuttleX: 0.4,
            shuttleY: 0.2,
          },
          {
            id: 3,
            matchId: Number(MATCH_ID),
            timeSeconds: 90.0,
            stroke: 'DROP',
            strokeSide: 'FOREHAND',
            playerSide: 'LOWER',
            confidence: 0.91,
            eventOrder: 3,
            shuttleX: 0.5,
            shuttleY: 0.45,
          },
        ]),
      });
    });

    // 4. Mock danh sách các pha cầu (Rallies)
    await page.route(`**/public-matches/${MATCH_ID}/rallies`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            rallyNumber: 1,
            startEventId: 1,
            endEventId: 1,
            startTime: 10.0,
            endTime: 25.0,
            duration: 15.0,
            totalStrokes: 5,
            boundaryType: 'IN',
            serverSide: 'LOWER',
            winnerSide: 'LOWER',
            winReason: 'winner_smash',
            scoreUpper: 0,
            scoreLower: 1,
            scoreText: '1 - 0',
            strokeSequence: ['SERVE', 'CLEAR', 'SMASH'],
            isComplete: true,
          },
          {
            id: 2,
            rallyNumber: 2,
            startEventId: 2,
            endEventId: 3,
            startTime: 40.0,
            endTime: 95.0,
            duration: 55.0,
            totalStrokes: 12,
            boundaryType: 'IN',
            serverSide: 'UPPER',
            winnerSide: 'UPPER',
            winReason: 'winner_net_shot',
            scoreUpper: 1,
            scoreLower: 1,
            scoreText: '1 - 1',
            strokeSequence: ['SERVE', 'CLEAR', 'DROP'],
            isComplete: true,
          },
        ]),
      });
    });

    // 5. Mock thống kê (statistics)
    await page.route(`**/public-matches/${MATCH_ID}/statistics`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({}),
      });
    });

    // Điều hướng đến trang Replay ở chế độ Khách vãng lai (Public route, không có access_token)
    await page.goto(`/public-matches/${MATCH_ID}/replay`);
    await page.waitForLoadState('domcontentloaded');
  });

  // TEST CASE 1: TRÌNH PHÁT VIDEO & NÚT ĐIỀU KHIỂN
  test('1. Kiểm tra trình phát Video và các nút điều khiển Play/Pause', async ({ page }) => {
    const videoElement = page.locator('video');
    await expect(videoElement).toBeVisible({ timeout: 10000 });

    // Bật muted để tuân thủ autoplay policy của trình duyệt
    await videoElement.evaluate((v: HTMLVideoElement) => {
      v.muted = true;
    });

    // Kiểm tra nút Play trên thanh điều khiển
    const playBtn = page.locator('button[title*="Phát"], button[title*="Play"]').first();
    await expect(playBtn).toBeVisible();

    // Click Play -> Trạng thái video chuyển sang phát
    await playBtn.click();
    await page.waitForTimeout(300);

    // Kiểm tra nút chuyển thành Tạm dừng (Pause)
    const pauseBtn = page.locator('button[title*="Tạm dừng"], button[title*="Pause"]').first();
    await expect(pauseBtn).toBeVisible();

    // Click Tạm dừng -> Trạng thái video dừng lại
    await pauseBtn.click();
    await page.waitForTimeout(300);
    const isPaused = await videoElement.evaluate((v: HTMLVideoElement) => v.paused);
    expect(isPaused).toBe(true);
  });

  // TEST CASE 2: THANH TIMELINE & GẮN CỜ MÀU CÚ ĐÁNH (STROKE MARKERS)
  test('2. Kiểm tra thanh Timeline gắn cờ màu cú đánh (Stroke Markers) và click để tua', async ({ page }) => {
    // 2.1 Kiểm tra sự hiện diện của thanh Timeline và các điểm Pin
    const markerPins = page.locator('.group\\/pin');
    await expect(markerPins).toHaveCount(3); // 3 sự kiện đã mock (SMASH, CLEAR, DROP)

    // 2.2 Kiểm tra mã màu đặc trưng: Cú SMASH có màu đỏ/hồng (#f43f5e)
    const firstPinDot = markerPins.first().locator('> div.rounded-full');
    await expect(firstPinDot).toHaveCSS('background-color', 'rgb(244, 63, 94)'); // #f43f5e

    // 2.3 Hover vào marker để kiểm tra Tooltip hiển thị tên cú đánh SMASH
    await markerPins.first().hover();
    const tooltip = markerPins.first().getByText('SMASH', { exact: true });
    await expect(tooltip).toBeVisible();

    // 2.4 Click vào Marker thứ 2 (CLEAR tại mốc 45.0s) -> Video phải tự động tua đến 45s
    await markerPins.nth(1).click();
    const videoCurrentTime = await page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime);
    expect(Math.round(videoCurrentTime)).toBe(45);
  });

  // TEST CASE 3: ĐIỀU HƯỚNG DANH SÁCH PHA CẦU (RALLIES EXPLORER)
  test('3. Kiểm tra danh sách Pha cầu (Rallies) và click điều hướng', async ({ page }) => {
    // 3.0 Chuyển sang Tab "Pha cầu" (Rallies tab)
    const ralliesTabBtn = page.getByRole('button', { name: /pha cầu|rallies/i });
    await ralliesTabBtn.click();

    // 3.1 Kiểm tra danh sách hiển thị đúng các pha cầu
    const rallyCards = page.locator('text=/Pha cầu \\d+/i');
    await expect(rallyCards.first()).toBeVisible({ timeout: 5000 });
    await expect(rallyCards).toHaveCount(2);

    // 3.2 Click vào "Pha cầu 2" (bắt đầu từ giây thứ 40.0)
    const rally2 = page.locator('text=Pha cầu 2').first();
    await rally2.click();

    // 3.3 Kiểm tra video đã tua đến mốc startTime của Pha cầu 2 (40s)
    const videoCurrentTime = await page.locator('video').evaluate((v: HTMLVideoElement) => v.currentTime);
    expect(Math.round(videoCurrentTime)).toBe(40);

    // 3.4 Kiểm tra thẻ Pha cầu 2 được kích hoạt (có viền sáng brand)
    const rally2Card = page.locator('div.cursor-pointer:has-text("Pha cầu 2")').first();
    await expect(rally2Card).toHaveClass(/border-brand/);
  });

  // TEST CASE 4: GIỚI HẠN GUEST PREVIEW 300S (5 PHÚT) CHO KHÁCH VÃNG LAI
  test('4. Kiểm tra popup cảnh báo giới hạn xem thử 300s đối với Khách vãng lai', async ({ page }) => {
    // 4.1 Đảm bảo chưa có access_token trong localStorage (vai trò Khách vãng lai)
    const token = await page.evaluate(() => localStorage.getItem('access_token'));
    expect(token).toBeNull();

    // 4.2 Giả lập video phát đến hoặc vượt qua mốc 300s (5 phút)
    const videoElement = page.locator('video');
    await videoElement.evaluate((v: HTMLVideoElement) => {
      v.currentTime = 301;
      v.dispatchEvent(new Event('timeupdate'));
    });

    // 4.3 Kiểm tra Modal "Hết Thời Lượng Xem Thử" xuất hiện
    const modalHeading = page.locator('text=Hết Thời Lượng Xem Thử');
    await expect(modalHeading).toBeVisible({ timeout: 5000 });

    const modalDesc = page.locator('text=/tối đa 5 phút \\(300 giây\\)/i');
    await expect(modalDesc).toBeVisible();

    // 4.4 Kiểm tra Video đã tự động bị tạm dừng (Paused) khi chạm mốc 300s
    const isPaused = await videoElement.evaluate((v: HTMLVideoElement) => v.paused);
    expect(isPaused).toBe(true);

    // 4.5 Kiểm tra 2 nút kêu gọi hành động: "Đăng nhập ngay" và "Tạo tài khoản"
    const loginLink = page.getByRole('link', { name: /Đăng nhập ngay/i });
    await expect(loginLink).toBeVisible();
    await expect(loginLink).toHaveAttribute('href', '/login');

    const registerLink = page.getByRole('link', { name: /Tạo tài khoản/i });
    await expect(registerLink).toBeVisible();
    await expect(registerLink).toHaveAttribute('href', '/register');

    // 4.6 Click nút "Đóng thông báo" -> Modal phải được ẩn đi
    const closeBtn = page.getByRole('button', { name: /Đóng thông báo/i });
    await closeBtn.click();
    await expect(modalHeading).not.toBeVisible();
  });
});
