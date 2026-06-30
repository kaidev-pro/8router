# 8Router

**AI Routing Gateway v0.4.1** — 8Agents Ecosystem

## What is 8Router?

- 🚀 **OpenAI-compatible API gateway** — drop-in replacement for any OpenAI SDK client
- 🔄 **Multi-provider routing with automatic fallback** — 3-tier failover, circuit breaker, quota tracking
- 🌐 **12+ providers, 131 keys** — Groq, Mistral, OpenRouter, Ollama, Anthropic, and more
- 📊 **Dashboard, TUI CLI, admin endpoints** — full visibility into routing, costs, and health
- 💰 **Token Saver** — 20-65% cost reduction via smart routing
- 🎯 **9 Service Kinds** — Coding, Creative, Privacy, Fast, Smart, etc.
- 🛡️ **Guardrails** — Content filtering, rate limiting, error sanitization

## Quick Start

```bash
# Install globally
npm install -g 8router

# Start the server
8router

# Or run directly without installing
npx 8router

# Or with custom config
8router --config ./my-config.yaml
```

## Endpoints

| Endpoint | Description |
|----------|-------------|
| `http://localhost:8080/v1` | OpenAI-compatible API |
| `http://localhost:8080/8router` | Landing page |
| `http://localhost:8080/8router/dashboard` | Dashboard |
| `http://localhost:8080/8router/setup` | Setup guide |
| `http://localhost:8080/admin/*` | Admin endpoints (local-only) |

## Example curl

```bash
curl http://localhost:8080/v1/chat/completions \
  -H 'Content-Type: application/json' \
  -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"Hello"}]}'
```

## Setup Guides

### Cursor

1. Open Settings → Models → OpenAI API
2. Set **Base URL** to `http://localhost:8080/v1`
3. Set **API Key** to `sk-8router`

### Claude Code

```bash
ANTHROPIC_BASE_URL=http://localhost:8080 claude
```

### Codex CLI

```bash
OPENAI_BASE_URL=http://localhost:8080/v1 codex
```

### Open WebUI

1. Go to **Settings > Connections > OpenAI API**
2. Set **URL** to `http://localhost:8080/v1`
3. Set **API Key** to `sk-8router`

### Hermes Agent

Works out of the box — 8Router is the default routing layer.

## Model Aliases

| Alias | Description |
|-------|-------------|
| `8router/auto` | Best available (subscription > cheap > free) |
| `8router/cheap` | Cheapest available |
| `8router/fast` | Fastest response |
| `8router/smart` | Smartest model |
| `8router/coding` | Best for coding |
| `8router/local` | Local providers only |

## Commands

| Command | Description |
|---------|-------------|
| `8router` | Start server |
| `8router --tui` | Terminal UI dashboard |
| `8router --doctor` | Health check |
| `8router --export-config` | Export config |
| `8router --backup` | Full backup |
| `npm run test:router` | Run tests |
| `npm run test:openai-compat` | OpenAI compatibility tests |

## Admin Endpoints (Local-only)

All admin endpoints are restricted to `127.0.0.1`.

| Endpoint | Description |
|----------|-------------|
| `GET /admin/health` | Circuit breaker + provider health |
| `GET /admin/providers` | Provider details |
| `GET /admin/keys` | Key pool health |
| `GET /admin/quota` | Quota summary |
| `GET /admin/logs` | Recent logs |
| `GET /admin/stats` | Error rates, latency |
| `GET /admin/version` | Version info |

## Configuration

Create `8router.yaml` in your project root:

```yaml
providers:
  - id: groq
    apiKey: your-groq-key
    models: ["llama-3.1-70b-versatile"]

  - id: mistral
    apiKey: your-mistral-key
    models: ["mistral-large-latest"]

routing:
  strategy: fallback
  timeout: 30000
```

## Security

- **Dashboard** — local-only (`127.0.0.1`)
- **API key masking** — keys masked in all responses and exports
- **Circuit breaker** — failing providers automatically removed from rotation
- **Admin endpoints** — local-only, never exposed externally
- **Error sanitization** — internal errors stripped before client response

## Backup

```bash
8router --export-config  # Export config (keys masked)
8router --backup         # Full backup (config + logs + state)
```

## Troubleshooting

| Problem | Solution |
|---------|----------|
| Server not starting | Check port 8080 is not in use: `lsof -i :8080` |
| No providers available | Check API keys in `8router.yaml` config |
| Requests failing | Run `8router --doctor` for health check |
| High latency | Check `/admin/stats` for provider response times |
| Quota exhausted | Check `/admin/quota` for usage limits |

## License

MIT — 8Agents Ecosystem

## Current Limitations
- Streaming responses may not include full _8router metadata in every chunk
- Dashboard auth warning only shows for non-localhost access
- Model alias resolution depends on provider availability

## Planned Fixes
- Full streaming metadata in final chunk
- Configurable auth tokens for remote dashboard access
- ~~More provider integrations~~ ✅ Done in v0.5.0

## Security Notes
- Dashboard is local-only by default
- Admin endpoints require localhost access
- API keys are masked in all responses
- Set AUTH_REQUIRED=true for public deployments
- Use --backup regularly to save config

## Changelog

### v0.5.0 (2026-06-30) — Real Provider Expansion
- Model capability map (26 models, vision/tools/streaming/embeddings support)
- Cost table per model for smart cost routing
- Latency benchmark tracking (p50/p95/p99)
- Smart model picker endpoint (GET /8router/pick-model)
- Streaming fallback handler (retry mid-stream, partial recovery)
- Tool calling compatibility tracking per model
- Embeddings endpoint (POST /v1/embeddings)
- New adapters: Perplexity, Cerebras, SambaNova, Gemini
- New files: model-capabilities.ts, latency-tracker.ts, smart-picker.ts, streaming-fallback.ts

### v0.4.1 (2026-06-30)
- Added public access warning in dashboard and setup guide
- Improved streaming metadata consistency (fallback path, route mode)
- Improved local alias error handling (no cloud fallback)
- Added security notice to setup guide
- Updated doctor with public access check
- Updated README with known limitations and planned fixes

### v0.4.0 (2026-06-30)
- Production hardening: circuit breaker, key health tracking, quota tracker
- Secret masking in all responses
- Admin endpoints (local-only)
- Model aliases (8router/auto, cheap, fast, smart, coding, local)
- Dashboard consolidated on port 8080
- Setup guide for 7 AI tools
- Doctor command
- 18-test suite + OpenAI compatibility tests
