# Phase 3A Live Validation Readiness

Decision: BLOCKED_EXTERNAL

## Decision History
READY_WITH_CONDITIONS -> preflight discovered unresolved secret enforcement -> NOT_READY -> runtime secret enforcement fixed and configured -> BLOCKED_EXTERNAL pending provider credential and live traffic.

## Engineering Readiness
READY

Evidence:
- TypeScript: PASS
- Build: PASS
- Test suite: PASS
- Runtime service: active
- Canonical readiness endpoint: available
- Shadow mode config: enabled with sample rate 0.01
- Kill switch / auto-disable: available

## Security Readiness
READY_FOR_PROVIDER_ACTIVATION

Evidence:
- Missing/invalid ACCESS_KEY_HASH_SECRET now fails closed in production.
- Missing/invalid PROVIDER_KEY_ENCRYPTION_SECRET now fails closed in production.
- Runtime readiness reports securityConfiguration without secret values.
- Stable HMAC restart smoke passed with generated temporary key.
- Temporary smoke key deleted after test.

## Credential Readiness
PARTIAL

- ACCESS_KEY_HASH_SECRET: PRESENT_AND_VALID
- PROVIDER_KEY_ENCRYPTION_SECRET: PRESENT_AND_VALID
- Provider credentials: none active

## Infrastructure Readiness
PARTIAL

- Local service healthy on 127.0.0.1:8080
- /health: HTTP 200
- /v1/models: HTTP 200
- /v1/chat/completions provider-backed success not tested because provider credential is missing

## Production Traffic Readiness
NOT_READY

No provider-backed request executed. No canonical/shadow logs from live provider traffic yet.

## Required Owner Actions
1. Approve/defer push of local canonical main: APPROVE_PUSH_CANONICAL_MAIN.
2. Approve/defer tag creation: APPROVE_CREATE_PHASE3A_TAG (phase3a-preflight-blocked-20260716).
3. Add one real provider credential via official 8Router encrypted credential flow.
4. Generate a fresh internal-smoke access key after provider activation.
5. Re-run controlled provider-backed smoke traffic.

## Runtime Secret Source Reconciliation Update — 2026-07-16

Source reconciliation completed in `docs/audits/runtime-secret-source-reconciliation.md` at HEAD `1dc8868`.

Outcome: `FALSE_NEGATIVE_RESOLVED`.

Key corrections:

- Prior `NOT_LOADED_BY_RUNTIME` wording is superseded.
- Required runtime secrets are `PRESENT_IN_PROCESS_ENV` for active `8router.service`.
- Active loading chain is systemd drop-in `/etc/systemd/system/8router.service.d/secrets.conf` with `EnvironmentFile=/etc/8router/secrets.env`.
- `/root/8router/.env` exists but is ignored, untracked, not active declared production source, and was corrected to mode `0600`.
- `src/security/access-keys/hash.ts` is `FAIL_CLOSED_CONFIRMED` under `NODE_ENV=production` when `ACCESS_KEY_HASH_SECRET` is missing or invalid.
- Provider credential encryption is fail-closed under `NODE_ENV=production` when `PROVIDER_KEY_ENCRYPTION_SECRET` is missing or invalid.
- `npm run test:provider-activation-security` passed: `24 passed, 0 failed`.
- Full-history redacted `gitleaks` scan completed with no `REAL_SECRET` findings; matches were classified as `TEST_FIXTURE` or `FALSE_POSITIVE`.

Phase 3A remains `NOT_READY` until live validation prerequisites and runtime diagnostics are updated/validated end to end. Do not activate provider-backed traffic from this audit alone.

## Production i18n Regression Update — 2026-07-18

Decision remains: BLOCKED_EXTERNAL after UI regression fix.

Resolved engineering regression:
- Raw landing translation keys were caused by invalid JSON in `src/i18n/en.json` and `src/i18n/ja.json`.
- Locale variants now normalize safely: `id-ID -> id`, `en-US -> en`, `ja-JP -> ja`.
- Missing-key fallback no longer returns raw keys as public content.
- Regression evidence: `docs/audits/production-i18n-regression-audit.md`.

Validation:
- TypeScript: PASS, exit 0.
- Build: PASS, exit 0.
- Test suite: PASS, exit 0, `20 passed, 0 failed`; i18n subtests `12 passed, 0 failed`.
- Provider activation security tests: PASS, exit 0, `24 passed, 0 failed`.
- Doctor: exit 0, `FAILURES=0 WARNINGS=1 BLOCKED=1`.

No provider activation, live provider traffic, push, or tag was performed.

## Doctor Hygiene and i18n Completion — 2026-07-18

Doctor hygiene: PASSED.
i18n coverage: COMPLETE.

Doctor now reports the honest pre-provider state:

```text
FAILURES=0 WARNINGS=0 BLOCKED=0 NOT_CONFIGURED=1
```

`/v1/chat/completions` provider-backed live validation is classified as `NOT_CONFIGURED` until a provider credential and smoke access key are intentionally configured. It is not marked as live-verified.

Phase 3A remains `BLOCKED_EXTERNAL` pending provider credential activation and live evidence. No provider activation, credential change, access-key generation, or live provider traffic was performed.

Evidence: `docs/audits/doctor-hygiene-and-i18n-completion.md`.
