import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentConfig } from '../agent/ActionSchema.js';
import { Config } from './Config.js';

/**
 * Represents test instructions loaded from a markdown file
 */
export interface InstructionDefinition extends AgentConfig {
  name: string;
  description?: string;
  successCriteria?: string[];
  autoDismissCookies?: boolean;
  debug?: boolean;
  testData?: Record<string, string>;
  notes?: string;
}

/**
 * Loads and parses test instructions from markdown files
 */
export class InstructionsLoader {
  /**
   * Load test instructions from a markdown file
   * @param filePath Path to the markdown instructions file
   * @returns Parsed instruction definition
   */
  static async loadInstructions(filePath: string): Promise<InstructionDefinition> {
    const content = await fs.readFile(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.md');

    return this.parseMarkdown(content, fileName);
  }

  /**
   * Load all test instructions from a directory
   * @param dirPath Directory containing instruction markdown files
   * @returns Array of parsed instruction definitions
   */
  static async loadInstructionsFromDirectory(dirPath: string): Promise<InstructionDefinition[]> {
    const files = await fs.readdir(dirPath);
    const mdFiles = files.filter(f => f.endsWith('.md') && f !== 'README.md');

    const instructions: InstructionDefinition[] = [];
    for (const file of mdFiles) {
      const filePath = path.join(dirPath, file);
      try {
        const instruction = await this.loadInstructions(filePath);
        instructions.push(instruction);
      } catch (error) {
        console.warn(`[InstructionsLoader] Failed to load instructions from ${file}:`, error);
      }
    }

    return instructions;
  }

  /**
   * Parse markdown content into an instruction definition
   * @param content Markdown content
   * @param fileName Name of the file (used as instruction name)
   * @returns Parsed instruction definition
   */
  private static parseMarkdown(content: string, fileName: string): InstructionDefinition {
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

    // Extract instruction name from # heading
    const titleMatch = content.match(/^#\s+(.+)$/m);
    const name = titleMatch ? titleMatch[1].trim() : fileName;

    // Extract required fields
    const goal = this.extractText(sections['Goal']);

    if (!goal) {
      throw new Error('Instruction file must contain a "## Goal" section');
    }

    // Get BASE_URL from configuration (fixed for all tests)
    const baseURL = Config.BASE_URL;

    // Extract Entry Path from markdown
    const entryPath = this.extractText(sections['Entry Path'] || sections['EntryPath'] || sections['Entry']);

    // Backward compatibility: check for old "Starting URL" format
    const legacyStartUrl = this.extractText(sections['Starting URL'] || sections['Start URL'] || sections['URL']);

    // Determine startUrl and entryPath
    let startUrl: string;
    let finalEntryPath: string;

    if (entryPath) {
      // New format: construct startUrl from BASE_URL + entryPath
      finalEntryPath = entryPath === '.' ? '/' : entryPath;
      startUrl = baseURL + (finalEntryPath === '/' ? '' : finalEntryPath);
    } else if (legacyStartUrl) {
      // Old format: use legacy startUrl directly
      startUrl = legacyStartUrl;
      // Extract entryPath from full URL
      try {
        const url = new URL(legacyStartUrl);
        finalEntryPath = url.pathname === '/' ? '.' : url.pathname;
      } catch (error) {
        finalEntryPath = '.';
      }
    } else {
      throw new Error('Instruction file must contain an "## Entry Path" section');
    }

    // Extract optional fields
    const maxSteps = this.extractNumber(sections['Max Steps']);
    const successCriteria = this.extractList(sections['Success Criteria']);
    const testData = this.extractKeyValuePairs(sections['Test Data Suggestions'] || sections['Test Data']);
    const notes = this.extractText(sections['Notes']);
    const description = this.extractText(sections['Description']);
    const autoDismissCookies = this.extractBoolean(sections['Auto Dismiss Cookies']);
    const debug = this.extractBoolean(sections['Debug'] || sections['Debug Mode'] || sections['Verbose']);

    return {
      name,
      goal,
      startUrl,
      baseURL,
      entryPath: finalEntryPath,
      maxSteps,
      autoDismissCookies,
      debug,
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
   * Extract a boolean from section lines
   * Accepts: true, false, yes, no, enabled, disabled (case-insensitive)
   */
  private static extractBoolean(lines?: string[]): boolean | undefined {
    if (!lines || lines.length === 0) return undefined;
    const text = this.extractText(lines).toLowerCase();

    if (text === 'true' || text === 'yes' || text === 'enabled') {
      return true;
    }
    if (text === 'false' || text === 'no' || text === 'disabled') {
      return false;
    }

    return undefined;
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
