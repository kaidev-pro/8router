// 8Router — Anthropic Messages API Types
// Phase 1C: Input/output types for Anthropic ↔ Canonical conversion

/**
 * Anthropic Messages API request — full input.
 * Reference: https://docs.anthropic.com/en/api/messages
 */
export interface AnthropicRequest {
  model: string;
  /** Max tokens to generate — required by Anthropic */
  max_tokens: number;
  /** System prompt — string or array of content blocks */
  system?: string | AnthropicSystemBlock[];
  /** Conversation messages */
  messages: AnthropicMessage[];
  /** Tool definitions */
  tools?: AnthropicTool[];
  /** Tool choice strategy */
  tool_choice?: AnthropicToolChoice;
  /** Sampling temperature */
  temperature?: number;
  /** Nucleus sampling */
  top_p?: number;
  /** Top-K sampling */
  top_k?: number;
  /** Stop sequences */
  stop_sequences?: string[];
  /** Whether to stream */
  stream?: boolean;
  /** Request metadata */
  metadata?: Record<string, unknown>;
}

/**
 * Anthropic system prompt block — can include cache control.
 */
export interface AnthropicSystemBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' } | null;
}

/**
 * Anthropic conversation message.
 */
export interface AnthropicMessage {
  role: 'user' | 'assistant';
  content: string | AnthropicContentBlock[];
}

/**
 * Anthropic content block — discriminated union on `type`.
 */
export type AnthropicContentBlock =
  | AnthropicTextBlock
  | AnthropicImageBlock
  | AnthropicToolUseBlock
  | AnthropicToolResultBlock
  | AnthropicThinkingBlock;

export interface AnthropicTextBlock {
  type: 'text';
  text: string;
}

export interface AnthropicImageBlock {
  type: 'image';
  source: AnthropicImageSource;
}

export type AnthropicImageSource =
  | { type: 'base64'; media_type: string; data: string }
  | { type: 'url'; url: string };

export interface AnthropicToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface AnthropicToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content?: string | AnthropicContentBlock[];
  is_error?: boolean;
}

export interface AnthropicThinkingBlock {
  type: 'thinking';
  thinking: string;
}

/**
 * Anthropic tool definition.
 */
export interface AnthropicTool {
  name: string;
  description?: string;
  input_schema: Record<string, unknown>;
}

/**
 * Anthropic tool choice — discriminated union.
 */
export type AnthropicToolChoice =
  | { type: 'auto' }
  | { type: 'any' }
  | { type: 'tool'; name: string };

/**
 * Anthropic Messages API response.
 */
export interface AnthropicResponse {
  id: string;
  type: 'message';
  role: 'assistant';
  model: string;
  content: AnthropicContentBlock[];
  stop_reason: 'end_turn' | 'max_tokens' | 'tool_use' | 'stop_sequence' | null;
  stop_sequence: string | null;
  usage: AnthropicUsage;
}

/**
 * Anthropic usage.
 */
export interface AnthropicUsage {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number;
  cache_read_input_tokens?: number;
}

/**
 * Anthropic error response body.
 */
export interface AnthropicErrorResponse {
  type: 'error';
  error: {
    type: string;
    message: string;
  };
}
