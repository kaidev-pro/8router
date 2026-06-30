export interface ModelCapability {
  id: string;
  provider: string;
  displayName: string;
  // Capabilities
  chat: boolean;
  streaming: boolean;
  tools: boolean;  // function calling
  vision: boolean;
  embeddings: boolean;
  imageGeneration: boolean;
  reasoning: boolean;  // chain-of-thought
  // Limits
  contextLength: number;
  maxOutputTokens: number;
  // Classification
  local: boolean;
  costTier: 'free' | 'low' | 'medium' | 'high' | 'premium';
  speedTier: 'fast' | 'medium' | 'slow';
  qualityTier: 'low' | 'medium' | 'high' | 'premium';
  // Cost (null = unknown)
  costPer1mInput: number | null;
  costPer1mOutput: number | null;
  currency: string;
  costLastUpdated: string;  // ISO date
  freeQuota: string | null;
  // Tool calling style
  toolCallingStyle: 'openai' | 'anthropic' | 'gemini' | 'none';
  notes?: string;
}

export const MODEL_CAPABILITIES: ModelCapability[] = [
  // === GROQ (FREE) ===
  { id: 'llama-3.3-70b-versatile', provider: 'groq', displayName: 'Llama 3.3 70B', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 32768, local: false, costTier: 'free', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.59, costPer1mOutput: 0.79, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: '14,400 requests/day', toolCallingStyle: 'openai' },
  { id: 'llama-3.1-8b-instant', provider: 'groq', displayName: 'Llama 3.1 8B Instant', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 8192, local: false, costTier: 'free', speedTier: 'fast', qualityTier: 'medium', costPer1mInput: 0.05, costPer1mOutput: 0.08, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: '14,400 requests/day', toolCallingStyle: 'openai' },
  { id: 'mixtral-8x7b-32768', provider: 'groq', displayName: 'Mixtral 8x7B', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 32768, maxOutputTokens: 32768, local: false, costTier: 'free', speedTier: 'fast', qualityTier: 'medium', costPer1mInput: 0.24, costPer1mOutput: 0.24, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: '14,400 requests/day', toolCallingStyle: 'openai' },

  // === MISTRAL ===
  { id: 'mistral-large-latest', provider: 'mistral', displayName: 'Mistral Large', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: true, contextLength: 128000, maxOutputTokens: 65536, local: false, costTier: 'high', speedTier: 'medium', qualityTier: 'premium', costPer1mInput: 2.0, costPer1mOutput: 6.0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'openai' },
  { id: 'mistral-small-latest', provider: 'mistral', displayName: 'Mistral Small', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 65536, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'medium', costPer1mInput: 0.1, costPer1mOutput: 0.3, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'openai' },
  { id: 'codestral-latest', provider: 'mistral', displayName: 'Codestral', chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 32000, maxOutputTokens: 32000, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.3, costPer1mOutput: 0.9, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'none', notes: 'Code-specialized' },

  // === DEEPSEEK ===
  { id: 'deepseek-chat', provider: 'deepseek', displayName: 'DeepSeek V3', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 64000, maxOutputTokens: 8192, local: false, costTier: 'low', speedTier: 'medium', qualityTier: 'high', costPer1mInput: 0.14, costPer1mOutput: 0.28, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'openai' },
  { id: 'deepseek-coder', provider: 'deepseek', displayName: 'DeepSeek Coder', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 64000, maxOutputTokens: 8192, local: false, costTier: 'low', speedTier: 'medium', qualityTier: 'high', costPer1mInput: 0.14, costPer1mOutput: 0.28, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'openai', notes: 'Code-specialized' },
  { id: 'deepseek-reasoner', provider: 'deepseek', displayName: 'DeepSeek R1', chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false, reasoning: true, contextLength: 64000, maxOutputTokens: 8192, local: false, costTier: 'medium', speedTier: 'slow', qualityTier: 'premium', costPer1mInput: 0.55, costPer1mOutput: 2.19, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'none', notes: 'Reasoning model' },

  // === OPENAI ===
  { id: 'gpt-4o', provider: 'openai', displayName: 'GPT-4o', chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 16384, local: false, costTier: 'high', speedTier: 'medium', qualityTier: 'premium', costPer1mInput: 2.5, costPer1mOutput: 10.0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'openai' },
  { id: 'gpt-4o-mini', provider: 'openai', displayName: 'GPT-4o Mini', chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 16384, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.15, costPer1mOutput: 0.6, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'openai' },
  { id: 'o1', provider: 'openai', displayName: 'O1', chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false, reasoning: true, contextLength: 200000, maxOutputTokens: 100000, local: false, costTier: 'premium', speedTier: 'slow', qualityTier: 'premium', costPer1mInput: 15.0, costPer1mOutput: 60.0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'openai' },

  // === ANTHROPIC ===
  { id: 'claude-sonnet-4-20250514', provider: 'anthropic', displayName: 'Claude Sonnet 4', chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 200000, maxOutputTokens: 64000, local: false, costTier: 'high', speedTier: 'medium', qualityTier: 'premium', costPer1mInput: 3.0, costPer1mOutput: 15.0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'anthropic' },
  { id: 'claude-3-5-haiku-20241022', provider: 'anthropic', displayName: 'Claude 3.5 Haiku', chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 200000, maxOutputTokens: 8192, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.8, costPer1mOutput: 4.0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'anthropic' },

  // === GOOGLE GEMINI ===
  { id: 'gemini-2.0-flash', provider: 'google', displayName: 'Gemini 2.0 Flash', chat: true, streaming: true, tools: true, vision: true, embeddings: true, imageGeneration: false, reasoning: false, contextLength: 1048576, maxOutputTokens: 8192, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.075, costPer1mOutput: 0.3, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: '60 requests/minute', toolCallingStyle: 'gemini' },
  { id: 'gemini-1.5-pro', provider: 'google', displayName: 'Gemini 1.5 Pro', chat: true, streaming: true, tools: true, vision: true, embeddings: true, imageGeneration: false, reasoning: false, contextLength: 2097152, maxOutputTokens: 8192, local: false, costTier: 'medium', speedTier: 'medium', qualityTier: 'premium', costPer1mInput: 1.25, costPer1mOutput: 5.0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: '60 requests/minute', toolCallingStyle: 'gemini' },

  // === TOGETHER AI ===
  { id: 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', provider: 'together', displayName: 'Llama 3.1 70B (Together)', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 32768, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.88, costPer1mOutput: 0.88, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: '$1 free credits', toolCallingStyle: 'openai' },

  // === FIREWORKS ===
  { id: 'accounts/fireworks/models/llama-v3p1-70b-instruct', provider: 'fireworks', displayName: 'Llama 3.1 70B (Fireworks)', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 16384, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.9, costPer1mOutput: 0.9, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'openai' },

  // === CEREBRAS ===
  { id: 'llama3.1-70b', provider: 'cerebras', displayName: 'Llama 3.1 70B (Cerebras)', chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 8192, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.6, costPer1mOutput: 0.6, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: '1M tokens free', toolCallingStyle: 'none' },

  // === SAMBANOVA ===
  { id: 'DeepSeek-V3-0324', provider: 'sambanova', displayName: 'DeepSeek V3 (SambaNova)', chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 64000, maxOutputTokens: 8192, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.4, costPer1mOutput: 0.4, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: '1M tokens free', toolCallingStyle: 'none' },

  // === PERPLEXITY ===
  { id: 'llama-3.1-sonar-large-128k-online', provider: 'perplexity', displayName: 'Perplexity Sonar Large', chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 8192, local: false, costTier: 'medium', speedTier: 'medium', qualityTier: 'high', costPer1mInput: 1.0, costPer1mOutput: 1.0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'none', notes: 'Search-augmented' },

  // === XAI ===
  { id: 'grok-3', provider: 'xai', displayName: 'Grok 3', chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 131072, maxOutputTokens: 131072, local: false, costTier: 'high', speedTier: 'medium', qualityTier: 'premium', costPer1mInput: 3.0, costPer1mOutput: 15.0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: '$25 free credits', toolCallingStyle: 'openai' },

  // === OLLAMA (LOCAL) ===
  { id: 'llama3.2', provider: 'ollama', displayName: 'Llama 3.2 (Local)', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 8192, local: true, costTier: 'free', speedTier: 'medium', qualityTier: 'medium', costPer1mInput: 0, costPer1mOutput: 0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: 'Unlimited (local)', toolCallingStyle: 'openai' },
  { id: 'qwen2.5', provider: 'ollama', displayName: 'Qwen 2.5 (Local)', chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false, reasoning: false, contextLength: 128000, maxOutputTokens: 8192, local: true, costTier: 'free', speedTier: 'medium', qualityTier: 'medium', costPer1mInput: 0, costPer1mOutput: 0, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: 'Unlimited (local)', toolCallingStyle: 'openai' },

  // === EMBEDDING MODELS ===
  { id: 'text-embedding-3-small', provider: 'openai', displayName: 'Embedding 3 Small', chat: false, streaming: false, tools: false, vision: false, embeddings: true, imageGeneration: false, reasoning: false, contextLength: 8191, maxOutputTokens: 0, local: false, costTier: 'free', speedTier: 'fast', qualityTier: 'medium', costPer1mInput: 0.02, costPer1mOutput: null, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'none', notes: 'Embeddings only' },
  { id: 'text-embedding-3-large', provider: 'openai', displayName: 'Embedding 3 Large', chat: false, streaming: false, tools: false, vision: false, embeddings: true, imageGeneration: false, reasoning: false, contextLength: 8191, maxOutputTokens: 0, local: false, costTier: 'low', speedTier: 'fast', qualityTier: 'high', costPer1mInput: 0.13, costPer1mOutput: null, currency: 'USD', costLastUpdated: '2025-01-01', freeQuota: null, toolCallingStyle: 'none', notes: 'Embeddings only' },
];

// Lookup functions
export function getModelCap(id: string, provider?: string): ModelCapability | undefined {
  return MODEL_CAPABILITIES.find(m => m.id === id && (!provider || m.provider === provider));
}

export function getModelsByProvider(provider: string): ModelCapability[] {
  return MODEL_CAPABILITIES.filter(m => m.provider === provider);
}

export function getModelsByCapability(cap: keyof ModelCapability): ModelCapability[] {
  return MODEL_CAPABILITIES.filter(m => m[cap] === true);
}

export function getCheapestModel(opts: { tools?: boolean; vision?: boolean; minQuality?: string }): ModelCapability | undefined {
  let list = MODEL_CAPABILITIES.filter(m => m.chat && m.costPer1mInput !== null);
  if (opts.tools) list = list.filter(m => m.tools);
  if (opts.vision) list = list.filter(m => m.vision);
  const qOrder: Record<string, number> = { low: 0, medium: 1, high: 2, premium: 3 };
  const minQ = qOrder[opts.minQuality || 'low'] || 0;
  list = list.filter(m => qOrder[m.qualityTier] >= minQ);
  list.sort((a, b) => ((a.costPer1mInput || 0) + (a.costPer1mOutput || 0)) - ((b.costPer1mInput || 0) + (b.costPer1mOutput || 0)));
  return list[0];
}

export function getFastestModel(opts: { tools?: boolean; vision?: boolean }): ModelCapability | undefined {
  let list = MODEL_CAPABILITIES.filter(m => m.chat && m.speedTier === 'fast');
  if (opts.tools) list = list.filter(m => m.tools);
  if (opts.vision) list = list.filter(m => m.vision);
  return list[0];
}
