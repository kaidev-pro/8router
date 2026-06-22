# ⚡ 8Router

**AI Routing Gateway — 8Agents Ecosystem**

Local AI routing proxy that sits between your coding tools and AI providers. Single OpenAI-compatible endpoint, smart 3-tier fallback, token compression.

## Features

| Feature | Description |
|---------|-------------|
| **Smart Fallback** | 3-tier cascade: subscription → cheap → free. Never stop coding |
| **RTK Token Compression** | Auto-compress tool output (git diff, grep, ls, tree). 20-40% token savings |
| **Caveman Mode** | Terse system prompt. Save up to 65% output tokens |
| **Multi-Provider** | 40+ providers via OpenAI-compatible API, Anthropic, Gemini |
| **Circuit Breaker** | Auto-disable failing providers, auto-recovery |
| **Multi-Account** | Round-robin rotation across accounts |
| **Dashboard** | Web UI for monitoring, stats, provider health |
| **OpenAI Compatible** | Works with Claude Code, Codex, Cursor, Cline, Copilot |

## Quick Start

```bash
# Install dependencies
npm install

# Run in dev mode
npm run dev

# Or run with tsx
npx tsx src/index.ts
```

## Configuration

8Router auto-detects API keys from environment:

```bash
export OPENAI_API_KEY=sk-...
export ANTHROPIC_API_KEY=sk-ant-...
export GOOGLE_API_KEY=AIza...
export OPENROUTER_API_KEY=sk-or-...
export GROQ_API_KEY=gsk_...
```

Or create `8router.yaml`:

```yaml
port: 8080
providers:
  - id: my-openai
    name: OpenAI
    apiKey: sk-...
    tier: subscription
    baseUrl: https://api.openai.com/v1
    models: [gpt-4o, gpt-4o-mini]
    enabled: true
```

## Usage with Tools

```bash
# Claude Code
ANTHROPIC_BASE_URL=http://localhost:8080 claude

# Codex
OPENAI_BASE_URL=http://localhost:8080/v1 codex

# Cursor
# Settings → API Base URL: http://localhost:8080/v1
```

## Endpoints

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/v1/chat/completions` | POST | Chat completions (OpenAI-compatible) |
| `/v1/models` | GET | List available models |
| `/health` | GET | Health check |
| `/8router/stats` | GET | Router statistics |
| `/8router/providers` | GET | Provider list |
| `/8router/health` | GET | Provider health |

## License

MIT — Part of the 8Agents Ecosystem
