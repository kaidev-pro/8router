#!/bin/bash
# 8Router v1.0.0-rc.1 — Smoke Tests
# Run after deployment to verify basic functionality

set -e

BASE_URL="https://8agents.xyz"
PASS=0
FAIL=0

check() {
  local name="$1"
  local expected="$2"
  local actual="$3"
  
  if [ "$actual" = "$expected" ]; then
    echo "  ✅ $name"
    PASS=$((PASS + 1))
  else
    echo "  ❌ $name (expected: $expected, got: $actual)"
    FAIL=$((FAIL + 1))
  fi
}

echo "8Router v1.0.0-rc.1 Smoke Tests"
echo "================================"

# Health
echo ""
echo "Health Check:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/health")
check "Health endpoint" "200" "$STATUS"

# Version
echo ""
echo "Version Check:"
VERSION=$(curl -s "$BASE_URL/8router/api/version" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
check "Version is 1.0.0-rc.1" "1.0.0-rc.1" "$VERSION"

# Landing page
echo ""
echo "Landing Page:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/")
check "Landing page loads" "200" "$STATUS"

# API auth
echo ""
echo "API Authentication:"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE_URL/8router/api/providers/catalog")
check "Unauthenticated returns 401" "401" "$STATUS"

# Security headers
echo ""
echo "Security Headers:"
HSTS=$(curl -s -I "$BASE_URL/" | grep -i "strict-transport-security" | wc -l)
check "HSTS header present" "1" "$HSTS"

XFO=$(curl -s -I "$BASE_URL/" | grep -i "x-frame-options" | wc -l)
check "X-Frame-Options present" "1" "$XFO"

# Response time
echo ""
echo "Performance:"
TIME=$(curl -s -o /dev/null -w "%{time_total}" "$BASE_URL/health")
check "Response time < 2s" "fast" "$(echo "$TIME < 2" | bc)"

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"

if [ $FAIL -gt 0 ]; then
  echo "⚠️  Some checks failed. Investigate before proceeding."
  exit 1
else
  echo "✅ All smoke tests passed."
  exit 0
fi
