import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs/promises';
import * as path from 'path';
import { Config } from './Config.js';

const execAsync = promisify(exec);

/**
 * Result of running a Playwright test validation
 */
export interface ValidationResult {
  success: boolean;
  exitCode: number;
  stdout: string;
  stderr: string;
  duration: number;
  error?: string;
}

/**
 * Validates generated Playwright test specs by executing them
 */
export class TestValidator {
  /**
   * Run a Playwright test spec and return the result
   * @param specPath Path to the generated .spec.ts file
   * @param baseURL Optional base URL to use for the test
   * @returns Validation result with success status and output
   */
  static async validateSpec(specPath: string, baseURL?: string): Promise<ValidationResult> {
    const startTime = Date.now();

    try {
      // Check if the spec file exists
      await fs.access(specPath);

      console.log(`[TestValidator] Running Playwright test: ${specPath}`);
      if (baseURL) {
        console.log(`[TestValidator] Using base URL: ${baseURL}`);
      }

      // Run the Playwright test using npx
      // Use --config option to override baseURL if provided
      let command = `npx playwright test ${specPath}`;
      if (baseURL) {
        command += ` --config=playwright.config.ts`;
        // Note: We'll set the baseURL in the environment or update the config before running
      }

      try {
        const { stdout, stderr } = await execAsync(command, {
          timeout: 120000, // 2 minute timeout
          maxBuffer: 10 * 1024 * 1024, // 10MB buffer
          env: {
            ...process.env,
            // Pass baseURL via environment variable if provided
            ...(baseURL && { BASE_URL: baseURL }),
          },
        });

        const duration = Date.now() - startTime;

        return {
          success: true,
          exitCode: 0,
          stdout,
          stderr,
          duration,
        };
      } catch (execError: any) {
        // Playwright test failed (non-zero exit code)
        const duration = Date.now() - startTime;

        return {
          success: false,
          exitCode: execError.code || 1,
          stdout: execError.stdout || '',
          stderr: execError.stderr || '',
          duration,
          error: execError.message,
        };
      }
    } catch (error) {
      // File doesn't exist or other error
      const duration = Date.now() - startTime;

      return {
        success: false,
        exitCode: -1,
        stdout: '',
        stderr: '',
        duration,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Format validation result for console output
   */
  static formatResult(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push('');
    lines.push('='.repeat(80));
    lines.push('  PLAYWRIGHT TEST VALIDATION');
    lines.push('='.repeat(80));
    lines.push('');

    if (result.success) {
      lines.push('Status:          ✓ PASSED');
    } else {
      lines.push('Status:          ✗ FAILED');
    }

    lines.push(`Exit Code:       ${result.exitCode}`);
    lines.push(`Duration:        ${(result.duration / 1000).toFixed(2)}s`);
    lines.push('');

    if (result.stdout) {
      lines.push('Output:');
      lines.push('-'.repeat(80));
      lines.push(result.stdout.trim());
      lines.push('-'.repeat(80));
      lines.push('');
    }

    if (result.stderr) {
      lines.push('Errors:');
      lines.push('-'.repeat(80));
      lines.push(result.stderr.trim());
      lines.push('-'.repeat(80));
      lines.push('');
    }

    if (result.error) {
      lines.push('Error Message:');
      lines.push(result.error);
      lines.push('');
    }

    lines.push('='.repeat(80));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Save the generated spec to a file
   * @param specContent The Playwright test spec content
   * @param filename The filename to save to
   * @returns The full path to the saved file
   */
  static async saveSpec(specContent: string, filename: string): Promise<string> {
    const generatedDir = Config.GENERATED_TESTS_DIR;
    const filePath = path.join(generatedDir, filename);

    // Create directory if it doesn't exist
    try {
      await fs.mkdir(generatedDir, { recursive: true });
    } catch (error) {
      console.warn(`[TestValidator] Failed to create ${generatedDir} directory:`, error);
    }

    // Write the spec file
    await fs.writeFile(filePath, specContent, 'utf-8');

    return filePath;
  }
}
