import { AgentAction } from '../agent/ActionSchema.js';

/**
 * Status of a test execution
 */
export type TestStatus = 'passed' | 'failed' | 'error';

/**
 * Detailed action record with execution metadata
 */
export interface ActionRecord {
  stepNumber: number;
  action: AgentAction;
  timestamp: Date;
  url: string;
  executionTimeMs?: number;
  error?: string;
}

/**
 * Complete test execution report
 */
export interface TestReport {
  testName: string;
  status: TestStatus;
  goal: string;
  startUrl: string;
  startTime: Date;
  endTime: Date;
  durationMs: number;
  totalSteps: number;
  maxSteps: number;
  actionHistory: ActionRecord[];
  finalUrl?: string;
  completionReason?: string;
  errorMessage?: string;
  successCriteria?: string[];
}

/**
 * Generates formatted test reports
 */
export class Reporter {
  /**
   * Generate a console-formatted report
   */
  static generateConsoleReport(report: TestReport): string {
    const lines: string[] = [];
    const statusSymbol = report.status === 'passed' ? '✓' : report.status === 'failed' ? '✗' : '⚠';
    const statusColor = report.status === 'passed' ? 'PASSED' : report.status === 'failed' ? 'FAILED' : 'ERROR';

    lines.push('');
    lines.push('='.repeat(80));
    lines.push(`  TEST REPORT: ${report.testName}`);
    lines.push('='.repeat(80));
    lines.push('');
    lines.push(`Status:          ${statusSymbol} ${statusColor}`);
    lines.push(`Goal:            ${report.goal}`);
    lines.push(`Duration:        ${(report.durationMs / 1000).toFixed(2)}s`);
    lines.push(`Steps Taken:     ${report.totalSteps} / ${report.maxSteps}`);
    lines.push(`Start URL:       ${report.startUrl}`);
    if (report.finalUrl) {
      lines.push(`Final URL:       ${report.finalUrl}`);
    }
    lines.push('');

    // Success criteria if available
    if (report.successCriteria && report.successCriteria.length > 0) {
      lines.push('Success Criteria:');
      report.successCriteria.forEach(criterion => {
        lines.push(`  - ${criterion}`);
      });
      lines.push('');
    }

    // Completion reason
    if (report.completionReason) {
      lines.push(`Completion:      ${report.completionReason}`);
      lines.push('');
    }

    // Error message if present
    if (report.errorMessage) {
      lines.push(`Error:           ${report.errorMessage}`);
      lines.push('');
    }

    // Action history
    if (report.actionHistory.length > 0) {
      lines.push('Action History:');
      lines.push('-'.repeat(80));
      report.actionHistory.forEach(record => {
        const action = record.action;
        let actionLine = `  ${record.stepNumber}. [${action.action.toUpperCase()}]`;

        if ('target' in action && action.target) {
          actionLine += ` "${action.target}"`;
        }
        if ('value' in action && action.value) {
          actionLine += ` = "${action.value}"`;
        }

        lines.push(actionLine);
        lines.push(`     Reason: ${action.reason}`);
        lines.push(`     URL: ${record.url}`);

        if (record.error) {
          lines.push(`     Error: ${record.error}`);
        }

        if (record.stepNumber < report.actionHistory.length) {
          lines.push('');
        }
      });
      lines.push('-'.repeat(80));
    }

    lines.push('');
    lines.push('='.repeat(80));
    lines.push('');

    return lines.join('\n');
  }

  /**
   * Generate a JSON report
   */
  static generateJSONReport(report: TestReport): string {
    return JSON.stringify(report, null, 2);
  }

  /**
   * Generate a summary line for quick status
   */
  static generateSummary(report: TestReport): string {
    const statusSymbol = report.status === 'passed' ? '✓' : report.status === 'failed' ? '✗' : '⚠';
    const duration = (report.durationMs / 1000).toFixed(2);
    return `${statusSymbol} ${report.testName} - ${report.status.toUpperCase()} (${duration}s, ${report.totalSteps} steps)`;
  }
}
