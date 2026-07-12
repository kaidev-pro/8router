// 8Router — Terminal Log Compressor (Phase 2F)
// Preserves commands, exit codes, stderr, unique warnings/errors, summaries, paths

import type { CompressorResult } from '../types.js';

const IS_ERROR = /\b(error|fail|fatal|panic|exception|warn(?:ing)?)\b/i;
const IS_COMMAND = /^(\$\s|>\s|#\s|npm |yarn |pnpm |npx |git |docker |make |cargo |go |pip |apt)/;
const IS_EXIT = /exit code \d+|exited with code \d+|\(exit \d+\)/;
const PROGRESS_RE = /^(Download|Upload|Installing|Compiling|Building|Processing|Loading|Fetching)\s/i;
const PROGRESS_PCT = /\d+(\.\d+)?%/;
const DONE_RE = /\b(done|complete|finished|success)\b/i;

export function compressTerminalLog(lines: string[], _mode: string): CompressorResult {
  const result: string[] = [];
  let removed = 0;
  let progressGroup: string[] = [];

  function flushProgress() {
    if (progressGroup.length === 0) return;
    if (progressGroup.length <= 3) {
      result.push(...progressGroup);
    } else {
      // Keep last progress line (final state)
      result.push(progressGroup[progressGroup.length - 1]);
      removed += progressGroup.length - 1;
    }
    progressGroup = [];
  }

  for (const line of lines) {
    if (IS_ERROR.test(line) || IS_COMMAND.test(line) || IS_EXIT.test(line)) {
      flushProgress();
      result.push(line);
    } else if (PROGRESS_RE.test(line) || (PROGRESS_PCT.test(line) && !IS_ERROR.test(line))) {
      progressGroup.push(line);
    } else if (DONE_RE.test(line)) {
      flushProgress();
      result.push(line);
    } else {
      flushProgress();
      result.push(line);
    }
  }
  flushProgress();

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'terminal_log',
    linesRemoved: removed,
    warnings: [],
  };
}
