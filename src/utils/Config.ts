/**
 * Centralized configuration loaded from environment variables
 */
export class Config {
  /**
   * Base URL for all tests (required)
   */
  static get BASE_URL(): string {
    const url = process.env.BASE_URL;
    if (!url) {
      throw new Error('BASE_URL environment variable is required. Please set it in your .env file.');
    }
    return url;
  }

  /**
   * Directory containing test instruction markdown files
   */
  static get INSTRUCTIONS_DIR(): string {
    return process.env.INSTRUCTIONS_DIR || 'instructions';
  }

  /**
   * Directory for generated Playwright test specs
   */
  static get GENERATED_TESTS_DIR(): string {
    return process.env.GENERATED_TESTS_DIR || './src/tests';
  }

  /**
   * Directory for test reports (HTML, JSON)
   */
  static get REPORTS_DIR(): string {
    return process.env.REPORTS_DIR || 'test-reports';
  }

  /**
   * Directory for debug screenshots
   */
  static get DEBUG_SCREENSHOTS_DIR(): string {
    return process.env.DEBUG_SCREENSHOTS_DIR || 'debug-screenshots';
  }

  /**
   * Playwright report output directory
   */
  static get PLAYWRIGHT_REPORT_DIR(): string {
    return process.env.PLAYWRIGHT_REPORT_DIR || 'test-reports/playwright-report';
  }

  /**
   * Maximum steps for tests (can be overridden per test)
   */
  static get DEFAULT_MAX_STEPS(): number {
    const steps = process.env.DEFAULT_MAX_STEPS;
    return steps ? parseInt(steps, 10) : 30;
  }

  /**
   * Auto dismiss cookie banners by default
   */
  static get AUTO_DISMISS_COOKIES(): boolean {
    const value = process.env.AUTO_DISMISS_COOKIES;
    if (value === undefined) return true; // Default to true
    return value === 'true' || value === '1' || value === 'yes';
  }

  /**
   * Enable debug mode by default
   */
  static get DEBUG_MODE(): boolean {
    const value = process.env.DEBUG_MODE;
    return value === 'true' || value === '1' || value === 'yes';
  }

  /**
   * LLM provider (openai, anthropic, mistral)
   */
  static get LLM_PROVIDER(): string {
    return process.env.LLM_PROVIDER || 'openai';
  }

  /**
   * Headless browser mode
   */
  static get HEADLESS(): boolean {
    const value = process.env.HEADLESS;
    if (value === undefined) return false; // Default to headed mode
    return value === 'true' || value === '1' || value === 'yes';
  }

  /**
   * Browser timeout in milliseconds
   */
  static get BROWSER_TIMEOUT(): number {
    const timeout = process.env.BROWSER_TIMEOUT;
    return timeout ? parseInt(timeout, 10) : 30000;
  }

  /**
   * Delay between test steps in milliseconds
   */
  static get STEP_DELAY(): number {
    const delay = process.env.STEP_DELAY;
    return delay ? parseInt(delay, 10) : 500;
  }

  /**
   * Get all configuration as an object for logging
   */
  static getAll(): Record<string, any> {
    return {
      BASE_URL: this.BASE_URL,
      INSTRUCTIONS_DIR: this.INSTRUCTIONS_DIR,
      GENERATED_TESTS_DIR: this.GENERATED_TESTS_DIR,
      REPORTS_DIR: this.REPORTS_DIR,
      DEBUG_SCREENSHOTS_DIR: this.DEBUG_SCREENSHOTS_DIR,
      PLAYWRIGHT_REPORT_DIR: this.PLAYWRIGHT_REPORT_DIR,
      DEFAULT_MAX_STEPS: this.DEFAULT_MAX_STEPS,
      AUTO_DISMISS_COOKIES: this.AUTO_DISMISS_COOKIES,
      DEBUG_MODE: this.DEBUG_MODE,
      LLM_PROVIDER: this.LLM_PROVIDER,
      HEADLESS: this.HEADLESS,
      BROWSER_TIMEOUT: this.BROWSER_TIMEOUT,
      STEP_DELAY: this.STEP_DELAY,
    };
  }
}
