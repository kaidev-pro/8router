// 8Router — Canonical Experiment Metrics (Phase 2H)
// Aggregate metrics for the canonical runtime experiment.

import type { CanonicalMetrics, CanonicalMismatchKind } from './types.js';
import { getState } from './state.js';

export function computeMetrics(): CanonicalMetrics {
  const s = getState();
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
    topMismatchKinds: [], // computed from logs
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

export function resetMetrics(): void {
  kindCounts.clear();
}
