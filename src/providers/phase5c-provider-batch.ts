// 8Router — Phase 5C Provider Batch Expansion
// Enhanced descriptors, certification profiles, SSRF-safe discovery

import { buildProviderDescriptors, type ProviderDescriptor, type ProviderProtocol } from './provider-foundation.js';

// ═══════════════════════════════════════════════════════════════
// Endpoint Policy (SSRF-safe allowlist)
// ═══════════════════════════════════════════════════════════════

export interface EndpointPolicy {
  allowedHosts: string[];
  allowedPaths: string[];
  requireHttps: boolean;
  maxRedirects: number;
  timeoutMs: number;
}

const ENDPOINT_POLICIES: Record<string, EndpointPolicy> = {
  openai: { allowedHosts: ['api.openai.com'], allowedPaths: ['/v1/chat/completions', '/v1/models', '/v1/embeddings'], requireHttps: true, maxRedirects: 0, timeoutMs: 30000 },
  anthropic: { allowedHosts: ['api.anthropic.com'], allowedPaths: ['/v1/messages', '/v1/models'], requireHttps: true, maxRedirects: 0, timeoutMs: 30000 },
  google: { allowedHosts: ['generativelanguage.googleapis.com'], allowedPaths: ['/v1beta/models', '/v1beta/chat'], requireHttps: true, maxRedirects: 0, timeoutMs: 30000 },
  xai: { allowedHosts: ['api.x.ai'], allowedPaths: ['/v1/chat/completions', '/v1/models'], requireHttps: true, maxRedirects: 0, timeoutMs: 30000 },
  cerebras: { allowedHosts: ['api.cerebras.ai'], allowedPaths: ['/v1/chat/completions', '/v1/models'], requireHttps: true, maxRedirects: 0, timeoutMs: 30000 },
  groq: { allowedHosts: ['api.groq.com'], allowedPaths: ['/openai/v1/chat/completions', '/openai/v1/models'], requireHttps: true, maxRedirects: 0, timeoutMs: 30000 },
  mistral: { allowedHosts: ['api.mistral.ai'], allowedPaths: ['/v1/chat/completions', '/v1/models'], requireHttps: true, maxRedirects: 0, timeoutMs: 30000 },
  deepseek: { allowedHosts: ['api.deepseek.com'], allowedPaths: ['/v1/chat/completions', '/v1/models'], requireHttps: true, maxRedirects: 0, timeoutMs: 30000 },
  openrouter: { allowedHosts: ['openrouter.ai'], allowedPaths: ['/api/v1/chat/completions', '/api/v1/models'], requireHttps: true, maxRedirects: 0, timeoutMs: 30000 },
  ollama: { allowedHosts: ['localhost', '127.0.0.1'], allowedPaths: ['/api/chat', '/api/tags'], requireHttps: false, maxRedirects: 0, timeoutMs: 60000 },
  lmstudio: { allowedHosts: ['localhost', '127.0.0.1'], allowedPaths: ['/v1/chat/completions', '/v1/models'], requireHttps: false, maxRedirects: 0, timeoutMs: 60000 },
  vllm: { allowedHosts: ['localhost', '127.0.0.1'], allowedPaths: ['/v1/chat/completions', '/v1/models'], requireHttps: false, maxRedirects: 0, timeoutMs: 60000 },
};

export function getEndpointPolicy(providerId: string): EndpointPolicy | undefined {
  return ENDPOINT_POLICIES[providerId];
}

export function validateEndpoint(providerId: string, url: string): { valid: boolean; reason?: string } {
  const policy = ENDPOINT_POLICIES[providerId];
  if (!policy) return { valid: false, reason: 'No endpoint policy for provider' };
  try {
    const parsed = new URL(url);
    if (policy.requireHttps && parsed.protocol !== 'https:') return { valid: false, reason: 'HTTPS required' };
    if (!policy.allowedHosts.includes(parsed.hostname)) return { valid: false, reason: `Host not allowed: ${parsed.hostname}` };
    const pathAllowed = policy.allowedPaths.some(p => parsed.pathname.startsWith(p));
    if (!pathAllowed) return { valid: false, reason: `Path not allowed: ${parsed.pathname}` };
    return { valid: true };
  } catch { return { valid: false, reason: 'Invalid URL' }; }
}

// ═══════════════════════════════════════════════════════════════
// Certification Profiles
// ═══════════════════════════════════════════════════════════════

export type CertificationProfile = 'dry-run' | 'mock' | 'live';

export interface CertificationCheck {
  name: string;
  description: string;
  required: boolean;
}

export const CERTIFICATION_CHECKS: CertificationCheck[] = [
  { name: 'authentication', description: 'Provider accepts valid credentials', required: true },
  { name: 'model_listing', description: 'Provider returns available models', required: true },
  { name: 'simple_completion', description: 'Basic chat completion works', required: true },
  { name: 'streaming', description: 'Streaming responses work', required: false },
  { name: 'cancellation', description: 'Request cancellation works', required: false },
  { name: 'usage_normalization', description: 'Usage tokens normalized correctly', required: false },
  { name: 'error_mapping', description: 'Errors mapped to standard codes', required: true },
  { name: 'rate_limit_handling', description: 'Rate limits handled gracefully', required: false },
  { name: 'vision_support', description: 'Vision/multimodal works if declared', required: false },
  { name: 'tool_calling', description: 'Function/tool calling works if declared', required: false },
  { name: 'json_mode', description: 'JSON mode works if declared', required: false },
];

export interface CertificationProfileDef {
  profile: CertificationProfile;
  description: string;
  checks: string[];
  requiresNetwork: boolean;
  requiresCredential: boolean;
  billable: boolean;
}

export const CERTIFICATION_PROFILES: CertificationProfileDef[] = [
  { profile: 'dry-run', description: 'Validate plan, flags, provider, credential reference', checks: ['authentication'], requiresNetwork: false, requiresCredential: false, billable: false },
  { profile: 'mock', description: 'Deterministic adapter contract tests', checks: ['authentication', 'model_listing', 'simple_completion', 'error_mapping'], requiresNetwork: false, requiresCredential: false, billable: false },
  { profile: 'live', description: 'Operator-triggered, bounded, potentially billable', checks: CERTIFICATION_CHECKS.map(c => c.name), requiresNetwork: true, requiresCredential: true, billable: true },
];

export function getCertificationProfile(profile: CertificationProfile): CertificationProfileDef | undefined {
  return CERTIFICATION_PROFILES.find(p => p.profile === profile);
}

// ═══════════════════════════════════════════════════════════════
// Discovery Feature Flags
// ═══════════════════════════════════════════════════════════════

export function getDiscoveryFlags() {
  return {
    discoveryEnabled: process.env.PROVIDER_MODEL_DISCOVERY_ENABLED === 'true',
    networkEnabled: process.env.PROVIDER_MODEL_DISCOVERY_NETWORK_ENABLED === 'true',
    persistEnabled: process.env.PROVIDER_MODEL_DISCOVERY_PERSIST_ENABLED === 'true',
  };
}

export function canRunDiscovery(providerId: string): { allowed: boolean; reason?: string } {
  const flags = getDiscoveryFlags();
  if (!flags.discoveryEnabled) return { allowed: false, reason: 'Discovery not enabled' };
  if (!flags.networkEnabled) return { allowed: false, reason: 'Network not enabled' };
  const descriptors = buildProviderDescriptors();
  const d = descriptors.find(p => p.id === providerId);
  if (!d) return { allowed: false, reason: 'Provider not found' };
  if (!d.features.dynamicModels) return { allowed: false, reason: 'Provider does not support dynamic models' };
  return { allowed: true };
}

// ═══════════════════════════════════════════════════════════════
// Target Provider Batch
// ═══════════════════════════════════════════════════════════════

export const TARGET_PROVIDER_BATCH = ['openai', 'google', 'xai', 'cerebras'] as const;

export function isTargetProvider(providerId: string): boolean {
  return (TARGET_PROVIDER_BATCH as readonly string[]).includes(providerId);
}
