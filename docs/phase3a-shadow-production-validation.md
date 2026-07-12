# Phase 3A — Shadow Production Validation

## Overview

Phase 3A enables the canonical runtime in **shadow mode only** to collect production comparison evidence. Shadow mode performs structural comparison of request/response transformations without making duplicate provider calls. The legacy runtime remains the sole user-facing execution path.

**Status:** Implementation Complete — Production Validation In Progress

## Non-Negotiable Rules

1. Legacy runtime remains the only user-facing execution path
2. Shadow mode never changes the response returned to the user
3. Shadow mode does not trigger a second provider request
4. `canonical.enabled` remains `false` in config
5. `CANONICAL_RUNTIME_MODE` defaults to `off`
6. Canary remains disabled until shadow validation passes
7. `enforced` mode is blocked
8. No prompt, response, tool output, or raw message content is stored
9. No raw provider keys, access keys, hashes, or authorization headers are exposed

## Configuration

### Environment Variables

| Variable | Default | Range | Description |
|----------|---------|-------|-------------|
| `CANONICAL_RUNTIME_MODE` | `off` | `off`, `shadow`, `canary` | Experiment mode (`enforced` is blocked) |
| `CANONICAL_SHADOW_SAMPLE_RATE` | `0` | `0–1` | Fraction of requests sampled for shadow comparison |
| `CANONICAL_CANARY_PERCENT` | `0` | `0–100` | Canary routing percentage (Phase 3C) |
| `CANONICAL_AUTO_DISABLE` | `true` | `true`/`false` | Enable auto-disable on threshold breach |
| `CANONICAL_MISMATCH_THRESHOLD` | `0.01` | `0–1` | Overall mismatch rate threshold |
| `CANONICAL_FAILURE_THRESHOLD` | `0.02` | `0–1` | Canonical failure rate threshold |
| `CANONICAL_MIN_SAMPLES_BEFORE_AUTO_DISABLE` | `50` | `1–10000` | Minimum samples before auto-disable activates |
| `CANONICAL_EXPERIMENT_LOG_RETENTION_DAYS` | `14` | `1–90` | Days to retain experiment logs |
| `CANONICAL_ALERT_WEBHOOK_URL` | `""` | URL | Optional webhook for alert events |
| `CANONICAL_MAX_MISMATCH_RATE` | `0.005` | `0–1` | Auto-disable trigger: mismatch rate |
| `CANONICAL_MAX_CRITICAL_MISMATCH_RATE` | `0` | `0–1` | Auto-disable trigger: critical mismatch rate (zero tolerance) |
| `CANONICAL_MAX_LOG_FAILURES_PER_MINUTE` | `10` | `1–1000` | Auto-disable trigger: log write failures |
| `CANONICAL_EXPERIMENT_USER_ALLOWLIST` | `""` | comma-sep | User IDs that bypass sampling |
| `CANONICAL_EXPERIMENT_ACCESS_KEY_ALLOWLIST` | `""` | comma-sep | Access keys that bypass sampling |

### Recommended Production Settings

```
CANONICAL_RUNTIME_MODE=shadow
CANONICAL_SHADOW_SAMPLE_RATE=0.10
CANONICAL_CANARY_PERCENT=0
CANONICAL_AUTO_DISABLE=true
CANONICAL_EXPERIMENT_LOG_RETENTION_DAYS=14
```

### Staged Rollout

| Stage | Sample Rate |
|-------|-------------|
| 1 | 1% |
| 2 | 5% |
| 3 | 10% |
| 4 | 25% |
| 5 | 50% (only if needed) |

## Runtime Modes

- **off** — Experiment disabled. Production traffic uses legacy runtime only.
- **shadow** — Compare canonical and legacy transformations after response is sent. Never delays user. Never makes duplicate provider calls.
- **canary** — Route a percentage of requests through canonical runtime. Auto-fallback to legacy on failure. (Phase 3C)
- **enforced** — **Blocked.** Always falls back to `off`.

## Shadow Mode Flow

1. Request arrives → legacy runtime processes it normally
2. Response sent to user immediately
3. Shadow comparison runs asynchronously:
   - Normalize request → hash content (SHA-256)
   - Normalize response → hash content (SHA-256)
   - Compare normalized structures
   - Log mismatches with fingerprints only
4. Mismatch counts and metrics updated
5. Auto-disable check runs

Shadow mode **makes no additional provider request**. It only compares the structural transformation of the already-completed request/response.

## Acceptance Gates

| Gate | Threshold | Status |
|------|-----------|--------|
| Minimum compared requests | 10,000 | Required |
| Unique access keys | 20 | Required |
| Runtime duration | 7 days | Required |
| Provider coverage | All active | Required |
| Alias coverage | All active | Required |
| Critical mismatch rate | 0.000% | Required |
| Non-critical mismatch rate | ≤ 0.50% | Required |
| Latency p99 overhead | ≤ 25ms | Required |
| Experiment errors | 0 | Required |

## Mismatch Taxonomy

### Critical Mismatches (Zero Tolerance)

- `request_role` — Role mismatch in request messages
- `response_role` — Role mismatch in response
- `response_tool_call_name` — Tool call function name differs
- `response_tool_call_id` — Tool call ID differs
- `response_finish_reason` — Finish reason differs after normalization
- `response_text_hash` — Content hash differs (even if same length)
- `stream_event_order` — Stream event ordering corruption
- `conversion_error` — Canonical bridge conversion error

### Non-Critical Mismatches

- `request_model`, `request_content_count`, `request_tool_definition`, `request_tool_choice`, `request_generation_config`
- `response_text_length`, `response_usage`, `response_tool_call_arguments_shape`, `response_tool_call_count`
- `stream_delta_type`, `stream_finish_reason`
- `unsupported_extension`, `unknown`

## Fingerprinting

All content fingerprints use SHA-256 truncated to 16 hex characters. No plaintext content is ever stored. Fingerprints are one-way hashes — you cannot reconstruct the original content from a fingerprint.

## Auto-Disable

Auto-disable triggers when:
- Any critical mismatch occurs (zero tolerance)
- Mismatch rate exceeds configured threshold
- Canonical failure rate exceeds threshold
- Log write failure burst exceeds threshold

When auto-disabled:
- Mode returns to `off`
- Legacy runtime continues serving all traffic
- Event is logged with reason
- Optional webhook fires
- No user request fails

## Kill Switch

Manual kill switch available via:
- Dashboard button
- `POST /8router/api/canonical-experiment/manual-disable`

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/8router/api/canonical-experiment/status` | Current mode, state, and metrics |
| GET | `/8router/api/canonical-experiment/metrics` | Extended metrics with coverage and latency |
| GET | `/8router/api/canonical-experiment/logs` | Paginated experiment logs with filters |
| GET | `/8router/api/canonical-experiment/readiness` | Readiness report with gate evaluation |
| GET | `/8router/api/canonical-experiment/readiness/export` | Readiness report as JSON or Markdown |
| PATCH | `/8router/api/canonical-experiment/settings` | Update experiment settings |
| PATCH | `/8router/api/canonical-experiment/shadow-rate` | Update shadow sample rate |
| POST | `/8router/api/canonical-experiment/enable` | Enable experiment |
| POST | `/8router/api/canonical-experiment/disable` | Disable experiment |
| POST | `/8router/api/canonical-experiment/manual-disable` | Manual kill switch |
| POST | `/8router/api/canonical-experiment/retention-cleanup` | Trigger retention cleanup |

### Log Filters

The logs endpoint supports query parameters:
- `critical=1` — Only critical mismatches
- `mismatch_kind=...` — Filter by mismatch kind
- `provider=...` — Filter by provider
- `model=...` — Filter by model
- `alias=...` — Filter by alias

## Dashboard

The Canonical Experiment dashboard page provides:
- **Status Card** — Mode, enabled state, auto-disable status, observed requests, sample rate
- **Readiness Card** — Gate evaluation table with pass/warning/blocked status
- **Metrics Card** — Match rate, mismatch rate, failure rate, fallbacks, critical mismatches, latency percentiles
- **Coverage Matrix** — Requests by provider and alias
- **Mismatch Breakdown** — Top mismatch kinds with critical indicators
- **Controls Card** — Mode switcher, kill switch, retention cleanup
- **Canary Blocked Notice** — Canary remains blocked until shadow validation passes

## Alerting

Optional webhook alerting for critical events:
- `canonical.critical_mismatch`
- `canonical.mismatch_rate_warning`
- `canonical.shadow_auto_disabled`
- `canonical.log_write_failure`
- `canonical.retention_cleanup_failure`
- `canonical.resource_threshold_warning`

Configure via `CANONICAL_ALERT_WEBHOOK_URL`. Alert payloads contain no secrets, raw content, or credentials.

## Retention

Experiment logs are automatically cleaned up based on `CANONICAL_EXPERIMENT_LOG_RETENTION_DAYS` (default 14, range 1–90). Cleanup is non-blocking and non-fatal — errors are logged but do not affect runtime. Runtime request logs are never touched.

## Security & Privacy

- No raw request/response content stored
- No raw provider keys, access keys, or authorization headers exposed
- Fingerprints are one-way SHA-256 hashes
- Alert payloads sanitized — no secrets in webhook calls
- Log entries contain IDs, fingerprints, mismatch kinds, and metadata only
- Provider-key isolation preserved
- Access-key owner isolation preserved

## Rollback Procedure

1. Set `CANONICAL_RUNTIME_MODE=off` (or use dashboard kill switch)
2. Legacy runtime immediately resumes as sole response path
3. No redeployment needed
4. Experiment logs remain for analysis

## Database

The `canonical_experiment_logs` table includes:
- Request/user/access key IDs
- Mode, sampling, eligibility flags
- Comparison results (request/response/stream/tool-calls/usage matched)
- Mismatch count and kinds
- Comparison latency
- Fingerprint hashes (SHA-256)
- Provider, model, alias, critical flag
- Timestamps

Indexes on: `user_id`, `mode`, `request_log_id`, `provider`, `model`, `alias`, `critical`, `mismatch_kind` (all with `created_at`).

## Known Limitations

1. Shadow mode is structural comparison only — it does not verify semantic equivalence of generated text
2. Canary mode is blocked until shadow validation completes
3. Enforced mode is permanently blocked for safety
4. Retention cleanup runs on-demand (Phase 3A) — automated cron cleanup is Phase 3B
5. Coverage gaps for rarely-used providers/aliases are expected initially

## Phase 3B — Canary Readiness Gate (Next)

After shadow validation produces sufficient evidence:
- Consume readiness report
- Freeze accepted mismatch taxonomy
- Define canary cohort
- Define blast-radius limits
- Produce go/no-go decision
