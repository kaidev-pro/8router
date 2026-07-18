# 8Router Blockers and Owner Decisions (2026-07-15)

## External Blockers (not engineering)

| Blocker | Owner | Decision Needed |
|---------|-------|-----------------|
| No real provider credentials on VPS | Bagus | Add OpenAI and/or Anthropic API key to production env |
| No beta traffic | Bagus | Deploy test access key, push some internal requests |
| Subscription provider compliance | Bagus | Decide whether to implement OAuth subscription connectors (requires legal/ToS review) |
| Hosted infrastructure (TLS, domain) | Bagus | DNS for 8router.8agents.xyz needs configuration |
| Cloud sync external service | Bagus | Choose a cloud provider/approach for config sync |

## Engineering Blockers (resolved)

| Blocker | Status |
|---------|--------|
| Security module implementation | DONE |
| Token Saver implementation | DONE |
| Canonical experiment implementation | DONE |
| Shadow production validation logic | DONE |
| Access key generation/validation | DONE |
| Provider credential encryption | DONE |

## Owner Approvals Needed
- [ ] **Provision real provider API keys** — required to unblock Phase 3A live validation.
- [ ] **Authorize beta traffic** — designate which access keys can be used for shadow validation.
- [ ] **Confirm subscription provider strategy** — proceed or defer OAuth subscription layer.
- [ ] **Approve Phase 3A readiness** — confirm that engineering is complete and operational phase may begin.


## Phase 3A Preflight Owner Gates (2026-07-15)

| Gate | Status | Note |
|------|--------|------|
| APPROVE_PUSH_CANONICAL_MAIN | PENDING | main is ahead of origin/main by 25 commits; no push performed. |
| APPROVE_CREATE_PHASE3A_TAG | PENDING | recommended tag: phase3a-pre-live-validation-20260715; no tag created. |
| LOAD_APPLICATION_SECRETS | REQUIRED | ACCESS_KEY_HASH_SECRET and PROVIDER_KEY_ENCRYPTION_SECRET not loaded by runtime. |
| ACTIVATE_ONE_PROVIDER | REQUIRED | no provider credentials active. |
| GENERATE_INTERNAL_SMOKE_KEY | REQUIRED_AFTER_SECRETS | temporary key was created, redacted, revoked, and deleted; regenerate after secrets load. |

Risk: UNPUSHED_CANONICAL_HISTORY


## Phase 3A.5 Status (2026-07-15)

| Gate | Status | Note |
|------|--------|------|
| RUNTIME_SECRET_ENFORCEMENT | RESOLVED | fail-closed implemented and tested. |
| LOAD_APPLICATION_SECRETS | RESOLVED | runtime reports both application secrets ready. |
| ACTIVATE_ONE_PROVIDER | REQUIRED | no provider credentials active. |
| GENERATE_INTERNAL_SMOKE_KEY | REQUIRED_AFTER_PROVIDER | temporary key deleted; generate fresh for provider smoke. |
| APPROVE_PUSH_CANONICAL_MAIN | RECOMMENDED | local main remains ahead; no push performed. |
| APPROVE_CREATE_PHASE3A_TAG | RECOMMENDED | recommended tag: phase3a-preflight-blocked-20260716. |

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

## Production i18n Regression — 2026-07-18

Status: RESOLVED_ENGINEERING_PENDING_PUBLIC_RECHECK.

Root cause: invalid JSON in `src/i18n/en.json` and `src/i18n/ja.json` caused English/Japanese dictionary loading to fail and exposed raw translation keys on the landing page.

Fix summary:
- Restored valid dictionary JSON.
- Added safe locale normalization for supported variants.
- Added sanitized missing-key fallback.
- Added production i18n regression tests.

Phase 3A remains `BLOCKED_EXTERNAL` pending provider credential and live evidence. Do not activate providers automatically.
