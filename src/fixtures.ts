import { test as base } from '@playwright/test';

// Extend base test with a fixture that automatically navigates to base URL
export const test = base.extend({
  page: async ({ page, baseURL }, use) => {
    if (!baseURL) {
      throw new Error('BASE_URL environment variable is not set');
    }
    
    // Navigate to base URL before each test
    await page.goto(baseURL);
    
    // Provide the page to the test
    await use(page);
  },
});

export { expect } from '@playwright/test';
