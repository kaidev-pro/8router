// 8Router — OpenAI Chat Completions Types
// Phase 1B: Input/output types for OpenAI format conversion

/**
 * OpenAI Chat Completions message — the input format we parse.
 * Supports all OpenAI role types: system, developer, user, assistant, tool.
 */
export interface OpenAIChatMessage {
  role: 'system' | 'developer' | 'user' | 'assistant' | 'tool';
  content: string | OpenAIContentPart[] | null;
  name?: string;
  tool_calls?: OpenAIToolCall[];
  tool_call_id?: string;
}

/** OpenAI content part — text or image */
export type OpenAIContentPart =
  | { type: 'text'; text: string }
  | { type: 'image_url'; image_url: { url: string; detail?: 'low' | 'high' | 'auto' } };

/** OpenAI tool call in an assistant message */
export interface OpenAIToolCall {
  id: string;
  type: 'function';
  function: {
    name: string;
    arguments: string; // JSON string — must be parsed, never double-stringified
  };
}

/** OpenAI tool definition */
export interface OpenAITool {
  type: 'function';
  function: {
    name: string;
    description?: string;
    parameters?: Record<string, unknown>;
    strict?: boolean;
  };
}

/** OpenAI tool choice — string or object */
export type OpenAIToolChoice =
  | 'none'
  | 'auto'
  | 'required'
  | { type: 'function'; function: { name: string } };

/** OpenAI response format */
export interface OpenAIResponseFormat {
  type: 'text' | 'json_object' | 'json_schema';
  json_schema?: { name?: string; strict?: boolean; schema?: Record<string, unknown> };
}

/**
 * OpenAI Chat Completions request — full input.
 * All fields besides model and messages are optional.
 */
export interface OpenAIChatRequest {
  model: string;
  messages: OpenAIChatMessage[];
  stream?: boolean;
  temperature?: number;
  top_p?: number;
  max_tokens?: number;
  max_completion_tokens?: number;
  stop?: string | string[];
  tools?: OpenAITool[];
  tool_choice?: OpenAIToolChoice;
  response_format?: OpenAIResponseFormat;
  metadata?: Record<string, unknown>;
  frequency_penalty?: number;
  presence_penalty?: number;
  seed?: number;
  user?: string;
  parallel_tool_calls?: boolean;
  [key: string]: unknown; // Allow additional OpenAI fields
}
