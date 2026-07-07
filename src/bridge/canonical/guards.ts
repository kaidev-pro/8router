// 8Router — Canonical Type Guards
// Phase 1A: Runtime safety checks — no schema validation, no coercion

import { VALID_CANONICAL_ROLES, VALID_CANONICAL_INSTRUCTION_ROLES } from './roles.js';
import { VALID_CONTENT_PART_TYPES } from './content.js';
import { VALID_STREAM_EVENT_TYPES } from './stream.js';

// --- Content Part Guards ---

/** Check if a value is a valid CanonicalTextPart */
export function isCanonicalTextPart(v: unknown): v is { type: 'text'; text: string } {
  return isObj(v) && v.type === 'text' && typeof v.text === 'string';
}

/** Check if a value is a valid CanonicalImagePart */
export function isCanonicalImagePart(v: unknown): v is { type: 'image'; source: unknown } {
  return isObj(v) && v.type === 'image' && v.source !== undefined;
}

/** Check if a value is a valid CanonicalToolUsePart */
export function isCanonicalToolUsePart(v: unknown): v is { type: 'tool_use'; id: string; name: string; input: Record<string, unknown> } {
  return isObj(v) && v.type === 'tool_use'
    && typeof v.id === 'string'
    && typeof v.name === 'string'
    && isObj(v.input);
}

/** Check if a value is a valid CanonicalToolResultPart */
export function isCanonicalToolResultPart(v: unknown): v is { type: 'tool_result'; toolCallId: string; content: string } {
  return isObj(v) && v.type === 'tool_result'
    && typeof v.toolCallId === 'string'
    && typeof v.content === 'string';
}

/** Check if a value is a valid CanonicalThinkingPart */
export function isCanonicalThinkingPart(v: unknown): v is { type: 'thinking'; text: string } {
  return isObj(v) && v.type === 'thinking' && typeof v.text === 'string';
}

/**
 * Check if a value is a valid CanonicalContentPart.
 * Validates the discriminant and required fields per type.
 * Does NOT coerce — returns false for invalid data.
 */
export function isCanonicalContentPart(v: unknown): boolean {
  if (!isObj(v) || typeof v.type !== 'string') return false;
  if (!VALID_CONTENT_PART_TYPES.has(v.type)) return false;

  switch (v.type) {
    case 'text': return isCanonicalTextPart(v);
    case 'image': return isCanonicalImagePart(v);
    case 'tool_use': return isCanonicalToolUsePart(v);
    case 'tool_result': return isCanonicalToolResultPart(v);
    case 'thinking': return isCanonicalThinkingPart(v);
    default: return false;
  }
}

// --- Message Guard ---

/**
 * Check if a value is a valid CanonicalMessage.
 * Validates role is one of the canonical roles and content is an array.
 */
export function isCanonicalMessage(v: unknown): boolean {
  return isObj(v)
    && VALID_CANONICAL_ROLES.has(String(v.role))
    && Array.isArray(v.content)
    && v.content.every((p: unknown) => isCanonicalContentPart(p));
}

// --- Instruction Guard ---

/**
 * Check if a value is a valid CanonicalInstruction.
 * Validates role is system|developer, content is array, position is number.
 */
export function isCanonicalInstruction(v: unknown): boolean {
  return isObj(v)
    && VALID_CANONICAL_INSTRUCTION_ROLES.has(String(v.role))
    && Array.isArray(v.content)
    && v.content.every((p: unknown) => isCanonicalContentPart(p))
    && typeof v.position === 'number'
    && v.position >= 0;
}

// --- Tool Guard ---

/**
 * Check if a value is a valid CanonicalTool.
 * Validates name is a non-empty string.
 */
export function isCanonicalTool(v: unknown): boolean {
  return isObj(v)
    && typeof v.name === 'string'
    && v.name.length > 0;
}

// --- Request Guard ---

/**
 * Check if a value is a valid CanonicalRequest.
 * Validates model (string), instructions (array), messages (array).
 */
export function isCanonicalRequest(v: unknown): boolean {
  return isObj(v)
    && typeof v.model === 'string'
    && v.model.length > 0
    && Array.isArray(v.instructions)
    && v.instructions.every((i: unknown) => isCanonicalInstruction(i))
    && Array.isArray(v.messages)
    && v.messages.every((m: unknown) => isCanonicalMessage(m));
}

// --- Response Guard ---

/**
 * Check if a value is a valid CanonicalResponse.
 * Validates id, model, provider, and content.
 */
export function isCanonicalResponse(v: unknown): boolean {
  return isObj(v)
    && typeof v.id === 'string'
    && typeof v.model === 'string'
    && typeof v.provider === 'string'
    && Array.isArray(v.content)
    && v.content.every((p: unknown) => isCanonicalContentPart(p));
}

// --- Stream Event Guard ---

/**
 * Check if a value is a valid CanonicalStreamEvent.
 * Validates the type discriminant is one of the 9 known event types.
 */
export function isCanonicalStreamEvent(v: unknown): boolean {
  return isObj(v)
    && typeof v.type === 'string'
    && VALID_STREAM_EVENT_TYPES.has(v.type);
}

// --- Error Guard ---

/**
 * Check if a value is a valid CanonicalError.
 * Validates code, message, and retryable.
 */
export function isCanonicalError(v: unknown): boolean {
  return isObj(v)
    && typeof v.code === 'string'
    && typeof v.message === 'string'
    && typeof v.retryable === 'boolean';
}

// --- Internal helper ---

function isObj(v: unknown): v is Record<string, unknown> {
  return v !== null && typeof v === 'object' && !Array.isArray(v);
}
