import { Page } from 'playwright';
import { AgentConfig } from './ActionSchema.js';
import { Observer } from './Observer.js';
import { Planner, PlannerContext } from './Planner.js';
import { Executor } from './Executor.js';
import { LLMClient } from '../llm/LLMClient.js';
import { CookieHandler } from '../utils/CookieHandler.js';
import { TestDefinition } from '../utils/TestLoader.js';
import { TestReport, TestStatus, ActionRecord } from '../utils/Reporter.js';

/**
 * Main agent loop that coordinates observation, planning, and execution
 */
export class AgentLoop {
  private observer: Observer;
  private planner: Planner;
  private executor: Executor;
  private maxSteps: number;
  private actionHistory: ActionRecord[] = [];
  private startTime?: Date;
  private testName: string;

  constructor(private page: Page, private config: AgentConfig, llmClient: LLMClient) {
    this.observer = new Observer(page);

    // Extract additional context if config is a TestDefinition
    const plannerContext: PlannerContext | undefined = this.extractPlannerContext(config);

    this.planner = new Planner(config.goal, llmClient, plannerContext);
    this.executor = new Executor(page);
    this.maxSteps = config.maxSteps ?? 30;

    // Set test name from TestDefinition or use a default
    const testDef = config as TestDefinition;
    this.testName = testDef.name || 'Unnamed Test';
  }

  /**
   * Extract planner context from config if it's a TestDefinition
   */
  private extractPlannerContext(config: AgentConfig): PlannerContext | undefined {
    const testDef = config as TestDefinition;

    if (testDef.successCriteria || testDef.testData || testDef.notes) {
      return {
        successCriteria: testDef.successCriteria,
        testData: testDef.testData,
        notes: testDef.notes,
      };
    }

    return undefined;
  }

  /**
   * Run the agent loop
   */
  async run(): Promise<TestReport> {
    this.startTime = new Date();
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
    let lastError: string | undefined;
    let completionReason: string | undefined;

    while (shouldContinue && stepNumber < this.maxSteps) {
      stepNumber++;
      console.log(`\n--- Step ${stepNumber}/${this.maxSteps} ---`);

      const actionStartTime = Date.now();
      const currentUrl = this.page.url();

      try {
        // 1. Observe the current page state
        const observation = await this.observer.observe();

        // 2. Plan the next action
        const action = await this.planner.plan(observation);

        // 3. Execute the action
        await this.executor.execute(action);

        // Record the action
        const actionRecord: ActionRecord = {
          stepNumber,
          action,
          timestamp: new Date(),
          url: currentUrl,
          executionTimeMs: Date.now() - actionStartTime,
        };
        this.actionHistory.push(actionRecord);

        // 4. Check if we should continue
        if (action.action === 'finish' || action.action === 'error') {
          shouldContinue = false;
          completionReason = action.reason;
          if (action.action === 'error') {
            lastError = action.reason;
          }
          console.log(`\n[AgentLoop] Stopping: ${action.reason}`);
        }

        // Small delay between steps
        await this.delay(500);
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        console.error(`[AgentLoop] Error in step ${stepNumber}:`, error);

        // Record the failed action if we have one
        if (this.actionHistory.length < stepNumber) {
          const actionRecord: ActionRecord = {
            stepNumber,
            action: { action: 'error', reason: errorMessage },
            timestamp: new Date(),
            url: currentUrl,
            executionTimeMs: Date.now() - actionStartTime,
            error: errorMessage,
          };
          this.actionHistory.push(actionRecord);
        } else {
          // Update last action with error
          this.actionHistory[this.actionHistory.length - 1].error = errorMessage;
        }

        lastError = errorMessage;
        shouldContinue = false;
      }
    }

    if (stepNumber >= this.maxSteps) {
      completionReason = `Reached maximum step limit (${this.maxSteps})`;
      console.log(`\n[AgentLoop] ${completionReason}`);
    }

    console.log('\n=== Agent Loop Completed ===\n');

    // Generate and return the test report
    return this.generateReport(stepNumber, completionReason, lastError);
  }

  /**
   * Generate a test report from the execution
   */
  private generateReport(
    stepNumber: number,
    completionReason?: string,
    errorMessage?: string
  ): TestReport {
    const endTime = new Date();
    const durationMs = this.startTime ? endTime.getTime() - this.startTime.getTime() : 0;

    // Determine test status
    let status: TestStatus = 'passed';
    if (errorMessage) {
      status = 'error';
    } else if (stepNumber >= this.maxSteps && !completionReason?.includes('Goal completed')) {
      status = 'failed';
    } else {
      // Check if last action was 'finish' with success
      const lastAction = this.actionHistory[this.actionHistory.length - 1];
      if (lastAction?.action.action === 'error') {
        status = 'failed';
      } else if (lastAction?.action.action === 'finish') {
        status = 'passed';
      } else {
        status = 'failed'; // Reached max steps without explicit finish
      }
    }

    // Extract success criteria from config
    const testDef = this.config as TestDefinition;
    const successCriteria = testDef.successCriteria;

    return {
      testName: this.testName,
      status,
      goal: this.config.goal,
      startUrl: this.config.startUrl,
      startTime: this.startTime || endTime,
      endTime,
      durationMs,
      totalSteps: stepNumber,
      maxSteps: this.maxSteps,
      actionHistory: this.actionHistory,
      finalUrl: this.page.url(),
      completionReason,
      errorMessage,
      successCriteria,
    };
  }

  /**
   * Utility function to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
