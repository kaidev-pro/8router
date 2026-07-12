// 8Router — Canonical Experiment State (Phase 3A)
// In-memory experiment state with safe aggregate persistence and coverage tracking.

import type { CanonicalRuntimeMode, CanonicalExperimentState } from './types.js';

let state: CanonicalExperimentState = {
  mode: 'off',
  enabled: true,
  autoDisabled: false,
  requestsObserved: 0,
  shadowRequests: 0,
  canaryRequests: 0,
  legacyFallbacks: 0,
  canonicalFailures: 0,
  mismatchCount: 0,
  mismatchRate: 0,
  updatedAt: new Date().toISOString(),
};

// ── Phase 3A: Coverage Tracking ──────────────────────────────

const coverageByProvider = new Map<string, number>();
const coverageByModel = new Map<string, number>();
const coverageByAlias = new Map<string, number>();
const coverageByAccessKey = new Map<string, number>();

let streamingComparisons = 0;
let toolCallComparisons = 0;
let fallbackComparisons = 0;
let tokenSaverComparisons = 0;
let criticalMismatchCount = 0;
let experimentLogWriteFailures = 0;
let autoDisableEvents = 0;
let manualDisableEvents = 0;

// Latency percentile tracking (sorted array of recent latencies)
const comparisonLatencies: number[] = [];
const MAX_LATENCY_SAMPLES = 10000;

// First-seen timestamps for coverage
let firstRequestAt: string | null = null;

export function getState(): CanonicalExperimentState {
  return { ...state };
}

export function updateMode(mode: CanonicalRuntimeMode): void {
  state.mode = mode;
  state.updatedAt = new Date().toISOString();
}

export function setEnabled(enabled: boolean): void {
  state.enabled = enabled;
  state.updatedAt = new Date().toISOString();
}

export function recordObservation(): void {
  state.requestsObserved++;
  state.updatedAt = new Date().toISOString();
  if (!firstRequestAt) firstRequestAt = new Date().toISOString();
}

export function recordShadow(): void {
  state.shadowRequests++;
  state.updatedAt = new Date().toISOString();
}

export function recordCanary(): void {
  state.canaryRequests++;
  state.updatedAt = new Date().toISOString();
}

export function recordMismatch(): void {
  state.mismatchCount++;
  state.mismatchRate = state.requestsObserved > 0
    ? state.mismatchCount / state.requestsObserved
    : 0;
  state.lastMismatchAt = new Date().toISOString();
  state.updatedAt = state.lastMismatchAt;
}

export function recordCanonicalFailure(): void {
  state.canonicalFailures++;
  state.lastCanonicalFailureAt = new Date().toISOString();
  state.updatedAt = state.lastCanonicalFailureAt;
}

export function recordLegacyFallback(): void {
  state.legacyFallbacks++;
  state.updatedAt = new Date().toISOString();
}

export function triggerAutoDisable(reason: string): void {
  state.autoDisabled = true;
  state.enabled = false;
  state.autoDisabledAt = new Date().toISOString();
  state.autoDisableReason = reason;
  state.updatedAt = state.autoDisabledAt;
  autoDisableEvents++;
  console.warn(`[canonical-experiment] AUTO-DISABLED: ${reason}`);
}

export function triggerManualDisable(): void {
  state.enabled = false;
  manualDisableEvents++;
  state.updatedAt = new Date().toISOString();
}

// ── Phase 3A: Coverage Recording ─────────────────────────────

export function recordCoverage(opts: {
  provider?: string;
  model?: string;
  alias?: string;
  accessKeyHint?: string;
  isStreaming?: boolean;
  hasToolCalls?: boolean;
  isFallback?: boolean;
  hasTokenSaver?: boolean;
}): void {
  if (opts.provider) coverageByProvider.set(opts.provider, (coverageByProvider.get(opts.provider) || 0) + 1);
  if (opts.model) coverageByModel.set(opts.model, (coverageByModel.get(opts.model) || 0) + 1);
  if (opts.alias) coverageByAlias.set(opts.alias, (coverageByAlias.get(opts.alias) || 0) + 1);
  if (opts.accessKeyHint) coverageByAccessKey.set(opts.accessKeyHint, (coverageByAccessKey.get(opts.accessKeyHint) || 0) + 1);
  if (opts.isStreaming) streamingComparisons++;
  if (opts.hasToolCalls) toolCallComparisons++;
  if (opts.isFallback) fallbackComparisons++;
  if (opts.hasTokenSaver) tokenSaverComparisons++;
}

export function recordCriticalMismatch(): void {
  criticalMismatchCount++;
}

export function recordComparisonLatency(latencyMs: number): void {
  comparisonLatencies.push(latencyMs);
  if (comparisonLatencies.length > MAX_LATENCY_SAMPLES) {
    comparisonLatencies.splice(0, comparisonLatencies.length - MAX_LATENCY_SAMPLES);
  }
}

export function recordLogWriteFailure(): void {
  experimentLogWriteFailures++;
}

// ── Phase 3A: Coverage Getters ───────────────────────────────

export function getCoverageByProvider(): Record<string, number> {
  return Object.fromEntries(coverageByProvider);
}

export function getCoverageByModel(): Record<string, number> {
  return Object.fromEntries(coverageByModel);
}

export function getCoverageByAlias(): Record<string, number> {
  return Object.fromEntries(coverageByAlias);
}

export function getCoverageByAccessKey(): Record<string, number> {
  return Object.fromEntries(coverageByAccessKey);
}

export function getStreamingComparisons(): number { return streamingComparisons; }
export function getToolCallComparisons(): number { return toolCallComparisons; }
export function getFallbackComparisons(): number { return fallbackComparisons; }
export function getTokenSaverComparisons(): number { return tokenSaverComparisons; }
export function getCriticalMismatchCount(): number { return criticalMismatchCount; }
export function getExperimentLogWriteFailures(): number { return experimentLogWriteFailures; }
export function getAutoDisableEvents(): number { return autoDisableEvents; }
export function getManualDisableEvents(): number { return manualDisableEvents; }
export function getFirstRequestAt(): string | null { return firstRequestAt; }

// ── Phase 3A: Latency Percentiles ────────────────────────────

export function getComparisonLatencyPercentiles(): { p50: number | null; p95: number | null; p99: number | null } {
  if (comparisonLatencies.length === 0) return { p50: null, p95: null, p99: null };
  const sorted = [...comparisonLatencies].sort((a, b) => a - b);
  const p = (n: number) => sorted[Math.min(Math.floor(sorted.length * n), sorted.length - 1)];
  return { p50: p(0.50), p95: p(0.95), p99: p(0.99) };
}

export function resetState(): void {
  state = {
    mode: 'off',
    enabled: true,
    autoDisabled: false,
    requestsObserved: 0,
    shadowRequests: 0,
    canaryRequests: 0,
    legacyFallbacks: 0,
    canonicalFailures: 0,
    mismatchCount: 0,
    mismatchRate: 0,
    updatedAt: new Date().toISOString(),
  };
  coverageByProvider.clear();
  coverageByModel.clear();
  coverageByAlias.clear();
  coverageByAccessKey.clear();
  streamingComparisons = 0;
  toolCallComparisons = 0;
  fallbackComparisons = 0;
  tokenSaverComparisons = 0;
  criticalMismatchCount = 0;
  experimentLogWriteFailures = 0;
  autoDisableEvents = 0;
  manualDisableEvents = 0;
  comparisonLatencies.length = 0;
  firstRequestAt = null;
}
