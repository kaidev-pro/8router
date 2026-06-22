// 8Router — Provider Registry & Health Management

import { ProviderKey, ProviderHealth, RouterConfig } from '../types.js';

export class ProviderRegistry {
  private providers: Map<string, ProviderKey> = new Map();
  private health: Map<string, ProviderHealth> = new Map();
  private circuitBreakers: Map<string, { open: boolean; openedAt: number }> = new Map();
  private config: RouterConfig;

  constructor(config: RouterConfig) {
    this.config = config;
    for (const p of config.providers) {
      this.providers.set(p.id, { ...p, totalRequests: 0, totalTokens: 0, errors: 0 });
      this.health.set(p.id, {
        providerId: p.id,
        healthy: true,
        lastCheck: Date.now(),
        consecutiveErrors: 0,
      });
      this.circuitBreakers.set(p.id, { open: false, openedAt: 0 });
    }
  }

  // Get providers sorted by tier, with round-robin within tier
  getProvidersForModel(model: string): ProviderKey[] {
    const tiers = this.config.fallback.tiers;
    const result: ProviderKey[] = [];
    const allProviders = Array.from(this.providers.values());

    for (const tier of tiers) {
      const tierProviders = allProviders
        .filter(p => p.tier === tier && p.enabled && p.models.includes(model))
        .filter(p => !this.isCircuitOpen(p.id));

      // Sort by least recently used for round-robin
      tierProviders.sort((a, b) => (a.lastUsed || 0) - (b.lastUsed || 0));
      result.push(...tierProviders);
    }

    // If no exact model match, try providers that accept any model (wildcard)
    if (result.length === 0) {
      for (const tier of tiers) {
        const tierProviders = allProviders
          .filter(p => p.tier === tier && p.enabled && (p.models.includes('*') || p.models.includes('all')))
          .filter(p => !this.isCircuitOpen(p.id));
        tierProviders.sort((a, b) => (a.lastUsed || 0) - (b.lastUsed || 0));
        result.push(...tierProviders);
      }
    }

    return result;
  }

  // Get all providers (for dashboard)
  getAllProviders(): ProviderKey[] {
    return Array.from(this.providers.values());
  }

  // Record successful request
  recordSuccess(providerId: string, latencyMs: number, tokens?: number): void {
    const p = this.providers.get(providerId);
    if (p) {
      p.lastUsed = Date.now();
      p.totalRequests = (p.totalRequests || 0) + 1;
      p.totalTokens = (p.totalTokens || 0) + (tokens || 0);
    }

    const h = this.health.get(providerId);
    if (h) {
      h.healthy = true;
      h.consecutiveErrors = 0;
      h.lastCheck = Date.now();
      h.avgLatencyMs = h.avgLatencyMs
        ? (h.avgLatencyMs * 0.8 + latencyMs * 0.2)
        : latencyMs;
    }

    this.circuitBreakers.set(providerId, { open: false, openedAt: 0 });
  }

  // Record failed request
  recordFailure(providerId: string, error: string): void {
    const p = this.providers.get(providerId);
    if (p) {
      p.errors = (p.errors || 0) + 1;
    }

    const h = this.health.get(providerId);
    if (h) {
      h.consecutiveErrors += 1;
      h.lastError = error;
      h.lastCheck = Date.now();

      if (h.consecutiveErrors >= this.config.fallback.circuitBreakerThreshold) {
        h.healthy = false;
        this.circuitBreakers.set(providerId, { open: true, openedAt: Date.now() });
        console.warn(`[8Router] Circuit OPEN for ${providerId} after ${h.consecutiveErrors} consecutive errors`);
      }
    }
  }

  // Check if circuit is open
  private isCircuitOpen(providerId: string): boolean {
    const cb = this.circuitBreakers.get(providerId);
    if (!cb || !cb.open) return false;

    // Auto-reset after timeout
    if (Date.now() - cb.openedAt > this.config.fallback.circuitBreakerResetMs) {
      cb.open = false;
      cb.openedAt = 0;
      const h = this.health.get(providerId);
      if (h) h.consecutiveErrors = 0;
      console.info(`[8Router] Circuit CLOSED for ${providerId} (reset timeout)`);
      return false;
    }

    return true;
  }

  // Get health status for all providers
  getHealth(): ProviderHealth[] {
    return Array.from(this.health.values());
  }

  // Add provider at runtime
  addProvider(provider: ProviderKey): void {
    this.providers.set(provider.id, { ...provider, totalRequests: 0, totalTokens: 0, errors: 0 });
    this.health.set(provider.id, {
      providerId: provider.id,
      healthy: true,
      lastCheck: Date.now(),
      consecutiveErrors: 0,
    });
    this.circuitBreakers.set(provider.id, { open: false, openedAt: 0 });
  }

  // Remove provider
  removeProvider(providerId: string): boolean {
    this.health.delete(providerId);
    this.circuitBreakers.delete(providerId);
    return this.providers.delete(providerId);
  }

  // Update provider
  updateProvider(providerId: string, updates: Partial<ProviderKey>): boolean {
    const p = this.providers.get(providerId);
    if (!p) return false;
    Object.assign(p, updates);
    return true;
  }

  // Get available models across all providers
  getAvailableModels(): { id: string; providers: string[] }[] {
    const modelMap = new Map<string, string[]>();
    const allProviders = Array.from(this.providers.values());
    for (const p of allProviders) {
      if (!p.enabled) continue;
      for (const m of p.models) {
        if (!modelMap.has(m)) modelMap.set(m, []);
        modelMap.get(m)!.push(p.id);
      }
    }
    return Array.from(modelMap.entries()).map(([id, providers]) => ({ id, providers }));
  }
}
