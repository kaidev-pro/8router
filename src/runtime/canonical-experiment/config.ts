// 8Router — Canonical Experiment Config (Phase 2H)
// Environment-driven configuration with safe defaults.

import type { CanonicalExperimentConfig, CanonicalRuntimeMode } from './types.js';
import { DEFAULT_EXPERIMENT_CONFIG } from './types.js';

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function parseList(raw: string | undefined): string[] {
  if (!raw || raw.trim() === '') return [];
  return raw.split(',').map(s => s.trim()).filter(Boolean);
}

export function loadCanonicalExperimentConfig(): CanonicalExperimentConfig {
  const mode = parseMode(process.env.CANONICAL_RUNTIME_MODE);

  // enforced mode is blocked in Phase 2H
  if (mode === 'enforced') {
    console.warn('[canonical-experiment] enforced mode rejected; falling back to off');
    return { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'off' };
  }

  const shadowSampleRate = clamp(
    parseFloat(process.env.CANONICAL_SHADOW_SAMPLE_RATE || '0') || 0, 0, 1
  );
  const canaryPercent = clamp(
    parseFloat(process.env.CANONICAL_CANARY_PERCENT || '0') || 0, 0, 100
  );
  const mismatchThreshold = clamp(
    parseFloat(process.env.CANONICAL_MISMATCH_THRESHOLD || '0.01') || 0.01, 0, 1
  );
  const failureThreshold = clamp(
    parseFloat(process.env.CANONICAL_FAILURE_THRESHOLD || '0.02') || 0.02, 0, 1
  );
  const maxOverheadMs = clamp(
    parseInt(process.env.CANONICAL_MAX_OVERHEAD_MS || '100', 10) || 100, 0, 10000
  );
  const minSamplesBeforeAutoDisable = clamp(
    parseInt(process.env.CANONICAL_MIN_SAMPLES_BEFORE_AUTO_DISABLE || '50', 10) || 50, 1, 10000
  );

  return {
    mode,
    shadowSampleRate: mode === 'shadow' ? shadowSampleRate : 0,
    canaryPercent: mode === 'canary' ? canaryPercent : 0,
    mismatchThreshold,
    autoDisable: process.env.CANONICAL_AUTO_DISABLE !== 'false',
    compareStreaming: process.env.CANONICAL_COMPARE_STREAMING !== 'false',
    compareToolCalls: process.env.CANONICAL_COMPARE_TOOL_CALLS !== 'false',
    compareUsage: process.env.CANONICAL_COMPARE_USAGE !== 'false',
    compareMetadata: process.env.CANONICAL_COMPARE_METADATA === 'true',
    userAllowlist: parseList(process.env.CANONICAL_EXPERIMENT_USER_ALLOWLIST),
    accessKeyAllowlist: parseList(process.env.CANONICAL_EXPERIMENT_ACCESS_KEY_ALLOWLIST),
    minSamplesBeforeAutoDisable,
    failureThreshold,
    maxOverheadMs,
  };
}

function parseMode(raw: string | undefined): CanonicalRuntimeMode {
  const val = (raw || 'off').toLowerCase().trim();
  if (val === 'shadow') return 'shadow';
  if (val === 'canary') return 'canary';
  if (val === 'enforced') return 'enforced';
  return 'off';
}

let _cachedConfig: CanonicalExperimentConfig | null = null;

export function getCanonicalExperimentConfig(): CanonicalExperimentConfig {
  if (!_cachedConfig) {
    _cachedConfig = loadCanonicalExperimentConfig();
  }
  return _cachedConfig;
}

export function reloadCanonicalExperimentConfig(): CanonicalExperimentConfig {
  _cachedConfig = null;
  return loadCanonicalExperimentConfig();
}
