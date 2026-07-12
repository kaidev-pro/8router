// 8Router — Canonical Experiment barrel (Phase 3A)

export type {
  CanonicalRuntimeMode,
  CanonicalExperimentConfig,
  CanonicalMismatchKind,
  MismatchSeverity,
  CanonicalComparisonResult,
  CanonicalExperimentState,
  CanonicalExperimentLog,
  CanonicalMetrics,
  ReadinessGateStatus,
  ReadinessGateResult,
  ShadowReadinessReport,
  CanonicalAlertEvent,
  CanonicalAlertPayload,
} from './types.js';

export {
  CRITICAL_MISMATCH_KINDS,
  DEFAULT_EXPERIMENT_CONFIG,
} from './types.js';

export {
  loadCanonicalExperimentConfig,
  getCanonicalExperimentConfig,
  reloadCanonicalExperimentConfig,
  loadShadowProductionConfig,
  getShadowProductionConfig,
  reloadShadowProductionConfig,
  resetCanonicalExperimentConfig,
} from './config.js';
export type { ShadowProductionConfig } from './config.js';

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
  triggerManualDisable,
  resetState,
  recordCoverage,
  recordCriticalMismatch,
  recordComparisonLatency,
  recordLogWriteFailure,
  getCoverageByProvider,
  getCoverageByModel,
  getCoverageByAlias,
  getCoverageByAccessKey,
  getStreamingComparisons,
  getToolCallComparisons,
  getFallbackComparisons,
  getTokenSaverComparisons,
  getCriticalMismatchCount,
  getExperimentLogWriteFailures,
  getAutoDisableEvents,
  getManualDisableEvents,
  getComparisonLatencyPercentiles,
  getFirstRequestAt,
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
  getMismatchSeverity,
  resetMetrics,
} from './metrics.js';

export { checkAutoDisable } from './auto-disable.js';

export { runShadow } from './shadow.js';

export { decideCanary, recordCanarySuccess, recordCanaryFailure } from './canary.js';

export { generateReadinessReport, exportReadinessMarkdown } from './readiness.js';

export { fireAlert } from './alerts.js';

export { cleanupExpiredExperimentLogs, getRetentionStats } from './retention.js';
