// 8Router — Provider Branding Registry
// Central source of truth for provider logos, names, colors, and metadata

export interface ProviderBrand {
  id: string;
  name: string;
  logo: string;
  fallback: string;
  brandColor: string;
  tier: 'premium' | 'efficient' | 'free' | 'local';
  status: 'active' | 'beta' | 'coming-soon' | 'local';
  sourceType: 'official' | 'simple-icons' | 'custom-fallback';
  capabilities: {
    chat: boolean;
    streaming: boolean;
    tools: boolean;
    vision: boolean;
    embeddings: boolean;
    imageGeneration: boolean;
  };
}

export const PROVIDER_BRANDS: Record<string, ProviderBrand> = {
  openai: {
    id: 'openai', name: 'OpenAI', logo: '/assets/providers/openai.svg',
    fallback: 'OA', brandColor: '#10A37F', tier: 'premium', status: 'active',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: true, embeddings: true, imageGeneration: true },
  },
  anthropic: {
    id: 'anthropic', name: 'Anthropic', logo: '/assets/providers/anthropic.svg',
    fallback: 'A', brandColor: '#D4A27F', tier: 'premium', status: 'active',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false },
  },
  google: {
    id: 'google', name: 'Google Gemini', logo: '/assets/providers/gemini.svg',
    fallback: 'G', brandColor: '#8AB4F8', tier: 'premium', status: 'active',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: true, embeddings: true, imageGeneration: false },
  },
  xai: {
    id: 'xai', name: 'xAI', logo: '/assets/providers/xai.svg',
    fallback: 'xAI', brandColor: '#FFFFFF', tier: 'premium', status: 'coming-soon',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false },
  },
  mistral: {
    id: 'mistral', name: 'Mistral AI', logo: '/assets/providers/mistral.svg',
    fallback: 'M', brandColor: '#FFAF00', tier: 'efficient', status: 'active',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false },
  },
  groq: {
    id: 'groq', name: 'Groq', logo: '/assets/providers/groq.svg',
    fallback: 'GQ', brandColor: '#F55036', tier: 'free', status: 'active',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false },
  },
  openrouter: {
    id: 'openrouter', name: 'OpenRouter', logo: '/assets/providers/openrouter.svg',
    fallback: 'OR', brandColor: '#FFFFFF', tier: 'efficient', status: 'active',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false },
  },
  deepseek: {
    id: 'deepseek', name: 'DeepSeek', logo: '/assets/providers/deepseek.svg',
    fallback: 'DS', brandColor: '#4D6BFE', tier: 'efficient', status: 'beta',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false },
  },
  together: {
    id: 'together', name: 'Together AI', logo: '/assets/providers/together.svg',
    fallback: 'TG', brandColor: '#FF4F00', tier: 'efficient', status: 'beta',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false },
  },
  cohere: {
    id: 'cohere', name: 'Cohere', logo: '/assets/providers/cohere.svg',
    fallback: 'C', brandColor: '#39594D', tier: 'efficient', status: 'coming-soon',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: true, vision: false, embeddings: true, imageGeneration: false },
  },
  perplexity: {
    id: 'perplexity', name: 'Perplexity', logo: '/assets/providers/perplexity.svg',
    fallback: 'PX', brandColor: '#20B8CD', tier: 'efficient', status: 'coming-soon',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false },
  },
  replicate: {
    id: 'replicate', name: 'Replicate', logo: '/assets/providers/replicate.svg',
    fallback: 'RP', brandColor: '#FFFFFF', tier: 'efficient', status: 'coming-soon',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: false, vision: true, embeddings: false, imageGeneration: true },
  },
  ollama: {
    id: 'ollama', name: 'Ollama', logo: '/assets/providers/ollama.svg',
    fallback: 'OL', brandColor: '#FFFFFF', tier: 'local', status: 'local',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false },
  },
  lmstudio: {
    id: 'lmstudio', name: 'LM Studio', logo: '/assets/providers/lmstudio.svg',
    fallback: 'LM', brandColor: '#FFFFFF', tier: 'local', status: 'local',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false },
  },
  vllm: {
    id: 'vllm', name: 'vLLM', logo: '/assets/providers/vllm.svg',
    fallback: 'vL', brandColor: '#FFFFFF', tier: 'local', status: 'local',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false },
  },
  mimo: {
    id: 'mimo', name: 'Mimo', logo: '/assets/providers/mimo.svg',
    fallback: 'MM', brandColor: '#FF6900', tier: 'free', status: 'active',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false },
  },
  'xiaomi-tokenplan': {
    id: 'xiaomi-tokenplan', name: 'Xiaomi', logo: '/assets/providers/mimo.svg',
    fallback: 'XI', brandColor: '#FF6900', tier: 'efficient', status: 'active',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false },
  },
  antigravity: {
    id: 'antigravity', name: 'Antigravity', logo: '/assets/providers/antigravity.svg',
    fallback: 'AG', brandColor: '#9333EA', tier: 'efficient', status: 'coming-soon',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false },
  },
  cerebras: {
    id: 'cerebras', name: 'Cerebras', logo: '/assets/providers/cerebras.svg',
    fallback: 'CB', brandColor: '#FF6B00', tier: 'efficient', status: 'beta',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false },
  },
  sambanova: {
    id: 'sambanova', name: 'SambaNova', logo: '/assets/providers/sambanova.svg',
    fallback: 'SN', brandColor: '#00A651', tier: 'efficient', status: 'beta',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false },
  },
  fireworks: {
    id: 'fireworks', name: 'Fireworks AI', logo: '/assets/providers/fireworks.svg',
    fallback: 'FW', brandColor: '#FF4500', tier: 'efficient', status: 'beta',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: true, vision: false, embeddings: false, imageGeneration: false },
  },
  azure: {
    id: 'azure', name: 'Azure OpenAI', logo: '/assets/providers/azure.svg',
    fallback: 'AZ', brandColor: '#0078D4', tier: 'premium', status: 'coming-soon',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: true, embeddings: true, imageGeneration: true },
  },
  bedrock: {
    id: 'bedrock', name: 'AWS Bedrock', logo: '/assets/providers/aws-bedrock.svg',
    fallback: 'AWS', brandColor: '#FF9900', tier: 'premium', status: 'coming-soon',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: true, embeddings: false, imageGeneration: false },
  },
  vertex: {
    id: 'vertex', name: 'Vertex AI', logo: '/assets/providers/vertex-ai.svg',
    fallback: 'V', brandColor: '#4285F4', tier: 'premium', status: 'coming-soon',
    sourceType: 'simple-icons',
    capabilities: { chat: true, streaming: true, tools: true, vision: true, embeddings: true, imageGeneration: false },
  },
};

export function getProviderBrand(id: string): ProviderBrand {
  const key = id.toLowerCase();
  return PROVIDER_BRANDS[key] ?? {
    id: key,
    name: id,
    logo: '',
    fallback: id.slice(0, 2).toUpperCase(),
    brandColor: '#94A3B8',
    tier: 'efficient',
    status: 'coming-soon',
    sourceType: 'custom-fallback',
    capabilities: { chat: true, streaming: true, tools: false, vision: false, embeddings: false, imageGeneration: false },
  };
}

export function providerLogoHTML(id: string, size: number = 24): string {
  const brand = getProviderBrand(id);
  return `<img src="${brand.logo}" alt="${brand.name}" width="${size}" height="${size}" style="border-radius:4px;object-fit:contain" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'" /><span style="display:none;width:${size}px;height:${size}px;border-radius:4px;background:${brand.brandColor}20;color:${brand.brandColor};font-size:${Math.round(size * 0.4)}px;font-weight:700;align-items:center;justify-content:center">${brand.fallback}</span>`;
}

// Stats for QA
export function getBrandingStats() {
  const brands = Object.values(PROVIDER_BRANDS);
  return {
    total: brands.length,
    official: brands.filter(b => b.sourceType === 'official').length,
    simpleIcons: brands.filter(b => b.sourceType === 'simple-icons').length,
    customFallback: brands.filter(b => b.sourceType === 'custom-fallback').length,
    active: brands.filter(b => b.status === 'active').length,
    beta: brands.filter(b => b.status === 'beta').length,
    comingSoon: brands.filter(b => b.status === 'coming-soon').length,
    local: brands.filter(b => b.status === 'local').length,
  };
}
