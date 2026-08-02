// 8Router — Phase 5F Production Hardening
// Reliability, observability, security closure, rate limiting, RC validation

// ═══════════════════════════════════════════════════════════════
// Feature Flags
// ═══════════════════════════════════════════════════════════════

export function isHardeningEnabled(): boolean {
  return process.env.PROVIDER_HARDENING_ENABLED === 'true';
}

// ═══════════════════════════════════════════════════════════════
// Rate Limiter (in-memory, per-key)
// ═══════════════════════════════════════════════════════════════

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
}

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  resetAt: string;
  reason?: string;
}

const rateLimitBuckets = new Map<string, { count: number; resetAt: number }>();

export function checkRateLimit(key: string, config: RateLimitConfig): RateLimitResult {
  const now = Date.now();
  const bucket = rateLimitBuckets.get(key);

  if (!bucket || now > bucket.resetAt) {
    rateLimitBuckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return { allowed: true, remaining: config.maxRequests - 1, resetAt: new Date(now + config.windowMs).toISOString() };
  }

  if (bucket.count >= config.maxRequests) {
    return { allowed: false, remaining: 0, resetAt: new Date(bucket.resetAt).toISOString(), reason: 'rate_limit_exceeded' };
  }

  bucket.count++;
  return { allowed: true, remaining: config.maxRequests - bucket.count, resetAt: new Date(bucket.resetAt).toISOString() };
}

export function resetRateLimit(key: string): void {
  rateLimitBuckets.delete(key);
}

export function resetAllRateLimits(): void {
  rateLimitBuckets.clear();
}

// ═══════════════════════════════════════════════════════════════
// Circuit Breaker
// ═══════════════════════════════════════════════════════════════

export type CircuitState = 'closed' | 'open' | 'half_open';

export interface CircuitBreakerConfig {
  failureThreshold: number;
  resetTimeoutMs: number;
  halfOpenMaxRequests: number;
}

export interface CircuitBreakerState {
  providerId: string;
  state: CircuitState;
  failureCount: number;
  lastFailureAt: string | null;
  nextRetryAt: string | null;
  halfOpenRequests: number;
}

const circuits = new Map<string, CircuitBreakerState>();

export function getCircuitState(providerId: string, config: CircuitBreakerConfig): CircuitBreakerState {
  let circuit = circuits.get(providerId);
  if (!circuit) {
    circuit = { providerId, state: 'closed', failureCount: 0, lastFailureAt: null, nextRetryAt: null, halfOpenRequests: 0 };
    circuits.set(providerId, circuit);
  }

  // Check if open circuit should transition to half-open
  if (circuit.state === 'open' && circuit.nextRetryAt) {
    if (new Date(circuit.nextRetryAt) <= new Date()) {
      circuit.state = 'half_open';
      circuit.halfOpenRequests = 0;
    }
  }

  return { ...circuit };
}

export function recordCircuitSuccess(providerId: string): void {
  const circuit = circuits.get(providerId);
  if (!circuit) return;
  if (circuit.state === 'half_open') {
    circuit.state = 'closed';
    circuit.failureCount = 0;
    circuit.lastFailureAt = null;
    circuit.nextRetryAt = null;
  }
  if (circuit.state === 'closed') {
    circuit.failureCount = Math.max(0, circuit.failureCount - 1);
  }
}

export function recordCircuitFailure(providerId: string, config: CircuitBreakerConfig): CircuitBreakerState {
  let circuit = circuits.get(providerId);
  if (!circuit) {
    circuit = { providerId, state: 'closed', failureCount: 0, lastFailureAt: null, nextRetryAt: null, halfOpenRequests: 0 };
    circuits.set(providerId, circuit);
  }

  circuit.failureCount++;
  circuit.lastFailureAt = new Date().toISOString();

  if (circuit.state === 'half_open' || circuit.failureCount >= config.failureThreshold) {
    circuit.state = 'open';
    circuit.nextRetryAt = new Date(Date.now() + config.resetTimeoutMs).toISOString();
  }

  return { ...circuit };
}

export function resetCircuit(providerId: string): void {
  circuits.delete(providerId);
}

export function resetAllCircuits(): void {
  circuits.clear();
}

// ═══════════════════════════════════════════════════════════════
// Structured Logging
// ═══════════════════════════════════════════════════════════════

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  timestamp: string;
  correlationId?: string;
  providerId?: string;
  requestId?: string;
  duration?: number;
  metadata?: Record<string, unknown>;
}

export function createLogEntry(level: LogEntry['level'], message: string, meta?: Partial<LogEntry>): LogEntry {
  return {
    level,
    message,
    timestamp: new Date().toISOString(),
    ...meta,
  };
}

export function sanitizeLogEntry(entry: LogEntry): LogEntry {
  const sanitized = { ...entry };
  if (sanitized.metadata) {
    const meta = { ...sanitized.metadata };
    // Remove any potential secrets
    for (const key of Object.keys(meta)) {
      if (/secret|key|token|password|credential|authorization|auth/i.test(key)) {
        meta[key] = '[REDACTED]';
      }
    }
    sanitized.metadata = meta;
  }
  return sanitized;
}

// ═══════════════════════════════════════════════════════════════
// Timeout Policy
// ═══════════════════════════════════════════════════════════════

export interface TimeoutConfig {
  connectMs: number;
  requestMs: number;
  streamIdleMs: number;
  streamTotalMs: number;
}

export const DEFAULT_TIMEOUTS: TimeoutConfig = {
  connectMs: 5000,
  requestMs: 30000,
  streamIdleMs: 10000,
  streamTotalMs: 120000,
};

export function validateTimeouts(config: Partial<TimeoutConfig>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (config.connectMs !== undefined && (config.connectMs < 100 || config.connectMs > 60000)) errors.push('connectMs must be 100-60000');
  if (config.requestMs !== undefined && (config.requestMs < 1000 || config.requestMs > 300000)) errors.push('requestMs must be 1000-300000');
  if (config.streamIdleMs !== undefined && (config.streamIdleMs < 1000 || config.streamIdleMs > 60000)) errors.push('streamIdleMs must be 1000-60000');
  if (config.streamTotalMs !== undefined && (config.streamTotalMs < 5000 || config.streamTotalMs > 600000)) errors.push('streamTotalMs must be 5000-600000');
  return { valid: errors.length === 0, errors };
}

// ═══════════════════════════════════════════════════════════════
// Health / Readiness
// ═══════════════════════════════════════════════════════════════

export type HealthStatus = 'healthy' | 'degraded' | 'unhealthy';

export interface HealthCheck {
  component: string;
  status: HealthStatus;
  detail: string;
  latencyMs?: number;
}

export interface HealthReport {
  status: HealthStatus;
  checks: HealthCheck[];
  timestamp: string;
  uptime: number;
}

const startTime = Date.now();

export function getHealthReport(checks: HealthCheck[]): HealthReport {
  const hasUnhealthy = checks.some(c => c.status === 'unhealthy');
  const hasDegraded = checks.some(c => c.status === 'degraded');

  return {
    status: hasUnhealthy ? 'unhealthy' : hasDegraded ? 'degraded' : 'healthy',
    checks,
    timestamp: new Date().toISOString(),
    uptime: Date.now() - startTime,
  };
}

// ═══════════════════════════════════════════════════════════════
// RC Validation Matrix
// ═══════════════════════════════════════════════════════════════

export type RCValidationCategory = 'unit' | 'runtime_api' | 'database' | 'bridge' | 'provider' | 'credential' | 'routing' | 'dashboard' | 'integration' | 'live';

export interface RCValidationEntry {
  category: RCValidationCategory;
  suite: string;
  passed: number;
  failed: number;
  skipped: number;
  notes?: string;
}

export interface RCValidationMatrix {
  entries: RCValidationEntry[];
  totalPassed: number;
  totalFailed: number;
  totalSkipped: number;
  ready: boolean;
  timestamp: string;
}

export function buildRCValidationMatrix(entries: RCValidationEntry[]): RCValidationMatrix {
  return {
    entries,
    totalPassed: entries.reduce((s, e) => s + e.passed, 0),
    totalFailed: entries.reduce((s, e) => s + e.failed, 0),
    totalSkipped: entries.reduce((s, e) => s + e.skipped, 0),
    ready: entries.every(e => e.failed === 0),
    timestamp: new Date().toISOString(),
  };
}

// ═══════════════════════════════════════════════════════════════
// Retention Policy
// ═══════════════════════════════════════════════════════════════

export interface RetentionPolicy {
  historyDays: number;
  evidenceDays: number;
  logsDays: number;
  auditDays: number;
}

export const DEFAULT_RETENTION: RetentionPolicy = {
  historyDays: 90,
  evidenceDays: 365,
  logsDays: 30,
  auditDays: 365,
};

export function validateRetentionPolicy(policy: Partial<RetentionPolicy>): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (policy.historyDays !== undefined && policy.historyDays < 7) errors.push('historyDays must be >= 7');
  if (policy.evidenceDays !== undefined && policy.evidenceDays < 30) errors.push('evidenceDays must be >= 30');
  if (policy.logsDays !== undefined && policy.logsDays < 7) errors.push('logsDays must be >= 7');
  if (policy.auditDays !== undefined && policy.auditDays < 30) errors.push('auditDays must be >= 30');
  return { valid: errors.length === 0, errors };
}
