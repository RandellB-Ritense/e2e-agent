/**
 * Represents an interactive element on the page
 */
export interface InteractiveElement {
  id: number;
  tagName: string;
  selector: string;
  text: string;
  attributes: Record<string, string>;
  role?: string;
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
