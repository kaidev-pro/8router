// 8Router — Canonical Experiment Metrics (Phase 3A)
// Aggregate metrics for the canonical runtime experiment with coverage tracking.

import type { CanonicalMetrics, CanonicalMismatchKind, MismatchSeverity } from './types.js';
import { CRITICAL_MISMATCH_KINDS } from './types.js';
import {
  getState,
  getCoverageByProvider, getCoverageByModel, getCoverageByAlias, getCoverageByAccessKey,
  getStreamingComparisons, getToolCallComparisons, getFallbackComparisons, getTokenSaverComparisons,
  getCriticalMismatchCount, getExperimentLogWriteFailures, getAutoDisableEvents, getManualDisableEvents,
  getComparisonLatencyPercentiles,
} from './state.js';

export function computeMetrics(): CanonicalMetrics {
  const s = getState();
  const lat = getComparisonLatencyPercentiles();
  const critCount = getCriticalMismatchCount();
  return {
    requestsObserved: s.requestsObserved,
    shadowRequests: s.shadowRequests,
    canaryRequests: s.canaryRequests,
    legacyFallbacks: s.legacyFallbacks,
    matchRate: s.requestsObserved > 0 ? (s.requestsObserved - s.mismatchCount) / s.requestsObserved : 1,
    mismatchRate: s.mismatchRate,
    canonicalFailureRate: s.requestsObserved > 0 ? s.canonicalFailures / s.requestsObserved : 0,
    averageComparisonLatencyMs: 0, // computed from logs
    averageOverheadMs: 0, // computed from logs
    topMismatchKinds: getTopMismatchKinds(),
    criticalMismatchCount: critCount,
    nonCriticalMismatchCount: s.mismatchCount - critCount,
    requestsByProvider: getCoverageByProvider(),
    requestsByModel: getCoverageByModel(),
    requestsByAlias: getCoverageByAlias(),
    requestsByAccessKey: getCoverageByAccessKey(),
    streamingComparisons: getStreamingComparisons(),
    toolCallComparisons: getToolCallComparisons(),
    fallbackComparisons: getFallbackComparisons(),
    tokenSaverComparisons: getTokenSaverComparisons(),
    comparisonLatencyP50Ms: lat.p50,
    comparisonLatencyP95Ms: lat.p95,
    comparisonLatencyP99Ms: lat.p99,
    experimentLogWriteFailures: getExperimentLogWriteFailures(),
    autoDisableEvents: getAutoDisableEvents(),
    manualDisableEvents: getManualDisableEvents(),
  };
}

// In-memory counters for mismatch kinds
const kindCounts = new Map<CanonicalMismatchKind, number>();

export function recordMismatchKind(kind: CanonicalMismatchKind): void {
  kindCounts.set(kind, (kindCounts.get(kind) || 0) + 1);
}

export function getTopMismatchKinds(limit = 10): Array<{ kind: CanonicalMismatchKind; count: number }> {
  return Array.from(kindCounts.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([kind, count]) => ({ kind, count }));
}

export function getMismatchSeverity(kind: CanonicalMismatchKind): MismatchSeverity {
  if (CRITICAL_MISMATCH_KINDS.includes(kind)) return 'critical';
  return 'warning';
}

export function resetMetrics(): void {
  kindCounts.clear();
}
