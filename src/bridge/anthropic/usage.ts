// 8Router — Anthropic Usage Conversion
// Phase 1C: Convert between Anthropic usage and CanonicalUsage

import type { CanonicalUsage } from '../canonical/usage.js';
import type { AnthropicUsage } from './types.js';

/**
 * Convert Anthropic usage to canonical.
 */
export function anthropicUsageToCanonical(usage: AnthropicUsage): CanonicalUsage {
  return {
    inputTokens: usage.input_tokens || 0,
    outputTokens: usage.output_tokens || 0,
    totalTokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
    cachedInputTokens: usage.cache_read_input_tokens || undefined,
    cacheCreationTokens: usage.cache_creation_input_tokens || undefined,
  };
}

/**
 * Convert canonical usage to Anthropic format.
 */
export function canonicalUsageToAnthropic(usage: CanonicalUsage): AnthropicUsage {
  const result: AnthropicUsage = {
    input_tokens: usage.inputTokens || 0,
    output_tokens: usage.outputTokens || 0,
  };
  if (usage.cachedInputTokens !== undefined) {
    result.cache_read_input_tokens = usage.cachedInputTokens;
  }
  if (usage.cacheCreationTokens !== undefined) {
    result.cache_creation_input_tokens = usage.cacheCreationTokens;
  }
  return result;
}
