#!/bin/bash
# 8Router Test Script
# Run: npm run test:router or bash scripts/test-router.sh

set +e  # Don't exit on error — we handle failures ourselves

API_URL="${API_URL:-http://localhost:8080}"
ADMIN_URL="${API_URL}"
PASS=0
FAIL=0

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
info() { echo -e "${YELLOW}▸${NC} $1"; }

echo ""
echo "═══════════════════════════════════════════════"
echo "  8Router Test Suite"
echo "═══════════════════════════════════════════════"
echo ""

# ─── 1. Health Check ──────────────────────────────────────────────
info "Health Check"
HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/8router/health")
if [ "$HTTP" = "200" ]; then
  pass "GET /8router/health → $HTTP"
else
  fail "GET /8router/health → $HTTP (expected 200)"
fi

# ─── 2. Providers ─────────────────────────────────────────────────
info "Providers"
PROVIDERS=$(curl -s "$API_URL/8router/providers" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")
if [ "$PROVIDERS" -gt "0" ] 2>/dev/null; then
  pass "Providers loaded: $PROVIDERS"
else
  fail "No providers found"
fi

# ─── 2b. Secret Masking ──────────────────────────────────────────
info "Secret Masking"
LEAKED=$(curl -s "$API_URL/8router/providers" | python3 -c "
import json,sys
d=json.load(sys.stdin)
leaked = []
for p in d:
    for k in (p.get('apiKeys') or []):
        if len(k) > 15 and not '...' in k:
            leaked.append(k[:20])
    ak = p.get('apiKey','')
    if len(ak) > 15 and not '...' in ak:
        leaked.append(ak[:20])
print(len(leaked))
" 2>/dev/null || echo "error")
if [ "$LEAKED" = "0" ]; then
  pass "No leaked API keys in /8router/providers"
else
  fail "Found $LEAKED potentially leaked API keys!"
fi

# ─── 3. Key Pool ──────────────────────────────────────────────────
info "Key Pool"
KEYS=$(curl -s "$API_URL/8router/key-pool" | python3 -c "
import json,sys
d=json.load(sys.stdin)
total = sum(p.get('totalKeys',0) for p in (d if isinstance(d,list) else []))
print(total)
" 2>/dev/null || echo "0")
if [ "$KEYS" -gt "0" ] 2>/dev/null; then
  pass "Key pool loaded: $KEYS keys"
else
  fail "No keys found in pool"
fi

# ─── 4. Admin Endpoints (local-only) ─────────────────────────────
info "Admin Endpoints"
for ep in health providers keys quota logs stats; do
  HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$ADMIN_URL/admin/$ep")
  if [ "$HTTP" = "200" ]; then
    pass "GET /admin/$ep → $HTTP"
  elif [ "$HTTP" = "403" ]; then
    pass "GET /admin/$ep → $HTTP (remote blocked, expected)"
  elif [ "$HTTP" = "404" ]; then
    fail "GET /admin/$ep → $HTTP (endpoint missing)"
  else
    fail "GET /admin/$ep → $HTTP"
  fi
done

# ─── 5. Quota Tracker ────────────────────────────────────────────
info "Quota Tracker"
HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/8router/quota")
if [ "$HTTP" = "200" ]; then
  pass "GET /8router/quota → $HTTP"
else
  fail "GET /8router/quota → $HTTP"
fi

# ─── 6. Circuit Breaker Status ───────────────────────────────────
info "Circuit Breaker"
CB=$(curl -s "$ADMIN_URL/admin/health" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
if isinstance(d, list):
    print(f'{len(d)} providers tracked')
elif isinstance(d, dict):
    print(f'{len(d.get(\"providers\",[]))} providers tracked')
else:
    print('unknown')
" 2>/dev/null || echo "error")
if [ "$CB" != "error" ]; then
  pass "Circuit breaker: $CB"
else
  fail "Circuit breaker status unavailable"
fi

# ─── 7. Chat Completion ──────────────────────────────────────────
info "Chat Completion"
RESPONSE=$(curl -s -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Say hello in 3 words"}],
    "max_tokens": 10
  }' 2>/dev/null)

if echo "$RESPONSE" | grep -q '"choices"'; then
  PROVIDER=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('_8router',{}).get('provider','unknown'))" 2>/dev/null || echo "unknown")
  LATENCY=$(echo "$RESPONSE" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('_8router',{}).get('latencyMs',0))" 2>/dev/null || echo "0")
  pass "Chat completion → provider=$PROVIDER latency=${LATENCY}ms"
else
  fail "Chat completion failed: $(echo "$RESPONSE" | head -c 200)"
fi

# ─── 8. Request Log After Completion ─────────────────────────────
info "Request Logging"
LOGS=$(curl -s "$API_URL/8router/logs" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if isinstance(d, list):
    print(f'{len(d)} entries')
elif isinstance(d, dict):
    reqs=d.get('requests',d.get('data',[]))
    print(f'{len(reqs)} entries')
else:
    print('empty')
" 2>/dev/null || echo "error")
if [ "$LOGS" != "error" ]; then
  pass "Logs: $LOGS"
else
  fail "Logs endpoint failed"
fi

# ─── 9. Quota After Request ──────────────────────────────────────
info "Quota After Request"
QUOTA=$(curl -s "$API_URL/8router/quota" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if d:
    print(f'{len(d)} entries')
else:
    print('empty')
" 2>/dev/null || echo "error")
if [ "$QUOTA" != "empty" ] && [ "$QUOTA" != "error" ]; then
  pass "Quota tracked: $QUOTA"
else
  fail "Quota not tracked after request"
fi

# ─── 10. Stats ────────────────────────────────────────────────────
info "Stats"
STATS=$(curl -s "$API_URL/8router/stats" | python3 -c "
import json,sys
d=json.load(sys.stdin)
if isinstance(d, dict):
    s=d.get('session',d)
    print(f'requests={s.get(\"totalRequests\",s.get(\"requests\",0))} tokens={s.get(\"totalTokens\",s.get(\"tokens\",0))}')
else:
    print('error')
" 2>/dev/null || echo "error")
if [ "$STATS" != "error" ]; then
  pass "Stats: $STATS"
else
  fail "Stats endpoint failed"
fi

# ─── 11. Error Sanitization ──────────────────────────────────────
info "Error Sanitization"
# Check that logs endpoint doesn't expose raw keys in error messages
LEAKED_ERR=$(curl -s "$API_URL/8router/logs" | python3 -c "
import json,sys
d=json.load(sys.stdin)
reqs = d if isinstance(d, list) else d.get('requests', d.get('data', []))
leaked = 0
for r in reqs:
    msg = r.get('error_message','') or ''
    if 'sk-' in msg and '...' not in msg and len(msg) > 30:
        leaked += 1
print(leaked)
" 2>/dev/null || echo "0")
if [ "$LEAKED_ERR" = "0" ]; then
  pass "No raw keys in error logs"
else
  fail "Found $LEAKED_ERR raw keys in error logs"
fi

# ─── 12. Settings ─────────────────────────────────────────────────
info "Settings"
HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/8router/settings")
if [ "$HTTP" = "200" ]; then
  pass "GET /8router/settings → $HTTP"
else
  fail "GET /8router/settings → $HTTP"
fi

# ─── Summary ──────────────────────────────────────────────────────
echo ""
echo "═══════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════"
echo ""

if [ "$FAIL" -gt "0" ]; then
  exit 1
fi
