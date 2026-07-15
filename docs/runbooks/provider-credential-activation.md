# Provider Credential Activation Runbook

Goal: add one real provider credential without exposing raw key.

1. Confirm application secrets are loaded by runtime.
2. Use dashboard or POST /8router/api/providers over localhost/admin-only path.
3. Do not paste provider key into shell history or Git.
4. Verify provider list returns masked metadata only.
5. Verify database stores encrypted envelope, not plaintext.
6. Test provider connection.
7. If invalid, verify error is sanitized.
8. Document only provider name and credential record ID, never raw key.
