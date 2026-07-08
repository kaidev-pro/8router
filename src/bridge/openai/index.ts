// 8Router — OpenAI Bridge Barrel Exports
// Phase 1B: Export all OpenAI conversion functions and types

// Types
export type {
  OpenAIChatMessage,
  OpenAIContentPart,
  OpenAIToolCall,
  OpenAITool,
  OpenAIToolChoice,
  OpenAIResponseFormat,
  OpenAIChatRequest,
} from './types.js';

// Request conversion
export { openaiRequestToCanonical, type ConversionResult } from './request-to-canonical.js';
export { canonicalRequestToOpenai, type SerializationResult } from './request-from-canonical.js';

// Content conversion
export { openaiContentToCanonical, canonicalContentToOpenai } from './content.js';

// Tool conversion
export {
  openaiToolsToCanonical,
  canonicalToolsToOpenai,
  openaiToolChoiceToCanonical,
  canonicalToolChoiceToOpenai,
  openaiToolCallsToCanonical,
  canonicalToolCallsToOpenai,
} from './tools.js';

// Usage conversion
export { openaiUsageToCanonical, canonicalUsageToOpenai, type OpenAIUsage } from './usage.js';

// Warning accumulator
export { WarningAccumulator } from './warnings.js';

/**
 * OpenAI extension field allowlist.
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
