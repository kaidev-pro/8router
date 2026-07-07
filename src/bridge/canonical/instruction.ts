// 8Router — Canonical Instruction
// Phase 1A: Type contracts only — no runtime behavior change

import type { CanonicalInstructionRole } from './roles.js';
import type { CanonicalContentPart } from './content.js';

/**
 * Ordered instruction from the client.
 * Preserves role (system vs developer) and original position
 * in the instruction/message interleaving.
 *
 * System and developer instructions are semantically distinct:
 * - 'system': base behavioral instructions (OpenAI, Anthropic, Gemini)
 * - 'developer': override instructions that take precedence (OpenAI Responses API)
 *
 * Both are separated from the message array to match provider-native semantics
 * (Anthropic/Gemini have system as separate field). OpenAI inline system/developer
 * messages are extracted during toCanonical() with their position recorded.
 *
 * IMPORTANT: Instructions are NEVER automatically concatenated.
 * The output adapter is responsible for provider-specific joining.
 */
export interface CanonicalInstruction {
  /** 'system' or 'developer' — the provider-specific instruction type */
  role: CanonicalInstructionRole;
  /** Instruction content — can be multi-part (text + image for Anthropic) */
  content: CanonicalContentPart[];
  /**
   * Original position index in the full instruction+message interleaving.
   * 0-based. Used by output adapters to restore original ordering.
   * REQUIRED — no optional. If an instruction exists, it has a position.
   */
  position: number;
  /** Optional cache hint for providers that support it (Anthropic cache_control) */
  cacheControl?: 'ephemeral';
  /** Optional provider-specific extensions for this instruction */
  extensions?: Record<string, unknown>;
}
