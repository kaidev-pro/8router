// 8Router — Canonical Experiment Types (Phase 2H)
// Structural types for the controlled canonical runtime experiment.

export type CanonicalRuntimeMode = 'off' | 'shadow' | 'canary' | 'enforced';

export interface CanonicalExperimentConfig {
  mode: CanonicalRuntimeMode;
  shadowSampleRate: number;
  canaryPercent: number;
  mismatchThreshold: number;
  autoDisable: boolean;
  compareStreaming: boolean;
  compareToolCalls: boolean;
  compareUsage: boolean;
  compareMetadata: boolean;
  userAllowlist: string[];
  accessKeyAllowlist: string[];
  minSamplesBeforeAutoDisable: number;
  failureThreshold: number;
  maxOverheadMs: number;
}

export type CanonicalMismatchKind =
  | 'request_role'
  | 'request_content_count'
  | 'request_tool_definition'
  | 'request_tool_choice'
  | 'request_model'
  | 'request_generation_config'
  | 'response_role'
  | 'response_text_length'
  | 'response_text_hash'
  | 'response_finish_reason'
  | 'response_tool_call_count'
  | 'response_tool_call_name'
  | 'response_tool_call_id'
  | 'response_tool_call_arguments_shape'
  | 'response_usage'
  | 'stream_event_order'
  | 'stream_delta_type'
  | 'stream_finish_reason'
  | 'unsupported_extension'
  | 'conversion_error'
  | 'unknown';

export type MismatchSeverity = 'info' | 'warning' | 'critical';

export const CRITICAL_MISMATCH_KINDS: CanonicalMismatchKind[] = [
  'request_role',
  'response_role',
  'response_tool_call_name',
  'response_tool_call_id',
  'response_finish_reason',
  'response_text_hash',
  'stream_event_order',
  'conversion_error',
];

export interface CanonicalComparisonResult {
  matched: boolean;
  requestMatched: boolean;
  responseMatched: boolean;
  streamMatched?: boolean;
  toolCallsMatched?: boolean;
  usageMatched?: boolean;
  metadataMatched?: boolean;
  mismatchKinds: CanonicalMismatchKind[];
  mismatchCount: number;
  safeSummary: Record<string, unknown>;
  legacyFingerprint?: string;
  canonicalFingerprint?: string;
  comparisonLatencyMs: number;
}

export interface CanonicalExperimentState {
  mode: CanonicalRuntimeMode;
  enabled: boolean;
  autoDisabled: boolean;
  autoDisabledAt?: string;
  autoDisableReason?: string;
  requestsObserved: number;
  shadowRequests: number;
  canaryRequests: number;
  legacyFallbacks: number;
  canonicalFailures: number;
  mismatchCount: number;
  mismatchRate: number;
  lastMismatchAt?: string;
  lastCanonicalFailureAt?: string;
  updatedAt: string;
}

export interface CanonicalExperimentLog {
  id: string;
  userId?: string;
  requestLogId?: string;
  accessKeyId?: string;
  mode: CanonicalRuntimeMode;
  sampled: boolean;
  eligible: boolean;
  skipReason?: string;
  requestMatched?: boolean;
  responseMatched?: boolean;
  streamMatched?: boolean;
  toolCallsMatched?: boolean;
  usageMatched?: boolean;
  metadataMatched?: boolean;
  mismatchCount: number;
  mismatchKinds?: string[];
  comparisonLatencyMs?: number;
  canonicalLatencyOverheadMs?: number;
  legacyFingerprint?: string;
  canonicalFingerprint?: string;
  canonicalFailure?: boolean;
  canonicalFailureType?: string;
  canonicalFailureMessage?: string;
  usedCanonicalPath?: boolean;
  fellBackToLegacy?: boolean;
  createdAt: string;
}

export interface CanonicalMetrics {
  requestsObserved: number;
  shadowRequests: number;
  canaryRequests: number;
  legacyFallbacks: number;
  matchRate: number;
  mismatchRate: number;
  canonicalFailureRate: number;
  averageComparisonLatencyMs: number;
  averageOverheadMs: number;
  topMismatchKinds: Array<{ kind: CanonicalMismatchKind; count: number }>;
}

export const DEFAULT_EXPERIMENT_CONFIG: CanonicalExperimentConfig = {
  mode: 'off',
  shadowSampleRate: 0,
  canaryPercent: 0,
  mismatchThreshold: 0.01,
  autoDisable: true,
  compareStreaming: true,
  compareToolCalls: true,
  compareUsage: true,
  compareMetadata: false,
  userAllowlist: [],
  accessKeyAllowlist: [],
  minSamplesBeforeAutoDisable: 50,
  failureThreshold: 0.02,
  maxOverheadMs: 100,
};
