// 8Router — Main Entry Point (v0.5.0)
// Format Translator + Multi-Account Key Pool + 9 Service Kinds

import { loadConfig, generateDefaultConfig } from './config.js';
import { RouterEngine } from './router/engine.js';
import { createServer } from './api/server.js';
import { createHermesProxy, generateHermesConfig } from './hermes/integration.js';
import { PROVIDER_CATALOG, MODEL_ALIASES } from './providers/catalog.js';
import { initKeyPool, getAllPoolStatuses } from './providers/key-pool.js';
import { formatResponse } from './providers/format-bridge.js';

const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ⚡ 8Router v0.5.0                                          ║
║   AI Routing Gateway — 8Agents Ecosystem                     ║
║                                                              ║
║   API:          http://localhost:{PORT}/v1                   ║
║   Anthropic:    http://localhost:{PORT}/v1/messages          ║
║   Hermes Proxy: http://localhost:{HERMES_PORT}/v1            ║
║   Dashboard:    http://localhost:{PORT}/8router/dashboard    ║
║                                                              ║
║   Providers: {PROVIDER_COUNT}  |  Models: {MODEL_COUNT}     ║
║   Key Pool:   {KEY_POOL_COUNT} keys  |  Format Bridge: ON   ║
║   RTK Compression: ON  |  Fallback: {TIERS}                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

let globalEngine: RouterEngine;

function main() {
  const args = process.argv.slice(2);
  if (args.includes('--init')) {
    console.log(generateDefaultConfig());
    console.log('\n# Save to ~/.8router/config.yaml');
    return;
  }
  if (args.includes('--hermes-config')) {
    const port = parseInt(args[args.indexOf('--port') + 1]) || 8080;
    console.log(generateHermesConfig(port));
    return;
  }
  if (args.includes('--providers')) {
    console.log('\n📦 Available Providers:\n');
    for (const p of PROVIDER_CATALOG) {
      const icon = p.tier === 'subscription' ? '💎' : p.tier === 'cheap' ? '💰' : '🆓';
      console.log(`  ${icon} ${p.id.padEnd(15)} ${p.name.padEnd(25)} ${p.tier.padEnd(12)} ${p.models.length} models`);
    }
    console.log(`\nTotal: ${PROVIDER_CATALOG.length} providers\n`);
    return;
  }
  if (args.includes('--aliases')) {
    console.log('\n🏷️  Model Aliases:\n');
    for (const [alias, model] of Object.entries(MODEL_ALIASES)) {
      console.log(`  ${alias.padEnd(12)} → ${model}`);
    }
    console.log(`\nTotal: ${Object.keys(MODEL_ALIASES).length} aliases\n`);
    return;
  }

  const config = loadConfig();
  const engine = new RouterEngine(config);
  globalEngine = engine;
  const hermesPort = config.dashboard.port + 2;

  // Initialize multi-account key pools from config
  let totalPoolKeys = 0;
  if (config.providers) {
    for (const provider of config.providers) {
      if (provider.enabled === false) continue;
      const keys = Array.isArray(provider.apiKeys)
        ? provider.apiKeys
        : [provider.apiKey].filter(Boolean);
      if (keys.length > 0 && keys[0]) {
        initKeyPool(provider.id, keys, provider.rotation || 'round-robin');
        totalPoolKeys += keys.length;
      }
    }
  }

  // Start API server
  const app = createServer(engine);
  setupExtendedEndpoints(app);
  app.listen(config.port, config.host, () => {
    const totalModels = engine.getRegistry().getAvailableModels().length;
    const totalProviders = engine.getRegistry().getAllProviders().length;
    const tiers = config.fallback.tiers.join(' → ');

    console.log(BANNER
      .replace('{PORT}', String(config.port))
      .replace('{HERMES_PORT}', String(hermesPort))
      .replace('{PROVIDER_COUNT}', String(totalProviders))
      .replace('{MODEL_COUNT}', String(totalModels))
      .replace('{KEY_POOL_COUNT}', String(totalPoolKeys))
      .replace('{TIERS}', tiers)
    );

    const providers = engine.getRegistry().getAllProviders();
    for (const p of providers) {
      const icon = p.tier === 'subscription' ? '💎' : p.tier === 'cheap' ? '💰' : '🆓';
      console.log(`  ${icon} ${p.name} (${p.tier}) [${p.models.length} models]`);
    }

    if (providers.length === 0) {
      console.log('  ⚠️  No providers detected. Add API keys or configure in 8router.yaml');
      console.log('  Run: npx tsx src/index.ts --init  to generate config');
    }

    console.log('\n  🔑 Key Pool: ' + totalPoolKeys + ' keys loaded');
    console.log('  🌐 Format Bridge: OpenAI ↔ Anthropic ↔ Gemini');
    console.log('  📡 Service Kinds: Chat, Embeddings, TTS, STT, Image Gen, Web Search');
  });

  // Start Hermes proxy
  const hermesApp = createHermesProxy(engine);
  hermesApp.listen(hermesPort, config.host, () => {
    console.log(`[8Router] Hermes proxy at http://localhost:${hermesPort}/v1`);
  });

  // Dashboard is now served directly on the main API server at /8router/dashboard

  console.log('\n--- Quick Start ---');
  console.log(`# Connect Hermes:`);
  console.log(`# hermes --provider 8router --model claude`);
  console.log(`# hermes --provider 8router --model gpt4o`);
  console.log(`# hermes --provider 8router --model deepseek`);
  console.log(`# hermes --provider 8router --model free`);
  console.log('');
  console.log(`# Claude Code:`);
  console.log(`ANTHROPIC_BASE_URL=http://localhost:${config.port} claude`);
  console.log('');
  console.log(`# Codex CLI:`);
  console.log(`OPENAI_BASE_URL=http://localhost:${config.port}/v1 codex`);
  console.log('');
}

function setupExtendedEndpoints(app: any) {
  function extractToken(req: any): string {
    const auth = req.headers?.authorization || '';
    return auth.replace(/^Bearer\s+/i, '');
  }

  // ─── POST /v1/messages — Anthropic-native format ───
  app.post('/v1/messages', async (req: any, res: any) => {
    try {
      const model = req.body?.model || 'claude-sonnet-4-20250514';
      const messages = (req.body?.messages || []).map((m: any) => ({
        role: m.role,
        content: typeof m.content === 'string' ? m.content : JSON.stringify(m.content),
      }));

      const result = await globalEngine.route({
        model,
        messages,
        max_tokens: req.body?.max_tokens || 1024,
        temperature: req.body?.temperature,
        stream: req.body?.stream || false,
      });

      // Convert OpenAI response → Anthropic format
      const anthropicResp = formatResponse(result, 'anthropic', model);
      res.json(anthropicResp);
    } catch (err: any) {
      res.status(502).json({ error: { type: 'api_error', message: err.message } });
    }
  });

  // ─── POST /v1/embeddings ───
  app.post('/v1/embeddings', async (req: any, res: any) => {
    try {
      const model = req.body?.model || 'text-embedding-3-small';
      const result = await globalEngine.route({
        model,
        messages: [{ role: 'user', content: JSON.stringify({ input: req.body?.input || '', dimensions: req.body?.dimensions }) }],
      });
      res.json(result);
    } catch (err: any) {
      res.status(502).json({ error: { message: err.message } });
    }
  });

  // ─── POST /v1/audio/speech ───
  app.post('/v1/audio/speech', async (req: any, res: any) => {
    try {
      const model = req.body?.model || 'tts-1';
      const result = await globalEngine.route({
        model,
        messages: [{ role: 'user', content: JSON.stringify({
          input: req.body?.input || '',
          voice: req.body?.voice || 'alloy',
          speed: req.body?.speed || 1.0,
          response_format: req.body?.response_format || 'mp3',
        })}],
      });
      res.json(result);
    } catch (err: any) {
      res.status(502).json({ error: { message: err.message } });
    }
  });

  // ─── POST /v1/audio/transcriptions ───
  app.post('/v1/audio/transcriptions', async (req: any, res: any) => {
    try {
      const model = req.body?.model || 'whisper-1';
      const result = await globalEngine.route({
        model,
        messages: [{ role: 'user', content: JSON.stringify({
          file: req.body?.file,
          language: req.body?.language,
          prompt: req.body?.prompt,
        })}],
      });
      res.json(result);
    } catch (err: any) {
      res.status(502).json({ error: { message: err.message } });
    }
  });

  // ─── POST /v1/images/generations ───
  app.post('/v1/images/generations', async (req: any, res: any) => {
    try {
      const model = req.body?.model || 'dall-e-3';
      const result = await globalEngine.route({
        model,
        messages: [{ role: 'user', content: JSON.stringify({
          prompt: req.body?.prompt || '',
          n: req.body?.n || 1,
          size: req.body?.size || '1024x1024',
          quality: req.body?.quality || 'standard',
        })}],
      });
      res.json(result);
    } catch (err: any) {
      res.status(502).json({ error: { message: err.message } });
    }
  });

  // ─── POST /v1/search ───
  app.post('/v1/search', async (req: any, res: any) => {
    try {
      const { query, provider: searchProvider, max_results } = req.body || {};
      if (!query) return res.status(400).json({ error: { message: 'query is required' } });
      const model = `search-${searchProvider || 'tavily'}`;
      const result = await globalEngine.route({
        model,
        messages: [{ role: 'user', content: JSON.stringify({ query, max_results: max_results || 10 }) }],
      });
      res.json(result);
    } catch (err: any) {
      res.status(502).json({ error: { message: err.message } });
    }
  });

  // ─── GET /8router/key-pool — Key pool health dashboard ───
  app.get('/8router/key-pool', (_req: any, res: any) => {
    try {
      const stats = getAllPoolStatuses();
      res.json({
        providers: stats,
        summary: {
          totalProviders: stats.length,
          totalKeys: stats.reduce((s: number, p: any) => s + (p?.totalKeys || 0), 0),
          healthyKeys: stats.reduce((s: number, p: any) => s + (p?.healthyKeys || 0), 0),
        }
      });
    } catch (err: any) {
      res.status(500).json({ error: { message: err.message } });
    }
  });
}

main();
