// 8Router — Canonical Request
// Phase 1A: Type contracts only — no runtime behavior change

import type { CanonicalInstruction } from './instruction.js';
import type { CanonicalMessage } from './message.js';
import type { CanonicalTool, CanonicalToolChoice } from './tools.js';
import type { CanonicalExtensions } from './extensions.js';
import type { CanonicalCapability, CapabilityValidationResult } from './capabilities.js';

/**
 * Canonical response format constraint.
 * Handles JSON mode (OpenAI), structured output (Gemini), and text mode.
 */
export interface CanonicalResponseFormat {
  /** Response format type */
  type: 'text' | 'json_object' | 'json_schema';
  /** JSON Schema name (for json_schema type) */
  name?: string;
  /** Whether to enforce strict schema adherence */
  strict?: boolean;
  /** JSON Schema for structured output (only with type='json_schema') */
  schema?: Record<string, unknown>;
}

/**
 * Internal bridge metadata — NOT serialized to provider or client.
 * Used by shadow mode, debugging, and internal tracking only.
 */
export interface CanonicalBridgeMeta {
  /** Original client format: 'openai' | 'anthropic' | 'gemini' | 'responses' */
  sourceFormat: string;
  /**
   * Semantic fingerprint for shadow comparison — NOT the raw body.
   * SHA-256 hash of key fields: model, message count, role sequence,
   * tool names, content length. Max 16 hex characters.
   */
  fingerprint?: string;
  /** Warnings generated during canonical conversion */
  warnings?: BridgeWarning[];
  /** Shadow mode status for this request */
  shadowStatus?: ShadowStatus;
}

/** Warning generated during canonical conversion */
export interface BridgeWarning {
  /** Warning category */
  code: BridgeWarningCode;
  /** Path to the field that triggered the warning */
  fieldPath?: string;
  /** Human-readable warning message */
  message: string;
}

/** Warning categories */
export type BridgeWarningCode =
  | 'field_preserved'
  | 'field_dropped'
  | 'field_transformed'
  | 'capability_warning'
  | 'shadow_mismatch'
  | 'shadow_skipped';

/** Shadow mode status */
export interface ShadowStatus {
  /** Whether shadow mode was active for this request */
  active: boolean;
  /** Shadow comparison result (only populated if active) */
  comparisonResult?: 'match' | 'mismatch' | 'skipped';
  /** Reason for skip (only if comparisonResult='skipped') */
  skipReason?: string;
}

/**
 * Provider-agnostic request format.
 * The engine, token saver, and combo router operate on this type.
 *
 * Invariants:
 * - instructions[] and messages[] never lose ordering information
 * - extensions only contain allowlisted provider-specific fields
 * - No originalRequest / rawBody stored anywhere
 * - bridgeMeta is internal-only, never serialized to external systems
 */
export interface CanonicalRequest {
  /** Model identifier (already resolved from alias/combo) */
  model: string;

  /**
   * Ordered instructions — system and developer messages.
   * Preserves original position in the instruction/message interleaving.
   */
  instructions: CanonicalInstruction[];

  /** Conversation messages — no system/developer messages (those are in instructions[]) */
  messages: CanonicalMessage[];

  /** Tool definitions */
  tools?: CanonicalTool[];

  /** Tool choice strategy */
  toolChoice?: CanonicalToolChoice;

  /** Whether to stream the response */
  stream?: boolean;

  /** Sampling temperature (0-2) */
  temperature?: number;

  /** Nucleus sampling parameter */
  topP?: number;

  /** Maximum output tokens */
  maxTokens?: number;

  /** Stop sequences */
  stop?: string[];

  /** Response format constraint */
  responseFormat?: CanonicalResponseFormat;

  /** Request-level metadata (e.g., conversation_id, user metadata) */
  metadata?: Record<string, unknown>;

  /** Provider-specific extensions — allowlisted fields only */
  extensions?: CanonicalExtensions;

  /**
   * Internal bridge metadata — NEVER serialized to provider or client.
   * Used for shadow mode, fingerprinting, and warning accumulation.
   */
  bridgeMeta?: CanonicalBridgeMeta;

  /**
   * Capabilities required by this request.
   * Populated during toCanonical() based on content analysis.
   * Used by capability validation before provider formatting.
   */
  requiredCapabilities?: CanonicalCapability[];
}
