// 8Router — Compression Policy (Phase 2F)
// Decides whether compression should be applied based on mode, content kind, and thresholds

import type { CompressionMode, ContentKind, CompressionConfig } from './types.js';
import { SKIPPED_REASONS } from './types.js';
import { estimateTokens } from './estimate-tokens.js';

// Which content kinds are allowed in each mode
const MODE_ALLOWED: Record<CompressionMode, ReadonlySet<ContentKind>> = {
  off: new Set(),
  safe: new Set(['terminal_log', 'stack_trace', 'test_output', 'lint_output', 'grep_output']),
  balanced: new Set(['terminal_log', 'stack_trace', 'test_output', 'lint_output', 'grep_output', 'directory_tree', 'git_diff']),
  aggressive: new Set(['terminal_log', 'stack_trace', 'test_output', 'lint_output', 'grep_output', 'directory_tree', 'git_diff']),
};

export function shouldCompress(
  content: string,
  mode: CompressionMode,
  contentKind: ContentKind,
  config: CompressionConfig,
): { allowed: boolean; skipReason?: string } {
  // Mode off
  if (mode === 'off') return { allowed: false, skipReason: SKIPPED_REASONS.MODE_OFF };

  // Protected kinds
  if (contentKind === 'structured_json') return { allowed: false, skipReason: SKIPPED_REASONS.STRUCTURED_JSON };
  if (contentKind === 'source_code') return { allowed: false, skipReason: SKIPPED_REASONS.SOURCE_CODE };
  if (contentKind === 'user_text') return { allowed: false, skipReason: SKIPPED_REASONS.USER_AUTHORED };
  if (contentKind === 'unknown') return { allowed: false, skipReason: SKIPPED_REASONS.UNKNOWN_KIND };

  // Mode-allowed check
  const allowedKinds = MODE_ALLOWED[mode];
  if (!allowedKinds || !allowedKinds.has(contentKind)) {
    return { allowed: false, skipReason: SKIPPED_REASONS.UNSUPPORTED_KIND };
  }

  // Size thresholds
  const chars = content.length;
  if (chars < config.minChars) return { allowed: false, skipReason: SKIPPED_REASONS.BELOW_MIN_SIZE };

  const tokens = estimateTokens(content);
  if (tokens < config.minEstimatedTokens) return { allowed: false, skipReason: SKIPPED_REASONS.BELOW_MIN_TOKENS };

  if (chars > config.maxInputChars) return { allowed: false, skipReason: SKIPPED_REASONS.INPUT_TOO_LARGE };

  return { allowed: true };
}

// Strategies available per mode — content-specific FIRST, then generic
export function getStrategiesForMode(mode: CompressionMode, contentKind: ContentKind): string[] {
  const strategies: string[] = [];

  if (mode === 'off') return strategies;

  // Content-specific strategies (balanced + aggressive)
  if (mode !== 'safe') {
    if (contentKind === 'test_output') strategies.push('test_output');
    if (contentKind === 'stack_trace') strategies.push('stack_trace');
    if (contentKind === 'lint_output') strategies.push('lint_output');
    if (contentKind === 'directory_tree') strategies.push('directory_tree');
    if (contentKind === 'grep_output') strategies.push('grep_output');
    if (contentKind === 'git_diff') strategies.push('git_diff');
    if (contentKind === 'terminal_log') strategies.push('terminal_log');
  }

  // Generic strategies (safe + balanced + aggressive)
  if (contentKind === 'terminal_log') strategies.push('progress_noise');
  strategies.push('duplicate_lines');
  strategies.push('repeated_groups');

  return strategies;
}
