# 8Router — Quick Start Guide for Laras

## What is 8Router?
8Router adalah **AI routing gateway** yang bisa kamu pakai sebagai OpenAI-compatible endpoint. Dia automatically route request ke provider terbaik (Groq, Mistral, Xiaomi, dll) dengan fallback system.

## 🌐 Endpoint
```
http://5.223.60.79/v1
```
**API Key:** `not-needed` (udah di-manage di server)

---

## 🚀 Cara Pakai (Python)

```python
from openai import OpenAI

client = OpenAI(
    base_url="http://5.223.60.79/v1",
    api_key="not-needed"
)

# Chat Completion
response = client.chat.completions.create(
    model="llama-3.1-8b-instant",  # atau model lain
    messages=[
        {"role": "system", "content": "You are a helpful assistant."},
        {"role": "user", "content": "Hello!"}
    ]
)
print(response.choices[0].message.content)
```

## 🚀 Cara Pakai (cURL)

```bash
curl http://5.223.60.79/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.1-8b-instant",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

---

## 📋 Available Models

| Model | Provider | Best For |
|-------|----------|----------|
| `llama-3.1-8b-instant` | Groq | Fast responses, general tasks |
| `llama-3.3-70b-versatile` | Groq | Complex reasoning, coding |
| `mixtral-8x7b-32768` | Groq | Long context, analysis |
| `mistral-large-latest` | Mistral | High quality, multilingual |
| `mistral-small-latest` | Mistral | Fast, cost-effective |
| `mimo-v2-pro` | Xiaomi | General purpose |
| `MIMO` | Auto-fallback | Best available provider |

---

## 🎯 Tips

1. **Pakai `MIMO`** untuk auto-select best provider
2. **Pakai `llama-3.1-8b-instant`** untuk fast responses
3. **Pakai `llama-3.3-70b-versatile`** untuk complex tasks
4. **Response includes** `_8router` metadata dengan provider info

---

## 📊 Dashboard

Lihat real-time stats di:
```
http://5.223.60.79/8router
```

---

## ❓ Need Help?

Tanya ke Kon-chan atau Kai Kazuki.
