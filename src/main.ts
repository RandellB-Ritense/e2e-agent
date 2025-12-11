import 'dotenv/config';
import { BrowserManager } from './browser/BrowserManager.js';
import { AgentLoop } from './agent/AgentLoop.js';
import { AgentConfig } from './agent/ActionSchema.js';
import { LLMFactory } from './llm/LLMFactory.js';
import { TestLoader } from './utils/TestLoader.js';
import { Reporter } from './utils/Reporter.js';
import * as fs from 'fs/promises';
import * as path from 'path';

/**
 * Save HTML report to file
 */
async function saveHTMLReport(htmlContent: string, testName: string): Promise<string> {
  const reportsDir = 'test-reports';
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const safeTestName = testName.replace(/[^a-z0-9]/gi, '-').toLowerCase();
  const fileName = `${safeTestName}-${timestamp}.html`;
  const filePath = path.join(reportsDir, fileName);

  // Create reports directory if it doesn't exist
  try {
    await fs.mkdir(reportsDir, { recursive: true });
  } catch (error) {
    console.warn('[Main] Failed to create reports directory:', error);
  }

  // Write the HTML file
  try {
    await fs.writeFile(filePath, htmlContent, 'utf-8');
    return filePath;
  } catch (error) {
    console.error('[Main] Failed to save HTML report:', error);
    throw error;
  }
}

/**
 * Main entry point for the AI E2E Agent
 */
async function main() {
  const browserManager = new BrowserManager();

  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    const testFilePath = args[0];

    // Create LLM client from environment variables
    console.log('[Main] Initializing LLM client...');
    const llmClient = LLMFactory.createFromEnv();
    console.log('[Main] LLM client initialized\n');

    // Load test configuration
    let config: AgentConfig;

    if (testFilePath) {
      // Load test from markdown file
      console.log(`[Main] Loading test from: ${testFilePath}`);
      const test = await TestLoader.loadTest(testFilePath);
      console.log(`[Main] Test loaded: ${test.name}\n`);

      // Display test information
      if (test.description) {
        console.log(`Description: ${test.description}`);
      }
      if (test.successCriteria && test.successCriteria.length > 0) {
        console.log('Success Criteria:');
        test.successCriteria.forEach(criterion => console.log(`  - ${criterion}`));
        console.log();
      }
      if (test.testData && Object.keys(test.testData).length > 0) {
        console.log('Test Data:');
        Object.entries(test.testData).forEach(([key, value]) =>
          console.log(`  - ${key}: ${value}`)
        );
        console.log();
      }
      if (test.notes) {
        console.log(`Notes: ${test.notes}\n`);
      }

      config = test;
    } else {
      // Use default configuration
      console.log('[Main] No test file specified, using default configuration\n');
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

    // Display the test report
    const consoleReport = Reporter.generateConsoleReport(report);
    console.log(consoleReport);

    // Generate and save HTML report
    try {
      const htmlReport = Reporter.generateHTMLReport(report);
      const htmlPath = await saveHTMLReport(htmlReport, report.testName);
      console.log(`[Main] HTML report saved to: ${htmlPath}`);
    } catch (error) {
      console.warn('[Main] Failed to generate HTML report:', error);
    }

    // Keep the browser open for a moment to see the final state
    console.log('[Main] Waiting 3 seconds before closing...');
    await new Promise((resolve) => setTimeout(resolve, 3000));

    // Exit with appropriate code based on test result
    if (report.status === 'passed') {
      process.exitCode = 0;
    } else {
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
