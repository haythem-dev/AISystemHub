import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import type { StreamingOptions } from './openai';

export class ModelManager {
  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    modelId: string,
    streaming?: StreamingOptions
  ): Promise<string | void> {
    const provider = this.getProvider(modelId);
    return provider.generateResponse(messages, modelId, streaming);
  }

  async analyzeImage(
    base64Image: string, 
    modelId: string, 
    prompt?: string
  ): Promise<string> {
    const provider = this.getProvider(modelId);
    return provider.analyzeImage(base64Image, prompt);
  }

  async generateCode(
    prompt: string, 
    modelId: string, 
    language?: string
  ): Promise<string> {
    const provider = this.getProvider(modelId);
    return provider.generateCode(prompt, language);
  }

  private getProvider(modelId: string) {
    if (modelId.startsWith('gpt-') || modelId.includes('openai')) {
      return openaiProvider;
    } else if (modelId.startsWith('claude-') || modelId.includes('anthropic')) {
      return anthropicProvider;
    } else {
      // Default to OpenAI for unknown models
      return openaiProvider;
    }
  }

  isValidModel(modelId: string): boolean {
    const validModels = [
      'gpt-4o',
      'gpt-3.5-turbo',
      'claude-3-7-sonnet-20250219',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
    ];
    return validModels.includes(modelId);
  }
}

export const modelManager = new ModelManager();
