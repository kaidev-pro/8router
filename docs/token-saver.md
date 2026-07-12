# Token Saver / Safe Compression

## Overview

Token Saver compresses repetitive, machine-generated tool output (terminal logs, test results, stack traces, build output, lint output, git diffs, directory trees, grep results) before forwarding to AI providers. This reduces token usage and costs without losing critical information.

**Key principles:**
- Deterministic, local, auditable — no LLM, no external APIs
- Fail-open: compression errors never block inference
- Never compresses system prompts, user messages, tool-call arguments, schemas, or structured JSON
- Compression metrics logged; original/compressed content is never persisted
- `canonical.enabled` remains `false` — no impact on routing

## Supported Modes

| Mode | Description |
|------|-------------|
| **off** | No compression (default) |
| **safe** | Remove exact duplicate lines, collapse repeated warnings with counts, trim progress noise |
| **balanced** | Safe + condense passing test lists, repeated stack frames, deep directory trees, grep results, git diffs |
| **aggressive** | Balanced + stronger heuristic condensation. May omit more non-critical output |

## Supported Content Kinds

| Kind | Examples |
|------|----------|
| `terminal_log` | npm install output, build logs, compilation output |
| `stack_trace` | Node.js, Python, Java stack traces with frames and error types |
| `test_output` | Jest, Vitest, Mocha, Pytest, Go test, cargo test results |
| `lint_output` | ESLint, Pylint, TSLint warnings/errors with file:line:col |
| `directory_tree` | `tree` command output, deeply nested file listings |
| `grep_output` | ripgrep, grep results with file paths and match lines |
| `git_diff` | Unified diff output with file headers and hunks |
| `progress_noise` | Download/install progress lines with percentages |
| `duplicate_lines` | Adjacent identical lines repeated many times |
| `repeated_warnings` | Repeated warning/error patterns with different parameters |
| `unknown` | Ambiguous content — **never compressed** (fail-open) |

## Protected Content (Never Compressed)

- **System messages** (`role: system`)
- **Developer messages** (`role: developer`)
- **User messages** (`role: user`)
- **Assistant messages** (unless explicitly machine-generated tool output)
- **Tool-call arguments** and **schemas**
- **Structured JSON** content
- **Source code** blocks (unless using the safe git-diff strategy)
- **Unknown** or ambiguous content

## Omission Markers

When content is compressed, transparent markers are inserted:

- `[N passing tests omitted]` — removed passing test lines
- `[N similar lines omitted]` — grouped repetitive adjacent lines
- `[N progress updates omitted]` — removed progress/download noise
- `[N duplicate lines omitted]` — removed exact adjacent duplicates
- `[N stack frames omitted]` — removed middle stack frames
- `[N warnings omitted]` — collapsed repeated warnings with counts
- `[N matches omitted]` — grep results grouped by file
- `[N lines omitted]` — general omission marker

When `TOKEN_SAVER_INCLUDE_MARKER=true` (default), a footer marker is appended:
```
[8Router Token Saver: <mode> mode, estimated <N>% reduction]
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TOKEN_SAVER_MODE` | `off` | Global compression mode: `off`, `safe`, `balanced`, `aggressive` |
| `TOKEN_SAVER_MIN_CHARS` | `4000` | Minimum content length (characters) to attempt compression |
| `TOKEN_SAVER_MIN_ESTIMATED_TOKENS` | `1000` | Minimum estimated tokens to attempt compression |
| `TOKEN_SAVER_MAX_INPUT_CHARS` | `500000` | Maximum input size; content exceeding this is never compressed |
| `TOKEN_SAVER_TIMEOUT_MS` | `100` | Compression timeout; exceeded = content returned unchanged |
| `TOKEN_SAVER_INCLUDE_MARKER` | `true` | Whether to append the footer marker |

## API Endpoints

### GET /8router/api/settings/token-saver
Returns current Token Saver configuration:
```json
{
  "mode": "safe",
  "minChars": 4000,
  "minEstimatedTokens": 1000,
  "maxInputChars": 500000,
  "timeoutMs": 100,
  "includeMarker": true
}
```

### PATCH /8router/api/settings/token-saver
Update compression mode:
```json
{ "mode": "balanced" }
```
Response: `{ "ok": true, "mode": "balanced" }`

### POST /8router/api/token-saver/preview
Dry-run compression preview. Returns metrics only — never persists content.
```json
{ "content": "..." }
```
Response: `{ "applied": true, "mode": "safe", "percentSaved": 85, ... }`

## Dashboard

Navigate to **Settings → Token Saver**. Select a compression mode from the dropdown and click Save. The dashboard shows:
- Current effective mode
- Compression statistics (tokens saved, percent saved, cost saved estimate)
- Before/after token counts

## Runtime Integration

Compression is applied automatically in the `/v1/chat/completions` handler when `role: tool` content meets the minimum size threshold. The `X-8Router-Token-Saver` header can override the mode per-request.

**Flow:**
1. Auth → Validate request
2. Compression: scan `role: tool` messages, classify content, apply compression
3. Route to provider with compressed messages
4. Log compression metrics alongside request/usage metrics

## Observability

Compression metrics are stored in `runtime_request_logs`:
- `compressionMode` — mode used
- `compressionApplied` — whether any compression occurred
- `compressedBlockCount` — number of tool messages compressed
- `estimatedTokensBeforeCompression`
- `estimatedTokensAfterCompression`
- `estimatedTokensSaved`
- `compressionPercentSaved`
- `compressionLatencyMs`
- `compressionStrategies` — JSON array of strategies applied

**Never stored:** original content, compressed content, prompt bodies, tool output bodies.

## Safety Guarantees

1. **Fail-open**: any compression error returns original content unchanged
2. **No content persistence**: logs store metrics only, never content
3. **No external calls**: no LLM, no APIs, no network requests
4. **Deterministic**: same input always produces same output
5. **Timeout-bounded**: max 100ms default; exceeded = skip compression
6. **Default off**: `TOKEN_SAVER_MODE=off` unless explicitly enabled
7. **No secret leakage**: API keys, tokens, auth headers never appear in logs/errors

## Limitations

- Token estimation is `ceil(chars / 4)` — approximate, not provider-accurate
- Only `role: tool` messages are eligible in the runtime path
- Source code is protected unless explicitly using the git-diff strategy
- Compression does not apply to streaming chunk bodies (only pre-forward)
- Aggressive mode may remove non-critical context that could be relevant

## Examples

### Safe mode — terminal log
**Input (150 lines):**
```
$ npm install
Installing package 0 of 150... [0%] Downloading from registry.npmjs.org
Installing package 1 of 150... [1%] Downloading from registry.npmjs.org
...
Installing package 149 of 150... [100%] Downloading from registry.npmjs.org
Done. All 150 packages installed successfully in 12.3s
```

**Output:**
```
$ npm install
Installing package 149 of 150... [100%] Downloading from registry.npmjs.org
[149 progress updates omitted]
Done. All 150 packages installed successfully in 12.3s
[8Router Token Saver: safe mode, estimated 98% reduction]
```

### Balanced mode — test output
**Input (85 lines):**
```
  MyComponent
    ✓ renders correctly (12ms)
    ✓ handles click events (8ms)
    ... (80 passing)
    ✗ breaks on null input (5ms)
  80 passing, 1 failing
```

**Output:**
```
  MyComponent
[80 passing tests omitted]
    ✗ breaks on null input (5ms)
  80 passing, 1 failing
[8Router Token Saver: balanced mode, estimated 92% reduction]
```
