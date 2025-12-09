import { LLMClient, LLMConfig } from './LLMClient.js';
import { OpenAIClient } from './OpenAIClient.js';
import { AnthropicClient } from './AnthropicClient.js';

/**
 * Factory for creating LLM clients
 */
export class LLMFactory {
  /**
   * Create an LLM client based on configuration
   * @param config LLM configuration
   * @returns An LLM client instance
   */
  static createClient(config: LLMConfig): LLMClient {
    switch (config.provider) {
      case 'openai':
        return new OpenAIClient(config);
      case 'anthropic':
        return new AnthropicClient(config);
      default:
        throw new Error(`Unsupported LLM provider: ${config.provider}`);
    }
  }

  /**
   * Create an LLM client from environment variables
   * @returns An LLM client instance
   */
  static createFromEnv(): LLMClient {
    const provider = (process.env.LLM_PROVIDER || 'openai') as 'openai' | 'anthropic';
    const apiKey = process.env.LLM_API_KEY || process.env.OPENAI_API_KEY || process.env.ANTHROPIC_API_KEY;

    if (!apiKey) {
      throw new Error(
        'No API key found. Set LLM_API_KEY, OPENAI_API_KEY, or ANTHROPIC_API_KEY environment variable.'
      );
    }

    const config: LLMConfig = {
      provider,
      apiKey,
      model: process.env.LLM_MODEL,
      temperature: process.env.LLM_TEMPERATURE ? parseFloat(process.env.LLM_TEMPERATURE) : undefined,
      maxTokens: process.env.LLM_MAX_TOKENS ? parseInt(process.env.LLM_MAX_TOKENS) : undefined,
    };

    return LLMFactory.createClient(config);
  }
}
