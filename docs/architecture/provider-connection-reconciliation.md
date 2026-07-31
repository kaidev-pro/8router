# Provider Connection Reconciliation

Phase 4B.2 adds read-only shadow reconciliation between legacy `connections` and `provider_connections`.

No credentials, ciphertext, hashes, cookies, or tokens are selected or returned. Matching uses explicit `metadata.legacyCredentialId`, genuine `accountRef`, normalized labels, then providerId-only review candidates. Ambiguous records are blocked.

Preview schema: `phase4b2-preview-v1`.
