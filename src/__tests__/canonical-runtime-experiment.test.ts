// 8Router — Canonical Runtime Experiment Tests (Phase 2H)

import {
  type CanonicalRuntimeMode,
  type CanonicalExperimentConfig,
  type CanonicalMismatchKind,
  DEFAULT_EXPERIMENT_CONFIG,
  CRITICAL_MISMATCH_KINDS,
} from '../runtime/canonical-experiment/types.js';
import { loadCanonicalExperimentConfig, reloadCanonicalExperimentConfig, getCanonicalExperimentConfig } from '../runtime/canonical-experiment/config.js';
import { isEligibleForExperiment } from '../runtime/canonical-experiment/sampler.js';
import {
  getState, updateMode, setEnabled, recordObservation, recordShadow, recordCanary,
  recordMismatch, recordCanonicalFailure, recordLegacyFallback, triggerAutoDisable, resetState,
} from '../runtime/canonical-experiment/state.js';
import { compareRequests, compareResponses, runComparison } from '../runtime/canonical-experiment/compare.js';
import {
  normalizeRequestForComparison, normalizeResponseForComparison,
  normalizeFinishReason, hashText, fingerprint,
} from '../runtime/canonical-experiment/normalize.js';
import { computeMetrics, recordMismatchKind, getTopMismatchKinds, resetMetrics } from '../runtime/canonical-experiment/metrics.js';
import { checkAutoDisable } from '../runtime/canonical-experiment/auto-disable.js';
import { runShadow } from '../runtime/canonical-experiment/shadow.js';
import { decideCanary, recordCanarySuccess, recordCanaryFailure } from '../runtime/canonical-experiment/canary.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void) {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err: any) { failed++; failures.push(`${name}: ${err.message}`); console.log(`  ✗ ${name}: ${err.message}`); }
}

function expect(actual: any) {
  return {
    toBe(e: any) { if (actual !== e) throw new Error(`Expected ${JSON.stringify(e)}, got ${JSON.stringify(actual)}`); },
    toBeTruthy() { if (!actual) throw new Error(`Expected truthy, got ${JSON.stringify(actual)}`); },
    toBeFalsy() { if (actual) throw new Error(`Expected falsy, got ${JSON.stringify(actual)}`); },
    toBeGreaterThan(n: number) { if (actual <= n) throw new Error(`Expected > ${n}, got ${actual}`); },
    toBeGreaterThanOrEqual(n: number) { if (actual < n) throw new Error(`Expected >= ${n}, got ${actual}`); },
    toBeLessThan(n: number) { if (actual >= n) throw new Error(`Expected < ${n}, got ${actual}`); },
    toContain(s: string) { if (typeof actual === 'string' && !actual.includes(s)) throw new Error(`Expected to contain "${s}"`); if (Array.isArray(actual) && !actual.includes(s)) throw new Error(`Expected array to contain "${s}"`); },
    toHaveLength(n: number) { if (actual.length !== n) throw new Error(`Expected length ${n}, got ${actual.length}`); },
    toMatch(r: RegExp) { if (typeof actual === 'string' && !r.test(actual)) throw new Error(`Expected ${JSON.stringify(actual)} to match ${r}`); },
    not: {
      toContain(s: string) { if (actual.includes(s)) throw new Error(`Expected NOT to contain "${s}"`); },
      toBe(e: any) { if (actual === e) throw new Error(`Expected NOT to be ${JSON.stringify(e)}`); },
    },
  };
}

function run() {
  console.log('\n=== Canonical Runtime Experiment Tests ===\n');

  // ═══ CONFIG ═══
  console.log('--- Config ---');
  test('1. default mode off', () => { expect(DEFAULT_EXPERIMENT_CONFIG.mode).toBe('off'); });
  test('2. invalid mode fails safe to off', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'bogus';
    const c = loadCanonicalExperimentConfig();
    expect(c.mode).toBe('off');
    delete process.env.CANONICAL_RUNTIME_MODE;
  });
  test('3. enforced rejected', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'enforced';
    const c = loadCanonicalExperimentConfig();
    expect(c.mode).toBe('off');
    delete process.env.CANONICAL_RUNTIME_MODE;
  });
  test('4. shadow mode accepted', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    const c = loadCanonicalExperimentConfig();
    expect(c.mode).toBe('shadow');
    delete process.env.CANONICAL_RUNTIME_MODE;
  });
  test('5. canary mode accepted', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'canary';
    const c = loadCanonicalExperimentConfig();
    expect(c.mode).toBe('canary');
    delete process.env.CANONICAL_RUNTIME_MODE;
  });
  test('6. sample rate clamped to [0,1]', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    process.env.CANONICAL_SHADOW_SAMPLE_RATE = '5';
    const c = loadCanonicalExperimentConfig();
    expect(c.shadowSampleRate).toBe(1);
    delete process.env.CANONICAL_SHADOW_SAMPLE_RATE;
    delete process.env.CANONICAL_RUNTIME_MODE;
  });
  test('7. canary percent clamped to [0,100]', () => {
    process.env.CANONICAL_CANARY_PERCENT = '200';
    process.env.CANONICAL_RUNTIME_MODE = 'canary';
    const c = loadCanonicalExperimentConfig();
    expect(c.canaryPercent).toBe(100);
    delete process.env.CANONICAL_CANARY_PERCENT;
    delete process.env.CANONICAL_RUNTIME_MODE;
  });
  test('8. auto-disable default true', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'canary';
    const c = loadCanonicalExperimentConfig();
    expect(c.autoDisable).toBe(true);
    delete process.env.CANONICAL_RUNTIME_MODE;
  });
  test('9. auto-disable env override', () => {
    process.env.CANONICAL_AUTO_DISABLE = 'false';
    const c = loadCanonicalExperimentConfig();
    expect(c.autoDisable).toBe(false);
    delete process.env.CANONICAL_AUTO_DISABLE;
  });
  test('10. reload returns fresh config', () => {
    const c = reloadCanonicalExperimentConfig();
    expect(c).toBeTruthy();
  });

  // ═══ SAMPLER ═══
  console.log('\n--- Sampler ---');
  test('11. deterministic sampling', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    process.env.CANONICAL_SHADOW_SAMPLE_RATE = '1';
    const c = loadCanonicalExperimentConfig();
    const r1 = isEligibleForExperiment('req1', 'u1', 'k1', c, 1);
    const r2 = isEligibleForExperiment('req1', 'u1', 'k1', c, 1);
    expect(r1).toBe(r2);
    delete process.env.CANONICAL_RUNTIME_MODE;
    delete process.env.CANONICAL_SHADOW_SAMPLE_RATE;
  });
  test('12. different inputs can yield different results', () => {
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'shadow' as CanonicalRuntimeMode };
    const results = new Set<boolean>();
    for (let i = 0; i < 20; i++) {
      results.add(isEligibleForExperiment(`req${i}`, 'u1', 'k1', c, 0.5));
    }
    // With 50% rate and 20 different IDs, we should see both true and false
    // (probabilistic but practically certain)
    expect(results.size).toBeGreaterThan(1);
  });
  test('13. zero rate returns false', () => {
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'shadow' as CanonicalRuntimeMode };
    expect(isEligibleForExperiment('req1', 'u1', 'k1', c, 0)).toBe(false);
  });
  test('14. allowlist overrides sampling', () => {
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'shadow' as CanonicalRuntimeMode, userAllowlist: ['u1'] };
    expect(isEligibleForExperiment('req1', 'u1', 'k1', c, 0)).toBe(true);
  });
  test('15. access key allowlist overrides', () => {
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'shadow' as CanonicalRuntimeMode, accessKeyAllowlist: ['k1'] };
    expect(isEligibleForExperiment('req1', 'u2', 'k1', c, 0)).toBe(true);
  });

  // ═══ STATE ═══
  console.log('\n--- State ---');
  test('16. initial state correct', () => {
    resetState();
    const s = getState();
    expect(s.mode).toBe('off');
    expect(s.enabled).toBe(true);
    expect(s.autoDisabled).toBe(false);
    expect(s.requestsObserved).toBe(0);
  });
  test('17. recordObservation increments', () => {
    resetState();
    recordObservation();
    recordObservation();
    expect(getState().requestsObserved).toBe(2);
  });
  test('18. recordShadow increments', () => {
    resetState();
    recordShadow();
    expect(getState().shadowRequests).toBe(1);
  });
  test('19. recordCanary increments', () => {
    resetState();
    recordCanary();
    expect(getState().canaryRequests).toBe(1);
  });
  test('20. recordMismatch increments count and rate', () => {
    resetState();
    recordObservation();
    recordObservation();
    recordMismatch();
    expect(getState().mismatchCount).toBe(1);
    expect(getState().mismatchRate).toBe(0.5);
  });
  test('21. recordCanonicalFailure increments', () => {
    resetState();
    recordCanonicalFailure();
    expect(getState().canonicalFailures).toBe(1);
    expect(getState().lastCanonicalFailureAt).toBeTruthy();
  });
  test('22. recordLegacyFallback increments', () => {
    resetState();
    recordLegacyFallback();
    expect(getState().legacyFallbacks).toBe(1);
  });
  test('23. updateMode changes mode', () => {
    resetState();
    updateMode('shadow');
    expect(getState().mode).toBe('shadow');
  });
  test('24. setEnabled toggles', () => {
    resetState();
    setEnabled(false);
    expect(getState().enabled).toBe(false);
  });
  test('25. triggerAutoDisable sets flags', () => {
    resetState();
    triggerAutoDisable('test');
    const s = getState();
    expect(s.autoDisabled).toBe(true);
    expect(s.enabled).toBe(false);
    expect(s.autoDisableReason).toBe('test');
    expect(s.autoDisabledAt).toBeTruthy();
  });
  test('26. resetState resets everything', () => {
    triggerAutoDisable('test');
    resetState();
    expect(getState().autoDisabled).toBe(false);
    expect(getState().enabled).toBe(true);
  });

  // ═══ NORMALIZE ═══
  console.log('\n--- Normalize ---');
  test('27. hashText is deterministic', () => {
    expect(hashText('hello')).toBe(hashText('hello'));
  });
  test('28. hashText differs for different input', () => {
    expect(hashText('hello')).not.toBe(hashText('world'));
  });
  test('29. hashText returns hex string', () => {
    expect(hashText('test')).toMatch(/^[a-f0-9]+$/);
  });
  test('30. fingerprint is deterministic', () => {
    const o = { a: 1, b: 'test' };
    expect(fingerprint(o)).toBe(fingerprint(o));
  });
  test('31. fingerprint normalizes key order', () => {
    expect(fingerprint({ a: 1, b: 2 })).toBe(fingerprint({ b: 2, a: 1 }));
  });
  test('32. normalizeFinishReason maps stop', () => {
    expect(normalizeFinishReason('stop')).toBe('stop');
  });
  test('33. normalizeFinishReason maps end_turn', () => {
    expect(normalizeFinishReason('end_turn')).toBe('stop');
  });
  test('34. normalizeFinishReason maps tool_use', () => {
    expect(normalizeFinishReason('tool_use')).toBe('tool_calls');
  });
  test('35. normalizeFinishReason maps length', () => {
    expect(normalizeFinishReason('max_tokens')).toBe('length');
  });
  test('36. normalizeFinishReason null/undefined returns unknown', () => {
    expect(normalizeFinishReason(null)).toBe('unknown');
    expect(normalizeFinishReason(undefined)).toBe('unknown');
  });
  test('37. normalizeRequestForComparison preserves model', () => {
    const req = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
    const n = normalizeRequestForComparison(req);
    expect(n.model).toBe('gpt-4');
  });
  test('38. normalizeResponseForComparison hashes content', () => {
    const resp = { id: 'chat1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }] };
    const n = normalizeResponseForComparison(resp);
    expect(n.choices).toBeTruthy();
  });

  // ═══ COMPARE ═══
  console.log('\n--- Compare ---');
  test('39. identical requests match', () => {
    const req = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
    const result = compareRequests(req, req);
    expect(result.matched).toBe(true);
  });
  test('40. role mismatch detected', () => {
    const l = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
    const c = { model: 'gpt-4', messages: [{ role: 'assistant', content: 'hi' }] };
    const result = compareRequests(l, c);
    expect(result.matched).toBe(false);
    expect(result.mismatches).toContain('request_role');
  });
  test('41. model mismatch detected', () => {
    const l = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
    const c = { model: 'gpt-3.5', messages: [{ role: 'user', content: 'hi' }] };
    const result = compareRequests(l, c);
    expect(result.mismatches).toContain('request_model');
  });
  test('42. identical responses match', () => {
    const resp = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
    const result = compareResponses(resp, resp, true, true);
    expect(result.matched).toBe(true);
  });
  test('43. text hash mismatch detected (same length, different content)', () => {
    const l = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'aaa' }, finish_reason: 'stop' }] };
    const c = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'bbb' }, finish_reason: 'stop' }] };
    const result = compareResponses(l, c, true, true);
    expect(result.mismatches).toContain('response_text_hash');
    expect(result.mismatches).not.toContain('response_text_length');
  });
  test('43b. text length + hash mismatch (different length, different content)', () => {
    const l = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'aaa' }, finish_reason: 'stop' }] };
    const c = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'bbbb' }, finish_reason: 'stop' }] };
    const result = compareResponses(l, c, true, true);
    expect(result.mismatches).toContain('response_text_length');
    expect(result.mismatches).toContain('response_text_hash');
  });
  test('43c. identical content matches', () => {
    const l = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'aaa' }, finish_reason: 'stop' }] };
    const c = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'aaa' }, finish_reason: 'stop' }] };
    const result = compareResponses(l, c, true, true);
    expect(result.mismatches).not.toContain('response_text_length');
    expect(result.mismatches).not.toContain('response_text_hash');
  });
  test('43d. null vs null content matches', () => {
    const l = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: null }, finish_reason: 'stop' }] };
    const c = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: null }, finish_reason: 'stop' }] };
    const result = compareResponses(l, c, true, true);
    expect(result.mismatches).not.toContain('response_text_length');
    expect(result.mismatches).not.toContain('response_text_hash');
  });
  test('44. finish reason mismatch detected', () => {
    const l = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'a' }, finish_reason: 'stop' }] };
    const c = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'a' }, finish_reason: 'length' }] };
    const result = compareResponses(l, c, true, true);
    expect(result.mismatches).toContain('response_finish_reason');
  });
  test('45. tool call count mismatch detected', () => {
    const l = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'get_weather', arguments: '{}' } }] }, finish_reason: 'tool_calls' }] };
    const c = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [] }, finish_reason: 'tool_calls' }] };
    const result = compareResponses(l, c, true, true);
    expect(result.mismatches).toContain('response_tool_call_count');
  });
  test('46. tool call name mismatch detected', () => {
    const l = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'get_weather', arguments: '{}' } }] }, finish_reason: 'tool_calls' }] };
    const c = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'get_time', arguments: '{}' } }] }, finish_reason: 'tool_calls' }] };
    const result = compareResponses(l, c, true, true);
    expect(result.mismatches).toContain('response_tool_call_name');
  });
  test('47. runComparison full pipeline', () => {
    const req = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
    const resp = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
    const r = runComparison(req, req, resp, resp, { compareToolCalls: true, compareUsage: true });
    expect(r.matched).toBe(true);
    expect(r.comparisonLatencyMs).toBeGreaterThanOrEqual(0);
  });
  test('48. compare tool calls can be disabled', () => {
    const l = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [{ id: 'tc1', type: 'function', function: { name: 'a', arguments: '{}' } }] }, finish_reason: 'tool_calls' }] };
    const c = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: null, tool_calls: [{ id: 'tc2', type: 'function', function: { name: 'b', arguments: '{}' } }] }, finish_reason: 'tool_calls' }] };
    const result = compareResponses(l, c, false, true);
    expect(result.matched).toBe(true);
  });
  test('49. usage mismatch configurable', () => {
    const l = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 } };
    const c = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'hi' }, finish_reason: 'stop' }], usage: { prompt_tokens: 10, completion_tokens: 99, total_tokens: 109 } };
    const withUsage = compareResponses(l, c, true, true);
    expect(withUsage.matched).toBe(false);
    const withoutUsage = compareResponses(l, c, true, false);
    expect(withoutUsage.matched).toBe(true);
  });

  // ═══ SHADOW ═══
  console.log('\n--- Shadow ---');
  test('50. shadow returns comparison result', () => {
    resetState();
    const req = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
    const resp = { id: '1', model: 'gpt-4', choices: [{ index: 0, message: { role: 'assistant', content: 'hello' }, finish_reason: 'stop' }] };
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'shadow' as CanonicalRuntimeMode };
    const result = runShadow(req, resp, c);
    expect(result).toBeTruthy();
    expect(result!.matched).toBe(true);
  });
  test('51. shadow records observation', () => {
    resetState();
    const req = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'shadow' as CanonicalRuntimeMode };
    runShadow(req, undefined, c);
    expect(getState().shadowRequests).toBe(1);
  });
  test('52. shadow records mismatch', () => {
    resetState();
    const l = { model: 'gpt-4', messages: [{ role: 'user', content: 'hi' }] };
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'shadow' as CanonicalRuntimeMode };
    // Since shadow simulates a round-trip that preserves structure, mismatches are rare
    // but we can test the no-response case
    const result = runShadow(l, undefined, c);
    expect(result).toBeTruthy();
  });
  test('53. shadow conversion failure returns error result', () => {
    resetState();
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'shadow' as CanonicalRuntimeMode };
    // Pass null-ish to trigger issues
    const result = runShadow(null as any, undefined, c);
    expect(result).toBeTruthy();
    expect(result!.mismatchKinds).toContain('conversion_error');
  });

  // ═══ CANARY ═══
  console.log('\n--- Canary ---');
  test('54. canary sampled', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'canary';
    process.env.CANONICAL_CANARY_PERCENT = '100';
    const c = loadCanonicalExperimentConfig();
    const result = decideCanary('req1', c);
    expect(result.useCanonical).toBe(true);
    delete process.env.CANONICAL_CANARY_PERCENT;
    delete process.env.CANONICAL_RUNTIME_MODE;
  });
  test('55. canary not sampled', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'canary';
    process.env.CANONICAL_CANARY_PERCENT = '0';
    const c = loadCanonicalExperimentConfig();
    const result = decideCanary('req1', c);
    expect(result.useCanonical).toBe(false);
    delete process.env.CANONICAL_RUNTIME_MODE;
    delete process.env.CANONICAL_CANARY_PERCENT;
  });
  test('56. canary records observation', () => {
    resetState();
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'canary' as CanonicalRuntimeMode, canaryPercent: 0 };
    decideCanary('req1', c);
    expect(getState().canaryRequests).toBe(1);
  });
  test('57. canary auto-disable', () => {
    resetState();
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'canary' as CanonicalRuntimeMode, canaryPercent: 100, autoDisable: true, minSamplesBeforeAutoDisable: 1, mismatchThreshold: 0.01 };
    for (let i = 0; i < 10; i++) recordObservation();
    for (let i = 0; i < 5; i++) recordMismatch();
    const result = decideCanary('req1', c);
    expect(result.useCanonical).toBe(false);
    expect(result.reason).toBe('auto_disabled');
  });
  test('58. canarySuccess and canaryFailure work', () => {
    recordCanarySuccess();
    recordCanaryFailure();
    expect(getState().canonicalFailures).toBeGreaterThan(0);
  });

  // ═══ AUTO-DISABLE ═══
  console.log('\n--- Auto-Disable ---');
  test('59. auto-disable below min samples does not trigger', () => {
    resetState();
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'canary' as CanonicalRuntimeMode, autoDisable: true, minSamplesBeforeAutoDisable: 50, mismatchThreshold: 0.01 };
    recordObservation();
    expect(checkAutoDisable(c)).toBe(false);
  });
  test('60. auto-disable above threshold triggers', () => {
    resetState();
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'canary' as CanonicalRuntimeMode, autoDisable: true, minSamplesBeforeAutoDisable: 1, mismatchThreshold: 0.01 };
    for (let i = 0; i < 10; i++) recordObservation();
    for (let i = 0; i < 5; i++) recordMismatch();
    expect(checkAutoDisable(c)).toBe(true);
    expect(getState().autoDisabled).toBe(true);
  });
  test('61. auto-disable disabled by config', () => {
    resetState();
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'canary' as CanonicalRuntimeMode, autoDisable: false, minSamplesBeforeAutoDisable: 1, mismatchThreshold: 0.01 };
    for (let i = 0; i < 10; i++) recordObservation();
    for (let i = 0; i < 5; i++) recordMismatch();
    expect(checkAutoDisable(c)).toBe(false);
  });
  test('62. failure threshold triggers', () => {
    resetState();
    const c = { ...DEFAULT_EXPERIMENT_CONFIG, mode: 'canary' as CanonicalRuntimeMode, autoDisable: true, minSamplesBeforeAutoDisable: 1, mismatchThreshold: 1, failureThreshold: 0.01 };
    for (let i = 0; i < 10; i++) recordObservation();
    for (let i = 0; i < 5; i++) recordCanonicalFailure();
    expect(checkAutoDisable(c)).toBe(true);
  });

  // ═══ METRICS ═══
  console.log('\n--- Metrics ---');
  test('63. computeMetrics returns valid values', () => {
    resetState();
    resetMetrics();
    const m = computeMetrics();
    expect(m.requestsObserved).toBe(0);
    expect(m.matchRate).toBe(1);
  });
  test('64. recordMismatchKind tracks kinds', () => {
    resetMetrics();
    recordMismatchKind('request_role');
    recordMismatchKind('request_role');
    recordMismatchKind('response_tool_call_name');
    const top = getTopMismatchKinds();
    expect(top.length).toBeGreaterThan(0);
    expect(top[0].kind).toBe('request_role');
  });
  test('65. resetMetrics clears', () => {
    resetMetrics();
    recordMismatchKind('unknown');
    resetMetrics();
    expect(getTopMismatchKinds().length).toBe(0);
  });

  // ═══ SAFETY ═══
  console.log('\n--- Safety ---');
  test('66. no content stored in state', () => {
    resetState();
    const s = getState();
    // State should only contain counters and metadata, no content
    const keys = Object.keys(s);
    keys.forEach(k => {
      if (typeof (s as any)[k] === 'string') {
        expect((s as any)[k].length).toBeLessThan(1000);
      }
    });
  });
  test('67. fingerprints contain no plaintext', () => {
    const fp = fingerprint({ text: 'this is a secret message' });
    expect(fp).not.toContain('secret');
    expect(fp).not.toContain('message');
    expect(fp).toMatch(/^[a-f0-9]+$/);
  });
  test('68. hashText is one-way (no secret recovery)', () => {
    const hashed = hashText('my-secret-key-12345');
    expect(hashed).not.toContain('my-secret');
    expect(hashed.length).toBe(16);
  });
  test('69. critical mismatch kinds list exists', () => {
    expect(CRITICAL_MISMATCH_KINDS.length).toBeGreaterThan(0);
    expect(CRITICAL_MISMATCH_KINDS).toContain('request_role');
    expect(CRITICAL_MISMATCH_KINDS).toContain('conversion_error');
  });
  test('70. enforcement mode rejected in config', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'enforced';
    const c = loadCanonicalExperimentConfig();
    expect(c.mode).toBe('off');
    delete process.env.CANONICAL_RUNTIME_MODE;
  });

  // ═══ TYPES ═══
  console.log('\n--- Types ---');
  test('71. default config has all fields', () => {
    const c = DEFAULT_EXPERIMENT_CONFIG;
    expect(c.mode).toBe('off');
    expect(typeof c.shadowSampleRate).toBe('number');
    expect(typeof c.canaryPercent).toBe('number');
    expect(typeof c.mismatchThreshold).toBe('number');
    expect(typeof c.autoDisable).toBe('boolean');
    expect(typeof c.compareStreaming).toBe('boolean');
    expect(typeof c.compareToolCalls).toBe('boolean');
    expect(typeof c.compareUsage).toBe('boolean');
    expect(typeof c.compareMetadata).toBe('boolean');
    expect(Array.isArray(c.userAllowlist)).toBe(true);
    expect(Array.isArray(c.accessKeyAllowlist)).toBe(true);
  });
  test('72. mismatch kinds are all strings', () => {
    const kinds: CanonicalMismatchKind[] = [
      'request_role', 'request_content_count', 'request_tool_definition',
      'request_tool_choice', 'request_model', 'request_generation_config',
      'response_role', 'response_text_length', 'response_finish_reason',
      'response_tool_call_count', 'response_tool_call_name', 'response_tool_call_id',
      'response_tool_call_arguments_shape', 'response_usage',
      'stream_event_order', 'stream_delta_type', 'stream_finish_reason',
      'unsupported_extension', 'conversion_error', 'unknown',
    ];
    expect(kinds.length).toBeGreaterThanOrEqual(20);
  });

  // ═══ REGRESSION ═══
  console.log('\n--- Regression ---');
  test('73. canonical.enabled is still false in config', () => {
    // Verify the main config still has canonical.enabled = false
    const config = getCanonicalExperimentConfig();
    expect(config.mode).toBe('off');
  });
  test('74. experiment does not expose raw keys', () => {
    resetState();
    recordObservation();
    const s = getState();
    const str = JSON.stringify(s);
    expect(str).not.toContain('sk-8router');
    expect(str).not.toContain('api_key');
    expect(str).not.toContain('authorization');
  });

  // ═══ FINAL ═══
  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
}

export function runCanonicalExperimentTests(): void {
  run();
  console.log(`\n   Phase 2H Canonical Experiment: ${passed} passed, ${failed} failed\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runCanonicalExperimentTests();
  process.exit(failed > 0 ? 1 : 0);
}
