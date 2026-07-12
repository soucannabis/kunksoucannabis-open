import { defineConfig, devices } from '@playwright/test';

const FRONT_URL = process.env.E2E_FRONT_URL || 'http://localhost:4255';
const API_URL = process.env.E2E_API_URL || `${FRONT_URL}/api/v1`;

export default defineConfig({
  testDir: './e2e',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  timeout: 90_000,
  expect: { timeout: 15_000 },
  reporter: [['list'], ['html', { open: 'never', outputFolder: 'playwright-report' }]],
  use: {
    baseURL: FRONT_URL,
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
    extraHTTPHeaders: {},
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
  webServer: {
    command: 'npm run dev -- --host 0.0.0.0 --port 4255',
    url: FRONT_URL,
    reuseExistingServer: true,
    timeout: 120_000,
  },
  metadata: { apiUrl: API_URL },
});
