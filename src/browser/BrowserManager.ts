import { chromium, Browser, BrowserContext, Page } from 'playwright';

/**
 * Manages the Playwright browser instance
 */
export class BrowserManager {
  private browser: Browser | null = null;
  private context: BrowserContext | null = null;
  private page: Page | null = null;

  /**
   * Launch a new Chromium browser instance
   */
  async launch(): Promise<void> {
    console.log('[BrowserManager] Launching Chromium browser...');
    this.browser = await chromium.launch({
      headless: false, // Set to true for headless mode
      slowMo: 100, // Slow down operations for visibility during development
    });

    this.context = await this.browser.newContext({
      viewport: { width: 1280, height: 720 },
    });

    this.page = await this.context.newPage();
    console.log('[BrowserManager] Browser launched successfully');
  }

  /**
   * Get the current page
   */
  getPage(): Page {
    if (!this.page) {
      throw new Error('Browser not launched. Call launch() first.');
    }
    return this.page;
  }

  /**
   * Navigate to a URL
   */
  async navigate(url: string): Promise<void> {
    const page = this.getPage();
    console.log(`[BrowserManager] Navigating to ${url}`);
    await page.goto(url, { waitUntil: 'networkidle' });
  }

  /**
   * Close the browser
   */
  async close(): Promise<void> {
    if (this.browser) {
      console.log('[BrowserManager] Closing browser...');
      await this.browser.close();
      this.browser = null;
      this.context = null;
      this.page = null;
      console.log('[BrowserManager] Browser closed');
    }
  }
}
