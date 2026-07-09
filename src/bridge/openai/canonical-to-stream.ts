// 8Router — Canonical Stream Events → OpenAI Streaming Chunks Serializer
// Phase 1D: Convert CanonicalStreamEvent sequence back to OpenAI SSE chunks.
//
// Used by the shadow mode serializer or output adapters to reconstitute
// an OpenAI-compatible stream from canonical events.

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
import type { OpenAIChatCompletionChunk, OpenAIStreamToolCall } from './types.js';
import { canonicalUsageToOpenai } from './usage.js';

/** State for accumulating tool call arguments during serialization. */
interface ToolCallAccumulator {
  id: string;
  name: string;
  argsBuffer: string;
}

/**
 * Serialize a sequence of CanonicalStreamEvents into OpenAI SSE chunks.
 *
 * Each CanonicalStreamEvent may produce zero or one OpenAI chunk.
 * Multiple events may be batched into a single chunk for efficiency,
 * or a single event may produce multiple chunks if needed.
 */
export function canonicalEventsToOpenaiChunks(
  events: CanonicalStreamEvent[],
): OpenAIChatCompletionChunk[] {
  const chunks: OpenAIChatCompletionChunk[] = [];
  const toolCalls = new Map<number, ToolCallAccumulator>();

  let id = '';
  let model = '';
  let created = Math.floor(Date.now() / 1000);

  for (const event of events) {
    switch (event.type) {
      case 'message_start': {
        id = event.id;
        model = event.model;
        break;
      }

      case 'content_delta': {
        chunks.push(makeTextDelta(id, model, created, event.delta));
        break;
      }

      case 'thinking_delta': {
        // OpenAI doesn't have thinking content in delta — emit as empty text
        // Shadow mode or output adapter may want to skip this
        break;
      }

      case 'tool_call_start': {
        const tc: ToolCallAccumulator = {
          id: event.id,
          name: event.name,
          argsBuffer: '',
        };
        toolCalls.set(event.toolCallIndex, tc);

        chunks.push(makeToolCallStart(id, model, created, event.toolCallIndex, event.id, event.name));
        break;
      }

      case 'tool_call_delta': {
        const tc = toolCalls.get(event.toolCallIndex);
        if (tc) {
          tc.argsBuffer += event.argumentsDelta;
        }
        chunks.push(makeToolCallDelta(id, model, created, event.toolCallIndex, event.argumentsDelta));
        break;
      }

      case 'tool_call_end': {
        // tool_call_end doesn't produce its own OpenAI chunk —
        // the final arguments delta was already sent via tool_call_delta.
        // OpenAI doesn't have a "tool_call complete" chunk.
        break;
      }

      case 'usage': {
        const openaiUsage = canonicalUsageToOpenai(event.usage);
        // Attach usage to the next chunk, or emit as a standalone
        // We attach to the message_end if present, otherwise standalone
        chunks.push(makeUsageChunk(id, model, created, openaiUsage));
        break;
      }

      case 'message_end': {
        chunks.push(makeFinishChunk(id, model, created, event.finishReason));
        break;
      }

      case 'stream_error': {
        chunks.push(makeErrorChunk(id, model, created, event.error.message));
        break;
      }
    }
  }

  return chunks;
}

/**
 * Serialize a single canonical event into one OpenAI chunk.
 * Useful for real-time conversion (event-by-event).
 */
export function canonicalEventToOpenaiChunk(
  event: CanonicalStreamEvent,
  id: string,
  model: string,
  created: number,
): OpenAIChatCompletionChunk | null {
  switch (event.type) {
    case 'content_delta':
      return makeTextDelta(id, model, created, event.delta);
    case 'tool_call_start':
      return makeToolCallStart(id, model, created, event.toolCallIndex, event.id, event.name);
    case 'tool_call_delta':
      return makeToolCallDelta(id, model, created, event.toolCallIndex, event.argumentsDelta);
    case 'usage':
      return makeUsageChunk(id, model, created, canonicalUsageToOpenai(event.usage));
    case 'message_end':
      return makeFinishChunk(id, model, created, event.finishReason);
    case 'stream_error':
      return makeErrorChunk(id, model, created, event.error.message);
    // message_start, thinking_delta, tool_call_end produce no chunk
    default:
      return null;
  }
}

// ─── Chunk Builders ──────────────────────────────────────────────────

function makeTextDelta(
  id: string, model: string, created: number, text: string,
): OpenAIChatCompletionChunk {
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{
      index: 0,
      delta: { content: text },
      finish_reason: null,
    }],
  };
}

function makeToolCallStart(
  id: string, model: string, created: number,
  index: number, tcId: string, name: string,
): OpenAIChatCompletionChunk {
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index,
          id: tcId,
          type: 'function',
          function: { name },
        }],
      },
      finish_reason: null,
    }],
  };
}

function makeToolCallDelta(
  id: string, model: string, created: number,
  index: number, argumentsDelta: string,
): OpenAIChatCompletionChunk {
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{
      index: 0,
      delta: {
        tool_calls: [{
          index,
          function: { arguments: argumentsDelta },
        }],
      },
      finish_reason: null,
    }],
  };
}

function makeFinishChunk(
  id: string, model: string, created: number,
  finishReason: CanonicalFinishReason,
): OpenAIChatCompletionChunk {
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: mapFinishReason(finishReason),
    }],
  };
}

function makeUsageChunk(
  id: string, model: string, created: number,
  usage: import('./types.js').OpenAICompletionUsage | undefined,
): OpenAIChatCompletionChunk {
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [],
    usage,
  };
}

function makeErrorChunk(
  id: string, model: string, created: number,
  _message: string,
): OpenAIChatCompletionChunk {
  return {
    id,
    object: 'chat.completion.chunk',
    created,
    model,
    choices: [{
      index: 0,
      delta: {},
      finish_reason: 'stop',
    }],
  };
}

function mapFinishReason(reason: CanonicalFinishReason): 'stop' | 'length' | 'tool_calls' | 'content_filter' | null {
  switch (reason) {
    case 'stop': return 'stop';
    case 'length': return 'length';
    case 'tool_call': return 'tool_calls';
    case 'content_filter': return 'content_filter';
    case 'error': return 'stop';
    case 'unknown': return null;
    default: return null;
  }
}
