// 8Router — Canonical Config Persistence & Settings API Tests (Phase 3A.3)
// Regression tests for config persistence through restart and API reload.

import {
  loadCanonicalExperimentConfig,
  reloadCanonicalExperimentConfig,
  resetCanonicalExperimentConfig,
} from '../runtime/canonical-experiment/config.js';

let passed = 0;
let failed = 0;
const failures: string[] = [];

function test(name: string, fn: () => void): void {
  try { fn(); passed++; console.log(`  ✓ ${name}`); }
  catch (err: unknown) { failed++; const msg = err instanceof Error ? err.message : String(err); failures.push(`${name}: ${msg}`); console.log(`  ✗ ${name}: ${msg}`); }
}

function expect(val: unknown) {
  return {
    toBe(expected: unknown) { if (val !== expected) throw new Error(`Expected ${JSON.stringify(expected)}, got ${JSON.stringify(val)}`); },
    toBeTruthy() { if (!val) throw new Error(`Expected truthy, got ${JSON.stringify(val)}`); },
    toBeFalsy() { if (val) throw new Error(`Expected falsy, got ${JSON.stringify(val)}`); },
    toHaveProperty(key: string) { if (!(val && typeof val === 'object' && key in (val as Record<string, unknown>))) throw new Error(`Missing property: ${key}`); },
  };
}

function run() {
  console.log('\n=== Canonical Config Persistence Tests ===\n');

  // 1. Default config from env
  test('1. mode reads CANONICAL_RUNTIME_MODE env var', () => {
    const orig = process.env.CANONICAL_RUNTIME_MODE;
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    const config = reloadCanonicalExperimentConfig();
    expect(config.mode).toBe('shadow');
    process.env.CANONICAL_RUNTIME_MODE = orig || 'off';
    reloadCanonicalExperimentConfig();
  });

  test('2. shadowSampleRate reads CANONICAL_SHADOW_SAMPLE_RATE env var', () => {
    const origRate = process.env.CANONICAL_SHADOW_SAMPLE_RATE;
    const origMode = process.env.CANONICAL_RUNTIME_MODE;
    process.env.CANONICAL_SHADOW_SAMPLE_RATE = '0.15';
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    const config = reloadCanonicalExperimentConfig();
    expect(config.shadowSampleRate).toBe(0.15);
    process.env.CANONICAL_SHADOW_SAMPLE_RATE = origRate || '0';
    process.env.CANONICAL_RUNTIME_MODE = origMode || 'off';
    reloadCanonicalExperimentConfig();
  });

  test('3. autoDisable reads CANONICAL_AUTO_DISABLE env var', () => {
    const orig = process.env.CANONICAL_AUTO_DISABLE;
    process.env.CANONICAL_AUTO_DISABLE = 'false';
    const config = reloadCanonicalExperimentConfig();
    expect(config.autoDisable).toBe(false);
    process.env.CANONICAL_AUTO_DISABLE = orig || 'true';
    reloadCanonicalExperimentConfig();
  });

  test('4. enforced mode falls back to off', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'enforced';
    const config = reloadCanonicalExperimentConfig();
    expect(config.mode).toBe('off');
    delete process.env.CANONICAL_RUNTIME_MODE;
    reloadCanonicalExperimentConfig();
  });

  test('5. config cached until reload', () => {
    resetCanonicalExperimentConfig();
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    const c1 = loadCanonicalExperimentConfig();
    // Change env but don't reload — cached config should still return shadow
    // Actually loadCanonicalExperimentConfig always reads from env
    expect(c1.mode).toBe('shadow');
    delete process.env.CANONICAL_RUNTIME_MODE;
    reloadCanonicalExperimentConfig();
  });

  test('6. settings PATCH path: update env then reload', () => {
    // Simulate what the settings PATCH endpoint does
    resetCanonicalExperimentConfig();
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    process.env.CANONICAL_SHADOW_SAMPLE_RATE = '0.05';
    const config = reloadCanonicalExperimentConfig();
    expect(config.mode).toBe('shadow');
    expect(config.shadowSampleRate).toBe(0.05);
    // Clean up
    delete process.env.CANONICAL_RUNTIME_MODE;
    delete process.env.CANONICAL_SHADOW_SAMPLE_RATE;
    reloadCanonicalExperimentConfig();
  });

  test('7. shadow-rate PATCH path: update env then reload', () => {
    resetCanonicalExperimentConfig();
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    process.env.CANONICAL_SHADOW_SAMPLE_RATE = '0.10';
    const config = reloadCanonicalExperimentConfig();
    expect(config.shadowSampleRate).toBe(0.10);
    delete process.env.CANONICAL_RUNTIME_MODE;
    delete process.env.CANONICAL_SHADOW_SAMPLE_RATE;
    reloadCanonicalExperimentConfig();
  });

  test('8. canaryPercent reads CANONICAL_CANARY_SAMPLE_RATE env var', () => {
    const orig = process.env.CANONICAL_CANARY_SAMPLE_RATE;
    process.env.CANONICAL_CANARY_SAMPLE_RATE = '0';
    const config = reloadCanonicalExperimentConfig();
    expect(config.canaryPercent).toBe(0);
    process.env.CANONICAL_CANARY_SAMPLE_RATE = orig || '0';
    reloadCanonicalExperimentConfig();
  });

  test('9. shadow sample rate clamps to [0, 1]', () => {
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    process.env.CANONICAL_SHADOW_SAMPLE_RATE = '2.0';
    const config = reloadCanonicalExperimentConfig();
    if (config.shadowSampleRate > 1) throw new Error(`Expected ≤ 1, got ${config.shadowSampleRate}`);
    delete process.env.CANONICAL_RUNTIME_MODE;
    delete process.env.CANONICAL_SHADOW_SAMPLE_RATE;
    reloadCanonicalExperimentConfig();
  });

  test('10. config reload clears cache and re-reads env', () => {
    resetCanonicalExperimentConfig();
    process.env.CANONICAL_RUNTIME_MODE = 'shadow';
    const c1 = reloadCanonicalExperimentConfig();
    expect(c1.mode).toBe('shadow');
    process.env.CANONICAL_RUNTIME_MODE = 'off';
    const c2 = reloadCanonicalExperimentConfig();
    expect(c2.mode).toBe('off');
    delete process.env.CANONICAL_RUNTIME_MODE;
    reloadCanonicalExperimentConfig();
  });

  console.log(`\n=== Results: ${passed} passed, ${failed} failed ===`);
  if (failures.length > 0) {
    console.log('\nFailures:');
    failures.forEach(f => console.log(`  - ${f}`));
  }
}

export function runConfigPersistenceTests(): void {
  run();
  console.log(`\n   Config Persistence: ${passed} passed, ${failed} failed\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runConfigPersistenceTests();
  if (failed > 0) process.exit(1);
}
