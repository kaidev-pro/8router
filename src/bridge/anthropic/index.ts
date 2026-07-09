// 8Router — Anthropic Bridge Barrel Exports
// Phase 1C: All Anthropic ↔ Canonical conversion functions

export { anthropicRequestToCanonical } from './request-to-canonical.js';
export { canonicalRequestToAnthropic } from './request-from-canonical.js';
export { anthropicContentToCanonical, anthropicBlockToCanonical, canonicalContentToAnthropic } from './content.js';
export { anthropicToolsToCanonical, canonicalToolsToAnthropic, anthropicToolChoiceToCanonical, canonicalToolChoiceToAnthropic } from './tools.js';
export { anthropicUsageToCanonical, canonicalUsageToAnthropic } from './usage.js';

export type { AnthropicConversionResult } from './request-to-canonical.js';
export type { AnthropicSerializationResult } from './request-from-canonical.js';

// Re-export all Anthropic types
export type {
  AnthropicRequest,
  AnthropicMessage,
  AnthropicContentBlock,
  AnthropicTextBlock,
  AnthropicImageBlock,
  AnthropicToolUseBlock,
  AnthropicToolResultBlock,
  AnthropicThinkingBlock,
  AnthropicTool,
  AnthropicToolChoice,
  AnthropicResponse,
  AnthropicUsage,
  AnthropicErrorResponse,
  AnthropicImageSource,
  AnthropicSystemBlock,
} from './types.js';
