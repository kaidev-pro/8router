// 8Router — Canonical Experiment barrel (Phase 2H)

export type {
  CanonicalRuntimeMode,
  CanonicalExperimentConfig,
  CanonicalMismatchKind,
  MismatchSeverity,
  CanonicalComparisonResult,
  CanonicalExperimentState,
  CanonicalExperimentLog,
  CanonicalMetrics,
} from './types.js';

export {
  CRITICAL_MISMATCH_KINDS,
  DEFAULT_EXPERIMENT_CONFIG,
} from './types.js';

export {
  loadCanonicalExperimentConfig,
  getCanonicalExperimentConfig,
  reloadCanonicalExperimentConfig,
} from './config.js';

export { isEligibleForExperiment } from './sampler.js';

export {
  getState,
  updateMode,
  setEnabled,
  recordObservation,
  recordShadow,
  recordCanary,
  recordMismatch,
  recordCanonicalFailure,
  recordLegacyFallback,
  triggerAutoDisable,
  resetState,
} from './state.js';

export {
  compareRequests,
  compareResponses,
  runComparison,
} from './compare.js';

export {
  normalizeRequestForComparison,
  normalizeResponseForComparison,
  normalizeFinishReason,
  hashText,
  fingerprint,
} from './normalize.js';

export {
  computeMetrics,
  recordMismatchKind,
  getTopMismatchKinds,
  resetMetrics,
} from './metrics.js';

export { checkAutoDisable } from './auto-disable.js';

export { runShadow } from './shadow.js';

export { decideCanary, recordCanarySuccess, recordCanaryFailure } from './canary.js';
