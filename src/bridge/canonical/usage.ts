// 8Router — Canonical Usage
// Phase 1A: Type contracts only — no runtime behavior change

/**
 * Token usage — normalized across all providers.
 * All values are integers >= 0.
 *
 * Usage is provider-reported, not ground truth.
 * No normalization attempt between providers.
 */
export interface CanonicalUsage {
  /** Input/prompt tokens */
  inputTokens: number;
  /** Output/completion tokens */
  outputTokens: number;
  /** Total tokens (may differ from input+output if provider reports differently) */
  totalTokens?: number;
  /** Tokens read from cache (Anthropic cache_read, OpenAI cached_tokens) */
  cachedInputTokens?: number;
  /** Tokens used for cache creation (Anthropic cache_creation only) */
  cacheCreationTokens?: number;
  /** Tokens used for reasoning/thinking (OpenAI o1, DeepSeek R1) */
  reasoningTokens?: number;
}
