// 8Router — Core Router Engine v2
// Combo support, multi-key rotation, SQLite persistence, caveman mode

import { v4 as uuid } from 'uuid';
import { RouterConfig, ChatCompletionRequest, ChatCompletionResponse, ChatMessage, RouterStats } from '../types.js';
import { ProviderRegistry } from '../providers/registry.js';
import { getAdapter } from '../providers/adapter.js';
import { compress } from '../compressor/rtk.js';
import { isCombo, resolveCombo, ensureDefaultCombos } from './combos.js';
import { logRequest, getRequestStats, getDB } from '../database.js';

export class RouterEngine {
  private config: RouterConfig;
  private registry: ProviderRegistry;
  private stats: RouterStats;
  private dbInitialized = false;

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
    
    // Initialize database
    this.initDB();
  }

  private initDB(): void {
    if (this.dbInitialized) return;
    try {
      getDB();
      ensureDefaultCombos();
      this.dbInitialized = true;
      console.log('[8Router] Database initialized');
    } catch (e) {
      console.warn('[8Router] Database init failed, running without persistence:', e);
    }
  }

  async route(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.stats.totalRequests++;

    // 1. Compress messages (RTK)
    const { messages: compressedMessages, savedTokens } = compress(req.messages, this.config.compression);
    this.stats.compressionSaved += savedTokens;

    // 2. Caveman mode (output compression)
    let cavemanSaved = 0;
    const cavemanLevel = parseInt(process.env.CAVEMAN_LEVEL || '0');
    if (cavemanLevel > 0) {
      const { applyCaveman } = await import('../compressor/caveman.js');
      req = applyCaveman(req, cavemanLevel);
    }

    const compressedReq = { ...req, messages: compressedMessages as ChatMessage[] };

    // 3. Check if model is a combo
    const modelRoutes = this.resolveModelRoutes(req.model);
    
    if (modelRoutes.length === 0) {
      this.stats.failedRequests++;
      throw new RouterError(
        `No available provider for model "${req.model}". Check your config and provider health.`,
        'no_provider'
      );
    }

    // 4. Try providers with fallback
    let lastError: Error | null = null;
    let attemptedFallback = false;
    const startTime = Date.now();

    for (const route of modelRoutes) {
      try {
        const provider = this.registry.getProvider(route.provider);
        if (!provider) continue;
        
        const adapter = getAdapter(provider);
        const response = await this.callProvider(adapter, provider, compressedReq);

        const latencyMs = Date.now() - startTime;
        const inputTokens = response.usage?.prompt_tokens || 0;
        const outputTokens = response.usage?.completion_tokens || 0;
        const cachedTokens = (response.usage as any)?.prompt_tokens_details?.cached_tokens || 0;
        
        this.registry.recordSuccess(provider.id, latencyMs, response.usage?.total_tokens);

        this.stats.successfulRequests++;
        this.stats.totalTokens += response.usage?.total_tokens || 0;
        this.updateProviderStats(provider.id, response.usage?.total_tokens || 0, latencyMs, false);

        if (attemptedFallback) {
          this.stats.fallbackCount++;
        }

        // Log to database
        logRequest({
          provider: provider.id,
          model: route.model,
          comboName: isCombo(req.model) ? req.model : undefined,
          inputTokens,
          outputTokens,
          cachedTokens,
          compressedTokens: savedTokens,
          latencyMs,
          isSuccess: true,
          isStream: false,
        });

        return {
          ...response,
          _8router: {
            provider: provider.id,
            tier: provider.tier,
            compressionSaved: savedTokens,
            latencyMs,
            combo: isCombo(req.model) ? req.model : undefined,
          },
        } as any;

      } catch (err: any) {
        lastError = err;
        this.registry.recordFailure(route.provider, err.message);
        this.updateProviderStats(route.provider, 0, 0, true);

        console.warn(`[8Router] Provider ${route.provider} failed: ${err.message}. Trying next...`);
        attemptedFallback = true;

        // Log failure
        logRequest({
          provider: route.provider,
          model: route.model,
          comboName: isCombo(req.model) ? req.model : undefined,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs: Date.now() - startTime,
          isSuccess: false,
          errorMessage: err.message,
        });

        if (this.config.fallback.retryDelayMs > 0) {
          await sleep(this.config.fallback.retryDelayMs);
        }
      }
    }

    this.stats.failedRequests++;
    throw new RouterError(
      `All ${modelRoutes.length} provider(s) failed for model "${req.model}". Last error: ${lastError?.message}`,
      'all_providers_failed'
    );
  }

  // Route with streaming — improved error handling with abort support
  async *routeStream(req: ChatCompletionRequest, abortSignal?: AbortSignal): AsyncGenerator<string> {
    this.stats.totalRequests++;

    const { messages: compressedMessages, savedTokens } = compress(req.messages, this.config.compression);
    this.stats.compressionSaved += savedTokens;

    const compressedReq = { ...req, messages: compressedMessages as ChatMessage[], stream: true };
    const modelRoutes = this.resolveModelRoutes(req.model);

    if (modelRoutes.length === 0) {
      throw new RouterError(`No available provider for model "${req.model}"`, 'no_provider');
    }

    for (const route of modelRoutes) {
      // Check for abort before trying each provider
      if (abortSignal?.aborted) {
        yield this.formatStreamError('Request was aborted', 'aborted');
        this.stats.failedRequests++;
        return;
      }

      try {
        const provider = this.registry.getProvider(route.provider);
        if (!provider) continue;
        
        const adapter = getAdapter(provider);
        const startTime = Date.now();

        // Create an AbortController with timeout for each provider attempt
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 120000); // 2 min timeout

        // Link with parent abort signal if provided
        if (abortSignal) {
          abortSignal.addEventListener('abort', () => controller.abort(), { once: true });
        }

        try {
          yield* this.streamProvider(adapter, provider, compressedReq, controller.signal);
        } finally {
          clearTimeout(timeout);
        }

        const latencyMs = Date.now() - startTime;
        this.registry.recordSuccess(provider.id, latencyMs);
        this.stats.successfulRequests++;

        logRequest({
          provider: provider.id,
          model: route.model,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs,
          isSuccess: true,
          isStream: true,
        });

        return;

      } catch (err: any) {
        // If aborted, stop trying
        if (err.name === 'AbortError' || err.message?.includes('abort')) {
          yield this.formatStreamError('Stream request timed out or was aborted', 'timeout');
          this.stats.failedRequests++;
          return;
        }

        this.registry.recordFailure(route.provider, err.message);
        console.warn(`[8Router] Stream provider ${route.provider} failed: ${err.message}`);

        // Yield an error event so the client knows about the fallback attempt
        yield this.formatStreamError(
          `Provider ${route.provider} failed: ${err.message}. Trying next provider...`,
          'provider_error'
        );
        
        logRequest({
          provider: route.provider,
          model: route.model,
          inputTokens: 0,
          outputTokens: 0,
          isSuccess: false,
          errorMessage: err.message,
          isStream: true,
        });

        // Small delay before fallback
        if (this.config.fallback.retryDelayMs > 0) {
          await sleep(this.config.fallback.retryDelayMs);
        }
      }
    }

    this.stats.failedRequests++;
    throw new RouterError('All providers failed for streaming', 'all_providers_failed');
  }

  // Format a stream error event as SSE
  private formatStreamError(message: string, code: string): string {
    return `data: ${JSON.stringify({
      error: { message, type: 'stream_error', code },
    })}\n\n`;
  }

  // ═══════════════════════════════════════════════
  // MODEL ROUTING
  // ═══════════════════════════════════════════════

  private resolveModelRoutes(model: string): { provider: string; model: string }[] {
    // Check if it's a combo
    if (isCombo(model)) {
      return resolveCombo(model);
    }
    
    // Regular model - get providers from registry
    const providers = this.registry.getProvidersForModel(model);
    return providers.map(p => ({ provider: p.id, model }));
  }

  // ═══════════════════════════════════════════════
  // PROVIDER CALLS
  // ═══════════════════════════════════════════════

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
      signal: AbortSignal.timeout(120000),
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
    req: ChatCompletionRequest,
    signal?: AbortSignal
  ): AsyncGenerator<string> {
    const endpoint = adapter.getEndpoint(provider, true);
    const headers = adapter.buildHeaders(provider);
    const body = adapter.buildRequest(req, provider);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: signal || AbortSignal.timeout(120000),
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
        // Support abort signal mid-stream
        if (signal?.aborted) {
          yield this.formatStreamError('Stream aborted by caller', 'aborted');
          return;
        }

        const readResult = await reader.read();
        const { done, value } = readResult;
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

      // Send [DONE] if we haven't already
      yield 'data: [DONE]\n\n';
    } catch (err: any) {
      // Handle stream read errors gracefully
      if (err.name === 'AbortError' || err.message?.includes('abort')) {
        yield this.formatStreamError('Stream aborted', 'aborted');
        return;
      }
      throw err;
    } finally {
      try {
        reader.releaseLock();
      } catch {
        // Reader may already be released or in error state
      }
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
  
  getFullStats() {
    const dbStats = this.dbInitialized ? getRequestStats() : null;
    return {
      ...this.getStats(),
      database: dbStats,
    };
  }
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