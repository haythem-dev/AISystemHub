
import { jest } from '@jest/globals';

// Mock environment variables for testing
process.env.NODE_ENV = 'test';
process.env.SESSION_SECRET = 'test-secret-key';
process.env.OPENAI_API_KEY = 'test-key';
process.env.ANTHROPIC_API_KEY = 'test-key';
process.env.DEEPSEEK_API_KEY = 'test-key';
process.env.XAI_API_KEY = 'test-key';
process.env.GOOGLE_API_KEY = 'test-key';
process.env.PERPLEXITY_API_KEY = 'test-key';

// Increase timeout for async operations
jest.setTimeout(60000);

// Mock AI providers for testing (avoid real API calls)
jest.mock('../server/ai/openai', () => ({
  openaiProvider: {
    generateResponse: jest.fn().mockResolvedValue('Mock OpenAI response'),
    streamResponse: jest.fn().mockImplementation(async (messages, options) => {
      options.onChunk('Mock ');
      options.onChunk('streaming ');
      options.onChunk('response');
      options.onComplete();
    }),
    analyzeImage: jest.fn().mockResolvedValue('Mock image analysis'),
    generateCode: jest.fn().mockResolvedValue('console.log("Mock code");')
  }
}));

jest.mock('../server/ai/anthropic', () => ({
  anthropicProvider: {
    generateResponse: jest.fn().mockResolvedValue('Mock Claude response'),
    streamResponse: jest.fn().mockImplementation(async (messages, options) => {
      options.onChunk('Mock ');
      options.onChunk('Claude ');
      options.onChunk('response');
      options.onComplete();
    })
  }
}));

jest.mock('../server/ai/deepseek', () => ({
  deepseekProvider: {
    generateResponse: jest.fn().mockResolvedValue('Mock DeepSeek response'),
    analyzeCode: jest.fn().mockResolvedValue('Mock code analysis'),
    generateUML: jest.fn().mockResolvedValue('@startuml\nclass MockClass\n@enduml')
  }
}));

jest.mock('../server/ai/grok', () => ({
  grokProvider: {
    generateResponse: jest.fn().mockResolvedValue('Mock Grok response'),
    analyzeImage: jest.fn().mockResolvedValue('Mock Grok image analysis'),
    generateCode: jest.fn().mockResolvedValue('# Mock Grok code')
  }
}));

jest.mock('../server/ai/gemini', () => ({
  geminiProvider: {
    generateResponse: jest.fn().mockResolvedValue('Mock Gemini response'),
    analyzeImage: jest.fn().mockResolvedValue('Mock Gemini image analysis')
  }
}));

jest.mock('../server/ai/perplexity', () => ({
  perplexityProvider: {
    searchAndGenerate: jest.fn().mockResolvedValue('Mock Perplexity search response'),
    generateResponse: jest.fn().mockResolvedValue('Mock Perplexity response')
  }
}));
