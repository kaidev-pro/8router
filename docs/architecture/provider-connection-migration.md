# Provider Connection Migration

Phase 4B.3 adds controlled credential migration from legacy connections into provider_connections.

## Trust Boundaries

- Plan generation: no decrypt, metadata only
- Validation: no decrypt, eligibility re-check
- Execution: decrypt legacy → re-encrypt → store in provider_connections
- Rollback: restore prior encrypted credential from protected snapshot

## Eligibility Gates

- exact match or approved unique identity
- supported auth type
- valid credential presence
- valid lifecycle metadata
- no ambiguity
- migration feature flag enabled
- explicit operator confirmation

## Feature Flags

- `PROVIDER_CONNECTION_MIGRATION_ENABLED`: default false
- `PROVIDER_CONNECTION_SHADOW_SYNC_ENABLED`: default false

## Not wired yet

Active routing remains legacy. Phase 4B.4 will evaluate cutover criteria.
