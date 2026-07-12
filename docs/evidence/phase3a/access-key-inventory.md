# Access Key Inventory — Phase 3A.4

## Internal Keys

| Display Name | Purpose | Created | Status | Scope |
|--------------|---------|---------|--------|-------|
| internal-smoke | Smoke testing | 2026-07-12 | Active | Phase 3A testing |

## Beta Keys

| Display Name | Purpose | Created | Status | Owner |
|--------------|---------|---------|--------|-------|
| (pending) | Beta user | — | — | — |

---

## Access Key Security

### Storage
- ✅ Access keys stored as HMAC-SHA256 hashes only
- ✅ Raw key shown once at creation
- ✅ Raw key never logged or stored
- ✅ Raw key never returned in API responses

### Format
```
sk-8router_<publicPrefix>_<secret>
```

### Lifecycle
- ✅ Create: Returns raw key once
- ✅ Revoke: Immediate invalidation
- ✅ Disable: Temporary suspension
- ✅ Enable: Re-activation
- ✅ Rotate: New key generated, old invalid

### Access Control
- ✅ Per-key rate limits
- ✅ Per-key daily/monthly request limits
- ✅ Per-key model/provider restrictions
- ✅ Per-key expiration
- ✅ Per-key enable/disable

---

## Beta Cohort Strategy

### Stage A: Internal (1-3 keys)
- Purpose: Smoke testing, integration testing
- Keys: internal-smoke, internal-streaming, internal-tooling
- Status: In progress

### Stage B: Trusted Beta (5-10 keys)
- Purpose: Real user testing, edge case discovery
- Keys: Named per user/project
- Status: Pending provider activation

### Stage C: Extended Beta (20+ keys)
- Purpose: Statistical significance for evidence gates
- Keys: Independent clients
- Status: Pending Stage B results

---

## Requirements for Evidence Gates

| Gate | Required | Current | Status |
|------|----------|---------|--------|
| Unique access keys | ≥ 20 | 1 | ⏳ PENDING |
| Independent owners | ≥ 20 | 1 | ⏳ PENDING |

## Notes

- Each beta participant should have an independent key
- Do not share one raw key among many users
- 20 unique keys should represent independent clients or meaningful usage contexts
- Do not create 20 dummy keys for one operator
