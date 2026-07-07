// 8Router — Canonical Barrel Exports
// Phase 1A: Type contracts only — no runtime behavior change
//
// IMPORTANT: This file uses ONLY `export type` to avoid ESM runtime
// import errors. Runtime modules (guards.ts, capabilities.ts) are
// exported separately as value exports.

// --- Type-only re-exports ---
export type { CanonicalRole, CanonicalInstructionRole } from './roles.js';
export { VALID_CANONICAL_ROLES, VALID_CANONICAL_INSTRUCTION_ROLES } from './roles.js';

export type {
  CanonicalContentPart,
  CanonicalTextPart,
  CanonicalImagePart,
  CanonicalImageSource,
  CanonicalToolUsePart,
  CanonicalToolResultPart,
  CanonicalThinkingPart,
} from './content.js';
export { VALID_CONTENT_PART_TYPES } from './content.js';

export type { CanonicalInstruction } from './instruction.js';
export type { CanonicalMessage } from './message.js';

export type {
  CanonicalTool,
  CanonicalToolCall,
  CanonicalToolChoice,
} from './tools.js';

export type { CanonicalUsage } from './usage.js';

export type {
  CanonicalResponse,
  CanonicalFinishReason,
} from './response.js';

export type {
  CanonicalRequest,
  CanonicalBridgeMeta,
  BridgeWarning,
  BridgeWarningCode,
  ShadowStatus,
  CanonicalResponseFormat,
} from './request.js';

export type {
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
} from './stream.js';
export { VALID_STREAM_EVENT_TYPES } from './stream.js';

export type { CanonicalError } from './errors.js';

export type {
  CanonicalExtensions,
  OpenAIExtensions,
  AnthropicExtensions,
  GeminiExtensions,
  ResponsesExtensions,
} from './extensions.js';

export type { CanonicalCapability, CapabilityValidationResult } from './capabilities.js';
export { validateCapabilities } from './capabilities.js';

// Guards are runtime values — import directly from './guards.js'
// Re-exported here for convenience
export {
  isCanonicalContentPart,
  isCanonicalMessage,
  isCanonicalInstruction,
  isCanonicalTool,
  isCanonicalRequest,
  isCanonicalResponse,
  isCanonicalStreamEvent,
  isCanonicalError,
} from './guards.js';
