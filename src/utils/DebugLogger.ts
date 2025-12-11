import { Page } from 'playwright';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Config } from './Config.js';

/**
 * Handles debug logging and screenshot capture
 */
export class DebugLogger {
  private static debugEnabled = false;
  private static screenshotDir = Config.DEBUG_SCREENSHOTS_DIR;
  private static logFile?: string;

  /**
   * Initialize debug mode
   */
  static async init(enabled: boolean, testName?: string): Promise<void> {
    this.debugEnabled = enabled;

    if (!enabled) {
      return;
    }

    console.log('[Debug] Debug mode enabled');

    // Create screenshot directory
    try {
      await fs.mkdir(this.screenshotDir, { recursive: true });
    } catch (error) {
      console.warn('[Debug] Failed to create screenshot directory:', error);
    }

    // Initialize log file with timestamp
    if (testName) {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      this.logFile = path.join(this.screenshotDir, `debug-${testName}-${timestamp}.log`);
      await this.writeToFile(`=== Debug Log Started: ${new Date().toISOString()} ===\n`);
      await this.writeToFile(`Test: ${testName}\n\n`);
    }
  }

  /**
   * Log a debug message
   */
  static log(component: string, message: string, data?: any): void {
    if (!this.debugEnabled) {
      return;
    }

    const timestamp = new Date().toISOString();
    const logMessage = `[${timestamp}] [${component}] ${message}`;

    console.log(`\x1b[90m${logMessage}\x1b[0m`); // Gray color for debug logs

    if (data) {
      console.log('\x1b[90m', data, '\x1b[0m');
    }

    // Write to log file
    if (this.logFile) {
      let fileContent = `${logMessage}\n`;
      if (data) {
        if (typeof data === 'string') {
          fileContent += `${data}\n`;
        } else {
          fileContent += `${JSON.stringify(data, null, 2)}\n`;
        }
      }
      this.writeToFile(fileContent).catch(err =>
        console.warn('[Debug] Failed to write to log file:', err)
      );
    }
  }

  /**
   * Log a section header
   */
  static section(title: string): void {
    if (!this.debugEnabled) {
      return;
    }

    const line = '='.repeat(80);
    const header = `\n${line}\n${title}\n${line}\n`;
    console.log(`\x1b[90m${header}\x1b[0m`);

    if (this.logFile) {
      this.writeToFile(header).catch(err =>
        console.warn('[Debug] Failed to write to log file:', err)
      );
    }
  }

  /**
   * Capture a screenshot
   */
  static async screenshot(page: Page, stepNumber: number, description: string): Promise<string | undefined> {
    if (!this.debugEnabled) {
      return undefined;
    }

    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const fileName = `step-${String(stepNumber).padStart(3, '0')}-${timestamp}.png`;
      const filePath = path.join(this.screenshotDir, fileName);

      await page.screenshot({ path: filePath, fullPage: true });

      this.log('Screenshot', `Captured: ${fileName} - ${description}`);
      return filePath;
    } catch (error) {
      console.warn('[Debug] Failed to capture screenshot:', error);
      return undefined;
    }
  }

  /**
   * Log LLM prompt
   */
  static logPrompt(system: string, user: string): void {
    if (!this.debugEnabled) {
      return;
    }

    this.section('LLM PROMPT');
    this.log('Planner', 'System Prompt:', system);
    this.log('Planner', 'User Prompt:', user);
  }

  /**
   * Log LLM response
   */
  static logResponse(response: string): void {
    if (!this.debugEnabled) {
      return;
    }

    this.log('Planner', 'LLM Response:', response);
  }

  /**
   * Log DOM observation details
   */
  static logObservation(elementCount: number, snapshotLength: number, url: string): void {
    if (!this.debugEnabled) {
      return;
    }

    this.log('Observer', `Found ${elementCount} interactive elements at ${url}`);
    this.log('Observer', `DOM snapshot size: ${snapshotLength} characters`);
  }

  /**
   * Log action execution
   */
  static logAction(action: string, target?: string, value?: string, reason?: string): void {
    if (!this.debugEnabled) {
      return;
    }

    let message = `Executing: ${action.toUpperCase()}`;
    if (target) message += ` target="${target}"`;
    if (value) message += ` value="${value}"`;
    if (reason) message += ` | ${reason}`;

    this.log('Executor', message);
  }

  /**
   * Log timing information
   */
  static logTiming(operation: string, durationMs: number): void {
    if (!this.debugEnabled) {
      return;
    }

    this.log('Performance', `${operation} took ${durationMs}ms`);
  }

  /**
   * Write content to the log file
   */
  private static async writeToFile(content: string): Promise<void> {
    if (!this.logFile) {
      return;
    }

    try {
      await fs.appendFile(this.logFile, content);
    } catch (error) {
      // Silently fail to avoid infinite loops
    }
  }

  /**
   * Check if debug mode is enabled
   */
  static isEnabled(): boolean {
    return this.debugEnabled;
  }

  /**
   * Get the screenshot directory
   */
  static getScreenshotDir(): string {
    return this.screenshotDir;
  }

  /**
   * Get the log file path
   */
  static getLogFile(): string | undefined {
    return this.logFile;
  }
}
