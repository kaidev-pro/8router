# Phase 3A Controlled Beta Evidence — Preflight

Date: 2026-07-15
Repository: /root/8router
Starting HEAD: 841fd7a967f25450fe5fddea421157d37b00a19a
Branch: main
Remote state: origin/main...main = 0 behind / 25 ahead
Risk: UNPUSHED_CANONICAL_HISTORY

## Validation Results
- npx tsc --noEmit: PASS (exit 0)
- npm run build: PASS (exit 0)
- npm test: PASS (exit 0)
- npm run doctor: command exit 0, but product checks report /v1/chat/completions not working and i18n coverage warnings.
- npm run lint: NOT_CONFIGURED (no lint script in package.json)

## Application Secrets
- ACCESS_KEY_HASH_SECRET: NOT_LOADED_BY_RUNTIME
- PROVIDER_KEY_ENCRYPTION_SECRET: NOT_LOADED_BY_RUNTIME

No secret value printed, copied, committed, or stored in this evidence.

## Provider Credential Activation
No provider credential activated. Provider credential list is empty.

Status: BLOCKED_EXTERNAL / MISSING_CREDENTIAL

## Internal Smoke Access Key
A temporary internal-smoke access key was created through the official API and output was redacted in terminal evidence.

Evidence:
- ID: 74528286-e8c7-431f-a8d5-11008095dc0c
- Fingerprint: sk-8router_****...2b80
- Raw key: not recorded
- Post-test state: revoked and deleted

Security note: creation succeeded while ACCESS_KEY_HASH_SECRET was not loaded by systemd. Treat as preflight finding; production smoke key must be regenerated after secret is loaded.

## Runtime Readiness
- systemd service: active (running)
- Health endpoint: /health HTTP 200
- Models endpoint: /v1/models HTTP 200
- Canonical status endpoint: /8router/api/canonical-experiment/status HTTP 200
- Canonical readiness endpoint: /8router/api/canonical-experiment/readiness HTTP 200, status insufficient_data
- Canonical runtime config: mode shadow, sample rate 0.01, auto-disable true, canary percent 0
- Canonical state: no observed requests, no shadow requests, no canonical logs yet

## Controlled Request Results
No provider-backed successful chat completion was executed because:
1. provider credential list is empty;
2. application secrets are not loaded by runtime;
3. doctor reports /v1/chat/completions not working.

Counts:
- Successful: 0
- Expected rejection: 0
- Unexpected failure: 0
- Skipped due blocker: provider-backed smoke traffic

## Canonical / Shadow Evidence
- Readiness endpoint available.
- Evidence status: insufficient_data.
- No runtime provider request, no shadow log, no provider routing result.

## Decision
Phase 3A decision: BLOCKED_EXTERNAL

Reason: engineering readiness still holds, but controlled live validation cannot proceed until application secrets and at least one real provider credential are loaded using official flows.
