// 8Router — Phase 5E Shadow Routing & Cutover Readiness
// Eligibility snapshot, shadow evaluation, canary controls, rollback, kill switch

import { buildProviderDescriptors, type ProviderDescriptor, getModelRegistry, getCertificationRegistry } from './provider-foundation.js';

// ═══════════════════════════════════════════════════════════════
// Feature Flags
// ═══════════════════════════════════════════════════════════════

export function isShadowEnabled(): boolean {
  return process.env.PROVIDER_SHADOW_ROUTING_ENABLED === 'true';
}

export function isCanaryEnabled(): boolean {
  return process.env.PROVIDER_CANARY_ROUTING_ENABLED === 'true';
}

export function isSnapshotActivationEnabled(): boolean {
  return process.env.PROVIDER_SNAPSHOT_ACTIVATION_ENABLED === 'true';
}

// ═══════════════════════════════════════════════════════════════
// Eligibility Snapshot
// ═══════════════════════════════════════════════════════════════

export type EligibilityReason = 'eligible' | 'no_descriptor' | 'no_models' | 'certification_expired' | 'certification_failed' | 'health_degraded' | 'disabled_by_policy' | 'no_capability';

export interface ProviderEligibility {
  providerId: string;
  eligible: boolean;
  reasons: EligibilityReason[];
  modelCount: number;
  certificationStatus: string;
  protocol: string;
  tier: string;
}

export interface EligibilitySnapshot {
  version: string;
  timestamp: string;
  providers: ProviderEligibility[];
  eligibleCount: number;
  totalCount: number;
  featureFlags: {
    shadow: boolean;
    canary: boolean;
    activation: boolean;
  };
}

export function buildEligibilitySnapshot(requiredCapability?: string): EligibilitySnapshot {
  const descriptors = buildProviderDescriptors();
  const certReg = getCertificationRegistry();
  const modelReg = getModelRegistry();

  const providers: ProviderEligibility[] = descriptors.map(d => {
    const reasons: EligibilityReason[] = [];
    const models = modelReg.getModels(d.id);
    const cert = certReg.getCertification(d.id);

    if (models.length === 0) reasons.push('no_models');
    if (cert?.status === 'FAILED') reasons.push('certification_failed');
    if (cert?.status === 'DEPRECATED') reasons.push('certification_expired');
    if (d.status === 'disabled') reasons.push('disabled_by_policy');
    if (requiredCapability && !(d.capabilities as any)[requiredCapability]) reasons.push('no_capability');

    if (reasons.length === 0) reasons.push('eligible');

    return {
      providerId: d.id,
      eligible: reasons[0] === 'eligible',
      reasons,
      modelCount: models.length,
      certificationStatus: cert?.status ?? 'UNKNOWN',
      protocol: d.protocol,
      tier: d.tier,
    };
  });

  return {
    version: `snap_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    timestamp: new Date().toISOString(),
    providers,
    eligibleCount: providers.filter(p => p.eligible).length,
    totalCount: providers.length,
    featureFlags: {
      shadow: isShadowEnabled(),
      canary: isCanaryEnabled(),
      activation: isSnapshotActivationEnabled(),
    },
  };
}

// ═══════════════════════════════════════════════════════════════
// Shadow Evaluation
// ═══════════════════════════════════════════════════════════════

export interface ShadowRequest {
  requestId: string;
  providerId: string;
  modelId: string;
  timestamp: string;
}

export interface ShadowResult {
  requestId: string;
  providerId: string;
  modelId: string;
  sampled: boolean;
  sampleReason: string;
  simulatedLatencyMs: number;
  simulatedStatus: 'success' | 'error' | 'timeout' | 'skipped';
  primaryResponseUnchanged: boolean;
  timestamp: string;
}

export function evaluateShadow(request: ShadowRequest): ShadowResult {
  if (!isShadowEnabled()) {
    return {
      requestId: request.requestId,
      providerId: request.providerId,
      modelId: request.modelId,
      sampled: false,
      sampleReason: 'shadow_not_enabled',
      simulatedLatencyMs: 0,
      simulatedStatus: 'skipped',
      primaryResponseUnchanged: true,
      timestamp: new Date().toISOString(),
    };
  }

  // Deterministic sampling: hash-based, stable per requestId
  const hash = request.requestId.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const sampled = hash % 10 === 0; // 10% sample rate

  return {
    requestId: request.requestId,
    providerId: request.providerId,
    modelId: request.modelId,
    sampled,
    sampleReason: sampled ? 'deterministic_hash' : 'below_threshold',
    simulatedLatencyMs: sampled ? Math.floor(Math.random() * 100) + 50 : 0,
    simulatedStatus: sampled ? 'success' : 'skipped',
    primaryResponseUnchanged: true,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// Canary Controls
// ═══════════════════════════════════════════════════════════════

export type CanaryState = 'inactive' | 'active' | 'paused' | 'completed' | 'aborted';

export interface CanaryConfig {
  id: string;
  providerId: string;
  modelId: string;
  maxTrafficPercent: number;
  maxRequestCount: number;
  windowMs: number;
  abortThresholdPercent: number;
  eligibleCohorts: string[];
  state: CanaryState;
  createdAt: string;
  updatedAt: string;
  expiresAt: string;
  snapshotVersion: string;
  requestCount: number;
  errorCount: number;
}

export interface CanaryResult {
  canaryId: string;
  allowed: boolean;
  reason: string;
  currentTrafficPercent: number;
  state: CanaryState;
}

const canaries: CanaryConfig[] = [];

export function createCanary(config: Omit<CanaryConfig, 'state' | 'createdAt' | 'updatedAt' | 'requestCount' | 'errorCount'>): { success: boolean; canary?: CanaryConfig; error?: string } {
  if (!isCanaryEnabled()) return { success: false, error: 'Canary not enabled. Set PROVIDER_CANARY_ROUTING_ENABLED=true' };
  const canary: CanaryConfig = {
    ...config,
    state: 'inactive',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    requestCount: 0,
    errorCount: 0,
  };
  canaries.push(canary);
  return { success: true, canary };
}

export function activateCanary(canaryId: string): { success: boolean; error?: string } {
  const canary = canaries.find(c => c.id === canaryId);
  if (!canary) return { success: false, error: 'Canary not found' };
  if (!isCanaryEnabled()) return { success: false, error: 'Canary not enabled' };
  if (canary.state !== 'inactive') return { success: false, error: `Cannot activate canary in state: ${canary.state}` };
  canary.state = 'active';
  canary.updatedAt = new Date().toISOString();
  return { success: true };
}

export function evaluateCanary(canaryId: string, cohort?: string): CanaryResult {
  const canary = canaries.find(c => c.id === canaryId);
  if (!canary) return { canaryId, allowed: false, reason: 'canary_not_found', currentTrafficPercent: 0, state: 'inactive' };
  if (!isCanaryEnabled()) return { canaryId, allowed: false, reason: 'canary_not_enabled', currentTrafficPercent: 0, state: canary.state };
  if (canary.state !== 'active') return { canaryId, allowed: false, reason: `canary_${canary.state}`, currentTrafficPercent: 0, state: canary.state };

  // Check expiry
  if (new Date(canary.expiresAt) < new Date()) {
    canary.state = 'completed';
    canary.updatedAt = new Date().toISOString();
    return { canaryId, allowed: false, reason: 'canary_expired', currentTrafficPercent: 0, state: 'completed' };
  }

  // Check cohort
  if (cohort && canary.eligibleCohorts.length > 0 && !canary.eligibleCohorts.includes(cohort)) {
    return { canaryId, allowed: false, reason: 'cohort_not_eligible', currentTrafficPercent: 0, state: canary.state };
  }

  // Check limits
  const trafficPercent = canary.maxRequestCount > 0 ? (canary.requestCount / canary.maxRequestCount) * 100 : 0;
  if (canary.requestCount >= canary.maxRequestCount) {
    return { canaryId, allowed: false, reason: 'request_limit_reached', currentTrafficPercent: trafficPercent, state: canary.state };
  }

  // Check abort threshold
  const errorRate = canary.requestCount > 0 ? (canary.errorCount / canary.requestCount) * 100 : 0;
  if (errorRate > canary.abortThresholdPercent) {
    canary.state = 'aborted';
    canary.updatedAt = new Date().toISOString();
    return { canaryId, allowed: false, reason: 'abort_threshold_exceeded', currentTrafficPercent: trafficPercent, state: 'aborted' };
  }

  canary.requestCount++;
  canary.updatedAt = new Date().toISOString();

  return { canaryId, allowed: true, reason: 'within_limits', currentTrafficPercent: trafficPercent, state: canary.state };
}

export function pauseCanary(canaryId: string): { success: boolean; error?: string } {
  const canary = canaries.find(c => c.id === canaryId);
  if (!canary) return { success: false, error: 'Canary not found' };
  if (canary.state !== 'active') return { success: false, error: `Cannot pause canary in state: ${canary.state}` };
  canary.state = 'paused';
  canary.updatedAt = new Date().toISOString();
  return { success: true };
}

export function abortCanary(canaryId: string): { success: boolean; error?: string } {
  const canary = canaries.find(c => c.id === canaryId);
  if (!canary) return { success: false, error: 'Canary not found' };
  canary.state = 'aborted';
  canary.updatedAt = new Date().toISOString();
  return { success: true };
}

export function getCanary(canaryId: string): CanaryConfig | undefined {
  return canaries.find(c => c.id === canaryId);
}

export function getCanaries(providerId?: string): CanaryConfig[] {
  return providerId ? canaries.filter(c => c.providerId === providerId) : [...canaries];
}

// ═══════════════════════════════════════════════════════════════
// Rollback
// ═══════════════════════════════════════════════════════════════

export interface RollbackResult {
  success: boolean;
  previousSnapshotVersion: string | null;
  newSnapshotVersion: string;
  canariesAborted: string[];
  timestamp: string;
}

export function rollbackToLastKnownGood(): RollbackResult {
  // Abort all active canaries
  const aborted = canaries.filter(c => c.state === 'active').map(c => {
    c.state = 'aborted';
    c.updatedAt = new Date().toISOString();
    return c.id;
  });

  const snapshot = buildEligibilitySnapshot();

  return {
    success: true,
    previousSnapshotVersion: null, // In-memory, no persisted version to roll back to
    newSnapshotVersion: snapshot.version,
    canariesAborted: aborted,
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// Kill Switch
// ═══════════════════════════════════════════════════════════════

let killSwitchActive = false;

export function activateKillSwitch(): { success: boolean; timestamp: string } {
  killSwitchActive = true;
  // Abort all canaries
  for (const c of canaries) {
    if (c.state === 'active') {
      c.state = 'aborted';
      c.updatedAt = new Date().toISOString();
    }
  }
  return { success: true, timestamp: new Date().toISOString() };
}

export function isKillSwitchActive(): boolean {
  return killSwitchActive;
}

export function resetKillSwitch(): void {
  killSwitchActive = false;
}

// ═══════════════════════════════════════════════════════════════
// Readiness Scoring
// ═══════════════════════════════════════════════════════════════

export interface ReadinessComponent {
  name: string;
  status: 'pass' | 'fail' | 'warn' | 'not_tested';
  detail: string;
}

export interface ReadinessReport {
  providerId: string;
  components: ReadinessComponent[];
  ready: boolean;
  blockers: string[];
  timestamp: string;
}

export function assessReadiness(providerId: string): ReadinessReport {
  const descriptors = buildProviderDescriptors();
  const d = descriptors.find(p => p.id === providerId);
  const certReg = getCertificationRegistry();
  const modelReg = getModelRegistry();

  const components: ReadinessComponent[] = [];
  const blockers: string[] = [];

  // Descriptor
  components.push({
    name: 'descriptor',
    status: d ? 'pass' : 'fail',
    detail: d ? `${d.displayName} (${d.protocol})` : 'Provider not found',
  });
  if (!d) blockers.push('descriptor');

  // Models
  const models = d ? modelReg.getModels(d.id) : [];
  components.push({
    name: 'models',
    status: models.length > 0 ? 'pass' : 'warn',
    detail: `${models.length} models`,
  });

  // Certification
  const cert = d ? certReg.getCertification(d.id) : undefined;
  components.push({
    name: 'certification',
    status: cert?.status === 'CERTIFIED' ? 'pass' : cert?.status === 'FAILED' ? 'fail' : 'warn',
    detail: cert?.status ?? 'UNKNOWN',
  });
  if (cert?.status === 'FAILED') blockers.push('certification_failed');

  // Shadow
  components.push({
    name: 'shadow_routing',
    status: isShadowEnabled() ? 'pass' : 'warn',
    detail: isShadowEnabled() ? 'enabled' : 'disabled',
  });

  // Canary
  components.push({
    name: 'canary_controls',
    status: isCanaryEnabled() ? 'pass' : 'warn',
    detail: isCanaryEnabled() ? 'enabled' : 'disabled',
  });

  // Kill switch
  components.push({
    name: 'kill_switch',
    status: 'pass',
    detail: isKillSwitchActive() ? 'ACTIVE' : 'standby',
  });

  return {
    providerId,
    components,
    ready: blockers.length === 0,
    blockers,
    timestamp: new Date().toISOString(),
  };
}
