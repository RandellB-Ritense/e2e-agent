import { ElementContext } from '../types/TestReport.js';

/**
 * Optimizes selectors for Playwright test generation
 * Converts element context into Playwright best practice selectors
 *
 * Priority (Playwright recommended):
 * 1. getByRole() - Most resilient
 * 2. getByLabel() - For form fields
 * 3. getByPlaceholder() - For inputs
 * 4. getByText() - For text content
 * 5. getByTestId() - When available
 * 6. CSS selectors - Last resort
 */
export class SelectorOptimizer {
  /**
   * Generate the best Playwright locator for an element
   */
  static generatePlaywrightLocator(context: ElementContext): string {
    const { tagName, text, attributes, role } = context;

    // Priority 1: data-testid (highly stable)
    if (attributes['data-testid']) {
      return `page.getByTestId('${this.escapeString(attributes['data-testid'])}')`;
    }

    // Priority 2: Form fields with labels (getByLabel)
    if (['input', 'textarea', 'select'].includes(tagName)) {
      // Check for associated label or aria-label
      if (attributes['aria-label']) {
        return `page.getByLabel('${this.escapeString(attributes['aria-label'])}')`;
      }

      // Priority 3: Form fields with placeholder
      if (attributes.placeholder) {
        return `page.getByPlaceholder('${this.escapeString(attributes.placeholder)}')`;
      }

      // Priority 4: Form fields with name attribute (unique enough)
      if (attributes.name && attributes.id) {
        // Use ID if available for form fields
        return `page.locator('#${this.escapeCssSelector(attributes.id)}')`;
      }
    }

    // Priority 5: Buttons and links with role (getByRole)
    if (tagName === 'button' || (tagName === 'a' && text)) {
      const roleType = tagName === 'button' ? 'button' : 'link';
      if (text && text.length > 0 && text.length < 100) {
        // Use getByRole with name option (Playwright best practice)
        return `page.getByRole('${roleType}', { name: '${this.escapeString(text)}' })`;
      }
    }

    // Priority 6: Elements with unique ID
    if (attributes.id) {
      return `page.locator('#${this.escapeCssSelector(attributes.id)}')`;
    }

    // Priority 7: aria-label for any element
    if (attributes['aria-label']) {
      return `page.getByLabel('${this.escapeString(attributes['aria-label'])}')`;
    }

    // Priority 8: Text content for interactive elements
    if (text && text.length > 0 && text.length < 100) {
      if (tagName === 'a') {
        return `page.getByRole('link', { name: '${this.escapeString(text)}' })`;
      }
      if (tagName === 'button') {
        return `page.getByRole('button', { name: '${this.escapeString(text)}' })`;
      }
      // For other elements with text, use getByText
      return `page.getByText('${this.escapeString(text)}')`;
    }

    // Priority 9: name attribute for form elements
    if (attributes.name && ['input', 'textarea', 'select', 'button'].includes(tagName)) {
      return `page.locator('${tagName}[name="${this.escapeCssSelector(attributes.name)}"]')`;
    }

    // Priority 10: href for unique links
    if (tagName === 'a' && attributes.href) {
      return `page.locator('a[href="${this.escapeCssSelector(attributes.href)}"]')`;
    }

    // Fallback: Use the original selector from the AI agent
    // This is a last resort and may not be optimal
    return `page.locator('${this.escapeCssSelector(context.selector)}')`;
  }

  /**
   * Escape string for JavaScript string literals
   */
  private static escapeString(str: string): string {
    return str
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/"/g, '\\"')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\t/g, '\\t');
  }

  /**
   * Escape CSS selector for JavaScript string literals
   */
  private static escapeCssSelector(selector: string): string {
    return selector.replace(/\\/g, '\\\\').replace(/'/g, "\\'");
  }
}
