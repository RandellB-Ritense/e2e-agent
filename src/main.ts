import 'dotenv/config';
import { BrowserManager } from './browser/BrowserManager.js';
import { AgentLoop } from './agent/AgentLoop.js';
import { AgentConfig } from './agent/ActionSchema.js';
import { LLMFactory } from './llm/LLMFactory.js';
import { InstructionsLoader } from './utils/InstructionsLoader.js';
import { PlaywrightGenerator } from './utils/PlaywrightGenerator.js';
import { TestValidator } from './utils/TestValidator.js';
import { Config } from './utils/Config.js';
/**
 * Main entry point for the AI E2E Agent
 */
async function main() {
  const browserManager = new BrowserManager();

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const instructionsFilePath = args[0];

    // Create LLM client from environment variables
    console.log('[Main] Initializing LLM client...');
    const llmClient = LLMFactory.createFromEnv();
    console.log('[Main] LLM client initialized\n');

    // Load test instructions
    let config: AgentConfig;

    if (instructionsFilePath) {
      // Load instructions from markdown file
      console.log(`[Main] Loading instructions from: ${instructionsFilePath}`);
      const instructions = await InstructionsLoader.loadInstructions(instructionsFilePath);
      console.log(`[Main] Instructions loaded: ${instructions.name}\n`);

      // Display test information
      if (instructions.description) {
        console.log(`Description: ${instructions.description}`);
      }
      if (instructions.successCriteria && instructions.successCriteria.length > 0) {
        console.log('Success Criteria:');
        instructions.successCriteria.forEach(criterion => console.log(`  - ${criterion}`));
        console.log();
      }
      if (instructions.testData && Object.keys(instructions.testData).length > 0) {
        console.log('Test Data:');
        Object.entries(instructions.testData).forEach(([key, value]) =>
          console.log(`  - ${key}: ${value}`)
        );
        console.log();
      }
      if (instructions.notes) {
        console.log(`Notes: ${instructions.notes}\n`);
      }

      config = instructions;
    } else {
      // Use default configuration
      console.log('[Main] No instructions file specified, using default configuration\n');
      config = {
        goal: 'Explore the page and perform basic interactions',
        startUrl: 'https://example.com',
        maxSteps: 5,
      };
    }

    // Launch the browser
    await browserManager.launch();

    // Navigate to the initial URL
    await browserManager.navigate(config.startUrl);

    // Create and run the agent loop
    const page = browserManager.getPage();
    const agentLoop = new AgentLoop(page, config, llmClient);
    const report = await agentLoop.run();

    // Generate Playwright test spec from action history
    console.log('\n[Main] Generating Playwright test spec...');
    let validationPassed = false;
    try {
      const playwrightSpec = PlaywrightGenerator.generateSpec(report);
      const specFilename = PlaywrightGenerator.generateFilename(report.testName);
      const specPath = await TestValidator.saveSpec(playwrightSpec, specFilename);
      console.log(`[Main] Playwright spec saved to: ${specPath}`);

      // Validate the generated spec by running it
      console.log('[Main] Validating generated Playwright test...');
      const validationResult = await TestValidator.validateSpec(specPath, report.baseURL);
      const validationOutput = TestValidator.formatResult(validationResult);
      console.log(validationOutput);

      validationPassed = validationResult.success;

      if (validationResult.success) {
        console.log('[Main] ✓ Generated Playwright test validation PASSED');
      } else {
        console.log('[Main] ✗ Generated Playwright test validation FAILED');
        console.log('[Main] The AI-generated test may need manual review and adjustment');
      }
    } catch (error) {
      console.error('[Main] Failed to generate or validate Playwright spec:', error);
    }

    // Keep the browser open for a moment to see the final state
    console.log('\n[Main] Waiting 3 seconds before closing...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Exit with appropriate code based on test result
    // Both the AI test and validation must pass for success
    if (report.status === 'passed' && validationPassed) {
      console.log('\n[Main] ✓ All tests passed (AI test + Playwright validation)');
      process.exitCode = 0;
    } else {
      if (report.status !== 'passed') {
        console.log('\n[Main] ✗ AI test failed');
      }
      if (!validationPassed) {
        console.log('[Main] ✗ Playwright validation failed');
      }
      process.exitCode = 1;
    }
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
