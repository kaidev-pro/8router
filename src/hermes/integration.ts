// 8Router — Hermes Agent Integration
// Provides OpenAI-compatible proxy that Hermes can connect to

import express from 'express';
import cors from 'cors';
import { RouterEngine } from '../router/engine.js';
import { resolveModelAlias, MODEL_ALIASES } from '../providers/catalog.js';

// ═══════════════════════════════════════════════════════════════
// Hermes-compatible proxy middleware
// Translates between Hermes expectations and 8Router
// ═══════════════════════════════════════════════════════════════
export function createHermesProxy(engine: RouterEngine) {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: '10mb' }));

  // ── Hermes Model Discovery ──
  // Hermes calls /v1/models to discover available models
  app.get('/v1/models', (_req: any, res: any) => {
    const models = engine.getRegistry().getAvailableModels();
    const hermesModels = models.flatMap(m =>
      m.providers.map(pid => ({
        id: m.id,
        object: 'model' as const,
        created: Math.floor(Date.now() / 1000),
        owned_by: '8router',
        permission: [{
          id: `modelperm-${Date.now()}`,
          object: 'model_permission',
          created: Math.floor(Date.now() / 1000),
          allow_create_engine: false,
          allow_sampling: true,
          allow_logprobs: true,
          allow_search_indices: false,
          allow_view: true,
          allow_fine_tuning: false,
          organization: '*',
          group: null,
          is_blocking: false,
        }],
        root: m.id,
        parent: null,
      }))
    );

    // Deduplicate by model ID
    const seen = new Set<string>();
    const unique = hermesModels.filter(m => {
      if (seen.has(m.id)) return false;
      seen.add(m.id);
      return true;
    });

    res.json({ object: 'list', data: unique });
  });

  // ── Hermes Chat Completions ──
  app.post('/v1/chat/completions', async (req: any, res: any) => {
    try {
      // Resolve model aliases
      if (req.body.model) {
        req.body.model = resolveModelAlias(req.body.model);
      }

      if (req.body.stream) {
        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.flushHeaders();

        try {
          for await (const chunk of engine.routeStream(req.body)) {
            res.write(chunk);
          }
        } catch (err: any) {
          const errorEvent = { error: { message: err.message, type: 'server_error' } };
          res.write(`data: ${JSON.stringify(errorEvent)}\n\n`);
          res.write('data: [DONE]\n\n');
        }
        res.end();
      } else {
        const response = await engine.route(req.body);
        res.json(response);
      }
    } catch (err: any) {
      res.status(502).json({ error: { message: err.message, type: 'server_error' } });
    }
  });

  // ── Hermes Info Endpoint ──
  app.get('/hermes/info', (_req: any, res: any) => {
    const stats = engine.getStats();
    const providers = engine.getRegistry().getAllProviders();
    const models = engine.getRegistry().getAvailableModels();

    res.json({
      name: '8Router',
      version: '0.1.0',
      description: 'AI Routing Gateway for 8Agents / Hermes',
      stats: {
        totalRequests: stats.totalRequests,
        totalTokens: stats.totalTokens,
        compressionSaved: stats.compressionSaved,
        providerCount: providers.length,
        modelCount: models.length,
      },
      providers: providers.map(p => ({
        id: p.id,
        name: p.name,
        tier: p.tier,
        enabled: p.enabled,
        models: p.models,
      })),
    });
  });

  // ── Hermes Health Check ──
  app.get('/health', (_req: any, res: any) => {
    res.json({
      status: 'ok',
      service: '8router',
      version: '0.1.0',
      uptime: process.uptime(),
      providers: engine.getRegistry().getHealth().length,
    });
  });

  return app;
}

// ═══════════════════════════════════════════════════════════════
// Hermes config.yaml snippet generator
// ═══════════════════════════════════════════════════════════════
export function generateHermesConfig(port: number = 8080): string {
  return `# 8Router Hermes Integration
# Add to ~/.hermes/config.yaml under providers:

custom_providers:
  8router:
    base_url: "http://localhost:${port}/v1"
    api_key: "8router-key"
    models:
      # === Premium ===
      - anthropic/claude-sonnet-4-20250514
      - anthropic/claude-3-5-haiku-20241022
      - openai/gpt-4o
      - openai/gpt-4o-mini
      - google/gemini-2.0-flash
      - google/gemini-1.5-pro
      - xai/grok-3

      # === Budget ===
      - deepseek/deepseek-chat
      - deepseek/deepseek-coder
      - deepseek/deepseek-reasoner
      - openrouter/meta-llama/llama-3.3-70b
      - together/qwen-72b
      - mistral/mistral-large

      # === Free ===
      - groq/llama-3.3-70b-versatile
      - groq/llama-3.1-8b-instant
      - groq/mixtral-8x7b-32768

# === Usage Examples ===
# hermes --provider 8router --model anthropic/claude-sonnet-4-20250514
# hermes --provider 8router --model deepseek/deepseek-chat
# hermes --provider 8router --model groq/llama-3.3-70b-versatile

# === Model Aliases (work with --model flag) ===
# claude    → anthropic/claude-sonnet-4-20250514
# gpt4o     → openai/gpt-4o
# gemini    → google/gemini-2.0-flash
# grok      → xai/grok-3
# deepseek  → deepseek/deepseek-chat
# llama     → groq/llama-3.3-70b-versatile
# cheap     → deepseek/deepseek-chat
# free      → groq/llama-3.3-70b-versatile
# fast      → openai/gpt-4o-mini
# best      → anthropic/claude-sonnet-4-20250514
`;
}

export { resolveModelAlias, MODEL_ALIASES };
