import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentConfig } from '../agent/ActionSchema.js';

/**
 * Represents a test loaded from a markdown file
 */
export interface TestDefinition extends AgentConfig {
  name: string;
  description?: string;
  successCriteria?: string[];
  testData?: Record<string, string>;
  notes?: string;
}

/**
 * Loads and parses test definitions from markdown files
 */
export class TestLoader {
  /**
   * Load a test from a markdown file
   * @param filePath Path to the markdown test file
   * @returns Parsed test definition
   */
  static async loadTest(filePath: string): Promise<TestDefinition> {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    return this.parseMarkdown(content, fileName);
  }

  /**
   * Load all tests from a directory
   * @param dirPath Directory containing test markdown files
   * @returns Array of parsed test definitions
   */
  static async loadTestsFromDirectory(dirPath: string): Promise<TestDefinition[]> {
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'README.md');

    const tests: TestDefinition[] = [];
    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file);
      try {
        const test = await this.loadTest(filePath);
        tests.push(test);
      } catch (error) {
        console.warn(`[TestLoader] Failed to load test from ${file}:`, error);
      }
    }

    return tests;
  }

  /**
   * Parse markdown content into a test definition
   * @param content Markdown content
   * @param fileName Name of the file (used as test name)
   * @returns Parsed test definition
   */
  private static parseMarkdown(content: string, fileName: string): TestDefinition {
    const lines = content.split('\n');
    let currentSection: string | null = null;
    let currentContent: string[] = [];

    const sections: Record<string, string[]> = {};

    // Parse sections
    for (const line of lines) {
      const headerMatch = line.match(/^##\s+(.+)$/);
      if (headerMatch) {
        // Save previous section
        if (currentSection) {
          sections[currentSection] = currentContent;
        }
        // Start new section
        currentSection = headerMatch[1].trim();
        currentContent = [];
      } else if (currentSection && line.trim()) {
        currentContent.push(line);
      }
    }

    // Save last section
    if (currentSection) {
      sections[currentSection] = currentContent;
    }

    // Extract test name from # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const name = titleMatch ? titleMatch[1].trim() : fileName;

    // Extract required fields
    const goal = this.extractText(sections['Goal']);
    const startUrl = this.extractText(sections['Starting URL'] || sections['Start URL'] || sections['URL']);

    if (!goal) {
      throw new Error('Test file must contain a "## Goal" section');
    }
    if (!startUrl) {
      throw new Error('Test file must contain a "## Starting URL" section');
    }

    // Extract optional fields
    const maxSteps = this.extractNumber(sections['Max Steps']);
    const successCriteria = this.extractList(sections['Success Criteria']);
    const testData = this.extractKeyValuePairs(sections['Test Data Suggestions'] || sections['Test Data']);
    const notes = this.extractText(sections['Notes']);
    const description = this.extractText(sections['Description']);

    return {
      name,
      goal,
      startUrl,
      maxSteps,
      description,
      successCriteria,
      testData,
      notes,
    };
  }

  /**
   * Extract plain text from section lines
   */
  private static extractText(lines?: string[]): string {
    if (!lines || lines.length === 0) return '';
    return lines.join('\n').trim();
  }

  /**
   * Extract a number from section lines
   */
  private static extractNumber(lines?: string[]): number | undefined {
    if (!lines || lines.length === 0) return undefined;
    const text = this.extractText(lines);
    const num = parseInt(text, 10);
    return isNaN(num) ? undefined : num;
  }

  /**
   * Extract a list from markdown section (items starting with - or *)
   */
  private static extractList(lines?: string[]): string[] | undefined {
    if (!lines || lines.length === 0) return undefined;

    const items: string[] = [];
    for (const line of lines) {
      const match = line.match(/^[-*]\s+(.+)$/);
      if (match) {
        items.push(match[1].trim());
      }
    }

    return items.length > 0 ? items : undefined;
  }

  /**
   * Extract key-value pairs from markdown list
   * Example: "- Email: test@example.com" => { Email: "test@example.com" }
   */
  private static extractKeyValuePairs(lines?: string[]): Record<string, string> | undefined {
    if (!lines || lines.length === 0) return undefined;

    const pairs: Record<string, string> = {};
    for (const line of lines) {
      const match = line.match(/^[-*]\s+([^:]+):\s*(.+)$/);
      if (match) {
        pairs[match[1].trim()] = match[2].trim();
      }
    }

    return Object.keys(pairs).length > 0 ? pairs : undefined;
  }
}
