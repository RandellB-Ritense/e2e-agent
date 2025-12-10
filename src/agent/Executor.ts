import { Page } from 'playwright';
import { AgentAction } from './ActionSchema.js';
import { DebugLogger } from '../utils/DebugLogger.js';

/**
 * Configuration for action execution
 */
export interface ExecutorConfig {
  timeout?: number;
  retries?: number;
  waitAfterAction?: number;
}

/**
 * Executes agent actions using Playwright
 */
export class Executor {
  private config: Required<ExecutorConfig>;

  constructor(
    private page: Page,
    config: ExecutorConfig = {}
  ) {
    this.config = {
      timeout: config.timeout ?? 10000,
      retries: config.retries ?? 2,
      waitAfterAction: config.waitAfterAction ?? 500,
    };
  }

  /**
   * Execute an agent action
   * @param action The action to execute
   */
  async execute(action: AgentAction): Promise<void> {
    console.log(`[Executor] Executing action: ${action.action}`);
    console.log(`[Executor] Reason: ${action.reason}`);

    // Log action in debug mode
    const target = 'target' in action ? action.target : undefined;
    const value = 'value' in action ? action.value : undefined;
    DebugLogger.logAction(action.action, target, value, action.reason);

    try {
      switch (action.action) {
        case 'click':
          await this.executeClick(action.target);
          break;
        case 'fill':
          await this.executeFill(action.target, action.value);
          break;
        case 'navigate':
          await this.executeNavigate(action.target);
          break;
        case 'assert':
          await this.executeAssert(action.target, action.value);
          break;
        case 'wait':
          await this.executeWait(action.target, action.value);
          break;
        case 'finish':
          console.log(`[Executor] ✓ Finishing execution: ${action.reason}`);
          break;
        case 'error':
          console.log(`[Executor] ✗ Error encountered: ${action.reason}`);
          throw new Error(action.reason);
        default:
          const _exhaustive: never = action;
          throw new Error(`Unknown action type: ${JSON.stringify(_exhaustive)}`);
      }

      // Wait a bit after each action for the page to settle
      if (action.action !== 'finish') {
        await this.delay(this.config.waitAfterAction);
      }

      console.log(`[Executor] ✓ Action completed successfully\n`);
    } catch (error) {
      console.error(`[Executor] ✗ Action failed:`, error);
      throw error;
    }
  }

  /**
   * Execute a click action
   * @param selector The CSS selector to click
   */
  private async executeClick(selector: string): Promise<void> {
    console.log(`[Executor]   Clicking: ${selector}`);
    await this.retryOperation(async () => {
      await this.page.waitForSelector(selector, {
        timeout: this.config.timeout,
        state: 'visible',
      });
      await this.page.click(selector, { timeout: this.config.timeout });
    });
  }

  /**
   * Execute a fill action
   * @param selector The CSS selector to fill
   * @param value The value to fill in
   */
  private async executeFill(selector: string, value: string): Promise<void> {
    console.log(`[Executor]   Filling ${selector} with: "${value}"`);
    await this.retryOperation(async () => {
      await this.page.waitForSelector(selector, {
        timeout: this.config.timeout,
        state: 'visible',
      });
      // Clear existing value first
      await this.page.fill(selector, '', { timeout: this.config.timeout });
      // Then fill with new value
      await this.page.fill(selector, value, { timeout: this.config.timeout });
    });
  }

  /**
   * Execute a navigate action
   * @param url The URL to navigate to
   */
  private async executeNavigate(url: string): Promise<void> {
    console.log(`[Executor]   Navigating to: ${url}`);

    // Handle relative URLs
    let targetUrl = url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      const currentUrl = new URL(this.page.url());
      if (url.startsWith('/')) {
        targetUrl = `${currentUrl.origin}${url}`;
      } else {
        targetUrl = `${currentUrl.origin}/${url}`;
      }
    }

    await this.retryOperation(async () => {
      await this.page.goto(targetUrl, {
        timeout: this.config.timeout,
        waitUntil: 'networkidle',
      });
    });
  }

  /**
   * Execute an assert action
   * @param selector The CSS selector to check
   * @param expectedValue The expected value or text
   */
  private async executeAssert(selector: string, expectedValue: string): Promise<void> {
    console.log(`[Executor]   Asserting ${selector} contains: "${expectedValue}"`);

    await this.retryOperation(async () => {
      await this.page.waitForSelector(selector, {
        timeout: this.config.timeout,
        state: 'visible',
      });

      // Get the element
      const element = await this.page.locator(selector).first();

      // Try to get text content first
      const textContent = await element.textContent();
      const trimmedText = textContent?.trim() || '';

      // For input elements, also check the value
      const tagName = await element.evaluate((el) => el.tagName.toLowerCase());
      if (tagName === 'input' || tagName === 'textarea') {
        const inputValue = await element.inputValue();
        if (inputValue.includes(expectedValue) || trimmedText.includes(expectedValue)) {
          console.log(`[Executor]   ✓ Assertion passed`);
          return;
        }
      } else {
        if (trimmedText.includes(expectedValue)) {
          console.log(`[Executor]   ✓ Assertion passed`);
          return;
        }
      }

      throw new Error(
        `Assertion failed: expected "${expectedValue}" but found "${trimmedText}"`
      );
    });
  }

  /**
   * Execute a wait action
   * @param target What to wait for (selector or 'time')
   * @param value Optional value (milliseconds for time, or state for selector)
   */
  private async executeWait(target: string, value?: string): Promise<void> {
    if (target === 'time' || target === 'delay') {
      const ms = value ? parseInt(value, 10) : 1000;
      console.log(`[Executor]   Waiting for ${ms}ms`);
      await this.delay(ms);
    } else if (target === 'page to load' || target === 'page load' || target === 'networkidle') {
      console.log(`[Executor]   Waiting for network idle`);
      await this.page.waitForLoadState('networkidle', { timeout: this.config.timeout });
    } else {
      // Assume it's a selector
      console.log(`[Executor]   Waiting for selector: ${target}`);
      await this.retryOperation(async () => {
        await this.page.waitForSelector(target, {
          timeout: this.config.timeout,
          state: 'visible',
        });
      });
    }
  }

  /**
   * Retry an operation with exponential backoff
   * @param operation The operation to retry
   */
  private async retryOperation(operation: () => Promise<void>): Promise<void> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= this.config.retries; attempt++) {
      try {
        await operation();
        return; // Success!
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.retries) {
          const backoffMs = Math.min(1000 * Math.pow(2, attempt), 5000);
          console.log(`[Executor]   ⚠ Attempt ${attempt + 1} failed, retrying in ${backoffMs}ms...`);
          await this.delay(backoffMs);
        }
      }
    }

    // All retries failed
    throw lastError || new Error('Operation failed after all retries');
  }

  /**
   * Utility function to add delay
   * @param ms Milliseconds to delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
