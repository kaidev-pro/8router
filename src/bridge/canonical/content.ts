// 8Router — Canonical Content Parts
// Phase 1A: Type contracts only — no runtime behavior change

/**
 * A single content part within a CanonicalMessage.
 * Discriminated union on `type` — always narrowable via part.type.
 *
 * Providers may not support all part types. See Unsupported Field Strategy.
 */
export type CanonicalContentPart =
  | CanonicalTextPart
  | CanonicalImagePart
  | CanonicalToolUsePart
  | CanonicalToolResultPart
  | CanonicalThinkingPart;

/** Plain text content */
export interface CanonicalTextPart {
  type: 'text';
  text: string;
}

/**
 * Image content — source can be a URL or base64-encoded data.
 * The output adapter handles encoding differences per provider.
 */
export interface CanonicalImagePart {
  type: 'image';
  /** Image source — either a URL (http/https) or base64-encoded data */
  source: CanonicalImageSource;
  /** MIME type (e.g., image/png, image/jpeg, image/webp, image/gif) */
  mediaType?: string;
  /** Image detail level (OpenAI-specific: 'low' | 'high' | 'auto') */
  detail?: 'low' | 'high' | 'auto';
}

/**
 * Image source representation — discriminated union.
 */
export type CanonicalImageSource =
  | { type: 'url'; url: string }
  | { type: 'base64'; data: string; mediaType: string };

/**
 * Tool use (function call) initiated by the model.
 * `input` is ALWAYS a parsed object — adapters stringify when needed.
 */
export interface CanonicalToolUsePart {
  type: 'tool_use';
  /** Unique tool call ID — preserved from provider or generated (for Gemini) */
  id: string;
  /** Tool/function name */
  name: string;
  /** Parsed arguments object (NOT stringified). For completed responses only. */
  input: Record<string, unknown>;
}

/**
 * Tool result — response to a prior tool_use.
 * `toolCallId` references the id from the corresponding CanonicalToolUsePart.
 */
export interface CanonicalToolResultPart {
  type: 'tool_result';
  /** References the tool_use ID this result responds to */
  toolCallId: string;
  /** Result content — text representation of the tool's output */
  content: string;
  /** True if tool execution failed */
  isError?: boolean;
}

/**
 * Thinking/reasoning content from models that support chain-of-thought.
 * Providers: OpenAI (o1/o3), Anthropic (extended thinking), DeepSeek R1.
 * Providers that don't support this simply omit it.
 */
export interface CanonicalThinkingPart {
  type: 'thinking';
  /** The reasoning/thinking text */
  text: string;
  /** Optional cryptographic signature (Anthropic extended thinking) */
  signature?: string;
}

/** Discriminant values for content parts — used by type guards */
export const VALID_CONTENT_PART_TYPES: ReadonlySet<string> = new Set<string>([
  'text', 'image', 'tool_use', 'tool_result', 'thinking',
]);
