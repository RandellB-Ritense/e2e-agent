import Anthropic from '@anthropic-ai/sdk';
import { LLMClient, LLMConfig } from './LLMClient.js';

/**
 * Anthropic LLM client implementation
 */
export class AnthropicClient implements LLMClient {
  private client: Anthropic;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    this.client = new Anthropic({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'claude-3-5-sonnet-20241022';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1000;
  }

  async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.client.messages.create({
        model: this.model,
        max_tokens: this.maxTokens,
        temperature: this.temperature,
        system: systemPrompt,
        messages: [
          { role: 'user', content: userPrompt },
        ],
      });

      const content = response.content[0];
      if (content.type !== 'text') {
        throw new Error('Unexpected response type from Anthropic');
      }

      return content.text;
    } catch (error) {
      console.error('[AnthropicClient] Error generating completion:', error);
      throw error;
    }
  }
}
