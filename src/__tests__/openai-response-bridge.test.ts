// 8Router — OpenAI Response + Streaming Bridge Tests (Phase 1D)
// Tests semantic parity for OpenAI response ↔ Canonical and streaming ↔ Canonical.
// No runtime production path is modified by these tests.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type {
  OpenAIChatCompletionResponse,
  OpenAIChatCompletionChunk,
} from '../bridge/openai/types.js';
import { openaiResponseToCanonical } from '../bridge/openai/response-to-canonical.js';
import { canonicalResponseToOpenai } from '../bridge/openai/canonical-to-response.js';
import { OpenAIStreamToCanonical, openaiChunksToCanonicalEvents } from '../bridge/openai/stream-to-canonical.js';
import { canonicalEventsToOpenaiChunks } from '../bridge/openai/canonical-to-stream.js';
import type { CanonicalStreamEvent } from '../bridge/canonical/stream.js';

const FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures', 'bridge', 'openai');

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`ASSERT FAILED: ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function loadFixture<T>(name: string): T {
  const raw = readFileSync(join(FIXTURES_DIR, name), 'utf-8');
  return JSON.parse(raw) as T;
}

export function runOpenAIResponseBridgeTests(): void {
  let passed = 0;
  let failed = 0;

  function test(name: string, fn: () => void): void {
    try {
      fn();
      console.log(`   ✅ ${name}`);
      passed++;
    } catch (err) {
      console.log(`   ❌ ${name}`);
      console.log(`      ${(err as Error).message}`);
      failed++;
    }
  }

  // ─── Response → Canonical ────────────────────────────────────────

  console.log('\n  Response → Canonical:');

  test('simple text response → CanonicalResponse', () => {
    const raw = loadFixture<OpenAIChatCompletionResponse>('simple-text-response.json');
    const { response, warnings } = openaiResponseToCanonical(raw);

    assertEqual(response.id, 'chatcmpl-abc123', 'id');
    assertEqual(response.model, 'gpt-4o-2024-08-06', 'model');
    assertEqual(response.provider, 'openai', 'provider');
    assertEqual(response.createdAt, 1700000000, 'createdAt');
    assertEqual(response.finishReason, 'stop', 'finishReason');
    assert(response.content.length === 1, 'should have 1 content part');
    assertEqual(response.content[0].type, 'text', 'content type');
    assertEqual((response.content[0] as { type: string; text: string }).text, 'Hello! How can I help you today?', 'content text');
    assert(response.toolCalls.length === 0, 'no tool calls');
    assert(response.usage !== undefined, 'has usage');
    assertEqual(response.usage!.inputTokens, 10, 'inputTokens');
    assertEqual(response.usage!.outputTokens, 8, 'outputTokens');
    assertEqual(response.usage!.totalTokens, 18, 'totalTokens');
  });

  test('tool call response → CanonicalResponse', () => {
    const raw = loadFixture<OpenAIChatCompletionResponse>('tool-call-response.json');
    const { response } = openaiResponseToCanonical(raw);

    assertEqual(response.finishReason, 'tool_call', 'finishReason mapped to singular');
    assert(response.toolCalls.length === 1, '1 tool call');
    assertEqual(response.toolCalls[0].id, 'call_abc123', 'tool call id');
    assertEqual(response.toolCalls[0].name, 'get_weather', 'tool call name');
    assertEqual(response.toolCalls[0].arguments.location, 'Tokyo', 'tool arg location');
    assertEqual(response.toolCalls[0].arguments.unit, 'celsius', 'tool arg unit');

    // Also in content as tool_use part
    const toolUseParts = response.content.filter(p => p.type === 'tool_use');
    assert(toolUseParts.length === 1, '1 tool_use content part');
    assertEqual(toolUseParts[0].id, 'call_abc123', 'tool_use id');
  });

  test('response with reasoning tokens', () => {
    const raw = loadFixture<OpenAIChatCompletionResponse>('with-reasoning-tokens.json');
    const { response } = openaiResponseToCanonical(raw);

    assert(response.usage !== undefined, 'has usage');
    assertEqual(response.usage!.inputTokens, 100, 'inputTokens');
    assertEqual(response.usage!.outputTokens, 200, 'outputTokens');
    assertEqual(response.usage!.cachedInputTokens, 50, 'cachedInputTokens');
    assertEqual(response.usage!.reasoningTokens, 150, 'reasoningTokens');
  });

  test('content filter response', () => {
    const raw = loadFixture<OpenAIChatCompletionResponse>('content-filter-response.json');
    const { response } = openaiResponseToCanonical(raw);

    assertEqual(response.finishReason, 'content_filter', 'finishReason');
  });

  test('length-limited response', () => {
    const raw = loadFixture<OpenAIChatCompletionResponse>('length-limited-response.json');
    const { response } = openaiResponseToCanonical(raw);

    assertEqual(response.finishReason, 'length', 'finishReason');
  });

  test('response with no choices → error finishReason', () => {
    const raw: OpenAIChatCompletionResponse = {
      id: 'chatcmpl-empty',
      object: 'chat.completion',
      created: 1700000099,
      model: 'gpt-4o',
      choices: [],
    };
    const { response } = openaiResponseToCanonical(raw);

    assertEqual(response.finishReason, 'error', 'empty choices → error');
    assert(response.content.length === 0, 'no content');
    assert(response.toolCalls.length === 0, 'no tool calls');
  });

  // ─── Canonical → Response ────────────────────────────────────────

  console.log('\n  Canonical → Response (round-trip):');

  test('simple text round-trip', () => {
    const raw = loadFixture<OpenAIChatCompletionResponse>('simple-text-response.json');
    const { response: canonical } = openaiResponseToCanonical(raw);
    const { response: serialized } = canonicalResponseToOpenai(canonical);

    assertEqual(serialized.id, raw.id, 'id preserved');
    assertEqual(serialized.object, 'chat.completion', 'object type');
    assertEqual(serialized.created, raw.created, 'created preserved');
    assertEqual(serialized.model, raw.model, 'model preserved');
    assert(serialized.choices.length === 1, '1 choice');
    assertEqual(serialized.choices[0].message.role, 'assistant', 'role');
    assertEqual(serialized.choices[0].message.content, 'Hello! How can I help you today?', 'content');
    assertEqual(serialized.choices[0].finish_reason, 'stop', 'finish_reason');
  });

  test('tool call round-trip', () => {
    const raw = loadFixture<OpenAIChatCompletionResponse>('tool-call-response.json');
    const { response: canonical } = openaiResponseToCanonical(raw);
    const { response: serialized } = canonicalResponseToOpenai(canonical);

    assertEqual(serialized.choices[0].finish_reason, 'tool_calls', 'finish_reason plural');
    assert(serialized.choices[0].message.tool_calls !== undefined, 'has tool_calls');
    assertEqual(serialized.choices[0].message.tool_calls!.length, 1, '1 tool call');
    assertEqual(serialized.choices[0].message.tool_calls![0].id, 'call_abc123', 'tool id');
    assertEqual(serialized.choices[0].message.tool_calls![0].function.name, 'get_weather', 'tool name');
    // Arguments should be stringified JSON
    const parsedArgs = JSON.parse(serialized.choices[0].message.tool_calls![0].function.arguments);
    assertEqual(parsedArgs.location, 'Tokyo', 'arg location');
  });

  test('finishReason mapping round-trip', () => {
    // tool_call ↔ tool_calls
    const raw = loadFixture<OpenAIChatCompletionResponse>('tool-call-response.json');
    const { response: canonical } = openaiResponseToCanonical(raw);
    assertEqual(canonical.finishReason, 'tool_call', 'canonical uses singular');

    const { response: serialized } = canonicalResponseToOpenai(canonical);
    assertEqual(serialized.choices[0].finish_reason, 'tool_calls', 'openai uses plural');
  });

  test('usage round-trip preserves details', () => {
    const raw = loadFixture<OpenAIChatCompletionResponse>('with-reasoning-tokens.json');
    const { response: canonical } = openaiResponseToCanonical(raw);
    const { response: serialized } = canonicalResponseToOpenai(canonical);

    assert(serialized.usage !== undefined, 'has usage');
    assertEqual(serialized.usage!.prompt_tokens, 100, 'prompt_tokens');
    assertEqual(serialized.usage!.completion_tokens, 200, 'completion_tokens');
    assertEqual(serialized.usage!.prompt_tokens_details?.cached_tokens, 50, 'cached_tokens');
    assertEqual(serialized.usage!.completion_tokens_details?.reasoning_tokens, 150, 'reasoning_tokens');
  });

  // ─── Streaming: Chunks → Canonical Events ────────────────────────

  console.log('\n  Streaming Chunks → Canonical Events:');

  test('simple text stream → events', () => {
    const chunks = loadFixture<OpenAIChatCompletionChunk[]>('stream-simple-text.json');
    const parser = new OpenAIStreamToCanonical();
    const allEvents: CanonicalStreamEvent[] = [];
    for (const chunk of chunks) {
      allEvents.push(...parser.feed(chunk));
    }

    // Expected: message_start, content_delta("Hello"), content_delta(" world!"), usage, message_end
    const types = allEvents.map(e => e.type);
    assert(types[0] === 'message_start', 'first event is message_start');
    assert(types.includes('content_delta'), 'has content_delta');
    assert(types[types.length - 1] === 'message_end' || types[types.length - 2] === 'message_end', 'has message_end');

    const msgStart = allEvents.find(e => e.type === 'message_start') as import('../bridge/canonical/stream.js').StreamMessageStart;
    assertEqual(msgStart.id, 'chatcmpl-stream123', 'stream id');
    assertEqual(msgStart.model, 'gpt-4o-2024-08-06', 'stream model');

    const contentDeltas = allEvents.filter(e => e.type === 'content_delta') as import('../bridge/canonical/stream.js').StreamContentDelta[];
    assert(contentDeltas.length === 2, '2 content deltas');
    assertEqual(contentDeltas[0].delta, 'Hello', 'first delta');
    assertEqual(contentDeltas[1].delta, ' world!', 'second delta');

    const msgEnd = allEvents.find(e => e.type === 'message_end') as import('../bridge/canonical/stream.js').StreamMessageEnd;
    assertEqual(msgEnd.finishReason, 'stop', 'stream finishReason');

    const usageEvent = allEvents.find(e => e.type === 'usage') as import('../bridge/canonical/stream.js').StreamUsageUpdate;
    assert(usageEvent !== undefined, 'has usage event');
    assertEqual(usageEvent.usage.inputTokens, 5, 'stream inputTokens');
  });

  test('tool call stream → events', () => {
    const chunks = loadFixture<OpenAIChatCompletionChunk[]>('stream-tool-call.json');
    const events = openaiChunksToCanonicalEvents(chunks);

    const types = events.map(e => e.type);
    assert(types[0] === 'message_start', 'starts with message_start');
    assert(types.includes('tool_call_start'), 'has tool_call_start');
    assert(types.includes('tool_call_delta'), 'has tool_call_delta');
    assert(types.includes('tool_call_end'), 'has tool_call_end');

    const tcStart = events.find(e => e.type === 'tool_call_start') as import('../bridge/canonical/stream.js').StreamToolCallStart;
    assertEqual(tcStart.id, 'call_tc1', 'tool call id');
    assertEqual(tcStart.name, 'search', 'tool call name');
    assertEqual(tcStart.toolCallIndex, 0, 'tool call index');

    const tcEnd = events.find(e => e.type === 'tool_call_end') as import('../bridge/canonical/stream.js').StreamToolCallEnd;
    assert(tcEnd.arguments !== null, 'arguments parsed');
    assertEqual(tcEnd.arguments!.query, 'test', 'arguments content');
    assertEqual(tcEnd.parseError, undefined, 'no parse error');
  });

  test('parallel tool calls stream → events', () => {
    const chunks = loadFixture<OpenAIChatCompletionChunk[]>('stream-parallel-tools.json');
    const events = openaiChunksToCanonicalEvents(chunks);

    const tcStarts = events.filter(e => e.type === 'tool_call_start') as import('../bridge/canonical/stream.js').StreamToolCallStart[];
    assertEqual(tcStarts.length, 2, '2 tool call starts');
    assertEqual(tcStarts[0].toolCallIndex, 0, 'first tool index');
    assertEqual(tcStarts[0].id, 'call_a', 'first tool id');
    assertEqual(tcStarts[1].toolCallIndex, 1, 'second tool index');
    assertEqual(tcStarts[1].id, 'call_b', 'second tool id');

    const tcEnds = events.filter(e => e.type === 'tool_call_end') as import('../bridge/canonical/stream.js').StreamToolCallEnd[];
    assertEqual(tcEnds.length, 2, '2 tool call ends');
    assertEqual(tcEnds[0].arguments!.x, 1, 'first tool args');
    assertEqual(tcEnds[1].arguments!.y, 2, 'second tool args');
  });

  test('stream with malformed tool args → parseError', () => {
    const parser = new OpenAIStreamToCanonical();
    // Feed: message start + tool call start + bad args + finish
    const events1 = parser.feed({
      id: 'bad', object: 'chat.completion.chunk', created: 1, model: 'm',
      choices: [{ index: 0, delta: { tool_calls: [{ index: 0, id: 't1', type: 'function', function: { name: 'fn', arguments: '' } }] }, finish_reason: null }],
    });
    const events2 = parser.feed({
      id: 'bad', object: 'chat.completion.chunk', created: 1, model: 'm',
      choices: [{ index: 0, delta: { tool_calls: [{ index: 0, function: { arguments: 'NOT_JSON' } }] }, finish_reason: null }],
    });
    const events3 = parser.feed({
      id: 'bad', object: 'chat.completion.chunk', created: 1, model: 'm',
      choices: [{ index: 0, delta: {}, finish_reason: 'stop' }],
    });

    const allEvents = [...events1, ...events2, ...events3];
    const tcEnd = allEvents.find(e => e.type === 'tool_call_end') as import('../bridge/canonical/stream.js').StreamToolCallEnd | undefined;
    assert(tcEnd !== undefined, 'should have tool_call_end');
    assertEqual(tcEnd!.arguments, null, 'arguments null on bad JSON');
    assert(tcEnd!.parseError !== undefined, 'parseError set');
  });

  // ─── Canonical Events → Streaming Chunks ─────────────────────────

  console.log('\n  Canonical Events → Streaming Chunks:');

  test('text events → streaming chunks', () => {
    const chunks = loadFixture<OpenAIChatCompletionChunk[]>('stream-simple-text.json');
    const events = openaiChunksToCanonicalEvents(chunks);
    const rechunks = canonicalEventsToOpenaiChunks(events);

    // Verify text content in rechunks
    const textChunks = rechunks.filter(c => c.choices.length > 0 && c.choices[0].delta?.content);
    assert(textChunks.length === 2, '2 text chunks');
    assertEqual(textChunks[0].choices[0].delta.content, 'Hello', 'first text');
    assertEqual(textChunks[1].choices[0].delta.content, ' world!', 'second text');

    // Verify finish chunk
    const finishChunks = rechunks.filter(c => c.choices.length > 0 && c.choices[0].finish_reason !== null);
    assert(finishChunks.length === 1, '1 finish chunk');
    assertEqual(finishChunks[0].choices[0].finish_reason, 'stop', 'finish_reason');
  });

  test('tool call events → streaming chunks', () => {
    const chunks = loadFixture<OpenAIChatCompletionChunk[]>('stream-tool-call.json');
    const events = openaiChunksToCanonicalEvents(chunks);
    const rechunks = canonicalEventsToOpenaiChunks(events);

    // Should have tool call start chunk
    const tcStartChunks = rechunks.filter(c =>
      c.choices.length > 0 &&
      c.choices[0].delta?.tool_calls?.some(tc => tc.id !== undefined),
    );
    assert(tcStartChunks.length >= 1, 'has tool call start chunk');

    // Should have arguments delta chunks
    const argChunks = rechunks.filter(c =>
      c.choices.length > 0 &&
      c.choices[0].delta?.tool_calls?.some(tc => tc.function?.arguments !== undefined && tc.id === undefined),
    );
    assert(argChunks.length >= 1, 'has argument delta chunks');
  });

  test('finishReason: stop ↔ stop', () => {
    const events: CanonicalStreamEvent[] = [
      { type: 'message_start', id: 'test', model: 'm' },
      { type: 'message_end', finishReason: 'stop' },
    ];
    const chunks = canonicalEventsToOpenaiChunks(events);
    const finishChunk = chunks.find(c => c.choices.length > 0 && c.choices[0].finish_reason !== null);
    assert(finishChunk !== undefined, 'has finish chunk');
    assertEqual(finishChunk!.choices[0].finish_reason, 'stop', 'stop');
  });

  test('finishReason: tool_call ↔ tool_calls', () => {
    const events: CanonicalStreamEvent[] = [
      { type: 'message_start', id: 'test', model: 'm' },
      { type: 'message_end', finishReason: 'tool_call' },
    ];
    const chunks = canonicalEventsToOpenaiChunks(events);
    const finishChunk = chunks.find(c => c.choices.length > 0 && c.choices[0].finish_reason !== null);
    assertEqual(finishChunk!.choices[0].finish_reason, 'tool_calls', 'plural for OpenAI');
  });

  test('finishReason: length ↔ length', () => {
    const events: CanonicalStreamEvent[] = [
      { type: 'message_start', id: 'test', model: 'm' },
      { type: 'message_end', finishReason: 'length' },
    ];
    const chunks = canonicalEventsToOpenaiChunks(events);
    const finishChunk = chunks.find(c => c.choices.length > 0 && c.choices[0].finish_reason !== null);
    assertEqual(finishChunk!.choices[0].finish_reason, 'length', 'length');
  });

  test('usage event → usage chunk', () => {
    const events: CanonicalStreamEvent[] = [
      { type: 'message_start', id: 'test', model: 'm' },
      { type: 'usage', usage: { inputTokens: 10, outputTokens: 20, totalTokens: 30, cachedInputTokens: 5 } },
      { type: 'message_end', finishReason: 'stop' },
    ];
    const chunks = canonicalEventsToOpenaiChunks(events);
    const usageChunk = chunks.find(c => c.usage !== undefined);
    assert(usageChunk !== undefined, 'has usage chunk');
    assertEqual(usageChunk!.usage!.prompt_tokens, 10, 'prompt_tokens');
    assertEqual(usageChunk!.usage!.completion_tokens, 20, 'completion_tokens');
    assertEqual(usageChunk!.usage!.prompt_tokens_details?.cached_tokens, 5, 'cached_tokens');
  });

  test('thinking_delta → no chunk (OpenAI has no thinking)', () => {
    const events: CanonicalStreamEvent[] = [
      { type: 'message_start', id: 'test', model: 'm' },
      { type: 'thinking_delta', delta: 'thinking...', contentBlockIndex: 0 },
      { type: 'message_end', finishReason: 'stop' },
    ];
    const chunks = canonicalEventsToOpenaiChunks(events);
    // Should only have the finish chunk (no content from thinking)
    const contentChunks = chunks.filter(c => c.choices.length > 0 && c.choices[0].delta?.content);
    assert(contentChunks.length === 0, 'thinking produces no content chunk');
  });

  // ─── Full Stream Round-Trip ──────────────────────────────────────

  console.log('\n  Full Stream Round-Trip:');

  test('text stream round-trip preserves content', () => {
    const chunks = loadFixture<OpenAIChatCompletionChunk[]>('stream-simple-text.json');
    const events = openaiChunksToCanonicalEvents(chunks);
    const rechunks = canonicalEventsToOpenaiChunks(events);

    // Concatenate all text from rechunks
    const text = rechunks
      .filter(c => c.choices.length > 0 && c.choices[0].delta?.content)
      .map(c => c.choices[0].delta.content)
      .join('');
    assertEqual(text, 'Hello world!', 'reconstructed text');
  });

  test('tool call stream round-trip preserves arguments', () => {
    const chunks = loadFixture<OpenAIChatCompletionChunk[]>('stream-tool-call.json');
    const events = openaiChunksToCanonicalEvents(chunks);

    // Verify parsed arguments
    const tcEnd = events.find(e => e.type === 'tool_call_end') as import('../bridge/canonical/stream.js').StreamToolCallEnd;
    assert(tcEnd !== undefined, 'has tool_call_end');
    assertEqual(tcEnd!.arguments!.query, 'test', 'arguments preserved through stream');
  });

  // ─── Summary ─────────────────────────────────────────────────────

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`${failed} OpenAI response/streaming bridge tests failed`);
  }
}
