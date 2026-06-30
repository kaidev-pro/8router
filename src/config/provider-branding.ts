export interface ProviderBrand {
  id: string;
  name: string;
  logo: string;
  fallback: string;
  brandColor: string;
  tier: 'premium' | 'efficient' | 'free' | 'local';
  status: 'active' | 'beta' | 'coming-soon' | 'local';
}

export const PROVIDER_BRANDS: Record<string, ProviderBrand> = {
  openai: { id: 'openai', name: 'OpenAI', logo: '/assets/providers/openai.svg', fallback: 'OA', brandColor: '#10A37F', tier: 'premium', status: 'active' },
  anthropic: { id: 'anthropic', name: 'Anthropic', logo: '/assets/providers/anthropic.svg', fallback: 'A', brandColor: '#D4A27F', tier: 'premium', status: 'active' },
  google: { id: 'google', name: 'Google Gemini', logo: '/assets/providers/gemini.svg', fallback: 'G', brandColor: '#8AB4F8', tier: 'premium', status: 'active' },
  xai: { id: 'xai', name: 'xAI', logo: '/assets/providers/xai.svg', fallback: 'xAI', brandColor: '#FFFFFF', tier: 'premium', status: 'coming-soon' },
  mistral: { id: 'mistral', name: 'Mistral AI', logo: '/assets/providers/mistral.svg', fallback: 'M', brandColor: '#FFAF00', tier: 'efficient', status: 'active' },
  groq: { id: 'groq', name: 'Groq', logo: '/assets/providers/groq.svg', fallback: 'GQ', brandColor: '#F55036', tier: 'free', status: 'active' },
  openrouter: { id: 'openrouter', name: 'OpenRouter', logo: '/assets/providers/openrouter.svg', fallback: 'OR', brandColor: '#FFFFFF', tier: 'efficient', status: 'active' },
  deepseek: { id: 'deepseek', name: 'DeepSeek', logo: '/assets/providers/deepseek.svg', fallback: 'DS', brandColor: '#4D6BFE', tier: 'efficient', status: 'beta' },
  together: { id: 'together', name: 'Together AI', logo: '/assets/providers/together.svg', fallback: 'TG', brandColor: '#FF4F00', tier: 'efficient', status: 'beta' },
  cohere: { id: 'cohere', name: 'Cohere', logo: '/assets/providers/cohere.svg', fallback: 'C', brandColor: '#39594D', tier: 'efficient', status: 'coming-soon' },
  perplexity: { id: 'perplexity', name: 'Perplexity', logo: '/assets/providers/perplexity.svg', fallback: 'PX', brandColor: '#20B8CD', tier: 'efficient', status: 'coming-soon' },
  replicate: { id: 'replicate', name: 'Replicate', logo: '/assets/providers/replicate.svg', fallback: 'RP', brandColor: '#FFFFFF', tier: 'efficient', status: 'coming-soon' },
  ollama: { id: 'ollama', name: 'Ollama', logo: '/assets/providers/ollama.svg', fallback: 'OL', brandColor: '#FFFFFF', tier: 'local', status: 'local' },
  lmstudio: { id: 'lmstudio', name: 'LM Studio', logo: '/assets/providers/lmstudio.svg', fallback: 'LM', brandColor: '#FFFFFF', tier: 'local', status: 'local' },
  vllm: { id: 'vllm', name: 'vLLM', logo: '/assets/providers/vllm.svg', fallback: 'vL', brandColor: '#FFFFFF', tier: 'local', status: 'local' },
  mimo: { id: 'mimo', name: 'Mimo', logo: '/assets/providers/mimo.svg', fallback: 'MM', brandColor: '#FF6B35', tier: 'free', status: 'active' },
  'xiaomi-tokenplan': { id: 'xiaomi-tokenplan', name: 'Xiaomi', logo: '/assets/providers/mimo.svg', fallback: 'XI', brandColor: '#FF6B35', tier: 'efficient', status: 'active' },
  antigravity: { id: 'antigravity', name: 'Antigravity', logo: '/assets/providers/antigravity.svg', fallback: 'AG', brandColor: '#9333EA', tier: 'efficient', status: 'coming-soon' },
  cerebras: { id: 'cerebras', name: 'Cerebras', logo: '/assets/providers/cerebras.svg', fallback: 'CB', brandColor: '#FF6B00', tier: 'efficient', status: 'beta' },
  sambanova: { id: 'sambanova', name: 'SambaNova', logo: '/assets/providers/sambanova.svg', fallback: 'SN', brandColor: '#00B4D8', tier: 'efficient', status: 'beta' },
  fireworks: { id: 'fireworks', name: 'Fireworks AI', logo: '/assets/providers/fireworks.svg', fallback: 'FW', brandColor: '#FF4500', tier: 'efficient', status: 'beta' },
  azure: { id: 'azure', name: 'Azure OpenAI', logo: '/assets/providers/azure.svg', fallback: 'AZ', brandColor: '#0078D4', tier: 'premium', status: 'coming-soon' },
  bedrock: { id: 'bedrock', name: 'AWS Bedrock', logo: '/assets/providers/awsbedrock.svg', fallback: 'AWS', brandColor: '#FF9900', tier: 'premium', status: 'coming-soon' },
  vertex: { id: 'vertex', name: 'Vertex AI', logo: '/assets/providers/vertex-ai.svg', fallback: 'V', brandColor: '#4285F4', tier: 'premium', status: 'coming-soon' },
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
  };
}

export function providerLogoHTML(id: string, size: number = 24): string {
  const brand = getProviderBrand(id);
  return `<img src="${brand.logo}" alt="${brand.name}" width="${size}" height="${size}" style="border-radius:4px" onerror="this.style.display='none';this.nextElementSibling.style.display='inline-flex'" /><span style="display:none;width:${size}px;height:${size}px;border-radius:4px;background:${brand.brandColor}20;color:${brand.brandColor};font-size:${Math.round(size*0.4)}px;font-weight:700;align-items:center;justify-content:center">${brand.fallback}</span>`;
}
