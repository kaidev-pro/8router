// 8Router — Dynamic Provider State Persistence
// Persists dynamic models, overrides, certification evidence, discovery history, operational metadata
// Static descriptors from provider-foundation.ts remain canonical

import Database from 'better-sqlite3';

// ═══════════════════════════════════════════════════════════════
// Schema
// ═══════════════════════════════════════════════════════════════

export function initDynamicProviderTables(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS provider_model_registry (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      source TEXT NOT NULL DEFAULT 'dynamic' CHECK(source IN ('dynamic', 'override', 'imported')),
      discovered_at TEXT NOT NULL DEFAULT (datetime('now')),
      last_verified TEXT,
      stale INTEGER NOT NULL DEFAULT 0,
      UNIQUE(provider_id, model_id)
    );

    CREATE TABLE IF NOT EXISTS provider_model_overrides (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id TEXT NOT NULL,
      model_id TEXT NOT NULL,
      display_name TEXT NOT NULL,
      enabled INTEGER NOT NULL DEFAULT 1,
      reason TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(provider_id, model_id)
    );

    CREATE TABLE IF NOT EXISTS provider_certification_evidence (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id TEXT NOT NULL,
      capability TEXT NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('UNKNOWN', 'EXPERIMENTAL', 'PARTIAL', 'CERTIFIED', 'DEPRECATED', 'FAILED')),
      evidence TEXT,
      tested_at TEXT NOT NULL DEFAULT (datetime('now')),
      expires_at TEXT,
      notes TEXT
    );

    CREATE TABLE IF NOT EXISTS provider_discovery_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id TEXT NOT NULL,
      models_discovered INTEGER NOT NULL DEFAULT 0,
      new_models TEXT,
      removed_models TEXT,
      source TEXT NOT NULL DEFAULT 'dry-run' CHECK(source IN ('dry-run', 'api', 'manual')),
      dry_run INTEGER NOT NULL DEFAULT 1,
      discovered_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS provider_operational_metadata (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      provider_id TEXT NOT NULL UNIQUE,
      last_health_check TEXT,
      last_latency_ms REAL,
      last_error TEXT,
      last_error_at TEXT,
      total_requests INTEGER NOT NULL DEFAULT 0,
      total_errors INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_pmr_provider ON provider_model_registry(provider_id);
    CREATE INDEX IF NOT EXISTS idx_pmr_source ON provider_model_registry(source);
    CREATE INDEX IF NOT EXISTS idx_pmr_stale ON provider_model_registry(stale);
    CREATE INDEX IF NOT EXISTS idx_pmo_provider ON provider_model_overrides(provider_id);
    CREATE INDEX IF NOT EXISTS idx_pmo_enabled ON provider_model_overrides(enabled);
    CREATE INDEX IF NOT EXISTS idx_pce_provider ON provider_certification_evidence(provider_id);
    CREATE INDEX IF NOT EXISTS idx_pce_capability ON provider_certification_evidence(capability);
    CREATE INDEX IF NOT EXISTS idx_pce_status ON provider_certification_evidence(status);
    CREATE INDEX IF NOT EXISTS idx_pdh_provider ON provider_discovery_history(provider_id);
    CREATE INDEX IF NOT EXISTS idx_pdh_dry_run ON provider_discovery_history(dry_run);
    CREATE INDEX IF NOT EXISTS idx_pom_provider ON provider_operational_metadata(provider_id);
  `);
}

// ═══════════════════════════════════════════════════════════════
// Dynamic Model Registry
// ═══════════════════════════════════════════════════════════════

export function persistDynamicModel(db: Database.Database, providerId: string, modelId: string, displayName: string): void {
  db.prepare(`INSERT OR REPLACE INTO provider_model_registry (provider_id, model_id, display_name, source, discovered_at) VALUES (?, ?, ?, 'dynamic', datetime('now'))`).run(providerId, modelId, displayName);
}

export function persistOverride(db: Database.Database, providerId: string, modelId: string, displayName: string, enabled: boolean, reason?: string): void {
  db.prepare(`INSERT OR REPLACE INTO provider_model_overrides (provider_id, model_id, display_name, enabled, reason, updated_at) VALUES (?, ?, ?, ?, ?, datetime('now'))`).run(providerId, modelId, displayName, enabled ? 1 : 0, reason ?? null);
}

export function getDynamicModels(db: Database.Database, providerId?: string): any[] {
  if (providerId) return db.prepare('SELECT * FROM provider_model_registry WHERE provider_id = ? ORDER BY model_id').all(providerId);
  return db.prepare('SELECT * FROM provider_model_registry ORDER BY provider_id, model_id').all();
}

export function getOverrides(db: Database.Database, providerId?: string): any[] {
  if (providerId) return db.prepare('SELECT * FROM provider_model_overrides WHERE provider_id = ? ORDER BY model_id').all(providerId);
  return db.prepare('SELECT * FROM provider_model_overrides ORDER BY provider_id, model_id').all();
}

export function markModelStale(db: Database.Database, providerId: string, modelId: string): void {
  db.prepare('UPDATE provider_model_registry SET stale = 1 WHERE provider_id = ? AND model_id = ?').run(providerId, modelId);
}

// ═══════════════════════════════════════════════════════════════
// Certification Evidence
// ═══════════════════════════════════════════════════════════════

export function persistCertificationEvidence(db: Database.Database, providerId: string, capability: string, status: string, evidence?: string, notes?: string): void {
  db.prepare('INSERT INTO provider_certification_evidence (provider_id, capability, status, evidence, notes) VALUES (?, ?, ?, ?, ?)').run(providerId, capability, status, evidence ?? null, notes ?? null);
}

export function getCertificationEvidence(db: Database.Database, providerId?: string): any[] {
  if (providerId) return db.prepare('SELECT * FROM provider_certification_evidence WHERE provider_id = ? ORDER BY capability').all(providerId);
  return db.prepare('SELECT * FROM provider_certification_evidence ORDER BY provider_id, capability').all();
}

// ═══════════════════════════════════════════════════════════════
// Discovery History
// ═══════════════════════════════════════════════════════════════

export function persistDiscoveryResult(db: Database.Database, providerId: string, modelsDiscovered: number, newModels: string[], removedModels: string[], source: string, dryRun: boolean): void {
  db.prepare('INSERT INTO provider_discovery_history (provider_id, models_discovered, new_models, removed_models, source, dry_run) VALUES (?, ?, ?, ?, ?, ?)').run(providerId, modelsDiscovered, JSON.stringify(newModels), JSON.stringify(removedModels), source, dryRun ? 1 : 0);
}

export function getDiscoveryHistory(db: Database.Database, providerId?: string, limit = 50): any[] {
  if (providerId) return db.prepare('SELECT * FROM provider_discovery_history WHERE provider_id = ? ORDER BY discovered_at DESC LIMIT ?').all(providerId, limit);
  return db.prepare('SELECT * FROM provider_discovery_history ORDER BY discovered_at DESC LIMIT ?').all(limit);
}

// ═══════════════════════════════════════════════════════════════
// Operational Metadata
// ═══════════════════════════════════════════════════════════════

export function upsertOperationalMetadata(db: Database.Database, providerId: string, data: { lastHealthCheck?: string; lastLatencyMs?: number; lastError?: string; lastErrorAt?: string; totalRequests?: number; totalErrors?: number }): void {
  db.prepare(`INSERT INTO provider_operational_metadata (provider_id, last_health_check, last_latency_ms, last_error, last_error_at, total_requests, total_errors, updated_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'))
    ON CONFLICT(provider_id) DO UPDATE SET
      last_health_check = COALESCE(excluded.last_health_check, last_health_check),
      last_latency_ms = COALESCE(excluded.last_latency_ms, last_latency_ms),
      last_error = COALESCE(excluded.last_error, last_error),
      last_error_at = COALESCE(excluded.last_error_at, last_error_at),
      total_requests = excluded.total_requests,
      total_errors = excluded.total_errors,
      updated_at = datetime('now')
  `).run(providerId, data.lastHealthCheck ?? null, data.lastLatencyMs ?? null, data.lastError ?? null, data.lastErrorAt ?? null, data.totalRequests ?? 0, data.totalErrors ?? 0);
}

export function getOperationalMetadata(db: Database.Database, providerId?: string): any[] {
  if (providerId) return db.prepare('SELECT * FROM provider_operational_metadata WHERE provider_id = ?').all(providerId);
  return db.prepare('SELECT * FROM provider_operational_metadata ORDER BY provider_id').all();
}
