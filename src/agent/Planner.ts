import { AgentAction, Observation } from './ActionSchema.js';
import { LLMClient } from '../llm/LLMClient.js';
import { PromptBuilder } from './PromptBuilder.js';
import { DebugLogger } from '../utils/DebugLogger.js';

/**
 * Additional context for planning
 */
export interface PlannerContext {
  successCriteria?: string[];
  testData?: Record<string, string>;
  notes?: string;
}

/**
 * Plans the next action based on the current observation and goal using an LLM
 */
export class Planner {
  private stepCount = 0;
  private actionHistory: AgentAction[] = [];

  constructor(
    private goal: string,
    private llmClient: LLMClient,
    private context?: PlannerContext
  ) {}

  /**
   * Plan the next action using the LLM
   * @param observation Current page observation
   * @returns The next action to take
   */
  async plan(observation: Observation): Promise<AgentAction> {
    this.stepCount++;
    console.log(`[Planner] Planning step ${this.stepCount} for goal: ${this.goal}`);
    console.log(`[Planner] Current URL: ${observation.url}`);

    try {
      // Build prompts
      const systemPrompt = PromptBuilder.buildSystemPrompt();
      const userPrompt = PromptBuilder.buildUserPrompt(
        this.goal,
        observation,
        this.stepCount,
        this.context,
        this.actionHistory
      );

      // Log prompts in debug mode
      DebugLogger.logPrompt(systemPrompt, userPrompt);

      // Get LLM response
      console.log('[Planner] Querying LLM for next action...');
      const response = await this.llmClient.generateCompletion(systemPrompt, userPrompt);

      // Log response in debug mode
      DebugLogger.logResponse(response);

      // Parse the response
      const action = this.parseAction(response);
      console.log(`[Planner] LLM decided: ${action.action} - ${action.reason}`);

      // Add action to history
      this.actionHistory.push(action);

      return action;
    } catch (error) {
      console.error('[Planner] Error planning action:', error);
      // Return an error action if planning fails
      return {
        action: 'error',
        reason: `Planning failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  }

  /**
   * Parse the LLM response into an AgentAction
   * @param response The raw LLM response
   * @returns A validated AgentAction
   */
  private parseAction(response: string): AgentAction {
    try {
      // Extract JSON from response (handle cases where LLM adds extra text)
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }

      const json = JSON.parse(jsonMatch[0]);

      // Validate the action
      if (!json.action) {
        throw new Error('Missing "action" field in response');
      }

      // Validate based on action type
      switch (json.action) {
        case 'click':
          if (!json.target || !json.reason) {
            throw new Error('click action requires target and reason');
          }
          return { action: 'click', target: json.target, reason: json.reason, value: json.value };

        case 'fill':
          if (!json.target || !json.value || !json.reason) {
            throw new Error('fill action requires target, value, and reason');
          }
          return { action: 'fill', target: json.target, value: json.value, reason: json.reason };

        case 'navigate':
          if (!json.target || !json.reason) {
            throw new Error('navigate action requires target and reason');
          }
          return { action: 'navigate', target: json.target, reason: json.reason };

        case 'assert':
          if (!json.target || json.value === undefined || json.value === null || !json.reason) {
            throw new Error('assert action requires target, value, and reason');
          }
          // Allow empty string for "not-present" assertions
          return { action: 'assert', target: json.target, value: json.value, reason: json.reason };

        case 'wait':
          if (!json.target || !json.reason) {
            throw new Error('wait action requires target and reason');
          }
          return { action: 'wait', target: json.target, value: json.value, reason: json.reason };

        case 'finish':
          if (!json.reason) {
            throw new Error('finish action requires reason');
          }
          return { action: 'finish', reason: json.reason };

        case 'error':
          if (!json.reason) {
            throw new Error('error action requires reason');
          }
          return { action: 'error', reason: json.reason };

        default:
          throw new Error(`Unknown action type: ${json.action}`);
      }
    } catch (error) {
      console.error('[Planner] Failed to parse LLM response:', response);
      throw new Error(`Failed to parse action: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
}
