// 8Router — Provider Health Barrel Exports (Phase 2D)

export type { HealthStatus, CircuitState, FailureType, ProviderHealthRecord, RecordInput, ClassifierResult } from './types.js';
export { CIRCUIT_DEFAULTS } from './types.js';
export { classifyProviderError } from './classify-error.js';
export { getCircuitConfig, shouldOpenCircuit, isCircuitOpen, shouldTransitionToHalfOpen, computeCooldownUntil, shouldCloseCircuit } from './circuit-breaker.js';
export { getProviderHealth, recordProviderSuccess, recordProviderFailure, shouldSkipProvider, resetProviderHealth, getUserHealthSummary } from './manager.js';
