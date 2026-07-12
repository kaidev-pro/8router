# CLI Tool Integrations — Setup Guide

## Overview

8Router connects to your coding tools, AI clients, and custom applications through a single OpenAI-compatible endpoint.

## Endpoints

| Environment | Base URL |
|-------------|----------|
| **Hosted** | `https://8router.8agents.xyz/v1` |
| **Local** | `http://localhost:8081/v1` |

Alias endpoint: `https://8router.8agents.xyz/8router/v1`

## Authentication

All requests require an 8Router access key as a Bearer token:

```
Authorization: Bearer sk-8router_***
```

**Important:** Your raw access key is shown only once at creation. It cannot be recovered. If lost, rotate your key from the dashboard.

## Recommended Model

```
8router/auto
```

## Smart Aliases

### General
- `8router/auto` — Best overall choice, routes to the best available model
- `8router/smart` — High-quality model for complex tasks
- `8router/fast` — Lower latency for quick tasks
- `8router/cheap` — Cost-efficient for simple requests

### Specialized
- `8router/coding` — Optimized for code generation and review
- `8router/creative` — Best for creative writing and brainstorming

### Local & Privacy
- `8router/local` — Routes through local models only
- `8router/privacy` — Privacy-focused routing

---

## Supported Tools

### Cursor (Supported)

1. Open Cursor Settings (Ctrl+, or Cmd+,)
2. Navigate to Models > OpenAI API Key
3. Click "Add Model" or edit existing provider
4. Set Base URL: `https://8router.8agents.xyz/v1`
5. Set API Key: Your 8Router access key
6. Set Model: `8router/coding`
7. Save and restart Cursor

### Cline (Supported)

1. Open VS Code with Cline extension
2. Click the Cline icon in the sidebar
3. Open Cline Settings (gear icon)
4. Set API Provider: OpenAI Compatible
5. Set Base URL: `https://8router.8agents.xyz/v1`
6. Set API Key: Your 8Router access key
7. Set Model ID: `8router/coding`

### Continue (Supported)

Place in `.continue/config.json` or `~/.continue/config.json`:

```json
{
  "models": [{
    "title": "8Router — 8router/auto",
    "provider": "openai",
    "model": "8router/auto",
    "apiBase": "https://8router.8agents.xyz/v1",
    "apiKey": "YOUR_ACCESS_KEY"
  }]
}
```

Restart Continue after changing config.

### Roo Code (Supported)

1. Open VS Code with Roo Code extension
2. Open Roo Code settings
3. Select provider: OpenAI Compatible
4. Set Base URL: `https://8router.8agents.xyz/v1`
5. Set API Key: Your 8Router access key
6. Set Model: `8router/coding`

### Open WebUI (Supported)

1. Open Open WebUI admin panel
2. Go to Settings > Connections > OpenAI
3. Set API Base URL: `https://8router.8agents.xyz/v1`
4. Set API Key: Your 8Router access key
5. Click "Save"
6. Models should refresh — select `8router/auto`

> **Docker Note:** If running Open WebUI in Docker, `localhost` inside the container refers to the container itself. Use `host.docker.internal:8081` or your server's LAN IP instead.

### Claude Code (Experimental)

OpenAI-compatible support is partial. Set environment variables:

```env
OPENAI_BASE_URL=https://8router.8agents.xyz/v1
OPENAI_API_KEY=your_access_key
```

> Claude Code may not fully support all OpenAI-compatible features.

### Codex CLI (Experimental)

```env
OPENAI_BASE_URL=https://8router.8agents.xyz/v1
OPENAI_API_KEY=your_access_key
```

### Aider (Experimental)

```bash
OPENAI_API_BASE=https://8router.8agents.xyz/v1 \
OPENAI_API_KEY=your_access_key \
aider --model openai/8router/auto
```

---

## SDK Examples

### Node.js (openai package)

```javascript
import OpenAI from 'openai';

const client = new OpenAI({
  baseURL: 'https://8router.8agents.xyz/v1',
  apiKey: 'sk-8router_***,
});

const response = await client.chat.completions.create({
  model: '8router/auto',
  messages: [{ role: 'user', content: 'Hello from 8Router' }],
});

console.log(response.choices[0].message.content);
```

### Python (openai package)

```python
from openai import OpenAI

client = OpenAI(
    base_url='https://8router.8agents.xyz/v1',
    api_key='sk-8router_***,
)

response = client.chat.completions.create(
    model='8router/auto',
    messages=[{'role': 'user', 'content': 'Hello from 8Router'}],
)

print(response.choices[0].message.content)
```

### cURL

```bash
curl https://8router.8agents.xyz/v1/chat/completions \
  -H "Authorization: Bearer $EIGHTROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "8router/auto",
    "messages": [
      {"role": "user", "content": "Hello from 8Router"}
    ]
  }'
```

### Environment File

```env
EIGHTROUTER_BASE_URL=https://8router.8agents.xyz/v1
EIGHTROUTER_API_KEY=sk-8router_REPLACE_ME
EIGHTROUTER_MODEL=8router/auto
```

---

## Compatibility Matrix

| Tool | Custom Base URL | Model Alias | Streaming | Tool Calling | Status |
|------|:-:|:-:|:-:|:-:|---|
| Cursor | Verified | Yes | Verified | Verified | Supported |
| Cline | Verified | Yes | Verified | Verified | Supported |
| Continue | Verified | Yes | Verified | Verified | Supported |
| Roo Code | Verified | Yes | Verified | Verified | Supported |
| Open WebUI | Verified | Yes | Verified | Partial | Supported |
| Claude Code | Verified | Limited | Yes | Partial | Experimental |
| Codex CLI | Verified | Yes | Yes | Yes | Experimental |
| Aider | Verified | Yes | Yes | No | Experimental |
| LibreChat | — | — | — | — | Coming Soon |
| LobeChat | — | — | — | — | Coming Soon |
| Zed | — | — | — | — | Coming Soon |

---

## Test Connection

From the dashboard CLI Tools page:

1. Select your environment (Hosted/Local/Custom)
2. Enter your access key
3. Select a model
4. Click "Test Connection"

Test stages:
1. Endpoint reachable
2. Access key valid
3. Models endpoint available
4. Selected model available

---

## Troubleshooting

### Invalid API Key
- Confirm key starts with `sk-8router_`
- Raw key is only shown at creation/rotation
- Rotate key if raw value was lost
- Check enabled/revoked status in dashboard

### Endpoint Not Reachable
- Verify hosted/local URL
- Verify port (8081 for local)
- Verify firewall/reverse proxy
- Verify HTTPS for hosted
- Avoid duplicate `/v1`

### Model Not Found
- Call `/v1/models` to list available models
- Use `8router/auto` for automatic routing
- Connect and enable provider credentials
- Check provider health in dashboard

### All Providers Failed
- Check Providers page in dashboard
- Test each credential
- Inspect circuit state
- Check Fallback Logs
- Wait for cooldown if circuit is open

### Docker Localhost
- `localhost` inside a container = the container itself
- Use `host.docker.internal:8081` or host LAN IP
- For hosted 8Router, Docker networking is not an issue

### Streaming Problems
- Verify tool supports SSE
- Verify proxy buffering is disabled
- Verify reverse proxy timeout is sufficient

### Token Saver
- Default mode is off
- Configure in Settings > Token Saver
- Only tool output (role=tool) is eligible for compression

---

## Security

- Use an 8Router access key in your tools — never paste provider API keys directly
- Provider credentials remain encrypted inside 8Router
- Access keys can be revoked at any time
- Raw access keys cannot be recovered
- Rotate immediately if exposed
- Add `.env` to `.gitignore` — never commit API keys
- Do not paste keys into screenshots or support tickets

---

## Limitations

- `canonical.enabled` remains `false` — standard OpenAI-compatible format only
- No managed credits or token resale — BYOK model only
- Token Saver compresses only tool output, never user/system/developer messages
- Tool-call arguments and schemas are never compressed
- Some tools marked "Experimental" may not support all OpenAI-compatible features
