// 8Router — OpenAI-Compatible API Server v2
// Full API with combos, analytics, connections, caveman mode, logs, settings, api-keys

import path from 'path';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { VERSION } from '../version.js';
import { RouterEngine, RouterError } from '../router/engine.js';
import { ChatCompletionRequest, RequestFormat, FormatDetectionResult, AnthropicMessagesRequest } from '../types.js';
import {
  normalizeRequest,
  formatResponse,
  detectFormat as detectBodyFormat,
} from '../providers/format-bridge.js';
import { getAllCombos, getAllComboNames, isCombo, createCombo } from '../router/combos.js';
import {
  getAllCombos as dbGetAllCombos, getRequestStats, getDailyUsage,
  getActiveConnections, updateConnectionStatus, cleanupExpiredLocks,
  getRecentRequests, getAllSettings, getSetting, setSetting,
  getAllAPIKeys, createAPIKey as dbCreateAPIKey, deleteAPIKey,
  validateAPIKey, updateAPIKeyUsage, estimateCost, logRequest,
  getAllPresets, getPreset, createPreset, updatePreset, deletePreset,
  getPrivacyMode, setPrivacyMode, getCostOptimizerEnabled, setCostOptimizerEnabled,
  getQuotaSummary, getQuotaStatus, setQuotaLimit, trackQuotaUsage,
  getDetailedHealth, getProviderDetailed, getRecentRequestsWithFallback, getDetailedStats,
  } from '../database.js';
  import { applyGuardrails, getGuardrailsConfig, setGuardrailsConfig } from '../guardrails.js';
import { getLandingHTML } from '../landing.js';
import { getLocale, setLocaleCookie, type Locale } from '../i18n/index.js';
import type { TunnelConfig } from '../tunnel/config.js';
import { TunnelManager, getTunnelConfig, tunnelAccessGuard, tunnelTokenAuth, adminLocalOnly, getTunnelWarnings, maskSecret } from '../tunnel/index.js';
import type { OAuthConfig } from '../oauth/config.js';
import { getOAuthConfig, getOAuthConfigForDisplay, validateOAuthConfig, SessionManager, requireAuth, createAuthRoutes } from '../oauth/index.js';
import { getSetupGuideHTML } from '../setup-guide.js';
import { getDashboardHTML } from '../dashboard/dashboard.js';
import { getAllPoolStatuses } from '../providers/key-pool.js';
import { pickBestModel } from '../providers/smart-picker.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ═══════════════════════════════════════════════
// MODEL ALIASES (virtual routing models)
// ═══════════════════════════════════════════════
const MODEL_ALIASES = [
  { id: '8router/auto', description: 'Auto-select best available provider (subscription > cheap > free)' },
  { id: '8router/cheap', description: 'Cheapest available provider' },
  { id: '8router/fast', description: 'Fastest available provider' },
  { id: '8router/smart', description: 'Smartest available model' },
  { id: '8router/coding', description: 'Best for coding tasks' },
  { id: '8router/local', description: 'Local providers only (Ollama, Mimo, LM Studio, vLLM) — no cloud fallback' },
];

const MODEL_ALIAS_IDS = new Set(MODEL_ALIASES.map(a => a.id));

/**
 * Resolve an 8router/* model alias to an actual model name from the provider registry.
 */
function resolve8RouterAlias(alias: string, registry: import('../providers/registry.js').ProviderRegistry): string {
  const allProviders = registry.getAllProviders().filter(p => p.enabled);
  const allModels = registry.getAvailableModels();

  // Helper: pick first available model from a filtered provider list
  function pickModelFromProviders(filtered: typeof allProviders): string | null {
    for (const p of filtered) {
      // Prefer real model names (not wildcard)
      const realModels = p.models.filter(m => m !== '*' && m !== 'all');
      if (realModels.length > 0) return realModels[0];
    }
    // Fallback to any available model
    if (allModels.length > 0) return allModels[0].id;
    return null;
  }

  switch (alias) {
    case '8router/auto': {
      // Subscription > cheap > free
      const tiers: Array<'subscription' | 'cheap' | 'free'> = ['subscription', 'cheap', 'free'];
      for (const tier of tiers) {
        const tierProviders = allProviders.filter(p => p.tier === tier);
        const result = pickModelFromProviders(tierProviders);
        if (result) return result;
      }
      return 'gpt-4o-mini'; // safe fallback
    }
    case '8router/cheap': {
      const cheapProviders = allProviders.filter(p => p.tier === 'cheap' || p.tier === 'free');
      return pickModelFromProviders(cheapProviders) || 'gpt-4o-mini';
    }
    case '8router/fast': {
      // Try free tier first (often fastest: Groq, Ollama local)
      const fastProviders = allProviders
        .filter(p => p.enabled)
        .sort((a, b) => {
          const tierOrder: Record<string, number> = { free: 0, cheap: 1, subscription: 2 };
          return (tierOrder[a.tier] ?? 3) - (tierOrder[b.tier] ?? 3);
        });
      return pickModelFromProviders(fastProviders) || 'gpt-4o-mini';
    }
    case '8router/smart': {
      // Try subscription tier (largest models)
      const smartProviders = allProviders.filter(p => p.tier === 'subscription');
      const result = pickModelFromProviders(smartProviders);
      if (result) return result;
      // Fallback: any provider with a "large" model
      const largeModels = allModels.filter(m =>
        m.id.includes('gpt-4') || m.id.includes('claude') || m.id.includes('large') ||
        m.id.includes('70b') || m.id.includes('405b')
      );
      return largeModels.length > 0 ? largeModels[0].id : 'gpt-4o';
    }
    case '8router/coding': {
      // Prefer coding-optimized models
      const codingModels = allModels.filter(m =>
       m.id.includes('codestral') || m.id.includes('deepseek-coder') ||
        m.id.includes('code') || m.id.includes('claude') || m.id.includes('gpt-4')
      );
      if (codingModels.length > 0) return codingModels[0].id;
      return 'gpt-4o';
    }
    case '8router/local': {
      const localProviders = allProviders.filter(p =>
        p.id === 'ollama' || p.id === 'mimo' || p.id === 'lmstudio' || p.id === 'vllm'
      );
      // Only pick from local providers — no cloud fallback
      // Require explicitly configured models (not wildcard)
      for (const p of localProviders) {
        const realModels = p.models.filter(m => m !== '*' && m !== 'all');
        if (realModels.length > 0) return realModels[0];
      }
      // Wildcard-only local providers can't guarantee local routing
      // since the router would pick any provider for generic model names
      throw new Error('No local provider is available. Start Ollama or configure a local provider first.');
    }
    default:
      return 'gpt-4o-mini';
  }
}

// AUTH MIDDLEWARE
// ═══════════════════════════════════════════════

function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  // Skip auth if AUTH_REQUIRED is not 'true' (default for local dev)
  if (process.env.AUTH_REQUIRED !== 'true') {
    next();
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({
      error: { message: 'Missing or invalid Authorization header. Expected: Bearer sk-8router-...', type: 'auth_error' }
    });
    return;
  }

  const key = authHeader.slice(7).trim();
  const apiKey = validateAPIKey(key);
  if (!apiKey) {
    res.status(403).json({
      error: { message: 'Invalid or inactive API key', type: 'auth_error' }
    });
    return;
  }

  // Attach key info to request for downstream use
  (req as any).apiKey = apiKey;
  next();
}

// ═══════════════════════════════════════════════
// FORMAT DETECTION
// ═══════════════════════════════════════════════

/**
 * Detect the request format based on headers, URL path, and body structure.
 * Priority: headers > path > body > default (openai)
 */
function detectRequestFormat(req: Request, body: any): FormatDetectionResult {
  // 1. Header-based detection (Anthropic)
  if (req.headers['x-api-key'] || req.headers['anthropic-version'] || req.headers['anthropic-beta']) {
    return { format: 'anthropic', source: 'header' };
  }

  // 2. URL path detection (Gemini: /v1beta/models/...)
  const urlPath = req.path || req.url || '';
  if (urlPath.includes('/v1beta/models/') || (urlPath.includes('/models/') && !urlPath.includes('/v1/models'))) {
    return { format: 'gemini', source: 'path' };
  }

  // 3. Explicit path for /v1/messages → Anthropic
  if (urlPath === '/v1/messages' || urlPath.startsWith('/v1/messages')) {
    return { format: 'anthropic', source: 'path' };
  }

  // 4. Body structure detection
  if (body && typeof body === 'object') {
    const bodyFormat = detectBodyFormat(body);
    if (bodyFormat !== 'openai') {
      return { format: bodyFormat, source: 'body' };
    }
  }

  return { format: 'openai', source: 'default' };
}

export function createServer(engine: RouterEngine, tunnelManager?: TunnelManager, oauthConfig?: OAuthConfig): express.Express {
  const tunnelConfig = tunnelManager?.getConfig() ?? { enabled: false, provider: 'manual' as const, mode: 'dashboard-only' as const, authRequired: true, token: '', publicUrl: '', cloudflareToken: '', ngrokToken: '' };
  const oauth = oauthConfig ?? { enabled: false, provider: 'none' as const, allowedEmails: [], allowedDomains: [], sessionSecret: '', sessionMaxAgeHours: 24, google: { clientId: '', clientSecret: '' }, github: { clientId: '', clientSecret: '' } };
  const sessionManager = new SessionManager(oauth);

  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));
  app.use('/8router/public', express.static(path.join(__dirname, '../../public')));
  app.use('/assets', express.static(path.join(__dirname, '../../public/assets')));

  // ═══════════════════════════════════════════════
  // TUNNEL MIDDLEWARE
  // ═══════════════════════════════════════════════

  // Tunnel access mode guard — blocks routes not allowed in current mode
  if (tunnelConfig.enabled) {
    app.use(tunnelAccessGuard(tunnelConfig));
    app.use(tunnelTokenAuth(tunnelConfig));
  }

  // Admin endpoints — always local-only
  app.use('/admin', adminLocalOnly());

  // ═══════════════════════════════════════════════
  // OAUTH ROUTES
  // ═══════════════════════════════════════════════

  // Mount auth routes (login, logout, callbacks)
  app.use(createAuthRoutes(oauth, sessionManager));

  // OAuth protection for protected routes
  if (oauth.enabled) {
    app.use('/8router/dashboard', requireAuth(oauth, sessionManager));
    app.use('/8router/setup', requireAuth(oauth, sessionManager));
    app.use('/admin', requireAuth(oauth, sessionManager));
  }

  // Setup guide page
  app.get('/8router/setup', (req, res) => {
    const locale = getLocale(req);
    setLocaleCookie(res, locale);
    res.type('html').send(getSetupGuideHTML(locale));
  });

  // Serve dashboard HTML directly (consolidated on port 8080)
  app.get('/8router/dashboard', (req, res) => {
    const locale = getLocale(req);
    setLocaleCookie(res, locale);
    res.send(getDashboardHTML(8080, locale));
  });

  // ═══════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime(), tunnel: tunnelManager?.getStatus().state ?? 'disabled' });
  });

  // ═══════════════════════════════════════════════
  // TUNNEL ADMIN ENDPOINTS (local-only)
  // ═══════════════════════════════════════════════

  app.get('/admin/tunnel/status', (_req, res) => {
    const status = tunnelManager?.getStatus() ?? { state: 'disabled' };
    res.json(status);
  });

  app.post('/admin/tunnel/start', async (_req, res) => {
    if (!tunnelManager) return res.json({ error: 'Tunnel not configured' });
    try {
      const status = await tunnelManager.start();
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/admin/tunnel/stop', async (_req, res) => {
    if (!tunnelManager) return res.json({ error: 'Tunnel not configured' });
    const status = await tunnelManager.stop();
    res.json(status);
  });

  app.get('/admin/tunnel/config', (_req, res) => {
    // Return config with masked secrets
    const cfg = tunnelManager?.getConfig();
    if (!cfg) return res.json({ enabled: false });
    res.json({
      enabled: cfg.enabled,
      provider: cfg.provider,
      mode: cfg.mode,
      authRequired: cfg.authRequired,
      token: maskSecret(cfg.token),
      publicUrl: cfg.publicUrl,
      hasCloudflareToken: !!cfg.cloudflareToken,
      hasNgrokToken: !!cfg.ngrokToken,
    });
  });

  app.get('/admin/tunnel/warnings', (_req, res) => {
    const cfg = tunnelManager?.getConfig();
    if (!cfg) return res.json({ warnings: [] });
    res.json({ warnings: getTunnelWarnings(cfg) });
  });

  // ═══════════════════════════════════════════════
  // OAUTH ADMIN ENDPOINTS (local-only)
  // ═══════════════════════════════════════════════

  app.get('/admin/oauth/status', (_req, res) => {
    const validation = validateOAuthConfig(oauth);
    res.json({
      enabled: oauth.enabled,
      provider: oauth.provider,
      hasSessionSecret: !!oauth.sessionSecret,
      google: { configured: !!(oauth.google.clientId && oauth.google.clientSecret) },
      github: { configured: !!(oauth.github.clientId && oauth.github.clientSecret) },
      allowedEmails: oauth.allowedEmails.length,
      allowedDomains: oauth.allowedDomains.length,
      validation,
    });
  });

  app.get('/admin/oauth/config', (_req, res) => {
    res.json(getOAuthConfigForDisplay(oauth));
  });

  // ═══════════════════════════════════════════════
  // OPENAI-COMPATIBLE ENDPOINTS (auth-protected)
  // ═══════════════════════════════════════════════

  // Apply auth middleware to all /v1/* routes
  app.use('/v1', apiKeyAuth);

  // List models
  app.get('/v1/models', (_req, res) => {
    const models = engine.getRegistry().getAvailableModels();
    const comboNames = getAllComboNames();
    
    // Include combos as "models"
    const allModels = [
      ...models.map(m => ({
        id: m.id,
        object: 'model' as const,
        created: Date.now(),
        owned_by: '8router',
        providers: m.providers,
      })),
      ...comboNames.map(name => ({
        id: name,
        object: 'model' as const,
        created: Date.now(),
        owned_by: '8router-combo',
        providers: ['combo'],
      })),
      ...MODEL_ALIASES.map(alias => ({
        id: alias.id,
        object: 'model' as const,
        created: Date.now(),
        owned_by: '8router-alias',
        providers: ['alias'],
      })),
    ];
    
    res.json({ object: 'list', data: allModels });
  });

  // Chat completions — accepts OpenAI, Anthropic, and Gemini formats
  app.post('/v1/chat/completions', async (req, res) => {
    try {
      const detection = detectRequestFormat(req, req.body);
      const originalFormat = detection.format;

      // Normalize to OpenAI format for internal routing
      const normalized = normalizeRequest(req.body);
      const request: ChatCompletionRequest = normalized.request;

      if (!request.model || !request.messages) {
        res.status(400).json({
          error: { message: 'Missing required fields: model, messages', type: 'invalid_request' },
        });
        return;
      }

      // Resolve 8router/* model aliases to actual model names
      if (MODEL_ALIAS_IDS.has(request.model)) {
        const _origAlias = request.model;
        try {
          request.model = resolve8RouterAlias(request.model, engine.getRegistry());
        } catch (aliasErr: any) {
          if (_origAlias === '8router/local') {
            res.status(503).json({
              error: {
                message: aliasErr.message,
                type: 'invalid_request_error',
                code: 'no_local_provider',
              },
            });
            return;
          }
          throw aliasErr;
        }
      }

      // Phase 3: Apply guardrails before routing
      const guardrailsResult = applyGuardrails({ messages: request.messages });
      if (!guardrailsResult.allowed) {
        res.status(403).json({
          error: {
            message: guardrailsResult.reason || 'Request blocked by guardrails',
            type: 'guardrails_blocked',
            injectionBlocked: guardrailsResult.injectionBlocked,
            keyLeakageDetected: guardrailsResult.keyLeakageDetected,
          },
        });
        return;
      }

      if (request.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        try {
          for await (const chunk of engine.routeStream(request)) {
            res.write(chunk);
          }
        } catch (err: any) {
          const errorEvent = {
            error: { message: err.message, type: 'server_error', code: err.code || 'internal' },
          };
          res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
          res.write('data: [DONE]\n\n');
        }

        res.end();
      } else {
        const response = await engine.route(request);
        // Convert response back to the client's original format
        const formattedResponse = formatResponse(response, originalFormat, request.model);
        res.json(formattedResponse);
      }
    } catch (err: any) {
      const status = err instanceof RouterError ? 502 : 500;
      res.status(status).json({
        error: {
          message: err.message,
          type: 'server_error',
          code: err.code || 'internal',
        },
      });
    }
  });

  // ═══════════════════════════════════════════════
  // ANTHROPIC-NATIVE ENDPOINT: /v1/messages
  // Accepts Anthropic Messages API format natively
  // ═══════════════════════════════════════════════

  app.post('/v1/messages', async (req, res) => {
    try {
      const anthropicReq = req.body as AnthropicMessagesRequest;

      if (!anthropicReq.model || !anthropicReq.messages || !anthropicReq.max_tokens) {
        res.status(400).json({
          error: { message: 'Missing required fields: model, messages, max_tokens', type: 'invalid_request' },
        });
        return;
      }

      // Convert Anthropic → OpenAI for internal routing
      const normalized = normalizeRequest(anthropicReq);
      const request: ChatCompletionRequest = normalized.request;

      // Resolve 8router/* model aliases to actual model names
      if (MODEL_ALIAS_IDS.has(request.model)) {
        const _origAlias = request.model;
        try {
          request.model = resolve8RouterAlias(request.model, engine.getRegistry());
        } catch (aliasErr: any) {
          if (_origAlias === '8router/local') {
            res.status(503).json({
              error: {
                message: aliasErr.message,
                type: 'invalid_request_error',
                code: 'no_local_provider',
              },
            });
            return;
          }
          throw aliasErr;
        }
      }

      // Apply guardrails
      const guardrailsResult = applyGuardrails({ messages: request.messages });
      if (!guardrailsResult.allowed) {
        res.status(403).json({
          type: 'error',
          error: {
            type: 'permission_error',
            message: guardrailsResult.reason || 'Request blocked by guardrails',
          },
        });
        return;
      }

      if (request.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        try {
          for await (const chunk of engine.routeStream(request)) {
            res.write(chunk);
          }
        } catch (err: any) {
          const errorEvent = {
            type: 'error',
            error: { type: 'api_error', message: err.message },
          };
          res.write(`event: error\ndata: ${JSON.stringify(errorEvent)}\n\n`);
        }

        res.end();
      } else {
        const response = await engine.route(request);
        // Convert back to Anthropic format
        const anthropicResponse = formatResponse(response, 'anthropic', request.model);
        res.json(anthropicResponse);
      }
    } catch (err: any) {
      const status = err instanceof RouterError ? 502 : 500;
      res.status(status).json({
        type: 'error',
        error: {
          type: 'api_error',
          message: err.message,
        },
      });
    }
  });

  // ═══════════════════════════════════════════════
  // SERVICE ENDPOINTS: EMBEDDINGS, TTS, STT, IMAGES, SEARCH
  // ═══════════════════════════════════════════════

  // --- Provider detection helpers for service endpoints ---

  function detectEmbeddingProvider(model: string): { providerId: string; apiKey: string; baseUrl: string } | null {
    const allProviders = engine.getRegistry().getAllProviders();
    const m = model.toLowerCase();

    // OpenAI embeddings: text-embedding-*
    if (m.startsWith('text-embedding-')) {
      const p = allProviders.find(p => p.id === 'openai' && p.enabled);
      if (p) return { providerId: p.id, apiKey: p.apiKey, baseUrl: p.baseUrl };
    }
    // Together AI: models with / like "together/computer-use-*"
    if (m.includes('/')) {
      const p = allProviders.find(p => p.id === 'together' && p.enabled);
      if (p) return { providerId: p.id, apiKey: p.apiKey, baseUrl: p.baseUrl };
    }
    // Mistral: mistral-embed
    if (m.includes('mistral-embed')) {
      const p = allProviders.find(p => p.id === 'mistral' && p.enabled);
      if (p) return { providerId: p.id, apiKey: p.apiKey, baseUrl: p.baseUrl };
    }
    // Cohere: embed-*
    if (m.startsWith('embed-')) {
      const p = allProviders.find(pp => pp.id === 'cohere' && pp.enabled);
      if (p) return { providerId: p.id, apiKey: p.apiKey, baseUrl: p.baseUrl };
    }

    // Fallback: first provider with OpenAI-compatible adapter
    for (const p of allProviders) {
      if (p.enabled && p.apiKey !== 'no-key') {
        return { providerId: p.id, apiKey: p.apiKey, baseUrl: p.baseUrl };
      }
    }
    return null;
  }

  // POST /v1/embeddings
  app.post('/v1/embeddings', async (req, res) => {
    const startMs = Date.now();
    try {
      const { model, input, encoding_format } = req.body;
      if (!model || !input) {
        res.status(400).json({
          error: { message: 'Missing required fields: model, input', type: 'invalid_request' },
        });
        return;
      }

      const provider = detectEmbeddingProvider(model);
      if (!provider) {
        res.status(502).json({
          error: { message: `No available provider for embeddings model "${model}"`, type: 'no_provider' },
        });
        return;
      }

      const url = `${provider.baseUrl}/embeddings`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${provider.apiKey}`,
        },
        body: JSON.stringify({ model, input, encoding_format }),
        signal: AbortSignal.timeout(60000),
      });

      const data = await response.json();
      const latencyMs = Date.now() - startMs;

      if (!response.ok) {
        logRequest({
          provider: provider.providerId,
          model,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs,
          isSuccess: false,
          errorCode: response.status,
          errorMessage: data?.error?.message || 'Upstream error',
        });
        res.status(response.status).json(data);
        return;
      }

      logRequest({
        provider: provider.providerId,
        model,
        inputTokens: Array.isArray(input) ? input.length : 1,
        outputTokens: 0,
        latencyMs,
        isSuccess: true,
      });

      res.json(data);
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      logRequest({
        provider: 'unknown',
        model: req.body?.model || 'unknown',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        isSuccess: false,
        errorMessage: err.message,
      });
      res.status(500).json({
        error: { message: err.message, type: 'server_error', code: 'internal' },
      });
    }
  });

  // POST /v1/audio/speech (TTS)
  app.post('/v1/audio/speech', async (req, res) => {
    const startMs = Date.now();
    try {
      const { model, input, voice, response_format, speed } = req.body;
      if (!model || !input) {
        res.status(400).json({
          error: { message: 'Missing required fields: model, input', type: 'invalid_request' },
        });
        return;
      }

      const allProviders = engine.getRegistry().getAllProviders();
      let targetProvider = null;
      const m = model.toLowerCase();

      // OpenAI TTS models: tts-1, tts-1-hd
      if (m.startsWith('tts-')) {
        targetProvider = allProviders.find(p => p.id === 'openai' && p.enabled && p.apiKey !== 'no-key');
      }
      // ElevenLabs models
      if (!targetProvider && (m.includes('eleven') || m.startsWith('elevenlabs'))) {
        targetProvider = allProviders.find(p => p.id === 'elevenlabs' && p.enabled && p.apiKey !== 'no-key');
      }
      // Fallback: try OpenAI
      if (!targetProvider) {
        targetProvider = allProviders.find(p => p.id === 'openai' && p.enabled && p.apiKey !== 'no-key');
      }

      if (!targetProvider) {
        res.status(502).json({
          error: { message: `No available TTS provider for model "${model}"`, type: 'no_provider' },
        });
        return;
      }

      const url = `${targetProvider.baseUrl}/audio/speech`;
      const upstreamResponse = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${targetProvider.apiKey}`,
        },
        body: JSON.stringify({
          model,
          input,
          voice: voice || 'alloy',
          response_format: response_format || 'mp3',
          speed,
        }),
        signal: AbortSignal.timeout(120000),
      });

      const latencyMs = Date.now() - startMs;

      if (!upstreamResponse.ok) {
        const errData = await upstreamResponse.json().catch(() => ({ error: { message: 'Upstream error' } }));
        logRequest({
          provider: targetProvider.id,
          model,
          inputTokens: 0,
          outputTokens: 0,
          latencyMs,
          isSuccess: false,
          errorCode: upstreamResponse.status,
          errorMessage: errData?.error?.message || 'Upstream error',
        });
        res.status(upstreamResponse.status).json(errData);
        return;
      }

      logRequest({
        provider: targetProvider.id,
        model,
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        isSuccess: true,
      });

      // Stream audio back
      res.setHeader('Content-Type', upstreamResponse.headers.get('content-type') || 'audio/mpeg');
      const audioData = await upstreamResponse.arrayBuffer();
      res.send(Buffer.from(audioData));
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      logRequest({
        provider: 'unknown',
        model: req.body?.model || 'unknown',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        isSuccess: false,
        errorMessage: err.message,
      });
      res.status(500).json({
        error: { message: err.message, type: 'server_error', code: 'internal' },
      });
    }
  });

  // POST /v1/audio/transcriptions (STT)
  app.post('/v1/audio/transcriptions', async (req, res) => {
    const startMs = Date.now();
    try {
      const { model, file, language, prompt, response_format } = req.body;
      if (!model && !file) {
        res.status(400).json({
          error: { message: 'Missing required fields: model, file', type: 'invalid_request' },
        });
        return;
      }

      const allProviders = engine.getRegistry().getAllProviders();
      let targetProvider = null;
      const m = (model || '').toLowerCase();

      // OpenAI Whisper: whisper-1
      if (m.includes('whisper')) {
        targetProvider = allProviders.find(p => p.id === 'openai' && p.enabled && p.apiKey !== 'no-key');
      }
      // Deepgram: nova-2, whisper-large, etc.
      if (!targetProvider && (m.includes('nova') || m.includes('deepgram'))) {
        targetProvider = allProviders.find(p => p.id === 'deepgram' && p.enabled && p.apiKey !== 'no-key');
      }
      // Fallback: try OpenAI
      if (!targetProvider) {
        targetProvider = allProviders.find(p => p.id === 'openai' && p.enabled && p.apiKey !== 'no-key');
      }

      if (!targetProvider) {
        res.status(502).json({
          error: { message: `No available STT provider for model "${model}"`, type: 'no_provider' },
        });
        return;
      }

      // Build multipart form data
      const formData = new FormData();
      if (file) {
        // file can be base64 or a buffer
        const fileBuffer = Buffer.from(file, typeof file === 'string' ? 'base64' : undefined);
        const blob = new Blob([fileBuffer], { type: 'audio/wav' });
        formData.append('file', blob, 'audio.wav');
      }
      if (model) formData.append('model', model);
      if (language) formData.append('language', language);
      if (prompt) formData.append('prompt', prompt);
      if (response_format) formData.append('response_format', response_format);

      const url = targetProvider.id === 'deepgram'
        ? `${targetProvider.baseUrl}/transcribe`
        : `${targetProvider.baseUrl}/audio/transcriptions`;

      const headers: Record<string, string> = {};
      if (targetProvider.id === 'deepgram') {
        headers['Authorization'] = `Token ${targetProvider.apiKey}`;
        headers['Content-Type'] = 'application/json';
      } else {
        headers['Authorization'] = `Bearer ${targetProvider.apiKey}`;
      }

      const upstreamResponse = await fetch(url, {
        method: 'POST',
        headers,
        body: formData,
        signal: AbortSignal.timeout(120000),
      });

      const latencyMs = Date.now() - startMs;

      if (!upstreamResponse.ok) {
        const errText = await upstreamResponse.text().catch(() => 'Upstream error');
        logRequest({
          provider: targetProvider.id,
          model: model || 'whisper',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs,
          isSuccess: false,
          errorCode: upstreamResponse.status,
          errorMessage: errText.slice(0, 200),
        });
        res.status(upstreamResponse.status).json({ error: { message: errText.slice(0, 200) } });
        return;
      }

      const data = await upstreamResponse.json();
      logRequest({
        provider: targetProvider.id,
        model: model || 'whisper',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        isSuccess: true,
      });

      res.json(data);
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      logRequest({
        provider: 'unknown',
        model: req.body?.model || 'unknown',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        isSuccess: false,
        errorMessage: err.message,
      });
      res.status(500).json({
        error: { message: err.message, type: 'server_error', code: 'internal' },
      });
    }
  });

  // POST /v1/images/generations
  app.post('/v1/images/generations', async (req, res) => {
    const startMs = Date.now();
    try {
      const { model, prompt, n, size, response_format, quality } = req.body;
      if (!prompt) {
        res.status(400).json({
          error: { message: 'Missing required field: prompt', type: 'invalid_request' },
        });
        return;
      }

      const allProviders = engine.getRegistry().getAllProviders();
      let targetProvider = null;
      const m = (model || '').toLowerCase();

      // OpenAI DALL-E: dall-e-2, dall-e-3
      if (m.startsWith('dall-e')) {
        targetProvider = allProviders.find(p => p.id === 'openai' && p.enabled && p.apiKey !== 'no-key');
      }
      // Stability AI
      if (!targetProvider && m.includes('stable')) {
        targetProvider = allProviders.find(p => p.id === 'stability' && p.enabled && p.apiKey !== 'no-key');
      }
      // Fal.ai: flux models
      if (!targetProvider && m.includes('flux')) {
        targetProvider = allProviders.find(p => p.id === 'fal' && p.enabled && p.apiKey !== 'no-key');
      }
      // Fallback: OpenAI (dall-e-3)
      if (!targetProvider) {
        targetProvider = allProviders.find(p => p.id === 'openai' && p.enabled && p.apiKey !== 'no-key');
      }

      if (!targetProvider) {
        res.status(502).json({
          error: { message: 'No available image generation provider', type: 'no_provider' },
        });
        return;
      }

      let url = '';
      let body: any;
      let headers: Record<string, string> = {
        'Content-Type': 'application/json',
      };

      if (targetProvider.id === 'stability') {
        url = `${targetProvider.baseUrl}/stable-image/generate/sd3`;
        headers['Authorization'] = `Bearer ${targetProvider.apiKey}`;
        headers['Accept'] = 'application/json';
        body = {
          prompt,
          model: 'sd3-medium',
          output_format: 'png',
        };
      } else if (targetProvider.id === 'fal') {
        url = `${targetProvider.baseUrl}/fal-ai/flux/dev`;
        headers['Authorization'] = `Key ${targetProvider.apiKey}`;
        body = {
          prompt,
          num_images: n || 1,
          image_size: size || 'landscape_16_9',
        };
      } else {
        // OpenAI-compatible (DALL-E)
        url = `${targetProvider.baseUrl}/images/generations`;
        headers['Authorization'] = `Bearer ${targetProvider.apiKey}`;
        body = {
          model: model || 'dall-e-3',
          prompt,
          n: n || 1,
          size: size || '1024x1024',
          response_format: response_format || 'url',
          quality,
        };
      }

      const upstreamResponse = await fetch(url, {
        method: 'POST',
        headers,
        body: JSON.stringify(body),
        signal: AbortSignal.timeout(120000),
      });

      const latencyMs = Date.now() - startMs;
      const data = await upstreamResponse.json();

      if (!upstreamResponse.ok) {
        logRequest({
          provider: targetProvider.id,
          model: model || 'image-gen',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs,
          isSuccess: false,
          errorCode: upstreamResponse.status,
          errorMessage: data?.error?.message || 'Upstream error',
        });
        res.status(upstreamResponse.status).json(data);
        return;
      }

      logRequest({
        provider: targetProvider.id,
        model: model || 'image-gen',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        isSuccess: true,
      });

      res.json(data);
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      logRequest({
        provider: 'unknown',
        model: req.body?.model || 'unknown',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        isSuccess: false,
        errorMessage: err.message,
      });
      res.status(500).json({
        error: { message: err.message, type: 'server_error', code: 'internal' },
      });
    }
  });

  // POST /v1/search (web search)
  app.post('/v1/search', async (req, res) => {
    const startMs = Date.now();
    try {
      const { query, provider: providerOverride, max_results, search_depth } = req.body;
      if (!query) {
        res.status(400).json({
          error: { message: 'Missing required field: query', type: 'invalid_request' },
        });
        return;
      }

      const allProviders = engine.getRegistry().getAllProviders();
      const maxResults = max_results || 10;
      let targetId = providerOverride || null;

      // Auto-detect search provider if not specified
      if (!targetId) {
        if (allProviders.find(p => p.id === 'tavily' && p.enabled && p.apiKey !== 'no-key')) {
          targetId = 'tavily';
        } else if (allProviders.find(p => p.id === 'brave-search' && p.enabled && p.apiKey !== 'no-key')) {
          targetId = 'brave-search';
        } else if (allProviders.find(p => p.id === 'exa' && p.enabled && p.apiKey !== 'no-key')) {
          targetId = 'exa';
        }
      }

      if (!targetId) {
        res.status(502).json({
          error: { message: 'No search provider configured. Set TAVILY_API_KEY, BRAVE_API_KEY, or EXA_API_KEY.', type: 'no_provider' },
        });
        return;
      }

      const targetProvider = allProviders.find(p => p.id === targetId && p.enabled);
      if (!targetProvider) {
        res.status(502).json({
          error: { message: `Search provider "${targetId}" not available`, type: 'no_provider' },
        });
        return;
      }

      let url = '';
      let body: any;
      let headers: Record<string, string> = {};

      if (targetId === 'tavily') {
        url = 'https://api.tavily.com/search';
        headers = {
          'Content-Type': 'application/json',
        };
        body = {
          api_key: targetProvider.apiKey,
          query,
          max_results: maxResults,
          search_depth: search_depth || 'basic',
        };
      } else if (targetId === 'brave-search') {
        url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${maxResults}`;
        headers = {
          'Accept': 'application/json',
          'Accept-Encoding': 'gzip',
          'X-Subscription-Token': targetProvider.apiKey,
        };
        body = null; // GET request
      } else if (targetId === 'exa') {
        url = 'https://api.exa.ai/search';
        headers = {
          'Content-Type': 'application/json',
          'x-api-key': targetProvider.apiKey,
        };
        body = {
          query,
          numResults: maxResults,
          type: 'neural',
        };
      } else {
        res.status(400).json({
          error: { message: `Unsupported search provider: ${targetId}`, type: 'invalid_request' },
        });
        return;
      }

      const upstreamResponse = await fetch(url, {
        method: body ? 'POST' : 'GET',
        headers,
        body: body ? JSON.stringify(body) : undefined,
        signal: AbortSignal.timeout(30000),
      });

      const latencyMs = Date.now() - startMs;
      const data = await upstreamResponse.json();

      if (!upstreamResponse.ok) {
        logRequest({
          provider: targetId,
          model: 'search',
          inputTokens: 0,
          outputTokens: 0,
          latencyMs,
          isSuccess: false,
          errorCode: upstreamResponse.status,
          errorMessage: data?.detail || data?.error || 'Upstream error',
        });
        res.status(upstreamResponse.status).json(data);
        return;
      }

      logRequest({
        provider: targetId,
        model: 'search',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        isSuccess: true,
      });

      // Normalize response to a common format
      let results: any[] = [];

      if (targetId === 'tavily') {
        results = (data.results || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.content,
          score: r.score,
        }));
      } else if (targetId === 'brave-search') {
        results = (data.web?.results || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.description,
          score: r.meta_url?.score,
        }));
      } else if (targetId === 'exa') {
        results = (data.results || []).map((r: any) => ({
          title: r.title,
          url: r.url,
          content: r.text?.slice(0, 500),
          score: r.score,
          publishedDate: r.publishedDate,
        }));
      }

      res.json({
        provider: targetId,
        query,
        results,
        total_results: results.length,
      });
    } catch (err: any) {
      const latencyMs = Date.now() - startMs;
      logRequest({
        provider: 'unknown',
        model: 'search',
        inputTokens: 0,
        outputTokens: 0,
        latencyMs,
        isSuccess: false,
        errorMessage: err.message,
      });
      res.status(500).json({
        error: { message: err.message, type: 'server_error', code: 'internal' },
      });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: LOGS
  // ═══════════════════════════════════════════════

  app.get('/8router/logs', (_req, res) => {
    try {
      const logs = getRecentRequests(100);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: SETTINGS
  // ═══════════════════════════════════════════════

  app.get('/8router/settings', (_req, res) => {
    try {
      const settings = getAllSettings();
      res.json(settings);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/8router/settings', (req, res) => {
    try {
      const settings = req.body;
      if (!settings || typeof settings !== 'object') {
        res.status(400).json({ error: 'Request body must be a JSON object of key-value pairs' });
        return;
      }
      for (const [key, value] of Object.entries(settings)) {
        setSetting(key, String(value));
      }
      res.json({ ok: true, message: 'Settings saved' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: API KEYS
  // ═══════════════════════════════════════════════

  app.get('/8router/api-keys', (_req, res) => {
    try {
      const keys = getAllAPIKeys();
      // Mask the key for security — show only prefix + suffix
      res.json(keys.map(k => ({
        ...k,
        key: k.key.slice(0, 16) + '...' + k.key.slice(-4),
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/8router/api-keys', (req, res) => {
    try {
      const { name, permissions } = req.body;
      if (!name) {
        res.status(400).json({ error: 'Missing required field: name' });
        return;
      }
      const newKey = dbCreateAPIKey(name, permissions || 'chat,models');
      res.json({ ok: true, key: newKey });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/8router/api-keys/:id', (req, res) => {
    try {
      const deleted = deleteAPIKey(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'API key not found' });
        return;
      }
      res.json({ ok: true, message: 'API key revoked' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: AGENT PRESETS (Phase 3)
  // ═══════════════════════════════════════════════

  app.get('/8router/presets', (_req, res) => {
    try {
      const presets = getAllPresets();
      // Parse JSON fields for convenience
      res.json(presets.map(p => ({
        ...p,
        fallback_rules: JSON.parse(p.fallback_rules),
        allowed_providers: JSON.parse(p.allowed_providers),
        token_saver_mode: !!p.token_saver_mode,
      })));
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/8router/presets', (req, res) => {
    try {
      const { name, description, model_alias, fallback_rules, system_prompt, token_saver_mode, temperature, max_tokens, allowed_providers } = req.body;
      if (!name || !model_alias) {
        res.status(400).json({ error: 'Missing required fields: name, model_alias' });
        return;
      }
      const preset = createPreset({
        name, description, model_alias, fallback_rules, system_prompt,
        token_saver_mode, temperature, max_tokens, allowed_providers,
      });
      res.json({ ok: true, preset });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.put('/8router/presets/:id', (req, res) => {
    try {
      const updated = updatePreset(req.params.id, req.body);
      if (!updated) {
        res.status(404).json({ error: 'Preset not found' });
        return;
      }
      res.json({ ok: true, message: 'Preset updated' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.delete('/8router/presets/:id', (req, res) => {
    try {
      const deleted = deletePreset(req.params.id);
      if (!deleted) {
        res.status(404).json({ error: 'Preset not found' });
        return;
      }
      res.json({ ok: true, message: 'Preset deleted' });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: PRIVACY MODE (Phase 3)
  // ═══════════════════════════════════════════════

  app.get('/8router/privacy', (_req, res) => {
    try {
      const enabled = getPrivacyMode();
      res.json({
        privacy_mode: enabled,
        description: enabled
          ? 'Privacy mode active — all requests routed to local providers only (Ollama, LM Studio, vLLM)'
          : 'Privacy mode inactive — requests can route to any available provider',
        local_providers: ['ollama', 'lmstudio', 'vllm'],
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/8router/privacy', (req, res) => {
    try {
      const { enabled } = req.body;
      if (enabled === undefined) {
        res.status(400).json({ error: 'Missing required field: enabled (boolean)' });
        return;
      }
      setPrivacyMode(!!enabled);
      res.json({
        ok: true,
        privacy_mode: !!enabled,
        message: !!enabled
          ? 'Privacy mode enabled — cloud providers blocked'
          : 'Privacy mode disabled — all providers available',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: GUARDRAILS (Phase 3)
  // ═══════════════════════════════════════════════

  app.get('/8router/guardrails', (_req, res) => {
    try {
      const config = getGuardrailsConfig();
      res.json(config);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/8router/guardrails', (req, res) => {
    try {
      const config = setGuardrailsConfig(req.body);
      res.json({ ok: true, config });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: COST OPTIMIZER (Phase 3)
  // ═══════════════════════════════════════════════

  app.get('/8router/cost-optimizer', (_req, res) => {
    try {
      const enabled = getCostOptimizerEnabled();
      const savingsRaw = getSetting('cost_savings_total');
      const logRaw = getSetting('cost_savings_log');
      res.json({
        enabled,
        total_savings: parseFloat(savingsRaw || '0'),
        recent_optimizations: logRaw ? JSON.parse(logRaw) : [],
        description: enabled
          ? 'Cost optimizer active — auto-routes simple prompts to cheaper models'
          : 'Cost optimizer inactive — requests use the exact model specified',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/8router/cost-optimizer', (req, res) => {
    try {
      const { enabled } = req.body;
      if (enabled === undefined) {
        res.status(400).json({ error: 'Missing required field: enabled (boolean)' });
        return;
      }
      setCostOptimizerEnabled(!!enabled);
      res.json({
        ok: true,
        enabled: !!enabled,
        message: !!enabled
          ? 'Cost optimizer enabled — smart routing active'
          : 'Cost optimizer disabled — explicit model selection only',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: SHUTDOWN
  // ═══════════════════════════════════════════════

  app.post('/8router/shutdown', (_req, res) => {
    res.json({ ok: true, message: 'Shutting down...' });
    // Graceful shutdown after response is sent
    setTimeout(() => {
      process.exit(0);
    }, 500);
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: STATS & ANALYTICS
  // ═══════════════════════════════════════════════

  // Enhanced stats with database persistence
  app.get('/8router/stats', (_req, res) => {
    const stats = engine.getStats();
    const dbStats = getRequestStats();
    
    res.json({
      // In-memory stats (current session)
      session: {
        ...stats,
        providerStats: Object.fromEntries(stats.providerStats),
      },
      // Database stats (all time)
      allTime: dbStats,
    });
  });

  // Daily usage analytics
  app.get('/8router/usage', (req, res) => {
    const days = parseInt(req.query.days as string) || 7;
    const usage = getDailyUsage(days);
    res.json(usage);
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: PROVIDERS
  // ═══════════════════════════════════════════════

  // Mask secret helper
  const maskSecret = (key: string): string => {
    if (!key) return '***';
    if (key.length <= 10) return key.slice(0, 4) + '...' + key.slice(-2);
    return key.slice(0, 6) + '...' + key.slice(-4);
  };

  app.get('/8router/providers', (_req, res) => {
    const providers = engine.getRegistry().getAllProviders().map(p => ({
      ...p,
      apiKey: maskSecret(p.apiKey),
      apiKeys: Array.isArray(p.apiKeys) ? p.apiKeys.map(maskSecret) : p.apiKeys,
    }));
    res.json(providers);
  });

  // Provider health
  app.get('/8router/health', (_req, res) => {
    const health = engine.getRegistry().getHealth();
    res.json(health);
  });

  // Available models
  app.get('/8router/models', (_req, res) => {
    const models = engine.getRegistry().getAvailableModels();
    res.json(models);
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: KEY POOL
  // ═══════════════════════════════════════════════

  app.get('/8router/key-pool', (_req, res) => {
    try {
      const statuses = engine.getKeyPoolStatus();
      res.json(statuses);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: COMBOS
  // ═══════════════════════════════════════════════

  // List all combos
  app.get('/8router/combos', (_req, res) => {
    const combos = getAllCombos();
    res.json(combos.map(c => ({
      name: c.combo.name,
      description: c.combo.description,
      strategy: c.combo.strategy,
      tiers: c.tiers.map(t => ({
        provider: t.provider,
        model: t.model,
        priority: t.priority,
        isActive: !!t.isActive,
      })),
    })));
  });

  // Create/update combo
  app.post('/8router/combos', (req, res) => {
    try {
      const { name, description, tiers } = req.body;
      if (!name || !tiers || !Array.isArray(tiers)) {
        res.status(400).json({ error: 'Missing name or tiers array' });
        return;
      }
      createCombo(name, description || '', tiers);
      res.json({ ok: true, message: `Combo "${name}" created` });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: CONNECTIONS (DB-backed)
  // ═══════════════════════════════════════════════

  // List connections from database
  app.get('/8router/connections', (req, res) => {
    const provider = req.query.provider as string | undefined;
    const conns = getActiveConnections(provider);
    res.json(conns.map(c => ({
      ...c,
      apiKey: c.apiKey ? (c.apiKey.slice(0, 8) + '***') : null,
      accessToken: c.accessToken ? '***' : null,
    })));
  });

  // Update connection status
  app.patch('/8router/connections/:id/status', (req, res) => {
    try {
      const { status, error, errorCode } = req.body;
      updateConnectionStatus(req.params.id, status, error, errorCode);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: CAVEMAN MODE
  // ═══════════════════════════════════════════════

  app.get('/8router/caveman', (_req, res) => {
    const level = parseInt(process.env.CAVEMAN_LEVEL || '0');
    const descriptions: Record<number, string> = {
      0: 'Disabled', 1: 'Mild', 2: 'Medium', 3: 'Aggressive', 4: 'Extreme', 5: 'Maximum',
    };
    res.json({ level, description: descriptions[level] || 'Unknown' });
  });

  app.post('/8router/caveman', (req, res) => {
    const { level } = req.body;
    if (level === undefined || level < 0 || level > 5) {
      res.status(400).json({ error: 'Level must be 0-5' });
      return;
    }
    process.env.CAVEMAN_LEVEL = String(level);
    res.json({ ok: true, level });
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: QUOTA TRACKING
  // ═══════════════════════════════════════════════

  app.get('/8router/quota', (_req, res) => {
    try {
      const summary = getQuotaSummary();
      res.json(summary);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.get('/8router/quota/:provider', (req, res) => {
    try {
      const status = getQuotaStatus(req.params.provider);
      res.json(status);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  app.post('/8router/quota/:provider/:period', (req, res) => {
    try {
      const { provider, period } = req.params;
      const { quotaLimit, tokenLimit, costLimit } = req.body;
      setQuotaLimit(provider, period, { quotaLimit, tokenLimit, costLimit });
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: SYSTEM INFO
  // ═══════════════════════════════════════════════

  app.get('/8router/info', (_req, res) => {
    res.json({
      name: '8Router',
      version: VERSION,
      description: 'AI Routing Gateway for 8Agents',
      uptime: process.uptime(),
      features: [
        'OpenAI-compatible API',
        'Multi-provider routing with fallback',
        'Named combos (fallback chains)',
        'RTK token compression',
        'Caveman output compression',
        'SQLite persistence',
        'Key Pool (round-robin rotation with health tracking)',
        'Usage analytics',
        'API key authentication',
        'Settings persistence',
        'Request logs',
        // Phase 3 features
        'Agent Presets',
        'Privacy Mode (local-only routing)',
        'Guardrails (prompt injection, secret redaction, key leakage prevention)',
        'Smart Cost Optimizer',
        // Quota Tracker
        'Quota Tracker (per-provider usage with reset countdowns)',
        // Format Translator
        'Format Translator (OpenAI, Anthropic, Gemini auto-detection)',
        // Service endpoints
        'Embeddings (OpenAI, Together, Cohere, Mistral)',
        'TTS (OpenAI, ElevenLabs)',
        'STT (OpenAI Whisper, Deepgram)',
        'Image Generation (DALL-E, Stability, Fal)',
        'Web Search (Tavily, Brave, Exa)',
      ],
      endpoints: {
        api: 'http://localhost:8080/v1',
        messages: 'http://localhost:8080/v1/messages',
        dashboard: 'http://localhost:8080/8router/dashboard',
        health: 'http://localhost:8080/health',
        stats: 'http://localhost:8080/8router/stats',
        logs: 'http://localhost:8080/8router/logs',
        settings: 'http://localhost:8080/8router/settings',
        apiKeys: 'http://localhost:8080/8router/api-keys',
        combos: 'http://localhost:8080/8router/combos',
        connections: 'http://localhost:8080/8router/connections',
        usage: 'http://localhost:8080/8router/usage',
        // Phase 3 endpoints
        presets: 'http://localhost:8080/8router/presets',
        privacy: 'http://localhost:8080/8router/privacy',
        guardrails: 'http://localhost:8080/8router/guardrails',
        costOptimizer: 'http://localhost:8080/8router/cost-optimizer',
        keyPool: 'http://localhost:8080/8router/key-pool',
        quota: 'http://localhost:8080/8router/quota',
        // Service endpoints
        embeddings: 'http://localhost:8080/v1/embeddings',
        speech: 'http://localhost:8080/v1/audio/speech',
        transcriptions: 'http://localhost:8080/v1/audio/transcriptions',
        images: 'http://localhost:8080/v1/images/generations',
        search: 'http://localhost:8080/v1/search',
      },
    });
  });

  // Cleanup expired locks periodically
  setInterval(cleanupExpiredLocks, 30000);

  // ═══════════════════════════════════════════════
  // ADMIN ENDPOINTS (LOCAL-ONLY)
  // ═══════════════════════════════════════════════

  // Local-only middleware
  function localOnly(req: Request, res: Response, next: NextFunction): void {
    const ip = req.ip || req.socket.remoteAddress || '';
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || 
                    ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.');
    
    // Also allow admin token
    const adminToken = req.headers['x-admin-token'] as string;
    const validToken = process.env.ADMIN_TOKEN;
    if (validToken && adminToken === validToken) {
      next();
      return;
    }
    
    if (!isLocal) {
      res.status(403).json({ error: { message: 'Admin endpoints are local-only', type: 'forbidden' } });
      return;
    }
    next();
  }

  // Admin: Health with detailed info
  app.get('/admin/health', localOnly, (_req, res) => {
    try {
      const health = getDetailedHealth();
      res.json(health);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Providers with circuit breaker status
  app.get('/admin/providers', localOnly, (_req, res) => {
    try {
      const providers = getProviderDetailed();
      res.json(providers);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Key pool with health details
  app.get('/admin/keys', localOnly, (_req, res) => {
    try {
      const keys = getAllPoolStatuses();
      res.json(keys);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Quota summary
  app.get('/admin/quota', localOnly, (_req, res) => {
    try {
      const quota = getQuotaSummary();
      res.json(quota);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Recent logs with fallback paths
  app.get('/admin/logs', localOnly, (req, res) => {
    try {
      const limit = parseInt(req.query.limit as string) || 50;
      const logs = getRecentRequestsWithFallback(limit);
      res.json(logs);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Stats with error rates
  app.get('/admin/stats', localOnly, (_req, res) => {
    try {
      const stats = getDetailedStats();
      res.json(stats);
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Admin: Version info
  app.get('/admin/version', localOnly, (_req, res) => {
    try {
      const pkgPath = path.join(__dirname, '../../package.json');
      const pkg = JSON.parse(readFileSync(pkgPath, 'utf-8'));
      const providerCount = engine.getRegistry().getAllProviders().length;
      const keyStatuses = engine.getKeyPoolStatus();
      const keyCount = Array.isArray(keyStatuses)
        ? keyStatuses.reduce((sum: number, s: any) => sum + (s.keys?.length || s.totalKeys || 0), 0)
        : 0;

      res.json({
        version: pkg.version || '0.0.0',
        buildDate: new Date().toISOString(),
        nodeVersion: process.version,
        providerCount,
        keyCount,
        features: {
          quotaTracker: true,
          circuitBreaker: true,
          keyHealth: true,
          secretMasking: true,
          formatBridge: true,
          rtkCompression: true,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Landing page at /8router/
  app.get('/8router/', (req, res) => {
    const locale = getLocale(req);
    setLocaleCookie(res, locale);
    res.type('html').send(getLandingHTML(locale));
  });

  // Benchmark endpoint
  app.get('/admin/benchmarks', async (_req, res) => {
    try {
      const { getAllStats, runBenchmark } = await import('../providers/latency-tracker.js');
      const providers = engine.getRegistry().getAllProviders()
        .filter((p: any) => p.enabled && p.apiKey)
        .map((p: any) => ({ id: p.id, baseUrl: p.baseUrl, apiKey: p.apiKey }));
      const benchmarkResults = await runBenchmark(providers);
      const stats = getAllStats();
      res.json({ benchmarks: benchmarkResults, stats });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // Smart model picker endpoint
  app.get('/8router/pick-model', (req, res) => {
    const { task, tools, vision, maxCost } = req.query;

    const result = pickBestModel({
      task: task as any,
      requireTools: tools === 'true',
      requireVision: vision === 'true',
      maxCostPer1m: maxCost ? parseFloat(maxCost as string) : undefined,
    });

    if (result) {
      res.json(result);
    } else {
      res.status(404).json({ error: { message: 'No model matches the given criteria', type: 'not_found' } });
    }
  });

  // Catch-all
  app.all('*', (_req, res) => {
    res.status(404).json({
      error: {
        message: 'Not found. See /8router/info for available endpoints',
        type: 'not_found',
      },
    });
  });

  return app;
}
