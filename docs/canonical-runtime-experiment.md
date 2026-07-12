# Canonical Runtime Experiment (Phase 2H)

## Purpose

Introduces the canonical bridge into runtime through a controlled, observable experiment. Converts eligible requests into canonical form, compares structures, and collects safe metrics — all without changing user responses until explicitly opted in.

## Default Behavior

**`canonical.enabled` = false.** `CANONICAL_RUNTIME_MODE` defaults to `off`. Production traffic uses the legacy runtime path exclusively.

## Runtime Modes

| Mode | Description |
|------|-------------|
| `off` (default) | Canonical runtime disabled. Legacy only. |
| `shadow` | Parallel canonical conversion + comparison. Never changes user response. |
| `canary` | Limited % of requests routed through canonical path. Auto-fallback to legacy. |
| `enforced` | Reserved for future. Blocked in Phase 2H. |

## Shadow Flow

```
1. Authenticate access key
2. Parse request using legacy runtime
3. Execute provider request normally
4. Send legacy response to user
5. Independently normalize request → canonical → normalize → compare
6. If response comparison enabled: normalize response → compare
7. Record safe comparison metrics (hashes, lengths, counts)
8. Return legacy response unchanged
```

**Shadow mode makes no additional provider request.** Shadow conversion runs after the user response is sent.

## Canary Flow

```
1. Authenticate access key
2. Check deterministic canary sampling eligibility
3. If not selected: legacy path
4. If selected:
   a. Convert request through canonical bridge
   b. Execute provider request using canonical-translated request
   c. Translate provider response back
   d. Validate response shape
5. On any canonical failure: fall back to legacy path
6. Record canary success/failure/fallback metrics
7. Return one user response only
```

**Canary mode must not be enabled automatically.** Requires explicit opt-in configuration.

## Deterministic Sampling

Uses `SHA-256(requestId + userId + accessKeyId)` mapped to a stable percentage bucket. Same inputs always produce the same result. No randomness required.

## Eligibility Rules

Initially eligible: `POST /v1/chat/completions` only.

Requirements:
- valid access key
- supported endpoint
- request within safe bounds
- implemented bridge format
- no unsupported multimodal structure

## Safe Normalization

Normalizes only non-semantic differences:
- missing vs empty arrays
- null vs omitted fields
- generated IDs (semantically irrelevant)
- object key order
- finish reason aliases (`end_turn` → `stop`, `tool_use` → `tool_calls`)

**Never normalizes away:** role, message ordering, content, tool names, IDs, model identity, text content, token counts, stream event order.

## SHA-256 Fingerprints

All content comparison uses one-way SHA-256 hashes:
- `contentHash`: hash of message content
- `contentLength`: original content length
- `textHash`: hash of text deltas
- `argumentsHash`: hash of tool call arguments

**No plaintext content is stored in experiment logs or metrics.**

## Mismatch Taxonomy

| Kind | Description |
|------|-------------|
| `request_role` | Message role differs |
| `request_content_count` | Message array length differs |
| `request_tool_definition` | Tool count differs |
| `request_tool_choice` | Tool choice differs |
| `request_model` | Model differs |
| `request_generation_config` | Temperature/top_p/max_tokens differs |
| `response_role` | Response role differs |
| `response_text_length` | Content length differs |
| `response_text_hash` | Content hash differs (may be same length) |
| `response_finish_reason` | Finish reason differs |
| `response_tool_call_count` | Tool call count differs |
| `response_tool_call_name` | Tool call function name differs |
| `response_tool_call_id` | Tool call ID differs |
| `response_tool_call_arguments_shape` | Arguments shape differs |
| `response_usage` | Token counts differ |
| `stream_event_order` | Stream event sequence differs |
| `stream_delta_type` | Stream delta type differs |
| `stream_finish_reason` | Stream finish reason differs |
| `unsupported_extension` | Unsupported extension field |
| `conversion_error` | Conversion failed |
| `unknown` | Unclassified mismatch |

### Severity Levels

- **info**: Metadata differences, usage comparison when disabled
- **warning**: Length/hash mismatches, tool call shape differences
- **critical**: Role, finish reason, tool name/ID, stream order, conversion error

Critical mismatches trigger immediate rollback recommendation.

## Auto-Disable / Kill Switch

Automatically disables canary when:
- Mismatch rate exceeds threshold after minimum sample count
- Canonical failure rate exceeds threshold
- Response validation failures occur
- Latency overhead exceeds ceiling

```
POST /8router/api/canonical-experiment/disable
POST /8router/api/canonical-experiment/enable
```

## API Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/8router/api/canonical-experiment/status` | GET | Current config, state, metrics |
| `/8router/api/canonical-experiment/settings` | PATCH | Update mode, sample rate, threshold |
| `/8router/api/canonical-experiment/enable` | POST | Enable experiment (non-enforced) |
| `/8router/api/canonical-experiment/disable` | POST | Disable experiment |
| `/8router/api/canonical-experiment/metrics` | GET | Aggregate metrics + top mismatches |
| `/8router/api/canonical-experiment/logs` | GET | Paginated safe logs |

All endpoints dashboard-auth protected. No raw content returned.

## Dashboard Controls

- Mode selector (Off / Shadow / Canary)
- Enable / Disable buttons
- Status card (mode, enabled, auto-disabled, observed)
- Metrics card (match rate, mismatch rate, failure rate, fallbacks)
- Warning text explaining each mode

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `CANONICAL_RUNTIME_MODE` | `off` | Active mode |
| `CANONICAL_SHADOW_SAMPLE_RATE` | `0` | Shadow sampling rate (0-1) |
| `CANONICAL_CANARY_PERCENT` | `0` | Canary traffic percentage (0-100) |
| `CANONICAL_MISMATCH_THRESHOLD` | `0.01` | Auto-disable on mismatch rate |
| `CANONICAL_AUTO_DISABLE` | `true` | Enable auto-disable |
| `CANONICAL_COMPARE_STREAMING` | `true` | Compare stream events |
| `CANONICAL_COMPARE_TOOL_CALLS` | `true` | Compare tool calls |
| `CANONICAL_COMPARE_USAGE` | `true` | Compare token usage |
| `CANONICAL_COMPARE_METADATA` | `false` | Compare provider metadata |
| `CANONICAL_EXPERIMENT_USER_ALLOWLIST` | (empty) | Users always sampled |
| `CANONICAL_EXPERIMENT_ACCESS_KEY_ALLOWLIST` | (empty) | Keys always sampled |
| `CANONICAL_MIN_SAMPLES_BEFORE_AUTO_DISABLE` | `50` | Min samples before auto-disable |
| `CANONICAL_FAILURE_THRESHOLD` | `0.02` | Canonical failure rate threshold |
| `CANONICAL_MAX_OVERHEAD_MS` | `100` | Max latency overhead |

## Rollout Sequence

```
1. off (default)
2. shadow at 1%
3. shadow at 5%
4. shadow at 25%
5. shadow at 100%
6. canary at 0.1%
7. canary at 1%
8. canary at 5%
```

Advance only if: mismatch rate below threshold, no critical mismatch, acceptable overhead, no user regressions.

Any critical mismatch → immediate rollback to off.

## Rollback

Change `CANONICAL_RUNTIME_MODE=off` and restart. One variable, instant rollback.

## Security & Privacy

- ✅ `canonical.enabled` remains false by default
- ✅ Shadow mode makes no duplicate provider calls
- ✅ Canary safely falls back to legacy
- ✅ No request/response content is stored
- ✅ No raw API keys or provider credentials exposed
- ✅ Fingerprints use one-way SHA-256 hashing
- ✅ User-owned provider key isolation maintained
- ✅ Circuit breaker, health, Token Saver, usage logging all preserved
- ✅ Experiment APIs dashboard-auth protected
- ✅ No managed credits or token resale added

## Known Limitations

- Phase 2H: `enforced` mode is blocked
- Streaming comparison is structural only (event types, lengths, hashes)
- Only `chat/completions` is eligible initially
- Metadata comparison is disabled by default
