// 8Router — OpenAI Chat Completion Response → Canonical
// Phase 1D: Convert non-streaming OpenAI response to CanonicalResponse.

import type { CanonicalResponse, CanonicalFinishReason } from '../canonical/response.js';
import type { CanonicalContentPart } from '../canonical/content.js';
import type { CanonicalToolCall } from '../canonical/tools.js';
import type { OpenAIChatCompletionResponse } from './types.js';
import { openaiContentToCanonical } from './content.js';
import { openaiToolCallsToCanonical } from './tools.js';
import { openaiUsageToCanonical } from './usage.js';
import { WarningAccumulator } from './warnings.js';
import type { BridgeWarning } from '../canonical/request.js';

/** Result of converting an OpenAI response to canonical. */
export interface OpenAIResponseToCanonicalResult {
  response: CanonicalResponse;
  warnings: BridgeWarning[];
}

/**
 * Map OpenAI finish_reason to CanonicalFinishReason.
 */
function mapFinishReason(reason: string | null): CanonicalFinishReason {
  switch (reason) {
    case 'stop': return 'stop';
    case 'length': return 'length';
    case 'tool_calls': return 'tool_call';
    case 'content_filter': return 'content_filter';
    case null:
    case undefined:
      return 'unknown';
    default:
      return 'unknown';
  }
}

/**
 * Convert OpenAI Chat Completion response → CanonicalResponse.
 *
 * Key semantics:
 * - choices[0] is primary (OpenAI n=1 is the common case)
 * - tool_calls in the message → both content tool_use parts AND CanonicalToolCall[]
 * - finish_reason mapped: 'tool_calls' → 'tool_call' (singular)
 * - usage includes reasoning_tokens and cached_tokens when present
 */
export function openaiResponseToCanonical(
  raw: OpenAIChatCompletionResponse,
): OpenAIResponseToCanonicalResult {
  const warnings = new WarningAccumulator();

  if (!raw.choices || raw.choices.length === 0) {
    return {
      response: {
        id: raw.id || `chatcmpl-${Date.now()}`,
        model: raw.model || 'unknown',
        provider: 'openai',
        createdAt: raw.created || Math.floor(Date.now() / 1000),
        content: [],
        toolCalls: [],
        finishReason: 'error',
      },
      warnings: warnings.getWarnings(),
    };
  }

  const choice = raw.choices[0];
  const msg = choice.message;

  // Content: text + tool_use parts
  const content: CanonicalContentPart[] = [];

  if (msg.content) {
    content.push(...openaiContentToCanonical(msg.content));
  }

  // Tool calls → content parts + structured tool calls
  let toolCalls: CanonicalToolCall[] = [];
  if (msg.tool_calls && msg.tool_calls.length > 0) {
    const { calls, errors } = openaiToolCallsToCanonical(msg.tool_calls);
    toolCalls = calls;

    // Add tool_use content parts for each valid tool call
    for (const tc of calls) {
      content.push({
        type: 'tool_use',
        id: tc.id,
        name: tc.name,
        input: tc.arguments,
      });
    }

    for (const err of errors) {
      warnings.fieldTransformed('choices[0].message.tool_calls', err);
    }
  }

  // Reasoning tokens: extract if present
  const usage = openaiUsageToCanonical(raw.usage);
  const reasoningTokens = usage?.reasoningTokens;

  return {
    response: {
      id: raw.id,
      model: raw.model,
      provider: 'openai',
      createdAt: raw.created || Math.floor(Date.now() / 1000),
      content,
      toolCalls,
      finishReason: mapFinishReason(choice.finish_reason),
      usage,
      reasoning: reasoningTokens !== undefined ? undefined : undefined, // Not in standard response
      bridgeMeta: {
        sourceFormat: 'openai_chat_completion',
        warnings: warnings.getWarnings(),
      },
    },
    warnings: warnings.getWarnings(),
  };
}
