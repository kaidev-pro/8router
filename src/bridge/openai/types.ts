// 8Router — OpenAI Chat Completions Types
// Phase 1B: Input types. Phase 1D: Response types.

// ─── Request Types ───────────────────────────────────────────────────

/** OpenAI Chat Completions message — the input format we parse. */
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

/** OpenAI Chat Completions request */
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
  service_tier?: string;
  store?: boolean;
}

// ─── Response Types ──────────────────────────────────────────────────

/** OpenAI Chat Completions response — non-streaming result. */
export interface OpenAIChatCompletionResponse {
  id: string;
  object: 'chat.completion';
  created: number;
  model: string;
  choices: OpenAIChatCompletionChoice[];
  usage?: OpenAICompletionUsage;
  /** OpenAI system fingerprint for deterministic output */
  system_fingerprint?: string;
  service_tier?: string;
}

/** A single choice in a non-streaming response. */
export interface OpenAIChatCompletionChoice {
  index: number;
  message: OpenAIChatCompletionMessage;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: unknown;
}

/** The message content of a non-streaming choice. */
export interface OpenAIChatCompletionMessage {
  role: 'assistant';
  content: string | null;
  tool_calls?: OpenAIToolCall[];
  refusal?: string | null;
}

/** Usage object in a non-streaming response. */
export interface OpenAICompletionUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens?: number;
  prompt_tokens_details?: {
    cached_tokens?: number;
    audio_tokens?: number;
  };
  completion_tokens_details?: {
    reasoning_tokens?: number;
    audio_tokens?: number;
    accepted_prediction_tokens?: number;
    rejected_prediction_tokens?: number;
  };
}

// ─── Streaming Types ─────────────────────────────────────────────────

/** OpenAI streaming chunk — a single SSE data payload. */
export interface OpenAIChatCompletionChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: OpenAIChatCompletionChunkChoice[];
  usage?: OpenAICompletionUsage;
  system_fingerprint?: string;
  service_tier?: string;
}

/** A single choice in a streaming chunk. */
export interface OpenAIChatCompletionChunkChoice {
  index: number;
  delta: OpenAIChatCompletionDelta;
  finish_reason: 'stop' | 'length' | 'tool_calls' | 'content_filter' | null;
  logprobs?: unknown;
}

/** The delta payload in a streaming chunk. */
export interface OpenAIChatCompletionDelta {
  role?: 'assistant';
  content?: string;
  tool_calls?: OpenAIStreamToolCall[];
  refusal?: string | null;
}

/** Tool call delta in a streaming chunk. */
export interface OpenAIStreamToolCall {
  index: number;
  id?: string;
  type?: 'function';
  function?: {
    name?: string;
    arguments?: string;
  };
}
