// 8Router — Duplicate Lines Compressor (Phase 2F)
// Collapses adjacent exact duplicates into one copy + count marker

import type { CompressorResult } from '../types.js';

export function compressDuplicateLines(lines: string[], _mode: string): CompressorResult {
  const result: string[] = [];
  let i = 0;
  let removed = 0;

  while (i < lines.length) {
    const line = lines[i];
    result.push(line);

    // Count consecutive identical lines
    let count = 0;
    let j = i + 1;
    while (j < lines.length && lines[j] === line) {
      count++;
      j++;
    }

    if (count > 0) {
      result.push(`[repeated ${count} additional time${count > 1 ? 's' : ''}]`);
      removed += count;
      i = j;
    } else {
      i++;
    }
  }

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'duplicate_lines',
    linesRemoved: removed,
    warnings: [],
  };
}
