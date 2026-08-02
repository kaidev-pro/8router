# 8Router v1.0.0-rc.1 — Rollback Procedure

## Quick Rollback (< 2 minutes)

### Option A: Rollback to Pre-RC Code
```bash
cd /root/8router
git checkout backup/pre-rc-1  # or specific commit SHA
npm ci --omit=dev
npm run build
sudo systemctl restart 8router.service
```

### Option B: Rollback to Specific Commit
```bash
cd /root/8router
git log --oneline -10  # find target SHA
git checkout <SHA>
npm ci --omit=dev
npm run build
sudo systemctl restart 8router.service
```

## Database Rollback

### If No DB Migration Occurred
No database rollback needed. Code rollback is sufficient.

### If DB Migration Occurred
```bash
# Restore from backup
sudo systemctl stop 8router.service
cp /root/8router/data/8router.db.backup.* /root/8router/data/8router.db
sudo systemctl start 8router.service
```

## Verification After Rollback

```bash
# Version check
curl -s https://8agents.xyz/8router/api/version | jq .

# Health check
curl -s https://8agents.xyz/health | jq .

# Service status
sudo systemctl status 8router.service

# Logs
journalctl -u 8router.service -n 20 --no-pager
```

## Emergency Contacts

- VPS: 187.77.142.198 (Hetzner)
- SSH: ~/.ssh/hetzner_key
- Domain: 8agents.xyz
- Service: systemd 8router.service

## Rollback Decision Criteria

Rollback if:
- Service fails to start
- Health endpoint returns 5xx
- Version mismatch (expected vs actual)
- Credential leak detected
- Database corruption
- Critical security issue

Do NOT rollback for:
- Feature flag state (expected false)
- Missing optional features (expected in RC)
- Performance degradation (investigate first)
