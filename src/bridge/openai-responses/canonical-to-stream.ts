// 8Router — Canonical Stream Events → Responses API Streaming Events Serializer
// Phase 1F: Convert CanonicalStreamEvent sequence back to Responses API SSE events.
//
// Used by shadow mode serializer or output adapters to reconstitute
// a Responses API-compatible stream from canonical events.

import type {
  CanonicalStreamEvent,
} from '../canonical/stream.js';
import type {
  ResponsesStreamEvent,
  ResponsesResponse,
  ResponsesUsage,
} from './types.js';
import { canonicalUsageToResponses } from './usage.js';

/**
 * Serialize a sequence of CanonicalStreamEvents into Responses API streaming events.
 *
 * Each CanonicalStreamEvent may produce zero or more Responses API events.
 */
export function canonicalEventsToResponsesEvents(
  events: CanonicalStreamEvent[],
): ResponsesStreamEvent[] {
  const result: ResponsesStreamEvent[] = [];
  let id = '';
  let model = '';
  let created = Math.floor(Date.now() / 1000);

  // Partial response state
  let responseId = '';
  let outputTexts: string[] = [];
  let functionCalls = new Map<number, { name: string; args: string }>();
  let usage: ResponsesUsage | undefined;

  for (const event of events) {
    switch (event.type) {
      case 'message_start': {
        id = event.id;
        model = event.model;
        responseId = event.id;

        result.push({
          type: 'response.created',
          event_id: `evt-${Date.now()}-created`,
          response: {
            id: responseId,
            object: 'response',
            created_at: Math.floor(Date.now() / 1000),
            status: 'in_progress',
            model,
            output: [],
          },
        });
        break;
      }

      case 'content_delta': {
        outputTexts.push(event.delta);
        result.push({
          type: 'response.output_text.delta',
          output_index: 0,
          content_index: 0,
          delta: event.delta,
        });
        break;
      }

      case 'thinking_delta': {
        result.push({
          type: 'response.reasoning_summary_text.delta',
          output_index: 0,
          content_index: 0,
          delta: event.delta,
        });
        break;
      }

      case 'tool_call_start': {
        functionCalls.set(event.toolCallIndex, {
          name: event.name,
          args: '',
        });
        result.push({
          type: 'response.output_item.added',
          output_index: event.toolCallIndex,
          item: {
            type: 'function_call',
            id: event.id,
            call_id: event.id,
            name: event.name,
            arguments: '',
            status: 'in_progress',
          },
        });
        break;
      }

      case 'tool_call_delta': {
        const fc = functionCalls.get(event.toolCallIndex);
        if (fc) {
          fc.args += event.argumentsDelta;
        }
        result.push({
          type: 'response.function_call_arguments.delta',
          output_index: event.toolCallIndex,
          delta: event.argumentsDelta,
        });
        break;
      }

      case 'tool_call_end': {
        const fc = functionCalls.get(event.toolCallIndex);
        result.push({
          type: 'response.function_call_arguments.done',
          output_index: event.toolCallIndex,
          arguments: fc?.args || JSON.stringify(event.arguments),
        });
        result.push({
          type: 'response.output_item.done',
          output_index: event.toolCallIndex,
          item: {
            type: 'function_call',
            id: fc?.name || '',
            call_id: fc?.name || '',
            name: fc?.name || '',
            arguments: fc?.args || JSON.stringify(event.arguments),
            status: 'completed',
          },
        });
        break;
      }

      case 'usage': {
        usage = canonicalUsageToResponses(event.usage);
        break;
      }

      case 'message_end': {
        const status = event.finishReason === 'stop' ? 'completed'
          : event.finishReason === 'error' ? 'failed'
          : event.finishReason === 'length' ? 'incomplete'
          : 'completed';

        const finalResponse: ResponsesResponse = {
          id: responseId,
          object: 'response',
          created_at: created,
          status: status as ResponsesResponse['status'],
          model,
          output: outputTexts.length > 0 ? [{
            type: 'message',
            id: `${responseId}-msg-0`,
            role: 'assistant',
            status: 'completed',
            content: [{ type: 'output_text', text: outputTexts.join('') }],
          }] : [],
          ...(usage ? { usage } : {}),
        };

        result.push({
          type: status === 'completed' ? 'response.completed' : 'response.incomplete',
          event_id: `evt-${Date.now()}-complete`,
          response: finalResponse,
        });
        break;
      }

      case 'stream_error': {
        result.push({
          type: 'error',
          error: {
            code: event.error.code || 'server_error',
            message: event.error.message,
          },
        });
        break;
      }
    }
  }

  return result;
}

/**
 * Serialize a single canonical event into Responses API events.
 * Useful for real-time conversion (event-by-event).
 */
export function canonicalEventToResponsesEvents(
  event: CanonicalStreamEvent,
): ResponsesStreamEvent[] {
  return canonicalEventsToResponsesEvents([event]);
}
