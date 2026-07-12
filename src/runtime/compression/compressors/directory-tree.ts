// 8Router — Directory Tree Compressor (Phase 2F)
// Balanced/Aggressive: collapses deep branches with exact computed counts

import type { CompressorResult } from '../types.js';

export function compressDirectoryTree(lines: string[], _mode: string): CompressorResult {
  if (lines.length < 30) {
    return { content: lines.join('\n'), applied: false, strategy: 'directory_tree', linesRemoved: 0, warnings: [] };
  }

  const result: string[] = [];
  let removed = 0;

  // Collapse deep nested sections (depth >= 3) with more than 10 children
  let i = 0;
  while (i < lines.length) {
    const line = lines[i];
    const depth = line.search(/\S/);

    // Count consecutive lines at same or deeper depth
    let groupSize = 0;
    let j = i + 1;
    while (j < lines.length) {
      const nextDepth = lines[j].search(/\S/);
      if (nextDepth < depth) break;
      if (nextDepth === depth) groupSize++;
      j++;
    }

    if (groupSize > 15 && depth >= 4) {
      result.push(line);
      result.push(`[${groupSize} items omitted]`);
      removed += groupSize;
      // Skip to after the group
      i = j;
    } else {
      result.push(line);
      i++;
    }
  }

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'directory_tree',
    linesRemoved: removed,
    warnings: [],
  };
}
