# Phase 5F — Production Hardening & v1.0 RC

## Architecture

Reliability, observability, security closure, rate limiting, timeout policy, health/readiness, RC validation.

## Rate Limiter

In-memory per-key rate limiter:
- Configurable window + max requests
- Per-key isolation
- Remaining count + reset timestamp

## Circuit Breaker

Per-provider circuit breaker:
- States: closed → open → half_open → closed
- Configurable failure threshold + reset timeout
- Automatic half-open transition

## Structured Logging

- LogEntry with level, message, timestamp, correlationId, providerId, requestId
- sanitizeLogEntry() removes secret-pattern keys from metadata
- Patterns: secret, key, token, password, credential, authorization, auth

## Timeout Policy

Configurable timeouts:
- connectMs: 100-60000 (default 5000)
- requestMs: 1000-300000 (default 30000)
- streamIdleMs: 1000-60000 (default 10000)
- streamTotalMs: 5000-600000 (default 120000)

## Health / Readiness

Component-based health:
- healthy/degraded/unhealthy per component
- Aggregate status (worst wins)
- Uptime tracking

## RC Validation Matrix

buildRCValidationMatrix():
- Categorized test results
- Pass/fail/skip counts
- Ready = all failed === 0

## Retention Policy

- historyDays: >= 7 (default 90)
- evidenceDays: >= 30 (default 365)
- logsDays: >= 7 (default 30)
- auditDays: >= 30 (default 365)

## Safety

- No routing mutation
- No credential access
- No network
- Log sanitization removes secrets
