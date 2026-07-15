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
