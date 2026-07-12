// 8Router — Git Diff Compressor (Phase 2F)
// High risk: preserves file list, statuses, binary markers, selected hunks with exact omitted counts

import type { CompressorResult } from '../types.js';

const GIT_STAT_LINE = /^\s*(create|delete|rename|modify)\s+/;
const GIT_FILE_STAT = /^\s*\d+\s+files?\s+changed/;
const GIT_HUNK = /^@@\s+-\d+/;
const GIT_FILE = /^\+\+\+ b\//;
const GIT_DIFF = /^diff --git/;

export function compressGitDiff(lines: string[], mode: string): CompressorResult {
  if (lines.length < 20) {
    return { content: lines.join('\n'), applied: false, strategy: 'git_diff', linesRemoved: 0, warnings: [] };
  }

  const aggressive = mode === 'aggressive';
  const result: string[] = [];
  let removed = 0;
  let hunkCount = 0;
  let currentHunk: string[] = [];

  function flushHunk() {
    if (currentHunk.length === 0) return;

    if (aggressive && currentHunk.length > 15) {
      // Aggressive: keep first 5 and last 3 lines
      result.push(...currentHunk.slice(0, 5));
      result.push(`[...${currentHunk.length - 8} lines of this hunk omitted]`);
      result.push(...currentHunk.slice(-3));
      removed += currentHunk.length - 8;
    } else if (!aggressive && currentHunk.length > 25) {
      // Balanced: keep first 8 and last 5 lines
      result.push(...currentHunk.slice(0, 8));
      result.push(`[...${currentHunk.length - 13} lines of this hunk omitted]`);
      result.push(...currentHunk.slice(-5));
      removed += currentHunk.length - 13;
    } else {
      result.push(...currentHunk);
    }
    hunkCount++;
    currentHunk = [];
  }

  for (const line of lines) {
    // Always keep file stats, headers, file paths
    if (GIT_STAT_LINE.test(line) || GIT_FILE_STAT.test(line) || GIT_DIFF.test(line) || GIT_FILE.test(line)) {
      flushHunk();
      result.push(line);
      continue;
    }

    if (GIT_HUNK.test(line)) {
      flushHunk();
      currentHunk = [line];
      continue;
    }

    if (currentHunk.length > 0 || /^[-+]/.test(line)) {
      currentHunk.push(line);
    } else {
      result.push(line);
    }
  }
  flushHunk();

  if (removed > 0) {
    result.push(`[git diff: ${removed} lines of ${hunkCount} hunks partially condensed]`);
  }

  return {
    content: result.join('\n'),
    applied: removed > 0,
    strategy: 'git_diff',
    linesRemoved: removed,
    warnings: [],
  };
}
