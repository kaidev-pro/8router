// 8Router — Canonical Capability Types
// Phase 1A: Type contracts only — no runtime behavior change

/**
 * Capability types for the canonical bridge.
 * Used by capability validation to determine provider/model eligibility.
 */
export type CanonicalCapability =
  | 'chat'
  | 'streaming'
  | 'tools'
  | 'vision'
  | 'json_mode'
  | 'reasoning'
  | 'embeddings'
  | 'audio';

/**
 * Result of capability validation — NOT a simple boolean.
 * Contains detailed eligibility analysis for debugging and routing.
 */
export interface CapabilityValidationResult {
  /** Whether the request is eligible for the target provider/model */
  eligible: boolean;
  /** Capabilities required by this request but not supported by target */
  missing: CanonicalCapability[];
  /** Non-fatal warnings (e.g., field will be dropped, will use extension) */
  warnings: string[];
  /** All capabilities this request requires (for logging/debugging) */
  required: CanonicalCapability[];
}

/**
 * Pure helper: validates that all required capabilities are available.
 *
 * @param required - Capabilities the request needs
 * @param available - Capabilities the target provider/model supports
 * @returns Validation result with eligibility, missing, and warnings
 */
export function validateCapabilities(
  required: CanonicalCapability[],
  available: CanonicalCapability[],
): CapabilityValidationResult {
  const availableSet = new Set(available);
  const missing = required.filter(c => !availableSet.has(c));

  return {
    eligible: missing.length === 0,
    missing,
    warnings: [],
    required,
  };
}
