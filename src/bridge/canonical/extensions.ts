// 8Router — Canonical Extensions
// Phase 1A: Type contracts only — no runtime behavior change

/**
 * Provider-specific extensions — allowlisted fields only.
 * Each provider section contains ONLY safe, documented fields that
 * cannot be represented in canonical form.
 *
 * PROHIBITED content (never store here):
 * - raw request body
 * - API keys
 * - authorization headers
 * - cookies
 * - OAuth tokens
 * - duplicate base64 payloads
 *
 * Each provider has its own typed interface to prevent
 * Record<string, unknown> escape hatches.
 */
export interface CanonicalExtensions {
  openai?: OpenAIExtensions;
  anthropic?: AnthropicExtensions;
  gemini?: GeminiExtensions;
  responses?: ResponsesExtensions;
}

/** OpenAI-specific extension fields — allowlisted only */
export interface OpenAIExtensions {
  frequency_penalty?: number;
  presence_penalty?: number;
  logit_bias?: Record<string, number>;
  logprobs?: boolean;
  top_logprobs?: number;
  parallel_tool_calls?: boolean;
  seed?: number;
  user?: string;
}

/** Anthropic-specific extension fields — allowlisted only */
export interface AnthropicExtensions {
  top_k?: number;
  metadata?: AnthropicMetadata;
}

/** Anthropic request metadata — safe fields only */
export interface AnthropicMetadata {
  user_id?: string;
}

/** Gemini-specific extension fields — allowlisted only */
export interface GeminiExtensions {
  topK?: number;
  safetySettings?: GeminiSafetySetting[];
}

/** Gemini safety setting */
export interface GeminiSafetySetting {
  category: string;
  threshold: string;
}

/** OpenAI Responses API extension fields — allowlisted only */
export interface ResponsesExtensions {
  instructions?: string;
  previous_response_id?: string;
}
