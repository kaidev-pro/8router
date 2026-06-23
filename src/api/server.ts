// 8Router — OpenAI-Compatible API Server v3
// Full API with auth, rate limiting, structured logging, enhanced health checks, API docs

import express from 'express';
import cors from 'cors';
import { RouterEngine, RouterError } from '../router/engine.js';
import { ChatCompletionRequest } from '../types.js';
import { getAllCombos, getAllComboNames, isCombo, createCombo } from '../router/combos.js';
import { getAllCombos as dbGetAllCombos, getRequestStats, getDailyUsage, getActiveConnections, updateConnectionStatus, cleanupExpiredLocks } from '../database.js';
import { apiKeyAuth } from '../auth/middleware.js';
import { chatRateLimiter, adminRateLimiter, globalRateLimiter } from './middleware/rate-limit.js';
import { httpRequestLogger, getHttpLogs } from '../logger/request-logger.js';
import { createAPIKey, getAllAPIKeys } from '../auth/api-keys.js';

export function createServer(engine: RouterEngine): express.Express {
  const app = express();

  // Global middleware
  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Structured request logging (applied to all routes)
  app.use(httpRequestLogger);

  // ═══════════════════════════════════════════════
  // OPEN ENDPOINTS (no auth required)
  // ═══════════════════════════════════════════════

  // Basic health check (open)
  app.get('/health', (_req, res) => {
    const providers = engine.getRegistry().getAllProviders();
    const health = engine.getRegistry().getHealth();
    const stats = engine.getStats();
    const healthyCount = health.filter(h => h.healthy).length;
    const mem = process.memoryUsage();

    res.json({
      status: healthyCount > 0 ? 'ok' : 'degraded',
      version: '0.2.0',
      uptime: process.uptime(),
      timestamp: Date.now(),
      memory: {
        heapUsed: Math.round(mem.heapUsed / 1024 / 1024),
        heapTotal: Math.round(mem.heapTotal / 1024 / 1024),
        rss: Math.round(mem.rss / 1024 / 1024),
      },
      database: {
        connected: true,
        path: require('path').join(require('os').homedir(), '.8router', 'db', 'data.sqlite'),
      },
      providers: {
        total: providers.length,
        healthy: healthyCount,
        unhealthy: providers.length - healthyCount,
        details: health.map(h => ({
          providerId: h.providerId,
          healthy: h.healthy,
          avgLatencyMs: h.avgLatencyMs || 0,
          consecutiveErrors: h.consecutiveErrors,
          lastError: h.lastError || null,
          lastCheck: h.lastCheck,
        })),
      },
      metrics: {
        totalRequests: stats.totalRequests,
        successfulRequests: stats.successfulRequests,
        failedRequests: stats.failedRequests,
        successRate: stats.totalRequests > 0
          ? `${((stats.successfulRequests / stats.totalRequests) * 100).toFixed(1)}%`
          : '0%',
        compressionSaved: stats.compressionSaved,
        avgLatencyMs: stats.successfulRequests > 0
          ? Math.round((Date.now() - stats.startedAt) / stats.successfulRequests)
          : 0,
      },
    });
  });

  // System info (open)
  app.get('/8router/info', (_req, res) => {
    res.json({
      name: '8Router',
      version: '0.2.0',
      description: 'AI Routing Gateway for 8Agents — OpenAI-compatible multi-provider router',
      uptime: process.uptime(),
      features: [
        'OpenAI-compatible API',
        'Multi-provider routing with fallback',
        'Named combos (fallback chains)',
        'RTK token compression',
        'Caveman output compression',
        'SQLite persistence',
        'Multi-key rotation & rate limiting',
        'Usage analytics & structured logging',
        'API key authentication',
        'Provider health monitoring',
        'Circuit breaker pattern',
      ],
      endpoints: {
        api: 'http://localhost:8080/v1',
        dashboard: 'http://localhost:8081',
        health: 'http://localhost:8080/health',
        docs: 'http://localhost:8080/8router/docs',
        stats: 'http://localhost:8080/8router/stats',
        combos: 'http://localhost:8080/8router/combos',
        connections: 'http://localhost:8080/8router/connections',
        usage: 'http://localhost:8080/8router/usage',
        providers: 'http://localhost:8080/8router/providers',
        healthCheck: 'http://localhost:8080/8router/health',
      },
    });
  });

  // API Documentation (open)
  app.get('/8router/docs', (_req, res) => {
    res.json({
      service: '8Router API',
      version: '0.2.0',
      description: 'OpenAI-compatible AI routing gateway API',
      authentication: {
        type: 'Bearer Token',
        header: 'Authorization: Bearer <your-api-key>',
        defaultKey: 'Default key: 8r_<random> — create via POST /8router/apikeys',
        rateLimits: {
          global: `${parseInt(process.env.RATE_LIMIT_GLOBAL || '200', 10)} req/min`,
          chat: `${parseInt(process.env.RATE_LIMIT_CHAT || '60', 10)} req/min`,
          admin: `${parseInt(process.env.RATE_LIMIT_ADMIN || '30', 10)} req/min`,
        },
      },
      openEndpoints: [
        { method: 'GET', path: '/health', description: 'Service health check with provider status, DB, memory' },
        { method: 'GET', path: '/8router/info', description: 'System information and available endpoints' },
        { method: 'GET', path: '/8router/docs', description: 'This API documentation' },
        { method: 'GET', path: '/v1/models', description: 'List available models (OpenAI-compatible)' },
      ],
      protectedEndpoints: [
        {
          group: 'OpenAI-compatible API',
          endpoints: [
            { method: 'POST', path: '/v1/chat/completions', description: 'Chat completion (supports streaming)', body: '{ model, messages, stream?, temperature?, max_tokens? }' },
          ],
        },
        {
          group: 'Analytics',
          endpoints: [
            { method: 'GET', path: '/8router/stats', description: 'Session + all-time stats' },
            { method: 'GET', path: '/8router/usage', description: 'Daily usage analytics', params: { days: 'Number of days (default: 7)' } },
            { method: 'GET', path: '/8router/logs', description: 'Recent HTTP request logs' },
          ],
        },
        {
          group: 'Management',
          endpoints: [
            { method: 'GET', path: '/8router/providers', description: 'List configured providers' },
            { method: 'GET', path: '/8router/health', description: 'Detailed provider health status' },
            { method: 'GET', path: '/8router/models', description: 'Available models with provider info' },
            { method: 'GET', path: '/8router/combos', description: 'List named combos (fallback chains)' },
            { method: 'POST', path: '/8router/combos', description: 'Create/update a combo', body: '{ name, description, tiers[] }' },
            { method: 'GET', path: '/8router/connections', description: 'List active provider connections' },
            { method: 'PATCH', path: '/8router/connections/:id/status', description: 'Update connection status' },
            { method: 'GET', path: '/8router/apikeys', description: 'List API keys (admin only)' },
            { method: 'POST', path: '/8router/apikeys', description: 'Create new API key' },
          ],
        },
        {
          group: 'Caveman Mode',
          endpoints: [
            { method: 'GET', path: '/8router/caveman', description: 'Get current caveman compression level' },
            { method: 'POST', path: '/8router/caveman', description: 'Set caveman compression level (0-5)' },
          ],
        },
      ],
    });
  });

  // ═══════════════════════════════════════════════
  // AUTHENTICATED ENDPOINTS
  // ═══════════════════════════════════════════════

  // API Key management endpoints (use global rate limit, require admin permission via auth middleware)
  app.get('/8router/apikeys', apiKeyAuth, globalRateLimiter, (_req, res) => {
    const keys = getAllAPIKeys().map(k => ({
      id: k.id,
      name: k.name,
      permissions: k.permissions,
      key: k.key.slice(0, 12) + '...',
      rateLimit: k.rateLimit,
      usage: k.usage,
      active: k.active,
      createdAt: k.createdAt,
    }));
    res.json(keys);
  });

  app.post('/8router/apikeys', apiKeyAuth, globalRateLimiter, (req, res) => {
    const { name, permissions } = req.body;
    if (!name) {
      res.status(400).json({ error: 'Name is required' });
      return;
    }
    const newKey = createAPIKey(name, permissions || ['chat', 'models']);
    res.json({
      id: newKey.id,
      name: newKey.name,
      key: newKey.key, // Show full key only on creation
      permissions: newKey.permissions,
      rateLimit: newKey.rateLimit,
    });
  });

  // List models with auth and rate limiting
  app.get('/v1/models', apiKeyAuth, globalRateLimiter, (_req, res) => {
    const models = engine.getRegistry().getAvailableModels();
    const comboNames = getAllComboNames();
    
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
    ];
    
    res.json({ object: 'list', data: allModels });
  });

  // Chat completions with auth and rate limiting
  app.post('/v1/chat/completions', apiKeyAuth, chatRateLimiter, async (req, res) => {
    try {
      const request: ChatCompletionRequest = req.body;

      if (!request.model || !request.messages) {
        res.status(400).json({
          error: { message: 'Missing required fields: model, messages', type: 'invalid_request' },
        });
        return;
      }

      if (request.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.setHeader('X-Accel-Buffering', 'no');
        res.flushHeaders();

        // Handle client disconnect
        let aborted = false;
        req.on('close', () => {
          aborted = true;
        });

        try {
          for await (const chunk of engine.routeStream(request)) {
            if (aborted) break;
            res.write(chunk);
          }
        } catch (err: any) {
          if (!aborted) {
            const errorEvent = {
              error: { message: err.message, type: 'server_error', code: err.code || 'internal' },
            };
            res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
          }
        }

        if (!aborted) {
          res.write('data: [DONE]\n\n');
          res.end();
        }
      } else {
        const response = await engine.route(request);
        res.json(response);
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
  // 8ROUTER API: STATS & ANALYTICS (auth required)
  // ═══════════════════════════════════════════════

  // Enhanced stats with database persistence
  app.get('/8router/stats', apiKeyAuth, globalRateLimiter, (_req, res) => {
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

  // HTTP request logs
  app.get('/8router/logs', apiKeyAuth, globalRateLimiter, (req, res) => {
    const count = parseInt(req.query.count as string) || 50;
    const logs = getHttpLogs(count);
    res.json(logs);
  });

  // Daily usage analytics
  app.get('/8router/usage', apiKeyAuth, globalRateLimiter, (req, res) => {
    const days = parseInt(req.query.days as string) || 7;
    const usage = getDailyUsage(days);
    res.json(usage);
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: PROVIDERS (auth required)
  // ═══════════════════════════════════════════════

  app.get('/8router/providers', apiKeyAuth, adminRateLimiter, (_req, res) => {
    const providers = engine.getRegistry().getAllProviders().map(p => ({
      ...p,
      apiKey: p.apiKey ? (p.apiKey.slice(0, 8) + '...' + p.apiKey.slice(-4)) : '***',
    }));
    res.json(providers);
  });

  // Provider health (enhanced)
  app.get('/8router/health', apiKeyAuth, globalRateLimiter, (_req, res) => {
    const health = engine.getRegistry().getHealth();
    const providers = engine.getRegistry().getAllProviders();
    const healthyCount = health.filter(h => h.healthy).length;
    
    res.json({
      summary: {
        totalProviders: providers.length,
        healthy: healthyCount,
        unhealthy: providers.length - healthyCount,
        overall: healthyCount === providers.length ? 'healthy' : healthyCount > 0 ? 'degraded' : 'unhealthy',
      },
      providers: health.map(h => {
        const p = providers.find(pv => pv.id === h.providerId);
        return {
          providerId: h.providerId,
          name: p?.name || h.providerId,
          tier: p?.tier || 'unknown',
          healthy: h.healthy,
          lastCheck: new Date(h.lastCheck).toISOString(),
          consecutiveErrors: h.consecutiveErrors,
          avgLatencyMs: h.avgLatencyMs || 0,
          lastError: h.lastError || null,
          models: p?.models || [],
        };
      }),
    });
  });

  // Available models
  app.get('/8router/models', apiKeyAuth, globalRateLimiter, (_req, res) => {
    const models = engine.getRegistry().getAvailableModels();
    res.json(models);
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: COMBOS (auth required)
  // ═══════════════════════════════════════════════

  // List all combos
  app.get('/8router/combos', apiKeyAuth, globalRateLimiter, (_req, res) => {
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
  app.post('/8router/combos', apiKeyAuth, adminRateLimiter, (req, res) => {
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
  // 8ROUTER API: CONNECTIONS (auth required)
  // ═══════════════════════════════════════════════

  // List connections from database
  app.get('/8router/connections', apiKeyAuth, adminRateLimiter, (req, res) => {
    const provider = req.query.provider as string | undefined;
    const conns = getActiveConnections(provider);
    res.json(conns.map(c => ({
      ...c,
      apiKey: c.apiKey ? (c.apiKey.slice(0, 8) + '***') : null,
      accessToken: c.accessToken ? '***' : null,
    })));
  });

  // Update connection status
  app.patch('/8router/connections/:id/status', apiKeyAuth, adminRateLimiter, (req, res) => {
    try {
      const { status, error, errorCode } = req.body;
      updateConnectionStatus(req.params.id, status, error, errorCode);
      res.json({ ok: true });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  });

  // ═══════════════════════════════════════════════
  // 8ROUTER API: CAVEMAN MODE (auth required)
  // ═══════════════════════════════════════════════

  app.get('/8router/caveman', apiKeyAuth, globalRateLimiter, (_req, res) => {
    const level = parseInt(process.env.CAVEMAN_LEVEL || '0');
    const descriptions: Record<number, string> = {
      0: 'Disabled', 1: 'Mild', 2: 'Medium', 3: 'Aggressive', 4: 'Extreme', 5: 'Maximum',
    };
    res.json({ level, description: descriptions[level] || 'Unknown' });
  });

  app.post('/8router/caveman', apiKeyAuth, adminRateLimiter, (req, res) => {
    const { level } = req.body;
    if (level === undefined || level < 0 || level > 5) {
      res.status(400).json({ error: 'Level must be 0-5' });
      return;
    }
    process.env.CAVEMAN_LEVEL = String(level);
    res.json({ ok: true, level });
  });

  // Cleanup expired locks periodically
  setInterval(cleanupExpiredLocks, 30000);

  // Catch-all
  app.all('*', (_req, res) => {
    res.status(404).json({
      error: {
        message: 'Not found. See /8router/docs for available endpoints',
        type: 'not_found',
      },
    });
  });

  return app;
}