# 8Router vs 9Router v0.5.45 Gap Audit

## Executive Result

8Router already has a strong gateway and security base. It is not a blank rewrite. Current strengths include encrypted provider credentials, HMAC access keys, multi-key pools, fallback routing, combos, OpenAI/Anthropic/Gemini bridges, usage logging, quota tracking, Token Saver, canonical shadow experimentation, dashboard, CLI integrations, tunnel support, and i18n.

The largest parity gaps are provider breadth, persistent provider-account lifecycle, OAuth refresh coverage, unified service execution, dynamic model discovery, complete dashboard management, cloud sync, and full release evidence.

## Status Vocabulary

- `PARITY`: equivalent behavior and evidence exist.
- `PARTIAL`: implementation exists but wiring, breadth, UX, or evidence is incomplete.
- `MISSING`: no equivalent implementation was found.
- `BLOCKED_EXTERNAL`: engineering is ready but credentials, upstream access, traffic, or infrastructure are required.
- `8ROUTER_SUPERIOR`: 8Router is demonstrably stronger.
- `NOT_APPLICABLE`: upstream behavior is intentionally outside 8Router's product boundary.

## Capability Matrix

| Domain | Status | Current 8Router evidence | Remaining gap |
|---|---|---|---|
| OpenAI chat completions | PARTIAL | Runtime route, streaming, fallback, bridges | Full edge-case and live provider evidence |
| OpenAI Responses API | PARTIAL | Dedicated bridge and tests | End-to-end runtime parity, tools, structured output, cancellation |
| Anthropic Messages | PARTIAL | Anthropic bridge | Full route/stream contract and token-count parity |
| Gemini compatibility | PARTIAL | Gemini bridge | v1beta edge cases and provider-specific schema behavior |
| Provider catalog | PARTIAL | 28 providers | 9Router registry has 112 active entries; normalize aliases and implement missing providers |
| Provider account persistence | PARTIAL | DB connections and encrypted credentials | Full CRUD, priority, weight, metadata, quota reset, auth type, lifecycle |
| API-key multi-account fallback | PARTIAL | Key pool, retry, cooldown | Unify DB connection accounts with runtime selection and health |
| OAuth provider lifecycle | PARTIAL | OAuth directory/provider modules | Broad provider coverage, callback hardening, token rotation, refresh retries |
| Model combos | PARTIAL | SQLite combos, fallback engine, dashboard list/create API | Full CRUD, reorder, validation, media combos, fallback eligibility controls |
| Dynamic model discovery | PARTIAL | Catalog and models endpoint | Provider fetchers, cache, refresh controls, availability diagnostics |
| Usage and cost | PARTIAL | Usage logs, request DB, quota tracker, pricing estimates | Provider-specific usage handlers, exact embeddings, budget UI, reset windows |
| Embeddings | PARTIAL | Endpoint/service support | Provider breadth, exact usage, compatibility contract tests |
| Image generation | PARTIAL | Endpoint/service support | Provider matrix, lifecycle, errors, async jobs where required |
| Image understanding | MISSING/PARTIAL | Vision may flow through chat | Dedicated `/v1/images/understanding` parity and provider mapping |
| TTS | PARTIAL | TTS endpoint/providers | Voice discovery, provider breadth, format parity |
| STT | PARTIAL | STT endpoint/providers | Multipart edge cases, provider breadth, timestamps/language options |
| Web search | PARTIAL | Search providers/endpoints | Search-via-chat, provider breadth, normalized citations/results |
| Web fetch | PARTIAL | Tool integrations | Dedicated normalized endpoint and transient retry behavior |
| Video generation | MISSING | No verified first-class parity | Endpoint, provider contracts, async lifecycle |
| Music generation | MISSING | No verified first-class parity | Endpoint, provider contracts, async lifecycle |
| Dashboard provider management | PARTIAL | Dashboard, provider and connection views | Full account CRUD, auth-mode-aware counts, test/refresh, quota rows |
| Dashboard combo builder | PARTIAL | Combo cards/listing | Drag reorder, edit/delete, validation, media combo UX |
| Request explorer | PARTIAL | Usage/log views | Search/filter/detail, fallback path, normalized errors, cost breakdown |
| CLI setup/integrations | PARTIAL | CLI integrations and setup guide | Parity helper breadth, installation/upgrade and config migration |
| Cloud sync | MISSING/PARTIAL | No verified equivalent scheduler/control flow | Optional encrypted sync lifecycle, conflict handling, disable/cleanup |
| Local persistence | PARITY | SQLite with migrations and richer security | Maintain migration/backup evidence |
| Credential encryption | 8ROUTER_SUPERIOR | AES-256-GCM fail-closed | Preserve throughout connection expansion |
| Access-key storage | 8ROUTER_SUPERIOR | HMAC-SHA256, raw key shown once | Preserve throughout API expansion |
| Canonical shadow experiment | 8ROUTER_SUPERIOR | Controlled shadow, sampling, kill switch | Complete live evidence when provider is available |
| Token compression | 8ROUTER_SUPERIOR | Safe compression and metrics | Ensure all service routes use policy consistently |
| Packaging/release | PARTIAL | npm package/bin and build scripts | CI matrix, Docker, upgrade, rollback, migration, release proof |

## Provider Breadth

- 8Router catalog: 28 provider IDs.
- 9Router pinned registry: 112 active provider entries.
- Exact-ID counts alone are not final because aliases differ (`google` vs `gemini`, `fal` vs `fal-ai`, etc.).
- The new inventory script produces an exact-ID first pass and must be followed by alias normalization and capability review.

## Critical Architectural Gap

The next foundational gap is a unified `ProviderConnectionRuntime` that connects encrypted persistent accounts to runtime selection. It must support API keys, OAuth tokens, cookies where approved, priority/weight, cooldown, refresh, quota windows, health, model discovery, and sanitized lifecycle events.

Without this layer, adding provider files one by one would create breadth without reliable parity.
