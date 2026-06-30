#!/bin/bash
# 8Router Doctor — Release Readiness Check

API_URL="${API_URL:-http://localhost:8080}"
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ok() { echo -e "${GREEN}✅${NC} $1"; }
warn() { echo -e "${YELLOW}⚠️${NC} $1"; }
fail() { echo -e "${RED}❌${NC} $1"; }

echo ""
echo "═══════════════════════════════════════════════"
echo "  8Router Doctor — Release Readiness Check"
echo "═══════════════════════════════════════════════"
echo ""

# 1. Server health
HTTP=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/8router/health" 2>/dev/null)
if [ "$HTTP" = "200" ]; then ok "Server healthy (HTTP $HTTP)"; else fail "Server not responding (HTTP $HTTP)"; fi

# 2. Version
VERSION=$(curl -s "$API_URL/admin/version" 2>/dev/null | python3 -c "import json,sys; print(json.load(sys.stdin).get('version','unknown'))" 2>/dev/null || echo "unknown")
if [ "$VERSION" != "unknown" ]; then ok "Version: $VERSION"; else warn "Version endpoint unavailable"; fi

# 3. Providers
PROVIDERS=$(curl -s "$API_URL/8router/providers" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d))" 2>/dev/null || echo "0")
if [ "$PROVIDERS" -gt "0" ] 2>/dev/null; then ok "$PROVIDERS providers loaded"; else fail "No providers loaded"; fi

# 4. Key pool
KEYS=$(curl -s "$API_URL/8router/key-pool" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(sum(p.get('totalKeys',0) for p in d))" 2>/dev/null || echo "0")
if [ "$KEYS" -gt "0" ] 2>/dev/null; then ok "$KEYS keys loaded"; else fail "No keys loaded"; fi

# 5. Secret masking
LEAKED=$(curl -s "$API_URL/8router/providers" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
leaked=0
for p in d:
    for k in (p.get('apiKeys') or []):
        if len(k)>15 and '...' not in k: leaked+=1
    ak=p.get('apiKey','')
    if len(ak)>15 and '...' not in ak: leaked+=1
print(leaked)" 2>/dev/null || echo "error")
if [ "$LEAKED" = "0" ]; then ok "Secret masking active"; else fail "Secret masking FAILED — $LEAKED leaked keys!"; fi

# 6. Admin endpoints local-only
ADMIN=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/admin/health" 2>/dev/null)
if [ "$ADMIN" = "200" ]; then ok "Admin endpoints accessible"; else warn "Admin endpoints: HTTP $ADMIN"; fi

# 7. OpenAI /v1/models
MODELS=$(curl -s "$API_URL/v1/models" 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d.get('data',[])))" 2>/dev/null || echo "0")
if [ "$MODELS" -gt "0" ] 2>/dev/null; then ok "/v1/models active ($MODELS models)"; else fail "/v1/models not working"; fi

# 8. Chat completions
CHAT=$(curl -s -X POST "$API_URL/v1/chat/completions" -H 'Content-Type: application/json' -d '{"model":"llama-3.3-70b-versatile","messages":[{"role":"user","content":"test"}],"max_tokens":5}' 2>/dev/null | python3 -c "import json,sys; d=json.load(sys.stdin); print('ok' if 'choices' in d else 'fail')" 2>/dev/null || echo "fail")
if [ "$CHAT" = "ok" ]; then ok "/v1/chat/completions working"; else fail "/v1/chat/completions not working"; fi

# 9. Model aliases
ALIASES=$(curl -s "$API_URL/v1/models" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
aliases=[m['id'] for m in d.get('data',[]) if m['id'].startswith('8router/')]
print(len(aliases))" 2>/dev/null || echo "0")
if [ "$ALIASES" -gt "0" ] 2>/dev/null; then ok "Model aliases: $ALIASES (8router/*)"; else warn "No model aliases found"; fi

# 10. Quota tracker
QUOTA=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/8router/quota" 2>/dev/null)
if [ "$QUOTA" = "200" ]; then ok "Quota tracker active"; else fail "Quota tracker: HTTP $QUOTA"; fi

# 11. Setup guide
SETUP=$(curl -s -o /dev/null -w '%{http_code}' "$API_URL/8router/setup" 2>/dev/null)
if [ "$SETUP" = "200" ]; then ok "Setup guide at /8router/setup"; else warn "Setup guide: HTTP $SETUP"; fi

# 12. Public access warning
PUBLIC=$(curl -s "$API_URL/8router/info" 2>/dev/null | python3 -c "
import json,sys
d=json.load(sys.stdin)
auth=d.get('security',{}).get('authRequired',True)
print('warn' if not auth else 'ok')" 2>/dev/null || echo "ok")
if [ "$PUBLIC" = "warn" ]; then warn "Public access without auth — set AUTH_REQUIRED=true for production"; fi

echo ""
echo "═══════════════════════════════════════════════"
echo ""
