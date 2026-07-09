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

// Constants
export { OPENAI_EXTENSION_ALLOWLIST, SUSPICIOUS_FIELD_PATTERNS } from './constants.js';
