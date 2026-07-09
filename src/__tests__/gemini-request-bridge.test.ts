// 8Router — Gemini Request ↔ Canonical Bridge Tests (Phase 1E)
// Tests semantic parity for Gemini ↔ Canonical conversion.
// No runtime production path is modified by these tests.

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import type { GeminiRequest } from '../bridge/gemini/types.js';
import { geminiRequestToCanonical } from '../bridge/gemini/request-to-canonical.js';
import { canonicalRequestToGemini } from '../bridge/gemini/canonical-to-request.js';

const FIXTURES_DIR = join(process.cwd(), 'tests', 'fixtures', 'bridge', 'gemini');

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

export function runGeminiBridgeTests(): void {
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

  // ─── Gemini → Canonical ─────────────────────────────────────────

  console.log('\n  Gemini → Canonical:');

  test('simple text request → CanonicalRequest', () => {
    const raw = loadFixture<GeminiRequest>('simple-text.json');
    const { request } = geminiRequestToCanonical(raw);

    assertEqual(request.model, 'gemini', 'model placeholder');
    assertEqual(request.instructions.length, 0, 'no system instruction');
    assertEqual(request.messages.length, 1, '1 message');
    assertEqual(request.messages[0].role, 'user', 'role');
    assertEqual(request.messages[0].content[0].type, 'text', 'content type');
    assertEqual((request.messages[0].content[0] as import('../bridge/canonical/content.js').CanonicalTextPart).text, 'Hello, what is 2+2?', 'text');
    assertEqual(request.temperature, 0.7, 'temperature');
    assertEqual(request.maxTokens, 100, 'maxTokens');
    assertEqual(request.bridgeMeta?.sourceFormat, 'gemini', 'sourceFormat');
  });

  test('multi-turn conversation', () => {
    const raw = loadFixture<GeminiRequest>('multi-turn.json');
    const { request } = geminiRequestToCanonical(raw);

    assertEqual(request.messages.length, 5, '5 messages');
    assertEqual(request.messages[0].role, 'user', 'msg 0 user');
    assertEqual(request.messages[1].role, 'assistant', 'msg 1 assistant (model→assistant)');
    assertEqual(request.messages[2].role, 'user', 'msg 2 user');
    assertEqual(request.messages[3].role, 'assistant', 'msg 3 assistant');
    assertEqual(request.messages[4].role, 'user', 'msg 4 user');
  });

  test('system instruction → CanonicalInstruction', () => {
    const raw = loadFixture<GeminiRequest>('system-instruction.json');
    const { request } = geminiRequestToCanonical(raw);

    assertEqual(request.instructions.length, 1, '1 instruction');
    assertEqual(request.instructions[0].role, 'system', 'instruction role');
    assert(request.instructions[0].content.length === 2, '2 text parts in instruction');
  });

  test('tools/functionDeclarations → CanonicalTool[]', () => {
    const raw = loadFixture<GeminiRequest>('tools.json');
    const { request } = geminiRequestToCanonical(raw);

    assert(request.tools !== undefined, 'has tools');
    assertEqual(request.tools!.length, 2, '2 tools');
    assertEqual(request.tools![0].name, 'get_weather', 'tool 1 name');
    assertEqual(request.tools![1].name, 'get_time', 'tool 2 name');
    assert(request.tools![0].inputSchema !== undefined, 'tool has parameters');
  });

  test('toolConfig → CanonicalToolChoice', () => {
    const raw = loadFixture<GeminiRequest>('tools.json');
    const { request } = geminiRequestToCanonical(raw);

    assert(request.toolChoice !== undefined, 'has toolChoice');
    assertEqual(request.toolChoice!.type, 'auto', 'auto mode');
  });

  test('functionCall parts → tool_use + toolCalls', () => {
    const raw = loadFixture<GeminiRequest>('function-call.json');
    const { request } = geminiRequestToCanonical(raw);

    // Model message (index 1) should have tool calls
    const modelMsg = request.messages.find(m => m.role === 'assistant');
    assert(modelMsg !== undefined, 'has assistant message');
    assert(modelMsg!.content.some(p => p.type === 'tool_use'), 'has tool_use content');
    assert(modelMsg!.toolCalls !== undefined && modelMsg!.toolCalls.length > 0, 'has toolCalls');
    assertEqual(modelMsg!.toolCalls![0].name, 'get_weather', 'tool call name');
    assertEqual(modelMsg!.toolCalls![0].arguments.location, 'Tokyo', 'tool call arg');
  });

  test('functionResponse → role:tool message', () => {
    const raw = loadFixture<GeminiRequest>('function-call.json');
    const { request } = geminiRequestToCanonical(raw);

    const toolMsg = request.messages.find(m => m.role === 'tool');
    assert(toolMsg !== undefined, 'has tool result message');
    assert(toolMsg!.content[0].type === 'tool_result', 'content is tool_result');
  });

  test('inlineData image → CanonicalImagePart', () => {
    const raw = loadFixture<GeminiRequest>('vision.json');
    const { request } = geminiRequestToCanonical(raw);

    const msg = request.messages[0];
    const imagePart = msg.content.find(p => p.type === 'image');
    assert(imagePart !== undefined, 'has image content');
  });

  test('safetySettings → extensions.gemini.safetySettings', () => {
    const raw = loadFixture<GeminiRequest>('full-config.json');
    const { request } = geminiRequestToCanonical(raw);

    assert(request.extensions?.gemini?.safetySettings !== undefined, 'safetySettings in extensions');
    assertEqual(request.extensions!.gemini!.safetySettings![0].category, 'HARM_CATEGORY_HARASSMENT', 'category');
    assertEqual(request.extensions!.gemini!.safetySettings![0].threshold, 'BLOCK_NONE', 'threshold');
  });

  test('generationConfig with responseMimeType → responseFormat', () => {
    const raw = loadFixture<GeminiRequest>('full-config.json');
    const { request } = geminiRequestToCanonical(raw);

    assert(request.responseFormat !== undefined, 'has responseFormat');
    // Fixture has both responseMimeType and responseSchema → json_schema
    assertEqual(request.responseFormat!.type, 'json_schema', 'json_schema');
    assert(request.responseFormat!.schema !== undefined, 'has schema');
  });

  test('topK → extensions.gemini.topK', () => {
    const raw = loadFixture<GeminiRequest>('full-config.json');
    const { request } = geminiRequestToCanonical(raw);

    assertEqual(request.extensions?.gemini?.topK, 40, 'topK');
  });

  test('empty contents → error', () => {
    const raw: GeminiRequest = { contents: [] };
    const { request, errors } = geminiRequestToCanonical(raw);

    assert(errors.length > 0, 'has error');
    assertEqual(errors[0].code, 'missing_contents', 'missing_contents error');
  });

  // ─── Canonical → Gemini ─────────────────────────────────────────

  console.log('\n  Canonical → Gemini (round-trip):');

  test('simple text round-trip', () => {
    const raw = loadFixture<GeminiRequest>('simple-text.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assertEqual(gemini.contents.length, 1, '1 content');
    assertEqual(gemini.contents[0].role, 'user', 'user role');
    assertEqual((gemini.contents[0].parts[0] as import('../bridge/gemini/types.js').GeminiTextPart).text, 'Hello, what is 2+2?', 'text');
    assertEqual(gemini.generationConfig?.temperature, 0.7, 'temperature');
    assertEqual(gemini.generationConfig?.maxOutputTokens, 100, 'maxOutputTokens');
  });

  test('multi-turn round-trip preserves ordering', () => {
    const raw = loadFixture<GeminiRequest>('multi-turn.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assertEqual(gemini.contents.length, 5, '5 contents');
    assertEqual(gemini.contents[0].role, 'user', 'msg 0');
    assertEqual(gemini.contents[1].role, 'model', 'msg 1');
    assertEqual(gemini.contents[2].role, 'user', 'msg 2');
    assertEqual(gemini.contents[3].role, 'model', 'msg 3');
    assertEqual(gemini.contents[4].role, 'user', 'msg 4');
  });

  test('system instruction round-trip', () => {
    const raw = loadFixture<GeminiRequest>('system-instruction.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assert(gemini.systemInstruction !== undefined, 'has systemInstruction');
    assertEqual(gemini.systemInstruction!.parts.length, 2, '2 text parts');
    assert(gemini.systemInstruction!.parts[0].text.includes('physics professor'), 'first part');
  });

  test('tools round-trip', () => {
    const raw = loadFixture<GeminiRequest>('tools.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assert(gemini.tools !== undefined && gemini.tools.length === 1, 'has tools');
    assertEqual(gemini.tools![0].functionDeclarations!.length, 2, '2 function declarations');
    assertEqual(gemini.tools![0].functionDeclarations![0].name, 'get_weather', 'function name');
  });

  test('toolConfig round-trip', () => {
    const raw = loadFixture<GeminiRequest>('tools.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assert(gemini.toolConfig?.functionCallingConfig !== undefined, 'has toolConfig');
    assertEqual(gemini.toolConfig!.functionCallingConfig!.mode, 'AUTO', 'mode AUTO');
  });

  test('function call round-trip', () => {
    const raw = loadFixture<GeminiRequest>('function-call.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    // Model message should have functionCall
    const modelContent = gemini.contents.find(c => c.role === 'model');
    assert(modelContent !== undefined, 'has model content');
    assert(modelContent!.parts.some(p => 'functionCall' in p), 'has functionCall');
    const fnCall = modelContent!.parts.find(p => 'functionCall' in p) as import('../bridge/gemini/types.js').GeminiFunctionCallPart;
    assertEqual(fnCall.functionCall.name, 'get_weather', 'function name');
    assertEqual(fnCall.functionCall.args?.location, 'Tokyo', 'function args');
  });

  test('function response round-trip', () => {
    const raw = loadFixture<GeminiRequest>('function-call.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    // Should have a user content with functionResponse
    const fnResponse = gemini.contents.some(c =>
      c.role === 'user' && c.parts.some(p => 'functionResponse' in p),
    );
    assert(fnResponse, 'has functionResponse in user content');
  });

  test('full config round-trip', () => {
    const raw = loadFixture<GeminiRequest>('full-config.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assertEqual(gemini.generationConfig?.temperature, 0.5, 'temperature');
    assertEqual(gemini.generationConfig?.topP, 0.95, 'topP');
    assertEqual(gemini.generationConfig?.topK, 40, 'topK');
    assertEqual(gemini.generationConfig?.maxOutputTokens, 1024, 'maxOutputTokens');
    assertEqual(gemini.generationConfig?.responseMimeType, 'application/json', 'responseMimeType');
    assert(gemini.safetySettings !== undefined, 'safetySettings');
    assertEqual(gemini.safetySettings![0].category, 'HARM_CATEGORY_HARASSMENT', 'safety category');
  });

  test('CanonicalToolChoice NONE → toolConfig NONE', () => {
    const raw = loadFixture<GeminiRequest>('tools.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    // Override toolChoice to none
    canonical.toolChoice = { type: 'none' };
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assertEqual(gemini.toolConfig!.functionCallingConfig!.mode, 'NONE', 'mode NONE');
  });

  test('CanonicalToolChoice with specific tool → allowedFunctionNames', () => {
    const raw = loadFixture<GeminiRequest>('tools.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    canonical.toolChoice = { type: 'tool', name: 'get_weather' };
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assertEqual(gemini.toolConfig!.functionCallingConfig!.mode, 'ANY', 'mode ANY for specific tool');
    assert(gemini.toolConfig!.functionCallingConfig!.allowedFunctionNames!.includes('get_weather'), 'allowedFunctionNames');
  });

  test('JSON schema responseFormat → responseMimeType + responseSchema', () => {
    const raw = loadFixture<GeminiRequest>('full-config.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    // Override to json_schema
    canonical.responseFormat = {
      type: 'json_schema',
      schema: { type: 'object', properties: { name: { type: 'string' } } },
    };
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assertEqual(gemini.generationConfig?.responseMimeType, 'application/json', 'responseMimeType');
    assert(gemini.generationConfig?.responseSchema !== undefined, 'has responseSchema');
  });

  // ─── Edge Cases ─────────────────────────────────────────────────

  console.log('\n  Edge Cases:');

  test('no tools → no tools in Gemini output', () => {
    const raw = loadFixture<GeminiRequest>('simple-text.json');
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assert(gemini.tools === undefined, 'no tools');
    assert(gemini.toolConfig === undefined, 'no toolConfig');
  });

  test('no generationConfig → no generationConfig in output', () => {
    const raw: GeminiRequest = {
      contents: [{ role: 'user', parts: [{ text: 'hi' }] }],
    };
    const { request: canonical } = geminiRequestToCanonical(raw);
    const { request: gemini } = canonicalRequestToGemini(canonical);

    assert(gemini.generationConfig === undefined, 'no generationConfig');
  });

  test('fileData → text placeholder', () => {
    const raw: GeminiRequest = {
      contents: [{ role: 'user', parts: [
        { text: 'Describe this file' },
        { fileData: { mimeType: 'application/pdf', fileUri: 'gs://bucket/file.pdf' } },
      ] }],
    };
    const { request } = geminiRequestToCanonical(raw);

    assert(request.messages[0].content.some(p => p.type === 'text' && (p as import('../bridge/canonical/content.js').CanonicalTextPart).text.includes('gs://bucket/file.pdf')), 'file URI in text');
  });

  // ─── Summary ────────────────────────────────────────────────────

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) {
    throw new Error(`${failed} Gemini bridge tests failed`);
  }
}
