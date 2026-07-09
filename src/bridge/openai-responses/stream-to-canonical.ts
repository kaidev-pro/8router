// 8Router — Responses API Streaming Events → Canonical Stream Events
// Phase 1F: Parse Responses API SSE events into CanonicalStreamEvent sequence.
//
// Responses API uses different streaming event types than Chat Completions.
// This converter maps response.* events into canonical stream events.

import type {
  CanonicalStreamEvent,
  StreamMessageStart,
  StreamContentDelta,
  StreamThinkingDelta,
  StreamToolCallStart,
  StreamToolCallDelta,
  StreamToolCallEnd,
  StreamUsageUpdate,
  StreamMessageEnd,
  StreamErrorEvent,
} from '../canonical/stream.js';
import type { CanonicalFinishReason } from '../canonical/response.js';
import type { CanonicalUsage } from '../canonical/usage.js';
import type {
  ResponsesStreamEvent,
  ResponsesStreamCreatedEvent,
  ResponsesStreamCompletedEvent,
  ResponsesStreamFailedEvent,
  ResponsesStreamIncompleteEvent,
  ResponsesStreamTextDeltaEvent,
  ResponsesStreamFunctionCallDeltaEvent,
  ResponsesStreamFunctionCallDoneEvent,
  ResponsesStreamReasoningSummaryDeltaEvent,
  ResponsesStreamOutputItemAddedEvent,
  ResponsesStreamOutputItemDoneEvent,
  ResponsesResponse,
  ResponsesUsage,
} from './types.js';

/** Stateful parser for Responses API streaming events. */
export class ResponsesStreamToCanonical {
  private started = false;
  private id = '';
  private model = '';
  private contentBlockIndex = 0;
  private reasoningBlockIndex = 0;

  // Tool call accumulator state
  private toolCalls = new Map<number, {
    id: string;
    name: string;
    argsBuffer: string;
    emitted: boolean;
    outputIndex: number;
  }>();

  /**
   * Feed a raw Responses API streaming event.
   * Returns zero or more CanonicalStreamEvents.
   */
  feed(event: ResponsesStreamEvent): CanonicalStreamEvent[] {
    const events: CanonicalStreamEvent[] = [];

    switch (event.type) {
      case 'response.created':
        return this.handleCreated(event);

      case 'response.in_progress':
        return [];

      case 'response.completed':
        return this.handleCompleted(event);

      case 'response.failed':
        return this.handleFailed(event);

      case 'response.incomplete':
        return this.handleIncomplete(event);

      case 'response.output_item.added':
        return this.handleOutputItemAdded(event);

      case 'response.output_item.done':
        return this.handleOutputItemDone(event);

      case 'response.content_part.added':
      case 'response.content_part.done':
        return []; // Bookkeeping events — no canonical mapping needed

      case 'response.output_text.delta':
        return [{
          type: 'content_delta',
          delta: event.delta,
          contentBlockIndex: this.contentBlockIndex++,
        }];

      case 'response.output_text.done':
        return []; // Text completion signaled — no additional event needed

      case 'response.function_call_arguments.delta':
        return this.handleFunctionCallDelta(event);

      case 'response.function_call_arguments.done':
        return this.handleFunctionCallDone(event);

      case 'response.reasoning_summary_text.delta':
        return [{
          type: 'thinking_delta',
          delta: event.delta,
          contentBlockIndex: this.reasoningBlockIndex++,
        }];

      case 'response.reasoning_summary_text.done':
        return []; // Reasoning text completion

      case 'error':
        return [{
          type: 'stream_error',
          error: {
            code: 'provider_error',
            message: event.error.message,
            retryable: false,
            sanitized: true,
          },
          fallbackAllowed: !this.started,
        }];
    }

    return events;
  }

  // ─── Event Handlers ──────────────────────────────────────────────

  private handleCreated(event: ResponsesStreamCreatedEvent): CanonicalStreamEvent[] {
    const resp = event.response;
    this.started = true;
    this.id = resp.id;
    this.model = resp.model;

    return [{
      type: 'message_start',
      id: resp.id,
      model: resp.model,
    }];
  }

  private handleCompleted(event: ResponsesStreamCompletedEvent): CanonicalStreamEvent[] {
    const events: CanonicalStreamEvent[] = [];

    // Finalize any remaining tool calls
    for (const [index, tc] of this.toolCalls) {
      if (!tc.emitted) {
        events.push(this.finalizeToolCall(index));
      }
    }

    // Usage
    if (event.response.usage) {
      events.push({
        type: 'usage',
        usage: convertUsage(event.response.usage),
      });
    }

    // Message end
    events.push({
      type: 'message_end',
      finishReason: 'stop',
    });

    return events;
  }

  private handleFailed(event: ResponsesStreamFailedEvent): CanonicalStreamEvent[] {
    return [{
      type: 'message_end',
      finishReason: 'error',
    }];
  }

  private handleIncomplete(event: ResponsesStreamIncompleteEvent): CanonicalStreamEvent[] {
    const reason = event.response.incomplete_details?.reason;
    let finishReason: CanonicalFinishReason = 'unknown';
    if (reason === 'max_output_tokens') finishReason = 'length';
    if (reason === 'content_filter') finishReason = 'content_filter';

    return [{
      type: 'message_end',
      finishReason,
    }];
  }

  private handleOutputItemAdded(event: ResponsesStreamOutputItemAddedEvent): CanonicalStreamEvent[] {
    const item = event.item;

    if (item.type === 'function_call') {
      const tc = {
        id: item.call_id || item.id,
        name: item.name,
        argsBuffer: '',
        emitted: false,
        outputIndex: event.output_index,
      };
      this.toolCalls.set(event.output_index, tc);

      return [{
        type: 'tool_call_start',
        toolCallIndex: event.output_index,
        id: tc.id,
        name: tc.name,
      }];
    }

    if (item.type === 'reasoning') {
      return []; // Reasoning content arrives via delta events
    }

    return [];
  }

  private handleOutputItemDone(event: ResponsesStreamOutputItemDoneEvent): CanonicalStreamEvent[] {
    const item = event.item;

    if (item.type === 'function_call') {
      const tc = this.toolCalls.get(event.output_index);
      if (tc && !tc.emitted) {
        return [this.finalizeToolCall(event.output_index)];
      }
    }

    return [];
  }

  private handleFunctionCallDelta(event: ResponsesStreamFunctionCallDeltaEvent): CanonicalStreamEvent[] {
    const tc = this.toolCalls.get(event.output_index);
    if (!tc) return [];

    tc.argsBuffer += event.delta;

    return [{
      type: 'tool_call_delta',
      toolCallIndex: event.output_index,
      argumentsDelta: event.delta,
    }];
  }

  private handleFunctionCallDone(event: ResponsesStreamFunctionCallDoneEvent): CanonicalStreamEvent[] {
    const tc = this.toolCalls.get(event.output_index);
    if (!tc) return [];

    tc.argsBuffer = event.arguments;
    if (!tc.emitted) {
      return [this.finalizeToolCall(event.output_index)];
    }
    return [];
  }

  private finalizeToolCall(index: number): StreamToolCallEnd {
    const tc = this.toolCalls.get(index)!;
    tc.emitted = true;

    let parsed: Record<string, unknown> | null = null;
    let parseError: string | undefined;

    if (tc.argsBuffer.length > 0) {
      try {
        const result = JSON.parse(tc.argsBuffer);
        if (typeof result === 'object' && result !== null && !Array.isArray(result)) {
          parsed = result;
        } else {
          parseError = 'tool_call arguments must be a JSON object';
        }
      } catch {
        parseError = 'malformed JSON in tool_call arguments';
      }
    } else {
      parsed = {};
    }

    return {
      type: 'tool_call_end',
      toolCallIndex: index,
      arguments: parsed,
      parseError,
    };
  }

  reset(): void {
    this.started = false;
    this.id = '';
    this.model = '';
    this.contentBlockIndex = 0;
    this.reasoningBlockIndex = 0;
    this.toolCalls.clear();
  }
}

/** Stateless convenience: parse an array of events into a flat event list. */
export function responsesEventsToCanonicalEvents(
  events: ResponsesStreamEvent[],
): CanonicalStreamEvent[] {
  const parser = new ResponsesStreamToCanonical();
  const result: CanonicalStreamEvent[] = [];
  for (const event of events) {
    result.push(...parser.feed(event));
  }
  return result;
}

/** Convert Responses API usage to canonical. */
function convertUsage(usage: ResponsesUsage): CanonicalUsage {
  return {
    inputTokens: usage.input_tokens,
    outputTokens: usage.output_tokens,
    totalTokens: usage.total_tokens,
    reasoningTokens: usage.output_tokens_details?.reasoning_tokens,
    cachedInputTokens: usage.input_tokens_details?.cached_tokens,
  };
}
