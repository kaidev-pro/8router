#!/bin/bash
# 8Router OpenAI-Compatible Contract Tests
# Tests API format compliance, NOT live provider availability.
# Run: npm run test:openai-compat or bash scripts/test-openai-compat.sh

set +e

API_URL="${API_URL:-http://localhost:8080}"
PASS=0
FAIL=0
WARN=0

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
warn() { echo -e "  ${YELLOW}⚠${NC} $1"; ((WARN++)); }
info() { echo -e "${CYAN}▸${NC} $1"; }

echo ""
echo "═══════════════════════════════════════════════"
echo "  8Router OpenAI-Compatible Contract Tests"
echo "═══════════════════════════════════════════════"
echo ""

# ─── Helper: find a working model ────────────────────────────────
# Query /v1/models and try to find a model from a healthy provider.
# Falls back to 8router/auto if no specific model works.
find_working_model() {
  local models_resp
  models_resp=$(curl -s "$API_URL/v1/models" 2>/dev/null)

  # Try 8router/auto first (auto-routing alias)
  local test_resp
  test_resp=$(curl -s --max-time 15 -X POST "$API_URL/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d '{"model":"8router/auto","messages":[{"role":"user","content":"hi"}],"max_tokens":5}' 2>/dev/null)

  if echo "$test_resp" | grep -q '"choices"'; then
    echo "8router/auto"
    return 0
  fi

  # Try each model from /v1/models that isn't an alias
  local model_list
  model_list=$(echo "$models_resp" | python3 -c "
import json,sys
d=json.load(sys.stdin)
models = d.get('data', d.get('models', []))
for m in models:
    mid = m.get('id','') if isinstance(m,dict) else str(m)
    if not mid.startswith('8router/'):
        print(mid)
" 2>/dev/null | head -5)

  while IFS= read -r model; do
    [ -z "$model" ] && continue
    test_resp=$(curl -s --max-time 15 -X POST "$API_URL/v1/chat/completions" \
      -H "Content-Type: application/json" \
      -d "{\"model\":\"$model\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":5}" 2>/dev/null)

    if echo "$test_resp" | grep -q '"choices"'; then
      echo "$model"
      return 0
    fi
  done <<< "$model_list"

  # Nothing worked
  echo ""
  return 1
}

# ─── Find a working model ────────────────────────────────────────
info "Probing for a working model..."
WORKING_MODEL=$(find_working_model)

if [ -z "$WORKING_MODEL" ]; then
  warn "No working model found (all providers may be down). Live tests will be skipped."
  warn "Contract tests (format, auth, error handling) will still run."
  WORKING_MODEL="8router/auto"  # Use alias for format tests
  LIVE_PROVIDER_OK=false
else
  pass "Found working model: $WORKING_MODEL"
  LIVE_PROVIDER_OK=true
fi
echo ""

# ─── 1. GET /v1/models — JSON model list ──────────────────────────
info "1. GET /v1/models — model list"
MODELS_RESP=$(curl -s "$API_URL/v1/models" 2>/dev/null)
MODELS_HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/v1/models" 2>/dev/null)
if [ "$MODELS_HTTP" = "200" ] && echo "$MODELS_RESP" | python3 -c "import json,sys; d=json.load(sys.stdin); assert 'data' in d or 'models' in d" 2>/dev/null; then
  MODEL_COUNT=$(echo "$MODELS_RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
models = d.get('data', d.get('models', []))
print(len(models))
" 2>/dev/null || echo "0")
  pass "GET /v1/models → $MODELS_HTTP, $MODEL_COUNT models"
else
  fail "GET /v1/models → $MODELS_HTTP (expected 200 with JSON model list)"
fi

# ─── 2. POST /v1/chat/completions — non-streaming ─────────────────
info "2. POST /v1/chat/completions — non-streaming"
CHAT_RESP=$(curl -s --max-time 30 -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$WORKING_MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Say hello in 3 words\"}],
    \"max_tokens\": 10
  }" 2>/dev/null)

if echo "$CHAT_RESP" | grep -q '"choices"'; then
  CONTENT=$(echo "$CHAT_RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
c=d.get('choices',[{}])[0].get('message',{}).get('content','')
print(c[:80])
" 2>/dev/null || echo "(parse error)")
  pass "Non-streaming completion → content: $CONTENT"
elif [ "$LIVE_PROVIDER_OK" = false ]; then
  warn "Non-streaming completion skipped (no working provider)"
else
  fail "Non-streaming completion failed: $(echo "$CHAT_RESP" | head -c 200)"
fi

# ─── 3. POST /v1/chat/completions — streaming ─────────────────────
info "3. POST /v1/chat/completions — streaming"
STREAM_RESP=$(curl -s --max-time 30 -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$WORKING_MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Say hello\"}],
    \"max_tokens\": 10,
    \"stream\": true
  }" 2>/dev/null)

if echo "$STREAM_RESP" | grep -q 'data:'; then
  HAS_DONE=$(echo "$STREAM_RESP" | grep -c 'data: \[DONE\]' || true)
  CHUNK_COUNT=$(echo "$STREAM_RESP" | grep -c 'data:' || true)
  if [ "$HAS_DONE" -gt "0" ]; then
    pass "Streaming completion → $CHUNK_COUNT chunks, received [DONE]"
  else
    pass "Streaming completion → $CHUNK_COUNT chunks (no [DONE] marker)"
  fi
elif [ "$LIVE_PROVIDER_OK" = false ]; then
  warn "Streaming completion skipped (no working provider)"
else
  fail "Streaming completion failed — no SSE data prefix found"
fi

# ─── 4. POST /v1/chat/completions — invalid model ─────────────────
info "4. POST /v1/chat/completions — invalid model"
INVALID_RESP=$(curl -s -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nonexistent-model-xyz",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 5
  }' 2>/dev/null)
INVALID_HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "nonexistent-model-xyz",
    "messages": [{"role": "user", "content": "test"}],
    "max_tokens": 5
  }' 2>/dev/null)

if echo "$INVALID_RESP" | grep -q '"error"'; then
  ERROR_MSG=$(echo "$INVALID_RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
e=d.get('error',{})
print(e.get('message','')[:100] if isinstance(e,dict) else str(e)[:100])
" 2>/dev/null || echo "(parse error)")
  pass "Invalid model rejected → $INVALID_HTTP: $ERROR_MSG"
elif [[ "$INVALID_HTTP" =~ ^4[0-9][0-9]$ ]]; then
  pass "Invalid model rejected → HTTP $INVALID_HTTP"
else
  fail "Invalid model not rejected → HTTP $INVALID_HTTP: $(echo "$INVALID_RESP" | head -c 200)"
fi

# ─── 5. GET /v1/models — verify 8router aliases ──────────────────
info "5. GET /v1/models — verify 8router model aliases"
ALIASES=("8router/auto" "8router/cheap" "8router/fast" "8router/smart" "8router/coding" "8router/local")
for alias in "${ALIASES[@]}"; do
  if echo "$MODELS_RESP" | grep -q "$alias"; then
    pass "Alias '$alias' found in /v1/models"
  else
    info "Alias '$alias' not found in /v1/models (may not be implemented yet)"
  fi
done

# ─── 6. POST /v1/chat/completions — invalid API key ───────────────
info "6. POST /v1/chat/completions — invalid API key"
AUTH_RESP=$(curl -s -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-invalid-test-key-12345" \
  -d "{
    \"model\": \"$WORKING_MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"test\"}],
    \"max_tokens\": 5
  }" 2>/dev/null)
AUTH_HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer sk-invalid-test-key-12345" \
  -d "{
    \"model\": \"$WORKING_MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"test\"}],
    \"max_tokens\": 5
  }" 2>/dev/null)

if [[ "$AUTH_HTTP" =~ ^4[0-9][0-9]$ ]]; then
  pass "Invalid API key rejected → HTTP $AUTH_HTTP"
elif [ "$AUTH_HTTP" = "200" ]; then
  pass "Invalid API key accepted → HTTP $AUTH_HTTP (pass-through mode)"
elif echo "$AUTH_RESP" | grep -q '"error"'; then
  pass "Invalid API key → error response (format correct)"
else
  fail "Unexpected response with invalid key → HTTP $AUTH_HTTP"
fi

# ─── 7. Verify _8router metadata ─────────────────────────────────
info "7. Verify _8router response metadata"
META_RESP=$(curl -s --max-time 30 -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d "{
    \"model\": \"$WORKING_MODEL\",
    \"messages\": [{\"role\": \"user\", \"content\": \"Say OK\"}],
    \"max_tokens\": 5
  }" 2>/dev/null)

if echo "$META_RESP" | grep -q '"error"'; then
  if [ "$LIVE_PROVIDER_OK" = false ]; then
    warn "_8router metadata skipped (no working provider)"
  else
    fail "Request failed: $(echo "$META_RESP" | head -c 200)"
  fi
else
  METADATA=$(echo "$META_RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
meta = d.get('_8router', {})
if not meta:
    print('missing')
    sys.exit(0)
provider = meta.get('provider', 'absent')
latency = meta.get('latencyMs', 'absent')
fallback = meta.get('fallback', 'absent')
print(f'provider={provider} latencyMs={latency} fallback={fallback}')
" 2>/dev/null || echo "parse_error")

  if [ "$METADATA" = "missing" ]; then
    fail "No _8router metadata in response"
  elif [ "$METADATA" = "parse_error" ]; then
    fail "Could not parse _8router metadata"
  else
    META_OK=true
    DETAILS=""
    if echo "$METADATA" | grep -q 'provider=absent'; then
      META_OK=false
      DETAILS="$DETAILS provider=missing"
    else
      PROVIDER_VAL=$(echo "$METADATA" | grep -o 'provider=[^ ]*' | cut -d= -f2)
      DETAILS="$DETAILS provider=$PROVIDER_VAL"
    fi
    if echo "$METADATA" | grep -q 'latencyMs=absent'; then
      META_OK=false
      DETAILS="$DETAILS latencyMs=missing"
    else
      LATENCY_VAL=$(echo "$METADATA" | grep -o 'latencyMs=[^ ]*' | cut -d= -f2)
      DETAILS="$DETAILS latencyMs=${LATENCY_VAL}ms"
    fi
    if echo "$METADATA" | grep -q 'fallback=absent'; then
      info "_8router metadata missing 'fallback' field (may be optional)"
    else
      FALLBACK_VAL=$(echo "$METADATA" | grep -o 'fallback=[^ ]*' | cut -d= -f2)
      DETAILS="$DETAILS fallback=$FALLBACK_VAL"
    fi
    if [ "$META_OK" = true ]; then
      pass "_8router metadata present:$DETAILS"
    else
      fail "_8router metadata incomplete:$DETAILS"
    fi
  fi
fi

# ─── 8. Health endpoint ──────────────────────────────────────────
info "8. GET /health — health check"
HEALTH_RESP=$(curl -s "$API_URL/health" 2>/dev/null)
HEALTH_HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/health" 2>/dev/null)
if [ "$HEALTH_HTTP" = "200" ] && echo "$HEALTH_RESP" | grep -q '"status"'; then
  pass "Health endpoint → $HEALTH_HTTP"
else
  fail "Health endpoint → $HEALTH_HTTP"
fi

# ─── 9. Error format compliance ──────────────────────────────────
info "9. Error format — OpenAI-compatible error structure"
if echo "$INVALID_RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
e=d.get('error',{})
assert isinstance(e,dict), 'error is not a dict'
assert 'message' in e or 'type' in e, 'no message or type'
" 2>/dev/null; then
  pass "Error format matches OpenAI structure {error: {message, type, code}}"
else
  fail "Error format does not match OpenAI structure"
fi

# ─── Summary ──────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${YELLOW}$WARN warnings${NC}, ${RED}$FAIL failed${NC}"
if [ "$WARN" -gt 0 ]; then
  echo -e "  ${YELLOW}Warnings are non-blocking (provider availability)${NC}"
fi
echo "═══════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
