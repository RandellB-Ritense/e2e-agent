import { Mistral } from '@mistralai/mistralai';
import { LLMClient, LLMConfig } from './LLMClient.js';

/**
 * Mistral LLM client implementation
 */
export class MistralClient implements LLMClient {
  private client: Mistral;
  private model: string;
  private temperature: number;
  private maxTokens: number;

  constructor(config: LLMConfig) {
    this.client = new Mistral({
      apiKey: config.apiKey,
    });
    this.model = config.model || 'mistral-large-latest';
    this.temperature = config.temperature ?? 0.7;
    this.maxTokens = config.maxTokens ?? 1000;
  }

  async generateCompletion(systemPrompt: string, userPrompt: string): Promise<string> {
    try {
      const response = await this.client.chat.complete({
        model: this.model,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userPrompt },
        ],
        temperature: this.temperature,
        maxTokens: this.maxTokens,
      });

      const content = response.choices?.[0]?.message?.content;
      if (!content) {
        throw new Error('No response from Mistral');
      }

      // Handle both string and ContentChunk array responses
      if (typeof content === 'string') {
        return content;
      }

      // If it's an array of ContentChunks, concatenate their text
      return content.map((chunk: any) => chunk.text || '').join('');
    } catch (error) {
      console.error('[MistralClient] Error generating completion:', error);
      throw error;
    }
  }
}
