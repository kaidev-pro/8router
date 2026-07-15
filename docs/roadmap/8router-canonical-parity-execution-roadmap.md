# 8Router Canonical Parity Execution Roadmap (2026-07-15)

## Legend
- DO NOT restart: Phases already completed and verified.
- NEXT: The next logical phase to execute.
- FUTURE: Later phases dependent on prior completion.

## Phase Execution Plan

### DO NOT RESTART
- **Phase 1 (Security Foundation):** DONE. Verified: AES-256-GCM encryption, HMAC access keys, secret redaction, no plaintext exposure.
- **Phase 2A–2H (Provider Routing, Token Saver, Canonical Experiment):** DONE. Verified with 223 passing tests.
- **Phase 3A (Shadow Production Validation):** DONE. Engineering complete; operational readiness pending.

### NEXT (Phase 3A Live Validation)
**Goal:** Collect real traffic evidence in shadow mode.

Steps:
1. Add at least one real provider API key to the VPS deployment (e.g., OpenAI or Anthropic).
2. Set up a test access key for internal beta use.
3. Send a small batch of real requests to `/v1/chat/completions`.
4. Verify that `canonical_experiment_logs` records shadow comparisons.
5. Review readiness report at `/8router/api/canonical-experiment/readiness`.
6. Document 7-day observation window.

Exit criteria: 10+ shadow comparisons, zero critical mismatches, readable readiness report.

### FUTURE (Phase 3B/3C — Canary)
Dependent on Phase 3A live evidence accumulation.

### FUTURE (Phase 4A — Provider Registry Expansion)
Goal: Reach 15 production API-key providers.
Steps: Add real credentials for Groq, Gemini, Mistral, DeepSeek, etc. Verify each with contract tests.

### FUTURE (Phase 5A — Multi-Account Routing)
Goal: Complete multi-account pooling runtime wiring.

## Blockers Summary
See: `docs/roadmap/8router-blockers-and-owner-decisions.md`
