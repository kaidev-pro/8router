// 8Router — OpenAI Responses API Response → Canonical
// Phase 1F: Convert Responses API response to CanonicalResponse.

import type { CanonicalResponse, CanonicalFinishReason } from '../canonical/response.js';
import type { CanonicalContentPart } from '../canonical/content.js';
import type { CanonicalToolCall } from '../canonical/tools.js';
import type { CanonicalUsage } from '../canonical/usage.js';
import type { CanonicalError } from '../canonical/errors.js';
import type {
  ResponsesResponse,
  ResponsesOutputItem,
  ResponsesOutputMessageItem,
  ResponsesOutputReasoningItem,
  ResponsesOutputFunctionCallItem,
  ResponsesOutputContentPart,
  ResponsesUsage,
  ResponsesError,
} from './types.js';
import { WarningAccumulator } from '../openai/warnings.js';

/** Result of converting a Responses API response to canonical. */
export interface ResponsesResponseToCanonicalResult {
  response: CanonicalResponse;
  warnings: import('../canonical/request.js').BridgeWarning[];
}

/**
 * Convert Responses API response → CanonicalResponse.
 *
 * Key semantics:
 * - output[] → content parts + tool calls
 * - output message content output_text → text parts
 * - output reasoning → stored as reasoning on CanonicalResponse
 * - output function_call → CanonicalToolCall
 * - unknown output item types → stored in extensions.openaiResponses
 * - status maps to finishReason
 * - usage → CanonicalUsage
 */
export function responsesResponseToCanonical(
  raw: ResponsesResponse,
): ResponsesResponseToCanonicalResult {
  const warnings = new WarningAccumulator();

  if (raw.error) {
    return {
      response: {
        id: raw.id || `resp-${Date.now()}`,
        model: raw.model || 'unknown',
        provider: 'openai_responses',
        createdAt: raw.created_at || Math.floor(Date.now() / 1000),
        content: [],
        toolCalls: [],
        finishReason: 'error',
        bridgeMeta: {
          sourceFormat: 'openai_responses',
          warnings: warnings.getWarnings(),
        },
      },
      warnings: warnings.getWarnings(),
    };
  }

  const content: CanonicalContentPart[] = [];
  const toolCalls: CanonicalToolCall[] = [];
  let reasoningText: string | undefined;

  // Process output items
  const unknownItems: ResponsesOutputItem[] = [];

  for (const item of raw.output) {
    switch (item.type) {
      case 'message':
        processMessageItem(item, content, warnings);
        break;

      case 'reasoning': {
        const reasoning = processReasoningItem(item, warnings);
        if (reasoning) {
          reasoningText = reasoningText ? reasoningText + '\n\n' + reasoning : reasoning;
        }
        break;
      }

      case 'function_call':
        processFunctionCallItem(item, toolCalls, content);
        break;

      case 'web_search_call':
      case 'file_search_call':
      case 'computer_call':
      case 'code_interpreter_call':
      case 'image_generation_call':
        // Non-function tool outputs — preserve as text or store for extensions
        unknownItems.push(item);
        break;

      default:
        unknownItems.push(item);
        break;
    }
  }

  // Usage
  const usage = convertUsage(raw.usage);

  // Extensions for unknown items
  const extensions: import('../canonical/extensions.js').CanonicalExtensions | undefined =
    unknownItems.length > 0 ? {
      responses: {
        instructions: undefined,
        previous_response_id: undefined,
      },
    } : undefined;

  return {
    response: {
      id: raw.id,
      model: raw.model,
      provider: 'openai_responses',
      createdAt: raw.created_at || Math.floor(Date.now() / 1000),
      content,
      toolCalls,
      finishReason: mapStatus(raw.status, raw.incomplete_details?.reason),
      usage,
      reasoning: reasoningText,
      extensions,
      bridgeMeta: {
        sourceFormat: 'openai_responses',
        warnings: warnings.getWarnings(),
      },
    },
    warnings: warnings.getWarnings(),
  };
}

// ─── Item Processing ─────────────────────────────────────────────────

function processMessageItem(
  item: ResponsesOutputMessageItem,
  content: CanonicalContentPart[],
  warnings: WarningAccumulator,
): void {
  for (const part of item.content) {
    const converted = convertOutputContentPart(part, warnings);
    if (converted) content.push(converted);
  }
}

function convertOutputContentPart(
  part: ResponsesOutputContentPart,
  warnings: WarningAccumulator,
): CanonicalContentPart | null {
  if (part.type === 'output_text') {
    return { type: 'text', text: part.text };
  }

  if (part.type === 'refusal') {
    return { type: 'text', text: `[refusal] ${part.refusal}` };
  }

  warnings.fieldDropped('output[].content[]', `Unknown content part type: ${(part as { type?: string }).type}`);
  return null;
}

function processReasoningItem(
  item: ResponsesOutputReasoningItem,
  warnings: WarningAccumulator,
): string | undefined {
  if (!item.summary || item.summary.length === 0) {
    warnings.capabilityWarning('Reasoning item has no summary');
    return undefined;
  }

  const summaryTexts = item.summary
    .filter(s => s.type === 'summary_text')
    .map(s => s.text);

  return summaryTexts.length > 0 ? summaryTexts.join('\n') : undefined;
}

function processFunctionCallItem(
  item: ResponsesOutputFunctionCallItem,
  toolCalls: CanonicalToolCall[],
  content: CanonicalContentPart[],
): void {
  let parsedArgs: Record<string, unknown>;
  try {
    const result = JSON.parse(item.arguments);
    if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
      parsedArgs = result;
    } else {
      parsedArgs = {};
    }
  } catch {
    parsedArgs = {};
  }

  const id = item.call_id || item.id;

  toolCalls.push({
    id,
    name: item.name,
    arguments: parsedArgs,
  });

  content.push({
    type: 'tool_use',
    id,
    name: item.name,
    input: parsedArgs,
  });
}

// ─── Usage Conversion ────────────────────────────────────────────────

function convertUsage(usage: ResponsesUsage | undefined): CanonicalUsage | undefined {
  if (!usage) return undefined;

  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens,
    cachedInputTokens: usage.input_tokens_details?.cached_tokens,
  };
}

// ─── Status Mapping ──────────────────────────────────────────────────

function mapStatus(
  status: string,
  incompleteReason?: string,
): CanonicalFinishReason {
  switch (status) {
    case 'completed': return 'stop';
    case 'in_progress': return 'error';
    case 'failed': return 'error';
    case 'incomplete':
      if (incompleteReason === 'max_output_tokens') return 'length';
      if (incompleteReason === 'content_filter') return 'content_filter';
      return 'unknown';
    default: return 'unknown';
  }
}
