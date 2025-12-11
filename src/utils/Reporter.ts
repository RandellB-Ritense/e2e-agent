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
  baseURL?: string;
  entryPath?: string;
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

  /**
   * Generate an HTML report
   */
  static generateHTMLReport(report: TestReport): string {
    const statusClass = report.status === 'passed' ? 'passed' : report.status === 'failed' ? 'failed' : 'error';
    const statusIcon = report.status === 'passed' ? '✓' : report.status === 'failed' ? '✗' : '⚠';
    const duration = (report.durationMs / 1000).toFixed(2);
    const startTime = report.startTime.toLocaleString();
    const endTime = report.endTime.toLocaleString();

    // Build action history HTML
    let actionsHTML = '';
    report.actionHistory.forEach(record => {
      const action = record.action;
      const hasError = !!record.error;
      const actionClass = hasError ? 'action-error' : 'action-success';
      const executionTime = record.executionTimeMs ? `${record.executionTimeMs}ms` : 'N/A';

      let actionTitle = action.action.toUpperCase();
      let actionDetails = '';

      if ('target' in action && action.target) {
        actionDetails += `<div class="action-detail"><strong>Target:</strong> <code>${this.escapeHtml(action.target)}</code></div>`;
      }
      if ('value' in action && action.value) {
        actionDetails += `<div class="action-detail"><strong>Value:</strong> <code>${this.escapeHtml(action.value)}</code></div>`;
      }
      actionDetails += `<div class="action-detail"><strong>Reason:</strong> ${this.escapeHtml(action.reason)}</div>`;
      actionDetails += `<div class="action-detail"><strong>URL:</strong> <a href="${this.escapeHtml(record.url)}" target="_blank">${this.escapeHtml(record.url)}</a></div>`;
      actionDetails += `<div class="action-detail"><strong>Time:</strong> ${executionTime}</div>`;

      if (record.error) {
        actionDetails += `<div class="action-detail error-message"><strong>Error:</strong> ${this.escapeHtml(record.error)}</div>`;
      }

      actionsHTML += `
        <div class="action-card ${actionClass}">
          <div class="action-header">
            <span class="action-step">Step ${record.stepNumber}</span>
            <span class="action-type">${actionTitle}</span>
            <span class="action-time">${executionTime}</span>
          </div>
          <div class="action-body">
            ${actionDetails}
          </div>
        </div>
      `;
    });

    // Build success criteria HTML
    let criteriaHTML = '';
    if (report.successCriteria && report.successCriteria.length > 0) {
      criteriaHTML = '<div class="section"><h2>Success Criteria</h2><ul>';
      report.successCriteria.forEach(criterion => {
        criteriaHTML += `<li>${this.escapeHtml(criterion)}</li>`;
      });
      criteriaHTML += '</ul></div>';
    }

    // Build error section HTML
    let errorHTML = '';
    if (report.errorMessage) {
      errorHTML = `
        <div class="section error-section">
          <h2>Error</h2>
          <div class="error-message">${this.escapeHtml(report.errorMessage)}</div>
        </div>
      `;
    }

    // Build completion reason HTML
    let completionHTML = '';
    if (report.completionReason) {
      completionHTML = `
        <div class="section">
          <h2>Completion</h2>
          <p>${this.escapeHtml(report.completionReason)}</p>
        </div>
      `;
    }

    return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Test Report: ${this.escapeHtml(report.testName)}</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, sans-serif;
      background: #f5f5f5;
      color: #333;
      line-height: 1.6;
      padding: 20px;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      border-radius: 8px;
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
      overflow: hidden;
    }
    .header {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      color: white;
      padding: 30px;
    }
    .header h1 {
      font-size: 28px;
      margin-bottom: 10px;
    }
    .status-badge {
      display: inline-block;
      padding: 8px 16px;
      border-radius: 20px;
      font-weight: 600;
      font-size: 14px;
      margin-top: 10px;
    }
    .status-badge.passed { background: #10b981; color: white; }
    .status-badge.failed { background: #ef4444; color: white; }
    .status-badge.error { background: #f59e0b; color: white; }
    .summary {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 20px;
      padding: 30px;
      background: #f9fafb;
      border-bottom: 1px solid #e5e7eb;
    }
    .summary-item {
      background: white;
      padding: 15px;
      border-radius: 6px;
      border-left: 4px solid #667eea;
    }
    .summary-label {
      font-size: 12px;
      color: #6b7280;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin-bottom: 5px;
    }
    .summary-value {
      font-size: 18px;
      font-weight: 600;
      color: #111827;
    }
    .section {
      padding: 30px;
      border-bottom: 1px solid #e5e7eb;
    }
    .section h2 {
      font-size: 20px;
      margin-bottom: 15px;
      color: #111827;
    }
    .section ul {
      list-style: none;
      padding-left: 0;
    }
    .section ul li {
      padding: 8px 0;
      padding-left: 24px;
      position: relative;
    }
    .section ul li:before {
      content: "✓";
      position: absolute;
      left: 0;
      color: #10b981;
      font-weight: bold;
    }
    .actions {
      padding: 30px;
    }
    .actions h2 {
      font-size: 20px;
      margin-bottom: 20px;
      color: #111827;
    }
    .action-card {
      border: 1px solid #e5e7eb;
      border-radius: 6px;
      margin-bottom: 15px;
      overflow: hidden;
      transition: box-shadow 0.2s;
    }
    .action-card:hover {
      box-shadow: 0 4px 6px rgba(0,0,0,0.1);
    }
    .action-card.action-error {
      border-left: 4px solid #ef4444;
    }
    .action-card.action-success {
      border-left: 4px solid #10b981;
    }
    .action-header {
      background: #f9fafb;
      padding: 12px 15px;
      display: flex;
      align-items: center;
      gap: 15px;
    }
    .action-step {
      font-weight: 600;
      color: #6b7280;
      font-size: 14px;
    }
    .action-type {
      background: #667eea;
      color: white;
      padding: 4px 10px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 600;
    }
    .action-time {
      margin-left: auto;
      color: #6b7280;
      font-size: 12px;
    }
    .action-body {
      padding: 15px;
    }
    .action-detail {
      margin-bottom: 8px;
      font-size: 14px;
    }
    .action-detail strong {
      color: #6b7280;
      font-weight: 600;
      margin-right: 5px;
    }
    .action-detail code {
      background: #f3f4f6;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Monaco', 'Courier New', monospace;
      font-size: 13px;
    }
    .action-detail a {
      color: #667eea;
      text-decoration: none;
      word-break: break-all;
    }
    .action-detail a:hover {
      text-decoration: underline;
    }
    .error-message {
      background: #fef2f2;
      border: 1px solid #fecaca;
      border-radius: 4px;
      padding: 10px;
      color: #991b1b;
      margin-top: 10px;
    }
    .error-section {
      background: #fef2f2;
    }
    .footer {
      padding: 20px 30px;
      background: #f9fafb;
      text-align: center;
      color: #6b7280;
      font-size: 14px;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>${this.escapeHtml(report.testName)}</h1>
      <div class="status-badge ${statusClass}">${statusIcon} ${report.status.toUpperCase()}</div>
    </div>

    <div class="summary">
      <div class="summary-item">
        <div class="summary-label">Goal</div>
        <div class="summary-value">${this.escapeHtml(report.goal)}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Duration</div>
        <div class="summary-value">${duration}s</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Steps</div>
        <div class="summary-value">${report.totalSteps} / ${report.maxSteps}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Start Time</div>
        <div class="summary-value" style="font-size: 14px;">${startTime}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">End Time</div>
        <div class="summary-value" style="font-size: 14px;">${endTime}</div>
      </div>
      <div class="summary-item">
        <div class="summary-label">Start URL</div>
        <div class="summary-value" style="font-size: 14px;"><a href="${this.escapeHtml(report.startUrl)}" target="_blank">${this.escapeHtml(report.startUrl)}</a></div>
      </div>
      ${report.finalUrl ? `
      <div class="summary-item">
        <div class="summary-label">Final URL</div>
        <div class="summary-value" style="font-size: 14px;"><a href="${this.escapeHtml(report.finalUrl)}" target="_blank">${this.escapeHtml(report.finalUrl)}</a></div>
      </div>
      ` : ''}
    </div>

    ${criteriaHTML}
    ${completionHTML}
    ${errorHTML}

    <div class="actions">
      <h2>Action History (${report.actionHistory.length} steps)</h2>
      ${actionsHTML}
    </div>

    <div class="footer">
      Generated by AI E2E Agent on ${new Date().toLocaleString()}
    </div>
  </div>
</body>
</html>`;
  }

  /**
   * Escape HTML special characters
   */
  private static escapeHtml(text: string): string {
    const map: Record<string, string> = {
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#039;'
    };
    return text.replace(/[&<>"']/g, (m) => map[m]);
  }
}
