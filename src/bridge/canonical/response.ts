// 8Router — Canonical Response
// Phase 1A: Type contracts only — no runtime behavior change

import type { CanonicalContentPart } from './content.js';
import type { CanonicalToolCall } from './tools.js';
import type { CanonicalUsage } from './usage.js';
import type { CanonicalExtensions } from './extensions.js';

/**
 * Canonical finish reason — normalized across all providers.
 */
export type CanonicalFinishReason =
  | 'stop'           // natural end
  | 'length'         // hit output limit (was 'max_tokens' in design — using 'length' for broader compatibility)
  | 'tool_call'      // model wants to call a tool (singular for canonical; adapters handle plural)
  | 'content_filter' // safety/content filter triggered
  | 'error'          // partial response before error
  | 'unknown';       // unrecognized finish reason from provider

/**
 * Provider-agnostic response format.
 * The engine operates on this; output adapters convert back to client format.
 */
export interface CanonicalResponse {
  /** Provider-assigned request ID */
  id: string;
  /** Model that actually served the response (may differ from requested) */
  model: string;
  /** Provider identifier that served this response */
  provider: string;
  /** Unix timestamp when response was created */
  createdAt: number;
  /** Response content — may be empty if only tool calls */
  content: CanonicalContentPart[];
  /** Structured tool calls (subset of content that are tool_use parts) */
  toolCalls: CanonicalToolCall[];
  /** Reason for stopping */
  finishReason: CanonicalFinishReason;
  /** Token usage */
  usage?: CanonicalUsage;
  /** Optional reasoning/thinking content (separate from main content) */
  reasoning?: string;
  /** Provider-specific extensions preserved through canonical form */
  extensions?: CanonicalExtensions;
  /** Internal bridge metadata — not serialized to client */
  bridgeMeta?: {
    sourceFormat?: string;
    warnings?: Array<{ code: string; message: string }>;
  };
}
