/**
 * Action types that the agent can perform
 */
export type AgentAction =
  | { action: "click"; target: string; reason: string; value?: string }
  | { action: "fill"; target: string; value: string; reason: string }
  | { action: "navigate"; target: string; reason: string }
  | { action: "assert"; target: string; value: string; reason: string }
  | { action: "wait"; target: string; value?: string; reason: string }
  | { action: "finish"; reason: string }
  | { action: "error"; reason: string };

/**
 * Observation of the current page state
 */
export interface Observation {
  url: string;
  domSnapshot: string;
  timestamp: number;
}

/**
 * Configuration for the agent
 */
export interface AgentConfig {
  goal: string;
  startUrl: string; // Full URL for AI execution (constructed from baseURL + entryPath or provided directly)
  baseURL?: string; // Base URL for Playwright config (e.g., "https://example.com")
  entryPath?: string; // Entry path for test start (e.g., "/about" or "." for root)
  maxSteps?: number;
  autoDismissCookies?: boolean;
  debug?: boolean;
}
