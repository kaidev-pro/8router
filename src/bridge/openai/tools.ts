// 8Router — OpenAI Tool Conversion
// Phase 1B: Convert between OpenAI tool definitions and CanonicalTool

import type { CanonicalTool, CanonicalToolCall, CanonicalToolChoice } from '../canonical/tools.js';
import type { OpenAITool, OpenAIToolChoice, OpenAIToolCall } from './types.js';
import type { CanonicalError } from '../canonical/errors.js';

/**
 * Convert OpenAI tool definitions to canonical.
 * Unwraps function wrapper, maps parameters → inputSchema.
 */
export function openaiToolsToCanonical(tools: OpenAITool[]): CanonicalTool[] {
  return tools.map(openaiToolToCanonical);
}

function openaiToolToCanonical(tool: OpenAITool): CanonicalTool {
  if (tool.type !== 'function') {
    throw {
      code: 'unsupported_tool_type',
      message: `Unsupported tool type: ${tool.type}. Only 'function' tools are supported.`,
      fieldPath: 'tools[].type',
      retryable: false,
      sanitized: true,
    } satisfies CanonicalError;
  }

  if (!tool.function?.name || typeof tool.function.name !== 'string') {
    throw {
      code: 'invalid_tool_name',
      message: 'Tool function name is missing or invalid',
      fieldPath: 'tools[].function.name',
      retryable: false,
      sanitized: true,
    } satisfies CanonicalError;
  }

  if (tool.function.name.trim().length === 0) {
    throw {
      code: 'invalid_tool_name',
      message: 'Tool function name cannot be empty',
      fieldPath: 'tools[].function.name',
      retryable: false,
      sanitized: true,
    } satisfies CanonicalError;
  }

  return {
    name: tool.function.name,
    description: tool.function.description,
    inputSchema: tool.function.parameters,
    strict: tool.function.strict,
  };
}

/**
 * Convert canonical tools back to OpenAI format.
 */
export function canonicalToolsToOpenai(tools: CanonicalTool[]): OpenAITool[] {
  return tools.map(t => ({
    type: 'function' as const,
    function: {
      name: t.name,
      description: t.description,
      parameters: t.inputSchema,
      strict: t.strict,
    },
  }));
}

/**
 * Convert OpenAI tool_choice to canonical.
 */
export function openaiToolChoiceToCanonical(
  choice: OpenAIToolChoice | undefined,
): CanonicalToolChoice | undefined {
  if (choice === undefined) return undefined;
  if (choice === 'auto') return { type: 'auto' };
  if (choice === 'none') return { type: 'none' };
  if (choice === 'required') return { type: 'required' };
  if (typeof choice === 'object' && choice.type === 'function') {
    return { type: 'tool', name: choice.function.name };
  }

  throw {
    code: 'invalid_tool_choice',
    message: `Invalid tool_choice value: ${JSON.stringify(choice)}`,
    fieldPath: 'tool_choice',
    retryable: false,
    sanitized: true,
  } satisfies CanonicalError;
}

/**
 * Convert canonical toolChoice back to OpenAI format.
 */
export function canonicalToolChoiceToOpenai(
  choice: CanonicalToolChoice | undefined,
): OpenAIToolChoice | undefined {
  if (choice === undefined) return undefined;
  if (choice.type === 'auto') return 'auto';
  if (choice.type === 'none') return 'none';
  if (choice.type === 'required') return 'required';
  if (choice.type === 'tool') return { type: 'function', function: { name: choice.name } };
  return 'auto';
}

/**
 * Parse OpenAI assistant tool_calls to CanonicalToolCall[].
 * Completed tool calls MUST have valid JSON arguments.
 * Malformed JSON is a fatal conversion error — no empty {} fallback.
 */
export function openaiToolCallsToCanonical(
  toolCalls: OpenAIToolCall[],
): { calls: CanonicalToolCall[]; errors: string[] } {
  const calls: CanonicalToolCall[] = [];
  const errors: string[] = [];

  for (const tc of toolCalls) {
    let parsed: Record<string, unknown> | null = null;
    try {
      const raw = tc.function.arguments;
      if (typeof raw === 'string' && raw.length > 0) {
        parsed = JSON.parse(raw);
        if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
          errors.push(`tool_call '${tc.id}': arguments must be a JSON object`);
          parsed = null;
        }
      }
      if (parsed === null) {
        // Empty string arguments are treated as empty object (valid)
        if (typeof raw === 'string' && raw.length === 0) {
          parsed = {};
        } else if (raw === undefined || raw === null) {
          parsed = {};
        }
      }
    } catch {
      errors.push(`tool_call '${tc.id}': malformed JSON in arguments`);
      parsed = null;
    }

    if (parsed !== null) {
      calls.push({
        id: tc.id,
        name: tc.function.name,
        arguments: parsed,
      });
    }
    // If parsed is null, error was added — do NOT add a tool call with fabricated args
  }

  return { calls, errors };
}

/**
 * Convert canonical tool calls back to OpenAI format.
 * JSON.stringify each arguments object exactly once.
 */
export function canonicalToolCallsToOpenai(
  calls: CanonicalToolCall[],
): OpenAIToolCall[] {
  return calls.map((tc, i) => ({
    id: tc.id,
    type: 'function' as const,
    function: {
      name: tc.name,
      arguments: JSON.stringify(tc.arguments),
    },
  }));
}
