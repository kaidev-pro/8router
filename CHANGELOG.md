# Changelog

## v1.0.0-rc.1 (2026-08-02)

### Added
- Provider Expansion Foundation (Phase 5A)
- Dynamic Provider State & Discovery (Phase 5B)
- Certified Provider Batch: OpenAI, Gemini, xAI, Cerebras (Phase 5C)
- Provider Operations Dashboard & Mutations (Phase 5D)
- Shadow Routing & Canary Cutover Controls (Phase 5E)
- Production Hardening: Rate Limiter, Circuit Breaker, Logging, Timeouts, Health (Phase 5F)

### Security
- All feature flags default false
- SSRF-safe endpoint validation
- Log sanitization (secrets redacted)
- No credential exposure in API/logs/evidence
- Audit log for all mutations

### Infrastructure
- 574/574 tests passing
- TypeScript strict mode
- Gitleaks clean
- npm audit: 3 findings (1 low, 1 moderate, 1 high) — documented

### Not included (deferred)
- Production deployment
- Live provider certification
- Routing cutover
- Real network discovery
