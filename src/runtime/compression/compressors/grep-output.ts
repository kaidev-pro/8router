// 8Router — Grep Output Compressor (Phase 2F)
// Preserves query, file paths, match counts, first relevant matches, errors

import type { CompressorResult } from '../types.js';

const FILE_PATH = /^([^:]+):(\d+):/;

export function compressGrepOutput(lines: string[], _mode: string): CompressorResult {
  const result: string[] = [];
  let removed = 0;

  // Group by file path
  const fileGroups = new Map<string, string[]>();
  const fileOrder: string[] = [];
  const nonMatch: string[] = [];

  for (const line of lines) {
    const match = FILE_PATH.exec(line);
    if (match) {
      const filePath = match[1];
      if (!fileGroups.has(filePath)) {
        fileOrder.push(filePath);
        fileGroups.set(filePath, []);
      }
      fileGroups.get(filePath)!.push(line);
    } else {
      nonMatch.push(line);
    }
  }

  // Keep non-match lines (header, summary)
  result.push(...nonMatch);

  for (const filePath of fileOrder) {
    const group = fileGroups.get(filePath)!;
    if (group.length <= 5) {
      result.push(...group);
    } else {
      // Keep first 3 matches + count
      result.push(group[0]);
      result.push(group[1]);
      result.push(group[2]);
      result.push(`[${group.length - 3} additional matches in ${filePath}]`);
      removed += group.length - 3;
    }
  }

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'grep_output',
    linesRemoved: removed,
    warnings: [],
  };
}
