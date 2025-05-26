import { openaiProvider } from './openai';
import { anthropicProvider } from './anthropic';
import { deepseekProvider } from './deepseek';
import { perplexityProvider } from './perplexity';
import { projectAnalyzer } from './project-analyzer';
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
    } else if (modelId.startsWith('deepseek-') || modelId.includes('deepseek')) {
      return deepseekProvider;
    } else if (modelId.includes('sonar') || modelId.includes('perplexity')) {
      return perplexityProvider;
    } else if (modelId.includes('genspark')) {
      return deepseekProvider; // GenSpark uses DeepSeek for code analysis
    } else {
      // Default to OpenAI for unknown models
      return openaiProvider;
    }
  }

  async analyzeProject(files: Array<{path: string, content: string, type: string}>, analysisType: string): Promise<string> {
    const projectFiles = files.map(f => ({
      path: f.path,
      content: f.content,
      type: f.type,
      size: f.content.length
    }));

    switch (analysisType) {
      case 'structure':
        const structure = await projectAnalyzer.analyzeProjectStructure(projectFiles);
        return JSON.stringify(structure, null, 2);
      
      case 'metrics':
        return await projectAnalyzer.generateCodeMetricsReport(projectFiles);
      
      case 'uml':
        return await projectAnalyzer.generateUMLDiagram(projectFiles, 'class');
      
      case 'architecture':
        return await projectAnalyzer.generateArchitectureDocs(projectFiles);
      
      case 'datamodel':
        return await projectAnalyzer.generateDataModel(projectFiles);
      
      case 'documentation':
        return await projectAnalyzer.generateArchitectureDocs(projectFiles);
      
      default:
        return await projectAnalyzer.generateCodeMetricsReport(projectFiles);
    }
  }

  isValidModel(modelId: string): boolean {
    const validModels = [
      'gpt-4o',
      'gpt-3.5-turbo',
      'claude-3-7-sonnet-20250219',
      'claude-3-opus-20240229',
      'claude-3-sonnet-20240229',
      'deepseek-coder',
      'llama-3.1-sonar-large-128k-online',
      'genspark-analyst',
    ];
    return validModels.includes(modelId);
  }
}

export const modelManager = new ModelManager();
