// 8Router — Repeated Groups Compressor (Phase 2F)
// Groups highly repetitive adjacent lines (balanced/aggressive)

import type { CompressorResult } from '../types.js';

export function compressRepeatedGroups(lines: string[], _mode: string): CompressorResult {
  if (lines.length < 10) {
    return { content: lines.join('\n'), applied: false, strategy: 'repeated_groups', linesRemoved: 0, warnings: [] };
  }

  const result: string[] = [];
  let removed = 0;
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];
    // Find repeated patterns (same line prefix after stripping numbers/paths)
    const prefix = line.replace(/\d+/g, 'N').replace(/\/[^\s]+/g, '/PATH');
    let groupLen = 1;
    let j = i + 1;
    while (j < lines.length) {
      const nextPrefix = lines[j].replace(/\d+/g, 'N').replace(/\/[^\s]+/g, '/PATH');
      if (nextPrefix === prefix) {
        groupLen++;
        j++;
      } else {
        break;
      }
    }

    if (groupLen >= 5) {
      result.push(line);
      result.push(`[${groupLen - 1} similar lines omitted]`);
      removed += groupLen - 1;
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'repeated_groups',
    linesRemoved: removed,
    warnings: [],
  };
}
