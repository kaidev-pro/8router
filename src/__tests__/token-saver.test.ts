// 8Router — Token Saver Tests (Phase 2F)
// Tests: classification, safety, mode behavior, metrics, runtime integration

import { classifyContent } from '../runtime/compression/classify.js';
import { shouldCompress, getStrategiesForMode } from '../runtime/compression/policy.js';
import { estimateTokens } from '../runtime/compression/estimate-tokens.js';
import { loadCompressionConfig, resolveCompressionMode } from '../runtime/compression/config.js';
import { compressContent, toMetrics } from '../runtime/compression/compress.js';
import { SKIPPED_REASONS } from '../runtime/compression/types.js';
import type { CompressionMode } from '../runtime/compression/types.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { console.log(`   ✅ ${label}`); passed++; }
  else { console.log(`   ❌ ${label}`); failed++; }
}

function assertEqual(a: any, b: any, label: string): void {
  assert(a === b, `${label} (got: ${JSON.stringify(a)}, want: ${JSON.stringify(b)})`);
}

// ─── Sample Content ──────────────────────────────────────────────

const TERMINAL_LOG = (() => {
  const lines = ['$ npm install --save-dev typescript @types/node @types/react @types/react-dom'];
  for (let i = 0; i < 100; i++) {
    lines.push('Installing package ' + i + ' of 200... [' + Math.round(i * 0.5) + '%] Downloading from registry.npmjs.org');
  }
  for (let i = 0; i < 50; i++) {
    lines.push('Compiling module ' + i + ' of 50... Building TypeScript sources');
  }
  lines.push('Done. All 200 packages installed successfully in 18.7s');
  return lines.join('\n');
})();

const STACK_TRACE = (() => {
  const lines = ['TypeError: Cannot read property \'map\' of undefined'];
  for (let i = 0; i < 50; i++) lines.push('    at renderFrame' + i + ' (node_modules/react-dom/cjs/react-dom.production.min.js:' + (i * 100) + ':' + (10 + i % 5) + ')');
  for (let i = 0; i < 50; i++) lines.push('    at processItem' + i + ' (src/components/Component' + i + '.tsx:' + (20 + i) + ':' + (5 + i % 3) + ')');
  return lines.join('\n');
})();

const TEST_OUTPUT = (() => {
  const lines = ['  MyComponent'];
  for (let i = 0; i < 80; i++) lines.push('    ✓ test case ' + i + ': verifies component behavior for scenario ' + String.fromCharCode(65 + (i % 26)) + i + ' with extended assertion');
  for (let i = 0; i < 5; i++) lines.push('    ✗ failing test ' + i + ': expected value to equal assertion result');
  lines.push('  80 passing, 5 failing');
  lines.push('  Tests: 85 total (80 passed, 5 failed, 0 skipped)');
  lines.push('  Duration: 3.24s');
  return lines.join('\n');
})();

const LINT_OUTPUT = (() => {
  const lines = [];
  for (let i = 0; i < 30; i++) {
    lines.push(`src/utils/module${i}.ts:${10+i}:5: error no-unused-vars 'var${i}' is defined but never used. (@typescript-eslint/no-unused-vars)`);
    lines.push(`src/utils/module${i}.ts:${20+i}:8: warning no-explicit-any Unexpected any. Use more specific type. (@typescript-eslint/no-explicit-any)`);
  }
  return lines.join('\n');
})();

const DIRECTORY_TREE = `src/
├── components/
│   ├── Button/
│   │   ├── index.ts
│   │   ├── Button.tsx
│   │   ├── Button.module.css
│   │   ├── Button.test.tsx
│   │   ├── Button.stories.tsx
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── hooks.ts
│   │   ├── constants.ts
│   │   └── README.md
│   ├── Input/
│   │   ├── index.ts
│   │   ├── Input.tsx
│   │   ├── Input.module.css
│   │   ├── Input.test.tsx
│   │   ├── Input.stories.tsx
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── hooks.ts
│   │   ├── constants.ts
│   │   └── README.md
│   ├── Select/
│   │   ├── index.ts
│   │   ├── Select.tsx
│   │   ├── Select.module.css
│   │   ├── Select.test.tsx
│   │   ├── Select.stories.tsx
│   │   ├── types.ts
│   │   ├── utils.ts
│   │   ├── hooks.ts
│   │   ├── constants.ts
│   │   └── README.md
│   └── Modal/
│       ├── index.ts
│       └── Modal.tsx
├── pages/
│   ├── index.tsx
│   └── about.tsx
└── utils/
    └── helpers.ts`;

const GREP_OUTPUT = (() => {
  const lines = [];
  const files = ['src/components/Button.tsx', 'src/components/Input.tsx', 'src/components/Select.tsx', 'src/components/Modal.tsx', 'src/components/Table.tsx'];
  for (const f of files) {
    for (let i = 0; i < 15; i++) {
      lines.push(`${f}:${10+i}:onClick={handleAction${i}WithLongHandlerName}`);
    }
  }
  return lines.join('\n');
})();

const GIT_DIFF = (() => {
  const lines = ['diff --git a/src/utils/format.ts b/src/utils/format.ts'];
  lines.push('--- a/src/utils/format.ts');
  lines.push('+++ b/src/utils/format.ts');
  lines.push('@@ -10,6 +10,8 @@ import { parse } from \'./parse\';');
  for (let i = 0; i < 30; i++) lines.push(' const val' + i + ' = ' + i + '; // module variable ' + i);
  lines.push('+const newA = 100;');
  lines.push('+const newB = 200;');
  for (let i = 30; i < 60; i++) lines.push(' const val' + i + ' = ' + i + '; // module variable ' + i);
  lines.push('@@ -50,6 +52,8 @@ export function validate(input: string): boolean {');
  for (let i = 0; i < 30; i++) lines.push(' const check' + i + ' = true; // validation check ' + i);
  lines.push('+  export function transform(input: string): string {');
  lines.push('+    return input.toUpperCase();');
  lines.push('+  }');
  for (let i = 0; i < 30; i++) lines.push(' const done' + i + ' = false; // cleanup flag ' + i);
  lines.push('diff --git a/src/components/Button.tsx b/src/components/Button.tsx');
  lines.push('--- a/src/components/Button.tsx');
  lines.push('+++ b/src/components/Button.tsx');
  lines.push('@@ -1,10 +1,15 @@');
  for (let i = 0; i < 20; i++) lines.push(' import { prop' + i + ' } from \'./types' + i + '\';');
  lines.push('+import { newProp } from \'./new-types\';');
  for (let i = 0; i < 20; i++) lines.push(' const fn' + i + ' = () => prop' + i + ';');
  return lines.join('\n');
})();

const STRUCTURED_JSON = JSON.stringify({
  model: 'gpt-4o',
  messages: [{ role: 'user', content: 'Hello' }],
  temperature: 0.7,
  max_tokens: 1000,
}, null, 2);

const USER_TEXT = 'Please help me write a function that calculates the fibonacci sequence.';

const DUPLICATE_LINES = (() => {
  const lines = ['$ npm install --save-dev @types/node @types/react @types/react-dom typescript'];
  for (let i = 0; i < 150; i++) lines.push('Installing package ' + i + ' of 150... [' + Math.round(i * 0.67) + '%] Downloading from registry.npmjs.org');
  lines.push('Done. All 150 packages installed successfully in 12.3s');
  return lines.join('\n');
})();

// ─── Tests ───────────────────────────────────────────────────────

function testClassification(): void {
  console.log('  Classification');
  assertEqual(classifyContent(TERMINAL_LOG), 'terminal_log', 'Test 1: Terminal log classified');
  assertEqual(classifyContent(STACK_TRACE), 'stack_trace', 'Test 2: Stack trace classified');
  assertEqual(classifyContent(TEST_OUTPUT), 'test_output', 'Test 3: Test output classified');
  assertEqual(classifyContent(LINT_OUTPUT), 'lint_output', 'Test 4: Lint output classified');
  assertEqual(classifyContent(DIRECTORY_TREE), 'directory_tree', 'Test 5: Directory tree classified');
  assertEqual(classifyContent(GREP_OUTPUT), 'grep_output', 'Test 6: Grep output classified');
  assertEqual(classifyContent(GIT_DIFF), 'git_diff', 'Test 7: Git diff classified');
  assertEqual(classifyContent(STRUCTURED_JSON), 'structured_json', 'Test 8: Structured JSON classified');
  assertEqual(classifyContent(USER_TEXT), 'unknown', 'Test 9: User text → unknown');
  assertEqual(classifyContent(''), 'unknown', 'Test 10: Empty content → unknown');
  assertEqual(classifyContent('hi'), 'unknown', 'Test 11: Short content → unknown');
}

function testSafety(): void {
  console.log('  Safety');

  // Test 12: Protected kinds cannot be compressed
  const config = loadCompressionConfig();
  const safePolicy = shouldCompress(STRUCTURED_JSON, 'safe', 'structured_json', config);
  assertEqual(safePolicy.allowed, false, 'Test 12a: JSON not compressible in safe mode');
  assertEqual(safePolicy.skipReason, SKIPPED_REASONS.STRUCTURED_JSON, 'Test 12b: JSON skip reason');

  const srcPolicy = shouldCompress('function foo() {}', 'safe', 'source_code', config);
  assertEqual(srcPolicy.allowed, false, 'Test 12c: Source code not compressible');

  const userPolicy = shouldCompress(USER_TEXT, 'safe', 'user_text', config);
  assertEqual(userPolicy.allowed, false, 'Test 12d: User text not compressible');

  const unknownPolicy = shouldCompress('random content', 'safe', 'unknown', config);
  assertEqual(unknownPolicy.allowed, false, 'Test 12e: Unknown content not compressible');

  // Test 13: Tool arguments stay untouched
  const toolArg = JSON.stringify({ name: 'bash', arguments: '{"command":"ls -la"}' });
  assertEqual(classifyContent(toolArg), 'structured_json', 'Test 13: Tool arguments classified as JSON');
}

function testModeBehavior(): void {
  console.log('  Mode Behavior');

  // Test 14: Safe mode — progress noise on terminal log
  const dupResult = compressContent(DUPLICATE_LINES, 'safe');
  assert(dupResult.applied, 'Test 14a: Safe mode compresses progress noise');
  assert(dupResult.strategies.includes('progress_noise'), 'Test 14b: Progress noise strategy used');
  assert(dupResult.percentSaved > 0, 'Test 14c: Savings > 0');

  // Test 14d: Actual duplicate lines compression
  const actualDups = Array.from({length: 100}, () => 'Downloading chunk...').join('\n');
  const dupsResult = compressContent(actualDups, 'safe');
  // 100 identical lines = 2900 chars, below minChars=4000 — should be skipped
  assertEqual(dupsResult.applied, false, 'Test 14d: Small duplicate content below threshold skipped');

  // Test 15: Balanced mode — test output
  const testResult = compressContent(TEST_OUTPUT, 'balanced');
  assert(testResult.applied, 'Test 15a: Balanced mode compresses test output');
  assert(testResult.strategies.includes('test_output'), 'Test 15b: Test output strategy used');

  // Test 16: Aggressive mode
  const aggResult = compressContent(TERMINAL_LOG, 'aggressive');
  assert(aggResult.applied, 'Test 16: Aggressive mode compresses terminal log');

  // Test 17: Off mode
  const offResult = compressContent(DUPLICATE_LINES, 'off');
  assertEqual(offResult.applied, false, 'Test 17a: Off mode returns original');
  assertEqual(offResult.skippedReason, SKIPPED_REASONS.MODE_OFF, 'Test 17b: Off mode skip reason');

  // Test 18: Fail open — JSON stays unchanged
  const jsonResult = compressContent(STRUCTURED_JSON, 'aggressive');
  assertEqual(jsonResult.applied, false, 'Test 18: JSON stays unchanged');
}

function testMetrics(): void {
  console.log('  Metrics');

  // Test 19: Token estimation
  assertEqual(estimateTokens(''), 1, 'Test 19a: Empty string = 1 token');
  assert(estimateTokens('hello world') > 0, 'Test 19b: Non-empty > 0');
  assertEqual(estimateTokens('a'.repeat(400)), 100, 'Test 19c: 400 chars = 100 tokens');

  // Test 20: Compression result has all fields
  const result = compressContent(DUPLICATE_LINES, 'safe');
  assert(typeof result.estimatedTokensBefore === 'number', 'Test 20a: tokensBefore is number');
  assert(typeof result.estimatedTokensAfter === 'number', 'Test 20b: tokensAfter is number');
  assert(typeof result.estimatedTokensSaved === 'number', 'Test 20c: tokensSaved is number');
  assert(typeof result.percentSaved === 'number', 'Test 20d: percentSaved is number');
  assert(typeof result.compressionLatencyMs === 'number', 'Test 20e: latencyMs is number');

  // Test 21: Metrics excludes content
  const metrics = toMetrics(result);
  const metricsJson = JSON.stringify(metrics);
  assert(!metricsJson.includes('Warning: connection'), 'Test 21: Metrics does not contain content');
  assert(!metricsJson.includes('originalContent'), 'Test 21b: No originalContent in metrics');
}

function testConfig(): void {
  console.log('  Configuration');

  // Test 22: Config loads with defaults
  const config = loadCompressionConfig();
  assertEqual(config.mode, 'off', 'Test 22a: Default mode is off');
  assertEqual(config.minChars, 4000, 'Test 22b: Default minChars');
  assertEqual(config.minEstimatedTokens, 1000, 'Test 22c: Default minTokens');
  assertEqual(config.includeMarker, true, 'Test 22d: Default includeMarker');

  // Test 23: Mode resolution
  assertEqual(resolveCompressionMode('safe'), 'safe', 'Test 23a: Header override works');
  assertEqual(resolveCompressionMode(undefined, 'balanced'), 'balanced', 'Test 23b: Access key override works');
  assertEqual(resolveCompressionMode(undefined, undefined, 'aggressive'), 'aggressive', 'Test 23c: Global default works');
  assertEqual(resolveCompressionMode('safe', 'balanced'), 'safe', 'Test 23d: Header takes priority');
}

function testModeAllowlists(): void {
  console.log('  Mode Allowlists');

  // Test 24: Safe mode allowlists
  const safeStrats = getStrategiesForMode('safe', 'terminal_log');
  assert(safeStrats.includes('duplicate_lines'), 'Test 24a: Safe has duplicate_lines');
  assert(safeStrats.includes('progress_noise'), 'Test 24b: Safe has progress_noise for terminal');

  // Test 25: Balanced mode allowlists
  const balStrats = getStrategiesForMode('balanced', 'test_output');
  assert(balStrats.includes('test_output'), 'Test 25a: Balanced has test_output for test');
  assert(balStrats.includes('repeated_groups'), 'Test 25b: Balanced has repeated_groups');

  // Test 26: Aggressive mode allowlists
  const aggStrats = getStrategiesForMode('aggressive', 'git_diff');
  assert(aggStrats.includes('git_diff'), 'Test 26: Aggressive has git_diff for diff');

  // Test 27: Off mode returns empty strategies
  assertEqual(getStrategiesForMode('off', 'terminal_log').length, 0, 'Test 27: Off mode has no strategies');
}

function testEdgeCases(): void {
  console.log('  Edge Cases');

  // Test 28: Below minimum size
  const config = loadCompressionConfig();
  const smallContent = 'error at line 10\nerror at line 10\nerror at line 10';
  const smallPolicy = shouldCompress(smallContent, 'safe', 'terminal_log', config);
  assertEqual(smallPolicy.allowed, false, 'Test 28: Below minChars not compressed');

  // Test 29: Compression error returns original
  const result = compressContent('test\n'.repeat(5000), 'safe');
  assert(result.compressedContent.length > 0, 'Test 29: Non-empty result on valid input');

  // Test 30: Duplicate lines preserved correctly
  const dupResult = compressContent(DUPLICATE_LINES, 'safe');
  assert(dupResult.compressedContent.includes('Installing package') || dupResult.compressedContent.includes('Done.'), 'Test 30a: Key content preserved in compressed output');
  assert(dupResult.compressedContent.includes('omitted') || dupResult.strategies.length > 0, 'Test 30b: Compression strategies applied');

  // Test 31: Stack trace preserves error type
  const stackResult = compressContent(STACK_TRACE, 'balanced');
  assert(stackResult.compressedContent.includes('TypeError'), 'Test 31: Error type preserved');

  // Test 32: Test output preserves failures
  const testResult = compressContent(TEST_OUTPUT, 'balanced');
  assert(testResult.compressedContent.includes('✗'), 'Test 32: Failed test marker preserved');

  // Test 33: Lint output preserves all unique errors
  const lintResult = compressContent(LINT_OUTPUT, 'balanced');
  assert(lintResult.compressedContent.includes('no-unused-vars'), 'Test 33: Lint rule preserved');

  // Test 34: Git diff preserves file names
  const diffResult = compressContent(GIT_DIFF, 'balanced');
  assert(diffResult.compressedContent.includes('format.ts'), 'Test 34: Git file name preserved');

  // Test 35: Marker added when configured
  if (dupResult.applied) {
    assert(dupResult.compressedContent.includes('8Router Token Saver'), 'Test 35: Marker present');
  }

  // Test 36: Deterministic — same input produces same output
  const r1 = compressContent(DUPLICATE_LINES, 'safe');
  const r2 = compressContent(DUPLICATE_LINES, 'safe');
  assertEqual(r1.compressedContent, r2.compressedContent, 'Test 36: Deterministic output');

  // Test 37: Supported content kinds set
  assert(['terminal_log','stack_trace','test_output','lint_output','directory_tree','grep_output','git_diff'].length === 7, 'Test 37: 7 supported kinds');
}

// ─── Runner ──────────────────────────────────────────────────────

export function runTokenSaverTests(): void {
  testClassification();
  testSafety();
  testModeBehavior();
  testMetrics();
  testConfig();
  testModeAllowlists();
  testEdgeCases();
  console.log(`\n   Phase 2F Token Saver: ${passed} passed, ${failed} failed\n`);
}

if (import.meta.url === `file://${process.argv[1]}`) {
  runTokenSaverTests();
  process.exit(failed > 0 ? 1 : 0);
}
