# Runtime Secret Configuration Runbook

## Purpose
Configure internal application secrets without exposing values.

## Required application secrets
- ACCESS_KEY_HASH_SECRET
- PROVIDER_KEY_ENCRYPTION_SECRET

These are not provider credentials. Provider credentials are OpenAI, Anthropic, Gemini, Groq, etc. keys stored through the encrypted credential-management flow.

## VPS systemd configuration
Preferred current mechanism:
- Environment file outside repository: /etc/8router/secrets.env
- Owner/mode: root:root 0600
- Loaded by: /etc/systemd/system/8router.service.d/secrets.conf

## Rules
- Do not store values in Git.
- Do not print values in logs or reports.
- Generate each secret independently with cryptographically secure randomness.
- Do not reuse provider keys, OAuth secrets, JWT secrets, database passwords, or the same value for both app secrets.

## Apply changes
1. Edit the root-owned secret file using a secure operator session.
2. Run: sudo systemctl daemon-reload
3. Run: sudo systemctl restart 8router.service
4. Verify only status through readiness endpoint.

Expected readiness securityConfiguration:
- accessKeyHashSecret: ready
- providerEncryptionSecret: ready

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
