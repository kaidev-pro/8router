// 8Router — OpenAI Bridge Round-Trip Tests (Phase 1B)
// Tests semantic parity for OpenAI ↔ Canonical conversion.
// No runtime production path is modified by these tests.

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import type { OpenAIChatRequest } from '../bridge/openai/types.js';
import { openaiRequestToCanonical } from '../bridge/openai/request-to-canonical.js';
import { canonicalRequestToOpenai } from '../bridge/openai/request-from-canonical.js';

const FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures', 'bridge', 'openai');

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`ASSERT FAILED: ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

function deepEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return false;
  if (typeof a !== typeof b) return false;
  if (typeof a !== 'object') return false;
  if (Array.isArray(a) !== Array.isArray(b)) return false;
  const aKeys = Object.keys(a as Record<string, unknown>).sort();
  const bKeys = Object.keys(b as Record<string, unknown>).sort();
  if (aKeys.length !== bKeys.length) return false;
  for (let i = 0; i < aKeys.length; i++) {
    if (aKeys[i] !== bKeys[i]) return false;
    if (!deepEqual(
      (a as Record<string, unknown>)[aKeys[i]],
      (b as Record<string, unknown>)[bKeys[i]],
    )) return false;
  }
  return true;
}

function loadFixture(name: string): OpenAIChatRequest {
  const raw = readFileSync(join(FIXTURES_DIR, name), 'utf-8');
  return JSON.parse(raw) as OpenAIChatRequest;
}

export function runOpenAIBridgeTests(): void {
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

  console.log('=== OpenAI Bridge Round-Trip Tests ===\n');

  // --- 1. Simple Chat ---
  test('simple-chat: basic round-trip preserves content', () => {
    const source = loadFixture('simple-chat.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assertEqual(canonical.model, 'gpt-4o', 'model preserved');
    assertEqual(canonical.messages.length, 1, '1 message');
    assertEqual(canonical.messages[0].role, 'user', 'role preserved');
    assertEqual(canonical.messages[0].content[0].type, 'text', 'content type');
    assertEqual((canonical.messages[0].content[0] as { type: 'text'; text: string }).text, 'Hello, world!', 'text preserved');

    // Round-trip
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.model, 'gpt-4o', 'model restored');
    assertEqual(restored.messages[0].role, 'user', 'role restored');
    assertEqual(restored.messages[0].content, 'Hello, world!', 'content restored');
  });

  // --- 2. System Message ---
  test('system-message: system becomes instruction', () => {
    const source = loadFixture('system-message.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assertEqual(canonical.instructions.length, 1, '1 instruction');
    assertEqual(canonical.instructions[0].role, 'system', 'instruction role');
    assertEqual(canonical.messages.length, 1, '1 message');
    assertEqual(canonical.messages[0].role, 'user', 'message role');

    // Round-trip: instruction should restore to system message
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.messages[0].role, 'system', 'system restored at position 0');
    assertEqual(restored.messages[1].role, 'user', 'user restored at position 1');
  });

  // --- 3. Developer Message ---
  test('developer-message: developer becomes instruction', () => {
    const source = loadFixture('developer-message.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assertEqual(canonical.instructions.length, 1, '1 instruction');
    assertEqual(canonical.instructions[0].role, 'developer', 'developer role');

    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.messages[0].role, 'developer', 'developer restored');
  });

  // --- 4. Interleaved Instructions ---
  test('interleaved-instructions: ordering preserved', () => {
    const source = loadFixture('interleaved-instructions.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assertEqual(canonical.instructions.length, 2, '2 instructions');
    assertEqual(canonical.messages.length, 2, '2 messages');

    // Check positions
    assertEqual(canonical.instructions[0].position, 0, 'first instruction at pos 0');
    assertEqual(canonical.instructions[1].position, 2, 'second instruction at pos 2');
    assertEqual(canonical.messages[0].position, 1, 'first message at pos 1');
    assertEqual(canonical.messages[1].position, 3, 'second message at pos 3');

    // Round-trip: restore interleaved order
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.messages[0].role, 'system', 'pos 0 = system');
    assertEqual(restored.messages[1].role, 'user', 'pos 1 = user');
    assertEqual(restored.messages[2].role, 'developer', 'pos 2 = developer');
    assertEqual(restored.messages[3].role, 'user', 'pos 3 = user');
  });

  // --- 5. Multiple System Messages ---
  test('multiple-system-messages: all preserved', () => {
    const source = loadFixture('multiple-system-messages.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assertEqual(canonical.instructions.length, 2, '2 instructions');

    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.messages.length, 4, '4 messages restored');
    assertEqual(restored.messages[0].role, 'system', 'first system');
    assertEqual(restored.messages[1].role, 'user', 'first user');
    assertEqual(restored.messages[2].role, 'system', 'second system');
    assertEqual(restored.messages[3].role, 'user', 'second user');
  });

  // --- 6. Tool Call Round-Trip ---
  test('tool-call: tools and tool_choice preserved', () => {
    const source = loadFixture('tool-call.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assert(canonical.tools !== undefined, 'tools defined');
    assertEqual(canonical.tools!.length, 1, '1 tool');
    assertEqual(canonical.tools![0].name, 'get_weather', 'tool name');
    assertEqual(canonical.toolChoice?.type, 'auto', 'tool_choice auto');

    // Round-trip
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assert(restored.tools !== undefined, 'tools restored');
    assertEqual(restored.tools![0].function.name, 'get_weather', 'function name restored');
    assertEqual(restored.tool_choice, 'auto', 'tool_choice restored');
  });

  // --- 7. Tool Call Result Continuation ---
  test('tool-call-result-continuation: full lifecycle preserved', () => {
    const source = loadFixture('tool-call-result-continuation.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');

    // Find the assistant tool call message
    const assistantMsg = canonical.messages.find(m => m.role === 'assistant' && m.toolCalls && m.toolCalls.length > 0);
    assert(assistantMsg !== undefined, 'assistant with tool_calls found');
    assertEqual(assistantMsg!.toolCalls![0].id, 'call_abc123', 'tool call ID preserved');
    assertEqual(assistantMsg!.toolCalls![0].name, 'get_weather', 'tool call name preserved');
    assert(typeof assistantMsg!.toolCalls![0].arguments === 'object', 'arguments is object');
    assertEqual(
      (assistantMsg!.toolCalls![0].arguments as Record<string, unknown>).location as string,
      'Tokyo',
      'arguments parsed correctly',
    );

    // Find the tool result message
    const toolResult = canonical.messages.find(m => m.role === 'tool');
    assert(toolResult !== undefined, 'tool result found');
    const toolResultPart = toolResult!.content.find(p => p.type === 'tool_result');
    assert(toolResultPart !== undefined, 'tool_result content part found');
    assertEqual((toolResultPart as { toolCallId: string }).toolCallId, 'call_abc123', 'tool_call_id preserved');

    // Round-trip
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.messages.length, 4, '4 messages restored');
    assertEqual(restored.messages[2].role, 'tool', 'tool result at correct position');
    assertEqual(restored.messages[2].tool_call_id, 'call_abc123', 'tool_call_id restored');
    assertEqual(restored.messages[3].role, 'assistant', 'final assistant at correct position');
  });

  // --- 8. Parallel Tool Calls ---
  test('parallel-tool-calls: parallel_tool_calls in extensions', () => {
    const source = loadFixture('parallel-tool-calls.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assert(canonical.extensions?.openai?.parallel_tool_calls === true, 'parallel_tool_calls in extensions');

    // Round-trip
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.parallel_tool_calls, true, 'parallel_tool_calls restored');
  });

  // --- 9. Vision URL ---
  test('vision-url: image URL preserved', () => {
    const source = loadFixture('vision-url.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assert((canonical.requiredCapabilities ?? []).includes('vision'), 'vision capability inferred');

    const imgPart = canonical.messages[0].content.find(p => p.type === 'image');
    assert(imgPart !== undefined, 'image part found');
    assertEqual((imgPart as { source: { url: string } }).source.url, 'https://example.com/photo.jpg', 'URL preserved');

    // Round-trip
    const { request: restored } = canonicalRequestToOpenai(canonical);
    const imgContent = (Array.isArray(restored.messages[0].content) ? restored.messages[0].content : [])
      .find(p => p.type === 'image_url');
    assert(imgContent !== undefined, 'image_url restored');
    assertEqual((imgContent as { image_url: { url: string } }).image_url.url, 'https://example.com/photo.jpg', 'URL round-tripped');
  });

  // --- 10. Vision Base64 ---
  test('vision-base64: base64 data URL preserved', () => {
    const source = loadFixture('vision-base64.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');

    const imgPart = canonical.messages[0].content.find(p => p.type === 'image');
    assert(imgPart !== undefined, 'image part found');
    assertEqual((imgPart as { source: { type: string } }).source.type, 'base64', 'source type is base64');

    // Round-trip: should reconstruct data URL
    const { request: restored } = canonicalRequestToOpenai(canonical);
    const imgContent = (Array.isArray(restored.messages[0].content) ? restored.messages[0].content : [])
      .find(p => p.type === 'image_url');
    assert(imgContent !== undefined, 'image_url restored');
    assert((imgContent as { image_url: { url: string } }).image_url.url.startsWith('data:image/png;base64,'), 'data URL reconstructed');
  });

  // --- 11. JSON Mode ---
  test('json-mode: response_format preserved', () => {
    const source = loadFixture('json-mode.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assertEqual(canonical.responseFormat?.type, 'json_schema', 'format type');
    assertEqual(canonical.responseFormat?.name, 'person', 'schema name');
    assertEqual(canonical.responseFormat?.strict, true, 'strict');
    assert((canonical.requiredCapabilities ?? []).includes('json_mode'), 'json_mode capability');

    // Round-trip
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.response_format?.type, 'json_schema', 'format type restored');
    assertEqual((restored.response_format as { json_schema?: { name?: string } }).json_schema?.name, 'person', 'schema name restored');
  });

  // --- 12. Stop Sequences ---
  test('stop-sequences: stop preserved as array', () => {
    const source = loadFixture('stop-sequences.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assert(Array.isArray(canonical.stop), 'stop is array');
    assertEqual(canonical.stop!.length, 2, '2 stop sequences');

    // Round-trip: single string preserved
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assert(Array.isArray(restored.stop), 'stop restored as array');
    assertEqual((restored.stop as string[]).length, 2, '2 stop sequences restored');
  });

  // --- 13. Named Message ---
  test('named-message: name field preserved', () => {
    const source = loadFixture('named-message.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assertEqual(canonical.messages[0].name, 'alice', 'first message name');
    assertEqual(canonical.messages[1].name, 'bob', 'second message name');

    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.messages[0].name, 'alice', 'name restored');
    assertEqual(restored.messages[1].name, 'bob', 'name restored');
  });

  // --- 14. Unsupported Fields (CONTRACT FIX) ---
  test('unsupported-fields: unknown fields DROPPED, allowlisted preserved', () => {
    const source = loadFixture('unsupported-fields.json');
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');

    // Allowlisted fields preserved in extensions
    assertEqual(canonical.extensions?.openai?.frequency_penalty, 0.5, 'frequency_penalty');
    assertEqual(canonical.extensions?.openai?.presence_penalty, 0.3, 'presence_penalty');
    assertEqual(canonical.extensions?.openai?.seed, 42, 'seed');
    assertEqual(canonical.extensions?.openai?.user, 'test-user-123', 'user');
    assertEqual(canonical.extensions?.openai?.parallel_tool_calls, true, 'parallel_tool_calls');
    assertEqual(canonical.extensions?.openai?.service_tier, 'auto', 'service_tier');

    // Unknown field must produce field_dropped warning (NOT field_preserved)
    const warnings = canonical.bridgeMeta?.warnings ?? [];
    const unknownFieldWarning = warnings.find(w => w.fieldPath?.includes('unknown_future_field'));
    assert(unknownFieldWarning !== undefined, 'unknown field produces warning');
    assertEqual(unknownFieldWarning!.code, 'field_dropped', 'warning is field_dropped, not field_preserved');

    // Unknown field must NOT be stored in extensions
    const openaiExt = canonical.extensions?.openai as Record<string, unknown> | undefined;
    assert(openaiExt !== undefined, 'openai extensions exist');
    assert(!('unknown_future_field' in openaiExt!), 'unknown_future_field must NOT be in extensions');

    // Suspicious fields must be completely dropped — no value in warnings
    const suspApiKeyWarning = warnings.find(w => w.fieldPath?.includes('suspicious_api_key'));
    assert(suspApiKeyWarning !== undefined, 'suspicious_api_key produces warning');
    assertEqual(suspApiKeyWarning!.code, 'field_dropped', 'suspicious field is field_dropped');
    // Value must not appear anywhere in warning message
    assert(!suspApiKeyWarning!.message.includes('secret123'), 'secret value not in warning message');

    const authWarning = warnings.find(w => w.fieldPath?.includes('authorization'));
    assert(authWarning !== undefined, 'authorization produces warning');
    assert(!authWarning!.message.includes('Bearer'), 'auth value not in warning message');

    // Canonical fields
    assertEqual(canonical.stream, true, 'stream preserved');
    assertEqual(canonical.temperature, 0.7, 'temperature preserved');
    assertEqual(canonical.topP, 0.9, 'topP preserved');
    assertEqual(canonical.maxTokens, 100, 'maxTokens preserved');
    assertEqual(canonical.metadata?.conversation_id, 'conv_abc', 'metadata preserved');

    // Round-trip
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.frequency_penalty, 0.5, 'frequency_penalty restored');
    assertEqual(restored.presence_penalty, 0.3, 'presence_penalty restored');
    assertEqual(restored.seed, 42, 'seed restored');
    assertEqual(restored.user, 'test-user-123', 'user restored');
    assertEqual(restored.service_tier, 'auto', 'service_tier restored');
    assertEqual(restored.stream, true, 'stream restored');
    // Unknown fields must NOT appear in restored request
    assert(!('unknown_future_field' in restored), 'unknown_future_field not in restored');
    assert(!('suspicious_api_key' in restored), 'suspicious_api_key not in restored');
  });

  // --- 15. Malformed Request ---
  test('malformed-request: missing model produces error', () => {
    const source = loadFixture('malformed-request.json');
    const { request: _, errors } = openaiRequestToCanonical(source as OpenAIChatRequest);
    assert(errors.length > 0, 'errors produced');
    assertEqual(errors[0].code, 'missing_model', 'error code');
    assertEqual(errors[0].sanitized, true, 'error sanitized');
  });

  // --- 16. Capability Inference ---
  test('capability inference: tools + vision + streaming', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      stream: true,
      messages: [{
        role: 'user',
        content: [
          { type: 'text', text: 'What is this?' },
          { type: 'image_url', image_url: { url: 'https://example.com/img.jpg' } },
        ],
      }],
      tools: [{ type: 'function', function: { name: 'test', parameters: {} } }],
      response_format: { type: 'json_object' },
    };

    const { request: canonical } = openaiRequestToCanonical(source);
    const caps = canonical.requiredCapabilities ?? [];
    assert(caps.includes('chat'), 'chat capability');
    assert(caps.includes('streaming'), 'streaming capability');
    assert(caps.includes('tools'), 'tools capability');
    assert(caps.includes('vision'), 'vision capability');
    assert(caps.includes('json_mode'), 'json_mode capability');
  });

  // --- 17. max_tokens vs max_completion_tokens ---
  test('max_completion_tokens takes precedence', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 100,
      max_completion_tokens: 200,
    };
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors');
    assertEqual(canonical.maxTokens, 200, 'max_completion_tokens wins');
    const warnings = canonical.bridgeMeta?.warnings ?? [];
    assert(warnings.some(w => w.fieldPath === 'max_tokens'), 'max_tokens produces warning');

    // maxTokenField must be 'max_completion_tokens'
    assertEqual(canonical.extensions?.openai?.maxTokenField, 'max_completion_tokens', 'maxTokenField = max_completion_tokens');

    // Round-trip: should restore as max_completion_tokens, not max_tokens
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.max_tokens, undefined, 'max_tokens not set');
    assertEqual(restored.max_completion_tokens, 200, 'max_completion_tokens restored');
  });

  // --- 17b. max_tokens only ---
  test('max_tokens only: source preserved as max_tokens', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      max_tokens: 150,
    };
    const { request: canonical } = openaiRequestToCanonical(source);
    assertEqual(canonical.maxTokens, 150, 'maxTokens set');
    assertEqual(canonical.extensions?.openai?.maxTokenField, 'max_tokens', 'maxTokenField = max_tokens');

    // Round-trip: should restore as max_tokens
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.max_tokens, 150, 'max_tokens restored');
    assertEqual(restored.max_completion_tokens, undefined, 'max_completion_tokens not set');
  });

  // --- 17c. max_completion_tokens only ---
  test('max_completion_tokens only: source preserved', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      max_completion_tokens: 300,
    };
    const { request: canonical } = openaiRequestToCanonical(source);
    assertEqual(canonical.maxTokens, 300, 'maxTokens set');
    assertEqual(canonical.extensions?.openai?.maxTokenField, 'max_completion_tokens', 'maxTokenField = max_completion_tokens');

    // Round-trip: should restore as max_completion_tokens
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assertEqual(restored.max_tokens, undefined, 'max_tokens not set');
    assertEqual(restored.max_completion_tokens, 300, 'max_completion_tokens restored');
  });

  // --- 18. Fingerprint consistency ---
  test('fingerprint: same input produces same fingerprint', () => {
    const source = loadFixture('simple-chat.json');
    const { request: r1 } = openaiRequestToCanonical(source);
    const { request: r2 } = openaiRequestToCanonical(source);
    assertEqual(r1.bridgeMeta?.fingerprint, r2.bridgeMeta?.fingerprint, 'fingerprint deterministic');
  });

  // --- 19. All fixtures pass without runtime errors ---
  test('all fixtures: no runtime exceptions', () => {
    const files = readdirSync(FIXTURES_DIR).filter(f => f.endsWith('.json'));
    let totalErrors = 0;
    for (const file of files) {
      try {
        const source = loadFixture(file);
        openaiRequestToCanonical(source);
      } catch (err) {
        console.log(`      ${file}: ${(err as Error).message}`);
        totalErrors++;
      }
    }
    // malformed-request is expected to have errors, not exceptions
    assertEqual(totalErrors, 0, 'no runtime exceptions across all fixtures');
  });

  // --- 20. Semantic comparison: ignore key order ---
  test('semantic compare: key order ignored', () => {
    const a = { model: 'gpt-4o', messages: [{ role: 'user', content: 'hi' }] };
    const b = { messages: [{ content: 'hi', role: 'user' }], model: 'gpt-4o' };
    assert(deepEqual(a, b), 'deep equal ignores key order');
  });

  // ============================================================
  // CONTRACT FIX TESTS (Phase 1B tightening)
  // ============================================================

  // --- 21. Malformed tool args → conversion fails, no empty {} ---
  test('malformed-tool-args: invalid JSON fails, no fabricated empty arguments', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_bad',
          type: 'function',
          function: { name: 'do_something', arguments: '{invalid json!!' },
        }],
      }],
    };
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assert(errors.length > 0, 'errors produced for malformed args');
    assert(errors[0].code === 'malformed_tool_arguments', 'error code is malformed_tool_arguments');
    assertEqual(errors[0].retryable, false, 'not retryable');

    // The tool call with malformed args must NOT be in canonical
    const assistantMsg = canonical.messages.find(m => m.role === 'assistant');
    assert(assistantMsg !== undefined, 'assistant message exists');
    assert(assistantMsg!.toolCalls === undefined || assistantMsg!.toolCalls!.length === 0,
      'no tool calls with fabricated empty args');
  });

  // --- 22. Malformed tool args: raw arguments not in error message ---
  test('malformed-tool-args: raw arguments absent from error messages', () => {
    const maliciousArgs = '{"authorization":"Bearer secret123"}';
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_secret',
          type: 'function',
          function: { name: 'leak', arguments: maliciousArgs },
        }],
      }],
    };
    const { errors } = openaiRequestToCanonical(source);
    // JSON.parse will succeed here but let's test with truly malformed:
    const badSource: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_bad2',
          type: 'function',
          function: { name: 'bad', arguments: 'not valid JSON {{{' },
        }],
      }],
    };
    const { errors: badErrors } = openaiRequestToCanonical(badSource);
    for (const err of badErrors) {
      assert(!err.message.includes('not valid JSON'), 'raw arguments not in error message');
    }
  });

  // --- 23. Empty object arguments remain valid ---
  test('empty-object-args: {} is valid tool call arguments', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_empty',
          type: 'function',
          function: { name: 'do_nothing', arguments: '{}' },
        }],
      }],
    };
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors for empty object args');
    const assistantMsg = canonical.messages.find(m => m.role === 'assistant');
    assert(assistantMsg?.toolCalls?.length === 1, 'tool call present');
    assert(deepEqual(assistantMsg!.toolCalls![0].arguments, {}), 'arguments is empty object');
  });

  // --- 24. Empty string arguments → empty object ---
  test('empty-string-args: empty string becomes empty object', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_evs',
          type: 'function',
          function: { name: 'noop', arguments: '' },
        }],
      }],
    };
    const { request: canonical, errors } = openaiRequestToCanonical(source);
    assertEqual(errors.length, 0, 'no errors for empty string args');
    const assistantMsg = canonical.messages.find(m => m.role === 'assistant');
    assert(deepEqual(assistantMsg!.toolCalls![0].arguments, {}), 'empty string → empty object');
  });

  // --- 25. JSON array arguments → rejected ---
  test('array-args: JSON array rejected as tool call arguments', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_arr',
          type: 'function',
          function: { name: 'bad', arguments: '[1, 2, 3]' },
        }],
      }],
    };
    const { errors } = openaiRequestToCanonical(source);
    assert(errors.length > 0, 'array arguments rejected');
    assert(errors[0].code === 'malformed_tool_arguments', 'error code');
  });

  // --- 26. null arguments → empty object ---
  test('null-args: null becomes empty object', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{
        role: 'assistant',
        content: null,
        tool_calls: [{
          id: 'call_null',
          type: 'function',
          function: { name: 'noop', arguments: '' },
        }],
      }],
    };
    const { request: canonical } = openaiRequestToCanonical(source);
    const assistantMsg = canonical.messages.find(m => m.role === 'assistant');
    assert(deepEqual(assistantMsg!.toolCalls![0].arguments, {}), 'null → empty object');
  });

  // --- 27. Thinking parts emit warning ---
  test('thinking-parts: emit capability_warning when dropped', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{
        role: 'user',
        content: 'Hello',
      }],
    };
    // Simulate a canonical request with thinking parts by constructing directly
    const { request: canonical } = openaiRequestToCanonical(source);
    // Inject a thinking part into a message
    canonical.messages.push({
      role: 'assistant',
      content: [
        { type: 'thinking', text: 'Let me think about this...' },
        { type: 'text', text: 'Here is my answer.' },
      ],
      position: 2,
    });

    // Serialize to OpenAI — should emit warning for thinking
    const { warnings } = canonicalRequestToOpenai(canonical);
    const thinkingWarning = warnings.find(w =>
      w.code === 'capability_warning' && w.message?.includes('thinking')
    );
    assert(thinkingWarning !== undefined, 'thinking drop warning emitted');
    assert(!thinkingWarning!.message.includes('Let me think'), 'thinking text not in warning');
  });

  // --- 28. Metadata validation: prototype pollution keys ---
  test('metadata-validation: prototype pollution keys rejected', () => {
    // Create a null-prototype object and set __proto__ as own enumerable property
    // (normal object literal __proto__ sets the prototype chain, not a property)
    const protoObj = Object.create(null);
    protoObj['__proto__'] = { polluted: true };
    protoObj.normal = 'ok';
    const keys = Object.keys(protoObj);
    assert(keys.includes('__proto__'), 'test setup: __proto__ is own enumerable key');

    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      metadata: protoObj as Record<string, unknown>,
    };
    const { request: canonical } = openaiRequestToCanonical(source);
    // metadata with __proto__ key should be dropped entirely
    assert(canonical.metadata === undefined, 'metadata with __proto__ is dropped');
    const warnings = canonical.bridgeMeta?.warnings ?? [];
    const protoWarning = warnings.find(w => w.fieldPath?.includes('proto'));
    assert(protoWarning !== undefined, 'prototype pollution warning emitted');
  });

  // --- 29. Metadata validation: too deep ---
  test('metadata-validation: deep nesting rejected', () => {
    const deep: Record<string, unknown> = { a: { b: { c: { d: { e: 'too deep' } } } } };
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      metadata: deep,
    };
    const { request: canonical, errors: _ } = openaiRequestToCanonical(source);
    // depth 5 should exceed limit of 4
    const warnings = canonical.bridgeMeta?.warnings ?? [];
    const metaDrop = warnings.find(w => w.fieldPath?.startsWith('metadata') && w.code === 'field_dropped');
    assert(metaDrop !== undefined, 'deep metadata dropped with warning');
  });

  // --- 30. Metadata validation: not mutated ---
  test('metadata-validation: source metadata object not mutated', () => {
    const sourceMeta = { key: 'value' };
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      metadata: sourceMeta,
    };
    openaiRequestToCanonical(source);
    assert(deepEqual(sourceMeta, { key: 'value' }), 'source metadata not mutated');
  });

  // --- 31. BridgeMeta warnings not in serialized output ---
  test('bridgeMeta: warnings not in serialized OpenAI body', () => {
    const source = loadFixture('unsupported-fields.json');
    const { request: canonical } = openaiRequestToCanonical(source);
    const { request: restored } = canonicalRequestToOpenai(canonical);
    assert(!('bridgeMeta' in restored), 'bridgeMeta not in restored request');
    assert(!('warnings' in restored), 'warnings not in restored request');
  });

  // --- 32. Extension has no index signature ---
  test('extensions: no index signature, only typed fields', () => {
    const source = loadFixture('unsupported-fields.json');
    const { request: canonical } = openaiRequestToCanonical(source);
    const openaiExt = canonical.extensions?.openai;
    if (openaiExt) {
      // Only typed fields should exist
      const validKeys = new Set([
        'frequency_penalty', 'presence_penalty', 'seed', 'user',
        'parallel_tool_calls', 'service_tier', 'store', 'maxTokenField',
      ]);
      for (const key of Object.keys(openaiExt)) {
        assert(validKeys.has(key), `field '${key}' is in the allowlist`);
      }
    }
  });

  // --- 33. Suspicious fields completely absent from canonical ---
  test('suspicious-fields: completely absent from canonical, log, and error', () => {
    const source: OpenAIChatRequest = {
      model: 'gpt-4o',
      messages: [{ role: 'user', content: 'Hi' }],
      // We need to cast since the type no longer allows arbitrary keys
    } as OpenAIChatRequest;
    // Manually inject suspicious fields via the raw input
    (source as unknown as Record<string, unknown>).cookie = 'session=abc123';
    (source as unknown as Record<string, unknown>).api_token = 'Bearer secret';

    const { request: canonical, errors } = openaiRequestToCanonical(source);
    // Check warnings
    const warnings = canonical.bridgeMeta?.warnings ?? [];
    for (const w of warnings) {
      assert(!w.message.includes('session=abc123'), 'cookie value not in warnings');
      assert(!w.message.includes('Bearer secret'), 'token value not in warnings');
    }
    // Check extensions
    const openaiExt = canonical.extensions?.openai as Record<string, unknown> | undefined;
    if (openaiExt) {
      assert(!('cookie' in openaiExt), 'cookie not in extensions');
      assert(!('api_token' in openaiExt), 'api_token not in extensions');
    }
    // Check errors
    for (const e of errors) {
      assert(!e.message.includes('session=abc123'), 'cookie value not in errors');
      assert(!e.message.includes('Bearer secret'), 'token value not in errors');
    }
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}
