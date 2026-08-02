# Phase 5D — Dashboard & Provider Operations

## Architecture

Authenticated operational surface for provider state. All mutations gated by feature flags.

## Read API (existing from Phase 5A/5B)

- GET /8router/api/providers/catalog
- GET /8router/api/providers/catalog/:id
- GET /8router/api/providers/capabilities
- GET /8router/api/providers/models
- GET /8router/api/providers/certifications
- GET /8router/api/providers/state
- GET /8router/api/providers/state/:id
- GET /8router/api/providers/models/dynamic
- GET /8router/api/providers/discovery/history
- GET /8router/api/providers/certification/evidence
- GET /8router/api/providers/overrides

## Mutation API (Phase 5D)

- GET /8router/api/providers/operations/audit — audit log
- GET /8router/api/providers/operations/jobs — job list
- GET /8router/api/providers/operations/jobs/:id — job detail
- POST /8router/api/providers/operations/override — create override
- DELETE /8router/api/providers/operations/override — remove override
- POST /8router/api/providers/operations/discovery — trigger discovery
- POST /8router/api/providers/operations/certification — trigger certification
- POST /8router/api/providers/operations/jobs/:id/cancel — cancel job

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| PROVIDER_OPERATIONS_MUTATION_ENABLED | false | Enable all mutations |
| PROVIDER_OVERRIDE_ENABLED | false | Enable override create/remove |
| PROVIDER_CERTIFICATION_RUN_ENABLED | false | Enable certification runs |

All default false. Returns 403 when disabled.

## Audit

Every mutation produces an audit entry with:
- id, action, providerId, timestamp, details, success, error

No secrets in audit entries.

## Jobs

In-memory job tracking for discovery/certification runs.
Status: queued, running, succeeded, failed, cancelled.

## Safety

- All mutations require auth
- All mutations gated by feature flags (default false)
- No routing mutation
- No credential access
- No decrypt
- No network
- Audit has no secrets
- 403 when mutations disabled
- 400 for missing parameters
