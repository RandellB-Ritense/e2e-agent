# AI E2E Agent

An AI-driven end-to-end (E2E) web testing framework built with TypeScript and Playwright.

## Project Structure

```
ai-e2e-agent/
  src/
    agent/
      ActionSchema.ts    # Type definitions for actions and observations
      Observer.ts        # Observes page state (stub)
      Executor.ts        # Executes actions (stub)
      Planner.ts         # Plans next action (stub)
      AgentLoop.ts       # Main agent control loop
    browser/
      BrowserManager.ts  # Manages Playwright browser
    main.ts              # Entry point
  package.json
  tsconfig.json
  playwright.config.ts
```

## Current Status (MVP Step 1)

This is the initial project skeleton with stub implementations. The framework currently:

- Launches a Chromium browser using Playwright
- Runs a dummy agent loop (3 iterations)
- Logs stub actions instead of executing them
- Uses a simple planner that returns predefined actions

**Not yet implemented:**
- LLM integration for intelligent planning
- Actual DOM observation and action execution
- Real selector detection and interaction

## Setup

1. Install dependencies:
```bash
npm install
```

2. Install Playwright browsers:
```bash
npx playwright install chromium
```

3. Build the TypeScript code:
```bash
npm run build
```

## Running

Run the agent:
```bash
npm start
```

Or run in development mode:
```bash
npm run dev
```

## What Happens

The agent will:
1. Launch a Chromium browser (non-headless by default)
2. Navigate to https://example.com
3. Run 3 stub iterations:
   - Step 1: Log a "wait" action
   - Step 2: Log a "click" action
   - Step 3: Log a "finish" action
4. Close the browser

All actions are logged but not actually executed at this stage.

## Next Steps

Future development will add:
1. Real DOM observation (simplified tree extraction)
2. LLM integration for planning
3. Actual Playwright action execution
4. Selector detection and validation
5. More sophisticated observation formatting
6. Error handling and recovery
