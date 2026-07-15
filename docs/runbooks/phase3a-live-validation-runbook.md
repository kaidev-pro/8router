# Phase 3A Live Validation Runbook

## Preconditions
- Repository identity confirmed.
- Build/test/typecheck pass.
- ACCESS_KEY_HASH_SECRET loaded.
- PROVIDER_KEY_ENCRYPTION_SECRET loaded.
- One provider credential active.
- One generated internal smoke access key active.
- Canonical mode shadow, canary 0, auto-disable true.

## Smoke Sequence
1. Invalid access key: expect sanitized auth error.
2. Valid access key + invalid model: expect normalized model error.
3. Valid access key + valid provider/model: expect success.
4. Verify runtime request log.
5. Verify canonical experiment eligibility and shadow log.
6. Confirm production response unchanged by shadow path.
7. Confirm no plaintext secrets in logs.
8. Confirm kill switch available.

## Stop Conditions
- Build fails.
- Secret missing.
- Raw credential appears in output/logs.
- Provider request succeeds but logs contain raw prompt/credential.
- Shadow path affects production response.
- Unexpected duplicate provider billing risk.
