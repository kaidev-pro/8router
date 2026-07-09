// 8Router — OpenAI Responses API Usage Helpers
// Phase 1F: Usage conversion for Responses API ↔ Canonical.

import type { CanonicalUsage } from '../canonical/usage.js';
import type { ResponsesUsage } from './types.js';

/** Convert Responses API usage → CanonicalUsage */
export function responsesUsageToCanonical(usage: ResponsesUsage | undefined): CanonicalUsage | undefined {
  if (!usage) return undefined;

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens,
    cachedInputTokens: usage.input_tokens_details?.cached_tokens,
  };
}

/** Convert CanonicalUsage → Responses API usage */
export function canonicalUsageToResponses(usage: CanonicalUsage | undefined): ResponsesUsage | undefined {
  if (!usage) return undefined;

  return {
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    total_tokens: usage.totalTokens,
    ...(usage.reasoningTokens ? {
      output_tokens_details: { reasoning_tokens: usage.reasoningTokens },
    } : {}),
    ...(usage.cachedInputTokens ? {
      input_tokens_details: { cached_tokens: usage.cachedInputTokens },
    } : {}),
  };
}
