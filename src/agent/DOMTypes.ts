/**
 * Represents an interactive element on the page
 */
export interface InteractiveElement {
  id: number;
  tagName: string;
  selector: string;
  alternativeSelectors?: string[]; // Fallback selectors from priority list
  text: string;
  attributes: Record<string, string>;
  role?: string;
  isHidden?: boolean; // Element is currently hidden but may be revealed
  expandTrigger?: string; // Selector of the element that can reveal this hidden element
}

/**
 * Serializable representation of a DOM element
 */
export interface SerializableElement {
  tagName: string;
  text: string;
  attributes: Record<string, string>;
  role?: string;
}
