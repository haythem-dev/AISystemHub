import OpenAI from "openai";

// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user
const openai = new OpenAI({ 
  apiKey: process.env.OPENAI_API_KEY || process.env.OPENAI_API_KEY_ENV_VAR || "default_key"
});

export interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export class OpenAIProvider {
  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    model: string = "gpt-4o",
    streaming?: StreamingOptions
  ): Promise<string | void> {
    try {
      if (streaming) {
        return this.generateStreamingResponse(messages, model, streaming);
      }

      const response = await openai.chat.completions.create({
        model,
        messages: messages as any,
        max_tokens: 4096,
        temperature: 0.7,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`OpenAI API error: ${error.message}`);
    }
  }

  private async generateStreamingResponse(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options: StreamingOptions
  ): Promise<void> {
    try {
      const stream = await openai.chat.completions.create({
        model,
        messages: messages as any,
        max_tokens: 4096,
        temperature: 0.7,
        stream: true,
      });

      let fullResponse = "";
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          fullResponse += content;
          options.onChunk(content);
        }
      }

      options.onComplete();
    } catch (error) {
      options.onError(new Error(`OpenAI streaming error: ${error.message}`));
    }
  }

  async analyzeImage(base64Image: string, prompt: string = "Analyze this image in detail"): Promise<string> {
    try {
      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          {
            role: "user",
            content: [
              { type: "text", text: prompt },
              {
                type: "image_url",
                image_url: { url: `data:image/jpeg;base64,${base64Image}` }
              }
            ],
          },
        ],
        max_tokens: 1000,
      });

      return response.choices[0].message.content || "Unable to analyze image";
    } catch (error) {
      throw new Error(`OpenAI image analysis error: ${error.message}`);
    }
  }

  async generateCode(prompt: string, language?: string): Promise<string> {
    try {
      const systemMessage = language 
        ? `You are a code generation expert. Generate ${language} code based on the user's request. Provide clean, well-commented, production-ready code.`
        : "You are a code generation expert. Generate code based on the user's request. Provide clean, well-commented, production-ready code.";

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.3,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`OpenAI code generation error: ${error.message}`);
    }
  }
}

export const openaiProvider = new OpenAIProvider();
