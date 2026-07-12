# 8Router Beta Onboarding — Phase 3A

## What is 8Router?

8Router is an AI routing gateway that provides:
- Unified API endpoint for multiple AI providers
- Smart model routing and aliasing
- Automatic fallback when providers fail
- Token optimization (Token Saver)
- Usage tracking and logging
- Provider health monitoring

**Beta Purpose**: Testing the canonical runtime conversion layer in production shadow mode.

---

## Beta Endpoint

**Base URL**: `https://8router.8agents.xyz/v1`

**Compatibility**: OpenAI API compatible

---

## Getting Started

### Step 1: Get Your Access Key

Your access key will be provided by the 8Router administrator.

Format: `sk-8router_<publicPrefix>_<secret>`

**Important**: This key is shown only once. Store it securely.

### Step 2: Configure Your Client

#### Cursor / VS Code / IDE

1. Open settings
2. Find AI/LLM settings
3. Set endpoint: `https://8router.8agents.xyz/v1`
4. Set API key: `sk-8router_*`
5. Set model: `8router/auto`

#### Claude Code / Codex CLI

```bash
export ANTHROPIC_BASE_URL=https://8router.8agents.xyz/v1
export ANTHROPIC_API_KEY=sk-8router_*
```

#### curl

```bash
curl https://8router.8agents.xyz/v1/chat/completions \
  -H "Authorization: Bearer sk-8router_*" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "8router/auto",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

#### Python (openai library)

```python
from openai import OpenAI

client = OpenAI(
    base_url="https://8router.8agents.xyz/v1",
    api_key="sk-8router_*"
)

response = client.chat.completions.create(
    model="8router/auto",
    messages=[{"role": "user", "content": "Hello!"}]
)
```

---

## Model Aliases

Use these aliases instead of raw model names:

| Alias | Behavior |
|-------|----------|
| `8router/auto` | Smart routing — picks best available model |
| `8router/fast` | Prioritizes speed |
| `8router/cheap` | Prioritizes cost efficiency |
| `8router/smart` | Prioritizes model quality |
| `8router/coding` | Optimized for code tasks |
| `8router/local` | Routes to local providers if available |
| `8router/creative` | Optimized for creative tasks |
| `8router/privacy` | Privacy-focused routing |

---

## What to Test

### Basic Functionality
- [ ] Non-streaming chat completion
- [ ] Streaming chat completion
- [ ] Tool/function calling
- [ ] Multi-turn conversations
- [ ] System prompts

### Model Routing
- [ ] `8router/auto` alias works
- [ ] `8router/fast` alias works
- [ ] `8router/cheap` alias works
- [ ] `8router/coding` alias works

### Edge Cases
- [ ] Long context (>100K tokens)
- [ ] Large number of tools
- [ ] Concurrent requests
- [ ] Rate limiting behavior

---

## Privacy & Security

### What We Store
- Request metadata (model, tokens, latency)
- Provider attribution
- Access key attribution
- Timestamps

### What We Do NOT Store
- ❌ Prompt content
- ❌ Response content
- ❌ Tool call arguments
- ❌ Tool results
- ❌ File contents
- ❌ Provider credentials
- ❌ Your access key (hashed only)

### What's in Shadow Mode
Shadow mode compares the canonical runtime with the legacy runtime:
- Only fingerprints (SHA-256 hashes) are stored
- No content is stored
- No duplicate provider calls are made
- Your response comes from the legacy path only

---

## Known Limitations

### Beta Phase
- Shadow mode only (no canary/enforced)
- Limited to 1% sampling initially
- Some models may not be available yet
- Streaming comparisons not yet supported

### Provider Coverage
- Not all providers may be configured
- Some models may have rate limits
- Fallback may not cover all failure modes

---

## Troubleshooting

### "All providers failed"
- Check your access key is valid
- Check provider health in dashboard
- Try a different alias

### "Model not found"
- Use an alias like `8router/auto`
- Check `/v1/models` for available models

### "Rate limited"
- Your access key has limits
- Check `dailyRequestLimit` and `rateLimitPerMinute`

### "Connection refused"
- Verify base URL: `https://8router.8agents.xyz/v1`
- Check network/firewall

---

## Reporting Issues

Report issues with:
1. **Request ID** (from response headers or error)
2. **Timestamp** (when it happened)
3. **Client/Tool** (curl, Python, Cursor, etc.)
4. **Model/Alias** (what you requested)
5. **Error message** (what went wrong)

Do NOT include:
- ❌ Prompt content
- ❌ Response content
- ❌ Access key
- ❌ Provider credentials

---

## Revoking Your Key

Contact the 8Router administrator or use the dashboard to revoke your key immediately if:
- You suspect it's been compromised
- You no longer need access
- You're experiencing unexpected behavior

---

## Support

- **Issues**: Report via the designated channel
- **Questions**: Contact the 8Router team
- **Feedback**: We want to hear about your experience!

---

## Beta Terms

- This is a beta service — expect occasional issues
- Your data is handled according to our privacy policy
- We collect usage metrics for service improvement
- No prompt/response content is stored
- You can revoke access at any time
- Feedback helps us improve

Thank you for participating in the 8Router beta!
