// 8Router — Provider Health Manager (Phase 2D)

import { randomUUID } from 'crypto';
import { getDB } from '../../database.js';
import type { ProviderHealthRecord, RecordInput, HealthStatus, CircuitState } from './types.js';
import { classifyProviderError } from './classify-error.js';
import {
  shouldOpenCircuit, isCircuitOpen, shouldTransitionToHalfOpen,
  computeCooldownUntil, shouldCloseCircuit, getCircuitConfig,
} from './circuit-breaker.js';
import { redactSecrets } from '../../security/credentials/redact.js';

// ─── Ensure Table ───────────────────────────────────────────────────

function ensureTable(): void {
  const db = getDB();
  db.exec(`CREATE TABLE IF NOT EXISTS provider_health (
    id TEXT PRIMARY KEY,
    userId TEXT NOT NULL,
    providerCredentialId TEXT NOT NULL,
    provider TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'unknown',
    circuitState TEXT NOT NULL DEFAULT 'closed',
    successCount INTEGER DEFAULT 0,
    failureCount INTEGER DEFAULT 0,
    timeoutCount INTEGER DEFAULT 0,
    consecutiveFailures INTEGER DEFAULT 0,
    consecutiveSuccesses INTEGER DEFAULT 0,
    totalRequests INTEGER DEFAULT 0,
    averageLatencyMs INTEGER DEFAULT 0,
    lastLatencyMs INTEGER DEFAULT 0,
    lastSuccessAt TEXT,
    lastFailureAt TEXT,
    lastCheckedAt TEXT,
    lastErrorCode TEXT,
    lastErrorMessage TEXT,
    lastStatusCode INTEGER,
    cooldownUntil TEXT,
    openedAt TEXT,
    halfOpenAt TEXT,
    createdAt TEXT NOT NULL,
    updatedAt TEXT NOT NULL
  );
  CREATE INDEX IF NOT EXISTS idx_ph_user ON provider_health(userId);
  CREATE INDEX IF NOT EXISTS idx_ph_cred ON provider_health(providerCredentialId);
  CREATE UNIQUE INDEX IF NOT EXISTS idx_ph_user_cred ON provider_health(userId, providerCredentialId);
  `);
}

// ─── Get or Create ──────────────────────────────────────────────────

export function getProviderHealth(userId: string, credentialId: string): ProviderHealthRecord | null {
  ensureTable();
  const db = getDB();
  const row = db.prepare('SELECT * FROM provider_health WHERE userId = ? AND providerCredentialId = ?')
    .get(userId, credentialId) as ProviderHealthRecord | undefined;
  return row || null;
}

function getOrCreate(userId: string, credentialId: string, provider: string): ProviderHealthRecord {
  const existing = getProviderHealth(userId, credentialId);
  if (existing) return existing;

  const db = getDB();
  const now = new Date().toISOString();
  const id = randomUUID();
  const record: ProviderHealthRecord = {
    id, userId, providerCredentialId: credentialId, provider,
    status: 'unknown', circuitState: 'closed',
    successCount: 0, failureCount: 0, timeoutCount: 0,
    consecutiveFailures: 0, consecutiveSuccesses: 0, totalRequests: 0,
    averageLatencyMs: 0, lastLatencyMs: 0,
    lastSuccessAt: null, lastFailureAt: null, lastCheckedAt: null,
    lastErrorCode: null, lastErrorMessage: null, lastStatusCode: null,
    cooldownUntil: null, openedAt: null, halfOpenAt: null,
    createdAt: now, updatedAt: now,
  };
  db.prepare(`INSERT INTO provider_health (
    id, userId, providerCredentialId, provider, status, circuitState,
    successCount, failureCount, timeoutCount, consecutiveFailures, consecutiveSuccesses,
    totalRequests, averageLatencyMs, lastLatencyMs,
    lastSuccessAt, lastFailureAt, lastCheckedAt,
    lastErrorCode, lastErrorMessage, lastStatusCode,
    cooldownUntil, openedAt, halfOpenAt, createdAt, updatedAt
  ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
    id, userId, credentialId, provider, 'unknown', 'closed',
    0, 0, 0, 0, 0, 0, 0, 0,
    null, null, null, null, null, null, null, null, null, now, now
  );
  return record;
}

// ─── Record Success ─────────────────────────────────────────────────

export function recordProviderSuccess(input: RecordInput): void {
  ensureTable();
  const rec = getOrCreate(input.userId, input.providerCredentialId, input.provider);
  const db = getDB();
  const now = new Date().toISOString();

  const newSuccessCount = rec.successCount + 1;
  const newTotalRequests = rec.totalRequests + 1;
  const newConsecutiveFailures = 0;
  const newConsecutiveSuccesses = rec.consecutiveSuccesses + 1;
  const newAvgLatency = Math.round(
    (rec.averageLatencyMs * rec.totalRequests + input.latencyMs) / newTotalRequests
  );

  // If was half_open and succeeded → close circuit
  let newCircuitState: CircuitState = rec.circuitState;
  let newStatus: HealthStatus = 'healthy';
  let newCooldown: string | null = null;
  let newOpenedAt: string | null = rec.openedAt;
  let newHalfOpenAt: string | null = rec.halfOpenAt;

  if (rec.circuitState === 'half_open' && shouldCloseCircuit(newConsecutiveSuccesses)) {
    newCircuitState = 'closed';
    newHalfOpenAt = null;
    newOpenedAt = null;
  }

  db.prepare(`UPDATE provider_health SET
    status = ?, circuitState = ?, successCount = ?, failureCount = ?,
    consecutiveFailures = ?, consecutiveSuccesses = ?,
    totalRequests = ?, averageLatencyMs = ?, lastLatencyMs = ?,
    lastSuccessAt = ?, lastCheckedAt = ?,
    lastErrorCode = NULL, lastErrorMessage = NULL, lastStatusCode = NULL,
    cooldownUntil = ?, openedAt = ?, halfOpenAt = ?, updatedAt = ?
    WHERE userId = ? AND providerCredentialId = ?
  `).run(
    newStatus, newCircuitState, newSuccessCount, rec.failureCount,
    newConsecutiveFailures, newConsecutiveSuccesses,
    newTotalRequests, newAvgLatency, input.latencyMs,
    now, now, newCooldown, newOpenedAt, newHalfOpenAt, now,
    input.userId, input.providerCredentialId
  );
}

// ─── Record Failure ─────────────────────────────────────────────────

export function recordProviderFailure(input: RecordInput): void {
  ensureTable();
  const rec = getOrCreate(input.userId, input.providerCredentialId, input.provider);
  const db = getDB();
  const now = new Date().toISOString();

  const classification = classifyProviderError({
    status: input.status || input.statusCode,
    body: null,
    message: input.safeMessage,
    isTimeout: input.errorType === 'timeout',
    isNetworkError: input.errorType === 'network_error',
  });

  const newFailureCount = rec.failureCount + 1;
  const newTimeoutCount = rec.timeoutCount + (classification.type === 'timeout' ? 1 : 0);
  const newConsecutiveFailures = rec.consecutiveFailures + 1;
  const newTotalRequests = rec.totalRequests + 1;
  const newAvgLatency = Math.round(
    (rec.averageLatencyMs * rec.totalRequests + input.latencyMs) / newTotalRequests
  );

  // Determine circuit state
  let newCircuitState: CircuitState = rec.circuitState;
  let newCooldown: string | null = rec.cooldownUntil;
  let newOpenedAt: string | null = rec.openedAt;
  let newHalfOpenAt: string | null = rec.halfOpenAt;
  let newStatus: HealthStatus = rec.status;

  if (rec.circuitState === 'half_open') {
    // Half-open probe failed → reopen
    newCircuitState = 'open';
    newCooldown = computeCooldownUntil(input.retryAfterMs);
    newOpenedAt = now;
    newHalfOpenAt = null;
    newStatus = 'down';
  } else if (shouldOpenCircuit(newConsecutiveFailures)) {
    newCircuitState = 'open';
    newCooldown = computeCooldownUntil(input.retryAfterMs);
    newOpenedAt = now;
    newStatus = newConsecutiveFailures >= 6 ? 'down' : 'degraded';
  } else if (newConsecutiveFailures >= 2) {
    newStatus = 'degraded';
  } else {
    newStatus = 'degraded';
  }

  // Auth errors → mark down immediately
  if (classification.type === 'auth_error') {
    newStatus = 'down';
    newCircuitState = 'open';
    newCooldown = computeCooldownUntil();
    newOpenedAt = now;
  }

  const safeMsg = classification.safeMessage
    ? redactSecrets(classification.safeMessage)
    : null;

  db.prepare(`UPDATE provider_health SET
    status = ?, circuitState = ?, failureCount = ?, timeoutCount = ?,
    consecutiveFailures = ?, consecutiveSuccesses = 0,
    totalRequests = ?, averageLatencyMs = ?, lastLatencyMs = ?,
    lastFailureAt = ?, lastCheckedAt = ?,
    lastErrorCode = ?, lastErrorMessage = ?, lastStatusCode = ?,
    cooldownUntil = ?, openedAt = ?, halfOpenAt = ?, updatedAt = ?
    WHERE userId = ? AND providerCredentialId = ?
  `).run(
    newStatus, newCircuitState, newFailureCount, newTimeoutCount,
    newConsecutiveFailures, newTotalRequests, newAvgLatency, input.latencyMs,
    now, now, classification.type, safeMsg, input.status || input.statusCode || null,
    newCooldown, newOpenedAt, newHalfOpenAt, now,
    input.userId, input.providerCredentialId
  );
}

// ─── Should Skip? ───────────────────────────────────────────────────

export function shouldSkipProvider(userId: string, credentialId: string): { skip: boolean; reason?: string; circuitState?: CircuitState } {
  const rec = getProviderHealth(userId, credentialId);
  if (!rec) return { skip: false };

  // If circuit is open and cooldown hasn't expired → skip
  if (isCircuitOpen(rec.circuitState, rec.cooldownUntil)) {
    return { skip: true, reason: 'circuit_open', circuitState: 'open' };
  }

  // If cooldown expired → transition to half_open (allow probe)
  if (shouldTransitionToHalfOpen(rec.circuitState, rec.cooldownUntil)) {
    const db = getDB();
    const now = new Date().toISOString();
    db.prepare('UPDATE provider_health SET circuitState = ?, halfOpenAt = ?, updatedAt = ? WHERE id = ?')
      .run('half_open', now, now, rec.id);
    return { skip: false, circuitState: 'half_open' };
  }

  return { skip: false, circuitState: rec.circuitState };
}

// ─── Reset ──────────────────────────────────────────────────────────

export function resetProviderHealth(userId: string, credentialId: string): void {
  ensureTable();
  const db = getDB();
  const now = new Date().toISOString();
  const rec = getProviderHealth(userId, credentialId);
  if (!rec) return;

  db.prepare(`UPDATE provider_health SET
    status = 'unknown', circuitState = 'closed',
    consecutiveFailures = 0, consecutiveSuccesses = 0,
    cooldownUntil = NULL, openedAt = NULL, halfOpenAt = NULL,
    lastErrorCode = NULL, lastErrorMessage = NULL, lastStatusCode = NULL,
    updatedAt = ?
    WHERE id = ?
  `).run(now, rec.id);
}

// ─── Get All for User ───────────────────────────────────────────────

export function getUserHealthSummary(userId: string): ProviderHealthRecord[] {
  ensureTable();
  const db = getDB();
  return db.prepare('SELECT * FROM provider_health WHERE userId = ?').all(userId) as ProviderHealthRecord[];
}
