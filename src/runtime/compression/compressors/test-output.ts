// 8Router — Test Output Compressor (Phase 2F)
// Preserves failed tests, assertions, totals, duration, skips, coverage
// Supports Jest, Vitest, Mocha, Pytest, Go test, Rust cargo test output

import type { CompressorResult } from '../types.js';

// Fail markers: ✗, FAIL, not ok, ❌, "X failing", Error names, "AssertionError"
// NOTE: do NOT match bare "assertion" — it appears in passing test descriptions too
const IS_FAIL = /✗|FAIL|not ok|failing|❌|\w+Error\b|AssertionError/i;
const IS_PASS = /✓|✔|✅|PASS|ok \d+|passing|passed/;
const SUMMARY = /Tests:|Total:|Passed:|Failed:|Skipped:|Duration:|Coverage:|test suites?/i;
const COMMAND = /^(npm|yarn|pnpm|npx|jest|mocha|vitest|pytest|go test|cargo test)\s/;

export function compressTestOutput(lines: string[], _mode: string): CompressorResult {
  const result: string[] = [];
  let removed = 0;
  let passStreak = 0;

  for (const line of lines) {
    // Always keep failures, summaries, commands
    if (IS_FAIL.test(line) || SUMMARY.test(line) || COMMAND.test(line)) {
      if (passStreak > 0) {
        result.push(`[${passStreak} passing test${passStreak > 1 ? 's' : ''} omitted]`);
        removed += passStreak;
        passStreak = 0;
      }
      result.push(line);
    } else if (IS_PASS.test(line)) {
      passStreak++;
    } else {
      // Unrecognized line — flush streak and keep it
      if (passStreak > 0) {
        result.push(`[${passStreak} passing test${passStreak > 1 ? 's' : ''} omitted]`);
        removed += passStreak;
        passStreak = 0;
      }
      result.push(line);
    }
  }

  // Flush remaining pass streak
  if (passStreak > 0) {
    result.push(`[${passStreak} passing test${passStreak > 1 ? 's' : ''} omitted]`);
    removed += passStreak;
  }

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'test_output',
    linesRemoved: removed,
    warnings: [],
  };
}
