import { BrowserManager } from './browser/BrowserManager.js';
import { AgentLoop } from './agent/AgentLoop.js';
import { AgentConfig } from './agent/ActionSchema.js';

/**
 * Main entry point for the AI E2E Agent
 */
async function main() {
  const browserManager = new BrowserManager();

  try {
    // Launch the browser
    await browserManager.launch();

    // Navigate to the initial URL
    const config: AgentConfig = {
      goal: 'Explore the page and perform basic interactions',
      startUrl: 'https://example.com',
      maxSteps: 5,
    };

    await browserManager.navigate(config.startUrl);

    // Create and run the agent loop
    const page = browserManager.getPage();
    const agentLoop = new AgentLoop(page, config);
    await agentLoop.run();

    // Keep the browser open for a moment to see the final state
    console.log('\n[Main] Waiting 3 seconds before closing...');
    await new Promise((resolve) => setTimeout(resolve, 3000));
  } catch (error) {
    console.error('[Main] Fatal error:', error);
    process.exit(1);
  } finally {
    // Clean up
    await browserManager.close();
  }
}

// Run the main function
main().catch((error) => {
  console.error('[Main] Unhandled error:', error);
  process.exit(1);
});
