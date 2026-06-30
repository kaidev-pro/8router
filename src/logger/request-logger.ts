// 8Router — Request Logger with SQLite
// Full request/response logging, usage analytics, cost estimation
// v2.0: Added keyIndex, keyAlias, fallbackPath, circuitBreaker tracking

import Database from 'better-sqlite3';
import path from 'path';

const DB_PATH = path.join(process.cwd(), 'data', '8router.db');

export interface RequestLog {
  id: string;
  timestamp: number;
  model: string;
  provider: string;
  format: string;
  promptTokens: number;
  completionTokens: number;
  totalTokens: number;
  cost: number;
  latencyMs: number;
  status: 'success' | 'error' | 'fallback';
  errorMessage?: string;
  clientIp?: string;
  userAgent?: string;
  // v2.0 additions
  keyIndex?: string;
  keyAlias?: string;
  fallbackPath?: string;
}

export interface DailyUsage {
  date: string;
  requests: number;
  inputTokens: number;
  outputTokens: number;
  cost: number;
  errors: number;
}

export interface CostEstimate {
  provider: string;
  model: string;
  inputPerMToken: number;
  outputPerMToken: number;
}

// Provider pricing (per million tokens)
const PRICING: Record<string, Record<string, CostEstimate>> = {
  groq: {
    'llama-3.1-8b-instant': { provider: 'groq', model: 'llama-3.1-8b-instant', inputPerMToken: 0.05, outputPerMToken: 0.08 },
    'llama-3.3-70b-versatile': { provider: 'groq', model: 'llama-3.3-70b-versatile', inputPerMToken: 0.59, outputPerMToken: 0.79 },
    'mixtral-8x7b-32768': { provider: 'groq', model: 'mixtral-8x7b-32768', inputPerMToken: 0.24, outputPerMToken: 0.24 },
  },
  mistral: {
    'mistral-large-latest': { provider: 'mistral', model: 'mistral-large-latest', inputPerMToken: 2.0, outputPerMToken: 6.0 },
    'mistral-small-latest': { provider: 'mistral', model: 'mistral-small-latest', inputPerMToken: 0.1, outputPerMToken: 0.3 },
  },
  mimo: {
    '*': { provider: 'mimo', model: '*', inputPerMToken: 0, outputPerMToken: 0 },
  },
  xiaomi: {
    'mimo-v2-pro': { provider: 'xiaomi', model: 'mimo-v2-pro', inputPerMToken: 0.1, outputPerMToken: 0.3 },
    'mimo-v2-omni': { provider: 'xiaomi', model: 'mimo-v2-omni', inputPerMToken: 0.05, outputPerMToken: 0.15 },
    'mimo-v2-lite': { provider: 'xiaomi', model: 'mimo-v2-lite', inputPerMToken: 0.02, outputPerMToken: 0.06 },
  },
  openrouter: {
    '*': { provider: 'openrouter', model: '*', inputPerMToken: 0.5, outputPerMToken: 1.0 },
  }
};

let db: Database.Database | null = null;

function getDb(): Database.Database {
  if (db) return db;

  try {
    const fs = require('fs');
    const dir = path.dirname(DB_PATH);
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

    db = new Database(DB_PATH);
    db.pragma('journal_mode = WAL');

    db.exec(`
      CREATE TABLE IF NOT EXISTS requests (
        id TEXT PRIMARY KEY,
        timestamp INTEGER NOT NULL,
        model TEXT NOT NULL,
        provider TEXT NOT NULL,
        format TEXT DEFAULT 'openai',
        prompt_tokens INTEGER DEFAULT 0,
        completion_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        latency_ms INTEGER DEFAULT 0,
        status TEXT DEFAULT 'success',
        error_message TEXT,
        client_ip TEXT,
        user_agent TEXT,
        key_index TEXT,
        key_alias TEXT,
        fallback_path TEXT
      );

      CREATE INDEX IF NOT EXISTS idx_requests_timestamp ON requests(timestamp);
      CREATE INDEX IF NOT EXISTS idx_requests_model ON requests(model);
      CREATE INDEX IF NOT EXISTS idx_requests_provider ON requests(provider);

      CREATE TABLE IF NOT EXISTS daily_stats (
        date TEXT PRIMARY KEY,
        requests INTEGER DEFAULT 0,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        errors INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS quota_tracking (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        provider TEXT NOT NULL,
        timestamp INTEGER NOT NULL,
        input_tokens INTEGER DEFAULT 0,
        output_tokens INTEGER DEFAULT 0,
        total_tokens INTEGER DEFAULT 0,
        cost REAL DEFAULT 0,
        request_count INTEGER DEFAULT 0
      );

      CREATE INDEX IF NOT EXISTS idx_quota_provider_time ON quota_tracking(provider, timestamp);

      CREATE TABLE IF NOT EXISTS provider_config (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        enabled INTEGER DEFAULT 1,
        priority INTEGER DEFAULT 0,
        config_json TEXT
      );

      CREATE TABLE IF NOT EXISTS system_settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL,
        updated_at INTEGER DEFAULT (strftime('%s','now'))
      );
    `);

    // Auto-migrate: add columns if they don't exist
    const columns = db.prepare("PRAGMA table_info(requests)").all() as any[];
    const colNames = columns.map(c => c.name);

    if (!colNames.includes('key_index')) {
      try { db.exec("ALTER TABLE requests ADD COLUMN key_index TEXT"); } catch {}
    }
    if (!colNames.includes('key_alias')) {
      try { db.exec("ALTER TABLE requests ADD COLUMN key_alias TEXT"); } catch {}
    }
    if (!colNames.includes('fallback_path')) {
      try { db.exec("ALTER TABLE requests ADD COLUMN fallback_path TEXT"); } catch {}
    }

    return db;
  } catch (err) {
    console.error('Failed to init logging DB:', err);
    throw err;
  }
}

/** Sanitize error message — remove API keys, tokens, secrets */
function sanitizeError(msg: string | undefined): string {
  if (!msg) return '';
  return msg
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, (m) => m.slice(0, 6) + '...' + m.slice(-4))
    .replace(/Bearer [a-zA-Z0-9_.-]{20,}/g, 'Bearer sk-xxxx...xxxx')
    .replace(/token[=:]["']?[a-zA-Z0-9_.-]{20,}/gi, 'token=sk-xxxx...xxxx')
    .replace(/key[=:]["']?[a-zA-Z0-9_.-]{20,}/gi, 'key=sk-xxxx...xxxx');
}

export function logRequest(log: RequestLog): void {
  try {
    const d = getDb();

    d.prepare(`
      INSERT OR REPLACE INTO requests (id, timestamp, model, provider, format, prompt_tokens, completion_tokens, total_tokens, cost, latency_ms, status, error_message, client_ip, user_agent, key_index, key_alias, fallback_path)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id, log.timestamp, log.model, log.provider, log.format,
      log.promptTokens, log.completionTokens, log.totalTokens,
      log.cost, log.latencyMs, log.status, sanitizeError(log.errorMessage),
      log.clientIp || null, log.userAgent || null,
      log.keyIndex || null, log.keyAlias || null, log.fallbackPath || null
    );

    // Update daily stats
    const date = new Date(log.timestamp).toISOString().slice(0, 10);
    d.prepare(`
      INSERT INTO daily_stats (date, requests, input_tokens, output_tokens, cost, errors)
      VALUES (?, 1, ?, ?, ?, ?)
      ON CONFLICT(date) DO UPDATE SET
        requests = requests + 1,
        input_tokens = input_tokens + ?,
        output_tokens = output_tokens + ?,
        cost = cost + ?,
        errors = errors + ?
    `).run(
      date,
      log.promptTokens, log.completionTokens, log.cost,
      log.status === 'error' ? 1 : 0,
      log.promptTokens, log.completionTokens, log.cost,
      log.status === 'error' ? 1 : 0
    );

    // Update quota tracking
    const hourBucket = Math.floor(log.timestamp / 3600000) * 3600000;
    d.prepare(`
      INSERT INTO quota_tracking (provider, timestamp, input_tokens, output_tokens, total_tokens, cost, request_count)
      VALUES (?, ?, ?, ?, ?, ?, 1)
      ON CONFLICT(provider, timestamp) DO UPDATE SET
        input_tokens = input_tokens + ?,
        output_tokens = output_tokens + ?,
        total_tokens = total_tokens + ?,
        cost = cost + ?,
        request_count = request_count + 1
    `).run(
      log.provider, hourBucket,
      log.promptTokens, log.completionTokens, log.totalTokens, log.cost,
      log.promptTokens, log.completionTokens, log.totalTokens, log.cost
    );
  } catch (err) {
    console.error('Failed to log request:', err);
  }
}

export function getRecentRequests(limit: number = 50): RequestLog[] {
  try {
    const d = getDb();
    return d.prepare('SELECT * FROM requests ORDER BY timestamp DESC LIMIT ?').all(limit) as RequestLog[];
  } catch {
    return [];
  }
}

export function getRecentRequestsWithFallback(limit: number = 50): any[] {
  try {
    const d = getDb();
    return d.prepare(`
      SELECT id, timestamp, model, provider, status, latency_ms,
             prompt_tokens, completion_tokens, cost, error_message,
             key_index, key_alias, fallback_path
      FROM requests ORDER BY timestamp DESC LIMIT ?
    `).all(limit);
  } catch {
    return [];
  }
}

export function getDailyUsage(days: number = 7): DailyUsage[] {
  try {
    const d = getDb();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    return d.prepare('SELECT * FROM daily_stats WHERE date >= ? ORDER BY date').all(
      new Date(cutoff).toISOString().slice(0, 10)
    ) as DailyUsage[];
  } catch {
    return [];
  }
}

export function getModelUsage(model: string, days: number = 30): { requests: number; tokens: number; cost: number } {
  try {
    const d = getDb();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const row = d.prepare(`
      SELECT COUNT(*) as requests, SUM(total_tokens) as tokens, SUM(cost) as cost
      FROM requests WHERE model = ? AND timestamp >= ?
    `).get(model, cutoff) as any;
    return { requests: row?.requests || 0, tokens: row?.tokens || 0, cost: row?.cost || 0 };
  } catch {
    return { requests: 0, tokens: 0, cost: 0 };
  }
}

export function getProviderUsage(provider: string, days: number = 30): { requests: number; tokens: number; cost: number } {
  try {
    const d = getDb();
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
    const row = d.prepare(`
      SELECT COUNT(*) as requests, SUM(total_tokens) as tokens, SUM(cost) as cost
      FROM requests WHERE provider = ? AND timestamp >= ?
    `).get(provider, cutoff) as any;
    return { requests: row?.requests || 0, tokens: row?.tokens || 0, cost: row?.cost || 0 };
  } catch {
    return { requests: 0, tokens: 0, cost: 0 };
  }
}

export function getQuotaUsage(provider: string, periodHours: number = 5): {
  inputTokens: number; outputTokens: number; totalTokens: number; cost: number; requests: number;
} {
  try {
    const d = getDb();
    const cutoff = Date.now() - periodHours * 3600000;
    const row = d.prepare(`
      SELECT SUM(input_tokens) as inputTokens, SUM(output_tokens) as outputTokens,
             SUM(total_tokens) as totalTokens, SUM(cost) as cost, SUM(request_count) as requests
      FROM quota_tracking WHERE provider = ? AND timestamp >= ?
    `).get(provider, cutoff) as any;
    return {
      inputTokens: row?.inputTokens || 0,
      outputTokens: row?.outputTokens || 0,
      totalTokens: row?.totalTokens || 0,
      cost: row?.cost || 0,
      requests: row?.requests || 0,
    };
  } catch {
    return { inputTokens: 0, outputTokens: 0, totalTokens: 0, cost: 0, requests: 0 };
  }
}

export function getQuotaSummary(): any[] {
  try {
    const d = getDb();
    const now = Date.now();
    const periods = [
      { label: '5h', ms: 5 * 3600000 },
      { label: '24h', ms: 24 * 3600000 },
      { label: '7d', ms: 7 * 24 * 3600000 },
    ];

    const providers = d.prepare('SELECT DISTINCT provider FROM quota_tracking').all() as any[];
    return providers.map(({ provider }) => {
      const usage: any = { provider };
      for (const p of periods) {
        const row = d.prepare(`
          SELECT SUM(total_tokens) as tokens, SUM(cost) as cost, SUM(request_count) as requests
          FROM quota_tracking WHERE provider = ? AND timestamp >= ?
        `).get(provider, now - p.ms) as any;
        usage[p.label] = { tokens: row?.tokens || 0, cost: row?.cost || 0, requests: row?.requests || 0 };
      }
      return usage;
    });
  } catch {
    return [];
  }
}

export function estimateCost(provider: string, model: string, promptTokens: number, completionTokens: number): number {
  const pricing = PRICING[provider]?.[model] || PRICING[provider]?.['*'] || { inputPerMToken: 0, outputPerMToken: 0 };
  return (promptTokens * pricing.inputPerMToken + completionTokens * pricing.outputPerMToken) / 1_000_000;
}

export function getTotalStats(): {
  totalRequests: number;
  totalTokens: number;
  totalCost: number;
  successfulRequests: number;
  failedRequests: number;
  avgLatencyMs: number;
} {
  try {
    const d = getDb();
    const row = d.prepare(`
      SELECT
        COUNT(*) as totalRequests,
        SUM(total_tokens) as totalTokens,
        SUM(cost) as totalCost,
        SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successfulRequests,
        SUM(CASE WHEN status = 'error' THEN 1 ELSE 0 END) as failedRequests,
        AVG(latency_ms) as avgLatencyMs
      FROM requests
    `).get() as any;
    return {
      totalRequests: row?.totalRequests || 0,
      totalTokens: row?.totalTokens || 0,
      totalCost: row?.totalCost || 0,
      successfulRequests: row?.successfulRequests || 0,
      failedRequests: row?.failedRequests || 0,
      avgLatencyMs: Math.round(row?.avgLatencyMs || 0)
    };
  } catch {
    return { totalRequests: 0, totalTokens: 0, totalCost: 0, successfulRequests: 0, failedRequests: 0, avgLatencyMs: 0 };
  }
}

export function getErrorStats(): {
  totalErrors: number;
  errorRate: number;
  errorsByProvider: Record<string, number>;
  errorsByStatus: Record<string, number>;
  recentErrors: any[];
} {
  try {
    const d = getDb();
    const total = d.prepare('SELECT COUNT(*) as c FROM requests').get() as any;
    const errors = d.prepare("SELECT COUNT(*) as c FROM requests WHERE status = 'error'").get() as any;
    const byProvider = d.prepare(`
      SELECT provider, COUNT(*) as count FROM requests WHERE status = 'error' GROUP BY provider ORDER BY count DESC
    `).all() as any[];
    const recent = d.prepare(`
      SELECT timestamp, provider, model, error_message, key_index, fallback_path
      FROM requests WHERE status = 'error' ORDER BY timestamp DESC LIMIT 20
    `).all() as any[];

    return {
      totalErrors: errors?.c || 0,
      errorRate: total?.c > 0 ? ((errors?.c || 0) / total.c * 100) : 0,
      errorsByProvider: Object.fromEntries(byProvider.map(r => [r.provider, r.count])),
      errorsByStatus: {},
      recentErrors: recent,
    };
  } catch {
    return { totalErrors: 0, errorRate: 0, errorsByProvider: {}, errorsByStatus: {}, recentErrors: [] };
  }
}
