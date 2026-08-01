# Provider Connection Controlled Migration

## Prerequisites

1. Feature flag `PROVIDER_CONNECTION_MIGRATION_ENABLED=true`
2. Valid legacy connections with credentials
3. Provider connection runtime foundation (Phase 4B.1)

## Step 1: Generate Plan

```bash
npx tsx scripts/migration-plan.mjs plan
```

Review the output JSON. Verify:
- `eligible` count matches expectations
- No `blocked` entries (unless expected)
- `schemaVersion` is `phase4b3-migration-plan-v1`

## Step 2: Validate

```bash
npx tsx scripts/migration-plan.mjs validate --plan-id <planId>
```

Must return `valid: true`.

## Step 3: Execute (dry-run first)

```bash
npx tsx scripts/migration-plan.mjs migrate --plan-id <planId> --confirm <planId>
```

Default is dry-run. Review output.

## Step 4: Execute (real)

```bash
npx tsx scripts/migration-plan.mjs migrate --plan-id <planId> --confirm <planId> --execute
```

## Step 5: Verify

Check `provider_connections` table. Verify new records have:
- `credentialVersion: enc:v1`
- `metadata.legacyCredentialId` set
- `metadata.migrationPlanId` set

## Safety

- Feature flag default false
- Confirmation required (planId must match)
- Stale plan detection
- Per-entry transaction (no batch rollback)
- Plaintext never stored or logged
- Legacy connections table unchanged

## Rollback

If needed:
```bash
npx tsx scripts/migration-plan.mjs rollback --plan-id <planId> --confirm <planId>
```
