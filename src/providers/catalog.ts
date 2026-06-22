// 8Router — Extended Provider Registry
// 20+ providers with auto-detection from environment variables

export interface ProviderDef {
  id: string;
  name: string;
  tier: 'subscription' | 'cheap' | 'free';
  baseUrl: string;
  adapter: 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'cohere' | 'deepseek' | 'xai' | 'together' | 'fireworks' | 'replicate' | 'ollama' | 'lmstudio' | 'vllm';
  envKey: string;
  models: string[];
  description: string;
  requiresKey: boolean;
}

// === FULL PROVIDER CATALOG ===
export const PROVIDER_CATALOG: ProviderDef[] = [
  // ── Tier: Subscription (Premium) ──
  {
    id: 'openai', name: 'OpenAI', tier: 'subscription',
    baseUrl: 'https://api.openai.com/v1', adapter: 'openai',
    envKey: 'OPENAI_API_KEY',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo', 'o1', 'o1-mini', 'o1-pro', 'o3', 'o3-mini', 'o4-mini'],
    description: 'OpenAI GPT models', requiresKey: true,
  },
  {
    id: 'anthropic', name: 'Anthropic', tier: 'subscription',
    baseUrl: 'https://api.anthropic.com/v1', adapter: 'anthropic',
    envKey: 'ANTHROPIC_API_KEY',
    models: ['claude-sonnet-4-20250514', 'claude-3-5-haiku-20241022', 'claude-3-opus-20240229', 'claude-3-5-sonnet-20241022', 'claude-3-haiku-20240307'],
    description: 'Anthropic Claude models', requiresKey: true,
  },
  {
    id: 'google', name: 'Google Gemini', tier: 'subscription',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta', adapter: 'gemini',
    envKey: 'GOOGLE_API_KEY',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash', 'gemini-1.5-flash-8b'],
    description: 'Google Gemini models', requiresKey: true,
  },
  {
    id: 'xai', name: 'xAI (Grok)', tier: 'subscription',
    baseUrl: 'https://api.x.ai/v1', adapter: 'xai',
    envKey: 'XAI_API_KEY',
    models: ['grok-3', 'grok-3-mini', 'grok-2', 'grok-2-vision'],
    description: 'xAI Grok models', requiresKey: true,
  },
  {
    id: 'mistral', name: 'Mistral AI', tier: 'subscription',
    baseUrl: 'https://api.mistral.ai/v1', adapter: 'mistral',
    envKey: 'MISTRAL_API_KEY',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'codestral-latest', 'mixtral-8x22b', 'mixtral-8x7b'],
    description: 'Mistral AI models', requiresKey: true,
  },
  {
    id: 'cohere', name: 'Cohere', tier: 'subscription',
    baseUrl: 'https://api.cohere.com/v2', adapter: 'cohere',
    envKey: 'COHERE_API_KEY',
    models: ['command-r-plus', 'command-r', 'command', 'command-light'],
    description: 'Cohere Command models', requiresKey: true,
  },

  // ── Tier: Cheap (Budget API) ──
  {
    id: 'openrouter', name: 'OpenRouter', tier: 'cheap',
    baseUrl: 'https://openrouter.ai/api/v1', adapter: 'openai',
    envKey: 'OPENROUTER_API_KEY',
    models: ['*'],  // Accepts any model
    description: 'OpenRouter — 100+ models via single API', requiresKey: true,
  },
  {
    id: 'deepseek', name: 'DeepSeek', tier: 'cheap',
    baseUrl: 'https://api.deepseek.com/v1', adapter: 'deepseek',
    envKey: 'DEEPSEEK_API_KEY',
    models: ['deepseek-chat', 'deepseek-coder', 'deepseek-reasoner', 'deepseek-r1'],
    description: 'DeepSeek models — very cheap', requiresKey: true,
  },
  {
    id: 'together', name: 'Together AI', tier: 'cheap',
    baseUrl: 'https://api.together.xyz/v1', adapter: 'together',
    envKey: 'TOGETHER_API_KEY',
    models: ['meta-llama/Meta-Llama-3.1-405B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-70B-Instruct-Turbo', 'meta-llama/Meta-Llama-3.1-8B-Instruct-Turbo', 'mistralai/Mixtral-8x22B-Instruct-v0.1', 'Qwen/Qwen2.5-72B-Instruct-Turbo', 'deepseek-ai/DeepSeek-V3'],
    description: 'Together AI — cheap open-source models', requiresKey: true,
  },
  {
    id: 'fireworks', name: 'Fireworks AI', tier: 'cheap',
    baseUrl: 'https://api.fireworks.ai/inference/v1', adapter: 'fireworks',
    envKey: 'FIREWORKS_API_KEY',
    models: ['accounts/fireworks/models/llama-v3p1-405b-instruct', 'accounts/fireworks/models/llama-v3p1-70b-instruct', 'accounts/fireworks/models/llama-v3p1-8b-instruct', 'accounts/fireworks/models/mixtral-8x22b-instruct'],
    description: 'Fireworks AI — fast inference', requiresKey: true,
  },
  {
    id: 'replicate', name: 'Replicate', tier: 'cheap',
    baseUrl: 'https://api.replicate.com/v1', adapter: 'replicate',
    envKey: 'REPLICATE_API_TOKEN',
    models: ['meta/llama-3.1-405b-instruct', 'meta/llama-3.1-70b-instruct', 'mistralai/mixtral-8x22b-instruct-v0.1'],
    description: 'Replicate — pay-per-use', requiresKey: true,
  },
  {
    id: 'perplexity', name: 'Perplexity', tier: 'cheap',
    baseUrl: 'https://api.perplexity.ai', adapter: 'openai',
    envKey: 'PERPLEXITY_API_KEY',
    models: ['llama-3.1-sonar-large-128k-online', 'llama-3.1-sonar-small-128k-online', 'llama-3.1-sonar-large-128k-chat', 'llama-3.1-sonar-small-128k-chat'],
    description: 'Perplexity — search-augmented', requiresKey: true,
  },
  {
    id: 'cerebras', name: 'Cerebras', tier: 'cheap',
    baseUrl: 'https://api.cerebras.ai/v1', adapter: 'openai',
    envKey: 'CEREBRAS_API_KEY',
    models: ['llama3.1-8b', 'llama3.1-70b'],
    description: 'Cerebras — ultra-fast inference', requiresKey: true,
  },
  {
    id: 'sambanova', name: 'SambaNova', tier: 'cheap',
    baseUrl: 'https://api.sambanova.ai/v1', adapter: 'openai',
    envKey: 'SAMBANOVA_API_KEY',
    models: ['Meta-Llama-3.1-8B-Instruct', 'Meta-Llama-3.1-70B-Instruct', 'DeepSeek-V3-0324'],
    description: 'SambaNova — fast & cheap', requiresKey: true,
  },

  // ── Tier: Free ──
  {
    id: 'groq', name: 'Groq', tier: 'free',
    baseUrl: 'https://api.groq.com/openai/v1', adapter: 'openai',
    envKey: 'GROQ_API_KEY',
    models: ['llama-3.3-70b-versatile', 'llama-3.1-8b-instant', 'llama-3.1-70b-versatile', 'mixtral-8x7b-32768', 'gemma2-9b-it', 'llama3-groq-8b-8192-tool-use-preview'],
    description: 'Groq — free tier with fast LPU inference', requiresKey: true,
  },
  {
    id: 'google-vertex', name: 'Google Vertex AI', tier: 'subscription',
    baseUrl: 'https://aiplatform.googleapis.com/v1', adapter: 'gemini',
    envKey: 'GOOGLE_VERTEX_PROJECT',
    models: ['gemini-2.0-flash', 'gemini-2.0-pro', 'gemini-1.5-pro', 'gemini-1.5-flash'],
    description: 'Google Vertex AI (enterprise)', requiresKey: true,
  },
  {
    id: 'aws-bedrock', name: 'AWS Bedrock', tier: 'subscription',
    baseUrl: 'https://bedrock.us-east-1.amazonaws.com', adapter: 'anthropic',
    envKey: 'AWS_BEDROCK_REGION',
    models: ['anthropic.claude-3-5-sonnet-20241022-v2:0', 'anthropic.claude-3-opus-20240229-v1:0', 'anthropic.claude-3-haiku-20240307-v1:0'],
    description: 'AWS Bedrock — enterprise', requiresKey: true,
  },
  {
    id: 'azure', name: 'Azure OpenAI', tier: 'subscription',
    baseUrl: 'https://YOUR_RESOURCE.openai.azure.com', adapter: 'openai',
    envKey: 'AZURE_OPENAI_API_KEY',
    models: ['gpt-4o', 'gpt-4o-mini', 'gpt-4-turbo', 'gpt-35-turbo'],
    description: 'Azure OpenAI Service', requiresKey: true,
  },

  // ── Local / Self-hosted ──
  {
    id: 'ollama', name: 'Ollama (Local)', tier: 'free',
    baseUrl: 'http://localhost:11434/v1', adapter: 'ollama',
    envKey: 'OLLAMA_HOST',
    models: ['*'],
    description: 'Ollama — local models (llama, qwen, mistral, etc)', requiresKey: false,
  },
  {
    id: 'lmstudio', name: 'LM Studio (Local)', tier: 'free',
    baseUrl: 'http://localhost:1234/v1', adapter: 'lmstudio',
    envKey: 'LMSTUDIO_HOST',
    models: ['*'],
    description: 'LM Studio — local models', requiresKey: false,
  },
  {
    id: 'vllm', name: 'vLLM (Local)', tier: 'free',
    baseUrl: 'http://localhost:8000/v1', adapter: 'vllm',
    envKey: 'VLLM_HOST',
    models: ['*'],
    description: 'vLLM — high-performance local serving', requiresKey: false,
  },
];

// Model aliases — map friendly names to provider-specific IDs
export const MODEL_ALIASES: Record<string, string> = {
  // GPT
  'gpt4': 'gpt-4o',
  'gpt4o': 'gpt-4o',
  'gpt4-mini': 'gpt-4o-mini',
  'gpt3': 'gpt-3.5-turbo',
  'o1': 'o1',
  'o3': 'o3',

  // Claude
  'claude': 'claude-sonnet-4-20250514',
  'claude-sonnet': 'claude-sonnet-4-20250514',
  'claude-haiku': 'claude-3-5-haiku-20241022',
  'claude-opus': 'claude-3-opus-20240229',
  'sonnet': 'claude-sonnet-4-20250514',
  'haiku': 'claude-3-5-haiku-20241022',
  'opus': 'claude-3-opus-20240229',

  // Gemini
  'gemini': 'gemini-2.0-flash',
  'gemini-pro': 'gemini-2.0-pro',
  'gemini-flash': 'gemini-2.0-flash',

  // Grok
  'grok': 'grok-3',
  'grok2': 'grok-2',

  // Mistral
  'mistral': 'mistral-large-latest',
  'mistral-large': 'mistral-large-latest',
  'codestral': 'codestral-latest',

  // DeepSeek
  'deepseek': 'deepseek-chat',
  'ds': 'deepseek-chat',
  'r1': 'deepseek-reasoner',

  // Groq
  'llama': 'llama-3.3-70b-versatile',
  'llama70b': 'llama-3.3-70b-versatile',
  'llama8b': 'llama-3.1-8b-instant',
  'mixtral': 'mixtral-8x7b-32768',

  // Cohere
  'command': 'command-r-plus',
  'command-r': 'command-r',

  // Llama
  'llama3': 'llama-3.3-70b-versatile',
  'llama3.1': 'llama-3.3-70b-versatile',
  'llama3.3': 'llama-3.3-70b-versatile',
  'llama4': 'llama-3.3-70b-versatile', // placeholder

  // Qwen
  'qwen': 'Qwen/Qwen2.5-72B-Instruct-Turbo',
  'qwen72b': 'Qwen/Qwen2.5-72B-Instruct-Turbo',

  // Shortcuts
  'best': 'claude-sonnet-4-20250514',
  'fast': 'gpt-4o-mini',
  'cheap': 'deepseek-chat',
  'free': 'llama-3.3-70b-versatile',
  'code': 'deepseek-coder',
  'reason': 'deepseek-reasoner',
};

// Resolve model alias
export function resolveModelAlias(model: string): string {
  const lower = model.toLowerCase().trim();
  return MODEL_ALIASES[lower] || model;
}

// Auto-detect available providers from environment
export function autoDetectProviders(): { id: string; apiKey: string; baseUrl?: string }[] {
  const detected: { id: string; apiKey: string; baseUrl?: string }[] = [];

  for (const def of PROVIDER_CATALOG) {
    const envVal = process.env[def.envKey];
    if (envVal) {
      detected.push({
        id: def.id,
        apiKey: envVal,
        baseUrl: process.env[`${def.envKey.replace('_KEY', '').replace('_TOKEN', '').replace('_PROJECT', '')}_BASE_URL`] || def.baseUrl,
      });
    }
  }

  // Check local providers (no key required)
  for (const def of PROVIDER_CATALOG.filter(p => !p.requiresKey)) {
    const hostEnv = process.env[def.envKey];
    if (hostEnv || def.baseUrl.includes('localhost')) {
      detected.push({
        id: def.id,
        apiKey: 'no-key',
        baseUrl: hostEnv || def.baseUrl,
      });
    }
  }

  return detected;
}

// Get provider definition by ID
export function getProviderDef(id: string): ProviderDef | undefined {
  return PROVIDER_CATALOG.find(p => p.id === id);
}

// Get all provider definitions
export function getAllProviderDefs(): ProviderDef[] {
  return PROVIDER_CATALOG;
}

// Search providers/models
export function searchProviders(query: string): { provider: ProviderDef; matchingModels: string[] }[] {
  const q = query.toLowerCase();
  const results: { provider: ProviderDef; matchingModels: string[] }[] = [];

  for (const p of PROVIDER_CATALOG) {
    const matchingModels = p.models.filter(m =>
      m.toLowerCase().includes(q) || p.name.toLowerCase().includes(q)
    );
    if (matchingModels.length > 0 || p.name.toLowerCase().includes(q)) {
      results.push({ provider: p, matchingModels });
    }
  }

  return results;
}
