export interface StreamingOptions {
  onChunk: (chunk: string) => void;
  onComplete: () => void;
  onError: (error: Error) => void;
}

export class PerplexityProvider {
  private apiKey: string;
  private baseURL = "https://api.perplexity.ai";

  constructor() {
    this.apiKey = process.env.PERPLEXITY_API_KEY || "default_key";
  }

  async generateResponse(
    messages: Array<{ role: string; content: string }>,
    model: string = "llama-3.1-sonar-small-128k-online",
    streaming?: StreamingOptions
  ): Promise<string | void> {
    try {
      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model,
          messages,
          max_tokens: 4096,
          temperature: 0.2,
          top_p: 0.9,
          search_domain_filter: [],
          return_images: false,
          return_related_questions: true,
          search_recency_filter: "month",
          top_k: 0,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity API error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`Perplexity API error: ${error.message}`);
    }
  }

  async searchWeb(query: string, options?: {
    recency?: 'hour' | 'day' | 'week' | 'month' | 'year';
    domains?: string[];
  }): Promise<string> {
    try {
      const messages = [
        {
          role: "system",
          content: "You are a helpful research assistant. Provide comprehensive, accurate information with citations."
        },
        {
          role: "user",
          content: query
        }
      ];

      const response = await fetch(`${this.baseURL}/chat/completions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: "llama-3.1-sonar-large-128k-online",
          messages,
          max_tokens: 4096,
          temperature: 0.2,
          top_p: 0.9,
          search_domain_filter: options?.domains || [],
          return_images: false,
          return_related_questions: true,
          search_recency_filter: options?.recency || "month",
          top_k: 0,
          stream: false,
          presence_penalty: 0,
          frequency_penalty: 1
        }),
      });

      if (!response.ok) {
        throw new Error(`Perplexity search error: ${response.statusText}`);
      }

      const data = await response.json();
      return data.choices[0].message.content || "";
    } catch (error) {
      throw new Error(`Perplexity search error: ${error.message}`);
    }
  }

  async researchTopic(topic: string, depth: 'basic' | 'detailed' | 'comprehensive' = 'detailed'): Promise<string> {
    try {
      const prompts = {
        basic: `Provide a basic overview of: ${topic}`,
        detailed: `Provide a detailed analysis with current information about: ${topic}. Include key facts, recent developments, and reliable sources.`,
        comprehensive: `Conduct comprehensive research on: ${topic}. Include historical context, current state, recent developments, key players, challenges, opportunities, and future outlook with citations.`
      };

      return await this.searchWeb(prompts[depth], { recency: 'month' });
    } catch (error) {
      throw new Error(`Perplexity research error: ${error.message}`);
    }
  }

  async analyzeProject(projectInfo: string): Promise<string> {
    try {
      const query = `Analyze this software project and provide insights on architecture, best practices, and current industry trends: ${projectInfo}`;
      return await this.searchWeb(query, { recency: 'week' });
    } catch (error) {
      throw new Error(`Perplexity project analysis error: ${error.message}`);
    }
  }
}

export const perplexityProvider = new PerplexityProvider();