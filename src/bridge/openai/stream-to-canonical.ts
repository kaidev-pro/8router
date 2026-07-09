// 8Router — OpenAI Streaming Chunks → Canonical Stream Events
// Phase 1D: Parse OpenAI SSE chunks into CanonicalStreamEvent sequence.
//
// OpenAI streaming sends many small delta chunks. This converter:
// 1. Tracks state across chunks (message ID, model, tool call accumulators)
// 2. Emits CanonicalStreamEvent[] for each input chunk
// 3. Handles tool_call argument accumulation + final parse at end

import type {
  CanonicalStreamEvent,
  StreamToolCallStart,
  StreamToolCallDelta,
  StreamToolCallEnd,
  StreamMessageStart,
  StreamContentDelta,
  StreamUsageUpdate,
  StreamMessageEnd,
  StreamErrorEvent,
} from '../canonical/stream.js';
import type { CanonicalFinishReason } from '../canonical/response.js';
import type { OpenAIChatCompletionChunk, OpenAIStreamToolCall } from './types.js';
import { openaiUsageToCanonical } from './usage.js';

/** Stateful parser for OpenAI streaming chunks. */
export class OpenAIStreamToCanonical {
  private started = false;
  private id = '';
  private model = '';
  private systemFingerprint?: string;

  // Tool call accumulator state
  // Maps tool_call.index → { id, name, accumulatedArgs }
  private toolCalls = new Map<number, {
    id: string;
    name: string;
    argsBuffer: string;
    emitted: boolean;
  }>();

  // Track which tool_call_start events we've emitted
  private contentBlockIndex = 0;

  /**
   * Feed a raw OpenAI streaming chunk.
   * Returns zero or more CanonicalStreamEvents.
   */
  feed(chunk: OpenAIChatCompletionChunk): CanonicalStreamEvent[] {
    const events: CanonicalStreamEvent[] = [];

    // message_start on first chunk
    if (!this.started) {
      this.started = true;
      this.id = chunk.id;
      this.model = chunk.model;
      this.systemFingerprint = chunk.system_fingerprint;

      const startEvent: StreamMessageStart = {
        type: 'message_start',
        id: chunk.id,
        model: chunk.model,
      };
      events.push(startEvent);
    }

    // Process each choice delta
    for (const choice of chunk.choices) {
      const delta = choice.delta;

      // Text content delta
      if (delta.content !== undefined && delta.content !== null) {
        const contentEvent: StreamContentDelta = {
          type: 'content_delta',
          delta: delta.content,
          contentBlockIndex: this.contentBlockIndex++,
        };
        events.push(contentEvent);
      }

      // Tool call deltas
      if (delta.tool_calls) {
        for (const tcDelta of delta.tool_calls) {
          const tcEvents = this.processToolCallDelta(tcDelta);
          events.push(...tcEvents);
        }
      }

      // finish_reason → message_end (always the last chunk)
      if (choice.finish_reason !== null) {
        // Emit tool_call_end for any accumulated tool calls that haven't been finalized
        for (const [index, tc] of this.toolCalls) {
          if (!tc.emitted) {
            const endEvent = this.finalizeToolCall(index);
            events.push(endEvent);
          }
        }

        const endEvent: StreamMessageEnd = {
          type: 'message_end',
          finishReason: mapFinishReason(choice.finish_reason),
        };
        events.push(endEvent);
      }
    }

    // Usage (sent with the final chunk)
    if (chunk.usage) {
      const usageEvent: StreamUsageUpdate = {
        type: 'usage',
        usage: openaiUsageToCanonical(chunk.usage)!,
      };
      events.push(usageEvent);
    }

    return events;
  }

  /**
   * Process a single tool_call delta from a streaming chunk.
   * OpenAI sends: first chunk has id + name + partial args,
   * subsequent chunks have only arguments delta.
   */
  private processToolCallDelta(tc: OpenAIStreamToolCall): CanonicalStreamEvent[] {
    const events: CanonicalStreamEvent[] = [];
    const index = tc.index;

    let existing = this.toolCalls.get(index);

    // New tool call: emit tool_call_start
    if (tc.id && tc.function?.name && !existing) {
      existing = {
        id: tc.id,
        name: tc.function.name,
        argsBuffer: '',
        emitted: false,
      };
      this.toolCalls.set(index, existing);

      const startEvent: StreamToolCallStart = {
        type: 'tool_call_start',
        toolCallIndex: index,
        id: tc.id,
        name: tc.function.name,
      };
      events.push(startEvent);
    }

    // Accumulate arguments
    if (tc.function?.arguments !== undefined && existing) {
      existing.argsBuffer += tc.function.arguments;

      const deltaEvent: StreamToolCallDelta = {
        type: 'tool_call_delta',
        toolCallIndex: index,
        argumentsDelta: tc.function.arguments,
      };
      events.push(deltaEvent);
    }

    return events;
  }

  /**
   * Finalize a tool call: parse accumulated arguments, emit tool_call_end.
   */
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
      parsed = {}; // Empty args = empty object
    }

    return {
      type: 'tool_call_end',
      toolCallIndex: index,
      arguments: parsed,
      parseError,
    };
  }

  /**
   * Reset state (for reusing the parser with a new stream).
   */
  reset(): void {
    this.started = false;
    this.id = '';
    this.model = '';
    this.systemFingerprint = undefined;
    this.toolCalls.clear();
    this.contentBlockIndex = 0;
  }
}

/**
 * Stateless convenience: parse an array of chunks into a flat event list.
 */
export function openaiChunksToCanonicalEvents(
  chunks: OpenAIChatCompletionChunk[],
): CanonicalStreamEvent[] {
  const parser = new OpenAIStreamToCanonical();
  const events: CanonicalStreamEvent[] = [];
  for (const chunk of chunks) {
    events.push(...parser.feed(chunk));
  }
  return events;
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
    default: return 'unknown';
  }
}
