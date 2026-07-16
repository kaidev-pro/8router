# Runtime Secret Enforcement Audit — Phase 3A.5

Date: 2026-07-15
Repository: /root/8router
Starting HEAD: c41897cc162137e0ddb3b49912208fde17c4c509

## Decision History
READY_WITH_CONDITIONS -> preflight discovered unresolved secret enforcement -> NOT_READY -> remediation completed for application secrets; provider-backed live validation still BLOCKED_EXTERNAL.

## Root Cause
Access-key creation succeeded while ACCESS_KEY_HASH_SECRET was not loaded by the systemd runtime because the access-key hashing code returned a development fallback even when NODE_ENV=production. This was a genuine security/readiness gap, not a false negative.

## Code Path Audited
HTTP handler: src/api/server.ts POST /8router/api/access-keys
-> createAccessKey in src/security/access-keys/manager.ts
-> hashAccessKey in src/security/access-keys/hash.ts
-> SQLite access_keys row stores HMAC hash only.

Runtime auth path:
src/runtime/auth.ts -> validateAccessKey -> verifyAccessKey -> hashAccessKey.

Provider credential path:
src/api/server.ts POST /8router/api/providers
-> createCredential in src/security/credentials/credential-manager.ts
-> encrypt in src/security/credentials/encrypt.ts
-> SQLite connections row stores encryptedCredential.

## Remediation
- Access-key creation now calls assertAccessKeyHashReady.
- Access-key rotation now calls assertAccessKeyHashReady.
- Access-key verification fails closed when hash secret is missing/invalid in production.
- Provider credential encryption rejects missing/invalid encryption secret in production.
- Readiness endpoint now reports securityConfiguration without secret values.

## Runtime Environment
- Service unit: /etc/systemd/system/8router.service
- Drop-in: /etc/systemd/system/8router.service.d/secrets.conf
- Environment file: /etc/8router/secrets.env
- Secret file owner/mode: root:root 0600
- Process manager: systemd
- WorkingDirectory: /root/8router
- ExecStart: /root/8router/node_modules/.bin/tsx src/index.ts
- Runtime ports: 8080 and 8082 bound by expected service PID.

## Runtime Secret Status
- ACCESS_KEY_HASH_SECRET: PRESENT_AND_VALID
- PROVIDER_KEY_ENCRYPTION_SECRET: PRESENT_AND_VALID

No secret values, hashes, lengths, or fingerprints were recorded.

## Validation Evidence
- TypeScript: PASS
- Build: PASS
- Full tests: PASS
- Provider activation/security tests: PASS, 24 passed / 0 failed
- Readiness securityConfiguration: accessKeyHashSecret=ready, providerEncryptionSecret=ready, providerCredential=missing, liveTraffic=insufficient_data

## Restart Persistence Smoke
- Temporary key generated through official API.
- Fingerprint: sk-8router_****...5b15
- Invalid key rejected: HTTP 401 authentication_error
- Valid key + invalid model before restart: HTTP 400 invalid_request_error
- Same key after service restart: HTTP 400 invalid_request_error
- Key deleted after test.

## Remaining Blocker
No provider credential is active. Provider-backed controlled live validation was not executed.

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
