# Phase 1 — Canonical Format Bridge: Design Review

> **Status:** Phase 1A–1E COMPLETE. Phase 1F pending. canonical.enabled remains false.
> **Date:** 2026-07-07 (updated 2026-07-08)
> **Author:** Renji Akamine
> **Baseline:** d552681 (v0.6.2)
> **Revision:** v3 — updated Phase 1C–1F roadmap labels to match actual implementation

### Phase Roadmap (corrected)

| Phase | Label | Status | Commit |
|---|---|---|---|
| 1A | Canonical Types & Config | ✅ Complete | 8c9d809 |
| 1B | OpenAI Chat Request ↔ Canonical | ✅ Complete | c9aa4b7, 062b0e2 |
| 1C | Anthropic Messages Request ↔ Canonical | ✅ Complete | 8e7725f |
| 1D | OpenAI Response + Streaming ↔ Canonical | ✅ Complete | d5eff6c |
| 1E | Gemini Request ↔ Canonical | ✅ Complete | cbd7d9e |
| 1F | Responses API ↔ Canonical | 🔲 Pending | — |

---

## Table of Contents

1. [Canonical Type Design](#1-canonical-type-design)
2. [Instruction Ordering Semantics](#2-instruction-ordering-semantics)
3. [Canonical Tool-Role Semantics](#3-canonical-tool-role-semantics)
4. [Field Mapping Tables](#4-field-mapping-tables)
5. [Streaming Event Mapping](#5-streaming-event-mapping)
6. [Streaming Tool Argument Lifecycle](#6-streaming-tool-argument-lifecycle)
7. [Unsupported Field Strategy](#7-unsupported-field-strategy)
8. [Capability Model](#8-capability-model)
9. [CanonicalError vs Routing Failure Boundary](#9-canonicalerror-vs-routing-failure-boundary)
10. [Migration Strategy](#10-migration-strategy)
11. [Shadow Mode Privacy and Memory Limits](#11-shadow-mode-privacy-and-memory-limits)
12. [Files to Create and Modify](#12-files-to-create-and-modify)
13. [Test Fixture Plan](#13-test-fixture-plan)
14. [Explicit Non-Goals](#14-explicit-non-goals)
15. [Risk Review](#15-risk-review)

---

## 1. Canonical Type Design

All types live in `src/providers/canonical-types.ts`. Engine, adapters, and format-bridge import from here. Zero provider-specific shapes leak into the routing layer.

### 1.1 CanonicalContentPart

```ts
/**
 * A single content part within a CanonicalMessage.
 * Providers may not support all part types — see Unsupported Field Strategy §7.
 */
export type CanonicalContentPart =
  | CanonicalTextPart
  | CanonicalImagePart
  | CanonicalToolUsePart
  | CanonicalToolResultPart
  | CanonicalThinkingPart;

export interface CanonicalTextPart {
  type: 'text';
  text: string;
}

export interface CanonicalImagePart {
  type: 'image';
  /** Base64-encoded image data OR a URL */
  source: string;
  /** MIME type: image/png, image/jpeg, image/webp, image/gif */
  mediaType: string;
}

export interface CanonicalToolUsePart {
  type: 'tool_use';
  /** Unique tool call ID — preserved from provider or generated */
  id: string;
  /** Tool/function name */
  name: string;
  /** Parsed arguments object — ONLY for completed responses.
   *  During streaming, arguments are raw string fragments in stream events. */
  input: Record<string, unknown>;
}

export interface CanonicalToolResultPart {
  type: 'tool_result';
  /** References the tool_use ID this result responds to */
  toolUseId: string;
  /** Result content — can be text or error */
  content: string;
  /** True if tool execution failed */
  isError?: boolean;
}

export interface CanonicalThinkingPart {
  type: 'thinking';
  /** Reasoning/thinking text from reasoning models */
  text: string;
}
```

### 1.2 CanonicalInstruction

```ts
/**
 * Ordered instruction from the client. Preserves role (system vs developer)
 * and original position in the instruction/message interleaving.
 *
 * System and developer instructions are semantically distinct:
 * - system: base behavioral instructions (OpenAI, Anthropic, Gemini)
 * - developer: override instructions that take precedence (OpenAI Responses API)
 *
 * Both are separated from the message array to match provider-native semantics
 * (Anthropic/Gemini have system as separate field). OpenAI inline system/developer
 * messages are extracted during toCanonical() with their position recorded.
 */
export type CanonicalInstructionRole = 'system' | 'developer';

export interface CanonicalInstruction {
  /** 'system' or 'developer' — the provider-specific instruction type */
  role: CanonicalInstructionRole;
  /** Instruction content */
  content: CanonicalContentPart[];
  /** Original position index in the full instruction+message interleaving.
   *  0-based. Used by output adapters to restore original ordering. */
  position: number;
  /** Optional cache hint for providers that support it (Anthropic) */
  cacheControl?: 'ephemeral';
  /** Optional metadata preserved from original format */
  metadata?: Record<string, unknown>;
}
```

### 1.3 CanonicalMessage

```ts
/**
 * Canonical message roles.
 * 'tool' is a first-class role — NOT demoted to 'user'.
 * Provider adapters handle role translation (e.g., Anthropic embeds tool results
 * as content blocks within 'user' messages).
 */
export type CanonicalRole = 'system' | 'developer' | 'user' | 'assistant' | 'tool';

export interface CanonicalMessage {
  role: CanonicalRole;
  /** Content parts — can be mixed (text + image, text + tool_use, etc.) */
  content: CanonicalContentPart[];
  /** Optional metadata preserved from original format */
  metadata?: Record<string, unknown>;
}
```

**Design decisions:**
- `role: 'tool'` is preserved as a first-class canonical role. Provider adapters translate:
  - OpenAI → `role: 'tool'` with `tool_call_id` + string content
  - Anthropic → `role: 'user'` with `tool_result` content block
  - Gemini → `functionResponse` content part
- System/developer instructions are separated into `CanonicalRequest.instructions[]` with explicit ordering. They do NOT appear in the `messages` array.
- `role: 'system'` and `role: 'developer'` may appear in `CanonicalMessage[]` only when they are interleaved with conversation messages in a way that provider adapters need to re-interleave. In practice, the standard flow extracts them to `instructions[]`.

### 1.4 CanonicalTool

```ts
/**
 * Tool/function definition.
 * Unified across OpenAI (function), Anthropic (tool), Gemini (function_declarations).
 */
export interface CanonicalTool {
  type: 'function';
  /** Function name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** JSON Schema for input parameters */
  parameters?: Record<string, unknown>;
  /** Anthropic-style: whether this tool requires user approval */
  requiresApproval?: boolean;
}
```

### 1.5 CanonicalToolCall

```ts
/**
 * A completed tool call in a response. For streaming, see §6.
 * arguments is always a parsed object in completed form.
 */
export interface CanonicalToolCall {
  /** Unique ID — from provider or generated (e.g., Gemini doesn't provide IDs) */
  id: string;
  type: 'function';
  /** Function name */
  name: string;
  /** Parsed arguments object — guaranteed valid JSON */
  arguments: Record<string, unknown>;
}
```

### 1.6 CanonicalRequest

```ts
/**
 * Provider-agnostic request format.
 * The engine, token saver, and combo router operate on this type.
 */
export interface CanonicalRequest {
  /** Model identifier (already resolved from alias/combo) */
  model: string;

  /** Ordered instructions — system and developer, preserving original interleaving position */
  instructions: CanonicalInstruction[];

  /** Conversation messages — no system/developer messages (those are in instructions[]) */
  messages: CanonicalMessage[];

  /** Tool definitions */
  tools?: CanonicalTool[];

  /** Tool choice strategy */
  toolChoice?: CanonicalToolChoice;

  /** Maximum output tokens */
  maxTokens?: number;

  /** Sampling temperature (0-2) */
  temperature?: number;

  /** Nucleus sampling parameter */
  topP?: number;

  /** Stop sequences */
  stopSequences?: string[];

  /** Response format constraint */
  responseFormat?: CanonicalResponseFormat;

  /** Whether to stream the response */
  stream?: boolean;

  /** Provider-specific extensions — allowlisted fields only, NOT raw body.
   *  See §7 and §8 for allowlist policy. */
  extensions?: CanonicalExtensions;

  /** Bridge metadata — used internally, never sent to provider or client */
  _bridge?: CanonicalBridgeMeta;
}

export type CanonicalToolChoice =
  | { type: 'auto' }
  | { type: 'required' }
  | { type: 'none' }
  | { type: 'tool'; name: string };

export interface CanonicalResponseFormat {
  /** 'json_object' forces JSON output, 'json_schema' validates against schema */
  type: 'text' | 'json_object' | 'json_schema';
  /** JSON Schema for structured output (only with type='json_schema') */
  schema?: Record<string, unknown>;
}

/**
 * Provider-specific extensions — allowlisted fields only.
 * Each provider section contains ONLY safe, documented fields that
 * cannot be represented in canonical form.
 *
 * NEVER store raw request body. NEVER store API keys or secrets.
 */
export interface CanonicalExtensions {
  openai?: {
    frequency_penalty?: number;
    presence_penalty?: number;
    logit_bias?: Record<string, number>;
    logprobs?: boolean;
    top_logprobs?: number;
    parallel_tool_calls?: boolean;
    seed?: number;
  };
  anthropic?: {
    top_k?: number;
    metadata?: Record<string, unknown>;
  };
  gemini?: {
    topK?: number;
    safetySettings?: Array<{ category: string; threshold: string }>;
  };
}

/**
 * Internal bridge metadata — NOT serialized to provider or client.
 * Used by shadow mode, debugging, and internal tracking only.
 */
export interface CanonicalBridgeMeta {
  /** Original client format: 'openai' | 'anthropic' | 'gemini' | 'responses' */
  sourceFormat: string;
  /** Semantic fingerprint for shadow comparison — NOT the raw body.
   *  SHA-256 hash of key fields: model, message count, role sequence,
   *  tool names, content length. Max 64 bytes. */
  fingerprint?: string;
  /** Warnings generated during canonical conversion */
  warnings?: string[];
}
```

### 1.7 CanonicalUsage

```ts
/**
 * Token usage — normalized across all providers.
 */
export interface CanonicalUsage {
  /** Input/prompt tokens */
  inputTokens: number;
  /** Output/completion tokens */
  outputTokens: number;
  /** Total tokens (may differ from input+output if provider reports differently) */
  totalTokens?: number;
  /** Tokens read from cache (Anthropic cache_read, OpenAI cached_tokens) */
  cachedInputTokens?: number;
  /** Tokens used for cache creation (Anthropic cache_creation only) */
  cacheCreationTokens?: number;
  /** Tokens used for reasoning/thinking (OpenAI o1, DeepSeek R1) */
  reasoningTokens?: number;
}
```

### 1.8 CanonicalResponse

```ts
/**
 * Provider-agnostic response format.
 * The engine operates on this; output adapters convert back to client format.
 */
export interface CanonicalResponse {
  /** Provider-assigned request ID */
  id: string;
  /** Model that actually served the response (may differ from requested) */
  model: string;
  /** Response content — may be empty if only tool calls */
  content: CanonicalContentPart[];
  /** Structured tool calls (subset of content that are tool_use parts) */
  toolCalls: CanonicalToolCall[];
  /** Reason for stopping */
  finishReason: CanonicalFinishReason;
  /** Token usage */
  usage?: CanonicalUsage;
  /** Provider that served this response */
  provider?: string;
  /** Provider-specific metadata preserved through canonical form */
  metadata?: Record<string, unknown>;
}

export type CanonicalFinishReason =
  | 'stop'          // natural end
  | 'max_tokens'    // hit output limit
  | 'tool_calls'    // model wants to call a tool
  | 'content_filter' // safety filter triggered
  | 'error';        // partial response before error
```

### 1.9 CanonicalError

```ts
/**
 * Structured error from the canonical bridge layer ONLY.
 * Represents format/validation/serialization errors.
 *
 * DOES NOT represent routing failures, circuit breaker decisions,
 * or provider connectivity issues — those are handled by the
 * failure classifier (Phase 3) and key-pool (existing).
 *
 * See §9 for the separation boundary.
 */
export interface CanonicalError {
  /** HTTP status code (or synthesized code) */
  status: number;
  /** Machine-readable error type */
  type: string;
  /** Human-readable message — MUST be sanitized (no raw keys) */
  message: string;
  /** Provider-specific error code */
  code?: string;
  /** Whether the client can retry this request.
   *  true = transient/format error, false = permanent rejection */
  retryable: boolean;
}
```

### 1.10 CanonicalStreamEvent

```ts
/**
 * Streaming event types. 9 event types covering the full stream lifecycle.
 *
 * Events:
 * 1. message_start    — stream opened, provider identified
 * 2. content_delta    — incremental text content
 * 3. thinking_delta   — incremental reasoning/thinking content
 * 4. tool_call_start  — tool call opened (id, name)
 * 5. tool_call_delta  — incremental JSON arguments fragment
 * 6. tool_call_end    — tool call completed, parsed arguments available
 * 7. usage            — token usage update
 * 8. message_end      — stream closed, final finish reason
 * 9. stream_error     — error occurred, fallback status
 *
 * All events carry stable indexes for deterministic ordering:
 * - contentBlockIndex: which content block (0, 1, 2, ...)
 * - toolCallIndex: which tool call (0, 1, 2, ...)
 * - providerEventId: original provider event ID if available
 */
export type CanonicalStreamEvent =
  | StreamMessageStart
  | StreamContentDelta
  | StreamThinkingDelta
  | StreamToolCallStart
  | StreamToolCallDelta
  | StreamToolCallEnd
  | StreamUsageUpdate
  | StreamMessageEnd
  | StreamErrorEvent;

export interface StreamMessageStart {
  type: 'message_start';
  /** Request ID */
  id: string;
  /** Model being used */
  model: string;
  /** Provider event ID (e.g., Anthropic's message_start.id) */
  providerEventId?: string;
}

export interface StreamContentDelta {
  type: 'content_delta';
  /** Incremental text */
  delta: string;
  /** Content block index — 0 for first text block, increments for new blocks */
  contentBlockIndex: number;
}

export interface StreamThinkingDelta {
  type: 'thinking_delta';
  /** Incremental thinking/reasoning text */
  delta: string;
  /** Content block index */
  contentBlockIndex: number;
}

export interface StreamToolCallStart {
  type: 'tool_call_start';
  /** Index of tool call in the response (0-based, stable) */
  toolCallIndex: number;
  /** Tool call ID — provided by provider or generated for Gemini */
  id: string;
  /** Function name */
  name: string;
  /** Content block index */
  contentBlockIndex: number;
}

export interface StreamToolCallDelta {
  type: 'tool_call_delta';
  /** Index of tool call (matches the start event) */
  toolCallIndex: number;
  /** Incremental JSON arguments — RAW STRING FRAGMENT, NOT parsed */
  argumentsDelta: string;
}

export interface StreamToolCallEnd {
  type: 'tool_call_end';
  /** Index of tool call */
  toolCallIndex: number;
  /** Successfully parsed arguments object (null if parse failed) */
  arguments: Record<string, unknown> | null;
  /** If JSON parsing failed, contains sanitized error message */
  parseError?: string;
}

export interface StreamUsageUpdate {
  type: 'usage';
  usage: CanonicalUsage;
}

export interface StreamMessageEnd {
  type: 'message_end';
  /** Final finish reason */
  finishReason: CanonicalFinishReason;
  /** Final usage (may be absent if provider doesn't send in stream) */
  usage?: CanonicalUsage;
}

export interface StreamErrorEvent {
  type: 'stream_error';
  /** Error details */
  error: CanonicalError;
  /** Whether fallback is still possible.
   *  true ONLY if no content bytes have been flushed to the client yet.
   *  This is a runtime state tracked by the stream handler, not a payload field. */
  fallbackAllowed: boolean;
}
```

### 1.11 Capability Validation Result

```ts
/**
 * Result of capability validation — NOT a simple boolean.
 * Contains detailed eligibility analysis for debugging and routing.
 */
export interface CapabilityValidationResult {
  /** Whether the request is eligible for the target provider/model */
  eligible: boolean;
  /** Capabilities required by this request but not supported by target */
  missing: string[];
  /** Non-fatal warnings (e.g., field will be dropped, will use extension) */
  warnings: string[];
  /** All capabilities this request requires (for logging/debugging) */
  required: string[];
}
```

---

## 2. Instruction Ordering Semantics

### 2.1 Problem

OpenAI may interleave system and developer messages within the conversation history:
```json
{"role": "system", "content": "You are a helpful assistant."},
{"role": "user", "content": "Hello"},
{"role": "developer", "content": "Be concise."},
{"role": "user", "content": "What is 2+2?"}
```

Extracting all system/developer messages to a single array loses their position relative to conversation messages. Different providers handle instructions differently:
- **OpenAI Chat Completions**: system/developer messages inline in message array
- **OpenAI Responses API**: `instructions` is a separate top-level field
- **Anthropic**: `system` is a separate top-level field (string or array)
- **Gemini**: `systemInstruction` is a separate top-level field

### 2.2 Canonical Representation

`CanonicalRequest.instructions[]` stores all system/developer messages with their **original position index**:

```json
{
  "instructions": [
    {"role": "system", "content": [{"type": "text", "text": "You are a helpful assistant."}], "position": 0},
    {"role": "developer", "content": [{"type": "text", "text": "Be concise."}], "position": 3}
  ],
  "messages": [
    {"role": "user", "content": [{"type": "text", "text": "Hello"}]},
    {"role": "user", "content": [{"type": "text", "text": "What is 2+2?"}]}
  ]
}
```

### 2.3 Serialization Rules

| Target Provider | Rule |
|---|---|
| **OpenAI Chat Completions** | Re-interleave: `instructions[0]` at position 0 (as `role:'system'`), then `messages[0]`, then `instructions[1]` at position 3 (as `role:'developer'`), etc. |
| **OpenAI Responses API** | All system instructions → `instructions` field. Developer instructions → `instructions` field with role preserved. |
| **Anthropic** | All system instructions (role:'system') → `system` field. All developer instructions (role:'developer') → prepended to first user message as system block, or concatenated to `system` field with separator. Log warning about semantic difference. |
| **Gemini** | All instructions → `systemInstruction` field. Developer instructions merged with warning. |

### 2.4 Constraints

1. **No silent concatenation** — If multiple system/developer messages are joined, they use an explicit separator (`\n\n`) and the bridge logs a warning.
2. **Position is the source of truth** — Output adapters use `position` to reconstruct ordering.
3. **Round-trip test** — Interleaved system/developer/user messages must survive round-trip through canonical form with position preserved.
4. **Anthropic folding** — When Anthropic receives instructions that were interleaved, the bridge folds developer instructions into `system` array with cache control preserved, and logs a warning that position is lost in the Anthropic representation.

---

## 3. Canonical Tool-Role Semantics

### 3.1 Problem

Tool results have a distinct semantic meaning across providers:
- **OpenAI**: `role: 'tool'` message with `tool_call_id` and string content
- **Anthropic**: `role: 'user'` message with `content: [{type: 'tool_result', tool_use_id, content}]`
- **Gemini**: `role: 'user'` message with `parts: [{functionResponse: {name, response}}]`

Demoting `tool` to `user` in canonical form loses the semantic distinction and makes round-trip conversion lossy.

### 3.2 Canonical Representation

```json
{
  "role": "tool",
  "content": [
    {"type": "tool_result", "toolUseId": "call_abc123", "content": "42", "isError": false}
  ]
}
```

### 3.3 Provider Adapter Mapping

| Target Provider | Canonical `role:'tool'` → |
|---|---|
| **OpenAI Chat Completions** | `role: 'tool'` with `tool_call_id` extracted from `toolResult.toolUseId`, content stringified |
| **OpenAI Responses API** | `role: 'tool'` with `call_id` extracted from `toolResult.toolUseId` |
| **Anthropic** | `role: 'user'` with `content: [{type: 'tool_result', tool_use_id, content}]` |
| **Gemini** | `role: 'user'` with `parts: [{functionResponse: {name, response}}]` — name must be resolved from preceding tool_use |

### 3.4 Required Test Fixture

```
[1] assistant  → tool_use (call_abc123, "get_weather", {city: "Tokyo"})
[2] tool       → tool_result (call_abc123, "{\"temp\": 22}")
[3] assistant  → text ("The weather in Tokyo is 22°C.")
```

Verify:
- `toolCallId` in [2] matches `id` in [1]
- After round-trip, [2] role is 'tool' (not 'user')
- Ordering is preserved: assistant → tool → assistant

### 3.5 Multi-Tool-Call Ordering

When an assistant message contains multiple tool_use parts:
```json
[
  {"role": "assistant", "content": [
    {"type": "tool_use", "id": "call_a", "name": "get_weather", "input": {...}},
    {"type": "tool_use", "id": "call_b", "name": "get_time", "input": {...}}
  ]},
  {"role": "tool", "content": [
    {"type": "tool_result", "toolUseId": "call_a", "content": "..."},
    {"type": "tool_result", "toolUseId": "call_b", "content": "..."}
  ]}
]
```

**OpenAI adapter**: Must emit two separate `role:'tool'` messages (one per tool_call_id), preserving order.

**Anthropic adapter**: Emits single `role:'user'` message with multiple `tool_result` content blocks.

**Gemini adapter**: Emits single `role:'user'` message with multiple `functionResponse` parts.

---

## 4. Field Mapping Tables

### 4.1 OpenAI Chat Completions ↔ Canonical

#### Request

| OpenAI Field | Canonical Field | Direction | Notes |
|---|---|---|---|
| `model` | `model` | ↔ | Direct |
| `messages[{role:'system'}]` | `instructions[]` | → | Extracted, role preserved, position recorded |
| `messages[{role:'developer'}]` | `instructions[]` | → | Extracted, role preserved, position recorded |
| `messages[{role:'user'}]` | `messages[{role:'user'}]` | ↔ | Content parts mapped |
| `messages[{role:'assistant'}]` | `messages[{role:'assistant'}]` | ↔ | tool_calls → content parts |
| `messages[{role:'tool'}]` | `messages[{role:'tool'}]` | ↔ | **Preserved as role 'tool'** |
| `messages[].content` (string) | `content: [{type:'text',text}]` | → | Wrapped in array |
| `messages[].content` (array) | `content: [...]` | ↔ | Parts mapped individually |
| `messages[].tool_calls[]` | `content: [{type:'tool_use',...}]` | → | Merged into content array |
| `messages[].tool_call_id` | ToolResultPart.toolUseId | → | Linked to parent tool_use |
| `tools[].function.name` | `tools[].name` | → | Unwrapped from function wrapper |
| `tools[].function.description` | `tools[].description` | → | Unwrapped |
| `tools[].function.parameters` | `tools[].parameters` | → | Unwrapped |
| `tool_choice` (string) | `toolChoice.type` | → | `"auto"` → `{type:'auto'}` |
| `tool_choice` (object) | `toolChoice` | → | `{type:"function",...}` → `{type:'tool',name}` |
| `max_tokens` | `maxTokens` | → | camelCase normalization |
| `temperature` | `temperature` | ↔ | Direct |
| `top_p` | `topP` | → | camelCase normalization |
| `stop` | `stopSequences` | → | Always normalized to array |
| `response_format` | `responseFormat` | → | `{type:"json_object"}` mapped |
| `stream` | `stream` | ↔ | Direct |
| `frequency_penalty` | `extensions.openai.frequency_penalty` | → | Allowlisted extension |
| `presence_penalty` | `extensions.openai.presence_penalty` | → | Allowlisted extension |
| `logit_bias` | `extensions.openai.logit_bias` | → | Allowlisted extension |
| `n` | *(warning + drop)* | → | warn if n>1 |
| `logprobs` | `extensions.openai.logprobs` | → | Allowlisted extension |
| `response_format.schema` | `responseFormat.schema` | → | For json_schema type |

#### Response

| OpenAI Field | Canonical Field | Direction | Notes |
|---|---|---|---|
| `id` | `id` | ↔ | Direct |
| `model` | `model` | ↔ | Direct |
| `choices[0].message.content` | `content: [{type:'text',...}]` | ← | Unwrapped from choices |
| `choices[0].message.tool_calls` | `toolCalls[]` + `content[{type:'tool_use'}]` | ← | Populated in both |
| `choices[0].finish_reason` | `finishReason` | ← | `"stop"`→`"stop"`, `"tool_calls"`→`"tool_calls"` |
| `usage.prompt_tokens` | `usage.inputTokens` | ← | Renamed |
| `usage.completion_tokens` | `usage.outputTokens` | ← | Renamed |
| `usage.total_tokens` | `usage.totalTokens` | ← | Direct |
| `usage.prompt_tokens_details.cached_tokens` | `usage.cachedInputTokens` | ← | Extracted |
| `usage.completion_tokens_details.reasoning_tokens` | `usage.reasoningTokens` | ← | Extracted |

### 4.2 OpenAI Responses API ↔ Canonical

| Responses API Field | Canonical Field | Direction | Notes |
|---|---|---|---|
| `model` | `model` | ↔ | Direct |
| `input[{role:'system'}]` | `instructions[]` | → | Extracted |
| `input[{role:'developer'}]` | `instructions[]` | → | Extracted |
| `input[{role:'user'}]` | `messages[{role:'user'}]` | → | Content mapped |
| `input[{role:'assistant'}]` | `messages[{role:'assistant'}]` | → | Content mapped |
| `input[].content` (array of parts) | `content: [...]` | ↔ | Parts mapped |
| `output[].content[].type:'output_text'` | `{type:'text'}` | ← | Type renamed |
| `output[].content[].type:'tool_use'` | `{type:'tool_use'}` | ← | Direct mapping |
| `tools[].type:'function'` | `tools[]` | → | Same as Chat Completions |
| `instructions` | `instructions[]` | → | Direct mapping |
| `max_output_tokens` | `maxTokens` | → | Renamed |
| `temperature` | `temperature` | ↔ | Direct |
| `stream` | `stream` | ↔ | Direct |
| `response.format` | `responseFormat` | → | Mapped |
| `output[].finish_reason` | `finishReason` | ← | Same values |
| `usage.input_tokens` | `usage.inputTokens` | ← | Renamed |
| `usage.output_tokens` | `usage.outputTokens` | ← | Renamed |

### 4.3 Anthropic Messages ↔ Canonical

#### Request

| Anthropic Field | Canonical Field | Direction | Notes |
|---|---|---|---|
| `model` | `model` | ↔ | Direct |
| `system` (string) | `instructions: [{role:'system',text}]` | → | Wrapped in array |
| `system` (array of blocks) | `instructions: [{role:'system',...}]` | → | Each block → instruction |
| `system[].cache_control` | `instructions[].cacheControl` | → | Mapped |
| `messages[{role:'user'}]` | `messages[{role:'user'}]` | ↔ | Content mapped |
| `messages[{role:'assistant'}]` | `messages[{role:'assistant'}]` | ↔ | Content mapped |
| `messages[].content[].type:'tool_result'` | `messages[{role:'tool'}]` | → | **Role elevated to 'tool'** |
| `messages[].content[].type:'tool_use'` | `{type:'tool_use'}` | ↔ | Direct |
| `tools[].name` | `tools[].name` | ↔ | Direct |
| `tools[].input_schema` | `tools[].parameters` | → | Renamed |
| `max_tokens` | `maxTokens` | → | Renamed |
| `top_k` | `extensions.anthropic.top_k` | → | Allowlisted extension |
| `metadata` | `extensions.anthropic.metadata` | → | Allowlisted extension |

#### Response

| Anthropic Field | Canonical Field | Direction | Notes |
|---|---|---|---|
| `content[].type:'tool_use'` | `content[{type:'tool_use'}]` + `toolCalls[]` | ← | Populated in both |
| `stop_reason` | `finishReason` | ← | `'end_turn'`→`'stop'`, `'tool_use'`→`'tool_calls'` |
| `usage.cache_creation_input_tokens` | `usage.cacheCreationTokens` | ← | **Separate from cache read** |
| `usage.cache_read_input_tokens` | `usage.cachedInputTokens` | ← | Direct |

### 4.4 Gemini generateContent ↔ Canonical

#### Request

| Gemini Field | Canonical Field | Direction | Notes |
|---|---|---|---|
| `systemInstruction.parts[]` | `instructions: [{role:'system',text}]` | → | Concatenated |
| `contents[].parts[].functionCall` | `{type:'tool_use'}` | → | Mapped |
| `contents[].parts[].functionResponse` | `{role:'tool'}` message | → | **Mapped to tool role** |
| `tools[].functionDeclarations[]` | `tools[]` | → | Unwrapped from array |
| `toolConfig.functionCallingConfig` | `toolChoice` | → | Mapped |
| `generationConfig.topK` | `extensions.gemini.topK` | → | Allowlisted extension |
| `generationConfig.responseMimeType` | `responseFormat.type` | → | `'application/json'` → `'json_object'` |
| `safetySettings` | `extensions.gemini.safetySettings` | → | Allowlisted extension |

---

## 5. Streaming Event Mapping

### 5.1 Provider SSE → CanonicalStreamEvent

| Provider Event | Canonical Event | Notes |
|---|---|---|
| **OpenAI SSE** | | |
| `data: {choices:[{delta:{role:'assistant'}}]}` | `message_start` | First chunk with role |
| `data: {choices:[{delta:{content:'text'}}]}` | `content_delta` | contentBlockIndex=0 |
| `data: {choices:[{delta:{tool_calls:[{index:0,id,name}]}}]}` | `tool_call_start` | New tool call |
| `data: {choices:[{delta:{tool_calls:[{index:0,function:{arguments:'str'}}]}}]}` | `tool_call_delta` | argumentsDelta = raw string |
| `data: {choices:[{finish_reason:'stop'}]}` | `message_end` | finishReason='stop' |
| `data: {usage:{...}}` | `usage` | Final usage |
| `data: [DONE]` | *(no event — stream closes)* | Terminal signal |
| **OpenAI Responses SSE** | | |
| `response.created` | `message_start` | Response started |
| `response.output_text.delta` | `content_delta` | text delta |
| `response.output_item.added` (tool) | `tool_call_start` | id, name |
| `response.function_call_arguments.delta` | `tool_call_delta` | argumentsDelta |
| `response.completed` | `message_end` | Response complete |
| `response.usage` | `usage` | Usage update |
| **Anthropic SSE** | | |
| `message_start` | `message_start` | Contains model, id |
| `content_block_start` (text) | *(no event — delta follows)* | Block init |
| `content_block_delta` (text_delta) | `content_delta` | Incremental text |
| `content_block_start` (tool_use) | `tool_call_start` | id, name |
| `content_block_delta` (input_json_delta) | `tool_call_delta` | argumentsDelta |
| `content_block_stop` (tool_use) | `tool_call_end` | Parse accumulated args |
| `message_delta` (stop_reason) | `message_end` | Finish reason |
| `message_stop` | *(no event — stream closes)* | Terminal |
| `message_start.message.usage` | `usage` | Initial usage |
| `message_delta.usage` | `usage` | Final output tokens |
| **Gemini SSE** | | |
| `data: {candidates:[{content:{parts:[{text}]}}]}` | `content_delta` | Text chunk |
| `data: {candidates:[{content:{parts:[{functionCall}]}}]}` | `tool_call_start` + `tool_call_end` | Gemini sends complete (no streaming args) |
| `data: {candidates:[{finishReason:'STOP'}]}` | `message_end` | Stream complete |
| `data: {usageMetadata:{...}}` | `usage` | Usage |

### 5.2 CanonicalStreamEvent → Provider SSE

| Canonical Event | OpenAI SSE | Anthropic SSE | Gemini SSE |
|---|---|---|---|
| `message_start` | `{choices:[{delta:{role:'assistant'}}]}` | `message_start` | *(no-op)* |
| `content_delta` | `{choices:[{delta:{content}}]}` | `content_block_delta` | `{candidates:[{parts:[{text}]}]}` |
| `tool_call_start` | `{choices:[{delta:{tool_calls:[{index,id,name}]}}]}` | `content_block_start` (tool_use) | *(included in functionCall)* |
| `tool_call_delta` | `{choices:[{delta:{tool_calls:[{index,function:{arguments}}]}}]}` | `content_block_delta` (input_json) | *(N/A — Gemini sends complete)* |
| `tool_call_end` | *(N/A — args serialized incrementally)* | `content_block_stop` | `{candidates:[{functionResponse}]}]}` |
| `usage` | `{usage:{...}}` | `message_delta.usage` | `{usageMetadata:{...}}` |
| `message_end` | `{choices:[{finish_reason}]}` | `message_delta` + `message_stop` | `{candidates:[{finishReason}]}` |
| `stream_error` | `data: {error:{message,type}}` | `error` event | Error in response |

### 5.3 Streaming Fallback Contract

| Rule | Detail |
|---|---|
| **Fallback before first content** | `StreamErrorEvent.fallbackAllowed = true` only if NO `content_delta` or `tool_call_delta` events have been flushed to the client. |
| **message_start is not content** | A buffered `message_start` does NOT count as client output. It can be silently discarded on fallback. |
| **After first content byte** | `fallbackAllowed = false`. No silent restart. No provider switching. |
| **Stream interruption** | Logged as `stream_interrupted` with provider, event index, and error. |
| **No mixed chunks** | A single response stream NEVER mixes events from two different providers. |
| **Usage final event** | `usage` event must be emitted before `message_end`. If provider doesn't send usage, emit synthetic with zeros. |
| **Finish reason** | `message_end.finishReason` must be present. If provider omits, default to `'stop'`. |
| **Error sanitization** | `stream_error.error.message` MUST go through `sanitizeError()`. No raw API keys. |

### 5.4 Runtime Stream State

The stream handler maintains internal state that is NOT part of the public event payload:

```ts
interface StreamRuntimeState {
  /** Whether any content has been flushed to the client */
  firstOutputEmitted: boolean;
  /** Provider currently serving this stream */
  activeProviderId: string;
  /** Event counter for stable indexing */
  eventIndex: number;
  /** Content block counter */
  contentBlockIndex: number;
  /** Tool call accumulator map: index → accumulated JSON string */
  toolCallAccumulator: Map<number, string>;
  /** Whether this stream has been cancelled */
  cancelled: boolean;
}
```

---

## 6. Streaming Tool Argument Lifecycle

### 6.1 Problem

OpenAI and Anthropic stream tool call arguments as JSON fragments across multiple SSE events. These fragments are raw strings that may be:
- Incomplete JSON (`{"city":`)
- Contains escape sequences (`{"city": "New York"}`)
- Nested objects (`{"location": {"city": "Tokyo"`)
- Unicode characters

The canonical bridge must:
1. Accumulate fragments as raw strings (NOT parse incrementally)
2. Parse ONCE when the tool call is complete
3. Handle invalid JSON gracefully
4. Never double-stringify during serialization to OpenAI

### 6.2 Lifecycle

```
tool_call_start (id, name)
  │
  ▼  (multiple events)
tool_call_delta (argumentsDelta: '{"city"')
tool_call_delta (argumentsDelta: ': "Tokyo"')
tool_call_delta (argumentsDelta: '}')
  │
  ▼  (one per tool call)
tool_call_end (arguments: {city: "Tokyo"}, parseError: undefined)
```

### 6.3 Parsing Rules

1. **Accumulate** — `tool_call_delta.argumentsDelta` is concatenated into a buffer per tool call index.
2. **Parse at end** — On `tool_call_end`, attempt `JSON.parse(buffer)`.
3. **Success** — `arguments` = parsed object, `parseError` = undefined.
4. **Parse failure** — `arguments` = null, `parseError` = sanitized error message.
5. **No crash** — Invalid JSON never throws. The bridge logs a warning and emits `tool_call_end` with null arguments.
6. **Double-stringify guard** — When building OpenAI output, `arguments` is `JSON.stringify(canonicalToolCall.arguments)`. If arguments is null (parse failed), emit empty string `""` with a warning.

### 6.4 Required Tests

| Test | Input | Expected |
|---|---|---|
| Fragmented JSON | `{"city"` → `: "Tokyo"` → `}` | `{city: "Tokyo"}` |
| Escaped quotes | `{"msg": "He said \\"hello\\""}` | Parsed correctly |
| Nested objects | `{"loc": {"lat": 35` → `, "lng": 139}}` | `{loc: {lat: 35, lng: 139}}` |
| Unicode | `{"name": "東京"}` | `{name: "東京"}` |
| Incomplete stream | `{"city":` (no closing) | null + parseError |
| Invalid final JSON | `{city: Tokyo}` (no quotes) | null + parseError |
| Empty arguments | `` (empty string) | `{}` (empty object) |
| Array arguments | `{"items": [1, 2, 3]}` | `{items: [1, 2, 3]}` |

---

## 7. Unsupported Field Strategy

When a provider API doesn't support a canonical field, the bridge applies one of these strategies:

### 7.1 Strategy Matrix

| Strategy | When | Behavior | Example |
|---|---|---|---|
| **extensions.preserve** | Field is provider-specific, in allowlist | Store in `extensions.{provider}` | OpenAI `frequency_penalty`, Anthropic `top_k` |
| **warning.drop** | Field is provably irrelevant to target AND dropping is safe | Dropped with warning logged | Gemini `logprobs`, Anthropic `seed` |
| **capability.reject** | Request requires unsupported capability | Return `CanonicalError` before sending | Vision on text-only model |
| **semantic.translate** | Equivalent behavior, different syntax | Adapter translates | OpenAI `response_format` → Gemini `responseMimeType` |
| **hard.error** | Required field missing from canonical form | Return error to client | Anthropic `max_tokens` is undefined |

### 7.2 Specific Handling

| Field | OpenAI | Anthropic | Gemini | Strategy |
|---|---|---|---|---|
| `frequency_penalty` | ✅ native | ❌ | ❌ | extensions.preserve |
| `presence_penalty` | ✅ native | ❌ | ❌ | extensions.preserve |
| `logit_bias` | ✅ native | ❌ | ❌ | extensions.preserve |
| `top_k` | ❌ | ✅ native | ✅ native | extensions.preserve |
| `n` (multiple choices) | ✅ native | ❌ | ❌ | **capability.reject** if n>1 |
| `logprobs` | ✅ native | ❌ | ❌ | warning.drop |
| `parallel_tool_calls` | ✅ native | ❌ | ❌ | warning.drop (default true is safe) |
| `seed` | ✅ native | ❌ | ❌ | warning.drop |
| `response_format` | ✅ native | ❌ | ✅ (via mimeType) | semantic.translate |
| `vision` (image parts) | ✅ native | ✅ native | ✅ native | **capability.reject** if model lacks |
| `reasoning/thinking` | ✅ (o1/o3) | ✅ (extended) | ❌ | **capability.reject** if model lacks |
| `audio` | ✅ native | ❌ | ❌ | **capability.reject** on non-OpenAI |
| `cache_control` | ❌ | ✅ native | ❌ | warning.drop (Anthropic-only benefit) |
| `safetySettings` | ❌ | ❌ | ✅ native | extensions.preserve (Gemini) |

### 7.3 Decision Rules

1. **Semantic equivalent exists** → `semantic.translate`
2. **Provider-specific decoration, in allowlist** → `extensions.preserve`
3. **Dropping changes model behavior** → `capability.reject`
4. **Dropping is invisible to output** → `warning.drop` (logged, never silent)
5. **Never silently drop behavior-affecting fields** — that's a bug

---

## 8. Capability Model

### 8.1 Capability Types

```ts
export type CapabilityType =
  | 'chat'
  | 'streaming'
  | 'tools'
  | 'vision'
  | 'json_mode'
  | 'reasoning'
  | 'embeddings'
  | 'audio'
  | 'multimodal'
  | 'cached_input';
```

### 8.2 Capability Registry

```ts
export const CAPABILITY_REGISTRY: CapabilityEntry[] = [
  { capability: 'chat',         providers: ['openai','anthropic','google','groq','mistral','deepseek','together','fireworks','xai','ollama','lmstudio','vllm','openrouter','cerebras','sambanova','perplexity','replicate','cohere'] },
  { capability: 'streaming',    providers: ['openai','anthropic','google','groq','mistral','deepseek','together','fireworks','xai','ollama','lmstudio','vllm','openrouter'] },
  { capability: 'tools',        providers: ['openai','anthropic','google','groq','mistral','deepseek','together','fireworks','xai','ollama','openrouter'] },
  { capability: 'vision',       providers: ['openai','anthropic','google','xai'] },
  { capability: 'json_mode',    providers: ['openai','google','mistral','groq','together','deepseek'] },
  { capability: 'reasoning',    providers: ['openai','anthropic','deepseek'] },
  { capability: 'embeddings',   providers: ['openai','google'] },
  { capability: 'audio',        providers: ['openai'] },
  { capability: 'cached_input', providers: ['openai','anthropic','google'] },
];
```

### 8.3 Four-Layer Capability Validation

Capability validation must distinguish four layers:

| Layer | Source | Check |
|---|---|---|
| **Requested capability** | Derived from CanonicalRequest content | What does this request require? |
| **Model capability** | `model-capabilities.ts` | Does this model support the required capability? |
| **Provider adapter capability** | `canonical-adapters/index.ts` | Does the adapter implementation support the required capability? |
| **Client response-format capability** | Source format detection | Can the output adapter serialize to the client's expected format? |

**Example:** Model supports tools, but the adapter hasn't implemented streaming tool calls yet → target is ineligible for `stream: true` + `tools` requests.

### 8.4 Validation Function

```ts
function validateCapabilities(
  request: CanonicalRequest,
  targetProvider: string,
  targetModel: string,
  sourceFormat: string,
): CapabilityValidationResult {
  const missing: string[] = [];
  const warnings: string[] = [];
  const required: string[] = [];

  // 1. Detect required capabilities from request
  const hasImages = request.messages.some(m =>
    m.content.some(p => p.type === 'image')
  );
  const hasTools = (request.tools?.length ?? 0) > 0;
  const hasThinking = request.messages.some(m =>
    m.content.some(p => p.type === 'thinking')
  );
  const hasAudio = request.messages.some(m =>
    m.content.some(p => p.type === 'audio') // future
  );

  if (hasImages) required.push('vision');
  if (hasTools) required.push('tools');
  if (hasThinking) required.push('reasoning');
  if (request.stream) required.push('streaming');
  if (request.responseFormat?.type !== 'text') required.push('json_mode');
  if (hasAudio) required.push('audio');

  // 2. Check against capability registry
  for (const cap of required) {
    if (!supportsCapability(cap as CapabilityType, targetProvider, targetModel)) {
      missing.push(cap);
    }
  }

  // 3. Check adapter implementation support
  const adapter = getCanonicalAdapter(targetProvider);
  if (request.stream && !adapter.supportsStreaming) {
    missing.push('streaming');
  }
  if (hasTools && !adapter.supportsStreamingTools && request.stream) {
    warnings.push('streaming_tools_not_implemented');
  }

  // 4. Check client response-format compatibility
  if (sourceFormat === 'anthropic' && request.stream && hasTools) {
    warnings.push('anthropic_streaming_tool_calls_partial_support');
  }

  return {
    eligible: missing.length === 0,
    missing,
    warnings,
    required,
  };
}
```

### 8.5 Interaction with Existing `model-capabilities.ts`

- Existing `ModelCapability` flags continue for per-model lookups
- `CAPABILITY_REGISTRY` adds provider-level checks
- Phase 3 combo router uses both

**No changes to `model-capabilities.ts` in Phase 1.**

---

## 9. CanonicalError vs Routing Failure Boundary

### 9.1 Clear Separation

```
┌──────────────────────────────────────────────────────────────┐
│                     CANONICAL BRIDGE LAYER                    │
│                                                               │
│  CanonicalError:                                              │
│  - format validation errors                                   │
│  - serialization errors                                       │
│  - capability rejection (unsupported feature)                 │
│  - JSON parse failures                                        │
│  - missing required fields                                    │
│                                                               │
│  → Returns error to client directly                           │
│  → Does NOT interact with key-pool, circuit breaker, or       │
│    retry logic                                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│                    ROUTING / EXECUTION LAYER                   │
│                                                               │
│  FailureClassification (Phase 3 failure-classifier.ts):       │
│  - retryScope: 'key' | 'provider'                             │
│  - affectsProviderCircuit: boolean                             │
│  - cooldownMs: number                                         │
│  - isRetryable: boolean                                       │
│  - nextAction: 'try_next_key' | 'try_next_provider' | 'abort'│
│                                                               │
│  → Used by engine.ts callProvider() for retry decisions       │
│  → Used by key-pool.ts recordKeyFailure() for circuit breaker │
│  → NOT exposed to client                                      │
└──────────────────────────────────────────────────────────────┘
```

### 9.2 Rules

1. **CanonicalError never determines circuit behavior** — it is a format-layer concept
2. **CanonicalError never determines retry scope** — that's the failure classifier's job
3. **CanonicalError never touches key-pool.ts** — they are in separate layers
4. **Error flow:** Bridge error → client (4xx/5xx). Provider error → failure classifier → retry/circuit. These are independent paths.
5. **The `retryable` flag on CanonicalError** is advisory for the client (HTTP Retry-After), NOT for the engine's internal retry logic

---

## 10. Migration Strategy

### 10.1 Feature Flag

```ts
export interface CanonicalConfig {
  /** Enable canonical format bridge. Default: false */
  enabled: boolean;
  /** Shadow mode: run canonical conversion alongside direct, log diffs. Default: false */
  shadowMode: boolean;
  /** Which formats to route through canonical. Default: [] (none) */
  enabledFormats: ('openai' | 'anthropic' | 'gemini' | 'responses')[];
}
```

**Default: `enabled: false, shadowMode: false`.**

### 10.2 Migration Phases

| Step | What | When | Risk |
|---|---|---|---|
| 1 | Canonical Types & Config | Phase 1A | None — type-only, no runtime change |
| 2 | OpenAI Chat Request ↔ Canonical | Phase 1B | Low — behind canonical.enabled=false |
| 3 | Anthropic Messages Request ↔ Canonical | Phase 1C | Low — behind canonical.enabled=false |
| 4 | OpenAI Response + Streaming ↔ Canonical | Phase 1D | Low — behind flag |
| 5 | Gemini Request ↔ Canonical | Phase 1E | Low — behind flag |
| 6 | Responses API ↔ Canonical | Phase 1F | Low — behind flag |
| 7 | Shadow mode on all providers | Phase 1G | Low — compare-only |
| 8 | Enable canonical runtime path | Phase 1H | Medium — requires full regression |
| 10 | Remove direct translation | Phase 2+ | After 2 weeks production |

### 10.3 Rollback

Set `canonical.enabled = false` → instant revert to existing `normalizeRequest()`/`formatResponse()`.

---

## 11. Shadow Mode Privacy and Memory Limits

### 11.1 Safety Rules

| Rule | Detail |
|---|---|
| **No second provider request** | Shadow mode ONLY runs conversion + comparison. NEVER sends a request to any provider. |
| **No billing impact** | Shadow mode does NOT invoke any external API. Conversion is purely in-memory. |
| **No raw prompt storage** | `originalRequest` is NEVER stored. Shadow comparison uses `fingerprint` (SHA-256 of key fields). |
| **No public exposure** | Shadow results appear only in admin API and debug logs. Never in client responses. |
| **Memory limit** | Shadow comparison buffer capped at 100KB per request. Larger payloads trigger `bridge_shadow_skipped` with reason `'payload_too_large'`. |
| **Error isolation** | Shadow errors NEVER affect production request. Wrapped in try/catch with silent fallback. |

### 11.2 Shadow Metrics

```ts
interface ShadowMetrics {
  /** Total shadow comparisons attempted */
  bridge_shadow_total: number;
  /** Semantic match (no difference found) */
  bridge_shadow_match: number;
  /** Semantic mismatch (differences logged) */
  bridge_shadow_mismatch: number;
  /** Skipped (payload too large, config, etc.) */
  bridge_shadow_skipped: number;
  /** Shadow comparison itself errored */
  bridge_shadow_error: number;
}
```

Metrics are exposed via admin API `/admin/metrics/shadow` and logged every 100 requests.

### 11.3 Fingerprint Computation

```ts
function computeFingerprint(req: CanonicalRequest): string {
  const key = JSON.stringify({
    model: req.model,
    msgCount: req.messages.length,
    roles: req.messages.map(m => m.role),
    toolNames: req.tools?.map(t => t.name) ?? [],
    contentLengths: req.messages.map(m =>
      m.content.map(p => p.type === 'text' ? p.text.length : 0).reduce((a, b) => a + b, 0)
    ),
    stream: req.stream,
  });
  return createHash('sha256').update(key).digest('hex').slice(0, 16);
}
```

---

## 12. Files to Create and Modify

### 12.1 Files to Create

| File | Purpose | Phase |
|---|---|---|
| `src/providers/canonical-types.ts` | All canonical type definitions | 1A |
| `src/bridge/openai/` | OpenAI Chat Completions ↔ Canonical | 1B |
| `src/bridge/anthropic/` | Anthropic Messages ↔ Canonical | 1C |
| `src/bridge/canonical/` | Canonical type definitions + validators | 1A |
| `src/__tests__/openai-bridge.test.ts` | OpenAI bridge round-trip tests (35) | 1B |
| `src/__tests__/anthropic-bridge.test.ts` | Anthropic bridge round-trip tests (111) | 1C |
| `src/__tests__/canonical-bridge.test.ts` | Canonical type tests (30) | 1A |
| `tests/fixtures/bridge/openai/` | OpenAI test fixtures | 1B |
| `tests/fixtures/bridge/anthropic/` | Anthropic test fixtures (6) | 1C |
| `src/bridge/openai/streaming.ts` | OpenAI streaming event adapters | 1D |
| `src/bridge/gemini/` | Gemini generateContent ↔ Canonical | 1E |
| `src/bridge/responses/` | Responses API ↔ Canonical | 1F |

### 12.2 Files to Modify

| File | Change | Phase |
|---|---|---|
| `src/types.ts` | Add `CanonicalConfig` to `RouterConfig` | 1A |
| `src/config.ts` | Parse canonical config from YAML | 1A |
| `src/bridge/index.ts` | Barrel exports for all adapters | 1A, 1B, 1C |
| `src/api/server.ts` | Add canonical path branch | 1D |
| `src/router/engine.ts` | Accept `CanonicalRequest` | 1D |
| `src/__tests__/run.ts` | Add canonical test group | 1A |

### 12.3 Files NOT Modified in Phase 1

| File | Why |
|---|---|
| `src/providers/key-pool.ts` | Phase 0 scope only |
| `src/router/combos.ts` | Phase 3 |
| `src/compressor/rtk.ts` | Independent |
| `src/dashboard/dashboard.ts` | Phase 6 |
| `src/database.ts` | No schema changes |
| `src/providers/catalog.ts` | Unchanged |
| `src/providers/streaming-fallback.ts` | Phase 4 |
| `src/providers/adapter.ts` | Existing adapters unchanged until Phase 4 |
| `src/providers/adapter-extended.ts` | Existing adapters unchanged until Phase 4 |

---

## 13. Test Fixture Plan

### 13.1 Fixture Directory

```
src/__tests__/fixtures/canonical/
├── requests/
│   ├── openai-simple-text.json
│   ├── openai-interleaved-instructions.json      ← NEW
│   ├── openai-multiple-system-messages.json       ← NEW
│   ├── openai-developer-messages.json             ← NEW
│   ├── openai-multimodal.json
│   ├── openai-tools.json
│   ├── openai-tool-call-result-continuation.json  ← NEW
│   ├── openai-parallel-tool-calls.json            ← NEW
│   ├── openai-json-mode.json
│   ├── openai-reasoning.json
│   ├── anthropic-simple-text.json
│   ├── anthropic-tools.json
│   ├── anthropic-tool-results.json
│   ├── anthropic-cache-control.json
│   ├── anthropic-reasoning.json
│   ├── gemini-simple-text.json
│   ├── gemini-tools.json
│   ├── gemini-json-mode.json
│   ├── responses-simple-text.json
│   ├── responses-tools.json
│   ├── malformed-missing-model.json
│   └── malformed-no-messages.json
├── responses/
│   ├── openai-simple-text.json
│   ├── openai-tool-calls.json
│   ├── openai-reasoning-usage.json
│   ├── anthropic-simple-text.json
│   ├── anthropic-tool-use.json
│   ├── gemini-simple-text.json
│   └── gemini-function-call.json
├── streams/
│   ├── openai-text-stream.json
│   ├── openai-tool-stream-fragmented.json         ← NEW
│   ├── openai-tool-stream-escaped-quotes.json     ← NEW
│   ├── openai-tool-stream-nested.json             ← NEW
│   ├── openai-tool-stream-unicode.json            ← NEW
│   ├── openai-tool-stream-incomplete.json         ← NEW
│   ├── anthropic-text-stream.json
│   ├── anthropic-tool-stream.json
│   ├── gemini-text-stream.json
│   └── responses-text-stream.json
└── expected/
    ├── simple-text-canonical.json
    ├── interleaved-instructions-canonical.json     ← NEW
    ├── tool-call-continuation-canonical.json       ← NEW
    └── parallel-tool-calls-canonical.json          ← NEW
```

### 13.2 Required Test Fixtures (from approval)

| # | Fixture | What It Tests |
|---|---|---|
| 1 | `openai-interleaved-instructions.json` | System/developer messages interleaved with user messages, position preserved |
| 2 | `openai-multiple-system-messages.json` | Multiple system messages with ordering through canonical |
| 3 | `openai-tool-call-result-continuation.json` | assistant tool_use → tool tool_result → assistant continuation |
| 4 | `openai-parallel-tool-calls.json` | Multiple tool_use in one assistant, multiple tool_result responses |
| 5 | `openai-tool-stream-fragmented.json` | Streaming tool arguments across multiple chunks |
| 6 | `anthropic-image-large-payload.json` | Base64 image near size limit, memory cap check |
| 7 | extensions-allowlist.json | Provider-specific fields preserved in extensions, not raw body |
| 8 | unsupported-field-warning.json | Field dropped with warning logged, not silently dropped |
| 9 | shadow-mode-no-duplicate-request | Shadow mode test: no second provider call made |
| 10 | canonical-no-raw-request-in-logs | Verify originalRequest does not appear in logs/public response |
| 11 | canonical-independent-of-original | Canonical serialization succeeds without originalRequest |
| 12 | stream-fallback-after-content | StreamErrorEvent after first content has fallbackAllowed=false |

### 13.3 Round-Trip Test Pattern

```ts
describe('OpenAI round-trip', () => {
  for (const fixture of openaiFixtures) {
    it(`round-trips ${fixture.name}`, () => {
      const canonical = toCanonical(fixture.input, 'openai');
      const restored = fromCanonical(canonical, 'openai');
      expect(semanticEqual(fixture.input, restored)).toBe(true);
    });
  }
});

describe('Instruction ordering', () => {
  it('preserves interleaved system/developer position', () => {
    const input = loadFixture('openai-interleaved-instructions.json');
    const canonical = toCanonical(input, 'openai');
    // Verify instructions have correct position values
    expect(canonical.instructions[0].role).toBe('system');
    expect(canonical.instructions[0].position).toBe(0);
    expect(canonical.instructions[1].role).toBe('developer');
    expect(canonical.instructions[1].position).toBe(3);
    // Verify restoration
    const restored = fromCanonical(canonical, 'openai');
    expect(restored.messages[0].role).toBe('system');
    expect(restored.messages[2].role).toBe('developer');
  });
});

describe('Tool role preservation', () => {
  it('preserves tool role through round-trip', () => {
    const input = loadFixture('openai-tool-call-result-continuation.json');
    const canonical = toCanonical(input, 'openai');
    // Tool result messages should have role 'tool'
    const toolMsg = canonical.messages.find(m => m.role === 'tool');
    expect(toolMsg).toBeDefined();
    expect(toolMsg!.content[0].type).toBe('tool_result');
    // Round-trip
    const restored = fromCanonical(canonical, 'openai');
    const restoredTool = restored.messages.find(m => m.role === 'tool');
    expect(restoredTool).toBeDefined();
    expect(restoredTool!.tool_call_id).toBeDefined();
  });
});

describe('Shadow mode', () => {
  it('never makes a second provider request', () => {
    const requestLog = trackProviderRequests();
    setCanonicalConfig({ enabled: true, shadowMode: true });
    await processRequest(fixture);
    expect(requestLog.count).toBe(1); // Only the direct path
  });
});
```

---

## 14. Explicit Non-Goals for Phase 1

| Non-Goal | Why | Deferred To |
|---|---|---|
| **No connection pool rewrite** | key-pool.ts logic frozen | Phase 2 |
| **No combo engine implementation** | Combo routing stays as-is | Phase 3 |
| **No key-pool rewrite** | PoolKey, circuit breaker, rotation preserved | Phase 2 |
| **No circuit-breaker behavior change** | d552681 regression contracts remain | Phase 2 |
| **No provider OAuth implementation** | Token refresh not in scope | Phase 2 |
| **No dashboard redesign** | Dashboard unchanged | Phase 6 |
| **No new provider additions** | Bridge for existing providers only | Future |
| **No performance optimization** | Profile after bridge works | Phase 4 |
| **No streaming unification** | Two streaming paths remain | Phase 4 |
| **No token saver integration** | RTK/Caveman operate independently | Phase 4 |
| **No failure classifier extraction** | categorizeError() stays in key-pool.ts | Phase 3 |
| **No new admin API endpoints** | No bridge management yet | Phase 6 |

---

## 15. Risk Review

### 15.1 Lossy Translation

| Risk | Mitigation |
|---|---|
| **System prompt concatenation** | Canonical preserves as `instructions[]` array. Adapter joins only when provider requires. |
| **Finish reason gaps** (Gemini SAFETY/RECITATION) | Map to `content_filter`. Preserve original in response metadata. |
| **Cache tokens split** (Anthropic creation vs read) | Canonical stores both `cachedInputTokens` and `cacheCreationTokens`. |

### 15.2 Tool-Call ID Mismatch

| Risk | Mitigation |
|---|---|
| **Gemini generates no IDs** | Generate `call_${Date.now()}_${index}`. Store mapping. |
| **Anthropic ID format** (toolu_ vs call_) | Canonical preserves original. Output adapter converts format. |

### 15.3 Role Ordering Changes

| Risk | Mitigation |
|---|---|
| **OpenAI consecutive same-role** → Anthropic strict alternation | Adapter merges consecutive. Log warning. |
| **Tool role preservation** | `role:'tool'` is first-class canonical. Adapters translate per provider. |

### 15.4 Streaming Corruption

| Risk | Mitigation |
|---|---|
| **Tool call argument fragmentation** | Accumulate raw strings. Parse once at `tool_call_end`. |
| **Missing usage in stream** | Emit synthetic zeros. |
| **Stream interruption mid-tool-call** | `stream_error` with `fallbackAllowed: false`. |

### 15.5 Duplicate System Instructions

| Risk | Mitigation |
|---|---|
| **Double extraction** | Canonical `instructions[]` is single source of truth. No double-extraction. |

### 15.6 Unsupported Multimodal Payloads

| Risk | Mitigation |
|---|---|
| **Vision to text-only** | `validateCapabilities()` returns `eligible: false` with `missing: ['vision']`. |
| **Audio to non-OpenAI** | Same pattern. |

### 15.7 Token Usage Mismatch

| Risk | Mitigation |
|---|---|
| **Gemini approximate tokens** | Document as provider-reported. No normalization. |
| **Reasoning token overlap** | `reasoningTokens` is informational. `outputTokens` = provider's value. |

### 15.8 Shadow Mode Privacy

| Risk | Mitigation |
|---|---|
| **Raw prompt in memory** | NEVER stored. Fingerprint only. |
| **Large payload memory** | 100KB cap. Skip with reason. |
| **Error leaking to client** | Shadow errors caught silently. Never propagated. |

---

## Appendix A: Data Flow (Post-Phase 1)

```
Client Request (any format)
  │
  ▼
server.ts — detectFormat() → source format
  │
  ▼
canonical-bridge.ts — toCanonical(request, sourceFormat) → CanonicalRequest
  │  (feature flag: if disabled, fall back to existing normalizeRequest())
  │
  ▼
canonical-adapters/index.ts — validateCapabilities() → CapabilityValidationResult
  │  (if !eligible, return CanonicalError to client)
  │
  ▼
engine.ts — route(CanonicalRequest)
  │  ├─ Compression operates on CanonicalMessage[]
  │  ├─ Cost optimizer operates on model
  │  └─ Resolve provider + call adapter
  │
  ▼
canonical-adapters/{provider} — buildProviderRequest(req) → provider body
  │
  ▼
adapter.ts — buildHeaders() + getEndpoint() (unchanged)
  │
  ▼
fetch(providerEndpoint)
  │
  ▼
canonical-adapters/{provider} — parseProviderResponse(raw) → CanonicalResponse
  │
  ▼
canonical-bridge.ts — fromCanonical(response, targetFormat) → clientResponse
  │
  ▼
Client Response
```

## Appendix B: Interface Contract for Canonical Adapters

```ts
export interface CanonicalProviderAdapter {
  id: string;
  supportsStreaming: boolean;
  supportsStreamingTools: boolean;

  buildProviderRequest(req: CanonicalRequest): unknown;
  parseProviderResponse(raw: unknown, model: string): CanonicalResponse;
  parseProviderError(raw: unknown, statusCode: number): CanonicalError;
  parseStreamEvent(event: unknown): CanonicalStreamEvent | null;
  buildHeaders(apiKey: string, extra?: Record<string, string>): Record<string, string>;
  getEndpoint(baseUrl: string, model: string, stream: boolean): string;
}
```
