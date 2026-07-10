// 8Router — Provider Security Metadata
// Defines supported providers, credential types, and test strategies.

export interface ProviderSecurityMeta {
  id: string;
  name: string;
  category: 'premium' | 'efficient' | 'local';
  credentialType: 'api_key' | 'bearer_token' | 'local_endpoint';
  defaultBaseUrl: string;
  supportsBaseUrlOverride: boolean;
  supportsModelsEndpoint: boolean;
  testEndpoint: string;
  status: 'available' | 'beta' | 'coming_soon' | 'local';
  docsUrl: string;
  envKeyName: string;
  requiresKey: boolean;
}

export const PROVIDER_SECURITY_META: ProviderSecurityMeta[] = [
  {
    id: 'openai', name: 'OpenAI', category: 'premium',
    credentialType: 'api_key', defaultBaseUrl: 'https://api.openai.com/v1',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'available',
    docsUrl: 'https://platform.openai.com/docs/api-reference',
    envKeyName: 'OPENAI_API_KEY', requiresKey: true,
  },
  {
    id: 'anthropic', name: 'Anthropic', category: 'premium',
    credentialType: 'api_key', defaultBaseUrl: 'https://api.anthropic.com/v1',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: false,
    testEndpoint: '/models', status: 'available',
    docsUrl: 'https://docs.anthropic.com/en/api',
    envKeyName: 'ANTHROPIC_API_KEY', requiresKey: true,
  },
  {
    id: 'google', name: 'Google Gemini', category: 'premium',
    credentialType: 'api_key', defaultBaseUrl: 'https://generativelanguage.googleapis.com/v1beta',
    supportsBaseUrlOverride: false, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'available',
    docsUrl: 'https://ai.google.dev/docs',
    envKeyName: 'GOOGLE_API_KEY', requiresKey: true,
  },
  {
    id: 'groq', name: 'Groq', category: 'efficient',
    credentialType: 'api_key', defaultBaseUrl: 'https://api.groq.com/openai/v1',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'available',
    docsUrl: 'https://console.groq.com/docs/api-reference',
    envKeyName: 'GROQ_API_KEY', requiresKey: true,
  },
  {
    id: 'openrouter', name: 'OpenRouter', category: 'efficient',
    credentialType: 'api_key', defaultBaseUrl: 'https://openrouter.ai/api/v1',
    supportsBaseUrlOverride: false, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'available',
    docsUrl: 'https://openrouter.ai/docs',
    envKeyName: 'OPENROUTER_API_KEY', requiresKey: true,
  },
  {
    id: 'mistral', name: 'Mistral AI', category: 'efficient',
    credentialType: 'api_key', defaultBaseUrl: 'https://api.mistral.ai/v1',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'available',
    docsUrl: 'https://docs.mistral.ai/api/',
    envKeyName: 'MISTRAL_API_KEY', requiresKey: true,
  },
  {
    id: 'deepseek', name: 'DeepSeek', category: 'efficient',
    credentialType: 'api_key', defaultBaseUrl: 'https://api.deepseek.com/v1',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'available',
    docsUrl: 'https://platform.deepseek.com/docs',
    envKeyName: 'DEEPSEEK_API_KEY', requiresKey: true,
  },
  {
    id: 'together', name: 'Together AI', category: 'efficient',
    credentialType: 'api_key', defaultBaseUrl: 'https://api.together.xyz/v1',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'available',
    docsUrl: 'https://docs.together.ai/docs',
    envKeyName: 'TOGETHER_API_KEY', requiresKey: true,
  },
  {
    id: 'xai', name: 'xAI (Grok)', category: 'premium',
    credentialType: 'api_key', defaultBaseUrl: 'https://api.x.ai/v1',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'coming_soon',
    docsUrl: 'https://docs.x.ai/',
    envKeyName: 'XAI_API_KEY', requiresKey: true,
  },
  {
    id: 'perplexity', name: 'Perplexity', category: 'efficient',
    credentialType: 'api_key', defaultBaseUrl: 'https://api.perplexity.ai',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: false,
    testEndpoint: '/chat/completions', status: 'coming_soon',
    docsUrl: 'https://docs.perplexity.ai/',
    envKeyName: 'PERPLEXITY_API_KEY', requiresKey: true,
  },
  {
    id: 'cloudflare', name: 'Cloudflare AI', category: 'efficient',
    credentialType: 'api_key', defaultBaseUrl: 'https://api.cloudflare.com/client/v4',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: false,
    testEndpoint: '', status: 'coming_soon',
    docsUrl: 'https://developers.cloudflare.com/workers-ai/',
    envKeyName: 'CLOUDFLARE_API_TOKEN', requiresKey: true,
  },
  {
    id: 'ollama', name: 'Ollama (Local)', category: 'local',
    credentialType: 'local_endpoint', defaultBaseUrl: 'http://localhost:11434',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: true,
    testEndpoint: '/api/tags', status: 'local',
    docsUrl: 'https://ollama.com/docs',
    envKeyName: 'OLLAMA_HOST', requiresKey: false,
  },
  {
    id: 'lmstudio', name: 'LM Studio (Local)', category: 'local',
    credentialType: 'local_endpoint', defaultBaseUrl: 'http://localhost:1234/v1',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'local',
    docsUrl: 'https://lmstudio.ai/docs',
    envKeyName: 'LMSTUDIO_HOST', requiresKey: false,
  },
  {
    id: 'vllm', name: 'vLLM (Local)', category: 'local',
    credentialType: 'local_endpoint', defaultBaseUrl: 'http://localhost:8000/v1',
    supportsBaseUrlOverride: true, supportsModelsEndpoint: true,
    testEndpoint: '/models', status: 'local',
    docsUrl: 'https://docs.vllm.ai/',
    envKeyName: 'VLLM_HOST', requiresKey: false,
  },
];

export function getProviderMeta(providerId: string): ProviderSecurityMeta | undefined {
  return PROVIDER_SECURITY_META.find(p => p.id === providerId);
}

export function isProviderConfigurable(providerId: string): boolean {
  const meta = getProviderMeta(providerId);
  return meta?.status !== 'coming_soon';
}
