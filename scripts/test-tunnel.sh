#!/bin/bash
# 8Router — Tunnel Feature Tests
# Phase 1: Tunnel disabled by default, access mode, security

set +e
BASE="http://localhost:8080"
PASS=0; FAIL=0

check() {
  local desc="$1" result="$2"
  if [ "$result" = "pass" ]; then
    echo "  ✅ $desc"; PASS=$((PASS+1))
  else
    echo "  ❌ $desc"; FAIL=$((FAIL+1))
  fi
}

echo "═══ Phase 1: Tunnel Tests ═══"

# Test 1: Tunnel disabled by default
STATUS=$(curl -s "$BASE/admin/tunnel/status" | python3 -c "import sys,json; print(json.load(sys.stdin).get('state',''))" 2>/dev/null)
[ "$STATUS" = "disabled" ] && check "Tunnel disabled by default" "pass" || check "Tunnel disabled by default (got: $STATUS)" "fail"

# Test 2: Tunnel mode default is dashboard-only
MODE=$(curl -s "$BASE/admin/tunnel/status" | python3 -c "import sys,json; print(json.load(sys.stdin).get('mode',''))" 2>/dev/null)
[ "$MODE" = "dashboard-only" ] && check "Default mode is dashboard-only" "pass" || check "Default mode is dashboard-only (got: $MODE)" "fail"

# Test 3: Tunnel authRequired default is true
AUTH=$(curl -s "$BASE/admin/tunnel/status" | python3 -c "import sys,json; print(json.load(sys.stdin).get('authRequired',''))" 2>/dev/null)
[ "$AUTH" = "True" ] && check "Default authRequired is true" "pass" || check "Default authRequired is true (got: $AUTH)" "fail"

# Test 4: Admin tunnel endpoint returns valid JSON
ADMIN_STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/admin/tunnel/status")
[ "$ADMIN_STATUS" = "200" ] && check "GET /admin/tunnel/status → 200" "pass" || check "GET /admin/tunnel/status → $ADMIN_STATUS" "fail"

# Test 5: Tunnel config masks token
TOKEN=$(curl -s "$BASE/admin/tunnel/config" | python3 -c "import sys,json; print(json.load(sys.stdin).get('token',''))" 2>/dev/null)
# Token should NOT be the full raw token — it should be masked (tr_xxxx...xxxx format with ... in middle)
NEEDLE=$(echo "$TOKEN" | grep -c '\.\.\.\|\*\*\*')
[ "$NEEDLE" -gt 0 ] && check "Token is masked in config response" "pass" || check "Token is masked (got: $TOKEN)" "fail"

# Test 6: No raw token in status response
RAW=$(curl -s "$BASE/admin/tunnel/status" | python3 -c "import sys,json; d=json.load(sys.stdin); print(str(d))" 2>/dev/null)
echo "$RAW" | grep -q 'tr_' && check "No raw token in status" "fail" || check "No raw token in status" "pass"

# Test 7: Tunnel warnings empty when disabled
WARNINGS=$(curl -s "$BASE/admin/tunnel/warnings" | python3 -c "import sys,json; print(len(json.load(sys.stdin).get('warnings',[])))" 2>/dev/null)
[ "$WARNINGS" = "0" ] && check "No warnings when tunnel disabled" "pass" || check "No warnings when tunnel disabled (got: $WARNINGS)" "fail"

# Test 8: Health check includes tunnel status
TUNNEL_HEALTH=$(curl -s "$BASE/health" | python3 -c "import sys,json; print(json.load(sys.stdin).get('tunnel',''))" 2>/dev/null)
[ "$TUNNEL_HEALTH" = "disabled" ] && check "Health includes tunnel status" "pass" || check "Health includes tunnel status (got: $TUNNEL_HEALTH)" "fail"

# Test 9: Landing page accessible (public)
LANDING=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/8router/")
[ "$LANDING" = "200" ] && check "Landing page accessible" "pass" || check "Landing page accessible → $LANDING" "fail"

# Test 10: Dashboard accessible (local)
DASH=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/8router/dashboard")
[ "$DASH" = "200" ] && check "Dashboard accessible (local)" "pass" || check "Dashboard accessible → $DASH" "fail"

# Test 11: API models accessible with proper auth
MODELS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/v1/models")
[ "$MODELS" = "200" ] && check "API /v1/models accessible" "pass" || check "API /v1/models → $MODELS" "fail"

# Test 12: Existing branding test still passes
BRAND=$(bash scripts/test-branding.sh 2>&1 | grep "Passed:" | awk '{print $NF}')
[ "$BRAND" = "58" ] && check "Branding tests still pass (58/58)" "pass" || check "Branding tests (got: $BRAND)" "fail"

echo ""
echo "═══ Summary ═══"
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
echo "  Total:     $((PASS + FAIL))"

[ "$FAIL" -gt 0 ] && exit 1 || exit 0
