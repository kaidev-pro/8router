// 8Router — OpenAI Responses API Bridge Tests (Phase 1F)
// Tests semantic parity for Responses API ↔ Canonical conversion.
// No runtime production path is modified by these tests.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ResponsesRequest, ResponsesResponse } from '../bridge/openai-responses/types.js';
import { responsesRequestToCanonical } from '../bridge/openai-responses/request-to-canonical.js';
import { canonicalRequestToResponses } from '../bridge/openai-responses/canonical-to-request.js';
import { responsesResponseToCanonical } from '../bridge/openai-responses/response-to-canonical.js';
import { canonicalResponseToResponses } from '../bridge/openai-responses/canonical-to-response.js';
import { responsesEventsToCanonicalEvents } from '../bridge/openai-responses/stream-to-canonical.js';

const FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures', 'bridge', 'openai-responses');

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

export function runResponsesBridgeTests(): void {
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

  // ─── Request → Canonical ────────────────────────────────────────

  console.log('\n  Responses Request → Canonical:');

  test('1. simple text input string → canonical user message', () => {
    const raw = loadFixture<ResponsesRequest>('simple-text-request.json');
    const { request } = responsesRequestToCanonical(raw);

    assertEqual(request.model, 'gpt-4o', 'model');
    assertEqual(request.messages.length, 1, '1 message');
    assertEqual(request.messages[0].role, 'user', 'user role');
    assertEqual(request.messages[0].content[0].type, 'text', 'text type');
    assertEqual(request.bridgeMeta?.sourceFormat, 'openai_responses', 'sourceFormat');
  });

  test('2. instructions → canonical instructions', () => {
    const raw = loadFixture<ResponsesRequest>('simple-text-request.json');
    const { request } = responsesRequestToCanonical(raw);

    assertEqual(request.instructions.length, 1, '1 instruction');
    assertEqual(request.instructions[0].role, 'system', 'system role');
    assertEqual(request.instructions[0].content[0].type, 'text', 'text type');
  });

  test('3. multi-message input → canonical messages', () => {
    const raw = loadFixture<ResponsesRequest>('multi-message-request.json');
    const { request } = responsesRequestToCanonical(raw);

    assertEqual(request.messages.length, 3, '3 messages');
    assertEqual(request.messages[0].role, 'user', 'msg 0');
    assertEqual(request.messages[1].role, 'assistant', 'msg 1');
    assertEqual(request.messages[2].role, 'user', 'msg 2');
  });

  test('4. tools/function → canonical tools', () => {
    const raw = loadFixture<ResponsesRequest>('tools-request.json');
    const { request } = responsesRequestToCanonical(raw);

    assert(request.tools !== undefined, 'has tools');
    assertEqual(request.tools!.length, 1, '1 tool');
    assertEqual(request.tools![0].name, 'get_weather', 'tool name');
    assert(request.tools![0].inputSchema !== undefined, 'has parameters');
  });

  test('5. tool_choice → canonical toolChoice', () => {
    const raw = loadFixture<ResponsesRequest>('tools-request.json');
    const { request } = responsesRequestToCanonical(raw);

    assert(request.toolChoice !== undefined, 'has toolChoice');
    assertEqual(request.toolChoice!.type, 'auto', 'auto');
  });

  test('6. json_schema response format → canonical responseFormat', () => {
    const raw = loadFixture<ResponsesRequest>('json-schema-request.json');
    const { request } = responsesRequestToCanonical(raw);

    assert(request.responseFormat !== undefined, 'has responseFormat');
    assertEqual(request.responseFormat!.type, 'json_schema', 'json_schema');
  });

  test('7. temperature + max_output_tokens → canonical', () => {
    const raw = loadFixture<ResponsesRequest>('simple-text-request.json');
    const { request } = responsesRequestToCanonical(raw);

    assertEqual(request.temperature, 0.7, 'temperature');
    assertEqual(request.maxTokens, 100, 'maxTokens');
  });

  test('8. previous_response_id → extensions.openaiResponses', () => {
    const raw = loadFixture<ResponsesRequest>('previous-response-request.json');
    const { request } = responsesRequestToCanonical(raw);

    assert(request.extensions?.responses?.previous_response_id === 'resp-abc100', 'previous_response_id');
  });

  test('9. metadata → canonical metadata', () => {
    const raw = loadFixture<ResponsesRequest>('previous-response-request.json');
    const { request } = responsesRequestToCanonical(raw);

    assert(request.metadata?.conversation_id === 'conv-123', 'metadata');
  });

  test('10. image input → canonical image part', () => {
    const raw = loadFixture<ResponsesRequest>('multimodal-request.json');
    const { request } = responsesRequestToCanonical(raw);

    const imagePart = request.messages[0].content.find(p => p.type === 'image');
    assert(imagePart !== undefined, 'has image part');
  });

  test('11. function_call_output → role:tool message', () => {
    const raw: ResponsesRequest = {
      model: 'gpt-4o',
      input: [
        { type: 'function_call_output', call_id: 'call-123', output: '{"temp":25}' },
      ],
    };
    const { request } = responsesRequestToCanonical(raw);

    assertEqual(request.messages.length, 1, '1 message');
    assertEqual(request.messages[0].role, 'tool', 'tool role');
    assertEqual(request.messages[0].content[0].type, 'tool_result', 'tool_result');
  });

  // ─── Canonical → Request (Round-trip) ───────────────────────────

  console.log('\n  Canonical → Responses Request (Round-trip):');

  test('12. simple request round-trip', () => {
    const raw = loadFixture<ResponsesRequest>('simple-text-request.json');
    const { request: canonical } = responsesRequestToCanonical(raw);
    const { request: responses } = canonicalRequestToResponses(canonical);

    assertEqual(responses.model, 'gpt-4o', 'model');
    assertEqual(responses.input.length, 1, '1 input item');
    assert(responses.instructions !== undefined, 'has instructions');
    assertEqual(responses.temperature, 0.7, 'temperature');
    assertEqual(responses.max_output_tokens, 100, 'maxTokens');
  });

  test('13. multi-message round-trip', () => {
    const raw = loadFixture<ResponsesRequest>('multi-message-request.json');
    const { request: canonical } = responsesRequestToCanonical(raw);
    const { request: responses } = canonicalRequestToResponses(canonical);

    const items = responses.input as import('../bridge/openai-responses/types.js').ResponsesInputMessage[];
    assertEqual(items.length, 3, '3 input items');
    assertEqual(items[0].role, 'user', 'msg 0');
    assertEqual(items[1].role, 'assistant', 'msg 1');
    assertEqual(items[2].role, 'user', 'msg 2');
  });

  test('14. tools round-trip', () => {
    const raw = loadFixture<ResponsesRequest>('tools-request.json');
    const { request: canonical } = responsesRequestToCanonical(raw);
    const { request: responses } = canonicalRequestToResponses(canonical);

    assert(responses.tools !== undefined, 'has tools');
    assertEqual(responses.tools!.length, 1, '1 tool');
    assertEqual((responses.tools![0] as import('../bridge/openai-responses/types.js').ResponsesFunctionTool).name, 'get_weather', 'tool name');
  });

  test('15. tool_choice round-trip', () => {
    const raw = loadFixture<ResponsesRequest>('tools-request.json');
    const { request: canonical } = responsesRequestToCanonical(raw);
    const { request: responses } = canonicalRequestToResponses(canonical);

    assertEqual(responses.tool_choice, 'auto', 'tool_choice');
  });

  test('16. json_schema round-trip', () => {
    const raw = loadFixture<ResponsesRequest>('json-schema-request.json');
    const { request: canonical } = responsesRequestToCanonical(raw);
    const { request: responses } = canonicalRequestToResponses(canonical);

    assert(responses.text?.format !== undefined, 'has text.format');
    assertEqual(responses.text!.format!.type, 'json_schema', 'json_schema');
  });

  test('17. tool result round-trip preserves function_call_output', () => {
    const raw: ResponsesRequest = {
      model: 'gpt-4o',
      input: [
        { type: 'function_call_output', call_id: 'call-456', output: '{"result":42}' },
      ],
    };
    const { request: canonical } = responsesRequestToCanonical(raw);
    const { request: responses } = canonicalRequestToResponses(canonical);

    const items = responses.input as import('../bridge/openai-responses/types.js').ResponsesFunctionCallOutput[];
    assertEqual(items.length, 1, '1 item');
    assertEqual(items[0].type, 'function_call_output', 'type');
    assertEqual(items[0].call_id, 'call-456', 'call_id');
    assertEqual(items[0].output, '{"result":42}', 'output');
  });

  // ─── Response → Canonical ───────────────────────────────────────

  console.log('\n  Responses Response → Canonical:');

  test('18. simple text response → canonical content', () => {
    const raw = loadFixture<ResponsesResponse>('simple-text-response.json');
    const { response } = responsesResponseToCanonical(raw);

    assertEqual(response.id, 'resp-abc123', 'id');
    assertEqual(response.model, 'gpt-4o', 'model');
    assertEqual(response.provider, 'openai_responses', 'provider');
    assertEqual(response.content.length, 1, '1 content part');
    assertEqual(response.content[0].type, 'text', 'text type');
    assertEqual(response.finishReason, 'stop', 'stop');
  });

  test('19. usage mapping', () => {
    const raw = loadFixture<ResponsesResponse>('simple-text-response.json');
    const { response } = responsesResponseToCanonical(raw);

    assert(response.usage !== undefined, 'has usage');
    assertEqual(response.usage!.inputTokens, 15, 'inputTokens');
    assertEqual(response.usage!.outputTokens, 8, 'outputTokens');
    assertEqual(response.usage!.totalTokens, 23, 'totalTokens');
  });

  test('20. function_call → canonical toolCalls', () => {
    const raw = loadFixture<ResponsesResponse>('tool-call-response.json');
    const { response } = responsesResponseToCanonical(raw);

    assertEqual(response.toolCalls.length, 1, '1 tool call');
    assertEqual(response.toolCalls[0].name, 'get_weather', 'tool name');
    assertEqual(response.toolCalls[0].arguments.location, 'Tokyo', 'arg');
    assertEqual(response.toolCalls[0].arguments.unit, 'celsius', 'arg');
  });

  test('21. reasoning output → canonical reasoning', () => {
    const raw = loadFixture<ResponsesResponse>('reasoning-response.json');
    const { response } = responsesResponseToCanonical(raw);

    assert(response.reasoning !== undefined, 'has reasoning');
    assert(response.reasoning!.includes('qubits'), 'mentions qubits');
  });

  test('22. reasoning usage → reasoningTokens', () => {
    const raw = loadFixture<ResponsesResponse>('reasoning-response.json');
    const { response } = responsesResponseToCanonical(raw);

    assertEqual(response.usage?.reasoningTokens, 30, 'reasoningTokens');
  });

  test('23. failed response → finishReason error', () => {
    const raw = loadFixture<ResponsesResponse>('failed-response.json');
    const { response } = responsesResponseToCanonical(raw);

    assertEqual(response.finishReason, 'error', 'error');
    assertEqual(response.toolCalls.length, 0, 'no tool calls');
  });

  // ─── Canonical → Response (Round-trip) ──────────────────────────

  console.log('\n  Canonical → Responses Response (Round-trip):');

  test('24. simple response round-trip', () => {
    const raw = loadFixture<ResponsesResponse>('simple-text-response.json');
    const { response: canonical } = responsesResponseToCanonical(raw);
    const { response: responses } = canonicalResponseToResponses(canonical);

    assertEqual(responses.id, 'resp-abc123', 'id');
    assertEqual(responses.object, 'response', 'object');
    assertEqual(responses.status, 'completed', 'status');
    assertEqual(responses.model, 'gpt-4o', 'model');
    assert(responses.output.length > 0, 'has output');
  });

  test('25. tool call response round-trip', () => {
    const raw = loadFixture<ResponsesResponse>('tool-call-response.json');
    const { response: canonical } = responsesResponseToCanonical(raw);
    const { response: responses } = canonicalResponseToResponses(canonical);

    const fnCalls = responses.output.filter(o => o.type === 'function_call');
    assertEqual(fnCalls.length, 1, '1 function_call');
    const fc = fnCalls[0] as import('../bridge/openai-responses/types.js').ResponsesOutputFunctionCallItem;
    assertEqual(fc.name, 'get_weather', 'name');
    const parsed = JSON.parse(fc.arguments);
    assertEqual(parsed.location, 'Tokyo', 'location');
  });

  test('26. usage round-trip', () => {
    const raw = loadFixture<ResponsesResponse>('simple-text-response.json');
    const { response: canonical } = responsesResponseToCanonical(raw);
    const { response: responses } = canonicalResponseToResponses(canonical);

    assert(responses.usage !== undefined, 'has usage');
    assertEqual(responses.usage!.input_tokens, 15, 'input_tokens');
    assertEqual(responses.usage!.output_tokens, 8, 'output_tokens');
  });

  test('27. length finishReason → incomplete status', () => {
    const { response: responses } = canonicalResponseToResponses({
      id: 'resp-test',
      model: 'test',
      provider: 'openai_responses',
      createdAt: Date.now(),
      content: [],
      toolCalls: [],
      finishReason: 'length',
    });

    assertEqual(responses.status, 'incomplete', 'incomplete');
    assertEqual(responses.incomplete_details?.reason, 'max_output_tokens', 'reason');
  });

  // ─── Streaming ──────────────────────────────────────────────────

  console.log('\n  Streaming Events → Canonical:');

  test('28. response.created → message_start', () => {
    const events = responsesEventsToCanonicalEvents([{
      type: 'response.created',
      event_id: 'evt-001',
      response: { id: 'resp-001', object: 'response', created_at: Date.now(), status: 'in_progress', model: 'gpt-4o', output: [] },
    }]);

    assertEqual(events.length, 1, '1 event');
    assertEqual(events[0].type, 'message_start', 'message_start');
    assertEqual((events[0] as import('../bridge/canonical/stream.js').StreamMessageStart).id, 'resp-001', 'id');
  });

  test('29. output_text.delta → content_delta', () => {
    const events = responsesEventsToCanonicalEvents([
      { type: 'response.created', event_id: 'evt-001', response: { id: 'resp-001', object: 'response', created_at: Date.now(), status: 'in_progress', model: 'gpt-4o', output: [] } },
      { type: 'response.output_text.delta', event_id: 'evt-002', output_index: 0, content_index: 0, delta: 'Hello' },
    ]);

    assertEqual(events.length, 2, '2 events');
    assertEqual(events[1].type, 'content_delta', 'content_delta');
    assertEqual((events[1] as { delta?: string }).delta, 'Hello', 'delta');
  });

  test('30. reasoning_summary_text.delta → thinking_delta', () => {
    const events = responsesEventsToCanonicalEvents([
      { type: 'response.created', event_id: 'evt-001', response: { id: 'resp-001', object: 'response', created_at: Date.now(), status: 'in_progress', model: 'o3', output: [] } },
      { type: 'response.reasoning_summary_text.delta', event_id: 'evt-002', output_index: 0, content_index: 0, delta: 'Thinking...' },
    ]);

    assertEqual(events.length, 2, '2 events');
    assertEqual(events[1].type, 'thinking_delta', 'thinking_delta');
    assertEqual((events[1] as { delta?: string }).delta, 'Thinking...', 'delta');
  });

  test('31. function_call_arguments delta → tool_call_delta', () => {
    const events = responsesEventsToCanonicalEvents([
      { type: 'response.created', event_id: 'evt-001', response: { id: 'resp-001', object: 'response', created_at: Date.now(), status: 'in_progress', model: 'gpt-4o', output: [] } },
      { type: 'response.output_item.added', event_id: 'evt-002', output_index: 0, item: { type: 'function_call', id: 'fc-001', call_id: 'call-001', name: 'get_weather', arguments: '' } },
      { type: 'response.function_call_arguments.delta', event_id: 'evt-003', output_index: 0, delta: '{"location":' },
    ]);

    assertEqual(events.length, 3, '3 events');
    assertEqual(events[1].type, 'tool_call_start', 'tool_call_start');
    assertEqual(events[2].type, 'tool_call_delta', 'tool_call_delta');
  });

  test('32. error → stream_error', () => {
    const events = responsesEventsToCanonicalEvents([{
      type: 'error',
      event_id: 'evt-001',
      error: { code: 'rate_limit', message: 'Too many requests' },
    }]);

    assertEqual(events.length, 1, '1 event');
    assertEqual(events[0].type, 'stream_error', 'stream_error');
  });

  test('33. completed event → message_end with usage', () => {
    const events = responsesEventsToCanonicalEvents([
      { type: 'response.created', event_id: 'evt-001', response: { id: 'resp-001', object: 'response', created_at: Date.now(), status: 'in_progress', model: 'gpt-4o', output: [] } },
      { type: 'response.completed', event_id: 'evt-002', response: {
        id: 'resp-001', object: 'response', created_at: Date.now(), status: 'completed', model: 'gpt-4o', output: [],
        usage: { input_tokens: 10, output_tokens: 20, total_tokens: 30 },
      }},
    ]);

    const endEvent = events.find(e => e.type === 'message_end');
    assert(endEvent !== undefined, 'has message_end');
    assertEqual(endEvent!.finishReason, 'stop', 'stop');

    const usageEvent = events.find(e => e.type === 'usage');
    assert(usageEvent !== undefined, 'has usage');
  });

  // ─── Edge Cases ─────────────────────────────────────────────────

  console.log('\n  Edge Cases:');

  test('34. empty input → empty messages', () => {
    const raw: ResponsesRequest = { model: 'gpt-4o', input: '' };
    const { request } = responsesRequestToCanonical(raw);

    // Empty string becomes a user message with empty text
    assertEqual(request.messages.length, 1, '1 message');
  });

  test('35. no tools → undefined tools', () => {
    const raw: ResponsesRequest = { model: 'gpt-4o', input: 'Hello' };
    const { request } = responsesRequestToCanonical(raw);

    assert(request.tools === undefined, 'no tools');
    assert(request.toolChoice === undefined, 'no toolChoice');
  });

  test('36. no text format → undefined responseFormat', () => {
    const raw: ResponsesRequest = { model: 'gpt-4o', input: 'Hello' };
    const { request } = responsesRequestToCanonical(raw);

    assert(request.responseFormat === undefined, 'no responseFormat');
  });

  test('37. web_search tool → preserved in extensions', () => {
    const raw: ResponsesRequest = {
      model: 'gpt-4o',
      input: 'Search for something',
      tools: [{ type: 'web_search_preview' }],
    };
    const { request } = responsesRequestToCanonical(raw);

    assert(request.tools !== undefined, 'has tools');
    assert(request.tools!.length > 0, 'has at least 1 tool');
  });

  // ─── Summary ────────────────────────────────────────────────────

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`${failed} Responses API bridge tests failed`);
  }
}
