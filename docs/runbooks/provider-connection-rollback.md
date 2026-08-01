# Provider Connection Rollback

## Scope

Rollback reverses migration entries for a specific plan:
- **Created records**: deleted (if migrationPlanId metadata matches)
- **Updated records**: prior encrypted credential + metadata + status restored from snapshot

## Drift Detection

Before restoring, rollback checks `current.metadata.migrationPlanId === planId`.
If the record has been modified by another plan or operation, rollback is refused with an error.

## Snapshot Integrity

Rollback snapshots are stored in `provider_connection_migration_rollbacks` with:
- `priorEncryptedCredential`: the encrypted credential before migration
- `priorMetadata`: the metadata JSON before migration
- `priorStatus`: the status before migration
- `checksum`: SHA-256 of [planId, legacyId, providerConnectionId, timestamp]

## CLI Usage

```bash
npx tsx scripts/migration-plan.mjs rollback --plan-id <id> --confirm <id>
```

Default: dry-run (no writes). Requires `PROVIDER_CONNECTION_MIGRATION_ENABLED=true`.

## Exit Codes

- 0: success
- 1: runtime error
- 3: confirmation mismatch
- 5: drift detected (record modified since migration)

## What Rollback Does NOT Do

- Does not rollback other plans' records
- Does not decrypt credentials
- Does not modify legacy connections table
- Does not touch routing, health, or quota

## Safety

- Feature flag default false
- Default dry-run
- Per-entry processing (failed entry doesn't block others)
- Audit trail for all rollback operations
- Return value contains no secrets
