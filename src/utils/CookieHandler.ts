import { Page } from 'playwright';

/**
 * Handles automatic dismissal of cookie consent banners
 */
export class CookieHandler {
  /**
   * Common selectors for cookie consent banners
   */
  private static readonly BANNER_SELECTORS = [
    '[id*="cookie"]',
    '[class*="cookie"]',
    '[id*="consent"]',
    '[class*="consent"]',
    '[id*="gdpr"]',
    '[class*="gdpr"]',
    '[id*="privacy"]',
    '[class*="privacy"]',
    '[role="dialog"]',
    '[role="banner"]',
    '.modal',
    '#onetrust-banner-sdk',
    '#cookieNotice',
    '.cookie-banner',
    '.cookie-consent',
  ];

  /**
   * Common text patterns for accept buttons (case-insensitive)
   */
  private static readonly ACCEPT_PATTERNS = [
    'accept all',
    'accept cookies',
    'allow all',
    'allow cookies',
    'agree',
    'i agree',
    'ok',
    'got it',
    'understand',
    'continue',
    'yes',
    'accepteren', // Dutch
    'akzeptieren', // German
    'accepter', // French
    'aceptar', // Spanish
  ];

  /**
   * Try to dismiss cookie banners automatically
   * @param page Playwright page object
   * @param timeout Maximum time to wait for banner (ms)
   * @returns True if a banner was dismissed, false otherwise
   */
  static async dismissCookieBanner(page: Page, timeout: number = 5000): Promise<boolean> {
    try {
      console.log('[CookieHandler] Checking for cookie consent banners...');

      // Strategy 1: Look for visible accept buttons by text
      const accepted = await this.tryAcceptByText(page, timeout);
      if (accepted) {
        console.log('[CookieHandler] ✓ Cookie banner dismissed successfully');
        await page.waitForTimeout(1000); // Wait for banner to disappear
        return true;
      }

      // Strategy 2: Look for common button selectors within banner containers
      const acceptedBySelector = await this.tryAcceptBySelector(page, timeout);
      if (acceptedBySelector) {
        console.log('[CookieHandler] ✓ Cookie banner dismissed successfully');
        await page.waitForTimeout(1000);
        return true;
      }

      console.log('[CookieHandler] No cookie banner found or already dismissed');
      return false;
    } catch (error) {
      console.log('[CookieHandler] No action taken:', error instanceof Error ? error.message : 'Unknown error');
      return false;
    }
  }

  /**
   * Try to find and click accept button by text content
   */
  private static async tryAcceptByText(page: Page, timeout: number): Promise<boolean> {
    // Create a regex pattern from accept patterns
    const pattern = this.ACCEPT_PATTERNS.join('|');
    const regex = new RegExp(`^(${pattern})$`, 'i');

    // Try to find visible buttons/links with accept text
    const selectors = [
      'button',
      'a',
      '[role="button"]',
      'div[onclick]',
    ];

    for (const selector of selectors) {
      try {
        // Get all elements of this type
        const elements = await page.$$(selector);

        for (const element of elements) {
          // Check if element is visible
          const isVisible = await element.isVisible();
          if (!isVisible) continue;

          // Get text content
          const text = await element.textContent();
          if (!text) continue;

          // Check if text matches accept patterns
          if (regex.test(text.trim())) {
            console.log(`[CookieHandler] Found accept button with text: "${text.trim()}"`);
            await element.click({ timeout: 2000 });
            return true;
          }
        }
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }

    return false;
  }

  /**
   * Try to find banner container and click accept button within it
   */
  private static async tryAcceptBySelector(page: Page, timeout: number): Promise<boolean> {
    // Common button selectors that might be inside cookie banners
    const buttonSelectors = [
      'button[id*="accept"]',
      'button[class*="accept"]',
      'button[id*="agree"]',
      'button[class*="agree"]',
      'a[id*="accept"]',
      'a[class*="accept"]',
      '[data-testid*="accept"]',
      '[data-testid*="cookie"]',
      '.accept-button',
      '#accept-button',
      '.cookie-accept',
      '#onetrust-accept-btn-handler',
      '.cookie-consent-accept',
    ];

    for (const selector of buttonSelectors) {
      try {
        // Check if element exists and is visible
        const element = await page.$(selector);
        if (!element) continue;

        const isVisible = await element.isVisible();
        if (!isVisible) continue;

        console.log(`[CookieHandler] Found accept button with selector: ${selector}`);
        await element.click({ timeout: 2000 });
        return true;
      } catch (error) {
        // Continue to next selector
        continue;
      }
    }

    return false;
  }

  /**
   * Check if a cookie banner is currently visible on the page
   * @param page Playwright page object
   * @returns True if a banner is detected, false otherwise
   */
  static async hasCookieBanner(page: Page): Promise<boolean> {
    try {
      for (const selector of this.BANNER_SELECTORS) {
        const element = await page.$(selector);
        if (element && (await element.isVisible())) {
          const text = await element.textContent();
          // Check if it contains cookie/consent related text
          if (text && /cookie|consent|privacy|gdpr/i.test(text)) {
            return true;
          }
        }
      }
      return false;
    } catch (error) {
      return false;
    }
  }
}
