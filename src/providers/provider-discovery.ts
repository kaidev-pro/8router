// 8Router — Provider Discovery Service
// Controlled model discovery with feature flag gates, dry-run default, mock adapters

import { PROVIDER_CATALOG, type ProviderDef } from './catalog.js';
import { buildProviderDescriptors, type ProviderDescriptor } from './provider-foundation.js';

// ═══════════════════════════════════════════════════════════════
// Feature Flags
// ═══════════════════════════════════════════════════════════════

export function isDiscoveryEnabled(): boolean {
  return process.env.PROVIDER_MODEL_DISCOVERY_ENABLED === 'true';
}

export function isDiscoveryNetworkEnabled(): boolean {
  return process.env.PROVIDER_MODEL_DISCOVERY_NETWORK_ENABLED === 'true';
}

export function isDiscoveryPersistEnabled(): boolean {
  return process.env.PROVIDER_MODEL_DISCOVERY_PERSIST_ENABLED === 'true';
}

// ═══════════════════════════════════════════════════════════════
// Discovery Result
// ═══════════════════════════════════════════════════════════════

export interface DiscoveredModel {
  id: string;
  displayName: string;
  source: 'api' | 'static' | 'override';
}

export interface DiscoveryResult {
  providerId: string;
  protocol: string;
  dryRun: boolean;
  networkUsed: boolean;
  modelsFound: number;
  newModels: string[];
  removedModels: string[];
  errors: string[];
  timestamp: string;
}

// ═══════════════════════════════════════════════════════════════
// Protocol Discovery Adapters (mock-only in Phase 5B)
// ═══════════════════════════════════════════════════════════════

export interface DiscoveryAdapter {
  protocol: string;
  discover(baseUrl: string, apiKey?: string): Promise<DiscoveredModel[]>;
}

class MockOpenAIDiscoveryAdapter implements DiscoveryAdapter {
  protocol = 'openai';
  async discover(_baseUrl: string, _apiKey?: string): Promise<DiscoveredModel[]> {
    return [
      { id: 'gpt-4o', displayName: 'GPT-4o', source: 'static' },
      { id: 'gpt-4o-mini', displayName: 'GPT-4o Mini', source: 'static' },
    ];
  }
}

class MockAnthropicDiscoveryAdapter implements DiscoveryAdapter {
  protocol = 'anthropic';
  async discover(_baseUrl: string, _apiKey?: string): Promise<DiscoveredModel[]> {
    return [
      { id: 'claude-sonnet-4-20250514', displayName: 'Claude Sonnet 4', source: 'static' },
    ];
  }
}

class MockGeminiDiscoveryAdapter implements DiscoveryAdapter {
  protocol = 'gemini';
  async discover(_baseUrl: string, _apiKey?: string): Promise<DiscoveredModel[]> {
    return [
      { id: 'gemini-2.0-flash', displayName: 'Gemini 2.0 Flash', source: 'static' },
    ];
  }
}

class MockLocalDiscoveryAdapter implements DiscoveryAdapter {
  protocol = 'local';
  async discover(_baseUrl: string, _apiKey?: string): Promise<DiscoveredModel[]> {
    return [];
  }
}

const ADAPTERS: DiscoveryAdapter[] = [
  new MockOpenAIDiscoveryAdapter(),
  new MockAnthropicDiscoveryAdapter(),
  new MockGeminiDiscoveryAdapter(),
  new MockLocalDiscoveryAdapter(),
];

export function getDiscoveryAdapter(protocol: string): DiscoveryAdapter | undefined {
  return ADAPTERS.find(a => a.protocol === protocol);
}

// ═══════════════════════════════════════════════════════════════
// Discovery Service
// ═══════════════════════════════════════════════════════════════

export class ProviderDiscoveryService {
  private descriptors: ProviderDescriptor[];

  constructor() {
    this.descriptors = buildProviderDescriptors();
  }

  buildDiscoveryPlan(providerId?: string): { providerId: string; protocol: string; baseUrl: string; supportsDiscovery: boolean }[] {
    const targets = providerId ? this.descriptors.filter(d => d.id === providerId) : this.descriptors.filter(d => d.features.dynamicModels);
    return targets.map(d => ({
      providerId: d.id,
      protocol: d.protocol,
      baseUrl: d.baseUrl,
      supportsDiscovery: d.features.dynamicModels,
    }));
  }

  async runDiscoveryDryRun(providerId?: string): Promise<DiscoveryResult[]> {
    const plan = this.buildDiscoveryPlan(providerId);
    const results: DiscoveryResult[] = [];

    for (const entry of plan) {
      const adapter = getDiscoveryAdapter(entry.protocol);
      if (!adapter) {
        results.push({
          providerId: entry.providerId, protocol: entry.protocol, dryRun: true, networkUsed: false,
          modelsFound: 0, newModels: [], removedModels: [], errors: [`No adapter for protocol: ${entry.protocol}`],
          timestamp: new Date().toISOString(),
        });
        continue;
      }

      try {
        const models = await adapter.discover(entry.baseUrl);
        results.push({
          providerId: entry.providerId, protocol: entry.protocol, dryRun: true, networkUsed: false,
          modelsFound: models.length, newModels: models.map(m => m.id), removedModels: [],
          errors: [], timestamp: new Date().toISOString(),
        });
      } catch (err: any) {
        results.push({
          providerId: entry.providerId, protocol: entry.protocol, dryRun: true, networkUsed: false,
          modelsFound: 0, newModels: [], removedModels: [], errors: [err.message || 'Unknown error'],
          timestamp: new Date().toISOString(),
        });
      }
    }

    return results;
  }

  async executeDiscovery(_providerId: string): Promise<DiscoveryResult> {
    if (!isDiscoveryEnabled()) {
      return {
        providerId: _providerId, protocol: '', dryRun: true, networkUsed: false,
        modelsFound: 0, newModels: [], removedModels: [],
        errors: ['Discovery not enabled. Set PROVIDER_MODEL_DISCOVERY_ENABLED=true'],
        timestamp: new Date().toISOString(),
      };
    }

    return {
      providerId: _providerId, protocol: '', dryRun: true, networkUsed: false,
      modelsFound: 0, newModels: [], removedModels: [],
      errors: ['Real network discovery not implemented in Phase 5B. Use dry-run.'],
      timestamp: new Date().toISOString(),
    };
  }
}

let _discoveryService: ProviderDiscoveryService | null = null;
export function getDiscoveryService(): ProviderDiscoveryService {
  if (!_discoveryService) _discoveryService = new ProviderDiscoveryService();
  return _discoveryService;
}
