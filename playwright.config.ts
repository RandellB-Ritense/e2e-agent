import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './generated-tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [['list'], ['html', {outputFolder: './test-reports/playwright-report'}],],
  use: {
    // Base URL can be overridden via BASE_URL or PLAYWRIGHT_BASE_URL environment variable
    baseURL: process.env.BASE_URL || process.env.PLAYWRIGHT_BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'] },
    },
  ],
});
