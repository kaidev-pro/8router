// 8Router — Anthropic Bridge Round-Trip Tests
// Phase 1C: Validate Anthropic ↔ Canonical conversion

import { readFileSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  anthropicRequestToCanonical,
  canonicalRequestToAnthropic,
  anthropicToolsToCanonical,
  canonicalToolsToAnthropic,
  anthropicToolChoiceToCanonical,
  canonicalToolChoiceToAnthropic,
  anthropicUsageToCanonical,
  canonicalUsageToAnthropic,
  anthropicContentToCanonical,
  anthropicBlockToCanonical,
  canonicalContentToAnthropic,
} from '../bridge/anthropic/index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const FIXTURES = resolve(__dirname, '../../tests/fixtures/bridge/anthropic');

function loadFixture(name: string) {
  const raw = readFileSync(resolve(FIXTURES, name), 'utf-8');
  return JSON.parse(raw);
}

let passed = 0;
let failed = 0;
const failures: string[] = [];

function assert(condition: boolean, msg: string) {
  if (condition) {
    passed++;
  } else {
    failed++;
    failures.push(msg);
    console.error(`  FAIL: ${msg}`);
  }
}

function assertDeepEqual(a: unknown, b: unknown, path: string) {
  const eq = JSON.stringify(a) === JSON.stringify(b);
  assert(eq, `${path}: expected ${JSON.stringify(b)}, got ${JSON.stringify(a)}`);
}

// ─── Fixture: simple-text.json ───────────────────────────────────────

console.log('\n== Anthropic Bridge: simple-text.json ==');
{
  const input = loadFixture('simple-text.json');
  const { request: canonical, errors } = anthropicRequestToCanonical(input);
  assert(errors.length === 0, 'No errors from simple-text conversion');
  assert(canonical.model === 'claude-sonnet-4-20250514', 'model preserved');
  assert(canonical.instructions.length === 1, '1 system instruction');
  assert(canonical.instructions[0].role === 'system', 'instruction role=system');
  assertDeepEqual(
    canonical.instructions[0].content[0],
    { type: 'text', text: 'You are a helpful assistant.' },
    'system instruction content'
  );
  assert(canonical.messages.length === 1, '1 message');
  assert(canonical.messages[0].role === 'user', 'message role=user');
  assert(canonical.maxTokens === 1024, 'maxTokens preserved');
  assert(canonical.temperature === 0.7, 'temperature preserved');

  // Round-trip: canonical → anthropic
  const { request: restored, warnings } = canonicalRequestToAnthropic(canonical);
  assert(restored.model === 'claude-sonnet-4-20250514', 'round-trip model');
  assert(restored.max_tokens === 1024, 'round-trip max_tokens');
  assert(restored.temperature === 0.7, 'round-trip temperature');
  assert(typeof restored.system === 'string', 'system is string for single instruction');
  assertDeepEqual(
    restored.system,
    'You are a helpful assistant.',
    'round-trip system content'
  );
  assert(restored.messages.length === 1, 'round-trip 1 message');
  assert(restored.messages[0].role === 'user', 'round-trip message role');
  assertDeepEqual(
    restored.messages[0].content,
    'Hello, Claude!',
    'round-trip message content'
  );
}

// ─── Fixture: tools.json ─────────────────────────────────────────────

console.log('\n== Anthropic Bridge: tools.json ==');
{
  const input = loadFixture('tools.json');
  const { request: canonical, errors } = anthropicRequestToCanonical(input);
  assert(errors.length === 0, 'No errors from tools conversion');
  assert(canonical.tools?.length === 1, '1 tool');
  assert(canonical.tools?.[0].name === 'get_weather', 'tool name');
  assertDeepEqual(
    canonical.tools?.[0].inputSchema,
    input.tools[0].input_schema,
    'tool input_schema round-trip'
  );
  assert(canonical.toolChoice?.type === 'auto', 'tool_choice auto');

  // Round-trip
  const { request: restored } = canonicalRequestToAnthropic(canonical);
  assert(restored.tools?.length === 1, 'round-trip 1 tool');
  assert(restored.tools?.[0].name === 'get_weather', 'round-trip tool name');
  assertDeepEqual(
    restored.tools?.[0].input_schema,
    input.tools[0].input_schema,
    'round-trip tool input_schema'
  );
  assert(restored.tool_choice?.type === 'auto', 'round-trip tool_choice auto');
}

// ─── Fixture: tool-results.json ──────────────────────────────────────

console.log('\n== Anthropic Bridge: tool-results.json ==');
{
  const input = loadFixture('tool-results.json');
  const { request: canonical, errors } = anthropicRequestToCanonical(input);
  assert(errors.length === 0, 'No errors from tool-results conversion');
  assert(canonical.messages.length === 4, '4 messages (user, assistant+tool_use, tool, assistant)');

  // Find the tool role message
  const toolMsg = canonical.messages.find(m => m.role === 'tool');
  assert(toolMsg !== undefined, 'tool role message exists');
  assert(toolMsg?.content[0].type === 'tool_result', 'tool message content is tool_result');
  if (toolMsg?.content[0].type === 'tool_result') {
    assert(toolMsg.content[0].toolCallId === 'toolu_abc123', 'toolCallId matches');
    assert(toolMsg.content[0].content === '{"temp": 22, "condition": "sunny"}', 'tool result content');
  }

  // Find the assistant message with tool_use
  const assistantMsg = canonical.messages[1]; // Second message (index 1)
  assert(assistantMsg.role === 'assistant', 'assistant message exists');
  assert(assistantMsg.toolCalls?.length === 1, 'assistant has toolCalls');
  assert(assistantMsg.toolCalls?.[0].id === 'toolu_abc123', 'toolCall id');
  assert(assistantMsg.toolCalls?.[0].name === 'get_weather', 'toolCall name');
  assertDeepEqual(assistantMsg.toolCalls?.[0].arguments, { city: 'Tokyo' }, 'toolCall arguments');

  // Round-trip
  const { request: restored } = canonicalRequestToAnthropic(canonical);
  assert(restored.messages.length === 4, 'round-trip 4 messages');

  // Find assistant message with tool_use
  const restoredAssistant = restored.messages.find(m => m.role === 'assistant' && typeof m.content === 'object');
  assert(restoredAssistant !== undefined, 'round-trip assistant with tool_use exists');
  if (typeof restoredAssistant?.content === 'object') {
    const toolBlock = restoredAssistant.content.find(b => b.type === 'tool_use');
    assert(toolBlock !== undefined, 'round-trip tool_use block exists');
    if (toolBlock?.type === 'tool_use') {
      assert(toolBlock.id === 'toolu_abc123', 'round-trip tool_use id');
      assert(toolBlock.name === 'get_weather', 'round-trip tool_use name');
    }
  }

  // Find user message with tool_result
  const restoredToolResult = restored.messages.find(m =>
    m.role === 'user' && typeof m.content === 'object' && m.content.some(b => b.type === 'tool_result')
  );
  assert(restoredToolResult !== undefined, 'round-trip tool_result message exists');
  if (typeof restoredToolResult?.content === 'object') {
    const trBlock = restoredToolResult.content.find(b => b.type === 'tool_result');
    assert(trBlock !== undefined, 'round-trip tool_result block exists');
    if (trBlock?.type === 'tool_result') {
      assert(trBlock.tool_use_id === 'toolu_abc123', 'round-trip tool_result tool_use_id');
    }
  }
}

// ─── Fixture: cache-control.json ─────────────────────────────────────

console.log('\n== Anthropic Bridge: cache-control.json ==');
{
  const input = loadFixture('cache-control.json');
  const { request: canonical, errors } = anthropicRequestToCanonical(input);
  assert(errors.length === 0, 'No errors from cache-control conversion');
  assert(canonical.instructions.length === 2, '2 system instructions');
  assert(canonical.instructions[0].cacheControl === 'ephemeral', 'first instruction has cache_control');
  assert(canonical.instructions[1].cacheControl === undefined, 'second instruction no cache_control');

  // Round-trip
  const { request: restored } = canonicalRequestToAnthropic(canonical);
  assert(Array.isArray(restored.system), 'system is array for cache control');
  if (Array.isArray(restored.system)) {
    assert(restored.system.length === 2, 'round-trip 2 system blocks');
    assert(restored.system[0].cache_control?.type === 'ephemeral', 'round-trip cache_control');
    assert(restored.system[1].cache_control === null || restored.system[1].cache_control === undefined, 'round-trip no cache_control on second');
  }
}

// ─── Fixture: extended-thinking.json ─────────────────────────────────

console.log('\n== Anthropic Bridge: extended-thinking.json ==');
{
  const input = loadFixture('extended-thinking.json');
  const { request: canonical, errors } = anthropicRequestToCanonical(input);
  assert(errors.length === 0, 'No errors from extended-thinking conversion');
  assert(canonical.instructions.length === 0, '0 system instructions (none in fixture)');
  assert(canonical.messages.length === 1, '1 message');
}

// ─── Fixture: extensions.json ────────────────────────────────────────

console.log('\n== Anthropic Bridge: extensions.json ==');
{
  const input = loadFixture('extensions.json');
  const { request: canonical, errors } = anthropicRequestToCanonical(input);
  assert(errors.length === 0, 'No errors from extensions conversion');
  assert(canonical.extensions?.anthropic?.top_k === 5, 'top_k preserved in extensions');
  assertDeepEqual(
    canonical.extensions?.anthropic?.metadata,
    { user_id: 'user-12345' },
    'metadata preserved in extensions'
  );
  assert(canonical.stop?.length === 1, 'stop_sequences preserved');
  assertDeepEqual(canonical.stop, ['END'], 'stop_sequences content');
  assert(canonical.stream === false, 'stream preserved');

  // Round-trip
  const { request: restored } = canonicalRequestToAnthropic(canonical);
  assert(restored.top_k === 5, 'round-trip top_k');
  assertDeepEqual(restored.metadata, { user_id: 'user-12345' }, 'round-trip metadata');
  assertDeepEqual(restored.stop_sequences, ['END'], 'round-trip stop_sequences');
  assert(restored.stream === false, 'round-trip stream');
}

// ─── Tool conversion unit tests ──────────────────────────────────────

console.log('\n== Anthropic Bridge: Tool conversion unit ==');
{
  const anthropicTools = [
    {
      name: 'search',
      description: 'Search the web',
      input_schema: {
        type: 'object',
        properties: { query: { type: 'string' } },
        required: ['query'],
      },
    },
  ];
  const canonicalTools = anthropicToolsToCanonical(anthropicTools);
  assert(canonicalTools.length === 1, 'tool converted');
  assert(canonicalTools[0].name === 'search', 'tool name');
  assertDeepEqual(canonicalTools[0].inputSchema, anthropicTools[0].input_schema, 'input_schema renamed');

  // Round-trip
  const restoredTools = canonicalToolsToAnthropic(canonicalTools);
  assert(restoredTools.length === 1, 'tool restored');
  assert(restoredTools[0].name === 'search', 'restored tool name');
  assertDeepEqual(restoredTools[0].input_schema, anthropicTools[0].input_schema, 'input_schema restored');
}

// ─── Tool choice conversion ──────────────────────────────────────────

console.log('\n== Anthropic Bridge: Tool choice conversion ==');
{
  const auto = anthropicToolChoiceToCanonical({ type: 'auto' });
  assertDeepEqual(auto, { type: 'auto' }, 'auto → auto');

  const any = anthropicToolChoiceToCanonical({ type: 'any' });
  assertDeepEqual(any, { type: 'required' }, 'any → required');

  const named = anthropicToolChoiceToCanonical({ type: 'tool', name: 'search' });
  assertDeepEqual(named, { type: 'tool', name: 'search' }, 'named → named');

  const undefinedResult = anthropicToolChoiceToCanonical(undefined);
  assert(undefinedResult === undefined, 'undefined → undefined');

  // Reverse
  const autoRev = canonicalToolChoiceToAnthropic({ type: 'auto' });
  assertDeepEqual(autoRev, { type: 'auto' }, 'auto ← auto');

  const requiredRev = canonicalToolChoiceToAnthropic({ type: 'required' });
  assertDeepEqual(requiredRev, { type: 'any' }, 'required ← any');

  const noneRev = canonicalToolChoiceToAnthropic({ type: 'none' });
  assert(noneRev === undefined, 'none → undefined (Anthropic has no none)');
}

// ─── Usage conversion ────────────────────────────────────────────────

console.log('\n== Anthropic Bridge: Usage conversion ==');
{
  const anthropicUsage = {
    input_tokens: 100,
    output_tokens: 50,
    cache_creation_input_tokens: 20,
    cache_read_input_tokens: 30,
  };
  const canonical = anthropicUsageToCanonical(anthropicUsage);
  assert(canonical.inputTokens === 100, 'inputTokens');
  assert(canonical.outputTokens === 50, 'outputTokens');
  assert(canonical.totalTokens === 150, 'totalTokens');
  assert(canonical.cacheCreationTokens === 20, 'cacheCreationTokens');
  assert(canonical.cachedInputTokens === 30, 'cachedInputTokens');

  // Round-trip
  const restored = canonicalUsageToAnthropic(canonical);
  assert(restored.input_tokens === 100, 'restored input_tokens');
  assert(restored.output_tokens === 50, 'restored output_tokens');
  assert(restored.cache_creation_input_tokens === 20, 'restored cache_creation_input_tokens');
  assert(restored.cache_read_input_tokens === 30, 'restored cache_read_input_tokens');
}

// ─── Content conversion edge cases ───────────────────────────────────

console.log('\n== Anthropic Bridge: Content conversion edge cases ==');
{
  // String content
  const parts = anthropicContentToCanonical('Hello');
  assert(parts.length === 1, 'string → 1 part');
  assert(parts[0].type === 'text', 'string → text part');
  assert(parts[0].type === 'text' && parts[0].text === 'Hello', 'string content preserved');

  // Block array content
  const blocks = [
    { type: 'text' as const, text: 'Hi' },
    { type: 'tool_use' as const, id: 'tu_1', name: 'fn', input: { x: 1 } },
  ];
  const parts2 = anthropicContentToCanonical(blocks);
  assert(parts2.length === 2, '2 blocks → 2 parts');
  assert(parts2[0].type === 'text', 'first is text');
  assert(parts2[1].type === 'tool_use', 'second is tool_use');

  // Single text → string in reverse
  const singleText = [{ type: 'text' as const, text: 'Hello' }];
  const serialized = canonicalContentToAnthropic(singleText);
  assert(typeof serialized === 'string', 'single text → string');
  assert(serialized === 'Hello', 'single text content');

  // Multi-part → array in reverse
  const multiPart = [
    { type: 'text' as const, text: 'Hi' },
    { type: 'tool_result' as const, toolCallId: 'tu_1', content: 'ok' },
  ];
  const serialized2 = canonicalContentToAnthropic(multiPart);
  assert(Array.isArray(serialized2), 'multi-part → array');
  assert(serialized2?.length === 2, 'multi-part has 2 elements');
}

// ─── Error cases ─────────────────────────────────────────────────────

console.log('\n== Anthropic Bridge: Error cases ==');
{
  // Missing model
  const { request: req1, errors: err1 } = anthropicRequestToCanonical({
    max_tokens: 100,
    messages: [{ role: 'user', content: 'hi' }],
  } as any);
  assert(err1.length > 0, 'missing model → error');
  assert(err1[0].code === 'missing_model', 'error code is missing_model');

  // Missing messages
  const { request: req2, errors: err2 } = anthropicRequestToCanonical({
    model: 'test',
    max_tokens: 100,
  } as any);
  assert(err2.length > 0, 'missing messages → error');
  assert(err2[0].code === 'missing_messages', 'error code is missing_messages');

  // Missing max_tokens
  const { request: req3, errors: err3 } = anthropicRequestToCanonical({
    model: 'test',
    messages: [{ role: 'user', content: 'hi' }],
  } as any);
  assert(err3.length > 0, 'missing max_tokens → error');
  assert(err3[0].code === 'missing_max_tokens', 'error code is missing_max_tokens');
}

// ─── Round-trip instruction ordering ─────────────────────────────────

console.log('\n== Anthropic Bridge: Instruction ordering round-trip ==');
{
  const input = {
    model: 'claude-sonnet-4-20250514',
    max_tokens: 512,
    system: [
      { type: 'text' as const, text: 'Base instructions', cache_control: { type: 'ephemeral' as const } },
      { type: 'text' as const, text: 'Additional context' },
    ],
    messages: [{ role: 'user' as const, content: 'Test' }],
  } as import('../bridge/anthropic/types.js').AnthropicRequest;
  const { request: canonical } = anthropicRequestToCanonical(input);
  assert(canonical.instructions.length === 2, '2 instructions from array');
  assert(canonical.instructions[0].position === 0, 'first position=0');
  assert(canonical.instructions[1].position === 1, 'second position=1');
  assert(canonical.instructions[0].cacheControl === 'ephemeral', 'cache_control on first');

  // Round-trip
  const { request: restored } = canonicalRequestToAnthropic(canonical);
  assert(Array.isArray(restored.system), 'system restored as array');
  if (Array.isArray(restored.system)) {
    assert(restored.system.length === 2, '2 system blocks restored');
    assert(restored.system[0].cache_control?.type === 'ephemeral', 'cache_control restored');
  }
}

// ─── Summary ─────────────────────────────────────────────────────────

console.log(`\n========================================`);
console.log(`Anthropic Bridge Tests: ${passed} passed, ${failed} failed`);
console.log(`========================================`);

if (failures.length > 0) {
  console.log('\nFailures:');
  failures.forEach((f, i) => console.log(`  ${i + 1}. ${f}`));
  process.exit(1);
}

// Exported for runner
export function runAnthropicBridgeTests() {
  console.log(`Anthropic Bridge: ${passed} passed, ${failed} failed`);
}
