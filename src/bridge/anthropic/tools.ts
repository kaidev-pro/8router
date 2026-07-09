// 8Router — Anthropic Tool Conversion
// Phase 1C: Convert between Anthropic tool definitions and CanonicalTool

import type { CanonicalTool, CanonicalToolChoice } from '../canonical/tools.js';
import type { AnthropicTool, AnthropicToolChoice } from './types.js';
import type { CanonicalError } from '../canonical/errors.js';

/**
 * Convert Anthropic tools to canonical.
 * Maps input_schema → inputSchema.
 */
export function anthropicToolsToCanonical(tools: AnthropicTool[]): CanonicalTool[] {
  return tools.map(anthropicToolToCanonical);
}

function anthropicToolToCanonical(tool: AnthropicTool): CanonicalTool {
  if (!tool.name || typeof tool.name !== 'string') {
    throw {
      code: 'invalid_tool_name',
      message: 'Tool name is missing or invalid',
      fieldPath: 'tools[].name',
      retryable: false,
      sanitized: true,
    } satisfies CanonicalError;
  }

  if (tool.name.trim().length === 0) {
    throw {
      code: 'invalid_tool_name',
      message: 'Tool name cannot be empty',
      fieldPath: 'tools[].name',
      retryable: false,
      sanitized: true,
    } satisfies CanonicalError;
  }

  return {
    name: tool.name,
    description: tool.description,
    inputSchema: tool.input_schema,
  };
}

/**
 * Convert canonical tools to Anthropic format.
 * Maps inputSchema → input_schema.
 */
export function canonicalToolsToAnthropic(tools: CanonicalTool[]): AnthropicTool[] {
  return tools.map(t => ({
    name: t.name,
    description: t.description,
    input_schema: t.inputSchema ?? { type: 'object' },
  }));
}

/**
 * Convert Anthropic tool_choice to canonical.
 */
export function anthropicToolChoiceToCanonical(
  choice: AnthropicToolChoice | undefined,
): CanonicalToolChoice | undefined {
  if (choice === undefined) return undefined;
  if (choice.type === 'auto') return { type: 'auto' };
  if (choice.type === 'any') return { type: 'required' };
  if (choice.type === 'tool') return { type: 'tool', name: choice.name };

  throw {
    code: 'invalid_tool_choice',
    message: `Invalid Anthropic tool_choice value: ${JSON.stringify(choice)}`,
    fieldPath: 'tool_choice',
    retryable: false,
    sanitized: true,
  } satisfies CanonicalError;
}

/**
 * Convert canonical toolChoice to Anthropic format.
 */
export function canonicalToolChoiceToAnthropic(
  choice: CanonicalToolChoice | undefined,
): AnthropicToolChoice | undefined {
  if (choice === undefined) return undefined;
  if (choice.type === 'auto') return { type: 'auto' };
  if (choice.type === 'required') return { type: 'any' };
  if (choice.type === 'none') return undefined; // Anthropic doesn't have 'none'
  if (choice.type === 'tool') return { type: 'tool', name: choice.name };
  return undefined;
}
