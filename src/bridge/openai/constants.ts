// 8Router — OpenAI Bridge Constants
// Phase 1B: Extension allowlist and suspicious field patterns

/**
 * Known allowlisted OpenAI extension field names (snake_case).
 * Only these fields may be stored in canonical.extensions.openai.
 */
export const OPENAI_EXTENSION_ALLOWLIST: readonly string[] = [
  'frequency_penalty',
  'presence_penalty',
  'seed',
  'user',
  'parallel_tool_calls',
  'service_tier',
  'store',
] as const;

/**
 * Suspicious field names that must never be stored or logged.
 * If encountered, value is silently dropped and not included in warnings.
 */
export const SUSPICIOUS_FIELD_PATTERNS: readonly RegExp[] = [
  /auth/i, /api[_-]?key/i, /token/i, /cookie/i, /secret/i, /password/i,
] as const;
