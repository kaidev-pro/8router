# Provider Expansion Foundation

## Architecture

Unified provider foundation separating concerns:
- **Descriptor**: Static metadata about each provider (canonical source)
- **Capability Registry**: What each provider can do
- **Model Registry**: Available models (static + dynamic + override)
- **Certification**: Provider readiness status (metadata only, no routing effect)
- **Discovery History**: Model discovery audit trail

## Canonical Source

Static `ProviderDescriptor` is the canonical source built from `PROVIDER_CATALOG`.
DB tables (deferred to Phase 5B) will persist only dynamic state:
- dynamic models
- manual overrides
- certification metadata
- discovery history
- operational metadata

Static descriptors are NOT persisted — they live in code.

## Read-Only HTTP API

All endpoints require authentication (`requireAuth`), GET-only, `Cache-Control: no-store`.

| Endpoint | Description |
|----------|-------------|
| GET /8router/api/providers/catalog | List providers (filterable, paginated) |
| GET /8router/api/providers/catalog/:id | Provider detail |
| GET /8router/api/providers/capabilities | Capability matrix |
| GET /8router/api/providers/models | Model registry (filterable, paginated) |
| GET /8router/api/providers/certifications | Certification status |

Filters: providerId, protocol, status, capability, source
Pagination: page, limit (max 100)
No create/update/delete endpoints.

## Discovery

Phase 5A: dry-run only. No network calls, no credential access, no DB writes.
Phase 5B: will add real GET /models with explicit --execute flag.

## Certification

Statuses: UNKNOWN, EXPERIMENTAL, PARTIAL, CERTIFIED, DEPRECATED, FAILED

Certification is metadata/evidence only. Does NOT affect active routing.
CERTIFIED requires explicit update — not inferred from descriptor.
FAILED/DEPRECATED providers are not treated as CERTIFIED.

## Phase 4B.3 Dependency

Phase 4B.3 (credential migration) is on a separate branch, NOT merged to main.
Phase 5A is independent — no cherry-pick, no dependency.
Phase 5A PR will contain only Provider Foundation files.

## Deferred to Phase 5B

- DB schema (6 tables)
- Real network discovery
- Dashboard UI integration
- Runtime API tests (requires running server)
- Provider health integration
- Benchmark integration
