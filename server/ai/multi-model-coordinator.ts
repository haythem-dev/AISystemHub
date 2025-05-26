import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { deepseekProvider } from './deepseek';
import { perplexityProvider } from './perplexity';
import { grokProvider } from './grok';
import { geminiProvider } from './gemini';
import type { StreamingOptions } from './openai';

interface ModelResponse {
  modelId: string;
  response: string;
  score: number;
  reasoning: string;
  executionTime: number;
}

interface CoordinatorOptions {
  strategy: 'best' | 'consensus' | 'parallel' | 'sequential';
  minModels?: number;
  timeout?: number;
}

export class MultiModelCoordinator {
  private models = [
    { id: 'gpt-4o', provider: openaiProvider, category: 'general', strength: 'reasoning' },
    { id: 'claude-3-7-sonnet-20250219', provider: anthropicProvider, category: 'general', strength: 'analysis' },
    { id: 'deepseek-coder', provider: deepseekProvider, category: 'code', strength: 'programming' },
    { id: 'grok-2-1212', provider: grokProvider, category: 'realtime', strength: 'current_events' },
    { id: 'gemini-1.5-pro', provider: geminiProvider, category: 'multimodal', strength: 'vision' },
    { id: 'llama-3.1-sonar-large-128k-online', provider: perplexityProvider, category: 'search', strength: 'research' }
  ];

  async generateBestResponse(
    messages: Array<{ role: string; content: string }>,
    options: CoordinatorOptions = { strategy: 'best', minModels: 3, timeout: 30000 },
    streaming?: StreamingOptions
  ): Promise<string> {
    const query = messages[messages.length - 1]?.content || '';
    const queryType = this.analyzeQueryType(query);
    
    // Select best models for this query type
    const selectedModels = this.selectModelsForQuery(queryType, options.minModels || 3);
    
    if (streaming) {
      return this.generateStreamingConsensus(messages, selectedModels, streaming);
    }

    const responses = await this.getMultipleResponses(messages, selectedModels, options.timeout);
    
    switch (options.strategy) {
      case 'best':
        return this.selectBestResponse(responses);
      case 'consensus':
        return this.generateConsensusResponse(responses);
      case 'parallel':
        return this.combineParallelResponses(responses);
      default:
        return this.selectBestResponse(responses);
    }
  }

  private analyzeQueryType(query: string): string {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('code') || lowerQuery.includes('program') || lowerQuery.includes('debug') || lowerQuery.includes('function')) {
      return 'code';
    }
    if (lowerQuery.includes('current') || lowerQuery.includes('latest') || lowerQuery.includes('news') || lowerQuery.includes('recent')) {
      return 'realtime';
    }
    if (lowerQuery.includes('research') || lowerQuery.includes('search') || lowerQuery.includes('find') || lowerQuery.includes('information')) {
      return 'search';
    }
    if (lowerQuery.includes('image') || lowerQuery.includes('visual') || lowerQuery.includes('picture') || lowerQuery.includes('analyze')) {
      return 'multimodal';
    }
    if (lowerQuery.includes('analyze') || lowerQuery.includes('review') || lowerQuery.includes('explain') || lowerQuery.includes('compare')) {
      return 'analysis';
    }
    
    return 'general';
  }

  private selectModelsForQuery(queryType: string, count: number) {
    let prioritizedModels = [...this.models];
    
    // Prioritize models based on query type
    switch (queryType) {
      case 'code':
        prioritizedModels.sort((a, b) => {
          const aScore = a.category === 'code' ? 3 : (a.strength === 'programming' ? 2 : 1);
          const bScore = b.category === 'code' ? 3 : (b.strength === 'programming' ? 2 : 1);
          return bScore - aScore;
        });
        break;
      case 'realtime':
        prioritizedModels.sort((a, b) => {
          const aScore = a.category === 'realtime' ? 3 : (a.category === 'search' ? 2 : 1);
          const bScore = b.category === 'realtime' ? 3 : (b.category === 'search' ? 2 : 1);
          return bScore - aScore;
        });
        break;
      case 'search':
        prioritizedModels.sort((a, b) => {
          const aScore = a.category === 'search' ? 3 : (a.category === 'realtime' ? 2 : 1);
          const bScore = b.category === 'search' ? 3 : (b.category === 'realtime' ? 2 : 1);
          return bScore - aScore;
        });
        break;
      case 'multimodal':
        prioritizedModels.sort((a, b) => {
          const aScore = a.category === 'multimodal' ? 3 : (a.strength === 'vision' ? 2 : 1);
          const bScore = b.category === 'multimodal' ? 3 : (b.strength === 'vision' ? 2 : 1);
          return bScore - aScore;
        });
        break;
      default:
        // For general queries, prefer models with strong reasoning
        prioritizedModels.sort((a, b) => {
          const aScore = a.category === 'general' ? 2 : 1;
          const bScore = b.category === 'general' ? 2 : 1;
          return bScore - aScore;
        });
    }
    
    return prioritizedModels.slice(0, count);
  }

  private async getMultipleResponses(
    messages: Array<{ role: string; content: string }>,
    selectedModels: any[],
    timeout: number = 30000
  ): Promise<ModelResponse[]> {
    const promises = selectedModels.map(async (model) => {
      const startTime = Date.now();
      try {
        const response = await Promise.race([
          model.provider.generateResponse(messages, model.id),
          new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
        ]) as string;
        
        const executionTime = Date.now() - startTime;
        const score = this.scoreResponse(response, model.category, executionTime);
        
        return {
          modelId: model.id,
          response,
          score,
          reasoning: `${model.strength} specialization`,
          executionTime
        };
      } catch (error: any) {
        return {
          modelId: model.id,
          response: '',
          score: 0,
          reasoning: `Error: ${error.message}`,
          executionTime: Date.now() - startTime
        };
      }
    });

    const results = await Promise.all(promises);
    return results.filter(r => r.response.length > 0);
  }

  private scoreResponse(response: string, category: string, executionTime: number): number {
    let score = 50; // Base score
    
    // Content quality scoring
    if (response.length > 100) score += 10;
    if (response.length > 500) score += 10;
    if (response.includes('```')) score += 15; // Code blocks
    if (response.includes('http')) score += 5; // References
    
    // Category-specific bonuses
    switch (category) {
      case 'code':
        if (response.includes('function') || response.includes('class')) score += 20;
        break;
      case 'search':
        if (response.includes('according to') || response.includes('source')) score += 15;
        break;
      case 'realtime':
        if (response.includes('2024') || response.includes('2025')) score += 10;
        break;
    }
    
    // Speed bonus (faster responses get slight bonus)
    if (executionTime < 5000) score += 5;
    if (executionTime < 2000) score += 10;
    
    return Math.min(100, score);
  }

  private selectBestResponse(responses: ModelResponse[]): string {
    if (responses.length === 0) return "I apologize, but I'm unable to generate a response at the moment.";
    
    const best = responses.reduce((prev, current) => 
      current.score > prev.score ? current : prev
    );
    
    const runner_up = responses.filter(r => r.modelId !== best.modelId)
      .reduce((prev, current) => current.score > prev.score ? current : prev, responses[0]);
    
    // If the difference is small, combine insights
    if (runner_up && Math.abs(best.score - runner_up.score) < 10) {
      return this.combineTopResponses([best, runner_up]);
    }
    
    return best.response;
  }

  private generateConsensusResponse(responses: ModelResponse[]): string {
    if (responses.length === 0) return "I apologize, but I'm unable to generate a response at the moment.";
    if (responses.length === 1) return responses[0].response;
    
    // Take top 3 responses
    const topResponses = responses
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
    
    return this.combineTopResponses(topResponses);
  }

  private combineTopResponses(responses: ModelResponse[]): string {
    const mainResponse = responses[0].response;
    
    if (responses.length === 1) return mainResponse;
    
    // Add insights from other models if they provide unique value
    let combined = mainResponse;
    
    for (let i = 1; i < responses.length; i++) {
      const additional = responses[i].response;
      const uniqueInsights = this.extractUniqueInsights(mainResponse, additional);
      if (uniqueInsights) {
        combined += `\n\n**Additional Insight (${responses[i].modelId}):** ${uniqueInsights}`;
      }
    }
    
    return combined;
  }

  private extractUniqueInsights(main: string, additional: string): string | null {
    // Simple heuristic: if additional response has significantly different content
    const mainWords = new Set(main.toLowerCase().split(/\s+/));
    const additionalWords = additional.toLowerCase().split(/\s+/);
    const uniqueWords = additionalWords.filter(word => !mainWords.has(word));
    
    if (uniqueWords.length > additional.split(/\s+/).length * 0.3) {
      // Return first 200 characters of additional insights
      return additional.substring(0, 200) + (additional.length > 200 ? '...' : '');
    }
    
    return null;
  }

  private combineParallelResponses(responses: ModelResponse[]): string {
    if (responses.length === 0) return "I apologize, but I'm unable to generate a response at the moment.";
    
    let combined = "**Comprehensive AI Analysis:**\n\n";
    
    responses
      .sort((a, b) => b.score - a.score)
      .forEach((response, index) => {
        combined += `**${response.modelId} (Score: ${response.score}):**\n${response.response}\n\n`;
      });
    
    return combined;
  }

  private async generateStreamingConsensus(
    messages: Array<{ role: string; content: string }>,
    selectedModels: any[],
    streaming: StreamingOptions
  ): Promise<string> {
    // For streaming, use the best model for the query type
    const primaryModel = selectedModels[0];
    
    try {
      await primaryModel.provider.generateResponse(messages, primaryModel.id, {
        onChunk: (chunk: string) => {
          streaming.onChunk(chunk);
        },
        onComplete: () => {
          streaming.onComplete();
        },
        onError: (error: Error) => {
          streaming.onError(error);
        }
      });
      return '';
    } catch (error: any) {
      streaming.onError(error);
      return '';
    }
  }
}

export const multiModelCoordinator = new MultiModelCoordinator();