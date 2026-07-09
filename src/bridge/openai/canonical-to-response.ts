// 8Router — Canonical → OpenAI Chat Completion Response Serializer
// Phase 1D: Convert CanonicalResponse back to OpenAI Chat Completion response format.

import type { CanonicalResponse, CanonicalFinishReason } from '../canonical/response.js';
import type { OpenAIChatCompletionResponse, OpenAIChatCompletionChoice, OpenAIChatCompletionMessage, OpenAICompletionUsage } from './types.js';
import { canonicalContentToOpenai } from './content.js';
import { canonicalToolCallsToOpenai } from './tools.js';
import { canonicalUsageToOpenai } from './usage.js';
import type { BridgeWarning } from '../canonical/request.js';
import { WarningAccumulator } from './warnings.js';

/** Result of serializing a canonical response to OpenAI format. */
export interface OpenAIResponseSerializationResult {
  response: OpenAIChatCompletionResponse;
  warnings: BridgeWarning[];
}

/**
 * Map CanonicalFinishReason back to OpenAI finish_reason.
 */
function mapFinishReason(reason: CanonicalFinishReason): 'stop' | 'length' | 'tool_calls' | 'content_filter' | null {
  switch (reason) {
    case 'stop': return 'stop';
    case 'length': return 'length';
    case 'tool_call': return 'tool_calls';
    case 'content_filter': return 'content_filter';
    case 'error': return 'stop'; // Error mapped to stop in output
    case 'unknown': return null;
    default: return null;
  }
}

/**
 * Serialize CanonicalResponse → OpenAI Chat Completion response.
 *
 * Key semantics:
 * - content text parts → message.content (string or null)
 * - toolCalls → message.tool_calls with stringified arguments
 * - finish_reason: 'tool_call' → 'tool_calls' (plural for OpenAI)
 * - usage restored with prompt_tokens_details / completion_tokens_details
 */
export function canonicalResponseToOpenai(
  resp: CanonicalResponse,
): OpenAIResponseSerializationResult {
  const warnings = new WarningAccumulator();

  // Content: extract text parts only (tool_use is in tool_calls)
  const textParts = resp.content.filter(p => p.type === 'text');
  const contentStr = canonicalContentToOpenai(textParts);

  // Tool calls
  const toolCalls = resp.toolCalls.length > 0
    ? canonicalToolCallsToOpenai(resp.toolCalls)
    : undefined;

  // Usage
  const usage = canonicalUsageToOpenai(resp.usage);

  // Build message
  const message: OpenAIChatCompletionMessage = {
    role: 'assistant',
    content: typeof contentStr === 'string' ? contentStr : null,
  };
  if (toolCalls) {
    message.tool_calls = toolCalls;
  }

  // Build choice
  const choice: OpenAIChatCompletionChoice = {
    index: 0,
    message,
    finish_reason: mapFinishReason(resp.finishReason),
  };

  // Build response
  const openaiResp: OpenAIChatCompletionResponse = {
    id: resp.id,
    object: 'chat.completion',
    created: resp.createdAt,
    model: resp.model,
    choices: [choice],
    usage,
  };

  return {
    response: openaiResp,
    warnings: warnings.getWarnings(),
  };
}
