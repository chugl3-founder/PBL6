import { defineConfig, devices } from '@playwright/test';

// Web Testing sheet (WT-01..WT-11). Runs against the app started by
// START_ALL_SERVICES.bat: frontend on :5173 proxying /api to backend on :8080.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  workers: 1,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  globalSetup: './e2e/global-setup.ts',
  globalTeardown: './e2e/global-teardown.ts',
  reporter: [['list'], ['html', { outputFolder: 'e2e-report', open: 'never' }]],
  use: {
    baseURL: process.env.E2E_BASE_URL || 'http://localhost:5173',
    viewport: { width: 1920, height: 1080 },
    screenshot: 'on',
    trace: 'retain-on-failure',
  },
  // Branded Edge ships the H.264 decoder that Playwright's open-source Chromium lacks,
  // so uploaded MP4 match videos can actually play on the replay page.
  projects: [
    {
      name: 'msedge',
      use: { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1920, height: 1080 } },
    },
  ],
});
