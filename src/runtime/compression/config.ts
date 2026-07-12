// 8Router — Token Saver Config (Phase 2F)
// Reads from environment, validates, clamps unsafe values

import type { CompressionMode, CompressionConfig } from './types.js';

const VALID_MODES: CompressionMode[] = ['off', 'safe', 'balanced', 'aggressive'];

function clampInt(val: string | undefined, def: number, min: number, max: number): number {
  const n = parseInt(val || '', 10);
  if (isNaN(n)) return def;
  return Math.max(min, Math.min(max, n));
}

function parseMode(val: string | undefined): CompressionMode {
  const v = (val || 'off').toLowerCase().trim();
  return (VALID_MODES as string[]).includes(v) ? v as CompressionMode : 'off';
}

function parseBool(val: string | undefined, def: boolean): boolean {
  if (!val) return def;
  const v = val.toLowerCase().trim();
  return v === 'true' || v === '1' || v === 'yes';
}

export function loadCompressionConfig(): CompressionConfig {
  return {
    mode: parseMode(process.env.TOKEN_SAVER_MODE),
    minChars: clampInt(process.env.TOKEN_SAVER_MIN_CHARS, 4000, 100, 100000),
    minEstimatedTokens: clampInt(process.env.TOKEN_SAVER_MIN_ESTIMATED_TOKENS, 1000, 50, 50000),
    maxInputChars: clampInt(process.env.TOKEN_SAVER_MAX_INPUT_CHARS, 500000, 10000, 5000000),
    timeoutMs: clampInt(process.env.TOKEN_SAVER_TIMEOUT_MS, 100, 10, 5000),
    preserveHeadLines: clampInt(process.env.TOKEN_SAVER_PRESERVE_HEAD_LINES, 80, 5, 500),
    preserveTailLines: clampInt(process.env.TOKEN_SAVER_PRESERVE_TAIL_LINES, 80, 5, 500),
    minSavingsPercent: clampInt(process.env.TOKEN_SAVER_MIN_SAVINGS_PERCENT, 5, 1, 50),
    includeMarker: parseBool(process.env.TOKEN_SAVER_INCLUDE_MARKER, true),
  };
}

// Resolve mode from header, access-key setting, or global config
export function resolveCompressionMode(
  headerOverride?: string,
  accessKeyOverride?: string,
  globalMode?: CompressionMode,
): CompressionMode {
  // Request header takes priority
  if (headerOverride) {
    const m = parseMode(headerOverride);
    if (m !== 'off' || headerOverride.toLowerCase().trim() === 'off') return m;
  }
  // Access key setting
  if (accessKeyOverride && accessKeyOverride !== 'inherit') {
    const m = parseMode(accessKeyOverride);
    if (m !== 'off' || accessKeyOverride.toLowerCase().trim() === 'off') return m;
  }
  // Global env
  return globalMode || 'off';
}
