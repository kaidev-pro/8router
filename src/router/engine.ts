// 8Router — Core Router Engine v2
// Combo support, multi-key rotation, SQLite persistence, caveman mode

import { v4 as uuid } from 'uuid';
import { RouterConfig, ChatCompletionRequest, ChatCompletionResponse, ChatMessage, RouterStats, ProviderKey } from '../types.js';
import { ProviderRegistry } from '../providers/registry.js';
import { getAdapter } from '../providers/adapter.js';
import { compress } from '../compressor/rtk.js';
import { isCombo, resolveCombo, ensureDefaultCombos } from './combos.js';
import { logRequest, getRequestStats, getDB, estimateCost, getPrivacyMode, LOCAL_PROVIDER_IDS, getCostOptimizerEnabled, logCostSavings, seedDefaultPresets } from '../database.js';
import {
  initKeyPool, getNextKey, getRetryKey, recordKeySuccess, recordKeyFailure,
  isRetryableError, hasPool, getAllPoolStatuses,
} from '../providers/key-pool.js';

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

    // Initialize key pools for providers with apiKeys arrays
    this.initKeyPools();
  }

  private initKeyPools(): void {
    for (const p of this.config.providers) {
      if (p.apiKeys && p.apiKeys.length > 0 && p.rotation === 'round-robin') {
        initKeyPool(p.id, p.apiKeys, 'round-robin');
      }
    }
  }

  private initDB(): void {
    if (this.dbInitialized) return;
    try {
      getDB();
      ensureDefaultCombos();
      // Seed default presets on first run
      try {
        seedDefaultPresets();
      } catch { /* non-critical */ }
      this.dbInitialized = true;
      console.log('[8Router] Database initialized');
    } catch (e) {
      console.warn('[8Router] Database init failed, running without persistence:', e);
    }
  }

  async route(req: ChatCompletionRequest): Promise<ChatCompletionResponse> {
    this.stats.totalRequests++;

    // 0. Smart cost optimization (may remap model)
    const costOpt = this.optimizeCost(req);
    if (costOpt) {
      console.log(`[8Router] Cost optimizer: ${req.model} → ${costOpt.model} (${costOpt.category})`);
      req = { ...req, model: costOpt.model };
    }

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
    const fallbackPath: string[] = [];
    const startTime = Date.now();
    const maxRetries = this.config.fallback?.maxRetries || 3;

    for (const route of modelRoutes) {
      const provider = this.registry.getProvider(route.provider);
      if (!provider) continue;
      
      // Try key-level retry within same provider
      for (let keyAttempt = 0; keyAttempt < maxRetries; keyAttempt++) {
        try {
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

          // Log to database with fallback path
          const cost = estimateCost(provider.id, route.model, inputTokens, outputTokens);
          logRequest({
            provider: provider.id,
            model: route.model,
            comboName: isCombo(req.model) ? req.model : undefined,
            inputTokens,
            outputTokens,
            cachedTokens,
            compressedTokens: savedTokens,
            cost,
            latencyMs,
            isSuccess: true,
            isStream: false,
            fallbackPath: fallbackPath.length > 0 ? fallbackPath : undefined,
          });

          return {
            ...response,
            _8router: {
              provider: provider.id,
              tier: provider.tier,
              compressionSaved: savedTokens,
              latencyMs,
              combo: isCombo(req.model) ? req.model : undefined,
              fallbackPath: fallbackPath.length > 0 ? fallbackPath : undefined,
            },
          } as any;

        } catch (err: any) {
          lastError = err;
          this.registry.recordFailure(route.provider, err.message);
          this.updateProviderStats(route.provider, 0, 0, true);

          const keyLabel = `${route.provider}:key${keyAttempt}`;
          fallbackPath.push(keyLabel);
          console.warn(`[8Router] ${keyLabel} failed: ${err.message}`);
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
            fallbackPath: [...fallbackPath],
          });

          // Check if error is retryable within same provider
          if (!isRetryableError(err.statusCode || 0)) {
            break; // Non-retryable, move to next provider
          }

          if (this.config.fallback?.retryDelayMs > 0) {
            await sleep(this.config.fallback.retryDelayMs);
          }
        }
      }
    }

    this.stats.failedRequests++;
    throw new RouterError(
      `All ${modelRoutes.length} provider(s) failed for model "${req.model}". Last error: ${lastError?.message}`,
      'all_providers_failed'
    );
  }

  // Route with streaming
  async *routeStream(req: ChatCompletionRequest): AsyncGenerator<string> {
    this.stats.totalRequests++;

    const { messages: compressedMessages, savedTokens } = compress(req.messages, this.config.compression);
    this.stats.compressionSaved += savedTokens;

    const compressedReq = { ...req, messages: compressedMessages as ChatMessage[], stream: true };
    const modelRoutes = this.resolveModelRoutes(req.model);

    if (modelRoutes.length === 0) {
      throw new RouterError(`No available provider for model "${req.model}"`, 'no_provider');
    }

    for (const route of modelRoutes) {
      try {
        const provider = this.registry.getProvider(route.provider);
        if (!provider) continue;
        
        const adapter = getAdapter(provider);
        const startTime = Date.now();

        yield* this.streamProvider(adapter, provider, compressedReq);

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
        this.registry.recordFailure(route.provider, err.message);
        console.warn(`[8Router] Stream provider ${route.provider} failed: ${err.message}`);
        
        logRequest({
          provider: route.provider,
          model: route.model,
          inputTokens: 0,
          outputTokens: 0,
          isSuccess: false,
          errorMessage: err.message,
          isStream: true,
        });
      }
    }

    this.stats.failedRequests++;
    throw new RouterError('All providers failed for streaming', 'all_providers_failed');
  }

  // ═══════════════════════════════════════════════
  // MODEL ROUTING
  // ═══════════════════════════════════════════════

  private resolveModelRoutes(model: string): { provider: string; model: string }[] {
    // Check if it's a combo
    if (isCombo(model)) {
      const routes = resolveCombo(model);
      return this.applyPrivacyFilter(routes);
    }
    
    // Regular model - get providers from registry
    const providers = this.registry.getProvidersForModel(model);
    const routes = providers.map(p => ({ provider: p.id, model }));
    return this.applyPrivacyFilter(routes);
  }

  // ═══════════════════════════════════════════════
  // PRIVACY MODE FILTERING
  // ═══════════════════════════════════════════════

  private applyPrivacyFilter(routes: { provider: string; model: string }[]): { provider: string; model: string }[] {
    try {
      if (!getPrivacyMode()) return routes;
      const filtered = routes.filter(r => LOCAL_PROVIDER_IDS.includes(r.provider));
      if (filtered.length === 0) {
        console.warn('[8Router] Privacy mode: no local providers available for this request');
      }
      return filtered;
    } catch {
      return routes;
    }
  }

  // ═══════════════════════════════════════════════
  // SMART COST OPTIMIZER
  // ═══════════════════════════════════════════════

  private optimizeCost(req: ChatCompletionRequest): { model: string; category: string } | null {
    try {
      if (!getCostOptimizerEnabled()) return null;
      // If model is already a combo or explicit, don't override
      if (isCombo(req.model)) return null;

      const analysis = this.analyzePrompt(req);
      if (analysis.category !== 'simple' && analysis.category !== 'coding' && analysis.category !== 'complex' && analysis.category !== 'sensitive') {
        return null;
      }

      // Only optimize if user specified a generic/default-like model
      const genericModels = ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'claude-sonnet-4-20250514'];
      if (!genericModels.includes(req.model)) return null;

      const categoryModels: Record<string, string> = {
        simple: 'deepseek-chat',      // short/simple → cheap
        coding: 'deepseek-coder',      // coding tasks → coding model
        complex: 'claude-sonnet-4-20250514',  // complex reasoning → smart model
        sensitive: 'ollama',            // sensitive → local
      };

      const optimizedModel = categoryModels[analysis.category];
      if (optimizedModel && optimizedModel !== req.model) {
        // Log estimated savings
        const estimatedOriginalCost = estimateCost('openai', req.model, analysis.inputTokens, analysis.inputTokens * 2);
        const optimizedProvider = analysis.category === 'sensitive' ? 'ollama' : 
          analysis.category === 'simple' ? 'deepseek' : 
          analysis.category === 'coding' ? 'deepseek' : 'anthropic';
        const estimatedOptimizedCost = estimateCost(optimizedProvider, optimizedModel, analysis.inputTokens, analysis.inputTokens * 2);

        logCostSavings({
          originalModel: req.model,
          optimizedModel,
          estimatedOriginalCost,
          estimatedOptimizedCost,
          promptCategory: analysis.category,
        });

        return { model: optimizedModel, category: analysis.category };
      }
    } catch {
      // Non-critical
    }
    return null;
  }

  private analyzePrompt(req: ChatCompletionRequest): { category: string; inputTokens: number } {
    const allText = req.messages
      .filter(m => typeof m.content === 'string')
      .map(m => m.content as string)
      .join(' ');

    const charCount = allText.length;
    const inputTokens = Math.ceil(charCount / 4);

    // Simple/short
    if (charCount < 200) {
      return { category: 'simple', inputTokens };
    }

    // Coding detection
    const codingKeywords = /\b(function|class|import|export|const|let|var|def |async|await|return|console\.|print\(|error|bug|fix|debug|code|implement|refactor|typescript|python|javascript|rust|golang)\b/i;
    const codeBlocks = /```[\s\S]*?```/;
    if (codingKeywords.test(allText) || codeBlocks.test(allText)) {
      return { category: 'coding', inputTokens };
    }

    // Sensitive detection (PII, secrets)
    const sensitivePatterns = /\b(ssn|social security|credit card|password|secret|confidential|private key|api.?key)\b/i;
    if (sensitivePatterns.test(allText)) {
      return { category: 'sensitive', inputTokens };
    }

    // Complex reasoning
    if (charCount > 1000) {
      return { category: 'complex', inputTokens };
    }

    return { category: 'general', inputTokens };
  }

  // ═══════════════════════════════════════════════
  // PROVIDER CALLS
  // ═══════════════════════════════════════════════

  private async callProvider(
    adapter: ReturnType<typeof getAdapter>,
    provider: ProviderKey,
    req: ChatCompletionRequest
  ): Promise<ChatCompletionResponse> {
    // If this provider has a key pool, swap in the next key
    let activeProvider = provider;
    if (hasPool(provider.id)) {
      const poolKey = getNextKey(provider.id);
      if (poolKey) {
        activeProvider = { ...provider, apiKey: poolKey.apiKey };
      }
    }

    const endpoint = adapter.getEndpoint(activeProvider, false);
    const headers = adapter.buildHeaders(activeProvider);
    const body = adapter.buildRequest(req, activeProvider);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown error');
      const statusCode = response.status;

      // If retryable error (401/429) and provider has a key pool, try next key
      if (isRetryableError(statusCode) && hasPool(provider.id)) {
        recordKeyFailure(provider.id, activeProvider.apiKey, statusCode, errText.slice(0, 200));

        // Try next key in the pool
        const retryKey = getRetryKey(provider.id, activeProvider.apiKey);
        if (retryKey && retryKey.apiKey !== activeProvider.apiKey) {
          const retryProvider = { ...provider, apiKey: retryKey.apiKey };
          const retryEndpoint = adapter.getEndpoint(retryProvider, false);
          const retryHeaders = adapter.buildHeaders(retryProvider);

          console.log(`[8Router] Retrying ${provider.id} with next key (pool rotation) after ${statusCode}`);

          const retryResponse = await fetch(retryEndpoint, {
            method: 'POST',
            headers: retryHeaders,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(120000),
          });

          if (!retryResponse.ok) {
            const retryErrText = await retryResponse.text().catch(() => 'unknown error');
            recordKeyFailure(provider.id, retryKey.apiKey, retryResponse.status, retryErrText.slice(0, 200));
            throw new Error(`HTTP ${retryResponse.status}: ${retryErrText.slice(0, 200)}`);
          }

          const retryRaw = await retryResponse.json();
          recordKeySuccess(provider.id, retryKey.apiKey);
          return adapter.parseResponse(retryRaw, retryProvider);
        }
      }

      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    const raw = await response.json();
    recordKeySuccess(provider.id, activeProvider.apiKey);
    return adapter.parseResponse(raw, provider);
  }

  private async *streamProvider(
    adapter: ReturnType<typeof getAdapter>,
    provider: ProviderKey,
    req: ChatCompletionRequest
  ): AsyncGenerator<string> {
    // If this provider has a key pool, swap in the next key
    let activeProvider = provider;
    if (hasPool(provider.id)) {
      const poolKey = getNextKey(provider.id);
      if (poolKey) {
        activeProvider = { ...provider, apiKey: poolKey.apiKey };
      }
    }

    const endpoint = adapter.getEndpoint(activeProvider, true);
    const headers = adapter.buildHeaders(activeProvider);
    const body = adapter.buildRequest(req, activeProvider);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(120000),
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => 'unknown error');
      const statusCode = response.status;

      // If retryable error and provider has a key pool, try next key
      if (isRetryableError(statusCode) && hasPool(provider.id)) {
        recordKeyFailure(provider.id, activeProvider.apiKey, statusCode, errText.slice(0, 200));

        const retryKey = getRetryKey(provider.id, activeProvider.apiKey);
        if (retryKey && retryKey.apiKey !== activeProvider.apiKey) {
          const retryProvider = { ...provider, apiKey: retryKey.apiKey };
          const retryEndpoint = adapter.getEndpoint(retryProvider, true);
          const retryHeaders = adapter.buildHeaders(retryProvider);

          console.log(`[8Router] Stream retry ${provider.id} with next key after ${statusCode}`);

          const retryResponse = await fetch(retryEndpoint, {
            method: 'POST',
            headers: retryHeaders,
            body: JSON.stringify(body),
            signal: AbortSignal.timeout(120000),
          });

          if (!retryResponse.ok) {
            const retryErrText = await retryResponse.text().catch(() => 'unknown error');
            recordKeyFailure(provider.id, retryKey.apiKey, retryResponse.status, retryErrText.slice(0, 200));
            throw new Error(`HTTP ${retryResponse.status}: ${retryErrText.slice(0, 200)}`);
          }

          if (!retryResponse.body) {
            throw new Error('No response body for streaming');
          }

          recordKeySuccess(provider.id, retryKey.apiKey);

          // Yield the retry response stream
          const reader = retryResponse.body.getReader();
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
          return;
        }
      }

      throw new Error(`HTTP ${response.status}: ${errText.slice(0, 200)}`);
    }

    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    recordKeySuccess(provider.id, activeProvider.apiKey);
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
  
  getFullStats() {
    const dbStats = this.dbInitialized ? getRequestStats() : null;
    return {
      ...this.getStats(),
      database: dbStats,
    };
  }

  getKeyPoolStatus() {
    return getAllPoolStatuses();
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
