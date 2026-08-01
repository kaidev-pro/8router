# Dynamic Provider State Persistence

## Architecture

Persists dynamic provider state that cannot live in static code:
- Dynamic models discovered from provider APIs
- Manual model overrides
- Certification evidence
- Discovery history
- Operational metadata

Static descriptors from `provider-foundation.ts` remain canonical source.

## Schema (5 tables)

| Table | Purpose |
|-------|---------|
| provider_model_registry | Dynamic models |
| provider_model_overrides | Manual overrides |
| provider_certification_evidence | Certification evidence |
| provider_discovery_history | Discovery audit trail |
| provider_operational_metadata | Health/latency/error stats |

All tables: no credential columns, no secret fields, idempotent init, multi-DB safe.

## Precedence

```
manual override > dynamic model > static catalog
```

- Override does not delete static source
- Disabled override can hide model
- Dynamic discovery cannot silently override manual override
- Stale dynamic model marked unavailable, not deleted
- Static model always available as fallback

## Feature Flags

| Flag | Default | Purpose |
|------|---------|---------|
| PROVIDER_MODEL_DISCOVERY_ENABLED | false | Enable discovery |
| PROVIDER_MODEL_DISCOVERY_NETWORK_ENABLED | false | Enable network calls |
| PROVIDER_MODEL_DISCOVERY_PERSIST_ENABLED | false | Enable DB persistence |

All default false. Real discovery requires all three + explicit confirmation.

## Safety

- No startup auto-discovery
- No credential access
- No decrypt
- No routing mutation
- No network in read-only paths
