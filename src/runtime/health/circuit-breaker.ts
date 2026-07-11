// 8Router — Circuit Breaker (Phase 2D)

import type { CircuitState, CIRCUIT_DEFAULTS } from './types.js';

const THRESHOLD = parseInt(process.env.CIRCUIT_FAILURE_THRESHOLD || '3', 10);
const COOLDOWN   = parseInt(process.env.CIRCUIT_COOLDOWN_MS || '60000', 10);
const HALF_OPEN_SUCCESSES = parseInt(process.env.CIRCUIT_HALF_OPEN_SUCCESS_THRESHOLD || '1', 10);

export function getCircuitConfig() {
  return {
    failureThreshold: THRESHOLD,
    cooldownMs: COOLDOWN,
    halfOpenSuccessThreshold: HALF_OPEN_SUCCESSES,
  };
}

export function shouldOpenCircuit(consecutiveFailures: number): boolean {
  return consecutiveFailures >= THRESHOLD;
}

export function isCircuitOpen(circuitState: CircuitState, cooldownUntil: string | null): boolean {
  if (circuitState !== 'open') return false;
  if (!cooldownUntil) return false;
  return new Date(cooldownUntil).getTime() > Date.now();
}

export function shouldTransitionToHalfOpen(
  circuitState: CircuitState,
  cooldownUntil: string | null
): boolean {
  if (circuitState !== 'open') return false;
  if (!cooldownUntil) return false;
  return new Date(cooldownUntil).getTime() <= Date.now();
}

export function computeCooldownUntil(retryAfterMs?: number): string {
  const ms = retryAfterMs && retryAfterMs > 0 && retryAfterMs < 600_000 ? retryAfterMs : COOLDOWN;
  return new Date(Date.now() + ms).toISOString();
}

export function shouldCloseCircuit(consecutiveSuccesses: number): boolean {
  return consecutiveSuccesses >= HALF_OPEN_SUCCESSES;
}
