// 8Router — Canonical Errors
// Phase 1A: Type contracts only — no runtime behavior change

/**
 * Structured error from the canonical bridge layer ONLY.
 *
 * IMPORTANT: This error type represents format/validation/serialization errors
 * at the bridge layer. It does NOT represent:
 * - Routing failures (handled by failure classifier, Phase 3)
 * - Circuit breaker decisions (handled by key-pool.ts, existing)
 * - Provider connectivity issues (handled by engine retry logic)
 * - Key rotation decisions (handled by key-pool.ts)
 *
 * CanonicalError does NOT determine:
 * - retryScope ('key' | 'provider')
 * - circuit effect (cooldown, open/close)
 * - next key/provider selection
 * - retry timing
 *
 * The retryable flag is advisory for the CLIENT (HTTP Retry-After header),
 * NOT for the engine's internal retry logic.
 */
export interface CanonicalError {
  /** Machine-readable error type */
  code: string;
  /** Human-readable message — MUST be sanitized (no raw keys, no secrets) */
  message: string;
  /** Original client format that produced this error */
  sourceFormat?: string;
  /** Target provider format being converted to (if applicable) */
  targetFormat?: string;
  /** Path to the field that caused the error (e.g., 'messages[0].content[1].source') */
  fieldPath?: string;
  /**
   * Whether the CLIENT can retry this request.
   * true = transient/format error (e.g., malformed input, unsupported capability)
   * false = permanent rejection (e.g., required field missing, validation failure)
   *
   * This flag does NOT control the engine's internal retry behavior.
   */
  retryable: boolean;
  /** Whether this error has been sanitized for external consumption */
  sanitized: boolean;
  /** Optional additional details — only safe, non-sensitive information */
  details?: Record<string, unknown>;
}
