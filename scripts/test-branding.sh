#!/bin/bash
# 8Router — Logo & Branding Verification Test
# Checks: all provider + integration logos exist, valid SVGs, no broken images

set +e
PASS=0; FAIL=0; WARN=0

check() {
  local desc="$1" result="$2"
  if [ "$result" = "pass" ]; then
    echo "  ✅ $desc"; ((PASS++))
  elif [ "$result" = "warn" ]; then
    echo "  ⚠️  $desc"; ((WARN++))
  else
    echo "  ❌ $desc"; ((FAIL++))
  fi
}

echo "═══ Provider Logo Check ═══"

PROVIDERS=(openai anthropic gemini xai mistral groq openrouter deepseek together cohere perplexity replicate ollama lmstudio vllm mimo antigravity cerebras sambanova fireworks azure aws-bedrock vertex-ai)

for p in "${PROVIDERS[@]}"; do
  FILE="/root/8router/public/assets/providers/${p}.svg"
  if [ ! -f "$FILE" ]; then
    check "$p.svg — MISSING" "fail"
    continue
  fi
  SIZE=$(wc -c < "$FILE")
  if [ "$SIZE" -lt 100 ]; then
    check "$p.svg — too small (${SIZE}B)" "fail"
    continue
  fi
  # Check if it's a text fallback (just has <text> with no <path>/<circle>/<rect>)
  if grep -q '<text' "$FILE" && ! grep -q '<path\|<circle\|<rect' "$FILE"; then
    check "$p.svg — text monogram (${SIZE}B)" "warn"
  else
    check "$p.svg — valid (${SIZE}B)" "pass"
  fi
done

echo ""
echo "═══ Integration Logo Check ═══"

INTEGRATIONS=(cursor cline continue roo-code open-webui claude-code codex-cli hermes-agent)

for i in "${INTEGRATIONS[@]}"; do
  FILE="/root/8router/public/assets/integrations/${i}.svg"
  if [ ! -f "$FILE" ]; then
    check "$i.svg — MISSING" "fail"
    continue
  fi
  SIZE=$(wc -c < "$FILE")
  if [ "$SIZE" -lt 100 ]; then
    check "$i.svg — too small (${SIZE}B)" "fail"
  else
    check "$i.svg — exists (${SIZE}B)" "pass"
  fi
done

echo ""
echo "═══ Landing Page Logo References ═══"

LANDING="/root/8router/src/landing.ts"

# Check provider logos referenced in landing
for p in openai anthropic gemini xai groq openrouter mistral deepseek together cohere perplexity ollama lmstudio vllm; do
  if grep -q "providers/${p}.svg" "$LANDING"; then
    check "Landing references $p.svg" "pass"
  else
    check "Landing references $p.svg" "fail"
  fi
done

# Check integration logos referenced in landing
for i in cursor cline continue roo-code open-webui claude-code codex-cli hermes-agent; do
  if grep -q "integrations/${i}.svg" "$LANDING"; then
    check "Landing references $i.svg" "pass"
  else
    check "Landing references $i.svg" "fail"
  fi
done

echo ""
echo "═══ Live Server Check ═══"

# Check if server is running
if curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/8router/ | grep -q 200; then
  check "Landing page serves 200" "pass"
else
  check "Landing page serves 200" "fail"
fi

# Spot-check a few logo URLs
for asset in "assets/providers/openai.svg" "assets/providers/groq.svg" "assets/integrations/cursor.svg" "assets/integrations/hermes-agent.svg"; do
  STATUS=$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:8080/${asset}")
  if [ "$STATUS" = "200" ]; then
    check "GET /${asset} → 200" "pass"
  else
    check "GET /${asset} → ${STATUS}" "fail"
  fi
done

echo ""
echo "═══ Summary ═══"
echo "  ✅ Passed: $PASS"
echo "  ⚠️  Warn:   $WARN"
echo "  ❌ Failed: $FAIL"
echo "  Total:     $((PASS + WARN + FAIL))"

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
