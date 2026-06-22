// 8Router — OpenAI-Compatible API Server

import express from 'express';
import cors from 'cors';
import { RouterEngine, RouterError } from '../router/engine.js';
import { ChatCompletionRequest } from '../types.js';

export function createServer(engine: RouterEngine): express.Express {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // Health check
  app.get('/health', (_req, res) => {
    res.json({ status: 'ok', uptime: process.uptime() });
  });

  // OpenAI-compatible: list models
  app.get('/v1/models', (_req, res) => {
    const models = engine.getRegistry().getAvailableModels();
    res.json({
      object: 'list',
      data: models.map(m => ({
        id: m.id,
        object: 'model',
        created: Date.now(),
        owned_by: '8router',
        providers: m.providers,
      })),
    });
  });

  // OpenAI-compatible: chat completions
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
        // Streaming response
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
        // Non-streaming response
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

  // 8Router API: stats
  app.get('/8router/stats', (_req, res) => {
    const stats = engine.getStats();
    res.json({
      ...stats,
      providerStats: Object.fromEntries(stats.providerStats),
    });
  });

  // 8Router API: providers
  app.get('/8router/providers', (_req, res) => {
    const providers = engine.getRegistry().getAllProviders().map(p => ({
      ...p,
      apiKey: p.apiKey.slice(0, 8) + '...' + p.apiKey.slice(-4),
    }));
    res.json(providers);
  });

  // 8Router API: health
  app.get('/8router/health', (_req, res) => {
    const health = engine.getRegistry().getHealth();
    res.json(health);
  });

  // 8Router API: models
  app.get('/8router/models', (_req, res) => {
    const models = engine.getRegistry().getAvailableModels();
    res.json(models);
  });

  // Catch-all for undefined routes
  app.all('*', (_req, res) => {
    res.status(404).json({
      error: {
        message: 'Not found. Use /v1/chat/completions or /v1/models',
        type: 'not_found',
      },
    });
  });

  return app;
}
