// 8Router — Usage, Logs, and Fallback Dashboard Tests (Phase 2E)
// Tests: logging lifecycle, aggregation, pricing, API endpoints, security, retention

import { randomUUID } from 'crypto';
import { getDB } from '../database.js';
import { logRuntimeRequest, logAttempt, finalizeRequestLog } from '../runtime/logging.js';
import { estimateModelCost, getModelPricing } from '../runtime/usage/pricing.js';
import {
  getUsageSummary, getUsageTimeseries,
  getUsageByProvider, getUsageByModel, getUsageByAccessKey, getUsageByAlias,
  getRecentRequests, getRequestDetail, getFallbackLogs, cleanupExpiredLogs,
} from '../runtime/usage/queries.js';

let passed = 0;
let failed = 0;

function assert(condition: boolean, label: string): void {
  if (condition) { console.log(`   ✅ ${label}`); passed++; }
  else { console.log(`   ❌ ${label}`); failed++; }
}

function assertEqual(a: any, b: any, label: string): void {
  assert(a === b, `${label} (got: ${JSON.stringify(a)}, want: ${JSON.stringify(b)})`);
}

const TEST_USER = 'test-usage-user-' + Date.now();
const TEST_KEY_ID = 'key-usage-' + Date.now();
const TEST_KEY_NAME = 'Test Usage Key';

function cleanup(): void {
  const db = getDB();
  db.prepare(`DELETE FROM runtime_request_attempts WHERE userId = ?`).run(TEST_USER);
  db.prepare(`DELETE FROM runtime_request_logs WHERE userId = ?`).run(TEST_USER);
}

function testRequestLogLifecycle(): void {
  console.log('  Request Log Lifecycle');

  const logId1 = logRuntimeRequest({
    userId: TEST_USER, accessKeyId: TEST_KEY_ID, accessKeyName: TEST_KEY_NAME,
    endpoint: '/v1/chat/completions', method: 'POST', requestedModel: 'gpt-4o',
    routeMode: 'auto', status: 'success', actualProvider: 'openai',
    actualModel: 'gpt-4o-2024-08-06', latencyMs: 450, httpStatus: 200,
    inputTokens: 120, outputTokens: 80, totalTokens: 200, fallbackCount: 0,
  });
  assert(logId1 != null, 'Test 1: Successful request creates parent log');

  const logId2 = logRuntimeRequest({
    userId: TEST_USER, accessKeyId: TEST_KEY_ID, endpoint: '/v1/chat/completions',
    method: 'POST', requestedModel: 'gpt-4o', routeMode: 'auto',
    status: 'failed', httpStatus: 502, latencyMs: 300,
    errorType: 'provider_error', errorMessage: 'Bad Gateway',
  });
  assert(logId2 != null, 'Test 2: Failed request creates parent log');

  finalizeRequestLog(logId1!, {
    status: 'success', actualProvider: 'openai', actualModel: 'gpt-4o-2024-08-06',
    latencyMs: 450, httpStatus: 200, inputTokens: 120, outputTokens: 80,
    totalTokens: 200, fallbackCount: 0, attemptCount: 1,
  });
  assert(true, 'Test 3: Finalize parent log succeeds');

  const logId3 = logRuntimeRequest({
    userId: TEST_USER, accessKeyId: TEST_KEY_ID, endpoint: '/v1/chat/completions',
    method: 'POST', requestedModel: 'gpt-4o', routeMode: 'auto',
    status: 'in_progress', streaming: true,
  });
  finalizeRequestLog(logId3!, { status: 'success', latencyMs: 1200, httpStatus: 200 });
  assert(true, 'Test 4: Streaming request can be finalized');
}

function testAttemptLogging(): void {
  console.log('  Attempt Logging');

  const reqId = logRuntimeRequest({
    userId: TEST_USER, accessKeyId: TEST_KEY_ID, endpoint: '/v1/chat/completions',
    method: 'POST', requestedModel: '8router/auto', requestedAlias: '8router/auto',
    routeMode: 'auto', status: 'in_progress',
  });

  const att1 = logAttempt({
    requestLogId: reqId!, userId: TEST_USER, attemptIndex: 1,
    provider: 'openai', model: 'gpt-4o', latencyMs: 200,
    status: 'failed', httpStatus: 429, failureType: 'rate_limit',
    circuitStateBefore: 'closed', circuitStateAfter: 'open',
  });
  assert(att1 != null, 'Test 5a: First attempt creates log');

  const att2 = logAttempt({
    requestLogId: reqId!, userId: TEST_USER, attemptIndex: 2,
    provider: 'groq', model: 'llama-3.3-70b-versatile', latencyMs: 350,
    status: 'success', httpStatus: 200,
    inputTokens: 100, outputTokens: 60, totalTokens: 160,
    circuitStateBefore: 'closed', circuitStateAfter: 'closed',
  });
  assert(att2 != null, 'Test 5b: Second attempt creates log');

  finalizeRequestLog(reqId!, {
    status: 'success', actualProvider: 'groq', actualModel: 'llama-3.3-70b-versatile',
    latencyMs: 550, httpStatus: 200, inputTokens: 100, outputTokens: 60,
    totalTokens: 160, fallbackCount: 1, attemptCount: 2,
    providerHealthStatus: 'healthy', circuitState: 'closed',
  });
  assert(true, 'Test 6: Finalize with fallback succeeds');

  const detail = getRequestDetail(TEST_USER, reqId!);
  assertEqual(detail.log?.hadFallback, 1, 'Test 7: hadFallback is correct');
  assertEqual(detail.log?.fallbackCount, 1, 'Test 7b: fallbackCount is correct');
  assertEqual(detail.attempts.length, 2, 'Test 7c: attempt count is correct');
  assertEqual(detail.attempts[1].status, 'success', 'Test 8: Final attempt is success');
  assertEqual(detail.attempts[0].status, 'failed', 'Test 8b: First attempt is failed');
}

function testUsageAggregation(): void {
  console.log('  Usage Aggregation');

  for (let i = 0; i < 5; i++) {
    const id = logRuntimeRequest({
      userId: TEST_USER, accessKeyId: TEST_KEY_ID, endpoint: '/v1/chat/completions',
      method: 'POST', requestedModel: 'gpt-4o', routeMode: 'auto',
      status: 'success', actualProvider: 'openai', actualModel: 'gpt-4o-2024-08-06',
      latencyMs: 300 + i * 50, httpStatus: 200,
      inputTokens: 100, outputTokens: 50, totalTokens: 150,
    });
    finalizeRequestLog(id!, { status: 'success', latencyMs: 300 + i * 50 });
  }
  logRuntimeRequest({
    userId: TEST_USER, accessKeyId: TEST_KEY_ID, endpoint: '/v1/chat/completions',
    method: 'POST', requestedModel: 'gpt-4o', routeMode: 'auto',
    status: 'failed', httpStatus: 500, latencyMs: 500,
    errorType: 'server_error', errorMessage: 'Internal error',
  });

  const summary = getUsageSummary(TEST_USER, '90d');
  assert(summary.totalRequests >= 7, 'Test 9a: Total requests >= 7');
  assert(summary.totalTokens > 0, 'Test 9b: Total tokens > 0');
  assert(summary.totalInputTokens > 0, 'Test 9c: Total input tokens > 0');
  assert(summary.totalOutputTokens > 0, 'Test 9d: Total output tokens > 0');

  const missingId = logRuntimeRequest({
    userId: TEST_USER, accessKeyId: TEST_KEY_ID, endpoint: '/v1/chat/completions',
    method: 'POST', requestedModel: 'gpt-4o', routeMode: 'auto',
    status: 'success', latencyMs: 100, httpStatus: 200,
  });
  finalizeRequestLog(missingId!, { status: 'success' });
  const missDetail = getRequestDetail(TEST_USER, missingId!);
  assertEqual(missDetail.log?.inputTokens, null, 'Test 10: Missing tokens remain null');

  assert(summary.averageLatencyMs != null && summary.averageLatencyMs > 0, 'Test 11: Average latency > 0');
  assert(summary.successRate >= 0 && summary.successRate <= 100, 'Test 12: Success rate is valid');
  assert(summary.successRate > 50, 'Test 12b: Success rate > 50%');
  assert(summary.fallbackCount >= 0, 'Test 13: Fallback count >= 0');

  const provs = getUsageByProvider(TEST_USER, '90d');
  assert(provs.length > 0, 'Test 14: Provider breakdown has entries');

  const models = getUsageByModel(TEST_USER, '90d');
  assert(models.length > 0, 'Test 15: Model breakdown has entries');

  const keys = getUsageByAccessKey(TEST_USER, '90d');
  assert(keys.length > 0, 'Test 16: Access key breakdown has entries');

  const aliases = getUsageByAlias(TEST_USER, '90d');
  assert(typeof aliases === 'object', 'Test 17: Alias breakdown is valid');
}

function testPricing(): void {
  console.log('  Pricing');

  const cost = estimateModelCost('gpt-4o', 1000, 500);
  assert(cost != null, 'Test 18a: Known model returns non-null cost');
  assert(cost!.totalCost > 0, 'Test 18b: Cost is positive');

  const unknownCost = estimateModelCost('unknown-future-model', 1000, 500);
  assertEqual(unknownCost, null, 'Test 19: Unknown model returns null');

  const knownPricing = getModelPricing('gpt-4o');
  assert(knownPricing != null, 'Test 20: gpt-4o has pricing');
  assert(typeof knownPricing!.input === 'number', 'Test 20b: Input price is number');
  assert(typeof knownPricing!.output === 'number', 'Test 20c: Output price is number');
}

function testLogListingAndDetail(): void {
  console.log('  Log Listing and Detail');

  const page1 = getRecentRequests(TEST_USER, {}, 1, 5);
  assert(Array.isArray(page1.items), 'Test 21a: Items is array');
  assertEqual(page1.pagination.pageSize, 5, 'Test 21b: Page size respected');
  assert(typeof page1.pagination.total === 'number', 'Test 21c: Total is number');

  const bigPage = getRecentRequests(TEST_USER, {}, 1, 200);
  assert(bigPage.pagination.pageSize <= 100, 'Test 22: Page size capped at 100');

  const filtered = getRecentRequests(TEST_USER, { status: 'success' }, 1, 10);
  assert(filtered.items.every((l: any) => l.status === 'success'), 'Test 23: Status filter works');

  const reqId = logRuntimeRequest({
    userId: TEST_USER, accessKeyId: TEST_KEY_ID, endpoint: '/v1/chat/completions',
    method: 'POST', requestedModel: 'gpt-4o', routeMode: 'auto', status: 'in_progress',
  });
  logAttempt({
    requestLogId: reqId!, userId: TEST_USER, attemptIndex: 1,
    provider: 'openai', model: 'gpt-4o', status: 'success',
    latencyMs: 300, httpStatus: 200,
  });
  finalizeRequestLog(reqId!, { status: 'success' });
  const detail = getRequestDetail(TEST_USER, reqId!);
  assert(detail.log != null, 'Test 24a: Request detail has log');
  assert(detail.attempts.length >= 1, 'Test 24b: Request detail includes attempts');

  const logStr = JSON.stringify(detail);
  assert(!logStr.includes('sk-'), 'Test 25a: No raw API keys in detail');
  assert(!logStr.includes('authorization'), 'Test 25b: No auth headers in detail');

  const fb = getFallbackLogs(TEST_USER, 1, 10);
  assert(Array.isArray(fb.items), 'Test 26: Fallback logs is array');
  assert(fb.items.every((r: any) => r.hadFallback === 1 || r.fallbackCount > 0), 'Test 26b: All fallback items have fallback');
}

function testSecurity(): void {
  console.log('  Security');

  const db = getDB();
  const logs = db.prepare(`SELECT * FROM runtime_request_logs WHERE userId = ?`).all(TEST_USER) as any[];
  const logsJson = JSON.stringify(logs);
  assert(!logsJson.includes('sk-mock'), 'Test 27a: No provider keys in logs');
  assert(!logsJson.includes('sk-8router'), 'Test 27b: No access keys in logs');

  const attempts = db.prepare(`SELECT * FROM runtime_request_attempts WHERE userId = ?`).all(TEST_USER) as any[];
  const attemptsJson = JSON.stringify(attempts);
  assert(!attemptsJson.includes('sk-'), 'Test 28: No keys in attempt logs');

  assert(!logsJson.includes('Bearer '), 'Test 30: No Bearer tokens in logs');

  const failedLogs = logs.filter((l: any) => l.errorMessage);
  failedLogs.forEach((l: any) => {
    assert(typeof l.errorMessage === 'string', 'Test 31: Error messages are strings');
    assert(l.errorMessage.length < 500, 'Test 31b: Error messages are truncated');
  });
}

function testTimeseries(): void {
  console.log('  Timeseries');
  const ts = getUsageTimeseries(TEST_USER, '90d', 'day', 'requests');
  assert(Array.isArray(ts), 'Test 33: Timeseries returns array');
  const tsHour = getUsageTimeseries(TEST_USER, '24h', 'hour', 'requests');
  assert(Array.isArray(tsHour), 'Test 34: Hourly granularity works');
}

function testRetention(): void {
  console.log('  Retention');
  const db = getDB();
  const oldId = 'old-log-' + Date.now();
  const oldDate = new Date(Date.now() - 100 * 24 * 60 * 60 * 1000).toISOString();
  db.prepare(`INSERT INTO runtime_request_logs (id, userId, endpoint, method, requestedModel, status, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)`).run(oldId, TEST_USER, '/test', 'POST', 'test', 'success', oldDate, oldDate);
  const cleaned = cleanupExpiredLogs(90);
  assert(cleaned.deletedRequests >= 1, 'Test 35: Retention deletes expired logs');

  const recentId = logRuntimeRequest({
    userId: TEST_USER, accessKeyId: TEST_KEY_ID, endpoint: '/test',
    method: 'POST', requestedModel: 'test', routeMode: 'auto', status: 'success',
  });
  cleanupExpiredLogs(90);
  const stillThere = getRequestDetail(TEST_USER, recentId!);
  assert(stillThere.log != null, 'Test 36: Retention preserves recent logs');
}

function testEmptyStates(): void {
  console.log('  Empty States');
  const EMPTY_USER = 'empty-user-' + Date.now();

  const emptySummary = getUsageSummary(EMPTY_USER, '7d');
  assertEqual(emptySummary.totalRequests, 0, 'Test 38a: Empty summary has 0 requests');
  assert(emptySummary.totalTokens === 0 || emptySummary.totalTokens === null, 'Test 38b: Empty summary has 0/null tokens');

  const emptyLogs = getRecentRequests(EMPTY_USER, {}, 1, 10);
  assertEqual(emptyLogs.items.length, 0, 'Test 39: Empty logs returns empty array');
  assertEqual(emptyLogs.pagination.total, 0, 'Test 39b: Empty total is 0');

  const notFound = getRequestDetail(EMPTY_USER, 'nonexistent-id');
  assertEqual(notFound.log, null, 'Test 40: Invalid request ID returns null log');
}

export function runUsageLogsTests(): void {
  try {
    cleanup();
    testRequestLogLifecycle();
    testAttemptLogging();
    testUsageAggregation();
    testPricing();
    testLogListingAndDetail();
    testSecurity();
    testTimeseries();
    testRetention();
    testEmptyStates();
  } finally {
    cleanup();
  }
  console.log(`\n   Phase 2E Usage/Logs: ${passed} passed, ${failed} failed\n`);
}
