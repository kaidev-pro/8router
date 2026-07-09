// 8Router — Bridge Module Barrel
// Phase 1A: Type contracts only — no runtime behavior change

// Canonical types (type-only exports for ESM safety)
export type {
  // Roles
  CanonicalRole,
  CanonicalInstructionRole,
  // Content
  CanonicalContentPart,
  CanonicalTextPart,
  CanonicalImagePart,
  CanonicalImageSource,
  CanonicalToolUsePart,
  CanonicalToolResultPart,
  CanonicalThinkingPart,
  // Instruction
  CanonicalInstruction,
  // Message
  CanonicalMessage,
  // Tools
  CanonicalTool,
  CanonicalToolCall,
  CanonicalToolChoice,
  // Request
  CanonicalRequest,
  CanonicalResponseFormat,
  CanonicalBridgeMeta,
  BridgeWarning,
  BridgeWarningCode,
  ShadowStatus,
  // Response
  CanonicalResponse,
  CanonicalFinishReason,
  // Usage
  CanonicalUsage,
  // Stream
  CanonicalStreamEvent,
  StreamMessageStart,
  StreamContentDelta,
  StreamThinkingDelta,
  StreamToolCallStart,
  StreamToolCallDelta,
  StreamToolCallEnd,
  StreamUsageUpdate,
  StreamMessageEnd,
  StreamErrorEvent,
  // Errors
  CanonicalError,
  // Extensions
  CanonicalExtensions,
  OpenAIExtensions,
  AnthropicExtensions,
  GeminiExtensions,
  ResponsesExtensions,
  // Capabilities
  CanonicalCapability,
  CapabilityValidationResult,
} from './canonical/index.js';

// Runtime value exports
export {
  // Constants
  VALID_CANONICAL_ROLES,
  VALID_CANONICAL_INSTRUCTION_ROLES,
  VALID_CONTENT_PART_TYPES,
  VALID_STREAM_EVENT_TYPES,
  // Functions
  validateCapabilities,
  // Guards
  isCanonicalContentPart,
  isCanonicalMessage,
  isCanonicalInstruction,
  isCanonicalTool,
  isCanonicalRequest,
  isCanonicalResponse,
  isCanonicalStreamEvent,
  isCanonicalError,
} from './canonical/index.js';

// Config
export type { CanonicalConfig } from './config.js';
export { DEFAULT_CANONICAL_CONFIG, loadCanonicalConfigFromEnv, mergeCanonicalConfig } from './config.js';

// OpenAI bridge (Phase 1B)
export { openaiRequestToCanonical, canonicalRequestToOpenai } from './openai/index.js';
export type { ConversionResult as OpenAIConversionResult, SerializationResult } from './openai/index.js';

// Anthropic bridge (Phase 1C)
export {
  anthropicRequestToCanonical,
  canonicalRequestToAnthropic,
  anthropicContentToCanonical,
  anthropicBlockToCanonical,
  canonicalContentToAnthropic,
  anthropicToolsToCanonical,
  canonicalToolsToAnthropic,
  anthropicToolChoiceToCanonical,
  canonicalToolChoiceToAnthropic,
  anthropicUsageToCanonical,
  canonicalUsageToAnthropic,
} from './anthropic/index.js';
export type { AnthropicConversionResult, AnthropicSerializationResult } from './anthropic/index.js';

// OpenAI Response bridge (Phase 1D)
export {
  openaiResponseToCanonical,
  canonicalResponseToOpenai,
  OpenAIStreamToCanonical,
  openaiChunksToCanonicalEvents,
  canonicalEventsToOpenaiChunks,
  canonicalEventToOpenaiChunk,
} from './openai/index.js';
export type {
  OpenAIResponseToCanonicalResult,
  OpenAIResponseSerializationResult,
} from './openai/index.js';

// Gemini bridge (Phase 1E)
export {
  geminiRequestToCanonical,
  canonicalRequestToGemini,
} from './gemini/index.js';
export type { GeminiConversionResult, GeminiSerializationResult } from './gemini/index.js';

// OpenAI Responses API bridge (Phase 1F)
export {
  responsesRequestToCanonical,
  canonicalRequestToResponses,
  responsesResponseToCanonical,
  canonicalResponseToResponses,
  ResponsesStreamToCanonical,
  responsesEventsToCanonicalEvents,
  canonicalEventsToResponsesEvents,
  canonicalEventToResponsesEvents,
  responsesUsageToCanonical,
  canonicalUsageToResponses,
} from './openai-responses/index.js';
export type {
  ResponsesConversionResult,
  ResponsesSerializationResult,
  ResponsesResponseToCanonicalResult,
  ResponsesResponseSerializationResult,
} from './openai-responses/index.js';
