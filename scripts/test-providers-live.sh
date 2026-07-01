#!/bin/bash
# 8Router Live Provider Availability Tests
# Tests which providers are actually responding. Warnings for degraded providers.
# Run: npm run test:providers-live or bash scripts/test-providers-live.sh

set +e

API_URL="${API_URL:-http://localhost:8080}"
PASS=0
WARN=0
FAIL=0

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
echo "  8Router Live Provider Availability Tests"
echo "═══════════════════════════════════════════════"
echo ""

# ─── Query provider health from admin API ─────────────────────────
info "Querying provider health..."
HEALTH_RESP=$(curl -s "$API_URL/admin/health" 2>/dev/null)
HEALTH_HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/admin/health" 2>/dev/null)

if [ "$HEALTH_HTTP" != "200" ]; then
  fail "Admin health endpoint unreachable (HTTP $HEALTH_HTTP)"
  echo ""
  echo "═══════════════════════════════════════════════"
  echo -e "  Results: ${GREEN}$PASS passed${NC}, ${YELLOW}$WARN warnings${NC}, ${RED}$FAIL failed${NC}"
  echo "═══════════════════════════════════════════════"
  exit 1
fi

# Parse provider list from /v1/models
MODELS_RESP=$(curl -s "$API_URL/v1/models" 2>/dev/null)

# ─── Test each known provider ─────────────────────────────────────
PROVIDERS=("groq" "openrouter" "deepseek" "together" "fireworks" "cerebras" "sambanova" "mistral" "antigravity" "mimo" "ollama" "xai")

for PROV in "${PROVIDERS[@]}"; do
  info "Testing $PROV..."

  # Try provider-specific model (use first model from /v1/models that matches)
  PROV_MODEL=$(echo "$MODELS_RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
models = d.get('data', d.get('models', []))
for m in models:
    mid = m.get('id','') if isinstance(m,dict) else str(m)
    owner = m.get('owned_by','') if isinstance(m,dict) else ''
    if '$PROV' in mid.lower() or '$PROV' in owner.lower():
        print(mid)
        break
" 2>/dev/null)

  if [ -z "$PROV_MODEL" ]; then
    info "  $PROV: no models found in /v1/models (may be disabled)"
    continue
  fi

  RESP=$(curl -s --max-time 15 -X POST "$API_URL/v1/chat/completions" \
    -H "Content-Type: application/json" \
    -d "{\"model\":\"$PROV_MODEL\",\"messages\":[{\"role\":\"user\",\"content\":\"hi\"}],\"max_tokens\":5}" 2>/dev/null)

  if echo "$RESP" | grep -q '"choices"'; then
    pass "$PROV ($PROV_MODEL) → healthy"
  elif echo "$RESP" | grep -q '"error"'; then
    ERR_MSG=$(echo "$RESP" | python3 -c "
import json,sys
d=json.load(sys.stdin)
e=d.get('error',{})
print(e.get('message','')[:80] if isinstance(e,dict) else str(e)[:80])
" 2>/dev/null || echo "unknown error")
    if echo "$ERR_MSG" | grep -qi "auth\|key\|unauthorized\|forbidden"; then
      warn "$PROV ($PROV_MODEL) → auth error (check API key): $ERR_MSG"
    elif echo "$ERR_MSG" | grep -qi "rate\|limit\|quota"; then
      warn "$PROV ($PROV_MODEL) → rate limited: $ERR_MSG"
    else
      warn "$PROV ($PROV_MODEL) → error: $ERR_MSG"
    fi
  else
    fail "$PROV ($PROV_MODEL) → unreachable or invalid response"
  fi
done

# ─── Summary ──────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS healthy${NC}, ${YELLOW}$WARN degraded${NC}, ${RED}$FAIL down${NC}"
if [ "$WARN" -gt 0 ]; then
  echo -e "  ${YELLOW}Degraded providers have fallback — 8Router auto-routes around them${NC}"
fi
echo "═══════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt 2 ]; then
  echo -e "${RED}Warning: $FAIL providers are down. Check your API keys and network.${NC}"
  exit 1
fi
