# 8Router — Changelog

## Phase 2G — CLI Tool Setup Polish

**Date:** 2026-07-12
**Commit:** phase2g-cli-tool-setup-polish
**Status:** ✅ Complete. `canonical.enabled` remains `false`.

### Added
- **Tool Integration Registry** — 14 tools with typed metadata, capability flags, and status badges (Supported / Experimental / Coming Soon)
- **Template Renderer** — Safe variable substitution (BASE_URL, API_KEY, MODEL) with format-aware escaping for JSON, YAML, shell, ENV, and code
- **Setup Validation** — URL, model, and access key format validation; trailing-slash normalization; duplicate /v1 prevention; embedded credential rejection
- **Dashboard CLI Tools Page** — Setup builder with 4 steps: environment selection (hosted/local/custom), access key input (password-masked, memory-only), model selector (grouped aliases), generated config display with copy button
- **Connection Testing** — Tests endpoint reachability, access key validity, models availability; returns latency; safe error messages only; no stack traces
- **API Endpoints:**
  - `GET /8router/api/integrations/tools` — Safe tool metadata (no secrets)
  - `POST /8router/api/integrations/test` — Connection testing
  - `POST /8router/api/integrations/render` — Server-side config rendering
- **i18n EN/ID/JA** — 18 new keys for setup steps, status badges, security warnings, troubleshooting, and UI actions
- **Documentation** — `docs/cli-integrations.md` with setup guides for all supported tools, compatibility matrix, SDK examples, troubleshooting, and security guidance
- **62 Tests** — Registry (10), rendering (15), security (5), validation (13), UI/data (6), config examples (7), API structure (6)

### Supported Tools
| Tool | Status |
|------|--------|
| Cursor | Supported |
| Cline | Supported |
| Continue | Supported |
| Roo Code | Supported |
| Open WebUI | Supported |
| OpenAI SDK | Supported |
| cURL | Supported |
| Environment File | Supported |
| Claude Code | Experimental |
| Codex CLI | Experimental |
| Aider | Experimental |
| LibreChat | Coming Soon |
| LobeChat | Coming Soon |
| Zed | Coming Soon |

### Security
- Raw access key never embedded in static HTML, logs, URLs, or analytics
- Password-masked input field for manual key entry
- Template renderer escapes values for shell injection prevention
- No provider credentials referenced in templates
- All validation errors/warnings redact secret values
- Connection test uses `Cache-Control: no-store`
- Embedded URL credentials are rejected

### Files
- `src/integrations/tools/types.ts` — Type definitions and constants
- `src/integrations/tools/registry.ts` — 14 tools with templates
- `src/integrations/tools/render.ts` — Format-aware template renderer
- `src/integrations/tools/validate.ts` — URL/model/key validation
- `src/integrations/tools/index.ts` — Barrel exports
- `src/__tests__/cli-tool-integrations.test.ts` — 62 tests
- `src/__tests__/run-cli-tool-integrations.ts` — Test runner
- `docs/cli-integrations.md` — Full setup guide
- `src/api/server.ts` — 3 new API endpoints
- `src/dashboard/dashboard.ts` — Enhanced CLI Tools page with setup builder
- `src/i18n/en.json` — EN translation keys
- `src/i18n/id.json` — ID translation keys
- `src/i18n/ja.json` — JA translation keys

## Phase 2F — Token Saver / Safe Compression

**Date:** 2026-07-11
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

Safe token-reduction layer for large tool outputs and machine-generated context. Compresses noisy output without corrupting meaning, breaking tool-call JSON, or altering user intent. Fully integrated into the runtime request pipeline, dashboard, and observability stack.

### Features

- 4 modes: off (default), safe, balanced, aggressive
- 11 content classifiers (terminal_log, stack_trace, test_output, lint_output, directory_tree, grep_output, git_diff, structured_json, source_code, user_text, unknown)
- 10 compressors (duplicate-lines, progress-noise, repeated-groups, terminal-log, stack-trace, test-output, lint-output, directory-tree, grep-output, git-diff)
- Runtime integration: compresses `role: tool` messages before forwarding to AI providers
- Per-request mode override via `X-8Router-Token-Saver` header
- Dashboard Token Saver settings page with mode selector and stats
- i18n: EN, ID, JA complete translation keys
- Observability: compression metrics in runtime_request_logs (9 fields)
- API endpoints: settings GET/PATCH, dry-run preview POST
- Deterministic token estimation (ceil(chars/4))
- Transparent markers for omitted content with exact counts
- No LLM, no external APIs, no randomness
- Fail-open on any error

### Non-Compressed (Safety)

- System/developer/user messages
- Tool-call arguments and schemas
- Structured JSON, source code, unknown content
- Access keys, credentials, auth headers

### Files Created

- src/runtime/compression/types.ts
- src/runtime/compression/config.ts
- src/runtime/compression/classify.ts
- src/runtime/compression/estimate-tokens.ts
- src/runtime/compression/policy.ts
- src/runtime/compression/compress.ts
- src/runtime/compression/index.ts
- src/runtime/compression/compressors/duplicate-lines.ts
- src/runtime/compression/compressors/progress-noise.ts
- src/runtime/compression/compressors/repeated-groups.ts
- src/runtime/compression/compressors/terminal-log.ts
- src/runtime/compression/compressors/stack-trace.ts
- src/runtime/compression/compressors/test-output.ts
- src/runtime/compression/compressors/lint-output.ts
- src/runtime/compression/compressors/directory-tree.ts
- src/runtime/compression/compressors/grep-output.ts
- src/runtime/compression/compressors/git-diff.ts
- src/runtime/compression/compressors/index.ts
- src/__tests__/token-saver.test.ts (62 tests)
- src/__tests__/run-token-saver.ts
- docs/token-saver.md

### Files Modified

- src/api/server.ts: GET/PATCH /8router/api/settings/token-saver, POST /8router/api/token-saver/preview
- src/runtime/chat-completions.ts: Runtime compression integration for role=tool messages
- src/runtime/logging.ts: compression fields in LogRequestInput + finalizeRequestLog
- src/database.ts: 9 compression columns in runtime_request_logs
- src/dashboard/dashboard.ts: Token Saver mode selector + stats
- src/i18n/en.json, id.json, ja.json: Token Saver translation keys
- src/__tests__/run.ts: Test 20 — Token Saver
- package.json: test:token-saver script

### Environment Variables

- TOKEN_SAVER_MODE=off (default)
- TOKEN_SAVER_MIN_CHARS=4000
- TOKEN_SAVER_MIN_ESTIMATED_TOKENS=1000
- TOKEN_SAVER_MAX_INPUT_CHARS=500000
- TOKEN_SAVER_TIMEOUT_MS=100
- TOKEN_SAVER_INCLUDE_MARKER=true

### Tests
- Phase 2F suite: 62 tests — all passing
- Root cause fix: IS_FAIL regex `assertion` matched passing test descriptions; fixed to use specific `AssertionError` pattern
- TypeScript clean (tsc --noEmit)
- Build clean

### Pitfalls
- `classify.ts` regex: use `/.../.test()` not string methods — regex handles Unicode ✓, ✅, ❌ correctly
- `compressContent` returns original content unchanged when below thresholds — this is correct behavior, not a bug
- Token estimation is ceil(chars/4) — do not use for billing, only for threshold checks and metrics
- `minChars` threshold (default 4000) means small content is never compressed — this is intentional
- Compression never applies to `role: system`, `role: user`, or `role: developer` messages
- Compression never applies to tool-call arguments or JSON Schema definitions
- Source code blocks are protected (unless using git-diff strategy for actual diff content)
- Unknown content kind is never compressed — fail-open
- `finalizeRequestLog` must serialize `compressionStrategies` array to JSON for SQLite storage
- `resolveCompressionMode` takes `CompressionMode`, not `CompressionConfig`, as third argument

## Phase 2E — Usage, Fallback, and Request Logs Dashboard — Usage, Fallback, and Request Logs Dashboard

**Date:** 2026-07-11
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

Enriched runtime observability with detailed request logs, provider attempt tracking, fallback path visibility, usage aggregation, token metrics, estimated cost, and dashboard UI.

**New Files:**
- `src/runtime/usage/types.ts` — Usage types (RuntimeRequestLog, RuntimeRequestAttempt, UsageSummary, TimeseriesPoint, BreakdownRow, LogFilters)
- `src/runtime/usage/pricing.ts` — Static pricing registry for known models (24 models)
- `src/runtime/usage/queries.ts` — SQL queries for usage aggregation, log listing, request detail, fallback logs, retention cleanup
- `src/runtime/usage/index.ts` — Barrel exports
- `src/__tests__/usage-logs-dashboard.test.ts` — 59 tests covering lifecycle, aggregation, pricing, security, retention, empty states
- `src/__tests__/run-usage-logs-dashboard.ts` — Test runner

**Modified Files:**
- `src/database.ts` — Added `runtime_request_attempts` table + indexes + `runtime_request_logs` extended columns (accessKeyName, accessKeyHint, endpoint, method, requestedAlias, totalTokens, estimatedTotalCost, fallbackCount, hadFallback, attemptCount, finalAttemptId, streaming, providerHealthStatus, circuitState)
- `src/runtime/logging.ts` — Enhanced with `logAttempt()`, `finalizeRequestLog()`, auto `hadFallback` flag, auto cost estimation
- `src/runtime/chat-completions.ts` — Rewritten with full attempt tracking per provider, health state capture, token extraction, fallback path logging
- `src/runtime/index.ts` — Added usage barrel exports
- `src/api/server.ts` — Added 10 new API endpoints + retention cleanup on startup
- `src/dashboard/dashboard.ts` — Updated Usage page (new API integration), Request Logs page (new table with click-to-detail), added `showRequestDetail()` function
- `src/__tests__/run.ts` — Added Test 19: Usage/Logs/Fallback Dashboard
- `package.json` — Added `test:usage-logs` script

**API Endpoints Added:**
- `GET /8router/api/usage/summary` — Usage summary (requests, tokens, cost, latency, success rate, fallback rate)
- `GET /8router/api/usage/timeseries` — Timeseries data (hour/day/week granularity)
- `GET /8router/api/usage/providers` — Usage by provider
- `GET /8router/api/usage/models` — Usage by model
- `GET /8router/api/usage/access-keys` — Usage by access key
- `GET /8router/api/usage/aliases` — Usage by alias
- `GET /8router/api/logs/requests` — Paginated request logs with filters
- `GET /8router/api/logs/requests/:id` — Request detail with attempts
- `GET /8router/api/logs/fallbacks` — Fallback-only logs

**Database Changes:**
- New table: `runtime_request_attempts` (id, requestLogId, userId, attemptIndex, provider, model, startedAt, completedAt, latencyMs, status, httpStatus, success, failureType, errorCode, errorMessage, circuitStateBefore, circuitStateAfter, healthStatusBefore, healthStatusAfter, baseUrlHost, inputTokens, outputTokens, totalTokens, estimatedCost, createdAt)
- Indexes: (userId, createdAt), (requestLogId, attemptIndex), plus 4 more for common filters

**Environment Variables:**
- `RUNTIME_LOG_RETENTION_DAYS` — Default 30, range 7–365

**Security/Privacy:**
- No raw provider keys, access keys, prompts, or response bodies stored
- Error messages redacted and truncated to 500 chars
- Base URL exposes host only (no credentials/secret query params)
- All APIs user-isolated
- Retention cleanup runs on startup

**Tests:** 59 tests — 0 failures

---

## Phase 2A — User-Owned Provider Credentials

**Commit:** cceb3a9
**Date:** 2026-07-09
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

User-owned provider credential system with encryption at rest.

**New Files:**
- `src/security/credentials/encrypt.ts` — AES-256-GCM encryption (scrypt KDF, random IV per credential)
- `src/security/credentials/redact.ts` — Secret redaction + masking utility
- `src/security/credentials/credential-manager.ts` — CRUD with encrypted storage, auto-migrates legacy plain-text keys
- `src/security/credentials/provider-meta.ts` — 14-provider security registry (OpenAI, Anthropic, Gemini, Groq, OpenRouter, Mistral, DeepSeek, Together AI, xAI, Perplexity, Cloudflare AI, Ollama, LM Studio, vLLM)
- `src/security/credentials/test-connection.ts` — Provider connectivity test via /models endpoint
- `src/security/credentials/index.ts` — Barrel exports

**API Endpoints:**
- `GET /8router/api/providers` — List connected credentials (safe, masked)
- `GET /8router/api/providers/supported` — Provider registry metadata
- `POST /8router/api/providers` — Add provider credential
- `PATCH /8router/api/providers/:id` — Update/rotate credential
- `DELETE /8router/api/providers/:id` — Delete credential
- `POST /8router/api/providers/:id/test` — Test provider connection
- `POST /8router/api/providers/:id/enable` — Enable provider
- `POST /8router/api/providers/:id/disable` — Disable provider

**Security:**
- Provider API keys encrypted at rest (AES-256-GCM, 2^14 scrypt N)
- `PROVIDER_KEY_ENCRYPTION_SECRET` env var required in production
- Keys masked (`sk-...abcd`) in API responses, never raw
- Secrets redacted from logs/errors
- Dashboard: security micro-copy on providers page

**Tests:** 103 (encryption round-trip, masking, redaction, provider metadata)
**No production routing change:** canonical.enabled remains false

## Phase 1F — OpenAI Responses API ↔ Canonical

**Commit:** 21f5b95
**Date:** 2026-07-09
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

OpenAI Responses API adapter implemented — bidirectional conversion between
Responses API request/response/streaming format and CanonicalRequest/CanonicalResponse/CanonicalStreamEvent.
Handles input items, output items (messages, function calls, reasoning),
tools (function, web_search, file_search, computer_use), streaming events,
and usage with reasoning/cached tokens.

### New files

- `src/bridge/openai-responses/types.ts` — Responses API types (460 lines)
- `src/bridge/openai-responses/request-to-canonical.ts` — Request → Canonical
- `src/bridge/openai-responses/canonical-to-request.ts` — Canonical → Request
- `src/bridge/openai-responses/response-to-canonical.ts` — Response → Canonical
- `src/bridge/openai-responses/canonical-to-response.ts` — Canonical → Response
- `src/bridge/openai-responses/stream-to-canonical.ts` — Streaming events → Canonical
- `src/bridge/openai-responses/canonical-to-stream.ts` — Canonical → Streaming events
- `src/bridge/openai-responses/usage.ts` — Usage helpers
- `src/bridge/openai-responses/index.ts` — Barrel exports
- 12 test fixtures
- `src/__tests__/openai-responses-bridge.test.ts` — 37 tests
- `src/__tests__/run-openai-responses-bridge.ts` — Test runner

### Modified files

- `src/bridge/index.ts` — Added Responses API bridge exports
- `src/__tests__/run.ts` — Added Responses API bridge test group (Test 14)
- `package.json` — Added `test:bridge-openai-responses` script

### Test results

- test:bridge-openai-responses: 37/37 ✅
- test:bridge-types: 30/30 ✅
- test:bridge-openai: 35/35 ✅
- test:bridge-openai-response: 23/23 ✅
- test:bridge-anthropic: 111/111 ✅
- test:bridge-gemini: 26/26 ✅
- npm test: all passed ✅
- tsc --noEmit: clean ✅
- npm run build: clean ✅

### Total bridge tests: 262

---

## Phase 1E — Gemini Request ↔ Canonical

**Commit:** cbd7d9e
**Date:** 2026-07-09
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

Gemini generateContent request adapter implemented — bidirectional conversion between
Gemini request format and CanonicalRequest. Handles contents/parts, systemInstruction,
tools/functionDeclarations, toolConfig, generationConfig, safetySettings, and
functionCall/functionResponse lifecycle.

### New files

- `src/bridge/gemini/types.ts` — Gemini generateContent API types
- `src/bridge/gemini/request-to-canonical.ts` — Gemini → CanonicalRequest
- `src/bridge/gemini/canonical-to-request.ts` — CanonicalRequest → Gemini
- `src/bridge/gemini/index.ts` — Barrel exports
- `tests/fixtures/bridge/gemini/simple-text.json`
- `tests/fixtures/bridge/gemini/multi-turn.json`
- `tests/fixtures/bridge/gemini/system-instruction.json`
- `tests/fixtures/bridge/gemini/tools.json`
- `tests/fixtures/bridge/gemini/function-call.json`
- `tests/fixtures/bridge/gemini/vision.json`
- `tests/fixtures/bridge/gemini/full-config.json`
- `src/__tests__/gemini-request-bridge.test.ts` — 26 tests
- `src/__tests__/run-gemini-bridge.ts` — Test runner

### Modified files

- `src/bridge/index.ts` — Added Gemini bridge exports
- `src/__tests__/run.ts` — Added Gemini bridge test group (Test 13)
- `package.json` — Added `test:bridge-gemini` script

### Key conversions

| Gemini | Canonical |
|---|---|
| `systemInstruction.parts[].text` | `instructions[]` (role: 'system') |
| `contents[].role: 'model'` | `messages[].role: 'assistant'` |
| `functionCall` parts | `tool_use` content + `toolCalls[]` |
| `functionResponse` parts | Elevated to `role: 'tool'` message |
| `inlineData` (image) | `CanonicalImagePart` (base64 source) |
| `fileData` | Text placeholder with URI |
| `topK` | `extensions.gemini.topK` |
| `safetySettings` | `extensions.gemini.safetySettings` |
| `responseMimeType` + `responseSchema` | `responseFormat.type: 'json_schema'` |
| `functionCallingConfig.mode` | `CanonicalToolChoice` (auto/required/none) |

### Test results

- test:bridge-gemini: 26/26 ✅
- test:bridge-types: 30/30 ✅
- test:bridge-openai: 35/35 ✅
- test:bridge-openai-response: 23/23 ✅
- test:bridge-anthropic: 111/111 ✅
- npm test: all passed ✅
- tsc --noEmit: clean ✅
- npm run build: clean ✅

---

## Phase 1D — OpenAI Response + Streaming ↔ Canonical

**Commit:** d5eff6c
**Date:** 2026-07-09
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

OpenAI Chat Completions response and streaming adapters implemented — bidirectional conversion between
OpenAI response format and CanonicalResponse/CanonicalStreamEvent. Includes stateful streaming parser
and event-by-event serializer. All behind `canonical.enabled=false`.

### New files

- `src/bridge/openai/response-to-canonical.ts` — OpenAI ChatCompletion → CanonicalResponse
- `src/bridge/openai/canonical-to-response.ts` — CanonicalResponse → OpenAI ChatCompletion
- `src/bridge/openai/stream-to-canonical.ts` — Stateful OpenAI SSE chunk → CanonicalStreamEvent parser
- `src/bridge/openai/canonical-to-stream.ts` — CanonicalStreamEvent → OpenAI SSE chunks
- `tests/fixtures/bridge/openai/simple-text-response.json`
- `tests/fixtures/bridge/openai/tool-call-response.json`
- `tests/fixtures/bridge/openai/with-reasoning-tokens.json`
- `tests/fixtures/bridge/openai/content-filter-response.json`
- `tests/fixtures/bridge/openai/length-limited-response.json`
- `tests/fixtures/bridge/openai/stream-simple-text.json`
- `tests/fixtures/bridge/openai/stream-tool-call.json`
- `tests/fixtures/bridge/openai/stream-parallel-tools.json`
- `src/__tests__/openai-response-bridge.test.ts` — 23 tests
- `src/__tests__/run-openai-response-bridge.ts` — Test runner

### Modified files

- `src/bridge/openai/types.ts` — Added response + streaming types
- `src/bridge/openai/index.ts` — Added response + streaming exports
- `src/bridge/index.ts` — Added Phase 1D bridge exports
- `src/__tests__/run.ts` — Added response bridge test group (Test 12)
- `package.json` — Added `test:bridge-openai-response` script

### Key conversions

| OpenAI | Canonical |
|---|---|
| `choices[0].finish_reason: 'tool_calls'` | `finishReason: 'tool_call'` (singular) |
| `choices[0].message.tool_calls[].function.arguments` | `toolCalls[].arguments` (parsed object) |
| `usage.completion_tokens_details.reasoning_tokens` | `usage.reasoningTokens` |
| `usage.prompt_tokens_details.cached_tokens` | `usage.cachedInputTokens` |
| `tool_call_start` → `tool_call_delta` → `tool_call_end` | Streaming tool call lifecycle |
| `thinking_delta` | No chunk (OpenAI has no thinking) |
| Parallel tool calls | Multi-index accumulation in stream parser |

### Test results

- test:bridge-openai-response: 23/23 ✅
- test:bridge-types: 30/30 ✅
- test:bridge-openai: 35/35 ✅
- test:bridge-anthropic: 111/111 ✅
- npm test: 121/121 ✅
- tsc --noEmit: clean ✅
- npm run build: clean ✅

---

## Phase 1C — Anthropic Messages Request ↔ Canonical

**Commit:** 8e7725f
**Date:** 2026-07-08
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

Anthropic Messages API request adapter implemented — bidirectional conversion between
Anthropic Messages format and CanonicalRequest. All conversions are behind the
`canonical.enabled=false` flag; no production runtime path is modified.

### New files

- `src/bridge/anthropic/types.ts` — Anthropic Messages API type definitions
- `src/bridge/anthropic/content.ts` — Content block ↔ CanonicalContentPart conversion
- `src/bridge/anthropic/tools.ts` — Tool definitions + tool_choice conversion (`input_schema` ↔ `inputSchema`)
- `src/bridge/anthropic/usage.ts` — Usage conversion (incl. cache_creation/cache_read tokens)
- `src/bridge/anthropic/request-to-canonical.ts` — Anthropic → CanonicalRequest
- `src/bridge/anthropic/request-from-canonical.ts` — CanonicalRequest → Anthropic
- `src/bridge/anthropic/index.ts` — Barrel exports
- `src/bridge/openai/constants.ts` — Extracted constants to fix circular dependency
- `tests/fixtures/bridge/anthropic/simple-text.json`
- `tests/fixtures/bridge/anthropic/tools.json`
- `tests/fixtures/bridge/anthropic/tool-results.json`
- `tests/fixtures/bridge/anthropic/cache-control.json`
- `tests/fixtures/bridge/anthropic/extended-thinking.json`
- `tests/fixtures/bridge/anthropic/extensions.json`
- `src/__tests__/anthropic-bridge.test.ts` — 111 tests
- `src/__tests__/run-anthropic-bridge.ts` — Test runner

### Modified files

- `src/bridge/openai/index.ts` — Constants moved to `constants.ts`, re-exported
- `src/bridge/openai/request-to-canonical.ts` — Import path fix for constants
- `src/bridge/index.ts` — Added Anthropic + OpenAI bridge exports
- `package.json` — Added `test:bridge-anthropic` script

### Key conversions

| Anthropic | Canonical |
|---|---|
| `system` (string/array) | `instructions[]` with `cacheControl` preserved |
| `tool_result` in user messages | Elevated to `role:'tool'` canonical messages |
| `tool_use` in assistant messages | `toolCalls[]` with `arguments` |
| `input_schema` | `inputSchema` |
| `max_tokens` | `maxTokens` (required by Anthropic) |
| `top_k` | `extensions.anthropic.top_k` |
| `metadata.user_id` | `extensions.anthropic.metadata` |
| `cache_creation_input_tokens` | `usage.cacheCreationTokens` |
| `cache_read_input_tokens` | `usage.cachedInputTokens` |
| `end_turn` / `tool_use` | `stop` / `tool_calls` (stop_reason mapping) |

### Test results

- test:bridge-anthropic: 111/111 ✅
- test:bridge-types: 30/30 ✅
- test:bridge-openai: 35/35 ✅
- npm test: 106/106 ✅
- tsc --noEmit: clean ✅
- npm run build: clean ✅

### Circular dependency fix

`OPENAI_EXTENSION_ALLOWLIST` and `SUSPICIOUS_FIELD_PATTERNS` were defined in
`openai/index.ts` but imported by `openai/request-to-canonical.ts` (which `index.ts`
re-exports). This created a circular dependency that caused a `ReferenceError` at
runtime. Moved constants to `openai/constants.ts`.

---

## Phase 1B — OpenAI Chat Request ↔ Canonical

**Commit:** c9aa4b7, 062b0e2
**Date:** 2026-07-07, 2026-07-08
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

OpenAI Chat Completions request adapter implemented with strict contract enforcement.
Phase 1B contract fixes in 062b0e2 tighten preservation semantics.

### Contract fixes (062b0e2)

1. Unknown OpenAI fields dropped (not preserved in extensions)
2. Malformed completed tool-call JSON fails conversion (no fabricated empty `{}`)
3. Thinking parts emit `capability_warning` when dropped
4. `maxTokenField` tracked as typed state in `extensions.openai.maxTokenField`
5. Metadata validated (prototype pollution, depth≤4, size≤8KB)
6. Extensions typed with no arbitrary index signature

### Test results

- test:bridge-types: 30/30 ✅
- test:bridge-openai: 35/35 ✅

---

## Phase 1A — Canonical Types & Config

**Commit:** 8c9d809
**Date:** 2026-07-07
**Status:** ✅ Complete. canonical.enabled defaults to false.

### What changed

Canonical type system implemented: roles, content parts, instructions, messages,
tools, tool calls, requests, responses, usage, streaming events, errors, extensions,
capabilities. Config loading from YAML with env overrides.

### Test results

- test:bridge-types: 30/30 ✅

## Phase 2B — Virtual 8Router Access Keys

**Date:** 2026-07-10
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

- `sk-8router_*` virtual access keys for tools (Cursor, Cline, OpenWebUI, etc.)
- Raw key shown only once at creation; only HMAC-SHA256 hash stored
- Key masking (`sk-8router...abcd`) for safe display
- Enable/disable/revoke/rotate access keys
- Allowed providers/models policy storage
- Routing mode + default model alias (8router/auto)
- Rate limit policy fields stored (enforcement = Phase 2C/2D)
- Access Keys dashboard page with create/revoke UI
- ACCESS_KEY_HASH_SECRET env var for HMAC hashing
- 70 new tests (hashing, generation, masking, CRUD, validation, expiration, rotation)

### Security

- Raw access keys never stored in database
- HMAC-SHA256 with app secret for key hashing
- Constant-time verification
- keyHash never returned in API responses
- Raw key only in create/rotate response (shown once)
- No provider keys exposed to tools

### Database

- New table: `access_keys` (id, userId, name, keyPrefix, keyHash, keyHint, status, isEnabled, projectName, defaultModelAlias, allowedProviders, allowedModels, routingMode, dailyRequestLimit, monthlyRequestLimit, rateLimitPerMinute, expiresAt, lastUsedAt, revokedAt, createdAt, updatedAt)

### Endpoints

- GET/POST/PATCH/DELETE /8router/api-access-keys
- POST /8router/api-access-keys/:id/revoke
- POST /8router/api-access-keys/:id/enable
- POST /8router/api-access-keys/:id/disable
- POST /8router/api-access-keys/:id/rotate

### Env vars added

- ACCESS_KEY_HASH_SECRET (required in production, dev fallback with warning)

### Not included (future phases)

- Phase 2C: Runtime /v1 routing through these keys
- Phase 2D: Rate limit enforcement
- Managed credits or token resale (never)

## Phase 2C — Runtime /v1 Routing

**Date:** 2026-07-10
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

- `/v1/models` and `/v1/chat/completions` now accept `sk-8router_*` access keys
- Runtime routing resolves user-owned provider credentials (encrypted at rest)
- 8 model aliases: `8router/auto`, `cheap`, `fast`, `smart`, `coding`, `local`, `creative`, `privacy`
- Direct provider-prefix routing: `groq/llama-3.1-8b-instant`, `openrouter/...`, etc.
- Basic fallback across connected user-owned providers (429/5xx/timeout)
- Streaming pass-through for OpenAI-compatible SSE streams
- OpenAI-compatible error responses for all failure modes
- Safe runtime request logging (no secrets)
- Access key `lastUsedAt` usage tracking
- `/8router/v1/*` alias routes for alternative access

### Security

- Runtime only uses provider keys owned by the access-key owner
- No platform-owned provider fallback
- Raw provider keys are never exposed in responses or logs
- Secrets redacted from error messages
- Access key validated via HMAC-SHA256 hash lookup
- Runtime request logs contain no secrets

### Supported Runtime Providers

OpenAI, OpenRouter, Groq, Mistral, DeepSeek, Together AI, xAI, Ollama (local)
Anthropic and Gemini: beta/optional (available if user connects them)

### Not included (future phases)

- Phase 2D: Circuit breaker + health scoring
- Phase 2E: Full usage logs dashboard
- Phase 2F: Canonical runtime path
- Managed credits (never)
- Token resale (never)

## Phase 2D — Provider Health + Circuit Breaker Runtime

**Date:** 2026-07-10
**Status:** ✅ Complete. canonical.enabled remains false.

### What changed

- Provider health tracking per user credential (not global)
- Circuit breaker: closed → open → half_open → closed
- Health-aware provider selection (skips open circuit providers)
- Failure type classification: rate_limit, auth_error, timeout, network_error, provider_error, model_unavailable, context_length, invalid_request
- Retry-After header support for circuit cooldown
- Auth errors (401/403) open circuit immediately
- Dashboard health badges with circuit state + Reset button
- GET /8router/api/provider-health — returns per-credential health
- POST /8router/api/provider-health/:id/reset — reset health/circuit state

### Circuit Breaker Defaults

- Failure threshold: 3 consecutive failures
- Cooldown: 60 seconds (configurable via env)
- Half-open: allows probe after cooldown
- Successful probe closes circuit

### Security

- Health records contain no raw provider keys
- Error messages are redacted before storage
- Per-user isolation (User A health ≠ User B health)
- No platform-owned fallback

### Tests added: 85 (health + circuit breaker + error classification + selection)
