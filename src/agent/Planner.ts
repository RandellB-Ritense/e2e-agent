import { AgentAction, Observation } from './ActionSchema.js';

/**
 * Plans the next action based on the current observation and goal
 */
export class Planner {
  private stepCount = 0;

  constructor(private goal: string) {}

  /**
   * Plan the next action
   * @param observation Current page observation
   * @returns The next action to take
   */
  async plan(observation: Observation): Promise<AgentAction> {
    this.stepCount++;
    console.log(`[Planner] Planning step ${this.stepCount} for goal: ${this.goal}`);
    console.log(`[Planner] Current URL: ${observation.url}`);

    // STUB: For now, return dummy actions
    // In the future, this will call an LLM to determine the next action

    // Return a simple sequence: wait -> click -> finish
    if (this.stepCount === 1) {
      return {
        action: 'wait',
        target: 'page to load',
        reason: 'Waiting for initial page load (stub action)',
      };
    } else if (this.stepCount === 2) {
      return {
        action: 'click',
        target: 'button',
        reason: 'Clicking a button (stub action)',
      };
    } else {
      return {
        action: 'finish',
        reason: 'Reached end of stub sequence',
      };
    }
  }
}
