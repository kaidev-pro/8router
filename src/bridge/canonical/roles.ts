// 8Router — Canonical Role Definitions
// Phase 1A: Type contracts only — no runtime behavior change

/**
 * Valid roles for canonical messages in the conversation array.
 * 'tool' is a first-class role, NOT demoted to 'user'.
 *
 * Provider adapter mapping:
 * - OpenAI: role='tool' with tool_call_id + string content
 * - Anthropic: role='user' with tool_result content block
 * - Gemini: functionResponse content part
 */
export type CanonicalRole = 'system' | 'developer' | 'user' | 'assistant' | 'tool';

/**
 * Valid roles for canonical instructions (system and developer messages).
 * These are separated from the message array in CanonicalRequest.instructions[].
 *
 * - 'system': base behavioral instructions
 * - 'developer': override instructions that take precedence
 */
export type CanonicalInstructionRole = 'system' | 'developer';

/** Set of valid CanonicalRole values for runtime checks */
export const VALID_CANONICAL_ROLES: ReadonlySet<string> = new Set<string>([
  'system', 'developer', 'user', 'assistant', 'tool',
]);

/** Set of valid CanonicalInstructionRole values for runtime checks */
export const VALID_CANONICAL_INSTRUCTION_ROLES: ReadonlySet<string> = new Set<string>([
  'system', 'developer',
]);
