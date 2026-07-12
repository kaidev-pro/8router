// 8Router — Canonical Experiment Readiness Engine (Phase 3A)
// Evaluates shadow production validation gates and produces readiness reports.
// No raw content. No plaintext keys. Fingerprint-only.

import type {
  ShadowReadinessReport,
  ReadinessGateResult,
  ReadinessGateStatus,
  CanonicalMismatchKind,
} from './types.js';
import { CRITICAL_MISMATCH_KINDS } from './types.js';
import { getShadowProductionConfig } from './config.js';
import {
  getState,
  getCoverageByProvider, getCoverageByAlias,
  getCoverageByAccessKey,
  getCriticalMismatchCount,
  getComparisonLatencyPercentiles,
  getFirstRequestAt,
} from './state.js';
import { getTopMismatchKinds, getMismatchSeverity } from './metrics.js';

const KNOWN_PROVIDERS = [
  'openai', 'openrouter', 'groq', 'mistral', 'deepseek',
  'together', 'xai', 'ollama', 'anthropic', 'google',
];

const KNOWN_ALIASES = [
  '8router/auto', '8router/cheap', '8router/fast', '8router/smart',
  '8router/coding', '8router/local', '8router/creative', '8router/privacy',
];

/**
 * Generate a shadow readiness report.
 * Evaluates all gates and determines overall readiness status.
 */
export function generateReadinessReport(): ShadowReadinessReport {
  const config = getShadowProductionConfig();
  const state = getState();
  const now = new Date().toISOString();
  const firstAt = getFirstRequestAt();
  const lat = getComparisonLatencyPercentiles();
  const accessKeyCoverage = getCoverageByAccessKey();
  const providerCoverage = getCoverageByProvider();
  const aliasCoverage = getCoverageByAlias();

  const uniqueAccessKeys = Object.keys(accessKeyCoverage).length;
  const runtimeHours = firstAt
    ? (new Date(now).getTime() - new Date(firstAt).getTime()) / 3600000
    : 0;

  const totalCompared = state.shadowRequests + state.canaryRequests;
  const critCount = getCriticalMismatchCount();
  const critRate = totalCompared > 0 ? critCount / totalCompared : 0;
  const mismatchRate = state.mismatchRate;

  const gates: ReadinessGateResult[] = [];
  const blockers: string[] = [];
  const warnings: string[] = [];

  // Gate 1: Minimum requests
  gates.push(evaluateGate('minimum_requests', totalCompared, config.minRequestsForReadiness, 'ge'));

  // Gate 2: Unique access keys
  gates.push(evaluateGate('unique_access_keys', uniqueAccessKeys, config.minUniqueAccessKeysForReadiness, 'ge'));

  // Gate 3: Runtime duration
  gates.push(evaluateGate('runtime_hours', runtimeHours, config.minRuntimeHoursForReadiness, 'ge'));

  // Gate 4: Provider coverage
  const activeProviders = Object.keys(providerCoverage).length;
  const providerGate = evaluateGate('provider_coverage', activeProviders, Math.min(KNOWN_PROVIDERS.length, activeProviders || 1), 'ge');
  if (activeProviders < 3 && totalCompared > 100) {
    providerGate.status = 'warning';
    providerGate.message = `Only ${activeProviders} providers covered. Aim for all active production providers.`;
  }
  gates.push(providerGate);

  // Gate 5: Alias coverage
  const activeAliases = Object.keys(aliasCoverage).length;
  const aliasGate = evaluateGate('alias_coverage', activeAliases, Math.min(KNOWN_ALIASES.length, activeAliases || 1), 'ge');
  if (activeAliases < 4 && totalCompared > 100) {
    aliasGate.status = 'warning';
    aliasGate.message = `Only ${activeAliases} aliases covered. Aim for all active smart aliases.`;
  }
  gates.push(aliasGate);

  // Gate 6: Critical mismatch rate
  const critGate = evaluateGate('critical_mismatch_rate', critRate, config.readinessCriticalMismatchRate, 'le');
  if (critRate > 0) {
    critGate.status = 'blocked';
    critGate.message = `${critCount} critical mismatch(es) detected. Zero tolerance for critical mismatches.`;
  }
  gates.push(critGate);

  // Gate 7: Non-critical mismatch rate
  const nonCritGate = evaluateGate('non_critical_mismatch_rate', mismatchRate, config.readinessNonCriticalMismatchRate, 'le');
  if (mismatchRate > config.readinessNonCriticalMismatchRate) {
    nonCritGate.status = 'blocked';
    nonCritGate.message = `Mismatch rate ${(mismatchRate * 100).toFixed(2)}% exceeds threshold ${(config.readinessNonCriticalMismatchRate * 100).toFixed(2)}%`;
  }
  gates.push(nonCritGate);

  // Gate 8: Latency overhead
  const latencyGate: ReadinessGateResult = {
    name: 'latency_p99',
    status: 'insufficient_data',
    current: lat.p99 !== null ? `${lat.p99.toFixed(2)}ms` : 'N/A',
    threshold: `${config.readinessLatencyP99Ms}ms`,
  };
  if (lat.p99 !== null) {
    if (lat.p99 <= config.readinessLatencyP99Ms) {
      latencyGate.status = 'passed';
    } else {
      latencyGate.status = 'blocked';
      latencyGate.message = `p99 latency ${lat.p99.toFixed(2)}ms exceeds ${config.readinessLatencyP99Ms}ms threshold`;
    }
  }
  gates.push(latencyGate);

  // Gate 9: Experiment errors
  const errGate = evaluateGate('experiment_errors', state.canonicalFailures, 0, 'le');
  if (state.canonicalFailures > 0) {
    errGate.status = 'warning';
    errGate.message = `${state.canonicalFailures} canonical failure(s) detected`;
  }
  gates.push(errGate);

  // Collect blockers and warnings
  for (const g of gates) {
    if (g.status === 'blocked') blockers.push(`${g.name}: ${g.message || g.current}`);
    if (g.status === 'warning') warnings.push(`${g.name}: ${g.message || g.current}`);
    if (g.status === 'insufficient_data' && g.name !== 'latency_p99') {
      warnings.push(`${g.name}: insufficient data`);
    }
  }

  // Determine overall status
  let overallStatus: ShadowReadinessReport['status'];
  if (blockers.length > 0) {
    overallStatus = 'blocked';
  } else if (totalCompared < config.minRequestsForReadiness) {
    overallStatus = 'insufficient_data';
  } else if (warnings.length > 0) {
    overallStatus = 'warning';
  } else {
    overallStatus = 'ready';
  }

  // Build coverage maps (use known keys for request types)
  const topKinds = getTopMismatchKinds(20);
  const requestTypes: Record<string, number> = {
    'streaming': state.shadowRequests, // will be overridden by coverage if available
  };
  for (const k of topKinds) {
    requestTypes[k.kind] = k.count;
  }

  return {
    status: overallStatus,
    generatedAt: now,
    windowStart: firstAt || now,
    windowEnd: now,
    gates,
    totals: {
      comparedRequests: totalCompared,
      uniqueAccessKeys,
      runtimeHours: Math.round(runtimeHours * 10) / 10,
      criticalMismatches: critCount,
      nonCriticalMismatches: state.mismatchCount - critCount,
      mismatchRate: Math.round(mismatchRate * 10000) / 10000,
    },
    coverage: {
      providers: providerCoverage,
      aliases: aliasCoverage,
      requestTypes,
    },
    latency: {
      p50Ms: lat.p50 !== null ? Math.round(lat.p50 * 100) / 100 : null,
      p95Ms: lat.p95 !== null ? Math.round(lat.p95 * 100) / 100 : null,
      p99Ms: lat.p99 !== null ? Math.round(lat.p99 * 100) / 100 : null,
    },
    blockers,
    warnings,
  };
}

/**
 * Export readiness report as Markdown (safe — no raw content).
 */
export function exportReadinessMarkdown(report: ShadowReadinessReport): string {
  const lines: string[] = [
    `# Shadow Production Validation — Readiness Report`,
    '',
    `**Status:** ${report.status.toUpperCase()}`,
    `**Generated:** ${report.generatedAt}`,
    `**Window:** ${report.windowStart} → ${report.windowEnd}`,
    '',
    '## Gates',
    '',
    '| Gate | Status | Current | Threshold |',
    '|------|--------|---------|-----------|',
  ];

  for (const g of report.gates) {
    const icon = g.status === 'passed' ? '✅' : g.status === 'blocked' ? '🔴' : g.status === 'warning' ? '🟡' : '⚪';
    lines.push(`| ${g.name} | ${icon} ${g.status} | ${g.current} | ${g.threshold} |`);
  }

  lines.push('');
  lines.push('## Totals');
  lines.push('');
  lines.push(`- Compared requests: ${report.totals.comparedRequests}`);
  lines.push(`- Unique access keys: ${report.totals.uniqueAccessKeys}`);
  lines.push(`- Runtime hours: ${report.totals.runtimeHours}`);
  lines.push(`- Critical mismatches: ${report.totals.criticalMismatches}`);
  lines.push(`- Non-critical mismatches: ${report.totals.nonCriticalMismatches}`);
  lines.push(`- Mismatch rate: ${(report.totals.mismatchRate * 100).toFixed(2)}%`);

  lines.push('');
  lines.push('## Latency');
  lines.push('');
  lines.push(`- p50: ${report.latency.p50Ms !== null ? report.latency.p50Ms + 'ms' : 'N/A'}`);
  lines.push(`- p95: ${report.latency.p95Ms !== null ? report.latency.p95Ms + 'ms' : 'N/A'}`);
  lines.push(`- p99: ${report.latency.p99Ms !== null ? report.latency.p99Ms + 'ms' : 'N/A'}`);

  lines.push('');
  lines.push('## Coverage');
  lines.push('');
  lines.push('### Providers');
  for (const [p, count] of Object.entries(report.coverage.providers)) {
    lines.push(`- ${p}: ${count}`);
  }
  lines.push('');
  lines.push('### Aliases');
  for (const [a, count] of Object.entries(report.coverage.aliases)) {
    lines.push(`- ${a}: ${count}`);
  }

  if (report.blockers.length > 0) {
    lines.push('');
    lines.push('## Blockers');
    for (const b of report.blockers) lines.push(`- 🔴 ${b}`);
  }

  if (report.warnings.length > 0) {
    lines.push('');
    lines.push('## Warnings');
    for (const w of report.warnings) lines.push(`- 🟡 ${w}`);
  }

  lines.push('');
  lines.push('---');
  lines.push('*No raw prompt, response, tool output, API key, or provider credential is included in this report.*');

  return lines.join('\n');
}

// ── Helpers ──────────────────────────────────────────────────

function evaluateGate(
  name: string,
  current: number,
  threshold: number,
  direction: 'ge' | 'le',
): ReadinessGateResult {
  let status: ReadinessGateStatus;
  if (current === 0 && threshold > 0) {
    status = 'insufficient_data';
  } else if (direction === 'ge') {
    status = current >= threshold ? 'passed' : 'warning';
  } else {
    status = current <= threshold ? 'passed' : 'warning';
  }

  return {
    name,
    status,
    current,
    threshold,
  };
}
