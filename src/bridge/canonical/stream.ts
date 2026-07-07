// 8Router — Canonical Streaming Events
// Phase 1A: Type contracts only — no runtime behavior change

import type { CanonicalFinishReason } from './response.js';
import type { CanonicalUsage } from './usage.js';
import type { CanonicalError } from './errors.js';

/**
 * Streaming event types — 9 event types covering the full stream lifecycle.
 *
 * Events:
 * 1. message_start    — stream opened, provider identified
 * 2. content_delta    — incremental text content
 * 3. thinking_delta   — incremental reasoning/thinking content
 * 4. tool_call_start  — tool call opened (id, name)
 * 5. tool_call_delta  — incremental JSON arguments fragment (raw string, NOT parsed)
 * 6. tool_call_end    — tool call completed, parsed arguments available
 * 7. usage            — token usage update
 * 8. message_end      — stream closed, final finish reason
 * 9. stream_error     — error occurred, fallback status
 *
 * Tool argument lifecycle:
 * - tool_call_start: id, name emitted
 * - tool_call_delta: raw JSON string fragments accumulated
 * - tool_call_end: accumulated string parsed ONCE. If invalid JSON,
 *   arguments=null and parseError is set. Never crashes on bad JSON.
 */
export type CanonicalStreamEvent =
  | StreamMessageStart
  | StreamContentDelta
  | StreamThinkingDelta
  | StreamToolCallStart
  | StreamToolCallDelta
  | StreamToolCallEnd
  | StreamUsageUpdate
  | StreamMessageEnd
  | StreamErrorEvent;

/** Stream opened — first event in any stream */
export interface StreamMessageStart {
  type: 'message_start';
  /** Request ID */
  id: string;
  /** Model being used */
  model: string;
  /** Provider event ID (e.g., Anthropic's message_start.id) */
  providerEventId?: string;
}

/** Incremental text content */
export interface StreamContentDelta {
  type: 'content_delta';
  /** Incremental text */
  delta: string;
  /** Content block index — 0 for first text block, increments for new blocks */
  contentBlockIndex: number;
}

/** Incremental reasoning/thinking content */
export interface StreamThinkingDelta {
  type: 'thinking_delta';
  /** Incremental thinking/reasoning text */
  delta: string;
  /** Content block index */
  contentBlockIndex: number;
}

/**
 * Tool call opened — emitted when a new tool call starts.
 * Followed by one or more tool_call_delta events, then tool_call_end.
 */
export interface StreamToolCallStart {
  type: 'tool_call_start';
  /** Index of tool call in the response (0-based, stable) */
  toolCallIndex: number;
  /** Tool call ID — provided by provider or generated for Gemini */
  id: string;
  /** Function name */
  name: string;
  /** Content block index (optional — for providers that track content blocks) */
  contentBlockIndex?: number;
}

/**
 * Incremental JSON arguments fragment.
 * `argumentsDelta` is a RAW STRING — do NOT parse incrementally.
 * Parse once at tool_call_end.
 */
export interface StreamToolCallDelta {
  type: 'tool_call_delta';
  /** Index of tool call (matches the start event) */
  toolCallIndex: number;
  /** Incremental JSON arguments — raw string fragment, not parsed */
  argumentsDelta: string;
}

/**
 * Tool call completed — accumulated arguments parsed.
 * If JSON parsing failed, arguments is null and parseError is set.
 * This is the ONLY event where arguments are guaranteed to be valid JSON.
 */
export interface StreamToolCallEnd {
  type: 'tool_call_end';
  /** Index of tool call */
  toolCallIndex: number;
  /** Successfully parsed arguments object (null if parse failed) */
  arguments: Record<string, unknown> | null;
  /** If JSON parsing failed, contains sanitized error message */
  parseError?: string;
}

/** Token usage update */
export interface StreamUsageUpdate {
  type: 'usage';
  usage: CanonicalUsage;
}

/**
 * Stream closed — final event.
 * finishReason must always be present.
 */
export interface StreamMessageEnd {
  type: 'message_end';
  /** Final finish reason */
  finishReason: CanonicalFinishReason;
  /** Final usage (may be absent if provider doesn't send in stream) */
  usage?: CanonicalUsage;
}

/**
 * Error event in stream.
 *
 * fallbackAllowed semantics:
 * - true: NO content bytes have been flushed to the client yet.
 *   The stream handler CAN fall back to a different provider.
 * - false: At least one content_delta or tool_call_delta has been flushed.
 *   No silent restart, no provider switching.
 *
 * This is runtime state tracked by the stream handler, not a payload field
 * that the client controls.
 */
export interface StreamErrorEvent {
  type: 'stream_error';
  /** Error details */
  error: CanonicalError;
  /**
   * Whether fallback is still possible.
   * true ONLY if no content bytes have been flushed to the client yet.
   */
  fallbackAllowed: boolean;
}

/** Discriminant values for stream event types */
export const VALID_STREAM_EVENT_TYPES: ReadonlySet<string> = new Set<string>([
  'message_start', 'content_delta', 'thinking_delta',
  'tool_call_start', 'tool_call_delta', 'tool_call_end',
  'usage', 'message_end', 'stream_error',
]);
