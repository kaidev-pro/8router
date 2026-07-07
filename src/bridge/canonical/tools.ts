// 8Router — Canonical Tool Definitions
// Phase 1A: Type contracts only — no runtime behavior change

/**
 * Tool/function definition.
 * Unified across OpenAI (function), Anthropic (tool), Gemini (function_declarations).
 */
export interface CanonicalTool {
  /** Function name */
  name: string;
  /** Human-readable description */
  description?: string;
  /** JSON Schema for input parameters — renamed from Anthropic's input_schema */
  inputSchema?: Record<string, unknown>;
  /** Whether to enforce strict schema adherence (OpenAI) */
  strict?: boolean;
  /** Anthropic-style: whether this tool requires user approval */
  requiresApproval?: boolean;
  /** Provider-specific extensions */
  extensions?: Record<string, unknown>;
}

/**
 * A COMPLETED tool call in a response.
 * `arguments` is ALWAYS a parsed object — never a raw string.
 * For streaming tool calls, see StreamToolCallStart/Delta/End events.
 */
export interface CanonicalToolCall {
  /** Unique ID — from provider or generated (Gemini doesn't provide IDs) */
  id: string;
  /** Function name */
  name: string;
  /** Parsed arguments object — guaranteed valid JSON at completion time */
  arguments: Record<string, unknown>;
  /**
   * Tool call index — 0-based, stable ordering within a single response.
   * Used for mapping to tool results in multi-tool-call responses.
   */
  index?: number;
}

/**
 * Tool choice strategy — discriminated union.
 */
export type CanonicalToolChoice =
  | { type: 'auto' }
  | { type: 'required' }
  | { type: 'none' }
  | { type: 'tool'; name: string };
