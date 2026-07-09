# 8Router — Changelog

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
