# Phase 3A — Deployment Summary

## Deployment Info

| Field | Value |
|-------|-------|
| Date | 2026-07-12 |
| Commit | `e951af5` — phase3a-shadow-production-validation |
| Pre-deploy tag | `pre-phase3a-shadow-production-20260712-151039` |
| Rollback commit | `e951af5` |
| Deploy method | systemd restart |

## Pre-Deploy Checklist

- [x] Clean worktree (no uncommitted changes after commit)
- [x] Pre-deploy tag created
- [x] Release branch: main
- [x] No uncommitted secrets
- [x] No unrelated changes
- [x] Environment verified
- [x] Database backup created
- [x] Schema migration applied (canonical_experiment_logs exists with all columns)
- [x] New indexes exist
- [x] No plaintext columns introduced
- [x] Runtime safety confirmed

## Environment Variables

All CANONICAL env vars set in systemd unit:

```
CANONICAL_RUNTIME_MODE=off
CANONICAL_CANARY_SAMPLE_RATE=0
CANONICAL_SHADOW_SAMPLE_RATE=0
CANONICAL_AUTO_DISABLE=true
CANONICAL_EXPERIMENT_LOG_RETENTION_DAYS=14
CANONICAL_MAX_MISMATCH_RATE=0.005
CANONICAL_MAX_CRITICAL_MISMATCH_RATE=0
CANONICAL_MAX_LOG_FAILURES_PER_MINUTE=10
CANONICAL_MIN_REQUESTS_FOR_READINESS=10000
CANONICAL_MIN_ACCESS_KEYS_FOR_READINESS=20
CANONICAL_MIN_RUNTIME_HOURS_FOR_READINESS=168
CANONICAL_READINESS_CRITICAL_MISMATCH_RATE=0
CANONICAL_READINESS_NON_CRITICAL_MISMATCH_RATE=0.005
CANONICAL_READINESS_LATENCY_P99_MS=25
```

## Deployment Verification

| Check | Result |
|-------|--------|
| Application starts cleanly | ✅ |
| Health endpoint healthy | ✅ uptime=2.68s |
| Dashboard loads | ✅ |
| Canonical experiment page loads | ✅ |
| Status endpoint responds | ✅ mode=off |
| Metrics endpoint responds | ✅ observed=0 |
| Logs endpoint responds | ✅ count=0 |
| Readiness endpoint responds | ✅ status=insufficient_data |
| /v1/models works | ✅ |
| /v1/chat/completions works | ✅ |
| Legacy response path unchanged | ✅ |
| No experiment logs created while mode=off | ✅ |
| No migration errors | ✅ |
| No inference regressions | ✅ |
| No alert spam | ✅ |
| No secrets in logs | ✅ |
| Canary control blocked | ✅ |
| Enforced mode blocked | ✅ |

## Smoke Test Results

| Test | Status |
|------|--------|
| GET /v1/models | ✅ |
| Health endpoint | ✅ |
| Canonical experiment status | ✅ |
| Canonical experiment metrics | ✅ |
| Canonical experiment logs | ✅ |
| Canonical experiment readiness | ✅ |

## Deployment Notes

- Deployed with `CANONICAL_RUNTIME_MODE=off` as initial state
- Shadow mode will be enabled at Stage 1 (1%) in next step
- No user-visible changes during deployment
- Legacy runtime continues to be the sole response path
- All experiment infrastructure deployed and verified operational
