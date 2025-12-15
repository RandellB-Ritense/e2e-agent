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
  private alternativeSelectorsMap: Map<string, string[]> = new Map();

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
   * Set alternative selectors for a given primary selector
   * @param primarySelector The primary selector
   * @param alternatives Array of alternative selectors
   */
  setAlternativeSelectors(primarySelector: string, alternatives: string[]): void {
    this.alternativeSelectorsMap.set(primarySelector, alternatives);
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
   * Try to find a working selector from the list of alternatives
   * @param primarySelector The primary selector to try first
   * @param operation The operation to perform with the working selector
   * @returns The selector that worked
   */
  private async trySelectorsWithFallback<T>(
    primarySelector: string,
    operation: (selector: string) => Promise<T>
  ): Promise<T> {
    const selectors = [primarySelector];
    const alternatives = this.alternativeSelectorsMap.get(primarySelector);
    if (alternatives && alternatives.length > 0) {
      selectors.push(...alternatives);
    }

    let lastError: Error | null = null;

    for (let i = 0; i < selectors.length; i++) {
      const selector = selectors[i];
      try {
        console.log(`[Executor]   Trying selector ${i + 1}/${selectors.length}: ${selector}`);
        const result = await operation(selector);
        if (i > 0) {
          console.log(`[Executor]   ✓ Fallback selector worked (priority ${i + 1})`);
        }
        return result;
      } catch (error) {
        lastError = error as Error;
        if (i < selectors.length - 1) {
          console.log(`[Executor]   ✗ Selector failed, trying next alternative...`);
        }
      }
    }

    // All selectors failed
    throw lastError || new Error('All selectors failed');
  }

  /**
   * Execute a click action
   * @param selector The CSS selector to click
   */
  private async executeClick(selector: string): Promise<void> {
    console.log(`[Executor]   Clicking: ${selector}`);
    await this.trySelectorsWithFallback(selector, async (currentSelector) => {
      await this.retryOperation(async () => {
        await this.page.waitForSelector(currentSelector, {
          timeout: this.config.timeout,
          state: 'visible',
        });
        await this.page.click(currentSelector, { timeout: this.config.timeout });
      });
    });
  }

  /**
   * Execute a fill action
   * @param selector The CSS selector to fill
   * @param value The value to fill in
   */
  private async executeFill(selector: string, value: string): Promise<void> {
    console.log(`[Executor]   Filling ${selector} with: "${value}"`);
    await this.trySelectorsWithFallback(selector, async (currentSelector) => {
      await this.retryOperation(async () => {
        await this.page.waitForSelector(currentSelector, {
          timeout: this.config.timeout,
          state: 'visible',
        });
        // Clear existing value first
        await this.page.fill(currentSelector, '', { timeout: this.config.timeout });
        // Then fill with new value
        await this.page.fill(currentSelector, value, { timeout: this.config.timeout });
      });
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
   * @param expectedValue The expected value or text. Special values:
   *   - "" (empty string) or "not-present": asserts element is not visible/present
   *   - "not-visible": asserts element exists but is not visible
   *   - "visible": asserts element is visible
   *   - any other string: asserts element contains that text/value
   */
  private async executeAssert(selector: string, expectedValue: string): Promise<void> {
    // Handle special cases for element visibility/absence
    if (expectedValue === '' || expectedValue === 'not-present') {
      console.log(`[Executor]   Asserting ${selector} is not present/visible`);
      await this.trySelectorsWithFallback(selector, async (currentSelector) => {
        await this.retryOperation(async () => {
          // Check if element is NOT visible
          const isVisible = await this.page.locator(currentSelector).isVisible().catch(() => false);
          if (isVisible) {
            throw new Error(`Assertion failed: element "${currentSelector}" should not be visible but it is`);
          }
          console.log(`[Executor]   ✓ Assertion passed: element is not visible`);
        });
      });
      return;
    }

    if (expectedValue === 'not-visible') {
      console.log(`[Executor]   Asserting ${selector} is not visible`);
      await this.trySelectorsWithFallback(selector, async (currentSelector) => {
        await this.retryOperation(async () => {
          const isVisible = await this.page.locator(currentSelector).isVisible().catch(() => false);
          if (isVisible) {
            throw new Error(`Assertion failed: element "${currentSelector}" should not be visible but it is`);
          }
          console.log(`[Executor]   ✓ Assertion passed: element is not visible`);
        });
      });
      return;
    }

    if (expectedValue === 'visible') {
      console.log(`[Executor]   Asserting ${selector} is visible`);
      await this.trySelectorsWithFallback(selector, async (currentSelector) => {
        await this.retryOperation(async () => {
          await this.page.waitForSelector(currentSelector, {
            timeout: this.config.timeout,
            state: 'visible',
          });
          console.log(`[Executor]   ✓ Assertion passed: element is visible`);
        });
      });
      return;
    }

    // Default behavior: check text content
    console.log(`[Executor]   Asserting ${selector} contains: "${expectedValue}"`);
    await this.trySelectorsWithFallback(selector, async (currentSelector) => {
      await this.retryOperation(async () => {
        await this.page.waitForSelector(currentSelector, {
          timeout: this.config.timeout,
          state: 'visible',
        });

        // Get the element
        const element = await this.page.locator(currentSelector).first();

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
    });
  }

  /**
   * Execute a wait action
   * @param target What to wait for (selector or 'time')
   * @param value Optional value (milliseconds for time, or state for selector)
   */
  private async executeWait(target: string, value?: string): Promise<void> {
    if (target === 'time' || target === 'delay') {
      const requestedMs = value ? parseInt(value, 10) : 1000;
      // Cap wait time at 1000ms to prevent LLM from getting stuck in long waits
      const ms = Math.min(requestedMs, 1000);
      if (requestedMs > 1000) {
        console.log(`[Executor]   LLM requested ${requestedMs}ms wait, capping at ${ms}ms`);
      }
      console.log(`[Executor]   Waiting for ${ms}ms`);
      await this.delay(ms);
    } else if (target === 'page to load' || target === 'page load' || target === 'networkidle') {
      console.log(`[Executor]   Waiting for network idle`);
      await this.page.waitForLoadState('networkidle', { timeout: this.config.timeout });
    } else {
      // Assume it's a selector
      console.log(`[Executor]   Waiting for selector: ${target}`);
      await this.trySelectorsWithFallback(target, async (currentSelector) => {
        await this.retryOperation(async () => {
          await this.page.waitForSelector(currentSelector, {
            timeout: this.config.timeout,
            state: 'visible',
          });
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
