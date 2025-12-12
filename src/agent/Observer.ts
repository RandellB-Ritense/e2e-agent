import { Page } from 'playwright';
import { Observation } from './ActionSchema.js';
import { InteractiveElement, SerializableElement } from './DOMTypes.js';
import { DebugLogger } from '../utils/DebugLogger.js';

/**
 * Observes the current page state and generates observations
 */
export class Observer {
  private lastObservedElements: InteractiveElement[] = [];

  constructor(private page: Page) {}

  /**
   * Generate an observation of the current page
   * @returns Observation object containing URL, DOM snapshot, and timestamp
   */
  async observe(): Promise<Observation> {
    const url = this.page.url();
    const domSnapshot = await this.getDOMSnapshot();

    const observation: Observation = {
      url,
      domSnapshot,
      timestamp: Date.now(),
    };

    console.log(`[Observer] Generated observation for ${url}`);
    return observation;
  }

  /**
   * Get element context by selector from the last observation
   * @param selector The CSS selector to find
   * @returns Element context or undefined if not found
   */
  getElementContext(selector: string): { text: string; tagName: string; attributes: Record<string, string>; role?: string } | undefined {
    const element = this.lastObservedElements.find(el => el.selector === selector);
    if (!element) {
      return undefined;
    }

    return {
      text: element.text,
      tagName: element.tagName,
      attributes: element.attributes,
      role: element.role,
    };
  }

  /**
   * Get alternative selectors for a given primary selector
   * @param selector The primary CSS selector
   * @returns Array of alternative selectors, or undefined if not found
   */
  getAlternativeSelectors(selector: string): string[] | undefined {
    const element = this.lastObservedElements.find(el => el.selector === selector);
    return element?.alternativeSelectors;
  }

  /**
   * Get a simplified DOM snapshot focusing on interactive elements
   * @returns A formatted string representation of interactive elements
   */
  private async getDOMSnapshot(): Promise<string> {
    const elements = await this.extractInteractiveElements();

    // Store for element context retrieval
    this.lastObservedElements = elements;

    const snapshot = this.formatElements(elements);

    // Log detailed observation info in debug mode
    DebugLogger.logObservation(elements.length, snapshot.length, this.page.url());

    return snapshot;
  }

  /**
   * Extract interactive elements from the page
   * @returns Array of interactive elements with their properties
   */
  private async extractInteractiveElements(): Promise<InteractiveElement[]> {
    // Use page.evaluate to run JavaScript in the browser context
    // Generate selectors in the browser where we can check for uniqueness
    const interactiveElements = await this.page.evaluate(() => {
      const elements: Array<{
        tagName: string;
        text: string;
        attributes: Record<string, string>;
        role?: string;
        selector: string;
        alternativeSelectors?: string[];
      }> = [];

      // Helper function to check if a selector is unique
      function isUnique(selector: string, targetElement: Element): boolean {
        try {
          const matches = document.querySelectorAll(selector);
          return matches.length === 1 && matches[0] === targetElement;
        } catch {
          return false;
        }
      }

      // Helper function to escape CSS selector values
      function escapeSelector(str: string): string {
        return str.replace(/["\\]/g, '\\$&');
      }

      // Helper function to generate ALL unique selectors for an element
      // Returns array with primary selector first, then alternatives
      function generateAllUniqueSelectors(element: HTMLElement): string[] {
        const selectors: string[] = [];
        const tagName = element.tagName.toLowerCase();

        // Priority 1: data-testid (always unique in good practice)
        const testId = element.getAttribute('data-testid');
        if (testId) {
          const selector = `[data-testid="${escapeSelector(testId)}"]`;
          if (isUnique(selector, element)) {
            selectors.push(selector);
          }
        }

        // Priority 2: id attribute
        const id = element.id;
        if (id) {
          const selector = `#${CSS.escape(id)}`;
          if (isUnique(selector, element)) {
            selectors.push(selector);
          }
        }

        // Priority 3: aria-label (when unique)
        const ariaLabel = element.getAttribute('aria-label');
        if (ariaLabel) {
          const selector = `${tagName}[aria-label="${escapeSelector(ariaLabel)}"]`;
          if (isUnique(selector, element)) {
            selectors.push(selector);
          }
        }

        // Priority 4: name attribute for form elements
        const name = element.getAttribute('name');
        if (name && ['input', 'textarea', 'select', 'button'].includes(tagName)) {
          const selector = `${tagName}[name="${escapeSelector(name)}"]`;
          if (isUnique(selector, element)) {
            selectors.push(selector);
          }
        }

        // Priority 5: For inputs, try type + placeholder combination
        if (tagName === 'input') {
          const type = element.getAttribute('type') || 'text';
          const placeholder = element.getAttribute('placeholder');
          if (placeholder) {
            const selector = `input[type="${type}"][placeholder="${escapeSelector(placeholder)}"]`;
            if (isUnique(selector, element)) {
              selectors.push(selector);
            }
          }
        }

        // Priority 6: For links, check href uniqueness
        if (tagName === 'a') {
          const href = element.getAttribute('href');
          if (href) {
            const selector = `a[href="${escapeSelector(href)}"]`;
            if (isUnique(selector, element)) {
              selectors.push(selector);
            }
          }
        }

        // Priority 7: role attribute
        const role = element.getAttribute('role');
        if (role) {
          const selector = `[role="${escapeSelector(role)}"]`;
          if (isUnique(selector, element)) {
            selectors.push(selector);
          }
        }

        // Priority 8: Try tag + visible text (for buttons and links)
        if (['button', 'a'].includes(tagName)) {
          const text = element.textContent?.trim();
          if (text && text.length > 0 && text.length < 50) {
            const allWithSameTag = document.querySelectorAll(tagName);
            const withSameText = Array.from(allWithSameTag).filter(
              el => el.textContent?.trim() === text
            );
            if (withSameText.length === 1) {
              selectors.push(`${tagName}:text("${escapeSelector(text)}")`);
            }
          }
        }

        // Priority 9: Try nth-of-type with parent context
        const parent = element.parentElement;
        if (parent) {
          const siblings = Array.from(parent.children).filter(
            el => el.tagName === element.tagName
          );
          const index = siblings.indexOf(element);
          if (index >= 0) {
            let parentSelector = parent.tagName.toLowerCase();
            const parentId = parent.id;
            const parentClass = parent.className.split(' ')[0];

            if (parentId) {
              parentSelector = `#${CSS.escape(parentId)}`;
            } else if (parentClass) {
              parentSelector = `${parent.tagName.toLowerCase()}.${CSS.escape(parentClass)}`;
            }

            const selector = `${parentSelector} > ${tagName}:nth-of-type(${index + 1})`;
            if (isUnique(selector, element)) {
              selectors.push(selector);
            }
          }
        }

        // Priority 10: Try tag + first class
        const className = element.className;
        if (className && typeof className === 'string') {
          const firstClass = className.split(' ').filter(c => c.length > 0)[0];
          if (firstClass) {
            const selector = `${tagName}.${CSS.escape(firstClass)}`;
            if (isUnique(selector, element)) {
              selectors.push(selector);
            }
          }
        }

        // Fallback: generate a more complex path-based selector (always added)
        const path: string[] = [];
        let current: Element | null = element;
        while (current && current !== document.body && path.length < 5) {
          const tag = current.tagName.toLowerCase();
          const currentTagName = current.tagName;
          const currentParent: Element | null = current.parentElement;
          if (currentParent) {
            const allSiblings: Element[] = Array.from(currentParent.children);
            const siblings = allSiblings.filter(
              (el: Element) => el.tagName === currentTagName
            );
            const index = siblings.indexOf(current);
            path.unshift(`${tag}:nth-of-type(${index + 1})`);
            current = currentParent;
          } else {
            path.unshift(tag);
            current = null;
          }
        }
        const pathSelector = path.join(' > ');

        // Only add path selector if we don't have any other selectors
        if (selectors.length === 0) {
          selectors.push(pathSelector);
        } else if (!selectors.includes(pathSelector)) {
          selectors.push(pathSelector);
        }

        return selectors;
      }

      // Selectors for interactive elements
      const selector = [
        'a[href]',
        'button',
        'input',
        'textarea',
        'select',
        '[role="button"]',
        '[role="link"]',
        '[role="textbox"]',
        '[role="checkbox"]',
        '[role="radio"]',
        '[onclick]',
      ].join(', ');

      const nodes = document.querySelectorAll(selector);

      nodes.forEach((node) => {
        const element = node as HTMLElement;

        // Skip hidden elements
        const style = window.getComputedStyle(element);
        if (
          style.display === 'none' ||
          style.visibility === 'hidden' ||
          style.opacity === '0'
        ) {
          return;
        }

        // Skip elements outside viewport (optional - may want to keep these)
        const rect = element.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) {
          return;
        }

        // Extract text content (limited to 100 chars)
        let text = '';
        if (element instanceof HTMLInputElement || element instanceof HTMLTextAreaElement) {
          text = element.placeholder || element.value || '';
        } else {
          text = element.textContent?.trim() || '';
          // Get aria-label as fallback
          if (!text) {
            text = element.getAttribute('aria-label') || '';
          }
        }
        text = text.slice(0, 100).trim();

        // Collect relevant attributes
        const attributes: Record<string, string> = {};

        // Standard attributes
        const attrNames = ['id', 'name', 'type', 'class', 'placeholder', 'href', 'value', 'aria-label', 'data-testid', 'title'];
        attrNames.forEach((attr) => {
          const value = element.getAttribute(attr);
          if (value) {
            attributes[attr] = value;
          }
        });

        // Get role
        const role = element.getAttribute('role') || undefined;

        // Generate all unique selectors (primary + alternatives)
        const allSelectors = generateAllUniqueSelectors(element);
        const primarySelector = allSelectors[0]; // Best selector
        const alternativeSelectors = allSelectors.slice(1); // Fallback selectors

        elements.push({
          tagName: element.tagName.toLowerCase(),
          text,
          attributes,
          role,
          selector: primarySelector,
          alternativeSelectors: alternativeSelectors.length > 0 ? alternativeSelectors : undefined,
        });
      });

      return elements;
    });

    // Assign IDs
    const result: InteractiveElement[] = interactiveElements.map((el, index) => ({
      id: index + 1,
      ...el,
    }));

    return result;
  }

  /**
   * Format elements into a human-readable string
   * @param elements Array of interactive elements
   * @returns Formatted string representation
   */
  private formatElements(elements: InteractiveElement[]): string {
    if (elements.length === 0) {
      return 'No interactive elements found on this page.';
    }

    const lines: string[] = [];
    lines.push('=== Interactive Elements on Page ===\n');

    elements.forEach((el) => {
      // Element header with ID and type
      const elementType = this.getElementType(el);
      const displayText = el.text ? ` "${el.text}"` : '';
      lines.push(`[${el.id}] ${elementType}${displayText}`);

      // Selector
      lines.push(`    selector: ${el.selector}`);

      // Additional relevant attributes
      if (el.attributes.type) {
        lines.push(`    type: ${el.attributes.type}`);
      }
      if (el.attributes.href) {
        lines.push(`    href: ${el.attributes.href}`);
      }
      if (el.attributes.placeholder) {
        lines.push(`    placeholder: ${el.attributes.placeholder}`);
      }
      if (el.attributes.value && !el.text) {
        lines.push(`    value: ${el.attributes.value}`);
      }
      if (el.role) {
        lines.push(`    role: ${el.role}`);
      }

      lines.push(''); // Empty line between elements
    });

    lines.push(`\nTotal: ${elements.length} interactive elements`);

    return lines.join('\n');
  }

  /**
   * Get a human-readable element type
   * @param element The element to describe
   * @returns A string describing the element type
   */
  private getElementType(element: InteractiveElement): string {
    if (element.tagName === 'a') {
      return 'Link';
    }
    if (element.tagName === 'button' || element.attributes.type === 'button' || element.attributes.type === 'submit') {
      return 'Button';
    }
    if (element.tagName === 'input') {
      const type = element.attributes.type || 'text';
      return `Input (${type})`;
    }
    if (element.tagName === 'textarea') {
      return 'Textarea';
    }
    if (element.tagName === 'select') {
      return 'Select';
    }
    if (element.role === 'button') {
      return 'Button';
    }
    if (element.role === 'link') {
      return 'Link';
    }

    return element.tagName;
  }
}
