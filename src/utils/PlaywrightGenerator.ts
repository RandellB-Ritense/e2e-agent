import { TestReport, ActionRecord } from '../types/TestReport.js';
import { AgentAction } from '../agent/ActionSchema.js';
import { SelectorOptimizer } from './SelectorOptimizer.js';

/**
 * Generates Playwright test specs from test execution history
 */
export class PlaywrightGenerator {
  /**
   * Generate a Playwright test spec from a test report
   */
  static generateSpec(report: TestReport): string {
    const imports = this.generateImports();
    const testBody = this.generateTestBody(report);

    let baseURLComment = '';
    if (report.baseURL) {
      baseURLComment = `    // Base URL: ${report.baseURL}
    // The fixture will automatically navigate to BASE_URL from your .env file
    `;
    }

    return `${imports}

test.describe('${this.escapeString(report.testName)}', () => {
  test('${this.escapeString(report.goal)}', async ({ page }) => {
    // Generated from AI E2E Agent test execution
    // Original test: ${this.escapeString(report.testName)}
    // Execution date: ${report.startTime.toISOString()}
    // Status: ${report.status}
    // Duration: ${(report.durationMs / 1000).toFixed(2)}s
${baseURLComment}
${testBody}
  });
});
`;
  }

  /**
   * Generate import statements
   */
  private static generateImports(): string {
    return `import { test, expect } from '../fixtures';`;
  }

  /**
   * Generate the test body from action history
   */
  private static generateTestBody(report: TestReport): string {
    const lines: string[] = [];
    const baseURL = report.baseURL;

    // Filter out finish and error actions as they're not executable
    const executableActions = report.actionHistory.filter(
      record => record.action.action !== 'finish' && record.action.action !== 'error'
    );

    executableActions.forEach((record, index) => {
      const action = record.action;
      const stepComment = `// Step ${record.stepNumber}: ${this.escapeString(action.reason)}`;

      lines.push(`    ${stepComment}`);

      const code = this.generateActionCode(record, baseURL);
      if (code) {
        lines.push(`    ${code}`);
      }

      // Add blank line between steps for readability
      if (index < executableActions.length - 1) {
        lines.push('');
      }
    });

    // Add success criteria assertions if available
    if (report.successCriteria && report.successCriteria.length > 0) {
      lines.push('');
      lines.push('    // Success criteria validation');
      report.successCriteria.forEach((criterion, index) => {
        lines.push(`    // ${index + 1}. ${this.escapeString(criterion)}`);
      });
    }

    return lines.join('\n');
  }

  /**
   * Generate code for a specific action using intelligent selector optimization
   */
  private static generateActionCode(record: ActionRecord, baseURL?: string): string {
    const action = record.action;

    switch (action.action) {
      case 'navigate':
        // Convert to relative path if it's within the same baseURL
        let targetPath = action.target;
        if (baseURL) {
          try {
            const url = new URL(action.target);
            const base = new URL(baseURL);
            if (url.host === base.host && url.protocol === base.protocol) {
              // Same domain - use relative path
              targetPath = url.pathname + url.search + url.hash;
              if (targetPath === '/') {
                targetPath = '.';
              }
            }
          } catch (error) {
            // If URL parsing fails, use the original target
          }
        }
        return `await page.goto('${this.escapeString(targetPath)}');`;

      case 'click':
        return `await ${this.getOptimizedLocator(record)}.click();`;

      case 'fill':
        return `await ${this.getOptimizedLocator(record)}.fill('${this.escapeString(action.value)}');`;

      case 'assert':
        // Generate an expect assertion based on the value
        if (action.value === '' || action.value === 'not-present' || action.value === 'not-visible') {
          // Element should NOT be visible
          return `await expect(${this.getOptimizedLocator(record)}).not.toBeVisible();`;
        } else if (action.value === 'visible') {
          // Element should be visible
          return `await expect(${this.getOptimizedLocator(record)}).toBeVisible();`;
        } else {
          // Default to checking text content (substring match, like the LLM does)
          return `await expect(${this.getOptimizedLocator(record)}).toContainText('${this.escapeString(action.value)}');`;
        }

      case 'wait':
        // Parse wait time from value if provided
        const waitTime = action.value ? parseInt(action.value) : 1000;
        if (action.target === 'timeout' || action.target === 'time') {
          return `await page.waitForTimeout(${waitTime});`;
        } else {
          // Wait for selector
          return `await ${this.getOptimizedLocator(record)}.waitFor();`;
        }

      case 'finish':
      case 'error':
        // These are not executable actions
        return '';

      default:
        return `// Unknown action: ${(action as any).action}`;
    }
  }

  /**
   * Get optimized Playwright locator using element context when available
   * Falls back to legacy selector generation if context is missing
   */
  private static getOptimizedLocator(record: ActionRecord): string {
    const action = record.action;

    // Use SelectorOptimizer if we have element context
    if (record.elementContext) {
      return SelectorOptimizer.generatePlaywrightLocator(record.elementContext);
    }

    // Fallback to legacy selector generation for backward compatibility
    if ('target' in action && action.target) {
      console.warn(`[PlaywrightGenerator] Missing element context for ${action.action}, using selector: ${action.target}`);
      return this.generateLocator(action.target);
    }

    // Should never reach here - log error if it does
    console.error(`[PlaywrightGenerator] No selector available for action: ${action.action}`);
    return `page.locator('body') /* WARNING: No proper selector available */`;
  }

  /**
   * Generate a Playwright locator from a selector string
   * Handles both CSS selectors and text-based selectors
   */
  private static generateLocator(selector: string): string {
    // Check for text-based selectors (e.g., "button:text("Click me")")
    const textMatch = selector.match(/^(button|a):text\("(.+)"\)$/);
    if (textMatch) {
      const [, tagName, text] = textMatch;
      const escapedText = this.escapeString(text);
      if (tagName === 'button') {
        return `page.getByRole('button', { name: '${escapedText}' })`;
      } else if (tagName === 'a') {
        return `page.getByRole('link', { name: '${escapedText}' })`;
      }
    }

    // For standard CSS selectors, use locator
    return `page.locator('${this.escapeCssSelector(selector)}')`;
  }

  /**
   * Sanitize test name for filename
   */
  private static sanitizeTestName(name: string): string {
    return name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
  }

  /**
   * Escape string for JavaScript string literals
   */
  private static escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Escape CSS selector for JavaScript string literals
   */
  private static escapeCssSelector(selector: string): string {
    // CSS selectors need special handling for backslashes
    return selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }

  /**
   * Generate filename for the spec
   */
  static generateFilename(testName: string): string {
    const sanitized = this.sanitizeTestName(testName);
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-').split('T')[0];
    return `${sanitized}-${timestamp}.spec.ts`;
  }
}
