import Anthropic from '@anthropic-ai/sdk';

// the newest Anthropic model is "claude-3-7-sonnet-20250219" which was released February 24, 2025
const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY || process.env.ANTHROPIC_API_KEY_ENV_VAR || "default_key",
});

export interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export class AnthropicProvider {
  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    model: string = "claude-3-7-sonnet-20250219",
    streaming?: StreamingOptions
  ): Promise<string | void> {
    try {
      // Convert messages format for Anthropic
      const anthropicMessages = messages.filter(m => m.role !== 'system').map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      }));

      const systemMessage = messages.find(m => m.role === 'system')?.content;

      if (streaming) {
        return this.generateStreamingResponse(anthropicMessages, model, systemMessage, streaming);
      }

      const response = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        messages: anthropicMessages,
        system: systemMessage,
      });

      return Array.isArray(response.content) 
        ? response.content.map(c => c.type === 'text' ? c.text : '').join('')
        : response.content;
    } catch (error) {
      throw new Error(`Anthropic API error: ${error.message}`);
    }
  }

  private async generateStreamingResponse(
    messages: Array<{ role: 'user' | 'assistant'; content: string }>,
    model: string,
    systemMessage?: string,
    options: StreamingOptions
  ): Promise<void> {
    try {
      const stream = await anthropic.messages.create({
        model,
        max_tokens: 4096,
        messages,
        system: systemMessage,
        stream: true,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        if (chunk.type === 'content_block_delta') {
          const content = chunk.delta.text || "";
          if (content) {
            fullResponse += content;
            options.onChunk(content);
          }
        }
      }

      options.onComplete();
    } catch (error) {
      options.onError(new Error(`Anthropic streaming error: ${error.message}`));
    }
  }

  async analyzeImage(base64Image: string, prompt: string = "Analyze this image in detail"): Promise<string> {
    try {
      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 1000,
        messages: [{
          role: "user",
          content: [
            { type: "text", text: prompt },
            {
              type: "image",
              source: {
                type: "base64",
                media_type: "image/jpeg",
                data: base64Image
              }
            }
          ]
        }]
      });

      return Array.isArray(response.content) 
        ? response.content.map(c => c.type === 'text' ? c.text : '').join('')
        : response.content;
    } catch (error) {
      throw new Error(`Anthropic image analysis error: ${error.message}`);
    }
  }

  async generateCode(prompt: string, language?: string): Promise<string> {
    try {
      const systemMessage = language 
        ? `You are a code generation expert. Generate ${language} code based on the user's request. Provide clean, well-commented, production-ready code.`
        : "You are a code generation expert. Generate code based on the user's request. Provide clean, well-commented, production-ready code.";

      const response = await anthropic.messages.create({
        model: "claude-3-7-sonnet-20250219",
        max_tokens: 4096,
        system: systemMessage,
        messages: [{ role: "user", content: prompt }],
      });

      return Array.isArray(response.content) 
        ? response.content.map(c => c.type === 'text' ? c.text : '').join('')
        : response.content;
    } catch (error) {
      throw new Error(`Anthropic code generation error: ${error.message}`);
    }
  }
}

export const anthropicProvider = new AnthropicProvider();
