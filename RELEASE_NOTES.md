# 8Router v1.0.0-rc.1

**SHA:** 5c1837f74692ac518ad88f3dc4c4220d85a2bd36  
**Tag:** v1.0.0-rc.1  
**Date:** 2026-08-02  
**Status:** RC code-ready, not deployment-authorized

## Test Results

| Suite | Result |
|-------|--------|
| phase5f | 41/41 |
| phase5e | 40/40 |
| phase5d | 40/40 |
| phase5c | 48/48 |
| provider-foundation | 90/90 |
| provider-foundation-api | 19/19 |
| dynamic-state | 74/74 |
| discovery | 26/26 |
| provider-connections | 24/24 |
| provider-connection-preview | 43/43 |
| provider-connection-migration | 80/80 |
| full regression | 49/49 |
| **Total** | **574/574** |

- TypeScript: PASS
- Build: PASS
- Gitleaks: CLEAN

## Included Phases

### Phase 5A — Provider Expansion Foundation
- Unified ProviderDescriptor
- Capability/Model/Certification registries
- 5 read-only API endpoints
- Provider CLI commands

### Phase 5B — Dynamic Provider State & Discovery
- 5 DB tables (model registry, overrides, certification, discovery, metadata)
- Discovery service with mock adapters
- Feature flags (all default false)

### Phase 5C — Certified Provider Batch Expansion
- Endpoint policies (SSRF-safe)
- Certification profiles (dry-run/mock/live)
- Target batch: OpenAI, Gemini, xAI, Cerebras

### Phase 5D — Dashboard & Provider Operations
- 8 mutation API endpoints
- Audit log
- Job tracking with cancel

### Phase 5E — Shadow Routing & Cutover Readiness
- Eligibility snapshot
- Shadow evaluation
- Canary controls
- Rollback + Kill switch

### Phase 5F — Production Hardening
- Rate limiter
- Circuit breaker
- Structured logging
- Timeout policy
- Health/readiness
- RC validation matrix

## Feature Flags (all default false)

| Flag | Purpose |
|------|---------|
| PROVIDER_MODEL_DISCOVERY_ENABLED | Enable discovery |
| PROVIDER_MODEL_DISCOVERY_NETWORK_ENABLED | Enable network calls |
| PROVIDER_MODEL_DISCOVERY_PERSIST_ENABLED | Enable DB persistence |
| PROVIDER_OPERATIONS_MUTATION_ENABLED | Enable mutations |
| PROVIDER_OVERRIDE_ENABLED | Enable overrides |
| PROVIDER_CERTIFICATION_RUN_ENABLED | Enable cert runs |
| PROVIDER_SHADOW_ROUTING_ENABLED | Enable shadow |
| PROVIDER_CANARY_ROUTING_ENABLED | Enable canary |
| PROVIDER_SNAPSHOT_ACTIVATION_ENABLED | Enable snapshot activation |
| PROVIDER_HARDENING_ENABLED | Enable hardening |

## Safety

- Production deployed: NO
- Service restarted: NO
- Production traffic: NO
- Provider activated: NO
- Real discovery: NO
- Routing impact: NONE
- Credential exposure: NONE

## Authorization Required

- Deployment: REQUIRES_EXPLICIT_AUTH
- Production traffic: REQUIRES_EXPLICIT_AUTH
- Routing cutover: REQUIRES_EXPLICIT_AUTH
