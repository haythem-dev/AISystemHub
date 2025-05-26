import OpenAI from "openai";

// Grok uses OpenAI-compatible API with X.AI endpoint
const grok = new OpenAI({ 
  baseURL: "https://api.x.ai/v1", 
  apiKey: process.env.XAI_API_KEY || "default_key"
});

export interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export class GrokProvider {
  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    model: string = "grok-2-1212",
    streaming?: StreamingOptions
  ): Promise<string | void> {
    try {
      if (streaming) {
        return this.generateStreamingResponse(messages, model, streaming);
      }

      const response = await grok.chat.completions.create({
        model,
        messages: messages as any,
        max_tokens: 4096,
        temperature: 0.7,
      });

      return response.choices[0].message.content || "";
    } catch (error: any) {
      throw new Error(`Grok API error: ${error.message}`);
    }
  }

  private async generateStreamingResponse(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options: StreamingOptions
  ): Promise<void> {
    try {
      const stream = await grok.chat.completions.create({
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
    } catch (error: any) {
      options.onError(new Error(`Grok streaming error: ${error.message}`));
    }
  }

  async analyzeImage(base64Image: string, prompt: string = "Analyze this image in detail"): Promise<string> {
    try {
      const response = await grok.chat.completions.create({
        model: "grok-2-vision-1212",
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
    } catch (error: any) {
      throw new Error(`Grok image analysis error: ${error.message}`);
    }
  }

  async generateCode(prompt: string, language?: string): Promise<string> {
    try {
      const systemMessage = language 
        ? `You are an expert ${language} developer. Generate clean, efficient, well-documented code with real-time insights.`
        : "You are an expert developer. Generate clean, efficient, well-documented code with real-time insights.";

      const response = await grok.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.3,
      });

      return response.choices[0].message.content || "";
    } catch (error: any) {
      throw new Error(`Grok code generation error: ${error.message}`);
    }
  }

  async realTimeAnalysis(query: string): Promise<string> {
    try {
      const response = await grok.chat.completions.create({
        model: "grok-2-1212",
        messages: [
          { 
            role: "system", 
            content: "You are Grok, an AI with real-time knowledge and wit. Provide accurate, up-to-date information with your characteristic humor and insight." 
          },
          { role: "user", content: query }
        ],
        max_tokens: 4096,
        temperature: 0.8,
      });

      return response.choices[0].message.content || "";
    } catch (error: any) {
      throw new Error(`Grok real-time analysis error: ${error.message}`);
    }
  }
}

export const grokProvider = new GrokProvider();