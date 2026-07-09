// 8Router — OpenAI Responses API Types
// Phase 1F: Types for Responses API ↔ Canonical conversion.

// ─── Request Types ───────────────────────────────────────────────────

/** Responses API request */
export interface ResponsesRequest {
  model: string;
  input: string | ResponsesInputItem[];
  instructions?: string;
  tools?: ResponsesTool[];
  tool_choice?: ResponsesToolChoice;
  parallel_tool_calls?: boolean;
  max_output_tokens?: number;
  temperature?: number;
  top_p?: number;
  stream?: boolean;
  metadata?: Record<string, unknown>;
  reasoning?: ResponsesReasoningConfig;
  text?: ResponsesTextConfig;
  truncation?: ResponsesTruncationConfig;
  previous_response_id?: string;
  store?: boolean;
  include?: string[];
  user?: string;
}

/** A single input item — discriminated by type or role */
export type ResponsesInputItem =
  | ResponsesInputMessage
  | ResponsesInputTextItem
  | ResponsesInputImageItem
  | ResponsesInputFileItem
  | ResponsesFunctionCallOutput;

/** Message-style input item */
export interface ResponsesInputMessage {
  type: 'message';
  role: 'user' | 'assistant';
  content: ResponsesContentPart[];
}

/** Plain text input (shorthand for message with single text part) */
export interface ResponsesInputTextItem {
  type: 'input_text';
  text: string;
}

/** Image input (URL or base64) */
export interface ResponsesInputImageItem {
  type: 'input_image';
  image_url?: string;
  /** Base64 encoded image data */
  data?: string;
  /** MIME type when using base64 data */
  mime_type?: string;
}

/** File input */
export interface ResponsesInputFileItem {
  type: 'input_file';
  /** File content (text) */
  content?: string;
  /** Filename */
  filename?: string;
}

/** Function call output (tool result) */
export interface ResponsesFunctionCallOutput {
  type: 'function_call_output';
  /** The call ID this output responds to */
  call_id: string;
  /** The output content (text) */
  output: string;
}

/** Content part within a message input */
export type ResponsesContentPart =
  | ResponsesTextContentPart
  | ResponsesImageContentPart;

export interface ResponsesTextContentPart {
  type: 'input_text';
  text: string;
}

export interface ResponsesImageContentPart {
  type: 'input_image';
  image_url?: string;
  data?: string;
  mime_type?: string;
}

/** Tool definition */
export type ResponsesTool =
  | ResponsesFunctionTool
  | ResponsesWebSearchTool
  | ResponsesFileSearchTool
  | ResponsesComputerUseTool
  | ResponsesCodeInterpreterTool;

/** Function tool */
export interface ResponsesFunctionTool {
  type: 'function';
  name: string;
  description?: string;
  parameters?: Record<string, unknown>;
  strict?: boolean;
}

/** Web search tool */
export interface ResponsesWebSearchTool {
  type: 'web_search_preview' | 'web_search';
  [key: string]: unknown;
}

/** File search tool */
export interface ResponsesFileSearchTool {
  type: 'file_search';
  vector_store_ids?: string[];
  [key: string]: unknown;
}

/** Computer use tool */
export interface ResponsesComputerUseTool {
  type: 'computer_use_preview' | 'computer_use';
  [key: string]: unknown;
}

/** Code interpreter tool */
export interface ResponsesCodeInterpreterTool {
  type: 'code_interpreter';
  [key: string]: unknown;
}

/** Tool choice */
export type ResponsesToolChoice =
  | 'none'
  | 'auto'
  | 'required'
  | { type: 'function'; name: string }
  | { type: 'web_search_preview' }
  | { type: 'file_search' }
  | { type: 'computer_use_preview' }
  | { type: 'code_interpreter' };

/** Reasoning config */
export interface ResponsesReasoningConfig {
  effort?: 'low' | 'medium' | 'high';
  summary?: 'auto' | 'concise' | 'detailed' | 'none';
}

/** Text config */
export interface ResponsesTextConfig {
  format?: ResponsesTextFormat;
}

export type ResponsesTextFormat =
  | { type: 'text' }
  | { type: 'json_object' }
  | { type: 'json_schema'; name?: string; schema?: Record<string, unknown>; strict?: boolean };

/** Truncation config */
export interface ResponsesTruncationConfig {
  type?: 'disabled' | 'auto';
  last_messages?: number;
}

// ─── Response Types ──────────────────────────────────────────────────

/** Responses API response */
export interface ResponsesResponse {
  id: string;
  object: 'response';
  created_at: number;
  status: 'completed' | 'in_progress' | 'incomplete' | 'failed';
  error?: ResponsesError;
  incomplete_details?: { reason?: string };
  model: string;
  output: ResponsesOutputItem[];
  output_text?: string;
  usage?: ResponsesUsage;
  metadata?: Record<string, unknown>;
  reasoning?: ResponsesReasoningOutput;
  text?: { format?: ResponsesTextFormat };
  tools?: ResponsesTool[];
  tool_choice?: ResponsesToolChoice;
  parallel_tool_calls?: boolean;
  previous_response_id?: string;
}

/** Error in response */
export interface ResponsesError {
  code: string;
  message: string;
  param?: string;
  type?: string;
}

/** Usage */
export interface ResponsesUsage {
  input_tokens: number;
  output_tokens: number;
  total_tokens?: number;
  output_tokens_details?: {
    reasoning_tokens?: number;
  };
  input_tokens_details?: {
    cached_tokens?: number;
  };
}

/** Reasoning output */
export interface ResponsesReasoningOutput {
  effort?: string;
  summary?: string;
}

/** Output item — discriminated by type */
export type ResponsesOutputItem =
  | ResponsesOutputMessageItem
  | ResponsesOutputReasoningItem
  | ResponsesOutputFunctionCallItem
  | ResponsesOutputWebSearchCallItem
  | ResponsesOutputFileSearchCallItem
  | ResponsesOutputComputerCallItem
  | ResponsesOutputCodeInterpreterCallItem
  | ResponsesOutputImageGenerationCallItem;

/** Output message item */
export interface ResponsesOutputMessageItem {
  type: 'message';
  id: string;
  role: 'assistant';
  status: 'completed' | 'in_progress' | 'incomplete';
  content: ResponsesOutputContentPart[];
}

/** Output content part */
export type ResponsesOutputContentPart =
  | ResponsesOutputTextPart
  | ResponsesOutputRefusalPart;

export interface ResponsesOutputTextPart {
  type: 'output_text';
  text: string;
  annotations?: ResponsesAnnotation[];
}

export interface ResponsesOutputRefusalPart {
  type: 'refusal';
  refusal: string;
}

/** Annotation on output text */
export interface ResponsesAnnotation {
  type: string;
  [key: string]: unknown;
}

/** Output reasoning item */
export interface ResponsesOutputReasoningItem {
  type: 'reasoning';
  id: string;
  summary?: ResponsesReasoningSummary[];
}

export interface ResponsesReasoningSummary {
  type: 'summary_text';
  text: string;
}

/** Output function call item */
export interface ResponsesOutputFunctionCallItem {
  type: 'function_call';
  id: string;
  call_id: string;
  name: string;
  arguments: string; // JSON string
  status?: string;
}

/** Output web search call item */
export interface ResponsesOutputWebSearchCallItem {
  type: 'web_search_call';
  id: string;
  status?: string;
  [key: string]: unknown;
}

/** Output file search call item */
export interface ResponsesOutputFileSearchCallItem {
  type: 'file_search_call';
  id: string;
  status?: string;
  [key: string]: unknown;
}

/** Output computer call item */
export interface ResponsesOutputComputerCallItem {
  type: 'computer_call';
  id: string;
  status?: string;
  [key: string]: unknown;
}

/** Output code interpreter call item */
export interface ResponsesOutputCodeInterpreterCallItem {
  type: 'code_interpreter_call';
  id: string;
  status?: string;
  [key: string]: unknown;
}

/** Output image generation call item */
export interface ResponsesOutputImageGenerationCallItem {
  type: 'image_generation_call';
  id: string;
  status?: string;
  [key: string]: unknown;
}

// ─── Streaming Types ─────────────────────────────────────────────────

/** Base event fields for all streaming events */
export interface ResponsesStreamEventBase {
  type: string;
  event_id?: string;
}

/** response.created */
export interface ResponsesStreamCreatedEvent extends ResponsesStreamEventBase {
  type: 'response.created';
  response: ResponsesResponse;
}

/** response.in_progress */
export interface ResponsesStreamInProgressEvent extends ResponsesStreamEventBase {
  type: 'response.in_progress';
  response: ResponsesResponse;
}

/** response.completed */
export interface ResponsesStreamCompletedEvent extends ResponsesStreamEventBase {
  type: 'response.completed';
  response: ResponsesResponse;
}

/** response.failed */
export interface ResponsesStreamFailedEvent extends ResponsesStreamEventBase {
  type: 'response.failed';
  response: ResponsesResponse;
}

/** response.incomplete */
export interface ResponsesStreamIncompleteEvent extends ResponsesStreamEventBase {
  type: 'response.incomplete';
  response: ResponsesResponse;
}

/** response.output_item.added */
export interface ResponsesStreamOutputItemAddedEvent extends ResponsesStreamEventBase {
  type: 'response.output_item.added';
  output_index: number;
  item: ResponsesOutputItem;
}

/** response.output_item.done */
export interface ResponsesStreamOutputItemDoneEvent extends ResponsesStreamEventBase {
  type: 'response.output_item.done';
  output_index: number;
  item: ResponsesOutputItem;
}

/** response.content_part.added */
export interface ResponsesStreamContentPartAddedEvent extends ResponsesStreamEventBase {
  type: 'response.content_part.added';
  output_index: number;
  content_index: number;
  part: ResponsesOutputContentPart;
}

/** response.content_part.done */
export interface ResponsesStreamContentPartDoneEvent extends ResponsesStreamEventBase {
  type: 'response.content_part.done';
  output_index: number;
  content_index: number;
  part: ResponsesOutputContentPart;
}

/** response.output_text.delta */
export interface ResponsesStreamTextDeltaEvent extends ResponsesStreamEventBase {
  type: 'response.output_text.delta';
  output_index: number;
  content_index: number;
  delta: string;
}

/** response.output_text.done */
export interface ResponsesStreamTextDoneEvent extends ResponsesStreamEventBase {
  type: 'response.output_text.done';
  output_index: number;
  content_index: number;
  text: string;
}

/** response.function_call_arguments.delta */
export interface ResponsesStreamFunctionCallDeltaEvent extends ResponsesStreamEventBase {
  type: 'response.function_call_arguments.delta';
  output_index: number;
  delta: string;
}

/** response.function_call_arguments.done */
export interface ResponsesStreamFunctionCallDoneEvent extends ResponsesStreamEventBase {
  type: 'response.function_call_arguments.done';
  output_index: number;
  arguments: string;
}

/** response.reasoning_summary_text.delta */
export interface ResponsesStreamReasoningSummaryDeltaEvent extends ResponsesStreamEventBase {
  type: 'response.reasoning_summary_text.delta';
  output_index: number;
  content_index: number;
  delta: string;
}

/** response.reasoning_summary_text.done */
export interface ResponsesStreamReasoningSummaryDoneEvent extends ResponsesStreamEventBase {
  type: 'response.reasoning_summary_text.done';
  output_index: number;
  content_index: number;
  text: string;
}

/** error event */
export interface ResponsesStreamErrorEvent extends ResponsesStreamEventBase {
  type: 'error';
  error: ResponsesError;
}

/** All Responses API streaming event types */
export type ResponsesStreamEvent =
  | ResponsesStreamCreatedEvent
  | ResponsesStreamInProgressEvent
  | ResponsesStreamCompletedEvent
  | ResponsesStreamFailedEvent
  | ResponsesStreamIncompleteEvent
  | ResponsesStreamOutputItemAddedEvent
  | ResponsesStreamOutputItemDoneEvent
  | ResponsesStreamContentPartAddedEvent
  | ResponsesStreamContentPartDoneEvent
  | ResponsesStreamTextDeltaEvent
  | ResponsesStreamTextDoneEvent
  | ResponsesStreamFunctionCallDeltaEvent
  | ResponsesStreamFunctionCallDoneEvent
  | ResponsesStreamReasoningSummaryDeltaEvent
  | ResponsesStreamReasoningSummaryDoneEvent
  | ResponsesStreamErrorEvent;
