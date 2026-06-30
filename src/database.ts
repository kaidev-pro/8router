// 8Router — SQLite Database Layer
// Persistent storage for usage tracking, key state, combos, and analytics

import Database from 'better-sqlite3';
import { join } from 'path';
import { mkdirSync, existsSync } from 'fs';
import { homedir } from 'os';
import crypto from 'crypto';

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
      keyIndex INTEGER,
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
      fallbackPath TEXT,
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

    -- Virtual API keys for 8Router
    CREATE TABLE IF NOT EXISTS apiKeys (
      id TEXT PRIMARY KEY,
      key TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      permissions TEXT NOT NULL DEFAULT 'chat,models',
      active INTEGER DEFAULT 1,
      totalRequests INTEGER DEFAULT 0,
      totalTokens INTEGER DEFAULT 0,
      lastUsed TEXT,
      createdAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_apikey_key ON apiKeys(key);

    -- Agent Presets (Phase 3)
    CREATE TABLE IF NOT EXISTS agent_presets (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT DEFAULT '',
      model_alias TEXT NOT NULL,
      fallback_rules TEXT DEFAULT '[]',
      system_prompt TEXT DEFAULT '',
      token_saver_mode INTEGER DEFAULT 0,
      temperature REAL DEFAULT 0.7,
      max_tokens INTEGER DEFAULT 4096,
      allowed_providers TEXT DEFAULT '[]',
      created_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_apreset_name ON agent_presets(name);

    -- Quota tracking per provider
    CREATE TABLE IF NOT EXISTS quotaTracking (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      period TEXT NOT NULL DEFAULT 'daily', -- daily, weekly, monthly, 5h
      periodStart TEXT NOT NULL,
      periodEnd TEXT NOT NULL,
      requests INTEGER DEFAULT 0,
      inputTokens INTEGER DEFAULT 0,
      outputTokens INTEGER DEFAULT 0,
      totalTokens INTEGER DEFAULT 0,
      cost REAL DEFAULT 0,
      quotaLimit INTEGER, -- max requests per period (null = unlimited)
      tokenLimit INTEGER, -- max tokens per period (null = unlimited)
      costLimit REAL, -- max cost per period (null = unlimited)
      lastResetAt TEXT,
      createdAt TEXT NOT NULL,
      updatedAt TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_quota_provider ON quotaTracking(provider);
    CREATE INDEX IF NOT EXISTS idx_quota_period ON quotaTracking(period);
    CREATE INDEX IF NOT EXISTS idx_quota_period_end ON quotaTracking(periodEnd);
  `);

  // ─── Migrations (add columns to existing tables) ─────────────
  const columns = db.prepare(`PRAGMA table_info(requests)`).all() as any[];
  const colNames = columns.map(c => c.name);

  if (!colNames.includes('keyIndex')) {
    db.exec(`ALTER TABLE requests ADD COLUMN keyIndex INTEGER`);
  }
  if (!colNames.includes('fallbackPath')) {
    db.exec(`ALTER TABLE requests ADD COLUMN fallbackPath TEXT`);
  }
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
  keyIndex?: number;
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
  fallbackPath?: string[];
  isStream?: boolean;
}): void {
  const db = getDB();
  const now = new Date().toISOString();
  const id = `req-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  
  // Sanitize error message (remove sensitive info)
  const sanitizedError = data.errorMessage ? sanitizeErrorMessage(data.errorMessage) : null;
  const fallbackPathJson = data.fallbackPath ? JSON.stringify(data.fallbackPath) : null;
  
  db.prepare(`
    INSERT INTO requests (id, timestamp, provider, connectionId, keyIndex, model, comboName,
      inputTokens, outputTokens, cachedTokens, reasoningTokens, compressedTokens,
      cost, latencyMs, isSuccess, errorCode, errorMessage, fallbackPath, isStream)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    id, now, data.provider, data.connectionId || null, data.keyIndex ?? null, 
    data.model, data.comboName || null,
    data.inputTokens, data.outputTokens, data.cachedTokens || 0, data.reasoningTokens || 0,
    data.compressedTokens || 0, data.cost || 0, data.latencyMs || 0,
    data.isSuccess ? 1 : 0, data.errorCode || null, sanitizedError,
    fallbackPathJson, data.isStream ? 1 : 0
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

  // Track quota usage for all periods (5h, daily, weekly, monthly)
  if (data.isSuccess) {
    trackQuotaUsage(data.provider, {
      requests: 1,
      inputTokens: data.inputTokens,
      outputTokens: data.outputTokens,
      cost: data.cost || 0,
    });
  }
}

function sanitizeErrorMessage(msg: string): string {
  // Remove API keys
  let sanitized = msg.replace(/sk-[a-zA-Z0-9]{20,}/g, 'sk-***');
  sanitized = sanitized.replace(/gsk_[a-zA-Z0-9]{20,}/g, 'gsk_***');
  sanitized = sanitized.replace(/Bearer [a-zA-Z0-9._-]{20,}/g, 'Bearer ***');
  // Remove base URLs with credentials
  sanitized = sanitized.replace(/https?:\/\/[^@]+@/g, 'https://***@');
  // Truncate very long messages
  if (sanitized.length > 500) {
    sanitized = sanitized.slice(0, 500) + '...';
  }
  return sanitized;
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

// ═══════════════════════════════════════════════
// API KEYS
// ═══════════════════════════════════════════════

export interface APIKeyRow {
  id: string;
  key: string;
  name: string;
  permissions: string;
  active: number;
  totalRequests: number;
  totalTokens: number;
  lastUsed: string | null;
  createdAt: string;
}

export function getAllAPIKeys(): APIKeyRow[] {
  const db = getDB();
  return db.prepare('SELECT * FROM apiKeys ORDER BY createdAt DESC').all() as APIKeyRow[];
}

export function createAPIKey(name: string, permissions: string = 'chat,models'): APIKeyRow {
  const db = getDB();
  const now = new Date().toISOString();
  const id = `key-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const randomHex = crypto.randomBytes(4).toString('hex');
  const key = `sk-8router-${randomHex}`;

  db.prepare(
    'INSERT INTO apiKeys (id, key, name, permissions, active, createdAt) VALUES (?, ?, ?, ?, 1, ?)'
  ).run(id, key, name, permissions, now);

  return { id, key, name, permissions, active: 1, totalRequests: 0, totalTokens: 0, lastUsed: null, createdAt: now };
}

export function deleteAPIKey(id: string): boolean {
  const db = getDB();
  const result = db.prepare('DELETE FROM apiKeys WHERE id = ?').run(id);
  return result.changes > 0;
}

export function validateAPIKey(key: string): APIKeyRow | null {
  const db = getDB();
  const row = db.prepare('SELECT * FROM apiKeys WHERE key = ? AND active = 1').get(key) as APIKeyRow | undefined;
  return row || null;
}

export function updateAPIKeyUsage(key: string, tokens: number): void {
  const db = getDB();
  const now = new Date().toISOString();
  db.prepare(
    'UPDATE apiKeys SET totalRequests = totalRequests + 1, totalTokens = totalTokens + ?, lastUsed = ? WHERE key = ?'
  ).run(tokens, now, key);
}

// ═══════════════════════════════════════════════
// GET RECENT REQUESTS (for logs endpoint)
// ═══════════════════════════════════════════════

export function getRecentRequests(limit: number = 100): any[] {
  const db = getDB();
  return db.prepare(`
    SELECT id, provider, model, inputTokens, outputTokens, cachedTokens,
           reasoningTokens, compressedTokens, cost, latencyMs as latency,
           isSuccess as status, errorCode, errorMessage, timestamp, comboName, connectionId
    FROM requests
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit);
}

// ═══════════════════════════════════════════════
// GET ALL SETTINGS
// ═══════════════════════════════════════════════

export function getAllSettings(): Record<string, string> {
  const db = getDB();
  const rows = db.prepare('SELECT key, value FROM settings').all() as { key: string; value: string }[];
  const settings: Record<string, string> = {};
  for (const row of rows) {
    settings[row.key] = row.value;
  }
  return settings;
}

// ═══════════════════════════════════════════════
// COST ESTIMATION (pricing table)
// ═══════════════════════════════════════════════

export const PRICING: Record<string, Record<string, { inputPerMToken: number; outputPerMToken: number }>> = {
  groq: {
    'llama-3.1-8b-instant': { inputPerMToken: 0.05, outputPerMToken: 0.08 },
    'llama-3.3-70b-versatile': { inputPerMToken: 0.59, outputPerMToken: 0.79 },
    'mixtral-8x7b-32768': { inputPerMToken: 0.24, outputPerMToken: 0.24 },
    '*': { inputPerMToken: 0.2, outputPerMToken: 0.2 },
  },
  mistral: {
    'mistral-large-latest': { inputPerMToken: 2.0, outputPerMToken: 6.0 },
    'mistral-small-latest': { inputPerMToken: 0.1, outputPerMToken: 0.3 },
    '*': { inputPerMToken: 0.5, outputPerMToken: 1.0 },
  },
  xiaomi: {
    'mimo-v2-pro': { inputPerMToken: 0.1, outputPerMToken: 0.3 },
    'mimo-v2-omni': { inputPerMToken: 0.05, outputPerMToken: 0.15 },
    'mimo-v2-lite': { inputPerMToken: 0.02, outputPerMToken: 0.06 },
    '*': { inputPerMToken: 0.05, outputPerMToken: 0.15 },
  },
  openrouter: {
    '*': { inputPerMToken: 0.5, outputPerMToken: 1.0 },
  },
  mimo: {
    '*': { inputPerMToken: 0, outputPerMToken: 0 },
  },
};

export function estimateCost(provider: string, model: string, inputTokens: number, outputTokens: number): number {
  const providerPricing = PRICING[provider];
  if (!providerPricing) return 0;
  const modelPricing = providerPricing[model] || providerPricing['*'] || { inputPerMToken: 0, outputPerMToken: 0 };
  return (inputTokens * modelPricing.inputPerMToken + outputTokens * modelPricing.outputPerMToken) / 1_000_000;
}

// ═══════════════════════════════════════════════
// PHASE 3: AGENT PRESETS
// ═══════════════════════════════════════════════

export interface AgentPresetRow {
  id: string;
  name: string;
  description: string;
  model_alias: string;
  fallback_rules: string;       // JSON array
  system_prompt: string;
  token_saver_mode: number;     // 0 or 1
  temperature: number;
  max_tokens: number;
  allowed_providers: string;    // JSON array
  created_at: string;
}

export function getAllPresets(): AgentPresetRow[] {
  const db = getDB();
  return db.prepare('SELECT * FROM agent_presets ORDER BY created_at DESC').all() as AgentPresetRow[];
}

export function getPreset(id: string): AgentPresetRow | null {
  const db = getDB();
  const row = db.prepare('SELECT * FROM agent_presets WHERE id = ?').get(id) as AgentPresetRow | undefined;
  return row || null;
}

export function createPreset(data: {
  name: string;
  description?: string;
  model_alias: string;
  fallback_rules?: string[];
  system_prompt?: string;
  token_saver_mode?: boolean;
  temperature?: number;
  max_tokens?: number;
  allowed_providers?: string[];
}): AgentPresetRow {
  const db = getDB();
  const now = new Date().toISOString();
  const id = `preset-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  const row: AgentPresetRow = {
    id,
    name: data.name,
    description: data.description || '',
    model_alias: data.model_alias,
    fallback_rules: JSON.stringify(data.fallback_rules || []),
    system_prompt: data.system_prompt || '',
    token_saver_mode: data.token_saver_mode ? 1 : 0,
    temperature: data.temperature ?? 0.7,
    max_tokens: data.max_tokens ?? 4096,
    allowed_providers: JSON.stringify(data.allowed_providers || []),
    created_at: now,
  };

  db.prepare(
    'INSERT INTO agent_presets (id, name, description, model_alias, fallback_rules, system_prompt, token_saver_mode, temperature, max_tokens, allowed_providers, created_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
  ).run(row.id, row.name, row.description, row.model_alias, row.fallback_rules, row.system_prompt, row.token_saver_mode, row.temperature, row.max_tokens, row.allowed_providers, row.created_at);

  return row;
}

export function updatePreset(id: string, data: Partial<{
  name: string;
  description: string;
  model_alias: string;
  fallback_rules: string[];
  system_prompt: string;
  token_saver_mode: boolean;
  temperature: number;
  max_tokens: number;
  allowed_providers: string[];
}>): boolean {
  const db = getDB();
  const sets: string[] = [];
  const values: any[] = [];

  if (data.name !== undefined) { sets.push('name = ?'); values.push(data.name); }
  if (data.description !== undefined) { sets.push('description = ?'); values.push(data.description); }
  if (data.model_alias !== undefined) { sets.push('model_alias = ?'); values.push(data.model_alias); }
  if (data.fallback_rules !== undefined) { sets.push('fallback_rules = ?'); values.push(JSON.stringify(data.fallback_rules)); }
  if (data.system_prompt !== undefined) { sets.push('system_prompt = ?'); values.push(data.system_prompt); }
  if (data.token_saver_mode !== undefined) { sets.push('token_saver_mode = ?'); values.push(data.token_saver_mode ? 1 : 0); }
  if (data.temperature !== undefined) { sets.push('temperature = ?'); values.push(data.temperature); }
  if (data.max_tokens !== undefined) { sets.push('max_tokens = ?'); values.push(data.max_tokens); }
  if (data.allowed_providers !== undefined) { sets.push('allowed_providers = ?'); values.push(JSON.stringify(data.allowed_providers)); }

  if (sets.length === 0) return false;
  values.push(id);
  const result = db.prepare(`UPDATE agent_presets SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  return result.changes > 0;
}

export function deletePreset(id: string): boolean {
  const db = getDB();
  const result = db.prepare('DELETE FROM agent_presets WHERE id = ?').run(id);
  return result.changes > 0;
}

export function seedDefaultPresets(): void {
  const db = getDB();
  const existing = db.prepare('SELECT COUNT(*) as cnt FROM agent_presets').get() as { cnt: number };
  if (existing.cnt > 0) return; // already seeded

  const defaults = [
    {
      name: 'Coding Agent',
      description: 'Optimized for code generation, debugging, and technical tasks',
      model_alias: 'coding',
      fallback_rules: ['deepseek-coder', 'codestral-latest', 'gpt-4o'],
      system_prompt: 'You are an expert software engineer. Write clean, efficient, well-documented code. Think step by step.',
      token_saver_mode: false,
      temperature: 0,
      max_tokens: 8192,
      allowed_providers: [],
    },
    {
      name: 'Creative Agent',
      description: 'Optimized for creative writing, brainstorming, and content generation',
      model_alias: 'creative',
      fallback_rules: ['claude-sonnet-4-20250514', 'gpt-4o', 'gemini-2.0-pro'],
      system_prompt: 'You are a creative assistant. Help with writing, brainstorming, and creative tasks. Be imaginative and expressive.',
      token_saver_mode: false,
      temperature: 0.9,
      max_tokens: 4096,
      allowed_providers: [],
    },
    {
      name: 'Privacy Agent',
      description: 'Routes only to local/self-hosted providers. No data leaves your infrastructure.',
      model_alias: 'local',
      fallback_rules: ['ollama', 'lmstudio', 'vllm'],
      system_prompt: 'You are a helpful assistant running entirely on local infrastructure.',
      token_saver_mode: true,
      temperature: 0.7,
      max_tokens: 4096,
      allowed_providers: ['ollama', 'lmstudio', 'vllm'],
    },
    {
      name: 'Customer Support Agent',
      description: 'Cost-effective agent for customer support and FAQ handling',
      model_alias: 'cheap',
      fallback_rules: ['deepseek-chat', 'llama-3.3-70b-versatile', 'gpt-4o-mini'],
      system_prompt: 'You are a friendly and professional customer support agent. Be helpful, concise, and empathetic. Escalate complex issues when needed.',
      token_saver_mode: true,
      temperature: 0.3,
      max_tokens: 2048,
      allowed_providers: [],
    },
  ];

  for (const preset of defaults) {
    createPreset(preset);
  }
}

// ═══════════════════════════════════════════════
// PHASE 3: PRIVACY MODE
// ═══════════════════════════════════════════════

export function getPrivacyMode(): boolean {
  const val = getSetting('privacy_mode');
  return val === 'true';
}

export function setPrivacyMode(enabled: boolean): void {
  setSetting('privacy_mode', String(enabled));
}

// Local providers that never send data to cloud
export const LOCAL_PROVIDER_IDS = ['ollama', 'lmstudio', 'vllm'];

// ═══════════════════════════════════════════════
// PHASE 3: SMART COST OPTIMIZER
// ═══════════════════════════════════════════════

export function getCostOptimizerEnabled(): boolean {
  const val = getSetting('cost_optimizer');
  return val !== 'false'; // enabled by default
}

export function setCostOptimizerEnabled(enabled: boolean): void {
  setSetting('cost_optimizer', String(enabled));
}

export function logCostSavings(data: {
  originalModel: string;
  optimizedModel: string;
  estimatedOriginalCost: number;
  estimatedOptimizedCost: number;
  promptCategory: string;
}): void {
  const savings = data.estimatedOriginalCost - data.estimatedOptimizedCost;
  if (savings > 0) {
    const db = getDB();
    const now = new Date().toISOString();
    db.prepare(
      `INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES ('cost_savings_total', '0', ?)`
    ).run(now);
    db.prepare(
      `UPDATE settings SET value = CAST(CAST(value AS REAL) + ? AS TEXT), updatedAt = ? WHERE key = 'cost_savings_total'`
    ).run(savings, now);

    db.prepare(
      `INSERT OR IGNORE INTO settings (key, value, updatedAt) VALUES ('cost_savings_log', '[]', ?)`
    ).run(now);
    const raw = db.prepare('SELECT value FROM settings WHERE key = ?').get('cost_savings_log') as { value: string } | undefined;
    const log: any[] = raw ? JSON.parse(raw.value) : [];
    log.push({
      ...data,
      savings,
      timestamp: now,
    });
    // Keep only last 100 entries
    if (log.length > 100) log.splice(0, log.length - 100);
    db.prepare("UPDATE settings SET value = ?, updatedAt = ? WHERE key = 'cost_savings_log'").run(JSON.stringify(log), now);
  }
}

// ═══════════════════════════════════════════════
// QUOTA TRACKING
// ═══════════════════════════════════════════════

export interface QuotaRow {
  id: string;
  provider: string;
  period: string;
  periodStart: string;
  periodEnd: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
  cost: number;
  quotaLimit: number | null;
  tokenLimit: number | null;
  costLimit: number | null;
  lastResetAt: string | null;
  createdAt: string;
  updatedAt: string;
}

function getPeriodBounds(period: string): { start: string; end: string } {
  const now = new Date();
  let start: Date;
  let end: Date;

  switch (period) {
    case '5h':
      // 5-hour rolling window
      start = new Date(now);
      start.setHours(start.getHours() - 5);
      end = now;
      break;
    case 'daily':
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
      break;
    case 'weekly':
      start = new Date(now);
      start.setDate(start.getDate() - start.getDay()); // Sunday
      start.setHours(0, 0, 0, 0);
      end = new Date(start);
      end.setDate(end.getDate() + 7);
      break;
    case 'monthly':
      start = new Date(now.getFullYear(), now.getMonth(), 1);
      end = new Date(now.getFullYear(), now.getMonth() + 1, 1);
      break;
    default:
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      end = new Date(start);
      end.setDate(end.getDate() + 1);
  }

  return { start: start.toISOString(), end: end.toISOString() };
}

export function trackQuotaUsage(provider: string, data: {
  requests?: number;
  inputTokens?: number;
  outputTokens?: number;
  cost?: number;
}): void {
  const db = getDB();
  const now = new Date().toISOString();
  const periods = ['5h', 'daily', 'weekly', 'monthly'];

  for (const period of periods) {
    const { start, end } = getPeriodBounds(period);
    const id = `${provider}_${period}_${start}`;

    // Upsert quota record
    const existing = db.prepare('SELECT id FROM quotaTracking WHERE id = ?').get(id);

    if (existing) {
      db.prepare(`
        UPDATE quotaTracking SET
          requests = requests + ?,
          inputTokens = inputTokens + ?,
          outputTokens = outputTokens + ?,
          totalTokens = totalTokens + ?,
          cost = cost + ?,
          updatedAt = ?
        WHERE id = ?
      `).run(
        data.requests || 0,
        data.inputTokens || 0,
        data.outputTokens || 0,
        (data.inputTokens || 0) + (data.outputTokens || 0),
        data.cost || 0,
        now,
        id
      );
    } else {
      db.prepare(`
        INSERT INTO quotaTracking (id, provider, period, periodStart, periodEnd, requests, inputTokens, outputTokens, totalTokens, cost, createdAt, updatedAt)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        id, provider, period, start, end,
        data.requests || 0,
        data.inputTokens || 0,
        data.outputTokens || 0,
        (data.inputTokens || 0) + (data.outputTokens || 0),
        data.cost || 0,
        now, now
      );
    }
  }
}

export function getQuotaStatus(provider?: string): QuotaRow[] {
  const db = getDB();
  const now = new Date().toISOString();

  // Clean up expired periods
  db.prepare('DELETE FROM quotaTracking WHERE periodEnd < ?').run(now);

  if (provider) {
    return db.prepare('SELECT * FROM quotaTracking WHERE provider = ? ORDER BY period, periodStart DESC').all(provider) as QuotaRow[];
  }
  return db.prepare('SELECT * FROM quotaTracking ORDER BY provider, period, periodStart DESC').all() as QuotaRow[];
}

export function getQuotaSummary(): Array<{
  provider: string;
  period: string;
  requests: number;
  totalTokens: number;
  cost: number;
  quotaLimit: number | null;
  tokenLimit: number | null;
  costLimit: number | null;
  requestsPercent: number;
  tokensPercent: number;
  costPercent: number;
  timeRemaining: string;
  periodEnd: string;
}> {
  const db = getDB();
  const now = new Date().toISOString();

  // Clean up expired periods
  db.prepare('DELETE FROM quotaTracking WHERE periodEnd < ?').run(now);

  // Get latest quota per provider per period
  const rows = db.prepare(`
    SELECT * FROM quotaTracking
    WHERE periodEnd >= ?
    ORDER BY provider, period, periodStart DESC
  `).all(now) as QuotaRow[];

  // Deduplicate - keep only latest per provider+period
  const seen = new Set<string>();
  const summary: Array<{
    provider: string;
    period: string;
    requests: number;
    totalTokens: number;
    cost: number;
    quotaLimit: number | null;
    tokenLimit: number | null;
    costLimit: number | null;
    requestsPercent: number;
    tokensPercent: number;
    costPercent: number;
    timeRemaining: string;
    periodEnd: string;
  }> = [];

  for (const row of rows) {
    const key = `${row.provider}_${row.period}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const periodEnd = new Date(row.periodEnd);
    const diffMs = periodEnd.getTime() - new Date(now).getTime();
    const diffH = Math.floor(diffMs / (1000 * 60 * 60));
    const diffM = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    const timeRemaining = diffH > 0 ? `${diffH}h ${diffM}m` : `${diffM}m`;

    summary.push({
      provider: row.provider,
      period: row.period,
      requests: row.requests,
      totalTokens: row.totalTokens,
      cost: row.cost,
      quotaLimit: row.quotaLimit,
      tokenLimit: row.tokenLimit,
      costLimit: row.costLimit,
      requestsPercent: row.quotaLimit ? Math.min(100, (row.requests / row.quotaLimit) * 100) : 0,
      tokensPercent: row.tokenLimit ? Math.min(100, (row.totalTokens / row.tokenLimit) * 100) : 0,
      costPercent: row.costLimit ? Math.min(100, (row.cost / row.costLimit) * 100) : 0,
      timeRemaining,
      periodEnd: row.periodEnd,
    });
  }

  return summary;
}

export function setQuotaLimit(provider: string, period: string, limits: {
  quotaLimit?: number;
  tokenLimit?: number;
  costLimit?: number;
}): void {
  const db = getDB();
  const now = new Date().toISOString();
  const { start, end } = getPeriodBounds(period);
  const id = `${provider}_${period}_${start}`;

  const existing = db.prepare('SELECT id FROM quotaTracking WHERE id = ?').get(id);

  if (existing) {
    const sets: string[] = [];
    const values: any[] = [];
    if (limits.quotaLimit !== undefined) { sets.push('quotaLimit = ?'); values.push(limits.quotaLimit); }
    if (limits.tokenLimit !== undefined) { sets.push('tokenLimit = ?'); values.push(limits.tokenLimit); }
    if (limits.costLimit !== undefined) { sets.push('costLimit = ?'); values.push(limits.costLimit); }
    sets.push('updatedAt = ?');
    values.push(now);
    values.push(id);
    db.prepare(`UPDATE quotaTracking SET ${sets.join(', ')} WHERE id = ?`).run(...values);
  } else {
    db.prepare(`
      INSERT INTO quotaTracking (id, provider, period, periodStart, periodEnd, quotaLimit, tokenLimit, costLimit, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(id, provider, period, start, end, limits.quotaLimit || null, limits.tokenLimit || null, limits.costLimit || null, now, now);
  }
}

// ═══════════════════════════════════════════════
// ADMIN HELPERS
// ═══════════════════════════════════════════════

export function getDetailedHealth(): {
  status: string;
  uptime: number;
  version: string;
  providers: { id: string; healthy: boolean; circuit: string }[];
  keyPool: { total: number; healthy: number };
} {
  const db = getDB();
  const now = new Date().toISOString();
  
  // Get provider health
  const providers = db.prepare(`
    SELECT DISTINCT provider, 
      SUM(CASE WHEN testStatus = 'active' THEN 1 ELSE 0 END) as healthyCount,
      COUNT(*) as totalCount
    FROM connections 
    WHERE isActive = 1
    GROUP BY provider
  `).all() as any[];
  
  // Get key pool stats
  const keyStats = db.prepare(`
    SELECT COUNT(*) as total, 
      SUM(CASE WHEN testStatus = 'active' THEN 1 ELSE 0 END) as healthy
    FROM connections WHERE isActive = 1
  `).get() as any;
  
  return {
    status: 'ok',
    uptime: process.uptime(),
    version: '2.0.0',
    providers: providers.map(p => ({
      id: p.provider,
      healthy: p.healthyCount > 0,
      circuit: p.healthyCount > 0 ? 'closed' : 'open',
    })),
    keyPool: {
      total: keyStats?.total || 0,
      healthy: keyStats?.healthy || 0,
    },
  };
}

export function getProviderDetailed(): any[] {
  const db = getDB();
  
  const providers = db.prepare(`
    SELECT 
      provider,
      COUNT(*) as totalConnections,
      SUM(CASE WHEN isActive = 1 THEN 1 ELSE 0 END) as activeConnections,
      SUM(CASE WHEN testStatus = 'active' THEN 1 ELSE 0 END) as healthyConnections,
      SUM(totalRequests) as totalRequests,
      SUM(totalTokens) as totalTokens,
      SUM(totalCost) as totalCost,
      SUM(CASE WHEN lastErrorAt IS NOT NULL THEN 1 ELSE 0 END) as errorCount
    FROM connections
    GROUP BY provider
  `).all() as any[];
  
  return providers.map(p => ({
    id: p.provider,
    connections: {
      total: p.totalConnections,
      active: p.activeConnections,
      healthy: p.healthyConnections,
    },
    usage: {
      requests: p.totalRequests,
      tokens: p.totalTokens,
      cost: p.totalCost,
    },
    errors: p.errorCount,
    circuit: p.healthyConnections > 0 ? 'closed' : 'open',
  }));
}

export function getRecentRequestsWithFallback(limit: number = 50): any[] {
  const db = getDB();
  
  const requests = db.prepare(`
    SELECT 
      id, timestamp, provider, keyIndex, model, comboName,
      inputTokens, outputTokens, cost, latencyMs,
      isSuccess, errorCode, errorMessage, fallbackPath, isStream
    FROM requests
    ORDER BY timestamp DESC
    LIMIT ?
  `).all(limit) as any[];
  
  return requests.map(r => ({
    id: r.id,
    timestamp: r.timestamp,
    provider: r.provider,
    keyIndex: r.keyIndex,
    model: r.model,
    combo: r.comboName,
    tokens: {
      input: r.inputTokens,
      output: r.outputTokens,
    },
    cost: r.cost,
    latencyMs: r.latencyMs,
    success: r.isSuccess === 1,
    error: r.errorMessage ? {
      code: r.errorCode,
      message: r.errorMessage,
    } : null,
    fallbackPath: r.fallbackPath ? JSON.parse(r.fallbackPath) : null,
    stream: r.isStream === 1,
  }));
}

export function getDetailedStats(): {
  session: any;
  allTime: any;
  errorRates: Record<string, number>;
  avgLatency: Record<string, number>;
  fallbackCount: number;
} {
  const db = getDB();
  
  // All-time stats
  const allTime = db.prepare(`
    SELECT 
      COUNT(*) as totalRequests,
      COALESCE(SUM(inputTokens + outputTokens), 0) as totalTokens,
      COALESCE(SUM(cost), 0) as totalCost,
      COALESCE(SUM(CASE WHEN isSuccess = 1 THEN 1 ELSE 0 END), 0) as successfulRequests,
      COALESCE(SUM(CASE WHEN isSuccess = 0 THEN 1 ELSE 0 END), 0) as failedRequests,
      COALESCE(AVG(CASE WHEN isSuccess = 1 THEN latencyMs END), 0) as avgLatency
    FROM requests
  `).get() as any;
  
  // Error rates by provider
  const errorRates: Record<string, number> = {};
  const errorRows = db.prepare(`
    SELECT 
      provider,
      COUNT(*) as total,
      SUM(CASE WHEN isSuccess = 0 THEN 1 ELSE 0 END) as errors
    FROM requests
    GROUP BY provider
  `).all() as any[];
  
  for (const row of errorRows) {
    errorRates[row.provider] = row.total > 0 ? (row.errors / row.total) * 100 : 0;
  }
  
  // Average latency by provider
  const avgLatency: Record<string, number> = {};
  const latencyRows = db.prepare(`
    SELECT 
      provider,
      AVG(CASE WHEN isSuccess = 1 THEN latencyMs END) as avgLatency
    FROM requests
    WHERE isSuccess = 1
    GROUP BY provider
  `).all() as any[];
  
  for (const row of latencyRows) {
    avgLatency[row.provider] = Math.round(row.avgLatency || 0);
  }
  
  // Fallback count
  const fallbackCount = db.prepare(`
    SELECT COUNT(*) as count 
    FROM requests 
    WHERE fallbackPath IS NOT NULL AND fallbackPath != '[]'
  `).get() as any;
  
  return {
    session: {
      totalRequests: allTime.totalRequests,
      totalTokens: allTime.totalTokens,
      successfulRequests: allTime.successfulRequests,
      failedRequests: allTime.failedRequests,
    },
    allTime: {
      totalRequests: allTime.totalRequests,
      totalTokens: allTime.totalTokens,
      totalCost: allTime.totalCost,
      avgLatency: Math.round(allTime.avgLatency),
    },
    errorRates,
    avgLatency,
    fallbackCount: fallbackCount?.count || 0,
  };
}
