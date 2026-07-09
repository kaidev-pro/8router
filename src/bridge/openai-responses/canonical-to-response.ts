// 8Router — Canonical → OpenAI Responses API Response Serializer
// Phase 1F: Convert CanonicalResponse back to Responses API response format.

import type { CanonicalResponse, CanonicalFinishReason } from '../canonical/response.js';
import type { CanonicalContentPart, CanonicalTextPart, CanonicalThinkingPart } from '../canonical/content.js';
import type { CanonicalToolCall } from '../canonical/tools.js';
import type { CanonicalUsage } from '../canonical/usage.js';
import type { BridgeWarning } from '../canonical/request.js';
import type {
  ResponsesResponse,
  ResponsesOutputItem,
  ResponsesOutputMessageItem,
  ResponsesOutputFunctionCallItem,
  ResponsesOutputContentPart,
  ResponsesUsage,
  ResponsesError,
} from './types.js';
import { WarningAccumulator } from '../openai/warnings.js';

/** Result of serializing a canonical response to Responses format. */
export interface ResponsesResponseSerializationResult {
  response: ResponsesResponse;
  warnings: BridgeWarning[];
}

/**
 * Serialize CanonicalResponse → Responses API response.
 *
 * Key semantics:
 * - content text → output message with output_text
 * - toolCalls → function_call output items
 * - reasoning → reasoning output item
 * - finishReason → status
 * - usage → ResponsesUsage
 */
export function canonicalResponseToResponses(
  resp: CanonicalResponse,
): ResponsesResponseSerializationResult {
  const warnings = new WarningAccumulator();

  const output: ResponsesOutputItem[] = [];

  // Text content → message item
  const textParts = resp.content.filter(p => p.type === 'text') as CanonicalTextPart[];
  if (textParts.length > 0) {
    const outputContent: ResponsesOutputContentPart[] = [{
      type: 'output_text',
      text: textParts.map(p => p.text).join('\n'),
    }];

    output.push({
      type: 'message',
      id: `${resp.id}-msg-0`,
      role: 'assistant',
      status: 'completed',
      content: outputContent,
    });
  }

  // Tool calls → function_call items
  for (const tc of resp.toolCalls) {
    output.push(convertToolCallToOutput(tc, resp.id));
  }

  // Reasoning → reasoning item
  if (resp.reasoning) {
    output.push({
      type: 'reasoning',
      id: `${resp.id}-reasoning-0`,
      summary: [{
        type: 'summary_text',
        text: resp.reasoning,
      }],
    });
  }

  // Map finish reason to status
  const { status, incompleteReason } = mapFinishReason(resp.finishReason);

  // Usage
  const usage = convertUsage(resp.usage);

  return {
    response: {
      id: resp.id,
      object: 'response',
      created_at: resp.createdAt,
      status,
      ...(status === 'failed' ? { error: { code: 'server_error', message: 'Response failed' } } : {}),
      ...(incompleteReason ? { incomplete_details: { reason: incompleteReason } } : {}),
      model: resp.model,
      output,
      ...(usage ? { usage } : {}),
    },
    warnings: warnings.getWarnings(),
  };
}

// ─── Tool Call Conversion ────────────────────────────────────────────

function convertToolCallToOutput(
  tc: CanonicalToolCall,
  responseId: string,
): ResponsesOutputFunctionCallItem {
  return {
    type: 'function_call',
    id: tc.id || `${responseId}-call-${tc.index ?? 0}`,
    call_id: tc.id,
    name: tc.name,
    arguments: JSON.stringify(tc.arguments),
    status: 'completed',
  };
}

// ─── Usage Conversion ────────────────────────────────────────────────

function convertUsage(usage: CanonicalUsage | undefined): ResponsesUsage | undefined {
  if (!usage) return undefined;

  return {
    input_tokens: usage.inputTokens,
    output_tokens: usage.outputTokens,
    total_tokens: usage.totalTokens,
    ...(usage.reasoningTokens ? {
      output_tokens_details: { reasoning_tokens: usage.reasoningTokens },
    } : {}),
    ...(usage.cachedInputTokens ? {
      input_tokens_details: { cached_tokens: usage.cachedInputTokens },
    } : {}),
  };
}

// ─── Finish Reason Mapping ───────────────────────────────────────────

function mapFinishReason(reason: CanonicalFinishReason): {
  status: ResponsesResponse['status'];
  incompleteReason?: string;
} {
  switch (reason) {
    case 'stop': return { status: 'completed' };
    case 'length': return { status: 'incomplete', incompleteReason: 'max_output_tokens' };
    case 'tool_call': return { status: 'completed' };
    case 'content_filter': return { status: 'incomplete', incompleteReason: 'content_filter' };
    case 'error': return { status: 'failed' };
    case 'unknown': return { status: 'completed' };
    default: return { status: 'completed' };
  }
}
