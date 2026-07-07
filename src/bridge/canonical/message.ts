// 8Router — Canonical Message
// Phase 1A: Type contracts only — no runtime behavior change

import type { CanonicalRole } from './roles.js';
import type { CanonicalContentPart } from './content.js';

/**
 * Canonical conversation message.
 *
 * Roles: user, assistant, tool.
 * System/developer roles are NOT used here — those are in CanonicalInstruction[].
 *
 * 'tool' is a FIRST-CLASS role. It is NOT demoted to 'user'.
 * Provider adapters handle the translation:
 * - OpenAI: role='tool' with tool_call_id
 * - Anthropic: role='user' with tool_result content block
 * - Gemini: functionResponse content part
 */
export interface CanonicalMessage {
  /**
   * Message role. 'tool' is preserved as-is.
   * CanonicalRole includes 'system'|'developer' for type completeness,
   * but in practice these should appear only in instructions[].
   */
  role: CanonicalRole;
  /** Content parts — can be mixed (text + image, text + tool_use, etc.) */
  content: CanonicalContentPart[];
  /** Optional name identifier (OpenAI: name field on messages) */
  name?: string;
  /**
   * Optional position in the original message array.
   * Used for ordering preservation across provider formats.
   */
  position?: number;
  /** Optional provider-specific extensions */
  extensions?: Record<string, unknown>;
  /**
   * Tool calls from assistant message.
   * Stored separately from content for easy access.
   * Each call has parsed arguments (object, not string).
   */
  toolCalls?: import('./tools.js').CanonicalToolCall[];
}
