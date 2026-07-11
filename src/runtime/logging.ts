// 8Router — Runtime Request Logging (Phase 2E — Enhanced)
// Safe metadata logging — no secrets, no prompts, no response bodies

import { randomUUID } from 'crypto';
import { getDB } from '../database.js';
import { redactSecrets } from '../security/credentials/redact.js';
import { estimateModelCost } from './usage/pricing.js';

// ─── Request Log ─────────────────────────────────────────────────

export interface LogRequestInput {
  userId: string;
  accessKeyId: string;
  accessKeyName?: string;
  accessKeyHint?: string;
  endpoint?: string;
  method?: string;
  requestedModel: string;
  requestedAlias?: string;
  routeMode?: string;
  actualProvider?: string;
  actualModel?: string;
  status: string;
  httpStatus?: number;
  latencyMs?: number;
  fallbackCount?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  errorType?: string;
  errorCode?: string;
  errorMessage?: string;
  providerHealthStatus?: string;
  circuitState?: string;
  streaming?: boolean;
  clientUserAgent?: string;
  clientTool?: string;
}

export function logRuntimeRequest(input: LogRequestInput): string | null {
  try {
    const db = getDB();
    const id = randomUUID();
    const now = new Date().toISOString();
    const success = input.status === 'success' ? 1 : 0;

    // Estimate cost
    let estimatedInputCost: number | null = null;
    let estimatedOutputCost: number | null = null;
    let estimatedTotalCost: number | null = null;
    const model = input.actualModel || input.requestedModel;
    if (input.inputTokens && input.outputTokens) {
      const est = estimateModelCost(model, input.inputTokens, input.outputTokens);
      if (est) {
        estimatedInputCost = Math.round(est.inputCost * 1000000) / 1000000;
        estimatedOutputCost = Math.round(est.outputCost * 1000000) / 1000000;
        estimatedTotalCost = Math.round(est.totalCost * 1000000) / 1000000;
      }
    }

    const safeError = input.errorMessage ? redactSecrets(input.errorMessage).slice(0, 500) : null;
    const hadFallback = (input.fallbackCount && input.fallbackCount > 0) ? 1 : 0;

    db.prepare(`
      INSERT INTO runtime_request_logs (
        id, userId, accessKeyId, accessKeyName, accessKeyHint, requestId, traceId,
        endpoint, method, requestedModel, requestedAlias, routeMode,
        actualProvider, actualModel, status, httpStatus, success,
        startedAt, completedAt, latencyMs,
        inputTokens, outputTokens, totalTokens, reasoningTokens, cachedInputTokens,
        estimatedInputCost, estimatedOutputCost, estimatedTotalCost, currency,
        fallbackCount, hadFallback, attemptCount,
        errorType, errorCode, errorMessage,
        providerHealthStatus, circuitState, streaming,
        clientUserAgent, clientTool, createdAt, updatedAt
      ) VALUES (
        ?, ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?, ?,
        ?, ?, ?, 'USD',
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?,
        ?, ?, ?, ?
      )
    `).run(
      id, input.userId, input.accessKeyId,
      input.accessKeyName || null, input.accessKeyHint || null,
      id, null, // requestId = id, traceId null
      input.endpoint || '/v1/chat/completions', input.method || 'POST',
      input.requestedModel, input.requestedAlias || null, input.routeMode || null,
      input.actualProvider || null, input.actualModel || null,
      input.status, input.httpStatus || null, success,
      now, now, input.latencyMs || null,
      input.inputTokens || null, input.outputTokens || null, input.totalTokens || null,
      input.reasoningTokens || null, input.cachedInputTokens || null,
      estimatedInputCost, estimatedOutputCost, estimatedTotalCost,
      hadFallback, input.fallbackCount || 0, null, // attemptCount set later
      input.errorType || null, input.errorCode || null, safeError,
      input.providerHealthStatus || null, input.circuitState || null,
      input.streaming ? 1 : 0,
      input.clientUserAgent || null, input.clientTool || null,
      now, now,
    );

    return id;
  } catch {
    return null; // logging must not break requests
  }
}

// ─── Attempt Log ─────────────────────────────────────────────────

export interface LogAttemptInput {
  requestLogId: string;
  userId: string;
  attemptIndex: number;
  provider: string;
  model: string;
  baseUrlHost?: string;
  latencyMs?: number;
  status: string;
  httpStatus?: number;
  failureType?: string;
  errorCode?: string;
  errorMessage?: string;
  circuitStateBefore?: string;
  circuitStateAfter?: string;
  healthStatusBefore?: string;
  healthStatusAfter?: string;
  retryAfterMs?: number;
  cooldownUntil?: string;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
}

export function logAttempt(input: LogAttemptInput): string | null {
  try {
    const db = getDB();
    const id = randomUUID();
    const now = new Date().toISOString();
    const success = input.status === 'success' ? 1 : 0;

    let estimatedCost: number | null = null;
    if (input.inputTokens && input.outputTokens) {
      const est = estimateModelCost(input.model, input.inputTokens, input.outputTokens);
      if (est) estimatedCost = Math.round(est.totalCost * 1000000) / 1000000;
    }

    const safeError = input.errorMessage ? redactSecrets(input.errorMessage).slice(0, 500) : null;

    db.prepare(`
      INSERT INTO runtime_request_attempts (
        id, requestLogId, userId, attemptIndex, provider, model, baseUrlHost,
        startedAt, completedAt, latencyMs, status, httpStatus, success,
        failureType, errorCode, errorMessage,
        circuitStateBefore, circuitStateAfter, healthStatusBefore, healthStatusAfter,
        retryAfterMs, cooldownUntil,
        inputTokens, outputTokens, totalTokens, estimatedCost, currency, createdAt
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'USD', ?)
    `).run(
      id, input.requestLogId, input.userId, input.attemptIndex,
      input.provider, input.model, input.baseUrlHost || null,
      now, now, input.latencyMs || null, input.status, input.httpStatus || null, success,
      input.failureType || null, input.errorCode || null, safeError,
      input.circuitStateBefore || null, input.circuitStateAfter || null,
      input.healthStatusBefore || null, input.healthStatusAfter || null,
      input.retryAfterMs || null, input.cooldownUntil || null,
      input.inputTokens || null, input.outputTokens || null, input.totalTokens || null,
      estimatedCost, now,
    );

    return id;
  } catch {
    return null;
  }
}

// ─── Finalize Request Log ────────────────────────────────────────

export function finalizeRequestLog(requestLogId: string, updates: {
  status?: string;
  actualProvider?: string;
  actualModel?: string;
  latencyMs?: number;
  httpStatus?: number;
  inputTokens?: number;
  outputTokens?: number;
  totalTokens?: number;
  reasoningTokens?: number;
  cachedInputTokens?: number;
  fallbackCount?: number;
  attemptCount?: number;
  finalAttemptId?: string;
  errorType?: string;
  errorCode?: string;
  errorMessage?: string;
  providerHealthStatus?: string;
  circuitState?: string;
}): void {
  try {
    const db = getDB();
    const sets: string[] = ['updatedAt = ?'];
    const params: any[] = [new Date().toISOString()];

    for (const [key, val] of Object.entries(updates)) {
      if (val !== undefined) {
        sets.push(`${key} = ?`);
        params.push(key === 'errorMessage' ? (val ? redactSecrets(String(val)).slice(0, 500) : null) : val);
      }
    }

    // Recalculate cost if tokens were updated
    if (updates.inputTokens && updates.outputTokens) {
      const log = db.prepare('SELECT actualModel, requestedModel FROM runtime_request_logs WHERE id = ?').get(requestLogId) as any;
      const model = log?.actualModel || log?.requestedModel;
      if (model) {
        const est = estimateModelCost(model, updates.inputTokens, updates.outputTokens);
        if (est) {
          sets.push('estimatedInputCost = ?', 'estimatedOutputCost = ?', 'estimatedTotalCost = ?');
          params.push(
            Math.round(est.inputCost * 1000000) / 1000000,
            Math.round(est.outputCost * 1000000) / 1000000,
            Math.round(est.totalCost * 1000000) / 1000000,
          );
        }
      }
    }

    // Set success flag
    if (updates.status) {
      sets.push('success = ?');
      params.push(updates.status === 'success' ? 1 : 0);
    }

    // Set hadFallback flag when fallbackCount is updated
    if (updates.fallbackCount !== undefined) {
      sets.push('hadFallback = ?');
      params.push(updates.fallbackCount > 0 ? 1 : 0);
    }

    sets.push('completedAt = ?');
    params.push(new Date().toISOString());

    params.push(requestLogId);
    db.prepare(`UPDATE runtime_request_logs SET ${sets.join(', ')} WHERE id = ?`).run(...params);
  } catch {
    // finalize must not break requests
  }
}
