import { Page } from 'playwright';
import { Observation } from './ActionSchema.js';
import { InteractiveElement, SerializableElement } from './DOMTypes.js';

/**
 * Observes the current page state and generates observations
 */
export class Observer {
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
   * Get a simplified DOM snapshot focusing on interactive elements
   * @returns A formatted string representation of interactive elements
   */
  private async getDOMSnapshot(): Promise<string> {
    const elements = await this.extractInteractiveElements();
    return this.formatElements(elements);
  }

  /**
   * Extract interactive elements from the page
   * @returns Array of interactive elements with their properties
   */
  private async extractInteractiveElements(): Promise<InteractiveElement[]> {
    // Use page.evaluate to run JavaScript in the browser context
    const serializableElements = await this.page.evaluate(() => {
      const elements: SerializableElement[] = [];

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

        elements.push({
          tagName: element.tagName.toLowerCase(),
          text,
          attributes,
          role,
        });
      });

      return elements;
    });

    // Generate selectors and assign IDs
    const interactiveElements: InteractiveElement[] = serializableElements.map(
      (el, index) => ({
        id: index + 1,
        ...el,
        selector: this.generateSelector(el),
      })
    );

    return interactiveElements;
  }

  /**
   * Generate a CSS selector for an element
   * @param element The element to generate a selector for
   * @returns A CSS selector string
   */
  private generateSelector(element: SerializableElement): string {
    // Priority 1: data-testid
    if (element.attributes['data-testid']) {
      return `[data-testid="${element.attributes['data-testid']}"]`;
    }

    // Priority 2: id
    if (element.attributes.id) {
      return `#${element.attributes.id}`;
    }

    // Priority 3: name attribute for inputs
    if (element.attributes.name && (element.tagName === 'input' || element.tagName === 'textarea' || element.tagName === 'select')) {
      return `${element.tagName}[name="${element.attributes.name}"]`;
    }

    // Priority 4: type for inputs
    if (element.tagName === 'input' && element.attributes.type) {
      if (element.attributes.placeholder) {
        return `input[type="${element.attributes.type}"][placeholder="${element.attributes.placeholder}"]`;
      }
      return `input[type="${element.attributes.type}"]`;
    }

    // Priority 5: href for links
    if (element.tagName === 'a' && element.attributes.href) {
      return `a[href="${element.attributes.href}"]`;
    }

    // Priority 6: role attribute
    if (element.role) {
      return `[role="${element.role}"]`;
    }

    // Priority 7: tag + class (first class only)
    if (element.attributes.class) {
      const firstClass = element.attributes.class.split(' ')[0];
      return `${element.tagName}.${firstClass}`;
    }

    // Fallback: just the tag name (not ideal, but better than nothing)
    return element.tagName;
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
