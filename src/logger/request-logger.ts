// 8Router — Request Logger with SQLite
// Full request/response logging, usage analytics, cost estimation

import Database from 'better-sqlite3';
import path from 'path';
import { Request, Response, NextFunction } from 'express';

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
        user_agent TEXT
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
    `);

    return db;
  } catch (err) {
    console.error('Failed to init logging DB:', err);
    throw err;
  }
}

export function logRequest(log: RequestLog): void {
  try {
    const d = getDb();

    d.prepare(`
      INSERT OR REPLACE INTO requests (id, timestamp, model, provider, format, prompt_tokens, completion_tokens, total_tokens, cost, latency_ms, status, error_message, client_ip, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      log.id, log.timestamp, log.model, log.provider, log.format,
      log.promptTokens, log.completionTokens, log.totalTokens,
      log.cost, log.latencyMs, log.status, log.errorMessage || null,
      log.clientIp || null, log.userAgent || null
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

// ═══════════════════════════════════════════════
// STRUCTURED HTTP REQUEST LOGGING (Express)
// ═══════════════════════════════════════════════

export interface HTTPLogEntry {
  method: string;
  path: string;
  statusCode: number;
  latencyMs: number;
  ip: string;
  userAgent: string;
  apiKeyName: string;
  timestamp: string;
}

const httpLogBuffer: HTTPLogEntry[] = [];
const MAX_BUFFER = 1000;

/**
 * Express middleware that logs HTTP request/response details.
 * Logs to console and buffers for API retrieval.
 */
export function httpRequestLogger(req: Request, res: Response, next: NextFunction): void {
  const start = Date.now();

  // Capture end event
  res.on('finish', () => {
    const latencyMs = Date.now() - start;
    const logEntry: HTTPLogEntry = {
      method: req.method,
      path: req.originalUrl || req.url,
      statusCode: res.statusCode,
      latencyMs,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: (req.headers['user-agent'] || 'unknown').slice(0, 120),
      apiKeyName: (req as any).apiKey?.name || 'anonymous',
      timestamp: new Date().toISOString(),
    };

    // Buffer for API retrieval
    httpLogBuffer.push(logEntry);
    if (httpLogBuffer.length > MAX_BUFFER) {
      httpLogBuffer.splice(0, httpLogBuffer.length - MAX_BUFFER);
    }

    // Console log
    const statusColor = res.statusCode >= 500 ? '\x1b[31m' : res.statusCode >= 400 ? '\x1b[33m' : '\x1b[32m';
    console.log(
      `\x1b[90m[${new Date().toLocaleTimeString()}]\x1b[0m ` +
      `${statusColor}${res.statusCode}\x1b[0m ` +
      `${req.method.padEnd(6)} ` +
      `${logEntry.path.slice(0, 80)} ` +
      `\x1b[90m${latencyMs}ms\x1b[0m ` +
      `${logEntry.apiKeyName !== 'anonymous' ? `\x1b[36m[${logEntry.apiKeyName}]\x1b[0m` : ''}`
    );
  });

  next();
}

/**
 * Get recent HTTP request logs.
 */
export function getHttpLogs(count: number = 50): HTTPLogEntry[] {
  return httpLogBuffer.slice(-count).reverse();
}

/**
 * Clear HTTP logs.
 */
export function clearHttpLogs(): void {
  httpLogBuffer.length = 0;
}
