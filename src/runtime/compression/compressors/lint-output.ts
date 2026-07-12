// 8Router — Lint Output Compressor (Phase 2F)
// Preserves every unique error and warning with file, line, column, rule, message

import type { CompressorResult } from '../types.js';

export function compressLintOutput(lines: string[], _mode: string): CompressorResult {
  const seen = new Set<string>();
  const result: string[] = [];
  let removed = 0;

  for (const line of lines) {
    const normalized = line.trim();
    if (!normalized) {
      result.push(line);
      continue;
    }

    // Dedupe identical lint lines
    if (seen.has(normalized)) {
      removed++;
      continue;
    }
    seen.add(normalized);
    result.push(line);
  }

  if (removed > 0) {
    result.push(`[${removed} duplicate lint message${removed > 1 ? 's' : ''} removed]`);
  }

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'lint_output',
    linesRemoved: removed,
    warnings: [],
  };
}
