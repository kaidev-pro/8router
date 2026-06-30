#!/bin/bash
# 8Router Provider Branding Test
set +e
PASS=0; FAIL=0
GREEN='\033[0;32m'; RED='\033[0;31m'; NC='\033[0m'
pass() { echo -e "  ${GREEN}✓${NC} $1"; ((PASS++)); }
fail() { echo -e "  ${RED}✗${NC} $1"; ((FAIL++)); }
info() { echo -e "▸ $1"; }

echo ""
echo "═══════════════════════════════════════════════"
echo "  Provider Branding Tests"
echo "═══════════════════════════════════════════════"
echo ""

# 1. Branding registry
info "Branding Registry"
BRANDS=$(node -e "
const fs = require('fs');
const src = fs.readFileSync('src/config/provider-branding.ts', 'utf8');
const ids = [...src.matchAll(/^\s{2}(?:\x27)?([a-z][a-z0-9-]+)(?:\x27)?:\s*\{/gm)].map(m => m[1]).filter(id => id !== 'capabilities');
const names = [...src.matchAll(/name:\s*\x27([^\x27]+)\x27/g)].map(m => m[1]);
const logos = [...src.matchAll(/logo:\s*\x27([^\x27]+)\x27/g)].map(m => m[1]);
let errors = 0;
if (ids.length !== names.length) errors++;
if (ids.length !== logos.length) errors++;
const dupes = ids.filter((v, i) => ids.indexOf(v) !== i);
if (dupes.length) errors++;
let missing = 0;
for (const logo of logos) { if (!fs.existsSync('public' + logo)) missing++; }
if (missing) errors++;
console.log(errors === 0 ? 'OK:' + ids.length : 'ERRORS:' + errors);
" 2>/dev/null)

if echo "$BRANDS" | grep -q "^OK:"; then
  COUNT=$(echo "$BRANDS" | sed 's/OK://')
  pass "All $COUNT providers have valid branding"
else
  fail "Branding issues: $BRANDS"
fi

# 2. Logo files
info "Logo Files"
LOGO_COUNT=$(ls public/assets/providers/*.svg 2>/dev/null | wc -l)
if [ "$LOGO_COUNT" -ge "20" ]; then
  pass "Provider logos: $LOGO_COUNT SVG files"
else
  fail "Only $LOGO_COUNT logo files (expected 20+)"
fi

# 3. Source types
info "Source Types"
SI=$(grep -c "simple-icons" src/config/provider-branding.ts)
CF=$(grep -c "custom-fallback" src/config/provider-branding.ts)
pass "Source: $SI simple-icons, $CF custom-fallback"

# 4. Landing page logos
info "Landing Page Logos"
LANDING_LOGOS=$(curl -s http://localhost:8080/8router/ | grep -c "prov-logo")
if [ "$LANDING_LOGOS" -gt "10" ]; then
  pass "Landing page: $LANDING_LOGOS logo instances"
else
  fail "Landing page only $LANDING_LOGOS logo instances"
fi

# 5. Dashboard logos
info "Dashboard Logos"
DASH_LOGOS=$(curl -s http://localhost:8080/8router/dashboard | grep -c "provLogo\|prov-logo")
if [ "$DASH_LOGOS" -gt "5" ]; then
  pass "Dashboard: $DASH_LOGOS logo instances"
else
  fail "Dashboard only $DASH_LOGOS logo instances"
fi

echo ""
echo "═══════════════════════════════════════════════"
echo -e "  Results: ${GREEN}$PASS passed${NC}, ${RED}$FAIL failed${NC}"
echo "═══════════════════════════════════════════════"

if [ "$FAIL" -gt "0" ]; then exit 1; fi
