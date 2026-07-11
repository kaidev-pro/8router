// 8Router — Runtime Logging
// Safe runtime request logging — no secrets

import { getDB } from '../database.js';
import { redactSecrets } from '../security/credentials/redact.js';

/**
 * Log a runtime request. Stores only safe metadata.
 */
export function logRuntimeRequest(
  accessKeyId: string,
  userId: string,
  requestedModel: string,
  actualProvider: string,
  actualModel: string,
  routeMode: string,
  status: string,
  httpStatus: number,
  latencyMs: number,
  fallbackCount: number,
  errorMessage: string | null
): void {
  try {
    const db = getDB();
    const id = crypto.randomUUID?.() || `log_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const now = new Date().toISOString();

    // Check if table exists
    const tableExists = db.prepare(
      "SELECT name FROM sqlite_master WHERE type='table' AND name='runtime_request_logs'"
    ).get();

    if (!tableExists) return; // Table not created yet — skip silently

    db.prepare(`INSERT INTO runtime_request_logs (
      id, accessKeyId, userId, requestedModel, actualProvider, actualModel,
      routeMode, status, httpStatus, latencyMs, fallbackCount,
      errorMessage, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`).run(
      id, accessKeyId, userId,
      requestedModel,
      actualProvider, actualModel,
      routeMode, status, httpStatus, latencyMs, fallbackCount,
      errorMessage ? redactSecrets(errorMessage) : null,
      now
    );
  } catch {
    // Don't let logging failures break requests
  }
}
