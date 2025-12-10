# AI E2E Agent

An AI-driven end-to-end (E2E) web testing framework built with TypeScript and Playwright that uses LLMs to intelligently navigate and test web applications.

## Overview

This framework enables natural-language testing of web applications. You provide a goal in plain English, and the AI agent:
1. Observes the current page (extracts interactive elements)
2. Decides the next action using an LLM
3. Executes the action with Playwright
4. Repeats until the goal is achieved

**Example Goal:**
> "Go to the contact page, fill in the form with valid data, submit it, and verify a success message appears."

## Project Structure

```
ai-e2e-agent/
  src/
    agent/
      ActionSchema.ts    # Type definitions for actions and observations
      DOMTypes.ts        # Types for DOM element representation
      Observer.ts        # Extracts interactive elements from pages
      Executor.ts        # Executes actions with Playwright
      Planner.ts         # LLM-based intelligent action planning
      PromptBuilder.ts   # Builds prompts for LLM
      AgentLoop.ts       # Main observe-plan-execute control loop
    browser/
      BrowserManager.ts  # Manages Playwright browser lifecycle
    llm/
      LLMClient.ts       # LLM client interface
      OpenAIClient.ts    # OpenAI integration
      AnthropicClient.ts # Anthropic integration
      MistralClient.ts   # Mistral integration
      LLMFactory.ts      # Creates LLM clients from config
    main.ts              # Entry point
  package.json
  tsconfig.json
  playwright.config.ts
```

## Features

✅ **Real DOM Observation** - Extracts all interactive elements (links, buttons, inputs, etc.)
✅ **Smart Selector Generation** - Creates reliable CSS selectors prioritizing test IDs, IDs, names, etc.
✅ **LLM-Based Planning** - Uses OpenAI, Anthropic, or Mistral models for intelligent decision-making
✅ **Action Execution** - Performs real browser automation with retry logic
✅ **Error Handling** - Automatic retries with exponential backoff
✅ **Multiple LLM Providers** - Supports OpenAI (GPT-4), Anthropic (Claude), and Mistral

## Setup

### 1. Install Dependencies

```bash
npm install
```

### 2. Install Playwright Browsers

```bash
npx playwright install chromium
```

### 3. Configure LLM Provider

Set up environment variables for your LLM provider:

#### Option A: OpenAI (default)
```bash
export LLM_PROVIDER=openai
export OPENAI_API_KEY=sk-...
# Optional:
export LLM_MODEL=gpt-4o-mini  # default
export LLM_TEMPERATURE=0.7
export LLM_MAX_TOKENS=1000
```

#### Option B: Anthropic
```bash
export LLM_PROVIDER=anthropic
export ANTHROPIC_API_KEY=sk-ant-...
# Optional:
export LLM_MODEL=claude-3-5-sonnet-20241022  # default
export LLM_TEMPERATURE=0.7
export LLM_MAX_TOKENS=1000
```

#### Option C: Mistral
```bash
export LLM_PROVIDER=mistral
export MISTRAL_API_KEY=your-mistral-key
# Optional:
export LLM_MODEL=mistral-large-latest  # default
export LLM_TEMPERATURE=0.7
export LLM_MAX_TOKENS=1000
```

Alternatively, create a `.env` file:
```bash
LLM_PROVIDER=openai
OPENAI_API_KEY=sk-...
```

### 4. Build the Project

```bash
npm run build
```

## Usage

### Running Tests from Markdown Files (Recommended)

The easiest way to run tests is to create markdown test files in the `tests/` directory:

```bash
# Run a specific test file
npm start tests/example-navigation.md

# Or use the full path
npm start tests/contact-form-example.md
```

Example test file (`tests/my-test.md`):
```markdown
# My Test

## Goal
Navigate to the About page and verify it contains company information

## Starting URL
https://example.com

## Max Steps
10

## Success Criteria
- About page loaded successfully
- Page contains company information
- No errors encountered
```

See `tests/README.md` for detailed test file format documentation and more examples.

### Running Without a Test File

If no test file is provided, the framework uses a default configuration:

```bash
npm start
```

### Programmatic Usage

You can also use the framework programmatically:

```typescript
import { TestLoader } from './utils/TestLoader.js';
import { LLMFactory } from './llm/LLMFactory.js';
import { AgentLoop } from './agent/AgentLoop.js';

// Load test from file
const test = await TestLoader.loadTest('tests/my-test.md');

// Or create config manually
const config: AgentConfig = {
  goal: 'Navigate to the About page',
  startUrl: 'https://example.com',
  maxSteps: 10,
};
```

### Development Mode

```bash
npm run dev tests/example-navigation.md
```

## How It Works

### 1. Observer
- Scans the page for interactive elements (buttons, links, inputs, etc.)
- Filters out hidden elements
- Generates reliable CSS selectors
- Formats elements into an LLM-friendly numbered list

**Example Output:**
```
=== Interactive Elements on Page ===

[1] Link "About"
    selector: a[href="/about"]
    href: /about

[2] Input (email)
    selector: input[type="email"][placeholder="Email"]
    type: email
    placeholder: Email

[3] Button "Submit"
    selector: button[type="submit"]
    type: submit
```

### 2. Planner (LLM-Based)
- Receives: Goal + Current URL + Interactive elements list
- LLM decides: Next action to take
- Returns: Structured JSON action

**Supported Actions:**
- `click` - Click an element
- `fill` - Fill a form field
- `navigate` - Navigate to a URL
- `assert` - Verify element contains text
- `wait` - Wait for condition (time, selector, network idle)
- `finish` - Goal completed
- `error` - Cannot complete goal

### 3. Executor
- Executes actions using Playwright
- Waits for elements to be visible
- Retries with exponential backoff
- Handles both absolute and relative URLs
- 500ms settle time after each action

### 4. Agent Loop
- Coordinates observe → plan → execute cycle
- Continues until goal achieved or max steps reached
- Comprehensive error handling and logging

## Configuration

### Agent Configuration

```typescript
interface AgentConfig {
  goal: string;        // Natural language goal
  startUrl: string;    // Initial URL to navigate to
  maxSteps?: number;   // Max iterations (default: 30)
}
```

### Executor Configuration

```typescript
new Executor(page, {
  timeout: 10000,        // Operation timeout (default: 10s)
  retries: 2,            // Retry attempts (default: 2)
  waitAfterAction: 500   // Settle time after actions (default: 500ms)
})
```

## Example Session

```
=== Starting Agent Loop ===
Goal: Find and click the login button
Max steps: 10
===========================

--- Step 1/10 ---
[Observer] Generated observation for https://example.com
[Planner] Planning step 1 for goal: Find and click the login button
[Planner] Querying LLM for next action...
[Planner] LLM decided: click - Click the login link in navigation
[Executor] Executing action: click
[Executor]   Clicking: a[href="/login"]
[Executor] ✓ Action completed successfully

--- Step 2/10 ---
[Observer] Generated observation for https://example.com/login
[Planner] LLM decided: finish - Successfully navigated to login page
[Executor] ✓ Finishing execution: Successfully navigated to login page
[AgentLoop] Stopping: Successfully navigated to login page

=== Agent Loop Completed ===
```

## Environment Variables

| Variable | Description | Default |
|----------|-------------|---------|
| `LLM_PROVIDER` | LLM provider: `openai`, `anthropic`, or `mistral` | `openai` |
| `LLM_API_KEY` | API key for LLM provider | - |
| `OPENAI_API_KEY` | OpenAI API key | - |
| `ANTHROPIC_API_KEY` | Anthropic API key | - |
| `MISTRAL_API_KEY` | Mistral API key | - |
| `LLM_MODEL` | Model name | `gpt-4o-mini`, `claude-3-5-sonnet-20241022`, or `mistral-large-latest` |
| `LLM_TEMPERATURE` | Temperature (0-1) | `0.7` |
| `LLM_MAX_TOKENS` | Max tokens in response | `1000` |

## Troubleshooting

### API Key Not Found
```
Error: No API key found. Set LLM_API_KEY, OPENAI_API_KEY, ANTHROPIC_API_KEY, or MISTRAL_API_KEY
```
**Solution:** Set the appropriate environment variable for your LLM provider.

### Element Not Found
```
[Executor] ✗ Action failed: waiting for selector "..." failed: timeout
```
**Solution:** The element may not exist or be hidden. Check the Observer output to see available elements.

### Playwright Browser Not Installed
```
Error: Executable doesn't exist at ...
```
**Solution:** Run `npx playwright install chromium`

## Development

### Project Status

✅ **Complete:**
- Browser management (Chromium)
- DOM observation and extraction
- Action execution with retry logic
- LLM integration (OpenAI & Anthropic)
- Intelligent planning
- Error handling

### Future Enhancements

Potential improvements:
- Support for more LLM providers
- Screenshot capture for visual context
- Test result reporting
- Parallel test execution
- Custom element extractors
- Session persistence
- Headless mode toggle via config

## License

MIT
