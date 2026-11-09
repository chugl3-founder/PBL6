import { defineConfig, devices } from '@playwright/test';

// E2E_MAXIMIZED=1 (demo): the Edge window fills the real screen instead of a fixed
// 1920x1080 page, which overflows a scaled laptop display. A null viewport cannot
// carry the device scale factor, so the Desktop Edge preset is left out then.
const maximized = process.env.E2E_MAXIMIZED === '1';
const browserArgs = [
  ...(process.env.E2E_BROWSER_ARGS ? process.env.E2E_BROWSER_ARGS.split(' ') : []),
  ...(maximized ? ['--start-maximized'] : []),
];

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
    // E2E_SLOWMO=400 slows every action down so an audience can follow the browser during a demo.
    launchOptions: {
      slowMo: Number(process.env.E2E_SLOWMO || 0),
      args: browserArgs,
    },
  },
  // Branded Edge ships the H.264 decoder that Playwright's open-source Chromium lacks,
  // so uploaded MP4 match videos can actually play on the replay page.
  projects: [
    {
      name: 'msedge',
      use: maximized
        ? { channel: 'msedge', viewport: null }
        : { ...devices['Desktop Edge'], channel: 'msedge', viewport: { width: 1920, height: 1080 } },
    },
  ],
});
