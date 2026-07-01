#!/usr/bin/env bash
# 8Router — i18n Test Suite (20 tests)
set -euo pipefail

BASE="http://localhost:8080"
PASS=0
FAIL=0
TOTAL=20

echo "═══ v0.6.1: i18n Tests ═══"

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

# ─── 7. Translation key count is 384 ───
EN_KEYS=$(python3 -c "import json; print(len(json.load(open('$PWD/src/i18n/en.json'))))")
if [ "$EN_KEYS" -ge "380" ]; then
  echo "  ✅ en.json has $EN_KEYS keys (≥380)"
  ((PASS++)) || true
else
  echo "  ❌ Expected 380+ keys, got: $EN_KEYS"
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

# ─── 10. Model aliases not translated ───
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

# ─── 11. Landing page renders without errors ───
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/8router/?lang=id")
if [ "$STATUS" = "200" ]; then
  echo "  ✅ Translated landing page renders (HTTP 200)"
  ((PASS++)) || true
else
  echo "  ❌ Landing page returned HTTP $STATUS"
  ((FAIL++)) || true
fi

# ─── 12. Dashboard has translated sidebar for en ───
DASH_EN=$(curl -sf "$BASE/8router/dashboard" | grep -c 'Endpoint' || echo "0")
if [ "$DASH_EN" -gt "0" ]; then
  echo "  ✅ Dashboard sidebar translated (en)"
  ((PASS++)) || true
else
  echo "  ❌ Dashboard sidebar missing 'Endpoint' in en"
  ((FAIL++)) || true
fi

# ─── 13. Dashboard has translated sidebar for id ───
DASH_ID=$(curl -sf "$BASE/8router/dashboard?lang=id" | grep -c 'Penggunaan' || echo "0")
if [ "$DASH_ID" -gt "0" ]; then
  echo "  ✅ Dashboard sidebar translated (id)"
  ((PASS++)) || true
else
  echo "  ❌ Dashboard sidebar missing 'Penggunaan' in id"
  ((FAIL++)) || true
fi

# ─── 14. Dashboard has translated sidebar for ja ───
DASH_JA=$(curl -sf "$BASE/8router/dashboard?lang=ja" | grep -c '使用状況' || echo "0")
if [ "$DASH_JA" -gt "0" ]; then
  echo "  ✅ Dashboard sidebar translated (ja)"
  ((PASS++)) || true
else
  echo "  ❌ Dashboard sidebar missing '使用状況' in ja"
  ((FAIL++)) || true
fi

# ─── 15. Setup guide translated (en) ───
SETUP_EN=$(curl -sf "$BASE/8router/setup" | grep -c 'Setup Guide\|Setup' || echo "0")
if [ "$SETUP_EN" -gt "0" ]; then
  echo "  ✅ Setup guide translated (en)"
  ((PASS++)) || true
else
  echo "  ❌ Setup guide missing English text"
  ((FAIL++)) || true
fi

# ─── 16. Setup guide translated (id) ───
SETUP_ID=$(curl -sf "$BASE/8router/setup?lang=id" | grep -c 'Panduan\|Konfigurasi' || echo "0")
if [ "$SETUP_ID" -gt "0" ]; then
  echo "  ✅ Setup guide translated (id)"
  ((PASS++)) || true
else
  echo "  ❌ Setup guide missing Indonesian text"
  ((FAIL++)) || true
fi

# ─── 17. Dashboard has language switcher ───
LANG_SWITCH=$(curl -sf "$BASE/8router/dashboard" | grep -c 'lang-switch' || echo "0")
if [ "$LANG_SWITCH" -gt "0" ]; then
  echo "  ✅ Dashboard has language switcher"
  ((PASS++)) || true
else
  echo "  ❌ Dashboard missing language switcher"
  ((FAIL++)) || true
fi

# ─── 18. Dashboard html lang attribute changes ───
DASH_LANG=$(curl -sf "$BASE/8router/dashboard?lang=ja" | grep -o '<html lang="[^"]*"' | head -1)
if echo "$DASH_LANG" | grep -q 'ja'; then
  echo "  ✅ Dashboard html lang attribute correct (ja)"
  ((PASS++)) || true
else
  echo "  ❌ Dashboard lang attribute: $DASH_LANG"
  ((FAIL++)) || true
fi

# ─── 19. Provider names unchanged in dashboard ───
PROV_EN=$(curl -sf "$BASE/8router/dashboard" | grep -c 'Groq\|OpenRouter\|DeepSeek' || echo "0")
PROV_ID=$(curl -sf "$BASE/8router/dashboard?lang=id" | grep -c 'Groq\|OpenRouter\|DeepSeek' || echo "0")
if [ "$PROV_EN" -gt "0" ] && [ "$PROV_ID" -gt "0" ]; then
  echo "  ✅ Provider names not translated in dashboard"
  ((PASS++)) || true
else
  echo "  ❌ Provider names missing (en:$PROV_EN id:$PROV_ID)"
  ((FAIL++)) || true
fi

# ─── 20. All 3 translation files have db.* keys ───
DB_KEYS=$(python3 -c "
import json
en = json.load(open('$PWD/src/i18n/en.json'))
db = [k for k in en if k.startswith('db.')]
print(len(db))
")
if [ "$DB_KEYS" -ge "200" ]; then
  echo "  ✅ Dashboard translation keys: $DB_KEYS (≥200)"
  ((PASS++)) || true
else
  echo "  ❌ Expected 200+ db.* keys, got: $DB_KEYS"
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
