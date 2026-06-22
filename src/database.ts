// 8Router — SQLite Database Layer
// Persistent storage for usage tracking, key state, combos, and analytics

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';

const DB_DIR = join(homedir(), '.8router', 'db');
const DB_PATH = join(DB_DIR, 'data.sqlite');

let db: Database.Database | null = null;

export function getDB(): Database.Database {
  if (db) return db;
  
  if (!existsSync(DB_DIR)) {
    mkdirSync(DB_DIR, { recursive: true });
  }
  
  db = new Database(DB_PATH);
  db.pragma('journal_mode = WAL');
  db.pragma('foreign_keys = ON');
  
  initSchema(db);
  return db;
}

function initSchema(db: Database.Database) {
  db.exec(`
    -- Provider connections (API keys, OAuth tokens)
    CREATE TABLE IF NOT EXISTS connections (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      name TEXT,
      authType TEXT NOT NULL DEFAULT 'apikey',
      apiKey TEXT,
      accessToken TEXT,
      refreshToken TEXT,
      expiresAt TEXT,
      baseUrl TEXT,
      proxyUrl TEXT,
      region TEXT,
      isActive INTEGER DEFAULT 1,
      testStatus TEXT DEFAULT 'unknown',
      lastError TEXT,
      lastErrorCode INTEGER,
      lastErrorAt TEXT,
      backoffLevel INTEGER DEFAULT 0,
      backoffUntil TEXT,
      consecutiveErrors INTEGER DEFAULT 0,
      totalRequests INTEGER DEFAULT 0,
      totalTokens INTEGER DEFAULT 0,
      totalCost REAL DEFAULT 0,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_conn_provider ON connections(provider);
    CREATE INDEX IF NOT EXISTS idx_conn_active ON connections(provider, isActive);
    CREATE INDEX IF NOT EXISTS idx_conn_status ON connections(testStatus);

    -- Named combos (fallback chains)
    CREATE TABLE IF NOT EXISTS combos (
      id TEXT PRIMARY KEY,
      name TEXT UNIQUE NOT NULL,
      description TEXT,
      strategy TEXT DEFAULT 'round-robin',
      stickyLimit INTEGER DEFAULT 1,
      isActive INTEGER DEFAULT 1,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Combo tiers (ordered fallback list)
    CREATE TABLE IF NOT EXISTS comboTiers (
      id TEXT PRIMARY KEY,
      comboId TEXT NOT NULL,
      provider TEXT NOT NULL,
      model TEXT,
      priority INTEGER NOT NULL,
      isActive INTEGER DEFAULT 1,
      FOREIGN KEY (comboId) REFERENCES combos(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_ct_combo ON comboTiers(comboId);

    -- Request history
    CREATE TABLE IF NOT EXISTS requests (
      id TEXT PRIMARY KEY,
      timestamp TEXT NOT NULL,
      provider TEXT NOT NULL,
      connectionId TEXT,
      model TEXT NOT NULL,
      comboName TEXT,
      inputTokens INTEGER DEFAULT 0,
      outputTokens INTEGER DEFAULT 0,
      cachedTokens INTEGER DEFAULT 0,
      reasoningTokens INTEGER DEFAULT 0,
      compressedTokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      latencyMs INTEGER DEFAULT 0,
      isSuccess INTEGER DEFAULT 1,
      errorCode INTEGER,
      errorMessage TEXT,
      isStream INTEGER DEFAULT 0
    );

    CREATE INDEX IF NOT EXISTS idx_req_timestamp ON requests(timestamp);
    CREATE INDEX IF NOT EXISTS idx_req_provider ON requests(provider);
    CREATE INDEX IF NOT EXISTS idx_req_combo ON requests(comboName);

    -- Daily usage aggregation
    CREATE TABLE IF NOT EXISTS usageDaily (
      date TEXT NOT NULL,
      provider TEXT NOT NULL,
      requests INTEGER DEFAULT 0,
      inputTokens INTEGER DEFAULT 0,
      outputTokens INTEGER DEFAULT 0,
      cachedTokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      errors INTEGER DEFAULT 0,
      PRIMARY KEY (date, provider)
    );

    -- Settings KV store
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    -- Provider model locks (prevent concurrent requests to same model/key)
    CREATE TABLE IF NOT EXISTS modelLocks (
      connectionId TEXT NOT NULL,
      model TEXT NOT NULL,
      lockedAt TEXT NOT NULL,
      expiresAt TEXT NOT NULL,
      PRIMARY KEY (connectionId, model)
    );

    CREATE INDEX IF NOT EXISTS idx_lock_expires ON modelLocks(expiresAt);
  `);
}

// ═══════════════════════════════════════════════
// CONNECTION MANAGEMENT
// ═══════════════════════════════════════════════

export interface ConnectionRow {
  id: string;
  provider: string;
  name: string;
  authType: string;
  apiKey: string;
  accessToken: string;
  refreshToken: string;
  expiresAt: string;
  baseUrl: string;
  proxyUrl: string;
  region: string;
  isActive: number;
  testStatus: string;
  lastError: string;
  lastErrorCode: number;
  lastErrorAt: string;
  backoffLevel: number;
  backoffUntil: string;
  consecutiveErrors: number;
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  createdAt: string;
  updatedAt: string;
}

export function upsertConnection(conn: Partial<ConnectionRow> & { id: string; provider: string }): void {
  const db = getDB();
  const now = new Date().toISOString();
  
  const existing = db.prepare('SELECT id FROM connections WHERE id = ?').get(conn.id);
  
  if (existing) {
    const sets: string[] = [];
    const values: any[] = [];
    
    for (const [key, value] of Object.entries(conn)) {
      if (key !== 'id' && value !== undefined) {
        sets.push(`${key} = ?`);
        values.push(value);
      }
    }
    sets.push('updatedAt = ?');
    values.push(now);
    values.push(conn.id);
    
    db.prepare(`UPDATE connections SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  } else {
    const cols = ['id', 'provider', 'name', 'authType', 'apiKey', 'accessToken', 'refreshToken', 
                  'expiresAt', 'baseUrl', 'proxyUrl', 'region', 'isActive', 'testStatus',
                  'createdAt', 'updatedAt'];
    const vals = cols.map(c => conn[c as keyof typeof conn] ?? (c === 'isActive' ? 1 : c === 'testStatus' ? 'unknown' : c === 'authType' ? 'apikey' : null));
    vals.push(now, now);
    
    db.prepare(`INSERT INTO connections (${cols.join(', ')}, createdAt, updatedAt) VALUES (${cols.map(() => '?').join(', ')}, ?, ?)`).run(...vals);
  }
}

export function getActiveConnections(provider?: string): ConnectionRow[] {
  const db = getDB();
  if (provider) {
    return db.prepare('SELECT * FROM connections WHERE provider = ? AND isActive = 1').all(provider) as ConnectionRow[];
  }
  return db.prepare('SELECT * FROM connections WHERE isActive = 1').all() as ConnectionRow[];
}

export function updateConnectionStatus(id: string, status: string, error?: string, errorCode?: number): void {
  const db = getDB();
  const now = new Date().toISOString();
  
  if (status === 'error' || status === 'unavailable') {
    db.prepare(`
      UPDATE connections SET 
        testStatus = ?, lastError = ?, lastErrorCode = ?, lastErrorAt = ?,
        consecutiveErrors = consecutiveErrors + 1,
        backoffLevel = MIN(backoffLevel + 1, 15),
        backoffUntil = datetime('now', '+' || MIN(backoffLevel + 1, 15) * 5 || ' seconds'),
        updatedAt = ?
      WHERE id = ?
    `).run(status, error || null, errorCode || null, now, now, id);
  } else {
    db.prepare(`
      UPDATE connections SET 
        testStatus = ?, lastError = NULL, lastErrorCode = NULL,
        consecutiveErrors = 0, backoffLevel = 0, backoffUntil = NULL,
        updatedAt = ?
      WHERE id = ?
    `).run(status, now, id);
  }
}

export function getAvailableConnection(provider: string, model?: string): ConnectionRow | null {
  const db = getDB();
  const now = new Date().toISOString();
  
  // Get connections that are active, not in backoff, and not locked for this model
  const conn = db.prepare(`
    SELECT c.* FROM connections c
    LEFT JOIN modelLocks ml ON c.id = ml.connectionId AND ml.model = ? AND ml.expiresAt > ?
    WHERE c.provider = ? 
      AND c.isActive = 1 
      AND (c.testStatus IN ('active', 'ready', 'unknown'))
      AND (c.backoffUntil IS NULL OR c.backoffUntil < ?)
      AND ml.connectionId IS NULL
    ORDER BY c.totalRequests ASC
    LIMIT 1
  `).get(model || '*', now, provider, now) as ConnectionRow | undefined;
  
  return conn || null;
}

// ═══════════════════════════════════════════════
// COMBO MANAGEMENT
// ═══════════════════════════════════════════════

export interface ComboRow {
  id: string;
  name: string;
  description: string;
  strategy: string;
  stickyLimit: number;
  isActive: number;
}

export interface ComboTierRow {
  id: string;
  comboId: string;
  provider: string;
  model: string;
  priority: number;
  isActive: number;
}

export function createCombo(name: string, description: string, tiers: { provider: string; model?: string }[]): void {
  const db = getDB();
  const now = new Date().toISOString();
  const id = `combo-${name.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
  
  db.prepare('DELETE FROM combos WHERE id = ?').run(id);
  
  db.prepare('INSERT INTO combos (id, name, description, strategy, createdAt, updatedAt) VALUES (?, ?, ?, ?, ?, ?)')
    .run(id, name, description || '', 'round-robin', now, now);
  
  const insertTier = db.prepare('INSERT INTO comboTiers (id, comboId, provider, model, priority) VALUES (?, ?, ?, ?, ?)');
  
  for (let i = 0; i < tiers.length; i++) {
    insertTier.run(`${id}-tier-${i}`, id, tiers[i].provider, tiers[i].model || null, i);
  }
}

export function getCombo(name: string): { combo: ComboRow; tiers: ComboTierRow[] } | null {
  const db = getDB();
  const combo = db.prepare('SELECT * FROM combos WHERE name = ? AND isActive = 1').get(name) as ComboRow | undefined;
  if (!combo) return null;
  
  const tiers = db.prepare('SELECT * FROM comboTiers WHERE comboId = ? AND isActive = 1 ORDER BY priority').all(combo.id) as ComboTierRow[];
  return { combo, tiers };
}

export function getAllCombos(): { combo: ComboRow; tiers: ComboTierRow[] }[] {
  const db = getDB();
  const combos = db.prepare('SELECT * FROM combos WHERE isActive = 1').all() as ComboRow[];
  
  return combos.map(combo => ({
    combo,
    tiers: db.prepare('SELECT * FROM comboTiers WHERE comboId = ? AND isActive = 1 ORDER BY priority').all(combo.id) as ComboTierRow[]
  }));
}

// ═══════════════════════════════════════════════
// REQUEST TRACKING
// ═══════════════════════════════════════════════

export function logRequest(data: {
  provider: string;
  connectionId?: string;
  model: string;
  comboName?: string;
  inputTokens: number;
  outputTokens: number;
  cachedTokens?: number;
  reasoningTokens?: number;
  compressedTokens?: number;
  cost?: number;
  latencyMs?: number;
  isSuccess: boolean;
  errorCode?: number;
  errorMessage?: string;
  isStream?: boolean;
}): void {
  const db = getDB();
  const now = new Date().toISOString();
  const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  db.prepare(`
    INSERT INTO requests (id, timestamp, provider, connectionId, model, comboName,
      inputTokens, outputTokens, cachedTokens, reasoningTokens, compressedTokens,
      cost, latencyMs, isSuccess, errorCode, errorMessage, isStream)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, now, data.provider, data.connectionId || null, data.model, data.comboName || null,
    data.inputTokens, data.outputTokens, data.cachedTokens || 0, data.reasoningTokens || 0,
    data.compressedTokens || 0, data.cost || 0, data.latencyMs || 0,
    data.isSuccess ? 1 : 0, data.errorCode || null, data.errorMessage || null,
    data.isStream ? 1 : 0
  );
  
  // Update connection stats
  if (data.connectionId) {
    db.prepare(`
      UPDATE connections SET 
        totalRequests = totalRequests + 1,
        totalTokens = totalTokens + ? + ?,
        totalCost = totalCost + ?,
        updatedAt = ?
      WHERE id = ?
    `).run(data.inputTokens, data.outputTokens, data.cost || 0, now, data.connectionId);
  }
  
  // Update daily aggregation
  const date = now.slice(0, 10);
  db.prepare(`
    INSERT INTO usageDaily (date, provider, requests, inputTokens, outputTokens, cachedTokens, cost, errors)
    VALUES (?, ?, 1, ?, ?, ?, ?, ?)
    ON CONFLICT(date, provider) DO UPDATE SET
      requests = requests + 1,
      inputTokens = inputTokens + ?,
      outputTokens = outputTokens + ?,
      cachedTokens = cachedTokens + ?,
      cost = cost + ?,
      errors = errors + ?
  `).run(
    date, data.provider, data.inputTokens, data.outputTokens, data.cachedTokens || 0,
    data.cost || 0, data.isSuccess ? 0 : 1,
    data.inputTokens, data.outputTokens, data.cachedTokens || 0, data.cost || 0,
    data.isSuccess ? 0 : 1
  );
}

export function getRequestStats(): {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  successfulRequests: number;
  failedRequests: number;
  providerStats: Record<string, { requests: number; tokens: number; cost: number; errors: number }>;
} {
  const db = getDB();
  
  const totals = db.prepare(`
    SELECT 
      COUNT(*) as totalRequests,
      COALESCE(SUM(inputTokens + outputTokens), 0) as totalTokens,
      COALESCE(SUM(cost), 0) as totalCost,
      COALESCE(SUM(CASE WHEN isSuccess = 1 THEN 1 ELSE 0 END), 0) as successfulRequests,
      COALESCE(SUM(CASE WHEN isSuccess = 0 THEN 1 ELSE 0 END), 0) as failedRequests
    FROM requests
  `).get() as any;
  
  const providerRows = db.prepare(`
    SELECT 
      provider,
      COUNT(*) as requests,
      COALESCE(SUM(inputTokens + outputTokens), 0) as tokens,
      COALESCE(SUM(cost), 0) as cost,
      COALESCE(SUM(CASE WHEN isSuccess = 0 THEN 1 ELSE 0 END), 0) as errors
    FROM requests
    GROUP BY provider
  `).all() as any[];
  
  const providerStats: Record<string, { requests: number; tokens: number; cost: number; errors: number }> = {};
  for (const row of providerRows) {
    providerStats[row.provider] = {
      requests: row.requests,
      tokens: row.tokens,
      cost: row.cost,
      errors: row.errors
    };
  }
  
  return {
    totalRequests: totals.totalRequests,
    totalTokens: totals.totalTokens,
    totalCost: totals.totalCost,
    successfulRequests: totals.successfulRequests,
    failedRequests: totals.failedRequests,
    providerStats
  };
}

// ═══════════════════════════════════════════════
// DAILY USAGE
// ═══════════════════════════════════════════════

export function getDailyUsage(days: number = 7): any[] {
  const db = getDB();
  return db.prepare(`
    SELECT date, SUM(requests) as requests, SUM(inputTokens) as inputTokens,
           SUM(outputTokens) as outputTokens, SUM(cachedTokens) as cachedTokens,
           SUM(cost) as cost, SUM(errors) as errors
    FROM usageDaily
    WHERE date >= date('now', '-' || ? || ' days')
    GROUP BY date
    ORDER BY date DESC
  `).all(days);
}

// ═══════════════════════════════════════════════
// MODEL LOCKS
// ═══════════════════════════════════════════════

export function acquireModelLock(connectionId: string, model: string, durationMs: number = 60000): boolean {
  const db = getDB();
  const now = new Date();
  const expires = new Date(now.getTime() + durationMs).toISOString();
  
  try {
    db.prepare(`
      INSERT OR REPLACE INTO modelLocks (connectionId, model, lockedAt, expiresAt)
      VALUES (?, ?, ?, ?)
    `).run(connectionId, model, now.toISOString(), expires);
    return true;
  } catch {
    return false;
  }
}

export function releaseModelLock(connectionId: string, model: string): void {
  const db = getDB();
  db.prepare('DELETE FROM modelLocks WHERE connectionId = ? AND model = ?').run(connectionId, model);
}

export function cleanupExpiredLocks(): void {
  const db = getDB();
  db.prepare('DELETE FROM modelLocks WHERE expiresAt < datetime(\'now\')').run();
}

// ═══════════════════════════════════════════════
// SETTINGS
// ═══════════════════════════════════════════════

export function getSetting(key: string): string | null {
  const db = getDB();
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as { value: string } | undefined;
  return row?.value || null;
}

export function setSetting(key: string, value: string): void {
  const db = getDB();
  const now = new Date().toISOString();
  db.prepare('INSERT OR REPLACE INTO settings (key, value, updatedAt) VALUES (?, ?, ?)').run(key, value, now);
}

// ═══════════════════════════════════════════════
// MIGRATION FROM 9ROUTER
// ═══════════════════════════════════════════════

export function migrateFrom9Router(): { connections: number; combos: number } {
  const { execSync } = require('child_process');
  const nineRouterDB = join(homedir(), '.9router', 'db', 'data.sqlite');
  
  if (!existsSync(nineRouterDB)) {
    throw new Error('9Router database not found');
  }
  
  const db = getDB();
  let connCount = 0;
  let comboCount = 0;
  
  // Read connections from 9Router
  const query = `
    SELECT id, provider, name, authType,
           json_extract(data, '$.apiKey') as apiKey,
           json_extract(data, '$.accessToken') as accessToken,
           json_extract(data, '$.refreshToken') as refreshToken,
           json_extract(data, '$.expiresAt') as expiresAt,
           json_extract(data, '$.baseUrl') as baseUrl,
           json_extract(data, '$.testStatus') as testStatus,
           json_extract(data, '$.lastError') as lastError,
           json_extract(data, '$.errorCode') as lastErrorCode,
           json_extract(data, '$.backoffLevel') as backoffLevel,
           json_extract(data, '$.providerSpecificData.connectionProxyUrl') as proxyUrl,
           json_extract(data, '$.providerSpecificData.region') as region
    FROM providerConnections WHERE isActive = 1
  `;
  
  try {
    const result = execSync(`sqlite3 -json "${nineRouterDB}" "${query.replace(/"/g, '\\"')}"`, { encoding: 'utf-8' });
    const connections = JSON.parse(result);
    
    for (const conn of connections) {
      upsertConnection({
        id: conn.id,
        provider: conn.provider,
        name: conn.name,
        authType: conn.authType,
        apiKey: conn.apiKey,
        accessToken: conn.accessToken,
        refreshToken: conn.refreshToken,
        expiresAt: conn.expiresAt,
        baseUrl: conn.baseUrl,
        proxyUrl: conn.proxyUrl,
        region: conn.region,
        isActive: 1,
        testStatus: conn.testStatus || 'unknown',
        lastError: conn.lastError,
        lastErrorCode: conn.lastErrorCode,
        backoffLevel: conn.backoffLevel || 0,
      });
      connCount++;
    }
  } catch (e) {
    console.error('Migration error:', e);
  }
  
  return { connections: connCount, combos: comboCount };
}

// ═══════════════════════════════════════════════
// CLOSE
// ═══════════════════════════════════════════════

export function closeDB(): void {
  if (db) {
    db.close();
    db = null;
  }
}
