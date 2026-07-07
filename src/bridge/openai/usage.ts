// 8Router — OpenAI Usage Conversion
// Phase 1B: Convert between OpenAI usage and CanonicalUsage

import type { CanonicalUsage } from '../canonical/usage.js';

/**
 * OpenAI usage object from Chat Completions response.
 */
export interface OpenAIUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    audio_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
    audio_tokens?: number;
    accepted_prediction_tokens?: number;
    rejected_prediction_tokens?: number;
  };
}

/**
 * Convert OpenAI usage to canonical.
 */
export function openaiUsageToCanonical(usage: OpenAIUsage | undefined): CanonicalUsage | undefined {
  if (!usage) return undefined;

  return {
    inputTokens: usage.prompt_tokens ?? 0,
    outputTokens: usage.completion_tokens ?? 0,
    totalTokens: usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
    cachedInputTokens: usage.prompt_tokens_details?.cached_tokens,
    reasoningTokens: usage.completion_tokens_details?.reasoning_tokens,
  };
}

/**
 * Convert canonical usage back to OpenAI format.
 */
export function canonicalUsageToOpenai(usage: CanonicalUsage | undefined): OpenAIUsage | undefined {
  if (!usage) return undefined;

  return {
    prompt_tokens: usage.inputTokens,
    completion_tokens: usage.outputTokens,
    total_tokens: usage.totalTokens ?? usage.inputTokens + usage.outputTokens,
    ...(usage.cachedInputTokens !== undefined || usage.reasoningTokens !== undefined
      ? {
          prompt_tokens_details: usage.cachedInputTokens !== undefined
            ? { cached_tokens: usage.cachedInputTokens }
            : undefined,
          completion_tokens_details: usage.reasoningTokens !== undefined
            ? { reasoning_tokens: usage.reasoningTokens }
            : undefined,
        }
      : {}),
  };
}
