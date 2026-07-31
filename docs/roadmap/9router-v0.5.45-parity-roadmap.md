# 8Router → 9Router v0.5.45 Parity Roadmap

## Phase 4A — Canonical Reconciliation

Deliverables:

- Pin upstream target.
- Automated provider/capability inventory.
- Updated gap audit and traceability.
- Stale-audit reconciliation.

Acceptance:

- Target SHA verified.
- Inventory output reproducible.
- No implementation phase is restarted without evidence.

## Phase 4B — Provider Connection Runtime

Build a single persistent account model and runtime selector.

Minimum fields:

- provider and auth mode
- encrypted credential payload
- account label and metadata
- priority and weight
- enabled/status state
- cooldown and last error
- token expiry and refresh metadata
- quota/reset metadata
- model-discovery metadata
- created/updated/last-used timestamps

Acceptance:

- Multiple accounts per provider.
- Deterministic priority/weighted selection.
- Account fallback before provider fallback.
- Secure refresh-token rotation.
- Restart persistence.
- Raw secrets absent from API, logs, and DB fields.

## Phase 4C — Unified Execution Pipeline

All service kinds use common policy for authentication, retries, fallback, logging, usage, redaction, timeouts, cancellation, and health.

Service kinds:

- LLM/chat
- embeddings
- image and image understanding
- TTS/STT
- search/fetch
- video/music when implemented

## Phase 4D — Provider Expansion Waves

Wave 1: OpenAI-compatible API-key providers.

Wave 2: media/search providers.

Wave 3: OAuth/subscription providers.

Wave 4: browser-cookie or high-risk providers only after explicit security review.

Every provider requires contract tests, capability declaration, auth lifecycle, model discovery or pinned catalog, usage behavior, and sanitized errors.

## Phase 4E — API Compatibility Completion

Complete and prove:

- `/v1/chat/completions`
- `/v1/responses`
- `/v1/messages`
- `/v1/messages/count_tokens`
- `/v1/models`
- `/v1/embeddings`
- `/v1/images/generations`
- `/v1/images/understanding`
- `/v1/audio/speech`
- `/v1/audio/transcriptions`
- `/v1/search`
- `/v1/web/fetch`
- video/music endpoints where included

## Phase 4F — Dashboard and CLI Parity

- Provider account CRUD/test/refresh.
- Auth-mode-aware provider cards.
- Model availability and refresh.
- Combo builder with edit/delete/reorder.
- Quota/budget views.
- Request and fallback explorer.
- CLI installation, setup, migration, doctor, and integrations.

## Phase 4G — Sync, Packaging, and Production Evidence

- Optional cloud sync contract and threat model.
- Docker and npm release pipeline.
- Backup/restore and migration drills.
- CI compatibility matrix.
- Controlled provider-backed validation.
- Canary and rollback evidence.

## Immediate Next Executable Phase

`Phase 4B — Provider Connection Runtime` is the highest-leverage unblocked engineering phase. Provider expansion must not precede it.
