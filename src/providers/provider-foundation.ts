// 8Router — Provider Expansion Foundation
// Unified Provider Descriptor, Capability Registry, Model Registry, Certification, Metadata

import { PROVIDER_CATALOG, type ProviderDef } from './catalog.js';
import { MODEL_CAPABILITIES, type ModelCapability } from './model-capabilities.js';

// ═══════════════════════════════════════════════════════════════
// Provider Descriptor
// ═══════════════════════════════════════════════════════════════

export type ProviderProtocol = 'openai' | 'anthropic' | 'gemini' | 'mistral' | 'cohere' | 'deepseek' | 'xai' | 'together' | 'fireworks' | 'replicate' | 'ollama' | 'lmstudio' | 'vllm' | 'custom' | 'local';

export type ProviderAuth = 'apiKey' | 'oauth' | 'custom' | 'local';

export type ProviderStatus = 'active' | 'degraded' | 'disabled' | 'experimental' | 'deprecated';

export interface ProviderDescriptor {
  id: string;
  displayName: string;
  vendor: string;
  protocol: ProviderProtocol;
  auth: ProviderAuth;
  baseUrl: string;
  homepage: string;
  documentation: string;
  icon: string;
  status: ProviderStatus;
  tier: 'subscription' | 'cheap' | 'free';
  envKey: string;
  requiresKey: boolean;
  description: string;
  capabilities: ProviderCapabilities;
  features: ProviderFeatures;
  metadata: ProviderMetadata;
}

export interface ProviderCapabilities {
  chat: boolean;
  vision: boolean;
  image: boolean;
  video: boolean;
  embedding: boolean;
  rerank: boolean;
  speech: boolean;
  tts: boolean;
  moderation: boolean;
  streaming: boolean;
  toolCalling: boolean;
  jsonMode: boolean;
  reasoning: boolean;
}

export interface ProviderFeatures {
  dynamicModels: boolean;
  healthCheck: boolean;
  quota: boolean;
  cost: boolean;
  multiAccount: boolean;
  fallback: boolean;
  benchmark: boolean;
}

export interface ProviderMetadata {
  regions: string[];
  priority: number;
  tags: string[];
  notes: string;
  lastDiscovery: string | null;
  lastHealthCheck: string | null;
  lastBenchmark: string | null;
}

// ═══════════════════════════════════════════════════════════════
// Capability Registry
// ═══════════════════════════════════════════════════════════════

export class ProviderCapabilityRegistry {
  private descriptors: Map<string, ProviderDescriptor> = new Map();

  constructor(descriptors: ProviderDescriptor[]) {
    for (const d of descriptors) this.descriptors.set(d.id, d);
  }

  getDescriptor(providerId: string): ProviderDescriptor | undefined {
    return this.descriptors.get(providerId);
  }

  getAllDescriptors(): ProviderDescriptor[] {
    return Array.from(this.descriptors.values());
  }

  supportsChat(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.chat ?? false; }
  supportsVision(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.vision ?? false; }
  supportsEmbedding(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.embedding ?? false; }
  supportsStreaming(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.streaming ?? false; }
  supportsToolCalling(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.toolCalling ?? false; }
  supportsJsonMode(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.jsonMode ?? false; }
  supportsAudio(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.speech ?? false; }
  supportsVideo(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.video ?? false; }
  supportsReasoning(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.reasoning ?? false; }
  supportsImage(providerId: string): boolean { return this.descriptors.get(providerId)?.capabilities.image ?? false; }

  getProvidersByCapability(capability: keyof ProviderCapabilities): string[] {
    return Array.from(this.descriptors.entries())
      .filter(([_, d]) => d.capabilities[capability])
      .map(([id]) => id);
  }

  getProvidersByProtocol(protocol: ProviderProtocol): string[] {
    return Array.from(this.descriptors.entries())
      .filter(([_, d]) => d.protocol === protocol)
      .map(([id]) => id);
  }

  getProvidersByStatus(status: ProviderStatus): string[] {
    return Array.from(this.descriptors.entries())
      .filter(([_, d]) => d.status === status)
      .map(([id]) => id);
  }
}

// ═══════════════════════════════════════════════════════════════
// Model Registry
// ═══════════════════════════════════════════════════════════════

export interface RegisteredModel {
  id: string;
  providerId: string;
  displayName: string;
  source: 'static' | 'dynamic' | 'override';
  capabilities: ModelCapability | null;
  discoveredAt: string | null;
  lastVerified: string | null;
}

export class ProviderModelRegistry {
  private models: Map<string, RegisteredModel[]> = new Map();

  constructor() {
    this.loadStaticModels();
  }

  private loadStaticModels(): void {
    for (const def of PROVIDER_CATALOG) {
      const models: RegisteredModel[] = def.models.map(id => ({
        id,
        providerId: def.id,
        displayName: id,
        source: 'static' as const,
        capabilities: MODEL_CAPABILITIES.find(c => c.id === id && c.provider === def.id) ?? null,
        discoveredAt: null,
        lastVerified: null,
      }));
      this.models.set(def.id, models);
    }
  }

  getModels(providerId: string): RegisteredModel[] {
    return [...(this.models.get(providerId) ?? [])];
  }

  getAllModels(): RegisteredModel[] {
    return Array.from(this.models.values()).flat();
  }

  getModel(providerId: string, modelId: string): RegisteredModel | undefined {
    return this.getModels(providerId).find(m => m.id === modelId);
  }

  addDynamicModel(providerId: string, modelId: string, displayName?: string): void {
    const existing = this.getModels(providerId);
    if (existing.some(m => m.id === modelId)) return;
    existing.push({
      id: modelId, providerId, displayName: displayName ?? modelId,
      source: 'dynamic', capabilities: null, discoveredAt: new Date().toISOString(), lastVerified: null,
    });
    this.models.set(providerId, existing);
  }

  addOverride(providerId: string, modelId: string, displayName: string): void {
    const existing = this.getModels(providerId);
    const idx = existing.findIndex(m => m.id === modelId);
    const entry: RegisteredModel = {
      id: modelId, providerId, displayName, source: 'override',
      capabilities: MODEL_CAPABILITIES.find(c => c.id === modelId && c.provider === providerId) ?? null,
      discoveredAt: null, lastVerified: new Date().toISOString(),
    };
    if (idx >= 0) existing[idx] = entry; else existing.push(entry);
    this.models.set(providerId, existing);
  }

  getModelsByCapability(capability: keyof ModelCapability): RegisteredModel[] {
    return this.getAllModels().filter(m => m.capabilities && m.capabilities[capability]);
  }

  getModelsByProvider(providerId: string): RegisteredModel[] {
    return this.getModels(providerId);
  }

  searchModels(query: string): RegisteredModel[] {
    const q = query.toLowerCase();
    return this.getAllModels().filter(m =>
      m.id.toLowerCase().includes(q) || m.displayName.toLowerCase().includes(q) || m.providerId.toLowerCase().includes(q)
    );
  }
}

// ═══════════════════════════════════════════════════════════════
// Certification
// ═══════════════════════════════════════════════════════════════

export type CertificationStatus = 'UNKNOWN' | 'EXPERIMENTAL' | 'PARTIAL' | 'CERTIFIED' | 'DEPRECATED' | 'FAILED';

export interface ProviderCertification {
  providerId: string;
  status: CertificationStatus;
  chat: CertificationStatus;
  streaming: CertificationStatus;
  vision: CertificationStatus;
  toolCalling: CertificationStatus;
  jsonMode: CertificationStatus;
  embedding: CertificationStatus;
  health: CertificationStatus;
  quota: CertificationStatus;
  benchmark: CertificationStatus;
  discovery: CertificationStatus;
  lastCertified: string | null;
  notes: string;
}

export class ProviderCertificationRegistry {
  private certifications: Map<string, ProviderCertification> = new Map();

  constructor() {
    for (const def of PROVIDER_CATALOG) {
      this.certifications.set(def.id, {
        providerId: def.id, status: 'UNKNOWN',
        chat: 'UNKNOWN', streaming: 'UNKNOWN', vision: 'UNKNOWN', toolCalling: 'UNKNOWN',
        jsonMode: 'UNKNOWN', embedding: 'UNKNOWN', health: 'UNKNOWN', quota: 'UNKNOWN',
        benchmark: 'UNKNOWN', discovery: 'UNKNOWN', lastCertified: null, notes: '',
      });
    }
  }

  getCertification(providerId: string): ProviderCertification | undefined {
    return this.certifications.get(providerId);
  }

  getAllCertifications(): ProviderCertification[] {
    return Array.from(this.certifications.values());
  }

  updateCertification(providerId: string, updates: Partial<ProviderCertification>): void {
    const existing = this.certifications.get(providerId);
    if (!existing) return;
    Object.assign(existing, updates, { lastCertified: new Date().toISOString() });
  }

  getProvidersByStatus(status: CertificationStatus): string[] {
    return Array.from(this.certifications.entries())
      .filter(([_, c]) => c.status === status)
      .map(([id]) => id);
  }
}

// ═══════════════════════════════════════════════════════════════
// Discovery History
// ═══════════════════════════════════════════════════════════════

export interface DiscoveryRecord {
  id: string;
  providerId: string;
  modelsDiscovered: number;
  newModels: string[];
  removedModels: string[];
  source: 'static' | 'api' | 'manual';
  discoveredAt: string;
  dryRun: boolean;
}

export class DiscoveryHistory {
  private history: DiscoveryRecord[] = [];

  addRecord(record: Omit<DiscoveryRecord, 'id' | 'discoveredAt'>): DiscoveryRecord {
    const entry: DiscoveryRecord = {
      ...record,
      id: `disc_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      discoveredAt: new Date().toISOString(),
    };
    this.history.push(entry);
    return entry;
  }

  getHistory(providerId?: string, limit = 50): DiscoveryRecord[] {
    let records = providerId ? this.history.filter(r => r.providerId === providerId) : this.history;
    return records.slice(-limit);
  }

  getLatest(providerId: string): DiscoveryRecord | undefined {
    const records = this.history.filter(r => r.providerId === providerId);
    return records[records.length - 1];
  }
}

// ═══════════════════════════════════════════════════════════════
// Build Descriptors from Catalog
// ═══════════════════════════════════════════════════════════════

function inferProtocol(adapter: string): ProviderProtocol {
  const map: Record<string, ProviderProtocol> = {
    openai: 'openai', anthropic: 'anthropic', gemini: 'gemini', mistral: 'mistral',
    cohere: 'cohere', deepseek: 'deepseek', xai: 'xai', together: 'together',
    fireworks: 'fireworks', replicate: 'replicate', ollama: 'ollama', lmstudio: 'lmstudio', vllm: 'vllm',
  };
  return map[adapter] ?? 'custom';
}

function inferAuth(def: ProviderDef): ProviderAuth {
  if (!def.requiresKey) return 'local';
  return 'apiKey';
}

function inferCapabilities(def: ProviderDef): ProviderCapabilities {
  const models = MODEL_CAPABILITIES.filter(m => m.provider === def.id);
  const has = (fn: (m: ModelCapability) => boolean) => models.some(fn);
  return {
    chat: has(m => m.chat),
    vision: has(m => m.vision),
    image: has(m => m.imageGeneration),
    video: false,
    embedding: has(m => m.embeddings),
    rerank: false,
    speech: false,
    tts: false,
    moderation: false,
    streaming: has(m => m.streaming),
    toolCalling: has(m => m.tools),
    jsonMode: true,
    reasoning: has(m => m.reasoning),
  };
}

function inferFeatures(def: ProviderDef): ProviderFeatures {
  return {
    dynamicModels: !def.requiresKey || ['openai', 'anthropic', 'google', 'mistral', 'groq'].includes(def.id),
    healthCheck: true,
    quota: def.requiresKey,
    cost: true,
    multiAccount: true,
    fallback: true,
    benchmark: true,
  };
}

export function buildProviderDescriptors(): ProviderDescriptor[] {
  return PROVIDER_CATALOG.map(def => ({
    id: def.id,
    displayName: def.name,
    vendor: def.name.split(' ')[0],
    protocol: inferProtocol(def.adapter),
    auth: inferAuth(def),
    baseUrl: def.baseUrl,
    homepage: '',
    documentation: '',
    icon: '',
    status: 'active' as const,
    tier: def.tier,
    envKey: def.envKey,
    requiresKey: def.requiresKey,
    description: def.description,
    capabilities: inferCapabilities(def),
    features: inferFeatures(def),
    metadata: { regions: [], priority: 0, tags: [def.tier], notes: '', lastDiscovery: null, lastHealthCheck: null, lastBenchmark: null },
  }));
}

// ═══════════════════════════════════════════════════════════════
// Singleton instances
// ═══════════════════════════════════════════════════════════════

let _capabilityRegistry: ProviderCapabilityRegistry | null = null;
let _modelRegistry: ProviderModelRegistry | null = null;
let _certificationRegistry: ProviderCertificationRegistry | null = null;
let _discoveryHistory: DiscoveryHistory | null = null;

export function getCapabilityRegistry(): ProviderCapabilityRegistry {
  if (!_capabilityRegistry) _capabilityRegistry = new ProviderCapabilityRegistry(buildProviderDescriptors());
  return _capabilityRegistry;
}

export function getModelRegistry(): ProviderModelRegistry {
  if (!_modelRegistry) _modelRegistry = new ProviderModelRegistry();
  return _modelRegistry;
}

export function getCertificationRegistry(): ProviderCertificationRegistry {
  if (!_certificationRegistry) _certificationRegistry = new ProviderCertificationRegistry();
  return _certificationRegistry;
}

export function getDiscoveryHistory(): DiscoveryHistory {
  if (!_discoveryHistory) _discoveryHistory = new DiscoveryHistory();
  return _discoveryHistory;
}
