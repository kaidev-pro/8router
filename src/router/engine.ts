// 8Router — Core Router Engine
// Handles request routing with smart fallback, compression, and stats

import { v4 as uuid } from 'uuid';
import { RouterConfig, ChatCompletionRequest, ChatCompletionResponse, ChatMessage, RouterStats } from '../types.js';
import { ProviderRegistry } from '../providers/registry.js';
import { getAdapter } from '../providers/adapter.js';
import { compress } from '../compressor/rtk.js';

export class RouterEngine {
  private config: RouterConfig;
  private registry: ProviderRegistry;
  private stats: RouterStats;

  constructor(config: RouterConfig) {
    this.config = config;
    this.registry = new ProviderRegistry(config);
    this.stats = {
      totalRequests: 0,
      totalTokens: 0,
      successfulRequests: 0,
      failedRequests: 0,
      fallbackCount: 0,
      compressionSaved: 0,
      providerStats: new Map(),
      uptime: Date.now(),
      startedAt: Date.now(),
    };
  }

  async route(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.stats.totalRequests++;

    // 1. Compress messages
    const { messages: compressedMessages, savedTokens } = compress(req.messages, this.config.compression);
    this.stats.compressionSaved += savedTokens;

    const compressedReq = { ...req, messages: compressedMessages as ChatMessage[] };

    // 2. Get providers for this model
    const providers = this.registry.getProvidersForModel(req.model);

    if (providers.length === 0) {
      this.stats.failedRequests++;
      throw new RouterError(
        `No available provider for model "${req.model}". Check your config and provider health.`,
        'no_provider'
      );
    }

    // 3. Try providers with fallback
    let lastError: Error | null = null;
    let attemptedFallback = false;

    for (const provider of providers) {
      try {
        const adapter = getAdapter(provider);
        const startTime = Date.now();

        const response = await this.callProvider(adapter, provider, compressedReq);

        const latencyMs = Date.now() - startTime;
        const tokens = response.usage?.total_tokens;
        this.registry.recordSuccess(provider.id, latencyMs, tokens);

        this.stats.successfulRequests++;
        this.stats.totalTokens += tokens || 0;
        this.updateProviderStats(provider.id, tokens || 0, latencyMs, false);

        if (attemptedFallback) {
          this.stats.fallbackCount++;
        }

        // Add 8Router metadata
        return {
          ...response,
          _8router: {
            provider: provider.id,
            tier: provider.tier,
            compressionSaved: savedTokens,
            latencyMs,
          },
        } as any;

      } catch (err: any) {
        lastError = err;
        this.registry.recordFailure(provider.id, err.message);
        this.updateProviderStats(provider.id, 0, 0, true);

        console.warn(`[8Router] Provider ${provider.id} failed: ${err.message}. Trying next...`);
        attemptedFallback = true;

        if (this.config.fallback.retryDelayMs > 0) {
          await sleep(this.config.fallback.retryDelayMs);
        }
      }
    }

    this.stats.failedRequests++;
    throw new RouterError(
      `All ${providers.length} provider(s) failed for model "${req.model}". Last error: ${lastError?.message}`,
      'all_providers_failed'
    );
  }

  // Route with streaming
  async *routeStream(req: ChatCompletionRequest): AsyncGenerator<string> {
    this.stats.totalRequests++;

    const { messages: compressedMessages, savedTokens } = compress(req.messages, this.config.compression);
    this.stats.compressionSaved += savedTokens;

    const compressedReq = { ...req, messages: compressedMessages as ChatMessage[], stream: true };
    const providers = this.registry.getProvidersForModel(req.model);

    if (providers.length === 0) {
      throw new RouterError(`No available provider for model "${req.model}"`, 'no_provider');
    }

    for (const provider of providers) {
      try {
        const adapter = getAdapter(provider);
        const startTime = Date.now();

        yield* this.streamProvider(adapter, provider, compressedReq);

        const latencyMs = Date.now() - startTime;
        this.registry.recordSuccess(provider.id, latencyMs);
        this.stats.successfulRequests++;
        return;

      } catch (err: any) {
        this.registry.recordFailure(provider.id, err.message);
        console.warn(`[8Router] Stream provider ${provider.id} failed: ${err.message}`);
      }
    }

    this.stats.failedRequests++;
    throw new RouterError('All providers failed for streaming', 'all_providers_failed');
  }

  private async callProvider(
    adapter: ReturnType<typeof getAdapter>,
    provider: any,
    req: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    const endpoint = adapter.getEndpoint(provider, false);
    const headers = adapter.buildHeaders(provider);
    const body = adapter.buildRequest(req, provider);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000), // 2 min timeout
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown error');
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const raw = await response.json();
    return adapter.parseResponse(raw, provider);
  }

  private async *streamProvider(
    adapter: ReturnType<typeof getAdapter>,
    provider: any,
    req: ChatCompletionRequest
  ): AsyncGenerator<string> {
    const endpoint = adapter.getEndpoint(provider, true);
    const headers = adapter.buildHeaders(provider);
    const body = adapter.buildRequest(req, provider);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown error');
      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          const trimmed = line.trim();
          if (trimmed.startsWith('data: ')) {
            const data = trimmed.slice(6);
            if (data === '[DONE]') {
              yield 'data: [DONE]\n\n';
              return;
            }
            yield `data: ${data}\n\n`;
          }
        }
      }
    } finally {
      reader.releaseLock();
    }
  }

  private updateProviderStats(providerId: string, tokens: number, latency: number, isErr: boolean): void {
    const existing = this.stats.providerStats.get(providerId) || {
      requests: 0, tokens: 0, errors: 0, avgLatency: 0,
    };
    existing.requests++;
    existing.tokens += tokens;
    if (isErr) existing.errors++;
    existing.avgLatency = existing.avgLatency
      ? (existing.avgLatency * 0.8 + latency * 0.2)
      : latency;
    this.stats.providerStats.set(providerId, existing);
  }

  // Public getters
  getRegistry(): ProviderRegistry { return this.registry; }
  getStats(): RouterStats { return { ...this.stats, uptime: Date.now() - this.stats.startedAt }; }
  getConfig(): RouterConfig { return this.config; }
}

export class RouterError extends Error {
  code: string;
  constructor(message: string, code: string) {
    super(message);
    this.name = 'RouterError';
    this.code = code;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}
