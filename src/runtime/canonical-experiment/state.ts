// 8Router — Canonical Experiment State (Phase 2H)
// In-memory experiment state with safe aggregate persistence.

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
  console.warn(`[canonical-experiment] AUTO-DISABLED: ${reason}`);
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
}
