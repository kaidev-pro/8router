# Provider Connection Runtime Foundation

Phase 4B.1 adds a persistent provider connection domain for future 9Router parity. It is not wired into production routing.

## Schema

New table: `provider_connections`.

Fields: `id`, `providerId`, `label`, `authType`, `encryptedCredential`, `credentialVersion`, `credentialHint`, `status`, `priority`, `weight`, `accountRef`, `expiresAt`, `refreshable`, `cooldownUntil`, `lastSuccessAt`, `lastFailureAt`, `failureCount`, `quotaRemaining`, `quotaLimit`, `quotaResetAt`, `discoveredModels`, `metadata`, `createdAt`, `updatedAt`.

Indexes: providerId, status, priority, cooldownUntil, expiresAt.

## Security

Credentials are encrypted at rest with the existing AES-256-GCM credential utility. Repository metadata reads never return raw or encrypted payloads. Runtime decryption is isolated behind `getDecryptedCredentialForRuntime` for future routing integration.

## Lifecycle

Statuses: active, disabled, degraded, cooldown, expired, error. Disabled, error, cooldown, and non-refreshable expired connections are ineligible. Degraded remains eligible unless cooldown applies.

## Legacy compatibility

Legacy `connections` remains the production credential table. Phase 4B.1 adds only dry-run mapping from legacy records; no automatic migration, deletion, re-encryption, or routing duplication occurs.

## Feature flag

`PROVIDER_CONNECTION_RUNTIME_ENABLED=true` will be required for future adoption. Default is false.

## Not wired yet

Live routing still uses `credential-manager.ts` and legacy selectors. Dashboard provider APIs still read legacy credentials.

## Phase 4B.2 roadmap

Add shadow read adapters, dashboard read-only views, migration preview CLI, and non-routing health/quota synchronizers.

Patch hardening: metadata updates use a strict field allowlist; schema initialization is tracked per DB instance; wrong-key testing is documented as blocked because the current encryption module does not expose safe key injection.
