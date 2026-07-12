// 8Router — Canonical Experiment Sampler (Phase 2H)
// Deterministic sampling using request ID + user ID + access key ID.

import { createHash } from 'crypto';
import type { CanonicalExperimentConfig } from './types.js';

/**
 * Deterministic sampling: hash(requestId + userId + accessKeyId) → [0, 1) bucket.
 * Same inputs always yield the same result. No randomness.
 */
export function isEligibleForExperiment(
  requestId: string,
  userId: string | undefined,
  accessKeyId: string | undefined,
  config: CanonicalExperimentConfig,
  sampleRate: number,
): boolean {
  // Allowlist overrides sampling
  if (userId && config.userAllowlist.includes(userId)) return true;
  if (accessKeyId && config.accessKeyAllowlist.includes(accessKeyId)) return true;

  // No sampling if rate is 0
  if (sampleRate <= 0) return false;

  // Deterministic hash
  const key = [requestId, userId || '', accessKeyId || ''].join(':');
  const hash = createHash('sha256').update(key).digest('hex');
  const bucket = parseInt(hash.slice(0, 8), 16) / 0xffffffff;
  return bucket < sampleRate;
}
