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
