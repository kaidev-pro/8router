// 8Router — Canonical Experiment Auto-Disable (Phase 2H)
// Kill switch: auto-disable canary when thresholds are breached.

import type { CanonicalExperimentConfig } from './types.js';
import { getState, triggerAutoDisable } from './state.js';

/**
 * Check auto-disable conditions.
 * Returns true if auto-disable was triggered.
 */
export function checkAutoDisable(config: CanonicalExperimentConfig): boolean {
  if (!config.autoDisable) return false;

  const state = getState();

  // Don't auto-disable if below minimum sample count
  if (state.requestsObserved < config.minSamplesBeforeAutoDisable) return false;

  // Mismatch rate threshold
  if (state.mismatchRate > config.mismatchThreshold) {
    triggerAutoDisable(`Mismatch rate ${(state.mismatchRate * 100).toFixed(2)}% exceeded threshold ${(config.mismatchThreshold * 100).toFixed(2)}%`);
    return true;
  }

  // Failure threshold
  const failureRate = state.requestsObserved > 0
    ? state.canonicalFailures / state.requestsObserved
    : 0;
  if (failureRate > config.failureThreshold) {
    triggerAutoDisable(`Canonical failure rate ${(failureRate * 100).toFixed(2)}% exceeded threshold ${(config.failureThreshold * 100).toFixed(2)}%`);
    return true;
  }

  return false;
}
