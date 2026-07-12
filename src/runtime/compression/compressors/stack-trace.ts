// 8Router — Stack Trace Compressor (Phase 2F)
// Preserves error type, message, root cause, application frames, paths, line numbers
// Two-pass: collect all frames, then output first N + last M with omission marker

import type { CompressorResult } from '../types.js';

const FRAME = /^\s+at\s+/;
const CAUSED_BY = /^Caused by:/;
const NON_FRAME = /^(TypeError|Error|ReferenceError|SyntaxError|RangeError|URIError|EvalError|InternalError|AggregateError|Panic|Exception|Caused by)/;

export function compressStackTrace(lines: string[], _mode: string): CompressorResult {
  const PRE = 5;
  const POST = 3;
  let removed = 0;
  const result: string[] = [];

  // Segment: [non-frame lines...] [frame block] [non-frame lines...] ...
  let currentFrames: string[] = [];

  function flushFrames() {
    if (currentFrames.length === 0) return;
    if (currentFrames.length <= PRE + POST) {
      result.push(...currentFrames);
    } else {
      result.push(...currentFrames.slice(0, PRE));
      const omitted = currentFrames.length - PRE - POST;
      result.push(`[${omitted} stack frame${omitted > 1 ? 's' : ''} omitted]`);
      result.push(...currentFrames.slice(-POST));
      removed += omitted;
    }
    currentFrames = [];
  }

  for (const line of lines) {
    if (FRAME.test(line)) {
      currentFrames.push(line);
    } else {
      flushFrames();
      result.push(line);
    }
  }
  flushFrames();

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'stack_trace',
    linesRemoved: removed,
    warnings: [],
  };
}
