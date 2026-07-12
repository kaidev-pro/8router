// 8Router — Canonical Experiment Canary (Phase 2H)
// Canary mode: run canonical path for a bounded percentage of requests.
// Falls back to legacy on any canonical failure.

import type { CanonicalExperimentConfig } from './types.js';
import { recordCanary, recordCanonicalFailure, recordLegacyFallback } from './state.js';
import { checkAutoDisable } from './auto-disable.js';

export interface CanaryDecision {
  useCanonical: boolean;
  reason: string;
}

/**
 * Decide whether this request should use the canonical runtime path.
 */
export function decideCanary(
  requestId: string,
  config: CanonicalExperimentConfig,
): CanaryDecision {
  recordCanary();

  // Auto-disable check
  if (checkAutoDisable(config)) {
    return { useCanonical: false, reason: 'auto_disabled' };
  }

  // Canary percent
  const hash = simpleHash(requestId);
  const bucket = (hash % 10000) / 100;
  if (bucket < config.canaryPercent) {
    return { useCanonical: true, reason: 'canary_sampled' };
  }

  return { useCanonical: false, reason: 'not_sampled' };
}

/**
 * Record a successful canary execution.
 */
export function recordCanarySuccess(): void {
  // Success — no fallback needed
}

/**
 * Record a canonical failure in canary mode — fall back to legacy.
 */
export function recordCanaryFailure(): void {
  recordCanonicalFailure();
  recordLegacyFallback();
}

/**
 * Simple deterministic hash for canary sampling.
 */
function simpleHash(input: string): number {
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    hash = ((hash << 5) - hash + input.charCodeAt(i)) | 0;
  }
  return Math.abs(hash);
}
