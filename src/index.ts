// 8Router — Main Entry Point (Extended)

import { loadConfig, generateDefaultConfig } from './config.js';
import { RouterEngine } from './router/engine.js';
import { createServer } from './api/server.js';
import { createDashboard } from './dashboard/dashboard.js';
import { createHermesProxy, generateHermesConfig } from './hermes/integration.js';
import { PROVIDER_CATALOG, MODEL_ALIASES } from './providers/catalog.js';

const BANNER = `
╔══════════════════════════════════════════════════════════════╗
║                                                              ║
║   ⚡ 8Router v0.1.0                                          ║
║   AI Routing Gateway — 8Agents Ecosystem                     ║
║                                                              ║
║   API:          http://localhost:{PORT}/v1                   ║
║   Hermes Proxy: http://localhost:{HERMES_PORT}/v1            ║
║   Dashboard:    http://localhost:{DASH_PORT}                 ║
║                                                              ║
║   Providers: {PROVIDER_COUNT}  |  Models: {MODEL_COUNT}     ║
║   RTK Compression: ON  |  Fallback: {TIERS}                 ║
║                                                              ║
╚══════════════════════════════════════════════════════════════╝
`;

function main() {
  // Handle CLI commands
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
      console.log(`  ${p.tier === 'subscription' ? '💎' : p.tier === 'cheap' ? '💰' : '🆓'} ${p.id.padEnd(15)} ${p.name.padEnd(25)} ${p.tier.padEnd(12)} ${p.models.length} models`);
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
  const hermesPort = config.dashboard.port + 2; // 8083

  // Start API server
  const app = createServer(engine);
  app.listen(config.port, config.host, () => {
    const totalModels = engine.getRegistry().getAvailableModels().length;
    const totalProviders = engine.getRegistry().getAllProviders().length;
    const tiers = config.fallback.tiers.join(' → ');

    console.log(BANNER
      .replace('{PORT}', String(config.port))
      .replace('{HERMES_PORT}', String(hermesPort))
      .replace('{DASH_PORT}', String(config.dashboard.port))
      .replace('{PROVIDER_COUNT}', String(totalProviders))
      .replace('{MODEL_COUNT}', String(totalModels))
      .replace('{TIERS}', tiers)
    );

    // Log providers
    const providers = engine.getRegistry().getAllProviders();
    for (const p of providers) {
      const icon = p.tier === 'subscription' ? '💎' : p.tier === 'cheap' ? '💰' : '🆓';
      console.log(`  ${icon} ${p.name} (${p.tier}) [${p.models.length} models]`);
    }

    if (providers.length === 0) {
      console.log('  ⚠️  No providers detected. Add API keys or configure in 8router.yaml');
      console.log('  Run: npx tsx src/index.ts --init  to generate config');
    }
  });

  // Start Hermes proxy
  const hermesApp = createHermesProxy(engine);
  hermesApp.listen(hermesPort, config.host, () => {
    console.log(`[8Router] Hermes proxy at http://localhost:${hermesPort}/v1`);
  });

  // Start dashboard
  if (config.dashboard.enabled) {
    const dashApp = createDashboard(engine, config.dashboard.port);
    dashApp.listen(config.dashboard.port, config.host, () => {
      console.log(`[8Router] Dashboard at http://localhost:${config.dashboard.port}`);
    });
  }

  // Print usage hints
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

main();
