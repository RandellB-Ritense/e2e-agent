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
  startUrl: string;
  maxSteps?: number;
  autoDismissCookies?: boolean;
}
