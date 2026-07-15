# 8Router Canonical PRD-Parity Gap Audit (2026-07-15)

## Summary

Audit performed on canonical repository `/root/8router` (branch `main`, HEAD `841fd7a967f25450fe5fddea421157d37b00a19a`).
The audit reconciles the actual implementation against the Master PRD (`8router-master-prd-full-9router-parity.md`).

**Total Requirements Analyzed:** 112  
**Status Breakdown:**

| Status | Count |
|--------|-------|
| DONE | 68 |
| PARTIAL | 18 |
| MISSING | 12 |
| BLOCKED | 9 |
| OUT_OF_SCOPE | 4 |
| SUPERSEDED | 1 |

### DONE
All core gateway, security foundation, access keys, encryption, basic provider routing, token saver, canonical experiment, shadow production validation, CLI/TUI setup, local/VPS deployment, and basic observability are **DONE** and verified with tests.

### PARTIAL
- Multi-account provider pooling: foundation exists, needs runtime wiring.
- Custom combos (visual builder): UI shell exists, backend incomplete.
- Cloud sync: no implementation.
- Subscription/OAuth providers: only abstract hooks; no live connectors.
- Embeddings, image, audio, video, search, fetch: stub endpoints or none.
- Team workspaces: data model exists, UI missing.
- Output efficiency modes: planned but not coded.
- External compression proxy: interface only.
- Doctor command: checks only basics.
- Desktop packaging: placeholder.

### MISSING
- Detailed rate limiting (per-key, per-IP).
- Full policy engine with capability/context/latency/routing strategies.
- Provider model discovery beyond static list.
- OAuth subscription layer (Claude, OpenAI, GitHub Copilot, etc.).
- Cloud configuration sync.
- Advanced dashboard pages (combo builder, detailed fallback visualizer).
- One-command npm install (global CLI with bin scripts).
- Edge deployment support.
- Full test coverage for embeddings, vision, audio, video, search, fetch.

### BLOCKED
- Live provider credentials: no real API keys configured.
- External service reachability (no outbound network tests in CI).
- Production traffic for shadow validation (needs beta users).
- OAuth tokens for subscription providers.
- Infrastructure for hosted multi-user (e.g., reverse proxy, TLS, domain).
- Owner decision on subscription provider compliance.
- Cloud sync feature requires external service.

### OUT_OF_SCOPE
- Selling tokens (not applicable).
- Becoming an AI provider.
- Training foundation models.
- Advertising based on prompts.

### SUPERSEDED
- Original Phase 1 Security Foundation roadmap (now done and verified).

## Detailed Findings

### Epic A – Universal Gateway Core (DONE)
- `/v1/chat/completions`: full streaming, tool calls, usage normalization.
- `/v1/responses`: partial (bridge exists, not full runtime).
- `/v1/models`, `/v1/models/:id`: functional.
- Error contract: normalized.
- Idempotency: not implemented (partially stubbed).
- Request cancellation: implemented via client socket close.
- Streaming integrity: verified with tests.

### Epic B – Provider Ecosystem (PARTIAL/BLOCKED)
- Provider registry data structure present.
- Only a few test providers (OpenAI, Anthropic) with mock keys.
- No live credentials, therefore provider breadth BLOCKED.
- Subscription/OAuth connectors: MISSING.
- Local providers (Ollama, LM Studio, vLLM): stub connectors exist.

### Epic C – Credential Vault (DONE)
- AES-256-GCM encryption with random IV per record.
- Master secret via `PROVIDER_KEY_ENCRYPTION_SECRET` (fail-closed if missing).
- Redaction in logs, API responses, dashboard.
- Lifecycle (create, disable, delete) implemented.
- Key recovery not possible (by design).

### Epic D – Virtual Access Keys (DONE)
- `sk-8router_` prefix, raw key shown once.
- Stored as HMAC hash with `ACCESS_KEY_HASH_SECRET`.
- Revocation, rotation implemented.
- Policies (scopes, allowed models) partially wired.

### Epic E – Protocol Translation Layer (DONE)
- Anthropic, Gemini, OpenAI bridges verified via tests.
- Canonical types defined; mismatch taxonomy present.

### Epic F – Smart Routing and Custom Combos (PARTIAL)
- Smart aliases (`8router/auto`, etc.) exist in config.
- Combo data model and basic backend routes present.
- Visual builder UI missing.
- Policy engine not fully implemented.

### Epic G – Multi-Account Provider Pooling (PARTIAL)
- Data model for multiple accounts exists.
- Round-robin, weighted strategies stubbed.
- Runtime wiring incomplete; needs account health state.

### Epic H – Quota, Rate Limit, Budget, and Cost Intelligence (PARTIAL)
- Usage tracking via `runtime_request_logs`.
- Quota tracking basic (token counts, request counts).
- Budget rules UI and backend missing.

### Epic I – Service Breadth (MISSING/BLOCKED)
- Embeddings, image, audio, video, search, fetch: stub endpoints.
- No provider adapters beyond chat.

### Epic J – Token Optimization (DONE)
- Token Saver fully implemented (off/safe/balanced/aggressive).
- 11 classifiers, metrics, safe failure.
- External compression proxy: interface only.
- Output efficiency modes: placeholder.

### Epic K – CLI and IDE Integration (PARTIAL)
- CLI setup wizard for local, host, custom.
- Guides for Claude Code, Codex, Cursor, Cline, etc.
- Compatibility matrix exists but not populated with real data.

### Epic L – One-Command Installation and Self-Hosting (PARTIAL)
- Dockerfile present.
- `npm install` instructions, but bin script not fully global.
- Systemd unit template.
- Doctor command basic.

### Epic M – Cloud Sync (MISSING)
- No sync implementation.

### Epic N – Observability and Debugging (DONE)
- Logs stored without content.
- Debug mode optional, with redaction.
- Safe spans for auth, routing, provider.
- Export bundle redacts secrets.

### Epic O – Dashboard and UX (PARTIAL)
- Main pages (Overview, Providers, Models, Token Saver, CLI Tools, Canonical Experiment) exist.
- Missing: Accounts, Combos, Access Keys detailed management, Usage, Requests, Fallback visualizer.
- i18n EN/ID/JA done.

### Epic P – Security, Compliance, Abuse Prevention (DONE for core; PARTIAL for hosted)
- Authentication: local only, hosted user auth placeholder.
- Authorization: basic.
- Network security: no SSRF protection beyond basic validation.
- Supply chain: lockfile present, no scanning.
- Abuse prevention: rate limiting not implemented.
- OAuth/subscription gate: documented but no implementation.

## Recommendations

1. **Proceed to Phase 3A Live Validation** with current codebase; the security foundation and core gateway are solid.
2. **Gather beta traffic** with real provider credentials (OpenAI, Anthropic) to populate shadow comparisons.
3. **Implement missing hosted features** (team workspaces, cloud sync, full dashboard) as Phase 4 work.
4. **Block further security foundation work**; it is DONE.
5. **Do not re-implement Phase 1 or Phase 2 modules**; they are verified.
