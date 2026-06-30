// 8Router — Model Capabilities Database
// Used by the smart model picker to match tasks to the best model

export interface ModelCapability {
  id: string;
  displayName: string;
  provider: string;
  supportsVision: boolean;
  supportsTools: boolean;
  supportsEmbeddings: boolean;
  speed: 'fast' | 'medium' | 'slow';
  quality: 'low' | 'medium' | 'high' | 'premium';
  contextWindow: number;
  costPer1mInput: number;   // USD per 1M input tokens
  costPer1mOutput: number;  // USD per 1M output tokens
}

export const MODEL_CAPABILITIES: ModelCapability[] = [
  // OpenAI
  { id: 'gpt-4o', displayName: 'GPT-4o', provider: 'openai', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'medium', quality: 'premium', contextWindow: 128000, costPer1mInput: 2.50, costPer1mOutput: 10.00 },
  { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', provider: 'openai', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'high', contextWindow: 128000, costPer1mInput: 0.15, costPer1mOutput: 0.60 },
  { id: 'gpt-4-turbo', displayName: 'GPT-4 Turbo', provider: 'openai', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'medium', quality: 'premium', contextWindow: 128000, costPer1mInput: 10.00, costPer1mOutput: 30.00 },
  { id: 'gpt-3.5-turbo', displayName: 'GPT-3.5 Turbo', provider: 'openai', supportsVision: false, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'medium', contextWindow: 16385, costPer1mInput: 0.50, costPer1mOutput: 1.50 },
  { id: 'o1', displayName: 'o1', provider: 'openai', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'slow', quality: 'premium', contextWindow: 200000, costPer1mInput: 15.00, costPer1mOutput: 60.00 },
  { id: 'o1-mini', displayName: 'o1 Mini', provider: 'openai', supportsVision: false, supportsTools: false, supportsEmbeddings: false, speed: 'medium', quality: 'high', contextWindow: 128000, costPer1mInput: 3.00, costPer1mOutput: 12.00 },
  { id: 'o3-mini', displayName: 'o3 Mini', provider: 'openai', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'medium', quality: 'premium', contextWindow: 200000, costPer1mInput: 1.10, costPer1mOutput: 4.40 },

  // Anthropic
  { id: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', provider: 'anthropic', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'medium', quality: 'premium', contextWindow: 200000, costPer1mInput: 3.00, costPer1mOutput: 15.00 },
  { id: 'claude-3-5-sonnet-20241022', displayName: 'Claude 3.5 Sonnet', provider: 'anthropic', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'medium', quality: 'premium', contextWindow: 200000, costPer1mInput: 3.00, costPer1mOutput: 15.00 },
  { id: 'claude-3-5-haiku-20241022', displayName: 'Claude 3.5 Haiku', provider: 'anthropic', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'high', contextWindow: 200000, costPer1mInput: 0.80, costPer1mOutput: 4.00 },
  { id: 'claude-3-opus-20240229', displayName: 'Claude 3 Opus', provider: 'anthropic', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'slow', quality: 'premium', contextWindow: 200000, costPer1mInput: 15.00, costPer1mOutput: 75.00 },

  // Google
  { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', provider: 'google', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'high', contextWindow: 1000000, costPer1mInput: 0.10, costPer1mOutput: 0.40 },
  { id: 'gemini-2.5-pro', displayName: 'Gemini 2.5 Pro', provider: 'google', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'medium', quality: 'premium', contextWindow: 1000000, costPer1mInput: 1.25, costPer1mOutput: 10.00 },
  { id: 'gemini-1.5-pro', displayName: 'Gemini 1.5 Pro', provider: 'google', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'medium', quality: 'high', contextWindow: 2000000, costPer1mInput: 1.25, costPer1mOutput: 5.00 },
  { id: 'gemini-1.5-flash', displayName: 'Gemini 1.5 Flash', provider: 'google', supportsVision: true, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'medium', contextWindow: 1000000, costPer1mInput: 0.075, costPer1mOutput: 0.30 },

  // Mistral
  { id: 'mistral-large-latest', displayName: 'Mistral Large', provider: 'mistral', supportsVision: false, supportsTools: true, supportsEmbeddings: false, speed: 'medium', quality: 'high', contextWindow: 128000, costPer1mInput: 2.00, costPer1mOutput: 6.00 },
  { id: 'mistral-small-latest', displayName: 'Mistral Small', provider: 'mistral', supportsVision: false, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'medium', contextWindow: 128000, costPer1mInput: 0.20, costPer1mOutput: 0.60 },
  { id: 'codestral-latest', displayName: 'Codestral', provider: 'mistral', supportsVision: false, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'high', contextWindow: 32000, costPer1mInput: 0.30, costPer1mOutput: 0.90 },

  // DeepSeek
  { id: 'deepseek-chat', displayName: 'DeepSeek V3', provider: 'deepseek', supportsVision: false, supportsTools: true, supportsEmbeddings: false, speed: 'medium', quality: 'high', contextWindow: 64000, costPer1mInput: 0.14, costPer1mOutput: 0.28 },
  { id: 'deepseek-reasoner', displayName: 'DeepSeek R1', provider: 'deepseek', supportsVision: false, supportsTools: false, supportsEmbeddings: false, speed: 'slow', quality: 'premium', contextWindow: 64000, costPer1mInput: 0.55, costPer1mOutput: 2.19 },

  // Groq (fast inference)
  { id: 'llama-3.3-70b-versatile', displayName: 'Llama 3.3 70B (Groq)', provider: 'groq', supportsVision: false, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'high', contextWindow: 128000, costPer1mInput: 0.59, costPer1mOutput: 0.79 },
  { id: 'llama-3.1-8b-instant', displayName: 'Llama 3.1 8B (Groq)', provider: 'groq', supportsVision: false, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'medium', contextWindow: 128000, costPer1mInput: 0.05, costPer1mOutput: 0.08 },

  // Ollama (local)
  { id: 'llama3.2', displayName: 'Llama 3.2 (Ollama)', provider: 'ollama', supportsVision: false, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'medium', contextWindow: 128000, costPer1mInput: 0, costPer1mOutput: 0 },
  { id: 'llama3.2-vision', displayName: 'Llama 3.2 Vision (Ollama)', provider: 'ollama', supportsVision: true, supportsTools: false, supportsEmbeddings: false, speed: 'medium', quality: 'medium', contextWindow: 128000, costPer1mInput: 0, costPer1mOutput: 0 },
  { id: 'qwen2.5-coder', displayName: 'Qwen 2.5 Coder (Ollama)', provider: 'ollama', supportsVision: false, supportsTools: true, supportsEmbeddings: false, speed: 'fast', quality: 'medium', contextWindow: 32000, costPer1mInput: 0, costPer1mOutput: 0 },

  // Embedding models (excluded from picker but listed for completeness)
  { id: 'text-embedding-3-small', displayName: 'Text Embedding 3 Small', provider: 'openai', supportsVision: false, supportsTools: false, supportsEmbeddings: true, speed: 'fast', quality: 'medium', contextWindow: 8191, costPer1mInput: 0.02, costPer1mOutput: 0 },
  { id: 'text-embedding-3-large', displayName: 'Text Embedding 3 Large', provider: 'openai', supportsVision: false, supportsTools: false, supportsEmbeddings: true, speed: 'fast', quality: 'high', contextWindow: 8191, costPer1mInput: 0.13, costPer1mOutput: 0 },
];

/**
 * Look up a model's capabilities by ID.
 */
export function getModelCapability(modelId: string): ModelCapability | undefined {
  return MODEL_CAPABILITIES.find(m => m.id === modelId);
}
