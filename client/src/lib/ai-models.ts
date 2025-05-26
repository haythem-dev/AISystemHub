import type { AiModel } from '@shared/schema';

export const getModelCapabilities = (modelId: string) => {
  const capabilities: Record<string, string[]> = {
    'gpt-4o': [
      'Advanced reasoning',
      'Code generation',
      'Image analysis',
      'Complex problem solving',
      'Multi-step tasks'
    ],
    'claude-3-7-sonnet-20250219': [
      'Advanced reasoning',
      'Code analysis',
      'Document processing',
      'Creative writing',
      'Research assistance'
    ],
    'gpt-3.5-turbo': [
      'General conversation',
      'Basic code help',
      'Quick responses',
      'Text processing',
      'Simple tasks'
    ]
  };

  return capabilities[modelId] || ['General AI assistance'];
};

export const getModelDescription = (model: AiModel) => {
  const descriptions: Record<string, string> = {
    'gpt-4o': 'Most capable OpenAI model for complex reasoning and multimodal tasks',
    'claude-3-7-sonnet-20250219': 'Latest Anthropic model with enhanced reasoning capabilities',
    'gpt-3.5-turbo': 'Fast and efficient model for general-purpose tasks'
  };

  return descriptions[model.id] || model.description || 'AI language model';
};

export const getModelProvider = (modelId: string): 'openai' | 'anthropic' | 'unknown' => {
  if (modelId.startsWith('gpt-')) return 'openai';
  if (modelId.startsWith('claude-')) return 'anthropic';
  return 'unknown';
};

export const getModelColor = (modelId: string) => {
  const colors: Record<string, string> = {
    'gpt-4o': 'bg-green-500',
    'claude-3-7-sonnet-20250219': 'bg-orange-500',
    'gpt-3.5-turbo': 'bg-blue-500'
  };

  return colors[modelId] || 'bg-gray-500';
};
