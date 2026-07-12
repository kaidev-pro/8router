// 8Router — Compression Engine (Phase 2F)
// Orchestrates classification, policy check, and compression pipeline
// Deterministic, local, auditable. No LLM, no external APIs.

import type { CompressionMode, CompressionResult, CompressorResult } from './types.js';
import { SKIPPED_REASONS } from './types.js';
import { classifyContent } from './classify.js';
import { shouldCompress, getStrategiesForMode } from './policy.js';
import { estimateTokens } from './estimate-tokens.js';
import { loadCompressionConfig } from './config.js';
import {
  compressDuplicateLines,
  compressProgressNoise,
  compressRepeatedGroups,
  compressTerminalLog,
  compressStackTrace,
  compressTestOutput,
  compressLintOutput,
  compressDirectoryTree,
  compressGrepOutput,
  compressGitDiff,
} from './compressors/index.js';

const COMPRESSORS: Record<string, (lines: string[], mode: string) => CompressorResult> = {
  duplicate_lines: compressDuplicateLines,
  progress_noise: compressProgressNoise,
  repeated_groups: compressRepeatedGroups,
  terminal_log: compressTerminalLog,
  stack_trace: compressStackTrace,
  test_output: compressTestOutput,
  lint_output: compressLintOutput,
  directory_tree: compressDirectoryTree,
  grep_output: compressGrepOutput,
  git_diff: compressGitDiff,
};

export function compressContent(content: string, mode: CompressionMode): CompressionResult {
  const config = loadCompressionConfig();
  const startTime = Date.now();
  const originalChars = content.length;

  // Fast path: mode off
  if (mode === 'off') {
    return {
      applied: false, mode, contentKind: 'unknown',
      compressedContent: content, originalChars, compressedChars: originalChars,
      estimatedTokensBefore: estimateTokens(content), estimatedTokensAfter: estimateTokens(content),
      estimatedTokensSaved: 0, percentSaved: 0, compressionLatencyMs: 0,
      skippedReason: SKIPPED_REASONS.MODE_OFF, strategies: [], warnings: [],
    };
  }

  // Classify
  const contentKind = classifyContent(content);

  // Policy check
  const policy = shouldCompress(content, mode, contentKind, config);
  if (!policy.allowed) {
    return {
      applied: false, mode, contentKind,
      compressedContent: content, originalChars, compressedChars: originalChars,
      estimatedTokensBefore: estimateTokens(content), estimatedTokensAfter: estimateTokens(content),
      estimatedTokensSaved: 0, percentSaved: 0, compressionLatencyMs: Date.now() - startTime,
      skippedReason: policy.skipReason, strategies: [], warnings: [],
    };
  }

  // Get strategies
  const strategies = getStrategiesForMode(mode, contentKind);
  if (strategies.length === 0) {
    return {
      applied: false, mode, contentKind,
      compressedContent: content, originalChars, compressedChars: originalChars,
      estimatedTokensBefore: estimateTokens(content), estimatedTokensAfter: estimateTokens(content),
      estimatedTokensSaved: 0, percentSaved: 0, compressionLatencyMs: Date.now() - startTime,
      skippedReason: SKIPPED_REASONS.UNSUPPORTED_KIND, strategies: [], warnings: [],
    };
  }

  // Apply compression pipeline with timeout
  const deadline = Date.now() + config.timeoutMs;
  let current = content;
  const appliedStrategies: string[] = [];
  const allWarnings: string[] = [];
  let totalLinesRemoved = 0;

  for (const strategy of strategies) {
    if (Date.now() > deadline) {
      allWarnings.push(`Timeout after ${config.timeoutMs}ms, stopping compression`);
      break;
    }

    const compressor = COMPRESSORS[strategy];
    if (!compressor) continue;

    try {
      const lines = current.split('\n');
      const result = compressor(lines, mode);
      if (result.applied) {
        current = result.content;
        appliedStrategies.push(result.strategy);
        totalLinesRemoved += result.linesRemoved;
        allWarnings.push(...result.warnings);
      }
    } catch (err) {
      allWarnings.push(`Compressor ${strategy} failed: ${err instanceof Error ? err.message : 'unknown'}`);
    }
  }

  const compressedChars = current.length;
  const tokensBefore = estimateTokens(content);
  const tokensAfter = estimateTokens(current);
  const tokensSaved = Math.max(0, tokensBefore - tokensAfter);
  const percentSaved = tokensBefore > 0 ? Math.round((tokensSaved / tokensBefore) * 100) : 0;

  // Check minimum savings threshold
  if (percentSaved < config.minSavingsPercent) {
    return {
      applied: false, mode, contentKind,
      compressedContent: content, originalChars, compressedChars: originalChars,
      estimatedTokensBefore: tokensBefore, estimatedTokensAfter: tokensBefore,
      estimatedTokensSaved: 0, percentSaved: 0, compressionLatencyMs: Date.now() - startTime,
      skippedReason: SKIPPED_REASONS.NOT_BENEFICIAL, strategies: appliedStrategies, warnings: allWarnings,
    };
  }

  // Add marker if configured
  let finalContent = current;
  if (config.includeMarker && appliedStrategies.length > 0) {
    finalContent += `\n[8Router Token Saver: ${mode} mode, estimated ${percentSaved}% reduction]`;
  }

  return {
    applied: true, mode, contentKind,
    compressedContent: finalContent, originalChars, compressedChars: finalContent.length,
    estimatedTokensBefore: tokensBefore, estimatedTokensAfter: estimateTokens(finalContent),
    estimatedTokensSaved: tokensSaved, percentSaved,
    compressionLatencyMs: Date.now() - startTime,
    strategies: appliedStrategies, warnings: allWarnings,
  };
}

// Safe metrics for logging (never includes content)
export function toMetrics(result: CompressionResult) {
  return {
    compressionMode: result.mode,
    compressionApplied: result.applied,
    compressedBlockCount: result.applied ? 1 : 0,
    estimatedTokensBeforeCompression: result.estimatedTokensBefore,
    estimatedTokensAfterCompression: result.estimatedTokensAfter,
    estimatedTokensSaved: result.estimatedTokensSaved,
    compressionPercentSaved: result.percentSaved,
    compressionLatencyMs: result.compressionLatencyMs,
    compressionSkippedReason: result.skippedReason,
    compressionStrategies: result.strategies,
  };
}
