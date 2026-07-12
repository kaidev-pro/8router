// 8Router — Progress Noise Compressor (Phase 2F)
// Condenses progress/download/build lines while preserving final state and errors

import type { CompressorResult } from '../types.js';

const PROGRESS_RE = /^(Download|Upload|Installing|Compiling|Building|Processing|Loading|Fetching|Preparing|Cloning|Receiving|Resolving|Unpacking)\s/i;
const PROGRESS_PCT = /\d+(\.\d+)?%/;
const PROGRESS_DONE = /\b(done|complete|finished|success|installed|compiled|built)\b/i;
const IS_ERROR = /\b(error|fail|fatal|panic|exception|crash)\b/i;

export function compressProgressNoise(lines: string[], _mode: string): CompressorResult {
  const result: string[] = [];
  let removed = 0;
  let progressGroup: string[] = [];
  let lastProgress = '';

  function flushProgress() {
    if (progressGroup.length === 0) return;
    // Keep last progress line and any done/complete lines
    const finalLines = progressGroup.filter(l => PROGRESS_DONE.test(l) || IS_ERROR.test(l));
    if (finalLines.length > 0) {
      result.push(...finalLines);
    } else if (lastProgress) {
      result.push(lastProgress);
    }
    if (progressGroup.length > finalLines.length + 1) {
      const omitted = progressGroup.length - finalLines.length - (lastProgress ? 1 : 0);
      if (omitted > 0) {
        result.push(`[${omitted} progress update${omitted > 1 ? 's' : ''} omitted]`);
      }
    }
    removed += Math.max(0, progressGroup.length - finalLines.length - 1);
    progressGroup = [];
    lastProgress = '';
  }

  for (const line of lines) {
    if (PROGRESS_RE.test(line) || (PROGRESS_PCT.test(line) && !IS_ERROR.test(line))) {
      progressGroup.push(line);
      lastProgress = line;
    } else {
      flushProgress();
      result.push(line);
    }
  }
  flushProgress();

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'progress_noise',
    linesRemoved: removed,
    warnings: [],
  };
}
