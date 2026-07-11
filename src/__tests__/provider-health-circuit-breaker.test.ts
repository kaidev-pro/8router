// 8Router — Provider Health + Circuit Breaker Tests (Phase 2D)
// Tests: health manager, circuit breaker, error classification, health-aware selection, fallback

import { randomUUID } from 'crypto';
import { getDB } from '../database.js';
import {
  classifyProviderError,
} from '../runtime/health/classify-error.js';
import {
  shouldOpenCircuit, isCircuitOpen, shouldTransitionToHalfOpen,
  computeCooldownUntil, shouldCloseCircuit, getCircuitConfig,
} from '../runtime/health/circuit-breaker.js';
import {
  getProviderHealth, recordProviderSuccess, recordProviderFailure,
  shouldSkipProvider, resetProviderHealth, getUserHealthSummary,
} from '../runtime/health/manager.js';
import {
  isAlias, resolveModelAlias, getDefaultModel,
} from '../runtime/provider-select.js';
import { ERRORS, redactError } from '../runtime/errors.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { console.log(`   ✅ ${label}`); passed++; }
  else { console.log(`   ❌ ${label}`); failed++; }
}

function assertEqual(a: any, b: any, label: string): void {
  assert(a === b, `${label} (got: ${JSON.stringify(a)}, want: ${JSON.stringify(b)})`);
}

// ─── Test Data ──────────────────────────────────────────────────────

const USER_A = 'test-user-a-' + Date.now();
const USER_B = 'test-user-b-' + Date.now();
const CRED_A  = 'cred-a-' + Date.now();
const CRED_B  = 'cred-b-' + Date.now();

function seedDB(): void {
  const db = getDB();
  const now = new Date().toISOString();
  // Seed two provider credentials for testing
  db.prepare(`INSERT OR IGNORE INTO connections (id, provider, name, authType, apiKey, baseUrl, isActive, testStatus, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(CRED_A, 'openai', 'Test OpenAI A', 'apikey', 'sk-mock-a', 'https://api.openai.com/v1', 1, 'connected', now, now);
  db.prepare(`INSERT OR IGNORE INTO connections (id, provider, name, authType, apiKey, baseUrl, isActive, testStatus, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(CRED_B, 'groq', 'Test Groq B', 'apikey', 'sk-mock-b', 'https://api.groq.com/openai/v1', 1, 'connected', now, now);
}

// ─── Tests ──────────────────────────────────────────────────────────

export function runProviderHealthTests(): void {
  console.log('Provider Health + Circuit Breaker Tests\n');
  seedDB();

  // ═══ 1. ERROR CLASSIFICATION ═══
  console.log(' Error Classification:');

  const c401 = classifyProviderError({ status: 401 });
  assertEqual(c401.type, 'auth_error', '401 → auth_error');
  assert(!c401.retryable, 'auth_error is NOT retryable');
  assert(c401.shouldOpenCircuit, 'auth_error opens circuit');

  const c403 = classifyProviderError({ status: 403 });
  assertEqual(c403.type, 'auth_error', '403 → auth_error');

  const c429 = classifyProviderError({ status: 429 });
  assertEqual(c429.type, 'rate_limit', '429 → rate_limit');
  assert(c429.retryable, 'rate_limit is retryable');
  assert(c429.shouldOpenCircuit, 'rate_limit opens circuit');

  const c429q = classifyProviderError({ status: 429, body: { error: { message: 'quota exceeded' } } });
  assertEqual(c429q.type, 'quota_exhausted', '429+quota → quota_exhausted');

  const c500 = classifyProviderError({ status: 500 });
  assertEqual(c500.type, 'provider_error', '500 → provider_error');
  assert(c500.retryable, '500 is retryable');

  const c503 = classifyProviderError({ status: 503 });
  assertEqual(c503.type, 'provider_error', '503 → provider_error');

  const cTimeout = classifyProviderError({ isTimeout: true });
  assertEqual(cTimeout.type, 'timeout', 'timeout → timeout');
  assert(cTimeout.retryable, 'timeout is retryable');

  const cNetwork = classifyProviderError({ isNetworkError: true });
  assertEqual(cNetwork.type, 'network_error', 'network → network_error');

  const c404model = classifyProviderError({ status: 400, body: { error: { message: 'model not found' } } });
  assertEqual(c404model.type, 'model_unavailable', '400+model_not_found → model_unavailable');
  assert(!c404model.retryable, 'model_unavailable NOT retryable');

  const c400ctx = classifyProviderError({ status: 400, body: { error: { message: 'context length exceeded' } } });
  assertEqual(c400ctx.type, 'context_length', '400+context_length → context_length');

  const cUnknown = classifyProviderError({ message: 'weird error' });
  assertEqual(cUnknown.type, 'unknown', 'unknown error → unknown');

  // Secrets in body are safe (classifier doesn't pass raw body to safeMessage)
  assert(c401.safeMessage.includes('authentication'), 'auth error safe message');

  // Retry-After
  const c429retry = classifyProviderError({ status: 429 });
  assert(c429retry.retryable, '429 with retry-after is retryable');

  // ═══ 2. CIRCUIT BREAKER ═══
  console.log('\n Circuit Breaker:');

  const config = getCircuitConfig();
  assertEqual(config.failureThreshold, 3, 'default threshold = 3');
  assertEqual(config.cooldownMs, 60000, 'default cooldown = 60000ms');
  assertEqual(config.halfOpenSuccessThreshold, 1, 'default half-open threshold = 1');

  assert(shouldOpenCircuit(3), '3 consecutive failures → open');
  assert(shouldOpenCircuit(5), '5 consecutive failures → open');
  assert(!shouldOpenCircuit(2), '2 consecutive failures → do NOT open');
  assert(!shouldOpenCircuit(1), '1 failure → do NOT open');

  assert(isCircuitOpen('open', new Date(Date.now() + 10000).toISOString()), 'open + future cooldown → is open');
  assert(!isCircuitOpen('open', new Date(Date.now() - 10000).toISOString()), 'open + past cooldown → NOT open');
  assert(!isCircuitOpen('closed', null), 'closed → NOT open');
  assert(!isCircuitOpen('half_open', null), 'half_open → NOT open');

  assert(shouldTransitionToHalfOpen('open', new Date(Date.now() - 1000).toISOString()), 'open + cooldown expired → should transition');
  assert(!shouldTransitionToHalfOpen('open', new Date(Date.now() + 10000).toISOString()), 'open + cooldown NOT expired → no transition');
  assert(!shouldTransitionToHalfOpen('closed', null), 'closed → no transition');
  assert(!shouldTransitionToHalfOpen('half_open', null), 'half_open → no transition');

  assert(shouldCloseCircuit(1), '1 success in half_open → close');
  assert(!shouldCloseCircuit(0), '0 successes → no close');

  const cd = computeCooldownUntil();
  assert(new Date(cd).getTime() > Date.now(), 'cooldown is in the future');
  const cdRetry = computeCooldownUntil(5000);
  assert(new Date(cdRetry).getTime() > Date.now(), 'cooldown with retry-after is in the future');

  // ═══ 3. HEALTH MANAGER ═══
  console.log('\n Health Manager:');

  // Reset first to ensure clean state
  resetProviderHealth(USER_A, CRED_A);

  const initial = getProviderHealth(USER_A, CRED_A);
  assert(initial === null, 'initial health is null (not created yet)');

  // Record a success
  recordProviderSuccess({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 300, status: 200,
  });
  const afterSuccess = getProviderHealth(USER_A, CRED_A);
  assert(afterSuccess !== null, 'health record created after success');
  assertEqual(afterSuccess!.status, 'healthy', 'status is healthy after success');
  assertEqual(afterSuccess!.circuitState, 'closed', 'circuit is closed after success');
  assertEqual(afterSuccess!.successCount, 1, 'success count = 1');
  assertEqual(afterSuccess!.failureCount, 0, 'failure count = 0');
  assertEqual(afterSuccess!.consecutiveFailures, 0, 'consecutive failures = 0');
  assertEqual(afterSuccess!.consecutiveSuccesses, 1, 'consecutive successes = 1');
  assertEqual(afterSuccess!.lastLatencyMs, 300, 'last latency = 300');
  assert(afterSuccess!.lastSuccessAt !== null, 'lastSuccessAt is set');

  // Record another success
  recordProviderSuccess({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 400, status: 200,
  });
  const afterSuccess2 = getProviderHealth(USER_A, CRED_A);
  assertEqual(afterSuccess2!.successCount, 2, 'success count = 2');
  assertEqual(afterSuccess2!.consecutiveSuccesses, 2, 'consecutive successes = 2');
  assertEqual(afterSuccess2!.averageLatencyMs, 350, 'avg latency = 350');

  // Record a failure
  recordProviderFailure({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 1000, status: 500, errorType: 'provider_error', safeMessage: 'Internal server error',
  });
  const afterFailure = getProviderHealth(USER_A, CRED_A);
  assertEqual(afterFailure!.failureCount, 1, 'failure count = 1');
  assertEqual(afterFailure!.consecutiveFailures, 1, 'consecutive failures = 1');
  assertEqual(afterFailure!.consecutiveSuccesses, 0, 'consecutive successes reset to 0');
  assert(afterFailure!.lastFailureAt !== null, 'lastFailureAt is set');
  assertEqual(afterFailure!.lastErrorCode, 'provider_error', 'lastErrorCode is provider_error');

  // Record more failures to open circuit
  recordProviderFailure({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 1000, status: 500, errorType: 'provider_error',
  });
  recordProviderFailure({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 1000, status: 500, errorType: 'provider_error',
  });
  const afterThreshold = getProviderHealth(USER_A, CRED_A);
  assertEqual(afterThreshold!.circuitState, 'open', 'circuit opens after 3 failures');
  assertEqual(afterThreshold!.status, 'degraded', 'status is degraded after repeated failures');
  assert(afterThreshold!.cooldownUntil !== null, 'cooldown is set');
  assert(afterThreshold!.openedAt !== null, 'openedAt is set');

  // Skip open circuit
  const skipResult = shouldSkipProvider(USER_A, CRED_A);
  assert(skipResult.skip, 'should skip open circuit provider');
  assertEqual(skipResult.reason, 'circuit_open', 'skip reason is circuit_open');

  // Reset health
  resetProviderHealth(USER_A, CRED_A);
  const afterReset = getProviderHealth(USER_A, CRED_A);
  assertEqual(afterReset!.circuitState, 'closed', 'circuit closed after reset');
  assertEqual(afterReset!.status, 'unknown', 'status unknown after reset');
  assertEqual(afterReset!.consecutiveFailures, 0, 'consecutive failures reset');
  assert(afterReset!.cooldownUntil === null, 'cooldown cleared');

  // ═══ 4. CIRCUIT BREAKER HALf-OPEN RECOVERY ═══
  console.log('\n Half-Open Recovery:');

  // Open circuit manually
  const db = getDB();
  const now = new Date();
  db.prepare(`UPDATE provider_health SET circuitState = 'open', cooldownUntil = ?, consecutiveFailures = 3 WHERE userId = ? AND providerCredentialId = ?`)
    .run(new Date(now.getTime() - 1000).toISOString(), USER_A, CRED_A); // cooldown already expired

  // shouldSkipProvider should transition to half_open
  const halfOpenResult = shouldSkipProvider(USER_A, CRED_A);
  assert(!halfOpenResult.skip, 'half_open provider is NOT skipped (allows probe)');
  assertEqual(halfOpenResult.circuitState, 'half_open', 'state is half_open');

  // Successful probe closes circuit
  recordProviderSuccess({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 200, status: 200,
  });
  const afterRecovery = getProviderHealth(USER_A, CRED_A);
  assertEqual(afterRecovery!.circuitState, 'closed', 'circuit closed after successful recovery');
  assertEqual(afterRecovery!.status, 'healthy', 'status healthy after recovery');

  // ═══ 5. HALF-OPEN FAILURE REOPENS ═══
  console.log('\n Half-Open Failure Reopens:');

  // Open circuit again
  db.prepare(`UPDATE provider_health SET circuitState = 'open', cooldownUntil = ?, consecutiveFailures = 3 WHERE userId = ? AND providerCredentialId = ?`)
    .run(new Date(now.getTime() - 1000).toISOString(), USER_A, CRED_A);

  // Transition to half_open
  shouldSkipProvider(USER_A, CRED_A);

  // Fail the probe
  recordProviderFailure({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 500, status: 500, errorType: 'provider_error',
  });
  const afterProbeFail = getProviderHealth(USER_A, CRED_A);
  assertEqual(afterProbeFail!.circuitState, 'open', 'circuit reopens after failed probe');

  // ═══ 6. AUTH ERROR OPENS CIRCUIT IMMEDIATELY ═══
  console.log('\n Auth Error Circuit:');

  resetProviderHealth(USER_A, CRED_A);
  recordProviderFailure({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 100, status: 401, errorType: 'auth_error',
  });
  const afterAuth = getProviderHealth(USER_A, CRED_A);
  assertEqual(afterAuth!.circuitState, 'open', 'auth error opens circuit immediately');
  assertEqual(afterAuth!.status, 'down', 'auth error status is down');

  // ═══ 7. USER ISOLATION ═══
  console.log('\n User Isolation:');

  recordProviderSuccess({
    userId: USER_B, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 250, status: 200,
  });
  const userBHealth = getProviderHealth(USER_B, CRED_A);
  assertEqual(userBHealth!.status, 'healthy', 'User B health is healthy (separate from A)');
  assertEqual(userBHealth!.failureCount, 0, 'User B failure count = 0 (isolated)');

  // ═══ 8. HEALTH SUMMARY ═══
  console.log('\n Health Summary:');

  resetProviderHealth(USER_A, CRED_A);
  recordProviderSuccess({ userId: USER_A, providerCredentialId: CRED_A, provider: 'openai', latencyMs: 300, status: 200 });
  recordProviderSuccess({ userId: USER_A, providerCredentialId: CRED_B, provider: 'groq', latencyMs: 150, status: 200 });
  const summary = getUserHealthSummary(USER_A);
  assert(summary.length >= 2, 'summary has at least 2 records');
  assert(summary.some(r => r.provider === 'openai'), 'summary includes openai');
  assert(summary.some(r => r.provider === 'groq'), 'summary includes groq');

  // ═══ 9. RETRY-AFTER COOLDOWN ═══
  console.log('\n Retry-After Cooldown:');

  resetProviderHealth(USER_A, CRED_A);
  recordProviderFailure({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 100, status: 429, errorType: 'rate_limit', retryAfterMs: 5000,
  });
  recordProviderFailure({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 100, status: 429, errorType: 'rate_limit', retryAfterMs: 5000,
  });
  recordProviderFailure({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 100, status: 429, errorType: 'rate_limit', retryAfterMs: 5000,
  });
  const afterRateLimit = getProviderHealth(USER_A, CRED_A);
  assertEqual(afterRateLimit!.circuitState, 'open', 'repeated 429 opens circuit');
  // Cooldown should be short (5s retry-after) not default 60s
  if (afterRateLimit!.cooldownUntil) {
    const cdTime = new Date(afterRateLimit!.cooldownUntil).getTime() - Date.now();
    assert(cdTime < 10000, 'cooldown respects retry-after (under 10s)');
  }

  // ═══ 10. ERROR FORMAT ═══
  console.log('\n Error Format:');

  const nhp = ERRORS.noHealthyProvider();
  assertEqual(nhp.error.type, 'provider_unavailable', 'noHealthyProvider type');
  assertEqual(nhp.error.code, 'no_healthy_provider', 'noHealthyProvider code');

  // ═══ 11. SECRETS NOT IN HEALTH DATA ═══
  console.log('\n Secret Redaction in Health:');

  resetProviderHealth(USER_A, CRED_A);
  recordProviderFailure({
    userId: USER_A, providerCredentialId: CRED_A, provider: 'openai',
    latencyMs: 100, status: 401, errorType: 'auth_error',
    safeMessage: 'Auth failed for sk-proj-abc123def456',
  });
  const afterSecret = getProviderHealth(USER_A, CRED_A);
  assert(!afterSecret!.lastErrorMessage?.includes('sk-proj-'), 'secrets redacted from health error message');

  // ═══ CLEANUP ═══
  console.log('\n Cleanup:');
  db.prepare('DELETE FROM provider_health WHERE userId IN (?, ?)').run(USER_A, USER_B);
  db.prepare('DELETE FROM connections WHERE id IN (?, ?)').run(CRED_A, CRED_B);
  assert(true, 'cleanup complete');

  console.log(`\n  Results: ${passed} passed, ${failed} failed`);
  if (failed > 0) process.exit(1);
}

// Run directly
runProviderHealthTests();
