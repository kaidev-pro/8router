# 8Router v1.0.0-rc.1 — Deployment Plan

## Pre-Deployment Checklist

### 1. Environment Verification
- [ ] VPS: 187.77.142.198 (srv1785465)
- [ ] Node.js: v20.20.2
- [ ] npm: verified
- [ ] systemd: 8router.service active
- [ ] nginx: 8agents.xyz proxying to :8080
- [ ] DNS: 8agents.xyz → 187.77.142.198

### 2. Backup Current State
```bash
# Database backup
cp /root/8router/data/8router.db /root/8router/data/8router.db.backup.$(date +%Y%m%d%H%M%S)

# Current code backup
cd /root/8router
git stash  # if any uncommitted changes
git tag backup/pre-rc-1  # tag current state
```

### 3. Feature Flags (all default false)
Confirm in .env:
```
PROVIDER_MODEL_DISCOVERY_ENABLED=false
PROVIDER_MODEL_DISCOVERY_NETWORK_ENABLED=false
PROVIDER_MODEL_DISCOVERY_PERSIST_ENABLED=false
PROVIDER_OPERATIONS_MUTATION_ENABLED=false
PROVIDER_OVERRIDE_ENABLED=false
PROVIDER_CERTIFICATION_RUN_ENABLED=false
PROVIDER_SHADOW_ROUTING_ENABLED=false
PROVIDER_CANARY_ROUTING_ENABLED=false
PROVIDER_SNAPSHOT_ACTIVATION_ENABLED=false
PROVIDER_HARDENING_ENABLED=false
```

## Deployment Steps

### Step 1: Pull RC Code
```bash
cd /root/8router
git fetch origin
git checkout v1.0.0-rc.1
# or: git checkout main && git pull --ff-only origin main
```

### Step 2: Install Dependencies
```bash
npm ci --omit=dev
```

### Step 3: Build
```bash
npm run build
```

### Step 4: Verify Build
```bash
npx tsc --noEmit
node -e "const v=require('./dist/version.js');console.log(v.VERSION)"
# Expected: 1.0.0-rc.1
```

### Step 5: Database Migration Check
```bash
# Check if any new tables need to be created
node -e "require('./dist/database.js')"
# No destructive migrations expected
```

### Step 6: Restart Service
```bash
sudo systemctl restart 8router.service
sudo systemctl status 8router.service
```

### Step 7: Smoke Tests
```bash
# Health check
curl -s https://8agents.xyz/health | jq .

# Version check
curl -s https://8agents.xyz/8router/api/version | jq .

# Landing page
curl -s -o /dev/null -w "%{http_code}" https://8agents.xyz/

# API auth check (should return 401)
curl -s -o /dev/null -w "%{http_code}" https://8agents.xyz/8router/api/providers/catalog
```

### Step 8: Log Verification
```bash
journalctl -u 8router.service -n 20 --no-pager
# Check for startup errors
```

## Post-Deployment Verification

### Immediate (0-5 min)
- [ ] Service starts without errors
- [ ] Health endpoint returns 200
- [ ] Version shows 1.0.0-rc.1
- [ ] Landing page loads
- [ ] API returns 401 for unauthenticated requests
- [ ] No credential leaks in logs

### Short-term (5-30 min)
- [ ] No memory leaks (RSS stable)
- [ ] No error spikes in logs
- [ ] Existing provider connections work
- [ ] Dashboard accessible

### Monitoring (1-24 hours)
- [ ] Uptime stable
- [ ] Response times normal
- [ ] No circuit breakers tripping
- [ ] No rate limit false positives

## Rollback Plan

See: docs/runbooks/rollback-procedure.md

## Authorization Required

- [ ] User confirms deployment
- [ ] User confirms restart window
- [ ] User confirms monitoring period
