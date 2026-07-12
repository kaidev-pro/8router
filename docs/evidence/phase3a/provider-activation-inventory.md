# Provider Activation Inventory — Phase 3A.4

## Status: READY FOR ACTIVATION

This document tracks provider activation status. Provider credentials are added through the dashboard or API — raw keys are never stored in this document.

---

## Supported Providers

| Provider | Status | Role | Notes |
|----------|--------|------|-------|
| OpenRouter | READY | Primary | Best multi-model coverage, OpenAI-compatible |
| Groq | READY | Fallback | Fast inference, free tier available |
| OpenAI | READY | Optional | Premium models, requires API key |
| Mistral | READY | Optional | European provider, good for EU data residency |
| DeepSeek | READY | Optional | Cost-effective, good code models |
| Anthropic | READY | Optional | Claude models, requires API key |
| Google Gemini | READY | Optional | Google models, requires API key |

## Activation Procedure

### Step 1: Add Provider Credentials

Through dashboard at `/8router/integrations` or via API:

```bash
curl -X POST https://8router.8agents.xyz/8router/api/providers \
  -H "Authorization: Bearer $ADMIN_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "provider": "openrouter",
    "displayName": "OpenRouter Primary",
    "apiKey": "sk-or-v1-...",
    "baseUrl": "https://openrouter.ai/api/v1"
  }'
```

### Step 2: Verify Encryption

After adding, verify:
- Raw key not returned in subsequent GET requests
- Credential appears with masked hint only
- Health test passes

### Step 3: Test Provider

```bash
curl -X POST https://8router.8agents.xyz/8router/api/providers/$CRED_ID/test
```

Expected: `{"ok": true, "latencyMs": <ms>}`

### Step 4: Add Fallback Provider

Repeat for second provider (e.g., Groq).

---

## Recommended Configuration

### Primary: OpenRouter
- Base URL: `https://openrouter.ai/api/v1`
- Models: All OpenRouter models
- Strengths: Multi-model, good fallback chain

### Fallback: Groq
- Base URL: `https://api.groq.com/openai/v1`
- Models: llama-3.3-70b, mixtral-8x7b
- Strengths: Fast inference, free tier

### Optional: OpenAI
- Base URL: `https://api.openai.com/v1`
- Models: gpt-4o, gpt-4o-mini
- Strengths: Premium quality

---

## Credential Security Checklist

- [ ] Credentials encrypted at rest (AES-256-GCM)
- [ ] Raw keys never returned after initial save
- [ ] Raw keys never logged
- [ ] Raw keys never exposed in API responses
- [ ] Health checks use encrypted credentials only
- [ ] Credential rotation supported
- [ ] Credential disable works
- [ ] Credential deletion works
- [ ] No plaintext keys in database
- [ ] No plaintext keys in memory after init

---

## Provider Health Monitoring

After activation, monitor:

| Metric | Healthy | Warning | Critical |
|--------|---------|---------|----------|
| Circuit state | closed | half-open | open |
| Consecutive failures | 0 | 1-2 | ≥3 |
| Last success | <5min | <1hr | >1hr |
| Error rate | <1% | 1-5% | >5% |

---

## Fallback Configuration

### Primary Route
```
Provider: OpenRouter
Model: openrouter/auto (alias)
Fallback: Groq
```

### Fallback Route
```
Provider: Groq
Model: groq/llama-3.3-70b-versatile (alias)
Fallback: None (last resort)
```

---

## Required Before Traffic

1. At least 1 provider credential added and healthy
2. At least 1 access key created
3. `/v1/models` returns usable models
4. Non-streaming chat works
5. Streaming chat works
6. Tool calls work

---

## Evidence Requirements

| Gate | Required | Status |
|------|----------|--------|
| Providers activated | ≥ 2 | 0 |
| Provider health | ≥ 1 healthy | Pending |
| Access keys | ≥ 1 | 1 (internal-smoke) |
| Models available | > 0 | Pending |
| Traffic routed | > 0 | 0 |
| Shadow comparisons | > 0 | 0 |

---

## Next Steps

1. Add OpenRouter API key via dashboard
2. Add Groq API key via dashboard
3. Verify both providers healthy
4. Verify `/v1/models` returns models
5. Run internal smoke tests
6. Create beta access keys
7. Begin Stage 1 evidence collection
