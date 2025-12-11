import { TestReport, ActionRecord } from './Reporter.js';
import { AgentAction } from '../agent/ActionSchema.js';

/**
 * Generates Playwright test specs from test execution history
 */
export class PlaywrightGenerator {
  /**
   * Generate a Playwright test spec from a test report
   */
  static generateSpec(report: TestReport): string {
    const testName = this.sanitizeTestName(report.testName);
    const imports = this.generateImports();
    const testBody = this.generateTestBody(report);

    return `${imports}

test.describe('${this.escapeString(report.testName)}', () => {
  test('${this.escapeString(report.goal)}', async ({ page }) => {
    // Generated from AI E2E Agent test execution
    // Original test: ${this.escapeString(report.testName)}
    // Execution date: ${report.startTime.toISOString()}
    // Status: ${report.status}
    // Duration: ${(report.durationMs / 1000).toFixed(2)}s

${testBody}
  });
});
`;
  }

  /**
   * Generate import statements
   */
  private static generateImports(): string {
    return `import { test, expect } from '@playwright/test';`;
  }

  /**
   * Generate the test body from action history
   */
  private static generateTestBody(report: TestReport): string {
    const lines: string[] = [];
    let currentUrl = report.startUrl;

    // Filter out finish and error actions as they're not executable
    const executableActions = report.actionHistory.filter(
      record => record.action.action !== 'finish' && record.action.action !== 'error'
    );

    executableActions.forEach((record, index) => {
      const action = record.action;
      const stepComment = `// Step ${record.stepNumber}: ${this.escapeString(action.reason)}`;

      lines.push(`    ${stepComment}`);

      const code = this.generateActionCode(action, currentUrl);
      if (code) {
        lines.push(`    ${code}`);
      }

      // Track URL changes for navigation actions
      if (action.action === 'navigate') {
        currentUrl = action.target;
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
   * Generate code for a specific action
   */
  private static generateActionCode(action: AgentAction, currentUrl: string): string {
    switch (action.action) {
      case 'navigate':
        return `await page.goto('${this.escapeString(action.target)}');`;

      case 'click':
        return `await page.locator('${this.escapeCssSelector(action.target)}').click();`;

      case 'fill':
        return `await page.locator('${this.escapeCssSelector(action.target)}').fill('${this.escapeString(action.value)}');`;

      case 'assert':
        // Generate an expect assertion based on the value
        if (action.value.toLowerCase().includes('visible')) {
          return `await expect(page.locator('${this.escapeCssSelector(action.target)}')).toBeVisible();`;
        } else if (action.value.toLowerCase().includes('hidden')) {
          return `await expect(page.locator('${this.escapeCssSelector(action.target)}')).toBeHidden();`;
        } else {
          // Default to checking text content
          return `await expect(page.locator('${this.escapeCssSelector(action.target)}')).toHaveText('${this.escapeString(action.value)}');`;
        }

      case 'wait':
        // Parse wait time from value if provided
        const waitTime = action.value ? parseInt(action.value) : 1000;
        if (action.target === 'timeout' || action.target === 'time') {
          return `await page.waitForTimeout(${waitTime});`;
        } else {
          // Wait for selector
          return `await page.locator('${this.escapeCssSelector(action.target)}').waitFor();`;
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
