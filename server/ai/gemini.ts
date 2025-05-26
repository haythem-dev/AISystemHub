export interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export class GeminiProvider {
  private apiKey: string;
  private baseURL = "https://generativelanguage.googleapis.com/v1beta";

  constructor() {
    this.apiKey = process.env.GEMINI_API_KEY || "default_key";
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    model: string = "gemini-1.5-pro",
    streaming?: StreamingOptions
  ): Promise<string | void> {
    try {
      const contents = this.convertMessagesToGeminiFormat(messages);
      
      const response = await fetch(`${this.baseURL}/models/${model}:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents,
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          },
          safetySettings: [
            {
              category: "HARM_CATEGORY_HARASSMENT",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            },
            {
              category: "HARM_CATEGORY_HATE_SPEECH",
              threshold: "BLOCK_MEDIUM_AND_ABOVE"
            }
          ]
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || "";
    } catch (error: any) {
      throw new Error(`Gemini API error: ${error.message}`);
    }
  }

  private convertMessagesToGeminiFormat(messages: Array<{ role: string; content: string }>) {
    return messages.map(msg => ({
      role: msg.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: msg.content }]
    }));
  }

  async analyzeImage(base64Image: string, prompt: string = "Analyze this image in detail"): Promise<string> {
    try {
      const response = await fetch(`${this.baseURL}/models/gemini-1.5-pro-vision:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [
              { text: prompt },
              {
                inline_data: {
                  mime_type: "image/jpeg",
                  data: base64Image
                }
              }
            ]
          }],
          generationConfig: {
            temperature: 0.4,
            topK: 32,
            topP: 1,
            maxOutputTokens: 4096,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini vision API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || "Unable to analyze image";
    } catch (error: any) {
      throw new Error(`Gemini image analysis error: ${error.message}`);
    }
  }

  async generateCode(prompt: string, language?: string): Promise<string> {
    try {
      const enhancedPrompt = language 
        ? `Generate ${language} code for: ${prompt}. Provide clean, efficient, well-documented code with Google's best practices.`
        : `Generate code for: ${prompt}. Provide clean, efficient, well-documented code with best practices.`;

      const response = await fetch(`${this.baseURL}/models/gemini-1.5-pro:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{
            parts: [{ text: enhancedPrompt }]
          }],
          generationConfig: {
            temperature: 0.3,
            topK: 20,
            topP: 0.8,
            maxOutputTokens: 4096,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini code generation error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || "";
    } catch (error: any) {
      throw new Error(`Gemini code generation error: ${error.message}`);
    }
  }

  async multimodalAnalysis(text: string, images?: string[]): Promise<string> {
    try {
      const parts: any[] = [{ text }];
      
      if (images && images.length > 0) {
        images.forEach(image => {
          parts.push({
            inline_data: {
              mime_type: "image/jpeg",
              data: image
            }
          });
        });
      }

      const response = await fetch(`${this.baseURL}/models/gemini-1.5-pro-vision:generateContent?key=${this.apiKey}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          contents: [{ parts }],
          generationConfig: {
            temperature: 0.7,
            topK: 40,
            topP: 0.95,
            maxOutputTokens: 4096,
          }
        }),
      });

      if (!response.ok) {
        throw new Error(`Gemini multimodal API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.candidates[0]?.content?.parts[0]?.text || "";
    } catch (error: any) {
      throw new Error(`Gemini multimodal analysis error: ${error.message}`);
    }
  }
}

export const geminiProvider = new GeminiProvider();