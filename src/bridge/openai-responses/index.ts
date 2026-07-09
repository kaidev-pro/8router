// 8Router — OpenAI Responses API Bridge Barrel Exports
// Phase 1F: Request/Response/Streaming ↔ Canonical conversion.

// Types
export type {
  ResponsesRequest,
  ResponsesInputItem,
  ResponsesInputMessage,
  ResponsesInputTextItem,
  ResponsesInputImageItem,
  ResponsesInputFileItem,
  ResponsesFunctionCallOutput,
  ResponsesContentPart,
  ResponsesTextContentPart,
  ResponsesImageContentPart,
  ResponsesTool,
  ResponsesFunctionTool,
  ResponsesWebSearchTool,
  ResponsesFileSearchTool,
  ResponsesComputerUseTool,
  ResponsesCodeInterpreterTool,
  ResponsesToolChoice,
  ResponsesReasoningConfig,
  ResponsesTextConfig,
  ResponsesTextFormat,
  ResponsesTruncationConfig,
  ResponsesResponse,
  ResponsesError,
  ResponsesUsage,
  ResponsesReasoningOutput,
  ResponsesOutputItem,
  ResponsesOutputMessageItem,
  ResponsesOutputReasoningItem,
  ResponsesOutputFunctionCallItem,
  ResponsesOutputContentPart,
  ResponsesOutputTextPart,
  ResponsesOutputRefusalPart,
  ResponsesAnnotation,
  ResponsesStreamEvent,
} from './types.js';

// Request conversion
export { responsesRequestToCanonical, type ResponsesConversionResult } from './request-to-canonical.js';
export { canonicalRequestToResponses, type ResponsesSerializationResult } from './canonical-to-request.js';

// Response conversion
export { responsesResponseToCanonical, type ResponsesResponseToCanonicalResult } from './response-to-canonical.js';
export { canonicalResponseToResponses, type ResponsesResponseSerializationResult } from './canonical-to-response.js';

// Streaming conversion
export { ResponsesStreamToCanonical, responsesEventsToCanonicalEvents } from './stream-to-canonical.js';
export { canonicalEventsToResponsesEvents, canonicalEventToResponsesEvents } from './canonical-to-stream.js';

// Usage
export { responsesUsageToCanonical, canonicalUsageToResponses } from './usage.js';
