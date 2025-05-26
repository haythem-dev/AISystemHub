import OpenAI from "openai";

// DeepSeek uses OpenAI-compatible API
const deepseek = new OpenAI({
  apiKey: process.env.DEEPSEEK_API_KEY || "default_key",
  baseURL: "https://api.deepseek.com",
});

export interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export class DeepSeekProvider {
  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    model: string = "deepseek-coder",
    streaming?: StreamingOptions
  ): Promise<string | void> {
    try {
      if (streaming) {
        return this.generateStreamingResponse(messages, model, streaming);
      }

      const response = await deepseek.chat.completions.create({
        model,
        messages: messages as any,
        max_tokens: 4096,
        temperature: 0.3, // Lower temperature for code tasks
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`DeepSeek API error: ${error.message}`);
    }
  }

  private async generateStreamingResponse(
    messages: Array<{ role: string; content: string }>,
    model: string,
    options: StreamingOptions
  ): Promise<void> {
    try {
      const stream = await deepseek.chat.completions.create({
        model,
        messages: messages as any,
        max_tokens: 4096,
        temperature: 0.3,
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
      options.onError(new Error(`DeepSeek streaming error: ${error.message}`));
    }
  }

  async analyzeCode(code: string, language?: string): Promise<string> {
    try {
      const prompt = language 
        ? `Analyze this ${language} code for quality, security, performance, and best practices:\n\n${code}`
        : `Analyze this code for quality, security, performance, and best practices:\n\n${code}`;

      const response = await deepseek.chat.completions.create({
        model: "deepseek-coder",
        messages: [
          { role: "system", content: "You are an expert code reviewer. Provide detailed analysis with specific recommendations." },
          { role: "user", content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.2,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`DeepSeek code analysis error: ${error.message}`);
    }
  }

  async generateCode(prompt: string, language?: string): Promise<string> {
    try {
      const systemMessage = language 
        ? `You are a senior ${language} developer. Generate clean, efficient, well-documented code.`
        : "You are a senior software developer. Generate clean, efficient, well-documented code.";

      const response = await deepseek.chat.completions.create({
        model: "deepseek-coder",
        messages: [
          { role: "system", content: systemMessage },
          { role: "user", content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.3,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`DeepSeek code generation error: ${error.message}`);
    }
  }

  async generateUML(projectDescription: string, diagramType: 'class' | 'sequence' | 'component' | 'architecture' = 'class'): Promise<string> {
    try {
      const prompt = `Generate a ${diagramType} diagram in PlantUML format for: ${projectDescription}

Requirements:
- Use proper PlantUML syntax
- Include all major components/classes
- Show relationships and dependencies
- Add comments for clarity
- Follow UML best practices`;

      const response = await deepseek.chat.completions.create({
        model: "deepseek-coder",
        messages: [
          { role: "system", content: "You are a software architect expert in UML and PlantUML. Generate accurate, well-structured diagrams." },
          { role: "user", content: prompt }
        ],
        max_tokens: 4096,
        temperature: 0.2,
      });

      return response.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`DeepSeek UML generation error: ${error.message}`);
    }
  }
}

export const deepseekProvider = new DeepSeekProvider();