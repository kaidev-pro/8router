// 8Router — Canonical Bridge Type Tests (Phase 1A)
// Tests type contracts, type guards, config defaults, and capability validation.
// No runtime behavior changes tested — only type-level contracts.

import { loadConfig } from '../config.js';

// --- Canonical Type Imports ---
import {
  // Roles
  VALID_CANONICAL_ROLES,
  VALID_CANONICAL_INSTRUCTION_ROLES,
  VALID_CONTENT_PART_TYPES,
  VALID_STREAM_EVENT_TYPES,
  // Guards
  isCanonicalContentPart,
  isCanonicalMessage,
  isCanonicalInstruction,
  isCanonicalTool,
  isCanonicalRequest,
  isCanonicalResponse,
  isCanonicalStreamEvent,
  isCanonicalError,
  // Capabilities
  validateCapabilities,
  // Config
  DEFAULT_CANONICAL_CONFIG,
  mergeCanonicalConfig,
  loadCanonicalConfigFromEnv,
} from '../bridge/index.js';

// --- Type-only imports (compile-time verification) ---
import type {
  CanonicalRole,
  CanonicalInstructionRole,
  CanonicalContentPart,
  CanonicalInstruction,
  CanonicalMessage,
  CanonicalTool,
  CanonicalToolCall,
  CanonicalRequest,
  CanonicalResponse,
  CanonicalUsage,
  CanonicalError,
  CanonicalStreamEvent,
  CanonicalCapability,
  CapabilityValidationResult,
  CanonicalExtensions,
  CanonicalBridgeMeta,
  BridgeWarning,
  StreamToolCallStart,
  StreamToolCallDelta,
  StreamToolCallEnd,
} from '../bridge/index.js';

function assert(condition: boolean, message: string): void {
  if (!condition) throw new Error(`ASSERT FAILED: ${message}`);
}

function assertEqual<T>(actual: T, expected: T, message: string): void {
  if (actual !== expected) {
    throw new Error(`ASSERT FAILED: ${message} — expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

export function runCanonicalBridgeTests(): void {
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

  console.log('=== Canonical Bridge Type Tests ===\n');

  // --- 1. CanonicalRole ---
  test('CanonicalRole accepts five valid roles', () => {
    const roles: CanonicalRole[] = ['system', 'developer', 'user', 'assistant', 'tool'];
    assertEqual(roles.length, 5, 'should have 5 roles');
    for (const role of roles) {
      assert(VALID_CANONICAL_ROLES.has(role), `role '${role}' should be valid`);
    }
  });

  test('CanonicalRole rejects invalid roles', () => {
    assert(!VALID_CANONICAL_ROLES.has('invalid'), 'invalid role should be rejected');
    assert(!VALID_CANONICAL_ROLES.has('model'), 'model role should be rejected');
    assert(!VALID_CANONICAL_ROLES.has(''), 'empty string should be rejected');
  });

  // --- 2. CanonicalInstructionRole ---
  test('CanonicalInstructionRole accepts system and developer', () => {
    const roles: CanonicalInstructionRole[] = ['system', 'developer'];
    for (const role of roles) {
      assert(VALID_CANONICAL_INSTRUCTION_ROLES.has(role), `instruction role '${role}' should be valid`);
    }
  });

  test('CanonicalInstructionRole rejects non-instruction roles', () => {
    assert(!VALID_CANONICAL_INSTRUCTION_ROLES.has('user'), 'user should be rejected');
    assert(!VALID_CANONICAL_INSTRUCTION_ROLES.has('tool'), 'tool should be rejected');
  });

  // --- 3. CanonicalMessage with tool role ---
  test('CanonicalMessage accepts role: tool', () => {
    const msg: CanonicalMessage = {
      role: 'tool',
      content: [{ type: 'tool_result', toolCallId: 'call_abc', content: '42' }],
    };
    assert(isCanonicalMessage(msg), 'tool role message should be valid');
    assertEqual(msg.role, 'tool', 'role should be tool');
  });

  test('isCanonicalMessage validates message structure', () => {
    const valid: CanonicalMessage = {
      role: 'user',
      content: [{ type: 'text', text: 'hello' }],
    };
    assert(isCanonicalMessage(valid), 'valid message should pass');

    const invalidRole = { role: 'invalid', content: [{ type: 'text', text: 'x' }] };
    assert(!isCanonicalMessage(invalidRole), 'invalid role should fail');

    const missingContent = { role: 'user' };
    assert(!isCanonicalMessage(missingContent), 'missing content should fail');
  });

  // --- 4. Completed tool-call arguments must be object ---
  test('CanonicalToolCall arguments must be parsed object', () => {
    const toolCall: CanonicalToolCall = {
      id: 'call_abc',
      name: 'get_weather',
      arguments: { city: 'Tokyo', units: 'celsius' },
    };
    assert(typeof toolCall.arguments === 'object', 'arguments should be object');
    assert(toolCall.arguments !== null, 'arguments should not be null');
    assert(!Array.isArray(toolCall.arguments), 'arguments should not be array');
    assertEqual(toolCall.arguments.city, 'Tokyo', 'arguments should contain city');
  });

  test('isCanonicalTool validates tool structure', () => {
    const valid: CanonicalTool = {
      name: 'get_weather',
      inputSchema: { type: 'object', properties: { city: { type: 'string' } } },
    };
    assert(isCanonicalTool(valid), 'valid tool should pass');

    const noName = { inputSchema: {} };
    assert(!isCanonicalTool(noName), 'missing name should fail');
  });

  // --- 5. tool_call_delta accepts raw string fragment ---
  test('tool_call_delta accepts raw string fragments', () => {
    const delta: StreamToolCallDelta = {
      type: 'tool_call_delta',
      toolCallIndex: 0,
      argumentsDelta: '{"city":',
    };
    assertEqual(delta.type, 'tool_call_delta', 'type should be tool_call_delta');
    assertEqual(typeof delta.argumentsDelta, 'string', 'argumentsDelta should be string');
    assert(!isCanonicalStreamEvent({ type: 'invalid' }), 'invalid type should fail');
  });

  // --- 6. tool_call_end receives parsed object ---
  test('tool_call_end receives parsed object or null with parseError', () => {
    const success: StreamToolCallEnd = {
      type: 'tool_call_end',
      toolCallIndex: 0,
      arguments: { city: 'Tokyo' },
    };
    assert(success.arguments !== null, 'successful parse should have arguments');

    const failure: StreamToolCallEnd = {
      type: 'tool_call_end',
      toolCallIndex: 0,
      arguments: null,
      parseError: 'Unexpected token in JSON',
    };
    assert(failure.arguments === null, 'failed parse should have null arguments');
    assert(typeof failure.parseError === 'string', 'parseError should be string');
  });

  // --- 7. CanonicalRequest has no originalRequest ---
  test('CanonicalRequest has no originalRequest or rawBody', () => {
    const req: CanonicalRequest = {
      model: 'gpt-4o',
      instructions: [{ role: 'system', content: [{ type: 'text', text: 'hello' }], position: 0 }],
      messages: [{ role: 'user', content: [{ type: 'text', text: 'hi' }] }],
    };
    assert(!('originalRequest' in req), 'should not have originalRequest');
    assert(!('rawBody' in req), 'should not have rawBody');
    assert(isCanonicalRequest(req), 'valid request should pass');
  });

  // --- 8. CanonicalExtensions has typed providers, not generic ---
  test('CanonicalExtensions has typed provider sections', () => {
    const ext: CanonicalExtensions = {
      openai: { frequency_penalty: 0.5, seed: 42 },
      anthropic: { top_k: 40 },
      gemini: { topK: 40, safetySettings: [{ category: 'HARM_CATEGORY_HARASSMENT', threshold: 'BLOCK_MEDIUM_AND_ABOVE' }] },
    };
    // Verify typed fields exist
    assert(typeof ext.openai?.frequency_penalty === 'number', 'openai frequency_penalty should be number');
    assert(typeof ext.anthropic?.top_k === 'number', 'anthropic top_k should be number');
    assert(Array.isArray(ext.gemini?.safetySettings), 'gemini safetySettings should be array');

    // Verify no generic Record<string, unknown>
    assert(!('arbitraryField' in (ext.openai ?? {})), 'openai should not have arbitrary fields');
  });

  // --- 9. CanonicalUsage supports cacheCreationTokens ---
  test('CanonicalUsage supports cacheCreationTokens', () => {
    const usage: CanonicalUsage = {
      inputTokens: 100,
      outputTokens: 50,
      totalTokens: 150,
      cachedInputTokens: 30,
      cacheCreationTokens: 20,
      reasoningTokens: 10,
    };
    assertEqual(usage.inputTokens, 100, 'inputTokens should be 100');
    assertEqual(usage.outputTokens, 50, 'outputTokens should be 50');
    assertEqual(usage.cachedInputTokens, 30, 'cachedInputTokens should be 30');
    assertEqual(usage.cacheCreationTokens, 20, 'cacheCreationTokens should be 20');
    assertEqual(usage.reasoningTokens, 10, 'reasoningTokens should be 10');
  });

  // --- 10. Capability validation returns missing ---
  test('validateCapabilities returns missing when capabilities not available', () => {
    const required: CanonicalCapability[] = ['vision', 'tools'];
    const available: CanonicalCapability[] = ['chat', 'tools', 'streaming'];

    const result = validateCapabilities(required, available);
    assertEqual(result.eligible, false, 'should not be eligible');
    assert(result.missing.includes('vision'), 'should have vision in missing');
    assert(!result.missing.includes('tools'), 'tools should not be in missing');
    assertEqual(result.required.length, 2, 'required should have 2 items');
  });

  test('validateCapabilities returns eligible when all available', () => {
    const required: CanonicalCapability[] = ['chat', 'tools'];
    const available: CanonicalCapability[] = ['chat', 'tools', 'streaming'];

    const result = validateCapabilities(required, available);
    assertEqual(result.eligible, true, 'should be eligible');
    assertEqual(result.missing.length, 0, 'should have no missing');
  });

  // --- 11. Invalid content part type is rejected ---
  test('Invalid content discriminant is rejected', () => {
    const invalid = { type: 'video', data: 'abc' };
    assert(!isCanonicalContentPart(invalid), 'invalid type should fail');

    const missingType = { text: 'hello' };
    assert(!isCanonicalContentPart(missingType), 'missing type should fail');

    const textPart = { type: 'text', text: 'hello' };
    assert(isCanonicalContentPart(textPart), 'valid text part should pass');
  });

  // --- 12. Stream event indexes are preserved ---
  test('Stream events have stable indexes', () => {
    const start: StreamToolCallStart = {
      type: 'tool_call_start',
      toolCallIndex: 0,
      id: 'call_abc',
      name: 'get_weather',
    };
    assertEqual(start.toolCallIndex, 0, 'toolCallIndex should be 0');

    const delta: StreamToolCallDelta = {
      type: 'tool_call_delta',
      toolCallIndex: 0,
      argumentsDelta: '{"city": "Tokyo"}',
    };
    assertEqual(delta.toolCallIndex, 0, 'delta toolCallIndex should match start');

    const end: StreamToolCallEnd = {
      type: 'tool_call_end',
      toolCallIndex: 0,
      arguments: { city: 'Tokyo' },
    };
    assertEqual(end.toolCallIndex, 0, 'end toolCallIndex should match start');
  });

  // --- 13. CanonicalError has no routing/circuit fields ---
  test('CanonicalError has no routing or circuit fields', () => {
    const err: CanonicalError = {
      code: 'unsupported_capability',
      message: 'Provider does not support vision',
      retryable: true,
      sanitized: true,
    };
    assert(!('retryScope' in err), 'should not have retryScope');
    assert(!('circuitEffect' in err), 'should not have circuitEffect');
    assert(!('cooldownMs' in err), 'should not have cooldownMs');
    assert(!('nextAction' in err), 'should not have nextAction');
    assert(isCanonicalError(err), 'valid error should pass');
  });

  // --- 14. Config defaults ---
  test('Config defaults: enabled=false, shadowMode=false', () => {
    assertEqual(DEFAULT_CANONICAL_CONFIG.enabled, false, 'enabled should default to false');
    assertEqual(DEFAULT_CANONICAL_CONFIG.shadowMode, false, 'shadowMode should default to false');
  });

  test('Config: shadowMaxPayloadBytes defaults to 102400', () => {
    assertEqual(DEFAULT_CANONICAL_CONFIG.shadowMaxPayloadBytes, 102400, 'shadowMaxPayloadBytes should default to 102400');
  });

  test('Config: logWarnings defaults to true', () => {
    assertEqual(DEFAULT_CANONICAL_CONFIG.logWarnings, true, 'logWarnings should default to true');
  });

  // --- 15. Config merge ---
  test('mergeCanonicalConfig uses defaults for undefined', () => {
    const merged = mergeCanonicalConfig({});
    assertEqual(merged.enabled, false, 'enabled should be default');
    assertEqual(merged.shadowMode, false, 'shadowMode should be default');
    assertEqual(merged.shadowMaxPayloadBytes, 102400, 'shadowMaxPayloadBytes should be default');
  });

  test('mergeCanonicalConfig preserves explicit values', () => {
    const merged = mergeCanonicalConfig({
      enabled: true,
      shadowMaxPayloadBytes: 204800,
    });
    assertEqual(merged.enabled, true, 'enabled should be overridden');
    assertEqual(merged.shadowMode, false, 'shadowMode should remain default');
    assertEqual(merged.shadowMaxPayloadBytes, 204800, 'shadowMaxPayloadBytes should be overridden');
  });

  // --- 16. Env config ---
  test('loadCanonicalConfigFromEnv reads env vars', () => {
    const original = process.env.CANONICAL_BRIDGE_ENABLED;
    process.env.CANONICAL_BRIDGE_ENABLED = 'true';
    const config = loadCanonicalConfigFromEnv();
    assertEqual(config.enabled, true, 'enabled should be true from env');
    if (original !== undefined) {
      process.env.CANONICAL_BRIDGE_ENABLED = original;
    } else {
      delete process.env.CANONICAL_BRIDGE_ENABLED;
    }
  });

  test('loadCanonicalConfigFromEnv handles invalid numeric env', () => {
    const original = process.env.CANONICAL_BRIDGE_SHADOW_MAX_PAYLOAD_BYTES;
    process.env.CANONICAL_BRIDGE_SHADOW_MAX_PAYLOAD_BYTES = 'not-a-number';
    const config = loadCanonicalConfigFromEnv();
    assert(config.shadowMaxPayloadBytes === undefined, 'invalid numeric env should be undefined');
    if (original !== undefined) {
      process.env.CANONICAL_BRIDGE_SHADOW_MAX_PAYLOAD_BYTES = original;
    } else {
      delete process.env.CANONICAL_BRIDGE_SHADOW_MAX_PAYLOAD_BYTES;
    }
  });

  // --- 17. CanonicalResponse ---
  test('CanonicalResponse has required fields', () => {
    const response: CanonicalResponse = {
      id: 'resp_abc',
      model: 'gpt-4o',
      provider: 'openai',
      createdAt: Date.now(),
      content: [{ type: 'text', text: 'Hello!' }],
      toolCalls: [],
      finishReason: 'stop',
    };
    assert(isCanonicalResponse(response), 'valid response should pass');
    assertEqual(response.finishReason, 'stop', 'finishReason should be stop');
  });

  // --- 18. BridgeWarning ---
  test('BridgeWarning has valid code values', () => {
    const codes: BridgeWarning['code'][] = [
      'field_preserved', 'field_dropped', 'field_transformed',
      'capability_warning', 'shadow_mismatch', 'shadow_skipped',
    ];
    for (const code of codes) {
      const warning: BridgeWarning = { code, message: 'test' };
      assertEqual(warning.code, code, `warning code '${code}' should be valid`);
    }
  });

  // --- 19. CanonicalToolCall index ---
  test('CanonicalToolCall has optional index', () => {
    const withIndex: CanonicalToolCall = {
      id: 'call_abc',
      name: 'test',
      arguments: {},
      index: 2,
    };
    assertEqual(withIndex.index, 2, 'index should be 2');

    const withoutIndex: CanonicalToolCall = {
      id: 'call_abc',
      name: 'test',
      arguments: {},
    };
    assert(withoutIndex.index === undefined, 'index should be optional');
  });

  // --- 20. Compile-time type tests (runtime presence checks) ---
  test('Type imports resolve correctly at runtime', () => {
    // If these imports resolve, the types compile correctly
    assert(typeof isCanonicalContentPart === 'function', 'isCanonicalContentPart should be a function');
    assert(typeof isCanonicalMessage === 'function', 'isCanonicalMessage should be a function');
    assert(typeof isCanonicalInstruction === 'function', 'isCanonicalInstruction should be a function');
    assert(typeof isCanonicalTool === 'function', 'isCanonicalTool should be a function');
    assert(typeof isCanonicalRequest === 'function', 'isCanonicalRequest should be a function');
    assert(typeof isCanonicalResponse === 'function', 'isCanonicalResponse should be a function');
    assert(typeof isCanonicalStreamEvent === 'function', 'isCanonicalStreamEvent should be a function');
    assert(typeof isCanonicalError === 'function', 'isCanonicalError should be a function');
    assert(typeof validateCapabilities === 'function', 'validateCapabilities should be a function');
  });

  // --- 21. Runtime config integration ---
  test('loadConfig includes canonical defaults', () => {
    const config = loadConfig();
    assert(config.canonical !== undefined, 'canonical should be defined');
    assertEqual(config.canonical?.enabled, false, 'canonical.enabled should default to false');
    assertEqual(config.canonical?.shadowMode, false, 'canonical.shadowMode should default to false');
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failed > 0) process.exit(1);
}
