# 8Router Post-d552681 Gap Analysis & Architecture Adaptation Plan

> **Audit date:** 2026-07-06
> **Baseline commit:** `d552681` — "fix: key-pool circuit breaker + landing page audit (10 items)"
> **Baseline version:** v0.6.1 (CHANGELOG) / commit d552681 (actual)
> **Author:** Renji Akamine

---

## Table of Contents

1. [Current Architecture Map](#1-current-architecture-map)
2. [What d552681 Already Solves](#2-what-d552681-already-solves)
3. [Existing Key-Pool Architecture Deep Dive](#3-existing-key-pool-architecture-deep-dive)
4. [Regression Contracts](#4-regression-contracts)
5. [Remaining Gaps vs 9Router](#5-remaining-gaps-vs-9router)
6. [Files That Should Be Extended](#6-files-that-should-be-extended)
7. [Files That Should NOT Be Rewritten](#7-files-that-should-not-be-rewritten)
8. [Migration Strategy](#8-migration-strategy)
9. [Revised Architecture Adaptation Roadmap](#9-revised-architecture-adaptation-roadmap)
10. [Failure Classifier Module Design](#10-failure-classifier-module-design)
11. [Combo Routing Architecture](#11-combo-routing-architecture)
12. [Streaming Rules](#12-streaming-rules)
13. [Regression Test Plan for d552681](#13-regression-test-plan-for-d552681)
14. [CHANGELOG Audit](#14-changelog-audit)

---

## 1. Current Architecture Map

```
src/
├── index.ts                          # Entry point — config → engine → API
├── config.ts                         # YAML config loader (8router.yaml)
├── types.ts                          # Core interfaces (ProviderKey, RouterConfig, etc.)
├── database.ts                       # SQLite persistence (requests, combos, cost savings, presets)
│
├── api/
│   └── server.ts                     # Express API — routes for /v1/chat/completions, /v1/models,
│                                     #   /admin/*, /8router/*, format bridge endpoints
│
├── router/
│   ├── engine.ts                     # Core routing engine — route(), routeStream(),
│   │                                 #   callProvider(), streamProvider(), key loop
│   ├── combos.ts                     # Combo resolution — resolveCombo(), isCombo()
│   │                                 #   (backed by SQLite via database.ts)
│   └── (no failure-classifier.ts)    # ← GAP: error classification lives inline in key-pool.ts
│
├── providers/
│   ├── key-pool.ts                   # Multi-account key pool v2 (408 lines)
│   │                                 #   PoolKey, ProviderPool, circuit breaker, rotation
│   │                                 #   ErrorCategory type, recordKeyFailure(), getNextKey()
│   ├── registry.ts                   # ProviderRegistry — getProvidersForModel(), recordSuccess/Failure
│   ├── adapter.ts                    # ProviderAdapter interface + OpenAI/Anthropic/Gemini adapters
│   ├── provider-adapter.ts           # FullProviderAdapter (extended, streaming-aware)
│   ├── adapter-extended.ts           # Additional adapter utilities
│   ├── format-bridge.ts              # Format translation (349 lines)
│   │                                 #   openaiToAnthropic(), anthropicToOpenai(),
│   │                                 #   openaiToGemini(), geminiToOpenai(),
│   │                                 #   normalizeRequest(), formatResponse()
│   ├── catalog.ts                    # ProviderDef[], PROVIDER_CATALOG, MODEL_ALIASES,
│   │                                 #   autoDetectProviders(), resolveModelAlias()
│   ├── model-capabilities.ts         # ModelCapability[], getModelCap(), getCheapestModel()
│   ├── smart-picker.ts               # pickBestModel() — cost/quality picker
│   ├── latency-tracker.ts            # recordLatency(), getLatencyStats(), runBenchmark()
│   └── streaming-fallback.ts         # StreamingFallbackHandler, streamWithFallback()
│
├── compressor/
│   ├── rtk.ts                        # RTK compression (token saving)
│   └── caveman.ts                    # Caveman mode (output compression)
│
├── logger/
│   └── request-logger.ts             # SQLite request logging + sanitizeError()
│
├── dashboard/
│   └── dashboard.ts                  # Dashboard SPA (2549 lines) — proxy-only, no direct engine access
│
├── i18n/
│   ├── en.json                       # English translations
│   ├── id.json                       # Indonesian translations
│   └── ja.json                       # Japanese translations
│
└── __tests__/
    ├── run.ts                        # Main test runner (9 test groups)
    └── key-pool.test.ts             # Key pool & circuit breaker tests (33 assertions)
```

### Data Flow (Current)

```
Client Request (OpenAI/Anthropic/Gemini)
  │
  ▼
server.ts — normalizeRequest() → OpenAI format
  │
  ▼
engine.ts — route() or routeStream()
  │  ├─ resolveModelRoutes() — combo or direct model
  │  ├─ optimizeCost() — smart cost optimizer
  │  └─ compress() — RTK compression
  │
  ▼
callProvider() — per-provider attempt
  │  ├─ hasNextKey()? → getNextKey() from key-pool.ts
  │  ├─ adapter.buildRequest() / adapter.buildHeaders()
  │  ├─ fetch(endpoint, ...)
  │  ├─ on error: recordKeyFailure() with ErrorCategory
  │  │    └─ key_invalid/rate_limit → key-only effect
  │  │    └─ server_error/timeout → may trip provider circuit
  │  ├─ retry loop: getRetryKey() × all keys in pool
  │  └─ on success: recordKeySuccess()
  │
  ▼
formatResponse() — back to client format
  │
  ▼
Client Response
```

---

## 2. What d552681 Already Solves

| Problem | Solution in d552681 | File | Lines |
|---------|---------------------|------|-------|
| Failure counter mixed | `errorCategory` parameter splits 401/403/429/5xx | `key-pool.ts` | L269-321 |
| 401/403 trips circuit | `key_invalid` branch → no `recordCircuitFailure()` call | `key-pool.ts` | L292-298 |
| 429 trips circuit | `rate_limit` branch → no `recordCircuitFailure()` call | `key-pool.ts` | L299-306 |
| Half-open allows many | `circuitHalfOpenTestInFlight` flag, blocks subsequent requests | `key-pool.ts` | L108-113 |
| Fixed 30s cooldown for 429 | `retryAfterMs` parameter, reads `Retry-After` header | `key-pool.ts` | L304, `engine.ts` L254-260 |
| key.healthy inconsistent | Explicit `key.healthy = false` in all non-healthy branches | `key-pool.ts` | L315-316 |
| Single retry per provider | `callProvider()` loops `getRetryKey()` × all keys | `engine.ts` L229-253 |
| Fixed cooldown | Exponential: base × 2^(failures - threshold), capped at 30min | `key-pool.ts` | L133 |
| Secrets in logs | `sanitizeError()` masks sk-*, Bearer, token=, key= patterns | `request-logger.ts` | L168-175 |
| Weak tests | 33 assertions across 8 test functions | `key-pool.test.ts` | all |

### d552681 Does NOT Solve

| Gap | Impact | Phase |
|-----|--------|-------|
| Error classification is inline in `recordKeyFailure()` | Not reusable, not testable in isolation | Phase 3 |
| `categorizeError()` duplicates logic in `engine.ts` L361 | Two places to maintain | Phase 3 |
| No capability-aware routing | Provider selected by tier only, not by actual capability | Phase 2 |
| No connection type abstraction | Only `api_key` supported; no oauth/local/anonymous | Phase 2 |
| No health probe / quota reset tracking | `remainingQuota` exists but never set | Phase 2 |
| No latency-aware routing | `latency-tracker.ts` exists but not used in routing decisions | Phase 2 |
| Format bridge is direct provider-to-provider | `openaiToAnthropic()` is direct, not canonical | Phase 1 |
| No combo execution plan | Combo is just route list, no step sequencing | Phase 3 |
| Streaming fallback is separate from engine | `streamWithFallback()` not integrated with `streamProvider()` | Phase 4 |
| No priority/weight in key selection | Round-robin only, no weighted distribution | Phase 2 |

---

## 3. Existing Key-Pool Architecture Deep Dive

### 3.1 How Keys Are Selected

**Entry point:** `getNextKey(providerId)` (L156-218)

1. Check circuit breaker via `isCircuitOpen(pool)` — if open, return `null`
2. Loop through all keys using rotation strategy:
   - **round-robin:** `pool.keys[currentIndex % length]`, increment `currentIndex`
   - **random:** random index
   - **least-used:** min `totalRequests`
3. Skip key if: in cooldown (`cooldownUntil > now`), status is `exhausted` or `invalid`
4. Return key if: `healthy === true`, OR cooldown expired (reset to healthy)
5. Fallback: return oldest-cooldown key if no key is ready

**Retry selection:** `getRetryKey(providerId, failedApiKey)` (L220-250)

1. Mark failed key: `errorCount++`, `totalErrors++`, `lastError = now`
2. Loop through all keys, skip the failed key
3. Skip keys in cooldown, exhausted, or invalid
4. Return first healthy key or one whose cooldown expired

### 3.2 How Failure Category Is Stored

**Interface `PoolKey`** (L6-21):
- `status: 'healthy' | 'rate_limited' | 'exhausted' | 'invalid' | 'cooldown'`
- `healthy: boolean` — must always be `status !== 'healthy'` → `false`
- `errorCount: number` — per-key error counter (reset on success)
- `cooldownMs: number` — per-key cooldown duration
- `cooldownUntil: number | null` — absolute timestamp when cooldown expires

**Interface `ProviderPool`** (L23-36):
- `circuitFailures: number` — provider-level failure counter (only `server_error`/`timeout`)
- `circuitState: 'closed' | 'open' | 'half-open'`
- `circuitOpenUntil: number | null` — absolute timestamp when circuit can test
- `circuitHalfOpenTestInFlight: boolean` — gate for single probe request

**Category routing in `recordKeyFailure()`** (L271-321):

```
errorCategory || categorizeError(statusCode)
  │
  ├─ 'key_invalid' (401/403)
  │   → key.healthy = false, status = 'invalid'
  │   → cooldownMs = 300_000 (5 min fixed)
  │   → NO recordCircuitFailure() ← KEY BEHAVIOR
  │
  ├─ 'rate_limit' (429)
  │   → key.healthy = false, status = 'rate_limited'
  │   → cooldownMs = retryAfterMs || 30_000
  │   → NO recordCircuitFailure() ← KEY BEHAVIOR
  │
  └─ 'server_error' / 'timeout' (5xx, network, timeout)
      ├─ errorCount >= MAX_ERRORS_BEFORE_DISABLE (3)
      │   → key.healthy = false, status = 'cooldown'
      │   → cooldownMs = 60_000
      │   → recordCircuitFailure(pool) ← TRIPS CIRCUIT
      └─ errorCount < 3
          → key.healthy = false, status = 'cooldown'
          → cooldownUntil = now + cooldownMs
          → recordCircuitFailure(pool) ← TRIPS CIRCUIT
```

### 3.3 How Retry-After Is Processed

1. In `engine.ts` `callProvider()` L254-260:
   ```ts
   if (statusCode === 429) {
     const retryAfterHeader = response.headers.get('retry-after');
     if (retryAfterHeader) {
       const seconds = parseInt(retryAfterHeader, 10);
       if (!isNaN(seconds) && seconds > 0) retryAfterMs = seconds * 1000;
     }
   }
   ```
2. Passed to `recordKeyFailure(providerId, apiKey, statusCode, errText, category, retryAfterMs)`
3. In `key-pool.ts` L304:
   ```ts
   key.cooldownMs = retryAfterMs && retryAfterMs > 0 ? retryAfterMs : DEFAULT_429_COOLDOWN;
   ```
4. `key.cooldownUntil = Date.now() + key.cooldownMs`

**Edge cases handled:**
- Missing header → fallback to 30s default
- Non-numeric header → `parseInt` returns `NaN` → fallback
- Zero/negative value → `retryAfterMs > 0` check → fallback

### 3.4 How Half-Open Concurrency Is Locked

**`isCircuitOpen(pool)`** (L89-114):

```
circuitState === 'closed'
  → return false (allow)

circuitState === 'open'
  ├─ now > circuitOpenUntil
  │   → transition to 'half-open'
  │   → set circuitHalfOpenTestInFlight = true
  │   → return false (allow THIS ONE request)
  └─ now <= circuitOpenUntil
      → return true (block)

circuitState === 'half-open'
  ├─ circuitHalfOpenTestInFlight === true
  │   → return true (block — another request is testing)
  └─ circuitHalfOpenTestInFlight === false
      → set circuitHalfOpenTestInFlight = true
      → return false (allow — this request becomes the test)
```

**Reset points:**
- `recordCircuitSuccess()` → sets `circuitHalfOpenTestInFlight = false`, closes circuit
- `recordCircuitFailure()` → sets `circuitHalfOpenTestInFlight = false`, opens circuit

### 3.5 How All Keys Are Tried Before Tier Fallback

**`callProvider()` in `engine.ts`** (L220-253):

```
1. getNextKey() → get first key from pool
2. Try request with first key
3. On error: recordKeyFailure()
4. Loop for (provider.apiKeys.length - 1) attempts:
   a. getRetryKey(providerId, failedApiKey) → next unique key
   b. Track failedKeys Set to avoid duplicates
   c. Try request with retry key
   d. On error: recordKeyFailure(), continue loop
   e. On success: recordKeySuccess(), return
5. All keys exhausted → throw error
6. Engine catches → moves to next provider in tier
```

**Key constraint:** `failedKeys` Set ensures no key is tried twice. Loop breaks when:
- `getRetryKey()` returns `null` (no more healthy keys)
- Retry key is already in `failedKeys` (all keys exhausted)

### 3.6 How Exponential Backoff Is Calculated

**`recordCircuitFailure(pool)`** (L126-138):

```ts
pool.circuitFailures++;
const backoffMs = Math.min(
  pool.circuitOpenMs * Math.pow(2, pool.circuitFailures - pool.circuitThreshold),
  30 * 60_000  // cap at 30 minutes
);
pool.circuitOpenUntil = Date.now() + backoffMs;
```

**Constants:**
- `CIRCUIT_THRESHOLD = 5` (failures before opening)
- `CIRCUIT_OPEN_MS = 180_000` (3 minutes base)
- Cap: `30 * 60_000 = 1,800,000` (30 minutes)

**Progression:**
| Failures | Formula | Backoff |
|----------|---------|---------|
| 5 | 3min × 2^0 | 3 min |
| 6 | 3min × 2^1 | 6 min |
| 7 | 3min × 2^2 | 12 min |
| 8 | 3min × 2^3 | 24 min |
| 9+ | 3min × 2^4+ | 30 min (capped) |

---

## 4. Regression Contracts

> These behaviors MUST NOT change. Any architecture adaptation must preserve them.

### 4.1 Error Category → Circuit Breaker Isolation

| Error | Key Effect | Provider Circuit Effect | Cooldown |
|-------|-----------|------------------------|----------|
| 401/403 (`key_invalid`) | `healthy=false`, `status='invalid'` | **NONE** | 5 min fixed |
| 429 (`rate_limit`) | `healthy=false`, `status='rate_limited'` | **NONE** | Retry-After or 30s default |
| 5xx/timeout (`server_error`) | `healthy=false`, `status='cooldown'` | **Increments** `circuitFailures` | 60s (HEALTHY_COOLDOWN) |
| Network error | Same as `server_error` | **Increments** `circuitFailures` | 60s |

**Contract:** `recordCircuitFailure()` is ONLY called for `server_error`/`timeout` categories.

### 4.2 Half-Open Single Probe

- When circuit transitions from `open` → `half-open`: exactly 1 request is allowed through
- All other concurrent requests while probe is in-flight: treated as circuit open (fallback)
- Probe success → circuit closes, `circuitFailures` resets to 0
- Probe failure → circuit re-opens with exponential backoff

**Contract:** `circuitHalfOpenTestInFlight` flag is the concurrency gate. It is `true` during probe, `false` otherwise.

### 4.3 Key Loop Before Tier Fallback

- Engine tries ALL eligible keys in a pool before moving to next provider
- `failedKeys` Set prevents retrying same key
- Loop terminates when: all keys tried, or `getRetryKey()` returns null
- Only THEN does error propagate to engine → next provider/tier

**Contract:** Provider-level fallback happens ONLY after all keys in pool are exhausted.

### 4.4 Secrets Never Appear in Logs

- `sanitizeError()` in `request-logger.ts` masks: `sk-*`, `Bearer <long>`, `token=<long>`, `key=<long>`
- `maskKey()` in `key-pool.ts` masks: first 6 + `...` + last 4 chars
- `maskAllSecrets()` recursively masks objects with key/token/secret fields

**Contract:** No raw API key appears in any log, error message, or API response.

### 4.5 Exponential Backoff Bounds

- Base: `CIRCUIT_OPEN_MS` = 3 minutes
- Multiplier: `2^(failures - threshold)`
- Cap: 30 minutes
- Backoff resets on `recordCircuitSuccess()` (circuit closes)

**Contract:** Backoff never exceeds 30 minutes. Backoff starts at 3 minutes.

### 4.6 Key.healthy Synchronization

- `key.healthy === false` whenever `key.status !== 'healthy'`
- All 4 error branches in `recordKeyFailure()` set `key.healthy = false`
- `recordKeySuccess()` sets `key.healthy = true` and `key.status = 'healthy'`

**Contract:** `healthy` flag is always consistent with `status`.

---

## 5. Remaining Gaps vs 9Router

### 5.1 Format Bridge Architecture

**Current (8Router):**
- `format-bridge.ts` does direct provider-to-provider translation
- `openaiToAnthropic()`, `anthropicToOpenai()`, `openaiToGemini()`, `geminiToOpenai()`
- Also `normalizeRequest()` which normalizes TO OpenAI format
- Also `formatResponse()` which converts FROM OpenAI back to original format
- Problem: direct translation means N providers × M formats = N×M functions

**Target (9Router pattern):**
- Client format → `CanonicalRequest` → provider adapter
- Provider response → `CanonicalResponse` → client format
- Only 2N functions needed (N adapters × 2 directions)

**Gap:** 8Router already has `normalizeRequest()` which does "any format → OpenAI". This is close to canonical but OpenAI is used as the canonical format instead of a dedicated `CanonicalRequest` type.

### 5.2 Provider Connection Pool

**Current (8Router):**
- `PoolKey` only stores `apiKey: string`
- `ProviderKey` in `types.ts` has `apiKeys?: string[]` and `rotation?: 'round-robin'`
- No connection type abstraction (only API keys)
- No OAuth refresh, no quota reset, no priority/weight

**Target (9Router pattern):**
- `Connection` type: `api_key | oauth | local | anonymous | custom-compatible`
- Per-connection metadata: OAuth token, expiry, refresh function
- Priority and weight for key selection
- Quota reset tracking
- Latency metrics per key

**Gap:** `PoolKey.healthy`, `PoolKey.cooldownUntil`, `PoolKey.circuitBreaker` all exist and work. Need to EXTEND, not replace.

### 5.3 Failure Classifier

**Current (8Router):**
- `categorizeError()` in `key-pool.ts` (L324-328) — 3 lines, inline
- Duplicate `categorizeError()` in `engine.ts` (L361-365) — same logic
- No structured output (just returns `ErrorCategory`)

**Target (9Router pattern):**
- Dedicated `src/routing/failure-classifier.ts`
- Returns structured result: `{ category, retryScope, affectsProviderCircuit, cooldownMs, sanitizedMessage }`
- Single source of truth, testable in isolation

**Gap:** `ErrorCategory` type exists. Logic works. Need to extract into module with richer output.

### 5.4 Combo Routing

**Current (8Router):**
- `combos.ts` resolves combo name → list of `{ provider, model }` routes
- Engine tries them sequentially (same as regular provider fallback)
- No step sequencing, no dependency, no conditional logic

**Target (9Router pattern):**
- Combo = route plan with steps
- Each step has: alias/combo → capability filter → provider target → connection/key selection
- Engine executes plan steps, existing retry/circuit handles failure

**Gap:** `resolveCombo()` returns flat list. Engine already handles sequential fallback. Need to add capability filtering and step sequencing.

### 5.5 Streaming

**Current (8Router):**
- `streamProvider()` in `engine.ts` — inline, tries all keys in pool
- `streamWithFallback()` in `streaming-fallback.ts` — separate, adapter-integrated
- These are TWO different streaming implementations that don't talk to each other
- `streamProvider()` handles key rotation but not provider fallback
- `streamWithFallback()` handles provider fallback but not key rotation

**Target (9Router pattern):**
- Unified streaming with both key rotation AND provider fallback
- Rules: fallback allowed before first token, no restart after stream begins
- Stream interruption → logged, error returned safely, no silent restart

**Gap:** Two separate streaming implementations need unification.

---

## 6. Files That Should Be Extended

| File | What to Add | Phase |
|------|------------|-------|
| `src/providers/key-pool.ts` | Connection types, priority, weight, quota reset, OAuth refresh | Phase 2 |
| `src/providers/key-pool.ts` | Latency metrics per key | Phase 2 |
| `src/router/engine.ts` | Capability-aware routing, combo step execution | Phase 3 |
| `src/router/engine.ts` | Token saver pipeline integration | Phase 4 |
| `src/router/combos.ts` | Route planner with capability filtering | Phase 3 |
| `src/providers/format-bridge.ts` | Canonical types, adapter pattern | Phase 1 |
| `src/providers/registry.ts` | Provider V2 capabilities, health probes | Phase 5 |
| `src/providers/streaming-fallback.ts` | Unified with engine streaming | Phase 4 |
| `src/dashboard/dashboard.ts` | Connections/Combos UI | Phase 6 |
| `src/__tests__/key-pool.test.ts` | Regression tests for d552681 contracts | Phase 0 |

## 7. Files That Should NOT Be Rewritten

| File | Why | Contract |
|------|-----|----------|
| `src/providers/key-pool.ts` (core logic) | Circuit breaker, rotation, health tracking all work correctly | All regression contracts |
| `src/router/engine.ts` (callProvider loop) | Key loop before tier fallback works correctly | Contract 4.3 |
| `src/logger/request-logger.ts` (sanitizeError) | Secret masking works correctly | Contract 4.4 |
| `src/__tests__/key-pool.test.ts` (33 tests) | All pass, document correct behavior | Regression baseline |
| `src/providers/catalog.ts` | Provider definitions work correctly | No change needed |
| `src/compressor/rtk.ts` | Compression works correctly | No change needed |
| `src/database.ts` | SQLite persistence works correctly | No change needed |

---

## 8. Migration Strategy

### Principle: Evolution, Not Revolution

```
Phase 0 (NOW)    → Add regression tests, fix CHANGELOG
Phase 1          → Format bridge refactor (canonical types)
Phase 2          → Extend key-pool → connection pool (add fields, keep behavior)
Phase 3          → Combo route planner + failure classifier extraction
Phase 4          → Token saver pipeline + unified streaming
Phase 5          → Provider registry V2 (capabilities, health probes)
Phase 6          → Dashboard connections/combos UI
```

### Key Constraints

1. **Never modify `recordKeyFailure()` logic** — only add fields/parameters
2. **Never change circuit breaker thresholds** — CIRCUIT_THRESHOLD=5, CIRCUIT_OPEN_MS=3min, cap=30min
3. **Never change ErrorCategory values** — `key_invalid | rate_limit | server_error | timeout`
4. **Never remove `circuitHalfOpenTestInFlight`** — it's the concurrency gate
5. **All 33 existing tests must pass** after every phase
6. **`PoolKey` interface is additive only** — new fields, no removed fields
7. **`ProviderPool` interface is additive only** — new fields, no removed fields
8. **`maskKey()` and `maskAllSecrets()` must remain** — secret masking is non-negotiable

---

## 9. Revised Architecture Adaptation Roadmap

### Phase 0 — Regression Baseline (NOW)

**Goal:** Lock d552681 behavior as regression contracts

- [ ] Strengthen Test 4: replace `passed += 2` with real integration test for half-open concurrency
  - Force circuit open (5× server_error)
  - Manipulate `circuitOpenUntil` to past (simulate time passing) via direct pool access
  - Call `getNextKey()` twice concurrently
  - Assert: first call returns key (`circuitHalfOpenTestInFlight = true`), second returns `null`
  - Assert: after `recordKeySuccess()`, `circuitHalfOpenTestInFlight = false`
  - Use `Promise.all` with timing to simulate concurrent requests
- [ ] Add regression tests for all 6 contracts in Section 4
- [ ] Fix CHANGELOG (see Section 14 for exact corrections)
  - Dates: `2025-07-01` → `2026-06-30`, `2025-07-05` → `2026-07-01`
  - Add `## [0.6.2] - 2026-07-06` entry for d552681
  - Add missing commits: f639865 (banner fix), e652be1 (stale URLs)
- [ ] Document `ErrorCategory` as public API (exported type, JSDoc)
- [ ] Document `ProviderPool.circuitHalfOpenTestInFlight` as public field (JSDoc)
- [ ] Add JSDoc to `recordKeyFailure()` documenting all 6 parameters and their contract

**Files modified:** `src/__tests__/key-pool.test.ts`, `CHANGELOG.md`, `src/providers/key-pool.ts` (JSDoc only)
**Files created:** None
**Regression risk:** None (additive tests + documentation only)

### Phase 1 — Canonical Format Bridge

**Goal:** Replace direct provider-to-provider translation with canonical format

**Current state:** `format-bridge.ts` has `normalizeRequest()` (any → OpenAI) and `formatResponse()` (OpenAI → any). This is 80% there.

**Changes:**
1. Define `CanonicalRequest` and `CanonicalResponse` types in `types.ts`
2. Rename `normalizeRequest()` → `toCanonical()` (no logic change, just naming)
3. Rename `formatResponse()` → `fromCanonical()` (no logic change, just naming)
4. Update `server.ts` to use new names
5. Update adapters to implement `toCanonical()`/`fromCanonical()` methods

**Files modified:** `src/types.ts`, `src/providers/format-bridge.ts`, `src/api/server.ts`
**Files created:** None (types go in existing `types.ts`)
**Regression risk:** Low (rename only, no logic change)

### Phase 2 — Upgrade Key Pool to Provider Connection Pool

**Goal:** Evolve `PoolKey` to support multiple connection types

**Design Decision (LOCKED): Circuit breaker scope remains per-provider**

The circuit breaker state (`circuitFailures`, `circuitState`, `circuitOpenUntil`,
`circuitHalfOpenTestInFlight`) stays at the **ProviderPool level** — NOT per-connection-group.

Rationale:
- `recordCircuitFailure()` is only called for `server_error`/`timeout` (Contract 4.1)
- A provider going down (5xx) is a provider-level event, not a key-level event
- Multiple connections to the same provider share the same circuit breaker
- If a connection group spans multiple providers, each provider has its own `ProviderPool` instance
- This preserves Fix #1 (error category separation) without ambiguity

Connection types are a **pool-level capability**, not a circuit-breaker concern:
- `api_key` connections: existing behavior, full rotation + circuit breaker
- `oauth` connections: same pool, but with token refresh before request
- `local` connections: same pool, but with no API key needed
- `anonymous` connections: same pool, but with no auth header
- `custom-compatible` connections: same pool, custom header format

**Scope constraint:** A `ProviderPool` always maps to ONE provider. If you need
multi-provider groups (e.g., "all premium providers"), that's a routing concern
handled by `resolveCombo()` in Phase 3, NOT a pool concern.

**Changes:**
1. Add `connectionType: 'api_key' | 'oauth' | 'local' | 'anonymous' | 'custom-compatible'` to `PoolKey`
2. Add optional fields: `oauthToken`, `oauthExpiry`, `oauthRefreshFn`, `quotaResetAt`, `priority`, `weight`, `latencyMs`
3. Update `getNextKey()` to consider `priority` and `weight` (round-robin weighted)
4. Add `refreshOAuth()` function (placeholder, called before request)
5. Add `resetQuota()` function (called when `quotaResetAt` is reached)
6. Keep ALL existing behavior (circuit breaker, cooldown, health tracking)

**Files modified:** `src/providers/key-pool.ts`
**Files created:** None
**Regression risk:** Low (additive fields, existing logic unchanged)

### Phase 3 — Combo Route Planner + Failure Classifier

**Goal:** Extract error classification, add capability-aware combo routing

**Extraction Safety Constraint:**

When extracting `categorizeError()` from `key-pool.ts` to `failure-classifier.ts`,
the mapping MUST remain EXACTLY:

| StatusCode | Category | affectsProviderCircuit |
|------------|----------|----------------------|
| 401 | `key_invalid` | `false` |
| 403 | `key_invalid` | `false` |
| 429 | `rate_limit` | `false` |
| 500 | `server_error` | `true` |
| 502 | `server_error` | `true` |
| 503 | `server_error` | `true` |
| 504 | `server_error` | `true` |
| timeout/network | `server_error` | `true` |

**Verification:** Run all 33+ regression tests after extraction. Any test failure
means the mapping changed — revert immediately.

**Changes:**
1. Create `src/routing/failure-classifier.ts` — extract `categorizeError()` + add structured output
   - `classifyFailure(statusCode?, errText?, retryAfterMs?)` → `FailureClassification`
   - Single source of truth: status code → category → circuit effect → cooldown
   - Export `ErrorCategory` type (move from `key-pool.ts`, re-export for backward compat)
2. Update `key-pool.ts` to import from new module (replace inline `categorizeError()`)
   - Re-export `ErrorCategory` from `key-pool.ts` for backward compatibility
   - Remove local `categorizeError()` function
3. Remove duplicate `categorizeError()` from `engine.ts`
   - Import `classifyFailure` from failure-classifier
   - Use `FailureClassification.isRetryable` instead of inline checks
4. Update `combos.ts` to add capability filtering: `resolveComboWithCapabilities()`
5. Update `engine.ts` route planning to use capability filter before provider selection

**Files modified:** `src/providers/key-pool.ts`, `src/router/engine.ts`, `src/router/combos.ts`
**Files created:** `src/routing/failure-classifier.ts`
**Regression risk:** Medium (extracting logic, must ensure same behavior — run all tests after)

### Phase 4 — Token Saver Pipeline + Unified Streaming

**Goal:** Integrate token saving into routing, unify streaming implementations

**Changes:**
1. Create `src/routing/token-saver.ts` — integrate RTK + Caveman + cost optimization
2. Update `engine.ts` to use token saver pipeline (replace inline compression + cost optimization)
3. Unify `streamProvider()` and `streamWithFallback()` into single implementation
4. Add streaming rules: fallback before first token only, log mid-stream errors

**Files modified:** `src/router/engine.ts`, `src/providers/streaming-fallback.ts`
**Files created:** `src/routing/token-saver.ts`
**Regression risk:** Medium-High (streaming changes affect user experience)

### Phase 5 — Provider Registry V2

**Goal:** Add capabilities, health probes, provider-level health checks

**Changes:**
1. Extend `ProviderDef` in `catalog.ts` with `capabilities`, `healthProbeUrl`, `supportsStreaming`
2. Add periodic health probe to `registry.ts`
3. Update routing to skip providers that fail health checks
4. Add provider-level stats aggregation

**Files modified:** `src/providers/catalog.ts`, `src/providers/registry.ts`
**Files created:** None
**Regression risk:** Low (health checks are additive)

### Phase 6 — Dashboard Connections/Combos

**Goal:** Expose connection pool and combo management in dashboard

**Changes:**
1. Add admin API endpoints for connection management
2. Add dashboard UI for: viewing connections, managing combos, health status
3. Add real-time stats for connection pool health

**Files modified:** `src/dashboard/dashboard.ts`, `src/api/server.ts`
**Files created:** None
**Regression risk:** Low (UI only)

---

## 10. Failure Classifier Module Design

### `src/routing/failure-classifier.ts`

```ts
export type ErrorCategory = 'key_invalid' | 'rate_limit' | 'server_error' | 'timeout';

export interface FailureClassification {
  category: ErrorCategory;
  retryScope: 'key' | 'provider';      // key-only vs provider-level
  affectsProviderCircuit: boolean;       // should recordCircuitFailure() be called
  cooldownMs: number;                    // recommended cooldown duration
  sanitizedMessage: string;              // error message with secrets masked
  isRetryable: boolean;                  // should we try another key/provider
}

export function classifyFailure(
  statusCode?: number,
  errText?: string,
  retryAfterMs?: number,
): FailureClassification {
  const category = categorizeError(statusCode);
  const sanitized = sanitizeError(errText);
  
  switch (category) {
    case 'key_invalid':
      return {
        category,
        retryScope: 'key',
        affectsProviderCircuit: false,
        cooldownMs: 300_000,  // 5 minutes
        sanitizedMessage: sanitized,
        isRetryable: true,    // try next key
      };
    case 'rate_limit':
      return {
        category,
        retryScope: 'key',
        affectsProviderCircuit: false,
        cooldownMs: retryAfterMs && retryAfterMs > 0 ? retryAfterMs : 30_000,
        sanitizedMessage: sanitized,
        isRetryable: true,    // try next key
      };
    case 'server_error':
    case 'timeout':
      return {
        category,
        retryScope: 'provider',
        affectsProviderCircuit: true,
        cooldownMs: 60_000,   // HEALTHY_COOLDOWN
        sanitizedMessage: sanitized,
        isRetryable: true,    // try next key, may trip circuit
      };
  }
}

function categorizeError(statusCode?: number): ErrorCategory {
  if (statusCode === 401 || statusCode === 403) return 'key_invalid';
  if (statusCode === 429) return 'rate_limit';
  return 'server_error';
}

function sanitizeError(msg: string | undefined): string {
  if (!msg) return '';
  return msg
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, (m) => m.slice(0, 6) + '...' + m.slice(-4))
    .replace(/Bearer [a-zA-Z0-9_.-]{20,}/g, 'Bearer sk-xxxx...xxxx')
    .replace(/token[=:]["']?[a-zA-Z0-9_.-]{20,}/gi, 'token=sk-xxxx...xxxx')
    .replace(/key[=:]["']?[a-zA-Z0-9_.-]{20,}/gi, 'key=sk-xxxx...xxxx');
}
```

**Integration points:**
- `key-pool.ts` `recordKeyFailure()` → call `classifyFailure()` first, use result
- `engine.ts` `callProvider()` → use `FailureClassification.isRetryable` for loop logic
- Remove inline `categorizeError()` from both `key-pool.ts` and `engine.ts`

---

## 11. Combo Routing Architecture

### Current Flow

```
comboName ("smart-router")
  → resolveCombo() → [{provider: 'groq', model: 'llama-3.3-70b'}, {provider: 'anthropic', model: 'claude-sonnet-4-20250514'}]
  → engine tries each sequentially (same as regular fallback)
```

### Target Flow

```
comboName ("smart-router")
  → resolveComboWithCapabilities()
  → RoutePlan {
      steps: [
        {
          alias: 'groq',
          provider: 'groq',
          model: 'llama-3.3-70b-versatile',
          requiredCapabilities: { tools: true, streaming: true },
          weight: 0.7,
        },
        {
          alias: 'anthropic',
          provider: 'anthropic',
          model: 'claude-sonnet-4-20250514',
          requiredCapabilities: { tools: true },
          weight: 0.3,
        }
      ]
    }
  → Engine executes steps:
    1. Filter providers by capability
    2. Select connection/key (weighted by priority)
    3. Execute with existing retry/circuit logic
    4. On failure → next step
```

### Integration with Existing Engine

- `resolveCombo()` stays as-is (backward compatible)
- New `resolveComboWithCapabilities()` adds capability filtering
- Engine uses new function when available, falls back to old one
- Key pool and circuit breaker logic unchanged

---

## 12. Streaming Rules

### Current Rules (implemented in `streaming-fallback.ts`)

1. ✅ Fallback allowed before first emitted token (`streamStarted === false`)
2. ✅ No silent provider restart after stream begins
3. ✅ Stream interruption logged and returned safely (error chunk with `_8router.error: true`)
4. ✅ Fallback metadata sanitized (no raw keys in error messages)

### Rules to Enforce (not yet implemented)

5. ⬜ Stream interruption must include `fallbackPath` in error chunk metadata
6. ⬜ All providers exhausted → single error chunk, no partial content leakage
7. ⬜ Error chunk `_8router.message` must be sanitized (apply `sanitizeError()`)
8. ⬜ Streaming key rotation must use same key loop as non-streaming (`callProvider()`)

### Unification Plan

- `streamProvider()` in `engine.ts` already has key loop (from d552681)
- `streamWithFallback()` in `streaming-fallback.ts` has provider fallback
- Merge: engine's `routeStream()` should use `streamWithFallback()` logic internally
- Result: single streaming path with both key rotation AND provider fallback

---

## 13. Regression Test Plan for d552681

### New Tests to Add

```ts
// Test 9: Invalid key (401) does NOT open provider circuit
// Test 10: Rate limit (429) does NOT open provider circuit
// Test 11: Retry-After controls key cooldown
// Test 12: Half-open only permits one probe
// Test 13: All keys tried before tier fallback
// Test 14: Server errors trigger exponential provider cooldown
// Test 15: Cooldown capped at 30 minutes
// Test 16: Masked secrets in every failure path
// Test 17: key.healthy === false when status !== 'healthy' (all branches)
// Test 18: ErrorCategory auto-detection from statusCode
// Test 19: Mixed error types don't interfere
// Test 20: Exponential backoff progression (failures 5→9)
```

### Test Assertions Detail

| Test | Setup | Assertion |
|------|-------|-----------|
| 9 | 5× 401 on key-a | `circuitFailures === 0`, circuit still closed, other keys healthy |
| 10 | 5× 429 on key-x | `circuitFailures === 0`, circuit still closed, key-x rate_limited |
| 11 | 429 + Retry-After:10 | `cooldownUntil ≈ now + 10s` (±100ms tolerance) |
| 12 | Force circuit open, then half-open | 2 concurrent calls → 1 passes, 1 blocked |
| 13 | Pool with 3 keys, all fail | Engine tries all 3, then throws (no early exit) |
| 14 | 5× 500 | `circuitState === 'open'`, `circuitOpenUntil > now` |
| 15 | 10× 500 (many failures) | `circuitOpenUntil - now ≤ 30min` (never exceeds cap) |
| 16 | Any error path | `errorMessage` contains no raw `sk-*` patterns |
| 17 | All error branches | `key.healthy === false` when `key.status !== 'healthy'` |
| 18 | Status codes 401/403/429/500/timeout | Correct `ErrorCategory` returned |
| 19 | Mix of 401+429+500 | Only 500 counts toward circuit breaker |
| 20 | Failures 5,6,7,8,9 | Backoff: 3min, 6min, 12min, 24min, 30min (capped) |

### Existing Tests (MUST NOT BREAK)

All 33 assertions in `key-pool.test.ts`:
- Test 1: 401/403 does NOT trip circuit (7 assertions)
- Test 2: 429 does NOT trip circuit (4 assertions)
- Test 3: 5xx DOES trip circuit (3 assertions)
- Test 4: Half-open single test (2 assertions — weak, needs strengthening)
- Test 5: Retry-After header (4 assertions)
- Test 6: key.healthy sync (6 assertions)
- Test 7: Auto-categorization (3 assertions)
- Test 8: Mixed errors (4 assertions)

---

## 14. CHANGELOG Audit

### Issues Found

| Issue | Severity | Fix |
|-------|----------|-----|
| All dates use **2025** instead of **2026** | ⚠️ HIGH | Change `2025-07-01` → `2026-06-30`, `2025-07-05` → `2026-07-01` |
| d552681 not mentioned | ⚠️ HIGH | Add `## [0.6.2] - 2026-07-06` entry |
| Commits f639865, e652be1 missing | ⚠️ MEDIUM | Include in v0.6.1 or as separate entries |
| Version numbers inconsistent | ✅ OK | v0.6.0 → v0.6.1 is correct semver |
| Format (Keep a Changelog) | ✅ OK | Follows standard |
| `[Unreleased]` section present | ✅ OK | Has planned features |

### Corrected Dates

| Version | CHANGELOG Says | Git Commit Date | Corrected |
|---------|---------------|-----------------|-----------|
| v0.6.0 | 2025-07-01 | 2026-06-30 | 2026-06-30 |
| v0.6.1 | 2025-07-05 | 2026-07-01 | 2026-07-01 |
| v0.6.2 | — | 2026-07-06 | Add entry |

### Recommended CHANGELOG Update

```markdown
## [0.6.2] - 2026-07-06

### Fixed
- Key pool: failure counter separated by error category (key_invalid, rate_limit, server_error)
- Circuit breaker: 401/403 no longer trip provider circuit (key-specific only)
- Circuit breaker: 429 no longer trips provider circuit (rate limit ≠ provider down)
- Half-open state: only 1 probe request allowed through concurrency gate
- Retry-After header respected for 429 key cooldown
- key.healthy now always consistent with status !== 'healthy'
- Engine loops all keys in pool before tier fallback
- Logger error paths now sanitized

### Added
- Exponential backoff for circuit breaker (3min base, 30min cap)
- ErrorCategory type for explicit failure classification
- circuitHalfOpenTestInFlight field for half-open concurrency control
- 33 key-pool test assertions (8 test functions)
- CHANGELOG.md

## [0.6.1] - 2026-07-01

### Fixed
- Dashboard JavaScript syntax errors (TypeScript annotations in inline scripts)
- Template literal escaping for provLogo() onerror attribute
- Test count inconsistency (41 → 43)
- Security headers in nginx (HSTS, X-Content-Type-Options, X-Frame-Options, CSP, Referrer-Policy)
- X-Powered-By header now hidden
- Banner placeholder {PORT} now correctly replaced
- Stale provider URLs removed

### Added
- Systemd service for 8Router (8router.service)
- Prominent security warning for public deployments
- Demo Data label on landing page dashboard preview
- Changelog (this file)
- License disclosure (MIT)

### Changed
- Headline now highlights: Circuit Breaker, Key Pool Health, Latency Benchmark
- "Soon" providers are visually faded (opacity 0.5)
- Beta features now have descriptive tooltip

## [0.6.0] - 2026-06-30

### Added
- Initial release
- 12 provider support (Active: OpenAI, Anthropic, Gemini, Groq, OpenRouter, Mistral)
- Beta providers: DeepSeek, Together AI
- Local providers: Ollama, LM Studio, vLLM
- Circuit breaker pattern
- Key pool health monitoring
- Latency benchmarking (p50/p95/p99)
- 3-tier fallback (Premium → Efficient → Local)
- Dashboard with usage analytics
- i18n support (EN, ID, JA)
```

---

## Appendix A: Source File Line Counts

| File | Lines | Purpose |
|------|-------|---------|
| `src/providers/key-pool.ts` | 408 | Core key pool + circuit breaker |
| `src/router/engine.ts` | ~550 | Routing engine + key loop |
| `src/providers/format-bridge.ts` | 349 | Format translation |
| `src/providers/catalog.ts` | 353 | Provider catalog |
| `src/providers/streaming-fallback.ts` | 205 | Streaming fallback |
| `src/providers/registry.ts` | 171 | Provider registry |
| `src/providers/adapter.ts` | 165 | Provider adapters |
| `src/providers/latency-tracker.ts` | 128 | Latency tracking |
| `src/providers/model-capabilities.ts` | 117 | Model capabilities |
| `src/router/combos.ts` | 97 | Combo resolution |
| `src/providers/smart-picker.ts` | 69 | Smart model picker |
| `src/types.ts` | 161 | Core type definitions |
| `src/__tests__/key-pool.test.ts` | ~300 | Key pool tests |
| `src/__tests__/run.ts` | ~120 | Test runner |
| `CHANGELOG.md` | 52 | Version history |
| `src/dashboard/dashboard.ts` | 2549 | Dashboard SPA |
| `src/logger/request-logger.ts` | ~230 | Request logging |
| `src/api/server.ts` | ~300 | Express API |

---

## Appendix B: Key Constants

```ts
// key-pool.ts
HEALTHY_COOLDOWN = 60_000              // 60 seconds
MAX_ERRORS_BEFORE_DISABLE = 3          // 3 errors per key
CIRCUIT_THRESHOLD = 5                  // 5 failures to open circuit
CIRCUIT_OPEN_MS = 3 * 60_000           // 3 minutes base
DEFAULT_429_COOLDOWN = 30_000          // 30 seconds default for 429
COOLDOWN_CAP = 30 * 60_000            // 30 minutes max

// engine.ts
PROVIDER_TIMEOUT = 120_000             // 2 minutes per provider call
```

---

*This document is the single source of truth for 8Router architecture adaptation. Do not begin Phase 1 coding until this audit is approved.*
