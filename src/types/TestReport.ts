import { AgentAction } from '../agent/ActionSchema.js';

/**
 * Status of a test execution
 */
export type TestStatus = 'passed' | 'failed' | 'error';

/**
 * Element context captured during action execution
 * Used for intelligent Playwright selector generation
 */
export interface ElementContext {
  selector: string;           // The selector used by the AI agent
  text: string;              // Visible text content
  tagName: string;           // HTML tag name (a, button, input, etc.)
  attributes: Record<string, string>;  // All attributes (id, name, href, etc.)
  role?: string;             // ARIA role attribute
}

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
  elementContext?: ElementContext;  // Rich element information for Playwright generation
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
