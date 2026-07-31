# Provider Connection Reconciliation

Phase 4B.2 adds read-only shadow reconciliation between legacy `connections` and `provider_connections`.

No credentials, ciphertext, hashes, cookies, or tokens are selected or returned. Matching uses explicit `metadata.legacyCredentialId`, genuine `accountRef`, normalized labels, then providerId-only review candidates. Ambiguous records are blocked.

Preview schema: `phase4b2-preview-v1`.

Hardening note: dedicated preview coverage now exercises matching, summaries, CLI, API route/auth/no-store/static-before-dynamic ordering, redaction, no-write/no-decrypt seams, strict exit behavior, and feature flag default. Dashboard UI is deferred; API and CLI are complete for this phase.

Patch note: reports use one immutable snapshot per source, one injected clock for generatedAt/lifecycle state, filtered summaries are recomputed from filtered records, and accountRef matching is only used when a genuine legacy accountRef exists. Current legacy schema exposes no genuine accountRef, so that step is unavailable for production legacy rows.
