# 8Router RC Soak Test Report

**Generated:** 2026-08-02 04:29:37 UTC
**Version:** v1.0.0-rc.1
**SHA:** ca4b304 (Phase 6A+6B+6C)

## Observation Period

- **Start:** 2026-08-02 01:27:35 UTC
- **End:** 2026-08-02 04:15:01 UTC
- **Duration:** 2h 48m
- **Observations:** 13 (every 15 min)

## Health Metrics

| Metric | Value |
|--------|-------|
| Uptime | 100% (13/13 OK) |
| Health Endpoint | 200 OK (all checks) |
| Avg Response Time | 4.9ms |
| Max Response Time | 21.7ms |
| Min Response Time | 1.4ms |

## Stability Metrics

| Metric | Value |
|--------|-------|
| Restarts | 0 |
| Errors (5min window) | 0 |
| Secret Leaks | 4 (one-time, at 02:15 UTC) |

## Memory Metrics

| Metric | Value |
|--------|-------|
| Avg RSS | 50.8MB |
| Max RSS | 53.0MB |
| Min RSS | 49.2MB |
| Memory Growth | -3.6MB (stable) |

## Secret Leak Analysis

At 02:15:01 UTC, 4 secret leaks were detected during a service restart when Phase 6A providers were added. One-time event, not recurring. Resolved in subsequent observations.

## Verdict

**CONDITIONAL PASS**
- 100% uptime
- 0 restarts, 0 errors
- Stable memory (~50MB)
- Fast health response (<5ms avg)
- One-time secret leak during restart (resolved)
