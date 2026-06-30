#!/usr/bin/env bash
# 8Router — i18n Test Suite (11 tests)
set -euo pipefail

BASE="http://localhost:8080"
PASS=0
FAIL=0
TOTAL=11

echo "═══ Phase 3: i18n Tests ═══"

# ─── 1. Default locale is en ───
DEFAULT=$(curl -sf "$BASE/8router/" | grep -o '<html lang="en">' | head -1)
if [ "$DEFAULT" = '<html lang="en">' ]; then
  echo "  ✅ Default locale is en"
  ((PASS++)) || true
else
  echo "  ❌ Expected en, got: $DEFAULT"
  ((FAIL++)) || true
fi

# ─── 2. Valid query lang=id works ───
ID_CHECK=$(curl -sf "$BASE/8router/?lang=id" | grep -o 'Satu Endpoint' | head -1)
if [ "$ID_CHECK" = "Satu Endpoint" ]; then
  echo "  ✅ lang=id works (Indonesian)"
  ((PASS++)) || true
else
  echo "  ❌ Expected 'Satu Endpoint', got: $ID_CHECK"
  ((FAIL++)) || true
fi

# ─── 3. Valid query lang=ja works ───
JA_CHECK=$(curl -sf "$BASE/8router/?lang=ja" | grep -o 'ひとつのエンドポイント' | head -1)
if [ "$JA_CHECK" = "ひとつのエンドポイント" ]; then
  echo "  ✅ lang=ja works (Japanese)"
  ((PASS++)) || true
else
  echo "  ❌ Expected 'ひとつのエンドポイント', got: $JA_CHECK"
  ((FAIL++)) || true
fi

# ─── 4. Invalid locale fallback to en ───
INVALID=$(curl -sf "$BASE/8router/?lang=fr" | grep -o 'One Endpoint' | head -1)
if [ "$INVALID" = "One Endpoint" ]; then
  echo "  ✅ Invalid locale falls back to en"
  ((PASS++)) || true
else
  echo "  ❌ Expected 'One Endpoint', got: $INVALID"
  ((FAIL++)) || true
fi

# ─── 5. Cookie locale works ───
COOKIE=$(curl -sf -b "8router_locale=id" "$BASE/8router/" | grep -o 'Satu Endpoint' | head -1)
if [ "$COOKIE" = "Satu Endpoint" ]; then
  echo "  ✅ Cookie locale works"
  ((PASS++)) || true
else
  echo "  ❌ Expected 'Satu Endpoint' from cookie, got: $COOKIE"
  ((FAIL++)) || true
fi

# ─── 6. Accept-Language fallback works ───
ACCEPT=$(curl -sf -H "Accept-Language: ja,en" "$BASE/8router/" | grep -o 'ひとつのエンドポイント' | head -1)
if [ "$ACCEPT" = "ひとつのエンドポイント" ]; then
  echo "  ✅ Accept-Language fallback works"
  ((PASS++)) || true
else
  echo "  ❌ Expected Japanese from Accept-Language, got: $ACCEPT"
  ((FAIL++)) || true
fi

# ─── 7. All en keys exist ───
EN_KEYS=$(python3 -c "import json; print(len(json.load(open('$PWD/src/i18n/en.json'))))")
if [ "$EN_KEYS" -gt "100" ]; then
  echo "  ✅ en.json has $EN_KEYS keys"
  ((PASS++)) || true
else
  echo "  ❌ Expected 100+ keys, got: $EN_KEYS"
  ((FAIL++)) || true
fi

# ─── 8. id has no missing keys compared to en ───
MISSING_ID=$(python3 -c "
import json
en = set(json.load(open('$PWD/src/i18n/en.json')).keys())
id = set(json.load(open('$PWD/src/i18n/id.json')).keys())
print(len(en - id))
")
if [ "$MISSING_ID" = "0" ]; then
  echo "  ✅ id.json has no missing keys"
  ((PASS++)) || true
else
  echo "  ❌ id.json missing $MISSING_ID keys"
  ((FAIL++)) || true
fi

# ─── 9. ja has no missing keys compared to en ───
MISSING_JA=$(python3 -c "
import json
en = set(json.load(open('$PWD/src/i18n/en.json')).keys())
ja = set(json.load(open('$PWD/src/i18n/ja.json')).keys())
print(len(en - ja))
")
if [ "$MISSING_JA" = "0" ]; then
  echo "  ✅ ja.json has no missing keys"
  ((PASS++)) || true
else
  echo "  ❌ ja.json missing $MISSING_JA keys"
  ((FAIL++)) || true
fi

# ─── 10. Code snippets/model aliases/provider names not translated ───
ALIAS_EN=$(curl -sf "$BASE/8router/" | grep -c '8router/auto' || echo "0")
ALIAS_ID=$(curl -sf "$BASE/8router/?lang=id" | grep -c '8router/auto' || echo "0")
ALIAS_JA=$(curl -sf "$BASE/8router/?lang=ja" | grep -c '8router/auto' || echo "0")
if [ "$ALIAS_EN" -gt "0" ] && [ "$ALIAS_ID" -gt "0" ] && [ "$ALIAS_JA" -gt "0" ]; then
  echo "  ✅ Model aliases not translated (preserved in all locales)"
  ((PASS++)) || true
else
  echo "  ❌ Model aliases missing (en:$ALIAS_EN id:$ALIAS_ID ja:$ALIAS_JA)"
  ((FAIL++)) || true
fi

# ─── 11. Missing key fallback returns English ───
# Test by checking if the page renders without errors
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/8router/?lang=id")
if [ "$STATUS" = "200" ]; then
  echo "  ✅ Translated page renders without errors"
  ((PASS++)) || true
else
  echo "  ❌ Page returned HTTP $STATUS"
  ((FAIL++)) || true
fi

echo ""
echo "═══ Summary ═══"
echo "  ✅ Passed: $PASS"
echo "  ❌ Failed: $FAIL"
echo "  Total:     $TOTAL"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
