# Provider Connection Migration

Phase 4B.3 adds controlled credential migration from legacy connections into provider_connections.

## Trust Boundaries

- Plan generation: no decrypt, metadata only
- Validation: no decrypt, eligibility re-check
- Execution: decrypt legacy → re-encrypt → store in provider_connections
- Rollback: restore prior encrypted credential from protected snapshot

## Plan Integrity

### Canonical Fingerprint (planId)

planId is a SHA-256 hash of a canonical serialization of all execution-relevant fields:

```
{
  schemaVersion: 'phase4b3-migration-plan-v1',
  algorithmVersion: 'phase4b3-algo-v1',
  eligibilityRulesVersion: 'phase4b3-rules-v1',
  legacySchemaVersion: 'connections-v1',
  targetSchemaVersion: 'provider_connections-v1',
  entries: [
    {
      legacyId,
      providerId,
      label (normalized lowercase trimmed),
      authType,
      credentialPresent,
      migrationEligibility,
      action,
      targetAuthType,
      targetConnectionId,
      expectedCredentialVersion,
      reasonCode (normalized, sorted)
    }
  ]
}
```

**Entries are sorted by legacyId** before hashing. Object keys are sorted recursively.

**NOT included in planId:**
- generatedAt (irrelevant to execution)
- plaintext/encrypted credentials
- tokens, cookies, hashes, secrets
- diagnostic text (normalized to reason codes)

### Snapshot Checksum

A separate checksum tracks the full reconciliation snapshot for stale detection.
Includes: legacyId, providerId, label, legacyAuthType, legacyActive, credentialPresent,
matchStatus, migrationEligibility, providerConnectionId, connectionStatus, reasonCodes.

**NOT included:** generatedAt, diagnostic text, order.

### Stale Detection

Before decrypt, `executeMigrationPlanAsync` re-reads the current snapshot and recomputes
the checksum. If it differs from the stored plan.checksum, execution is rejected with:
- Audit event: `validation_failed` (result: 'stale')
- Error thrown before any decrypt or write
- CLI returns exit 4

### Canonical Serialization Rules

- Object keys sorted recursively
- Arrays sorted by identity (entries by legacyId)
- undefined values omitted
- null serialized as 'null'
- Strings JSON-quoted
- Numbers/booleans as-is

## Transaction Semantics

**Per-entry, not batch.** Each eligible entry is processed independently within its own try/catch.
If one entry fails, prior successful entries are NOT rolled back. Remaining entries continue processing.
The execution result reports per-entry status (created/updated/skipped/blocked/failed).

## Decrypt Boundary

- `getDecryptedCredential` is only imported in `connection-migration.ts`
- It is only called inside `executeMigrationPlan`, for eligible create/update entries
- Blocked and skipped entries never touch decrypt
- Stale detection happens BEFORE decrypt
- Plan generation, validation, and preview never import or call decrypt
- Shadow sync has zero decrypt usage

## Rollback Integrity

Before restoring, rollback:
1. Loads the rollback snapshot
2. Recomputes checksum from [planId, legacyId, providerConnectionId, encryptedCredential, status, metadata]
3. Compares with stored checksum
4. If mismatch: rejects with error, does not modify target, writes rollback_failed audit
5. If match: restores prior state

Also checks `current.metadata.migrationPlanId === planId` for drift detection.

## Eligibility Gates

- exact match or approved unique identity
- supported auth type
- valid credential presence
- valid lifecycle metadata
- no ambiguity
- migration feature flag enabled
- explicit operator confirmation (planId must match)

## Feature Flags

- `PROVIDER_CONNECTION_MIGRATION_ENABLED`: default false
- `PROVIDER_CONNECTION_SHADOW_SYNC_ENABLED`: default false

## API Decision

Migration plan generation, execution, and rollback are **CLI-only**.
No migration API endpoints exist in the server. This is intentional:
- Plan generation is a mutation (writes plan + entries + audit)
- Execution decrypts credentials
- Rollback restores encrypted state

These operations require explicit CLI invocation with confirmation.

## Shadow Sync

- Only writes to `provider_connection_shadow_diagnostics`
- Does not modify connections, provider_connections, health, quota, or routing
- Does not decrypt credentials
- Does not make network calls

## Schema

5 tables, all with `IF NOT EXISTS`:
- `provider_connection_migration_plans` (with checksum column)
- `provider_connection_migration_entries`
- `provider_connection_migration_audit`
- `provider_connection_migration_rollbacks`
- `provider_connection_shadow_diagnostics`

Non-destructive init. Multiple DB instances safe. Indexes on planId, status, timestamp, legacyId.

## Not wired yet

Active routing remains legacy. Phase 4B.4 will evaluate cutover criteria.

