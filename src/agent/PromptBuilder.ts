import { Observation } from './ActionSchema.js';

/**
 * Builds prompts for the LLM planner
 */
export class PromptBuilder {
  /**
   * Build the system prompt that explains the agent's role and capabilities
   */
  static buildSystemPrompt(): string {
    return `You are an intelligent web automation agent. Your task is to analyze web pages and determine the next action to take to achieve a given goal.

## Available Actions

You can perform the following actions:

1. **click** - Click on an element
   - target: CSS selector of the element to click
   - reason: Why you're clicking this element

2. **fill** - Fill in a form field
   - target: CSS selector of the input/textarea
   - value: The text to fill in
   - reason: Why you're filling this field

3. **navigate** - Navigate to a URL
   - target: The URL to navigate to (absolute or relative)
   - reason: Why you're navigating here

4. **assert** - Assert that an element contains expected text
   - target: CSS selector of the element
   - value: The expected text (substring match)
   - reason: What you're verifying

5. **wait** - Wait for a condition
   - target: What to wait for ("time", "networkidle", or a CSS selector)
   - value: (optional) For "time": milliseconds as string
   - reason: Why you're waiting

6. **finish** - Mark the goal as completed
   - reason: Explanation of what was accomplished

7. **error** - Report that the goal cannot be completed
   - reason: Explanation of why the goal cannot be completed

## Response Format

You MUST respond with a single valid JSON object representing ONE action. The JSON should match one of these formats:

\`\`\`json
{"action": "click", "target": "button.submit", "reason": "Submit the form"}
{"action": "fill", "target": "input[name='email']", "value": "user@example.com", "reason": "Enter email"}
{"action": "navigate", "target": "/contact", "reason": "Go to contact page"}
{"action": "assert", "target": ".success-message", "value": "Success", "reason": "Verify submission"}
{"action": "wait", "target": "time", "value": "2000", "reason": "Wait for animation"}
{"action": "finish", "reason": "Goal completed successfully"}
{"action": "error", "reason": "Cannot find the required element"}
\`\`\`

## Guidelines

- Use selectors from the provided interactive elements list (they're numbered like [1], [2], etc.)
- Choose actions that make progress toward the goal
- If you see element [5] with selector "button.submit", use that exact selector
- Be specific about why you're taking each action
- Only return ONE action at a time
- Return valid JSON only, no additional text
- If the goal is achieved, return a "finish" action
- If the goal is impossible, return an "error" action`;
  }

  /**
   * Build the user prompt with the current observation and goal
   */
  static buildUserPrompt(
    goal: string,
    observation: Observation,
    stepNumber: number,
    options?: {
      successCriteria?: string[];
      testData?: Record<string, string>;
      notes?: string;
    }
  ): string {
    let prompt = `## Goal
${goal}`;

    // Add success criteria if provided
    if (options?.successCriteria && options.successCriteria.length > 0) {
      prompt += `\n\n## Success Criteria
The test is successful when ALL of the following are achieved:`;
      options.successCriteria.forEach(criterion => {
        prompt += `\n- ${criterion}`;
      });
    }

    // Add test data suggestions if provided
    if (options?.testData && Object.keys(options.testData).length > 0) {
      prompt += `\n\n## Test Data to Use
When filling forms, use this test data:`;
      Object.entries(options.testData).forEach(([key, value]) => {
        prompt += `\n- ${key}: ${value}`;
      });
    }

    // Add notes if provided
    if (options?.notes) {
      prompt += `\n\n## Important Notes
${options.notes}`;
    }

    prompt += `\n\n## Current State
- Step: ${stepNumber}
- URL: ${observation.url}

## Interactive Elements on Current Page
${observation.domSnapshot}

## Task
Based on the goal and current page state, determine the SINGLE next action to take. Respond with ONLY a JSON object representing the action.`;

    return prompt;
  }
}
