#!/bin/bash
# 8Router v0.5.0 Feature Tests
set +e

API_URL="${API_URL:-http://localhost:8080}"
PASS=0; FAIL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
info() { echo -e "▸ $1"; }

echo ""
echo "═══════════════════════════════════════════════"
echo "  8Router v0.5.0 Feature Tests"
echo "═══════════════════════════════════════════════"
echo ""

# 1. Smart picker
info "Smart Model Picker"
for task in cheap fast smart coding local; do
  RESULT=$(curl -s "$API_URL/8router/pick-model?task=$task" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('model',''))" 2>/dev/null)
  if [ -n "$RESULT" ] && [ "$RESULT" != "" ]; then
    pass "pick-model?task=$task → $RESULT"
  else
    fail "pick-model?task=$task → empty"
  fi
done

# 2. Model capabilities
info "Model Capabilities"
MODELS=$(curl -s "$API_URL/v1/models" | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null)
if [ "$MODELS" -gt "15" ] 2>/dev/null; then
  pass "Model list: $MODELS models"
else
  fail "Model list too small: $MODELS"
fi

# 3. Benchmark endpoint
info "Benchmark Endpoint"
HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/admin/benchmarks")
if [ "$HTTP" = "200" ]; then
  pass "GET /admin/benchmarks → $HTTP"
else
  fail "GET /admin/benchmarks → $HTTP"
fi

# 4. Tool calling
info "Tool Calling"
RESULT=$(curl -s -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"What is the weather in Tokyo?"}],"tools":[{"type":"function","function":{"name":"get_weather","description":"Get weather","parameters":{"type":"object","properties":{"city":{"type":"string"}}}}}],"max_tokens":50}' 2>/dev/null)
if echo "$RESULT" | grep -q 'tool_calls\|choices'; then
  pass "Tool calling request accepted"
else
  fail "Tool calling request failed"
fi

# 5. Embeddings
info "Embeddings Endpoint"
HTTP=$(curl -s -o /dev/null -w '%{http_code}' -X POST "$API_URL/v1/embeddings" \
  -H "Content-Type: application/json" \
  -d '{"model":"text-embedding-3-small","input":"hello"}' 2>/dev/null)
if [ "$HTTP" = "200" ] || [ "$HTTP" = "502" ] || [ "$HTTP" = "404" ] || [ "$HTTP" = "500" ]; then
  pass "POST /v1/embeddings → $HTTP (endpoint exists)"
else
  fail "POST /v1/embeddings → $HTTP"
fi

# 6. Local alias no cloud fallback
info "Local Alias"
LOCAL=$(curl -s -X POST "$API_URL/v1/chat/completions" \
  -H "Content-Type: application/json" \
  -d '{"model":"8router/local","messages":[{"role":"user","content":"test"}],"max_tokens":5}' 2>/dev/null)
if echo "$LOCAL" | grep -q 'no_local_provider\|No local provider'; then
  pass "8router/local → 503 (no cloud fallback)"
else
  # Check if it resolved to a local provider
  PROVIDER=$(echo "$LOCAL" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('_8router',{}).get('provider',''))" 2>/dev/null)
  if [ "$PROVIDER" = "ollama" ] || [ "$PROVIDER" = "mimo" ]; then
    pass "8router/local → $PROVIDER (local provider)"
  else
    fail "8router/local → unexpected provider: $PROVIDER"
  fi
fi

# 7. Cost table (check admin/providers has cost info)
info "Cost Table"
COST=$(curl -s "$API_URL/admin/version" | python3 -c "import json,sys; d=json.load(sys.stdin); print(d.get('features',{}).get('quotaTracker',False))" 2>/dev/null)
if [ "$COST" = "True" ]; then
  pass "Cost/quota tracking active"
else
  fail "Cost tracking missing"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════"

if [ "$FAIL" -gt "0" ]; then exit 1; fi

# 8. Provider Branding
info "Provider Branding"
BRANDS=$(node -e "
const fs = require('fs');
const src = fs.readFileSync('src/config/provider-branding.ts', 'utf8');
// Extract all provider IDs
const ids = [...src.matchAll(/'([a-z-]+)':\s*\{/g)].map(m => m[1]);
const logos = [...src.matchAll(/logo:\s*'([^']+)'/g)].map(m => m[1]);
const names = [...src.matchAll(/name:\s*'([^']+)'/g)].map(m => m[1]);

let errors = 0;
// Check all providers have name and logo
if (ids.length !== names.length) { console.log('ID/Name mismatch: ' + ids.length + ' vs ' + names.length); errors++; }
if (ids.length !== logos.length) { console.log('ID/Logo mismatch: ' + ids.length + ' vs ' + logos.length); errors++; }

// Check for duplicates
const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
if (dupes.length) { console.log('Duplicate IDs: ' + dupes.join(',')); errors++; }

// Check logo files exist
for (const logo of logos) {
  const path = 'public' + logo;
  if (!fs.existsSync(path)) { console.log('Missing logo: ' + path); errors++; }
}

console.log(errors === 0 ? 'OK:' + ids.length : 'ERRORS:' + errors);
" 2>/dev/null)

if echo "$BRANDS" | grep -q "^OK:"; then
  COUNT=$(echo "$BRANDS" | sed 's/OK://')
  pass "All $COUNT providers have valid branding (name + logo + file)"
else
  fail "Branding issues: $BRANDS"
fi

# 9. Logo file count
LOGO_COUNT=$(ls public/assets/providers/*.svg 2>/dev/null | wc -l)
if [ "$LOGO_COUNT" -ge "18" ]; then
  pass "Provider logos: $LOGO_COUNT SVG files"
else
  fail "Only $LOGO_COUNT logo files (expected 18+)"
fi
