/**
 * Interface for LLM client implementations
 */
export interface LLMClient {
  /**
   * Generate a completion from the LLM
   * @param systemPrompt The system prompt
   * @param userPrompt The user prompt
   * @returns The LLM's response text
   */
  generateCompletion(systemPrompt: string, userPrompt: string): Promise<string>;
}

/**
 * Configuration for LLM clients
 */
export interface LLMConfig {
  provider: 'openai' | 'anthropic';
  apiKey: string;
  model?: string;
  temperature?: number;
  maxTokens?: number;
}
