// 8Router — Configuration (Extended with Catalog)

import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import { RouterConfig } from './types.js';
import { PROVIDER_CATALOG, autoDetectProviders, getProviderDef } from './providers/catalog.js';

const DEFAULT_CONFIG: RouterConfig = {
  port: 8080,
  host: '0.0.0.0',
  fallback: {
    tiers: ['subscription', 'cheap', 'free'],
    maxRetries: 3,
    retryDelayMs: 1000,
    circuitBreakerThreshold: 5,
    circuitBreakerResetMs: 60000,
  },
  compression: {
    rtk: {
      enabled: true,
      compressToolOutput: true,
      removeLineNumbers: true,
      collapseWhitespace: true,
      maxToolOutputTokens: 2000,
    },
    caveman: {
      enabled: false,
      level: 3,
    },
  },
  providers: [],
  logLevel: 'info',
  dashboard: {
    enabled: true,
    port: 8081,
  },
};

export function loadConfig(configPath?: string): RouterConfig {
  const searchPaths = [
    configPath,
    process.env.EIGHTROUTER_CONFIG,
    path.join(process.cwd(), '8router.yaml'),
    path.join(process.cwd(), '8router.yml'),
    path.join(process.cwd(), '8router.json'),
    path.join(process.env.HOME || '~', '.8router', 'config.yaml'),
  ].filter(Boolean) as string[];

  for (const p of searchPaths) {
    if (fs.existsSync(p)) {
      const ext = path.extname(p).toLowerCase();
      const raw = fs.readFileSync(p, 'utf8');
      const parsed = ext === '.json' ? JSON.parse(raw) : yaml.load(raw);
      return mergeConfig(DEFAULT_CONFIG, parsed as Partial<RouterConfig>);
    }
  }

  // Auto-detect providers from environment
  const envProviders = detectEnvProviders();
  return { ...DEFAULT_CONFIG, providers: envProviders };
}

function mergeConfig(base: RouterConfig, override: Partial<RouterConfig>): RouterConfig {
  // If config has no providers, auto-detect from env
  const providers = override.providers?.length
    ? override.providers
    : detectEnvProviders();

  return {
    ...base,
    ...override,
    fallback: { ...base.fallback, ...override.fallback },
    compression: {
      rtk: { ...base.compression.rtk, ...override.compression?.rtk },
      caveman: { ...base.compression.caveman, ...override.compression?.caveman },
    },
    dashboard: { ...base.dashboard, ...override.dashboard },
    providers,
  };
}

function detectEnvProviders(): RouterConfig['providers'] {
  const detected = autoDetectProviders();

  return detected.map(d => {
    const def = getProviderDef(d.id);
    if (!def) return null;

    return {
      id: def.id,
      name: def.name,
      apiKey: d.apiKey,
      tier: def.tier,
      baseUrl: d.baseUrl || def.baseUrl,
      models: def.models,
      enabled: true,
      adapter: def.adapter,
    };
  }).filter(Boolean) as RouterConfig['providers'];
}

export function generateDefaultConfig(): string {
  const config = {
    ...DEFAULT_CONFIG,
    providers: PROVIDER_CATALOG.map(p => ({
      id: p.id,
      name: p.name,
      tier: p.tier,
      baseUrl: p.baseUrl,
      models: p.models,
      enabled: false,
      apiKey: `YOUR_${p.envKey}`,
    })),
  };
  return yaml.dump(config, { indent: 2, lineWidth: 120 });
}

export { PROVIDER_CATALOG };
