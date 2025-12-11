import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: process.env.GENERATED_TESTS_DIR || './generated-tests',
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: [
    ['list'],
    ['html', { outputFolder: process.env.PLAYWRIGHT_REPORT_DIR || './test-reports/playwright-report' }],
  ],
  use: {
    // Base URL from environment variable
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
