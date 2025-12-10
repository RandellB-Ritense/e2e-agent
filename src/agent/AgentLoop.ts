import { Page } from 'playwright';
import { AgentConfig } from './ActionSchema.js';
import { Observer } from './Observer.js';
import { Planner } from './Planner.js';
import { Executor } from './Executor.js';
import { LLMClient } from '../llm/LLMClient.js';
import { CookieHandler } from '../utils/CookieHandler.js';

/**
 * Main agent loop that coordinates observation, planning, and execution
 */
export class AgentLoop {
  private observer: Observer;
  private planner: Planner;
  private executor: Executor;
  private maxSteps: number;

  constructor(private page: Page, private config: AgentConfig, llmClient: LLMClient) {
    this.observer = new Observer(page);
    this.planner = new Planner(config.goal, llmClient);
    this.executor = new Executor(page);
    this.maxSteps = config.maxSteps ?? 30;
  }

  /**
   * Run the agent loop
   */
  async run(): Promise<void> {
    console.log('\n=== Starting Agent Loop ===');
    console.log(`Goal: ${this.config.goal}`);
    console.log(`Max steps: ${this.maxSteps}`);
    console.log('===========================\n');

    // Automatically dismiss cookie banners if enabled (default: true)
    const autoDismissCookies = this.config.autoDismissCookies ?? true;
    if (autoDismissCookies) {
      await CookieHandler.dismissCookieBanner(this.page);
    }

    let stepNumber = 0;
    let shouldContinue = true;

    while (shouldContinue && stepNumber < this.maxSteps) {
      stepNumber++;
      console.log(`\n--- Step ${stepNumber}/${this.maxSteps} ---`);

      try {
        // 1. Observe the current page state
        const observation = await this.observer.observe();

        // 2. Plan the next action
        const action = await this.planner.plan(observation);

        // 3. Execute the action
        await this.executor.execute(action);

        // 4. Check if we should continue
        if (action.action === 'finish' || action.action === 'error') {
          shouldContinue = false;
          console.log(`\n[AgentLoop] Stopping: ${action.reason}`);
        }

        // Small delay between steps
        await this.delay(500);
      } catch (error) {
        console.error(`[AgentLoop] Error in step ${stepNumber}:`, error);
        shouldContinue = false;
      }
    }

    if (stepNumber >= this.maxSteps) {
      console.log(`\n[AgentLoop] Reached maximum step limit (${this.maxSteps})`);
    }

    console.log('\n=== Agent Loop Completed ===\n');
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
