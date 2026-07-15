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
