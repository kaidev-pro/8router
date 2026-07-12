// 8Router — Canonical Experiment Retention (Phase 3A)
// Non-blocking cleanup of expired experiment logs.
// Never touches runtime_request_logs.

import Database from 'better-sqlite3';
import { getShadowProductionConfig } from './config.js';

type DB = Database.Database;

/**
 * Clean up expired canonical experiment logs.
 * Non-blocking, non-fatal — errors are swallowed.
 * Only deletes from canonical_experiment_logs, never touches runtime_request_logs.
 */
export function cleanupExpiredExperimentLogs(db: DB): { deleted: number; error: boolean } {
  const config = getShadowProductionConfig();
  const retentionDays = config.logRetentionDays;

  try {
    const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString();
    const result = db.prepare(
      'DELETE FROM canonical_experiment_logs WHERE created_at < ?'
    ).run(cutoff);

    const deleted = result.changes || 0;
    return { deleted, error: false };
  } catch (err) {
    // Cleanup failure is non-fatal — log but don't propagate
    const msg = err instanceof Error ? err.message : 'unknown';
    console.warn(`[canonical-experiment] retention cleanup failed: ${msg.slice(0, 200)}`);
    return { deleted: 0, error: true };
  }
}

/**
 * Get retention stats — how many logs exist and when the oldest was created.
 */
export function getRetentionStats(db: DB): { total: number; oldestAt: string | null; error: boolean } {
  try {
    const total = (db.prepare(
      'SELECT COUNT(*) as count FROM canonical_experiment_logs'
    ).get() as { count: number })?.count || 0;

    const oldest = (db.prepare(
      'SELECT created_at FROM canonical_experiment_logs ORDER BY created_at ASC LIMIT 1'
    ).get() as { created_at: string } | undefined)?.created_at || null;

    return { total, oldestAt: oldest, error: false };
  } catch {
    return { total: 0, oldestAt: null, error: true };
  }
}
