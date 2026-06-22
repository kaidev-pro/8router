// 8Router — OpenAI-Compatible API Server v2
// Full API with combos, analytics, connections, caveman mode

import express from 'express';
import cors from 'cors';
import { RouterEngine, RouterError } from '../router/engine.js';
import { ChatCompletionRequest } from '../types.js';
import { getAllCombos, getAllComboNames, isCombo, createCombo } from '../router/combos.js';
import { getAllCombos as dbGetAllCombos, getRequestStats, getDailyUsage, getActiveConnections, updateConnectionStatus, cleanupExpiredLocks } from '../database.js';

export function createServer(engine: RouterEngine): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // ═══════════════════════════════════════════════
  // HEALTH CHECK
  // ═══════════════════════════════════════════════

  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // ═══════════════════════════════════════════════
  // OPENAI-COMPATIBLE ENDPOINTS
  // ═══════════════════════════════════════════════

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
    ];
    
    res.json({ object: 'list', data: allModels });
  });

  // Chat completions
  app.post('/v1/chat/completions', async (req, res) => {
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

  app.get('/8router/providers', (_req, res) => {
    const providers = engine.getRegistry().getAllProviders().map(p => ({
      ...p,
      apiKey: p.apiKey ? (p.apiKey.slice(0, 8) + '...' + p.apiKey.slice(-4)) : '***',
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
  // 8ROUTER API: SYSTEM INFO
  // ═══════════════════════════════════════════════

  app.get('/8router/info', (_req, res) => {
    res.json({
      name: '8Router',
      version: '0.2.0',
      description: 'AI Routing Gateway for 8Agents',
      uptime: process.uptime(),
      features: [
        'OpenAI-compatible API',
        'Multi-provider routing with fallback',
        'Named combos (fallback chains)',
        'RTK token compression',
        'Caveman output compression',
        'SQLite persistence',
        'Multi-key rotation',
        'Usage analytics',
      ],
      endpoints: {
        api: 'http://localhost:8080/v1',
        dashboard: 'http://localhost:8081',
        health: 'http://localhost:8080/health',
        stats: 'http://localhost:8080/8router/stats',
        combos: 'http://localhost:8080/8router/combos',
        connections: 'http://localhost:8080/8router/connections',
        usage: 'http://localhost:8080/8router/usage',
      },
    });
  });

  // Cleanup expired locks periodically
  setInterval(cleanupExpiredLocks, 30000);

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
