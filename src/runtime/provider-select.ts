// 8Router — Provider Selection
// Model alias resolution + direct provider routing

import { getAllCredentials, getDecryptedCredential, type SafeCredential } from '../security/credentials/credential-manager.js';
import { shouldSkipProvider } from './health/manager.js';
import { ERRORS, type OpenAIError } from './errors.js';

// ─── Model Alias Definitions ────────────────────────────────────────

const ALIAS_PRIORITY: Record<string, string[]> = {
  '8router/auto':     ['openrouter', 'openai', 'groq', 'deepseek', 'mistral', 'together', 'xai', 'ollama'],
  '8router/cheap':    ['groq', 'deepseek', 'mistral', 'together', 'openrouter', 'ollama'],
  '8router/fast':     ['groq', 'ollama', 'openrouter', 'openai', 'deepseek', 'mistral'],
  '8router/smart':    ['openai', 'openrouter', 'xai', 'deepseek', 'mistral', 'groq'],
  '8router/coding':   ['openrouter', 'deepseek', 'openai', 'groq', 'ollama'],
  '8router/local':    ['ollama'],
  '8router/creative': ['openai', 'openrouter', 'deepseek'],
  '8router/privacy':  ['ollama'],
};

// Default model to send to provider when alias is used
const ALIAS_DEFAULT_MODEL: Record<string, string> = {
  '8router/auto':     'gpt-4o-mini',
  '8router/cheap':    'llama-3.1-8b-instant',
  '8router/fast':     'llama-3.1-8b-instant',
  '8router/smart':    'gpt-4o',
  '8router/coding':   'deepseek-chat',
  '8router/local':    'llama3.1',
  '8router/creative': 'gpt-4o',
  '8router/privacy':  'llama3.1',
};

// ─── Provider Base URLs ─────────────────────────────────────────────

const PROVIDER_BASE_URLS: Record<string, string> = {
  openai:     'https://api.openai.com/v1',
  openrouter: 'https://openrouter.ai/api/v1',
  groq:       'https://api.groq.com/openai/v1',
  mistral:    'https://api.mistral.ai/v1',
  deepseek:   'https://api.deepseek.com/v1',
  together:   'https://api.together.xyz/v1',
  xai:        'https://api.x.ai/v1',
  ollama:     'http://localhost:11434/v1',
};

// ─── Types ──────────────────────────────────────────────────────────

export interface ProviderRoute {
  provider: string;
  baseUrl: string;
  apiKey: string;
  model: string;
  credentialId: string;
}

export type RouteResult =
  | { ok: true; route: ProviderRoute; fallbackPool: ProviderRoute[] }
  | { ok: false; error: OpenAIError; httpStatus: number };

// ─── Resolve Model → Provider ───────────────────────────────────────

export function isAlias(model: string): boolean {
  return model in ALIAS_PRIORITY;
}

export function resolveModelAlias(model: string): string[] {
  return ALIAS_PRIORITY[model] || [];
}

export function getDefaultModel(alias: string): string {
  return ALIAS_DEFAULT_MODEL[alias] || 'gpt-4o-mini';
}

export function getProviderBaseUrl(provider: string): string {
  return PROVIDER_BASE_URLS[provider] || '';
}

export function resolveModelForProvider(model: string, provider: string): string {
  // If model has provider prefix, strip it
  // e.g. "openrouter/anthropic/claude-3.5-sonnet" → "anthropic/claude-3.5-sonnet"
  if (model.startsWith(provider + '/')) {
    return model.slice(provider.length + 1);
  }
  // If model is an alias, use default model for that provider
  if (isAlias(model)) {
    return getDefaultModel(model);
  }
  // Otherwise pass model as-is
  return model;
}

// ─── Main Routing ───────────────────────────────────────────────────

/**
 * Resolve a model name to a provider route with decrypted API key.
 * Returns the primary route + fallback pool.
 * Phase 2D: userId enables health-aware provider selection.
 */
export async function resolveRoute(
  model: string,
  allowedProviders: string[],
  allowedModels: string[],
  userId?: string,
): Promise<RouteResult> {
  // Get all user credentials
  const allCreds = getAllCredentials();
  const enabledCreds = allCreds.filter(c =>
    c.isEnabled &&
    c.status !== 'disabled' &&
    c.status !== 'invalid'
  );

  if (enabledCreds.length === 0) {
    return { ok: false, error: ERRORS.noProviderCredentials(), httpStatus: 400 };
  }

  // Filter by allowed providers from access key policy
  let availableCreds = enabledCreds;
  if (allowedProviders.length > 0) {
    availableCreds = enabledCreds.filter(c => allowedProviders.includes(c.provider));
  }

  if (availableCreds.length === 0) {
    return { ok: false, error: ERRORS.noProviderCredentials(), httpStatus: 400 };
  }

  // Filter by allowed models from access key policy
  if (allowedModels.length > 0 && !isAlias(model)) {
    const isAllowed = allowedModels.some(am => model === am || model.startsWith(am));
    if (!isAllowed) {
      // Check if any alias covers this
      const aliasMatch = allowedModels.some(am => isAlias(am));
      if (!aliasMatch) {
        return { ok: false, error: ERRORS.modelNotAllowed(model), httpStatus: 400 };
      }
    }
  }

  // Determine provider order
  let providerOrder: string[];
  let resolvedModel: string;

  if (isAlias(model)) {
    providerOrder = resolveModelAlias(model);
    resolvedModel = getDefaultModel(model);

    // Special case: 8router/local
    if (model === '8router/local' || model === '8router/privacy') {
      const localCreds = availableCreds.filter(c => c.provider === 'ollama');
      if (localCreds.length === 0) {
        return { ok: false, error: ERRORS.localProviderNotConnected(), httpStatus: 400 };
      }
      const route = buildRoute(localCreds[0], resolvedModel);
      return { ok: true, route, fallbackPool: [] };
    }
  } else if (model.includes('/')) {
    // Direct provider prefix: "groq/llama-3.1-8b-instant" or "openrouter/anthropic/claude-3.5-sonnet"
    const parts = model.split('/');
    const providerHint = parts[0];
    providerOrder = [providerHint];
    resolvedModel = model.slice(providerHint.length + 1);
  } else {
    // Bare model name — try to find which provider has it
    // Default: try all available providers in auto order
    providerOrder = ALIAS_PRIORITY['8router/auto'];
    resolvedModel = model;
  }

  // Build ordered credential list
  const routePool: ProviderRoute[] = [];
  const skippedProviders: string[] = [];
  for (const provider of providerOrder) {
    const cred = availableCreds.find(c => c.provider === provider);
    if (cred) {
      // Phase 2D: health-aware skip
      if (userId) {
        const { skip, reason } = shouldSkipProvider(userId, cred.id);
        if (skip) {
          skippedProviders.push(`${provider}:${reason}`);
          continue;
        }
      }
      routePool.push(buildRoute(cred, resolvedModel));
    }
  }

  if (routePool.length === 0) {
    // Phase 2D: differentiate circuit breaker from no providers
    if (skippedProviders.length > 0) {
      return { ok: false, error: ERRORS.noHealthyProvider(), httpStatus: 503 };
    }
    // Check if the explicit provider exists but is not connected
    if (!isAlias(model) && model.includes('/')) {
      const providerHint = model.split('/')[0];
      return { ok: false, error: ERRORS.providerNotConnected(providerHint), httpStatus: 400 };
    }
    return { ok: false, error: ERRORS.noProviderCredentials(), httpStatus: 400 };
  }

  const [primary, ...fallbacks] = routePool;
  return { ok: true, route: primary, fallbackPool: fallbacks };
}

function buildRoute(cred: SafeCredential, model: string): ProviderRoute {
  return {
    provider: cred.provider,
    baseUrl: cred.baseUrl || getProviderBaseUrl(cred.provider),
    apiKey: '',  // Will be filled by caller with decrypted key
    model,
    credentialId: cred.id,
  };
}
