// 8Router — OpenAI Bridge Barrel Exports
// Phase 1B: Request conversion. Phase 1D: Response + Streaming conversion.

// Types
export type {
  OpenAIChatMessage,
  OpenAIContentPart,
  OpenAIToolCall,
  OpenAITool,
  OpenAIToolChoice,
  OpenAIResponseFormat,
  OpenAIChatRequest,
  OpenAIChatCompletionResponse,
  OpenAIChatCompletionChoice,
  OpenAIChatCompletionMessage,
  OpenAICompletionUsage,
  OpenAIChatCompletionChunk,
  OpenAIChatCompletionChunkChoice,
  OpenAIChatCompletionDelta,
  OpenAIStreamToolCall,
} from './types.js';

// Request conversion (Phase 1B)
export { openaiRequestToCanonical, type ConversionResult } from './request-to-canonical.js';
export { canonicalRequestToOpenai, type SerializationResult } from './request-from-canonical.js';

// Response conversion (Phase 1D)
export { openaiResponseToCanonical, type OpenAIResponseToCanonicalResult } from './response-to-canonical.js';
export { canonicalResponseToOpenai, type OpenAIResponseSerializationResult } from './canonical-to-response.js';

// Streaming conversion (Phase 1D)
export { OpenAIStreamToCanonical, openaiChunksToCanonicalEvents } from './stream-to-canonical.js';
export { canonicalEventsToOpenaiChunks, canonicalEventToOpenaiChunk } from './canonical-to-stream.js';

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
