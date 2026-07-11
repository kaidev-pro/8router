// 8Router — Usage Queries (Phase 2E)
// SQL queries for usage aggregation, log listing, and request detail

import { getDB } from '../../database.js';
import type {
  UsageSummary, TimeseriesPoint, BreakdownRow,
  LogFilters, LogListResult, Pagination,
  RuntimeRequestLog, RuntimeRequestAttempt,
  TimeRange, Granularity, UsageMetric,
} from './types.js';

// ── Helpers ──────────────────────────────────────────────────────

function rangeToDate(range: TimeRange, from?: string, to?: string): { start: string; end: string } {
  const end = to || new Date().toISOString();
  if (from) return { start: from, end };
  const now = new Date();
  const ms: Record<TimeRange, number> = { '24h': 86400000, '7d': 604800000, '30d': 2592000000, '90d': 7776000000 };
  const start = new Date(now.getTime() - (ms[range] || ms['7d'])).toISOString();
  return { start, end };
}

function safeNum(v: any): number { return typeof v === 'number' ? v : 0; }
function safeNull(v: any): number | null { return typeof v === 'number' ? v : null; }

// ── Usage Summary ────────────────────────────────────────────────

export function getUsageSummary(userId: string, range: TimeRange = '7d', from?: string, to?: string): UsageSummary {
  const db = getDB();
  const { start, end } = rangeToDate(range, from, to);
  const row = db.prepare(`
    SELECT
      COUNT(*) as totalRequests,
      SUM(CASE WHEN success = 1 OR status = 'success' THEN 1 ELSE 0 END) as successfulRequests,
      SUM(CASE WHEN success = 0 OR status = 'failed' THEN 1 ELSE 0 END) as failedRequests,
      SUM(COALESCE(inputTokens, 0)) as totalInputTokens,
      SUM(COALESCE(outputTokens, 0)) as totalOutputTokens,
      SUM(COALESCE(totalTokens, 0)) as totalTokens,
      SUM(COALESCE(estimatedTotalCost, 0)) as estimatedTotalCost,
      AVG(latencyMs) as averageLatencyMs,
      SUM(COALESCE(fallbackCount, 0)) as fallbackCount,
      SUM(CASE WHEN hadFallback = 1 THEN 1 ELSE 0 END) as hadFallbackCount,
      COUNT(DISTINCT actualProvider) as uniqueProviders,
      COUNT(DISTINCT actualModel) as uniqueModels
    FROM runtime_request_logs
    WHERE userId = ? AND createdAt >= ? AND createdAt <= ?
  `).get(userId, start, end) as any;

  const total = safeNum(row?.totalRequests);
  const success = safeNum(row?.successfulRequests);
  const costTotal = safeNull(row?.estimatedTotalCost);
  return {
    totalRequests: total,
    successfulRequests: success,
    failedRequests: safeNum(row?.failedRequests),
    successRate: total > 0 ? Math.round((success / total) * 10000) / 100 : 0,
    totalInputTokens: safeNum(row?.totalInputTokens),
    totalOutputTokens: safeNum(row?.totalOutputTokens),
    totalTokens: safeNum(row?.totalTokens),
    estimatedTotalCost: costTotal != null && costTotal > 0 ? Math.round(costTotal * 1000000) / 1000000 : null,
    averageLatencyMs: row?.averageLatencyMs ? Math.round(row.averageLatencyMs) : null,
    fallbackCount: safeNum(row?.fallbackCount),
    fallbackRate: total > 0 ? Math.round((safeNum(row?.hadFallbackCount) / total) * 10000) / 100 : 0,
    uniqueProviders: safeNum(row?.uniqueProviders),
    uniqueModels: safeNum(row?.uniqueModels),
  };
}

// ── Timeseries ───────────────────────────────────────────────────

export function getUsageTimeseries(userId: string, range: TimeRange = '7d', granularity: Granularity = 'day', metric: UsageMetric = 'requests', from?: string, to?: string): TimeseriesPoint[] {
  const db = getDB();
  const { start, end } = rangeToDate(range, from, to);

  let selectExpr: string;
  switch (metric) {
    case 'requests': selectExpr = 'COUNT(*)'; break;
    case 'tokens':   selectExpr = 'COALESCE(SUM(totalTokens), 0)'; break;
    case 'cost':     selectExpr = 'COALESCE(SUM(estimatedTotalCost), 0)'; break;
    case 'latency':  selectExpr = 'COALESCE(AVG(latencyMs), 0)'; break;
    case 'errors':   selectExpr = "SUM(CASE WHEN status = 'failed' OR success = 0 THEN 1 ELSE 0 END)"; break;
    case 'fallbacks': selectExpr = 'SUM(COALESCE(fallbackCount, 0))'; break;
    default: selectExpr = 'COUNT(*)';
  }

  let dateFormat: string;
  switch (granularity) {
    case 'hour': dateFormat = "%Y-%m-%dT%H:00:00"; break;
    case 'day':  dateFormat = "%Y-%m-%d"; break;
    case 'week': dateFormat = "%Y-W%W"; break;
    default: dateFormat = "%Y-%m-%d";
  }

  const rows = db.prepare(`
    SELECT strftime('${dateFormat}', createdAt) as ts, ${selectExpr} as val
    FROM runtime_request_logs
    WHERE userId = ? AND createdAt >= ? AND createdAt <= ?
    GROUP BY ts ORDER BY ts
  `).all(userId, start, end) as any[];

  return rows.map(r => ({ timestamp: r.ts, value: safeNum(r.val) }));
}

// ── Breakdowns ───────────────────────────────────────────────────

function getBreakdown(userId: string, groupCol: string, range: TimeRange, from?: string, to?: string): BreakdownRow[] {
  const db = getDB();
  const { start, end } = rangeToDate(range, from, to);
  const rows = db.prepare(`
    SELECT ${groupCol} as key,
      COUNT(*) as requests,
      COALESCE(SUM(totalTokens), 0) as tokens,
      SUM(COALESCE(estimatedTotalCost, 0)) as estimatedCost,
      AVG(latencyMs) as averageLatencyMs,
      SUM(CASE WHEN success = 1 OR status = 'success' THEN 1 ELSE 0 END) as successes
    FROM runtime_request_logs
    WHERE userId = ? AND createdAt >= ? AND createdAt <= ?
    GROUP BY ${groupCol}
    ORDER BY requests DESC
  `).all(userId, start, end) as any[];

  return rows.map(r => ({
    key: r.key || 'unknown',
    requests: safeNum(r.requests),
    tokens: safeNum(r.tokens),
    estimatedCost: r.estimatedCost > 0 ? Math.round(r.estimatedCost * 1000000) / 1000000 : null,
    averageLatencyMs: r.averageLatencyMs ? Math.round(r.averageLatencyMs) : null,
    successRate: r.requests > 0 ? Math.round((safeNum(r.successes) / r.requests) * 10000) / 100 : 0,
  }));
}

export function getUsageByProvider(userId: string, range: TimeRange, from?: string, to?: string): BreakdownRow[] {
  return getBreakdown(userId, 'COALESCE(actualProvider, \'unknown\')', range, from, to);
}
export function getUsageByModel(userId: string, range: TimeRange, from?: string, to?: string): BreakdownRow[] {
  return getBreakdown(userId, 'COALESCE(actualModel, \'unknown\')', range, from, to);
}
export function getUsageByAccessKey(userId: string, range: TimeRange, from?: string, to?: string): BreakdownRow[] {
  return getBreakdown(userId, 'COALESCE(accessKeyId, \'unknown\')', range, from, to);
}
export function getUsageByAlias(userId: string, range: TimeRange, from?: string, to?: string): BreakdownRow[] {
  return getBreakdown(userId, 'COALESCE(requestedAlias, requestedModel, \'unknown\')', range, from, to);
}

// ── Request Logs ─────────────────────────────────────────────────

export function getRecentRequests(userId: string, filters: LogFilters = {}, page = 1, pageSize = 25): LogListResult {
  const db = getDB();
  pageSize = Math.min(Math.max(pageSize, 1), 100);
  page = Math.max(page, 1);

  const wheres: string[] = ['userId = ?'];
  const params: any[] = [userId];

  if (filters.status) { wheres.push('status = ?'); params.push(filters.status); }
  if (filters.provider) { wheres.push('actualProvider = ?'); params.push(filters.provider); }
  if (filters.model) { wheres.push('actualModel = ?'); params.push(filters.model); }
  if (filters.alias) { wheres.push('requestedAlias = ?'); params.push(filters.alias); }
  if (filters.accessKeyId) { wheres.push('accessKeyId = ?'); params.push(filters.accessKeyId); }
  if (filters.hadFallback !== undefined) { wheres.push('hadFallback = ?'); params.push(filters.hadFallback ? 1 : 0); }
  if (filters.errorType) { wheres.push('errorType = ?'); params.push(filters.errorType); }
  if (filters.from) { wheres.push('createdAt >= ?'); params.push(filters.from); }
  if (filters.to) { wheres.push('createdAt <= ?'); params.push(filters.to); }
  if (filters.search) { wheres.push('(requestedModel LIKE ? OR actualModel LIKE ? OR errorMessage LIKE ?)'); params.push(`%${filters.search}%`, `%${filters.search}%`, `%${filters.search}%`); }

  const where = wheres.join(' AND ');
  const total = safeNum((db.prepare(`SELECT COUNT(*) as c FROM runtime_request_logs WHERE ${where}`).get(...params) as any)?.c);
  const offset = (page - 1) * pageSize;

  const items = db.prepare(`
    SELECT * FROM runtime_request_logs WHERE ${where}
    ORDER BY createdAt DESC LIMIT ? OFFSET ?
  `).all(...params, pageSize, offset) as Partial<RuntimeRequestLog>[];

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ── Request Detail ───────────────────────────────────────────────

export function getRequestDetail(userId: string, requestId: string): { log: RuntimeRequestLog | null; attempts: RuntimeRequestAttempt[] } {
  const db = getDB();
  const log = db.prepare('SELECT * FROM runtime_request_logs WHERE userId = ? AND id = ?').get(userId, requestId) as RuntimeRequestLog | null;
  if (!log) return { log: null, attempts: [] };
  const attempts = db.prepare('SELECT * FROM runtime_request_attempts WHERE requestLogId = ? ORDER BY attemptIndex ASC').all(requestId) as RuntimeRequestAttempt[];
  return { log, attempts };
}

// ── Fallback Logs ────────────────────────────────────────────────

export function getFallbackLogs(userId: string, page = 1, pageSize = 25): LogListResult {
  const db = getDB();
  pageSize = Math.min(Math.max(pageSize, 1), 100);
  page = Math.max(page, 1);

  const total = safeNum((db.prepare(`SELECT COUNT(*) as c FROM runtime_request_logs WHERE userId = ? AND (hadFallback = 1 OR fallbackCount > 0)`).get(userId) as any)?.c);
  const offset = (page - 1) * pageSize;

  const items = db.prepare(`
    SELECT * FROM runtime_request_logs
    WHERE userId = ? AND (hadFallback = 1 OR fallbackCount > 0)
    ORDER BY createdAt DESC LIMIT ? OFFSET ?
  `).all(userId, pageSize, offset) as Partial<RuntimeRequestLog>[];

  return {
    items,
    pagination: { page, pageSize, total, totalPages: Math.ceil(total / pageSize) },
  };
}

// ── Retention Cleanup ────────────────────────────────────────────

export function cleanupExpiredLogs(retentionDays: number = 30): { deletedRequests: number; deletedAttempts: number } {
  const db = getDB();
  const cutoff = new Date(Date.now() - retentionDays * 86400000).toISOString();

  const delAttempts = db.prepare(`
    DELETE FROM runtime_request_attempts WHERE requestLogId IN (
      SELECT id FROM runtime_request_logs WHERE createdAt < ?
    )
  `).run(cutoff);

  const delRequests = db.prepare(`DELETE FROM runtime_request_logs WHERE createdAt < ?`).run(cutoff);

  return {
    deletedRequests: delRequests.changes,
    deletedAttempts: delAttempts.changes,
  };
}
