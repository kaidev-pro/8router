# Access-Key Smoke Testing Runbook

Goal: create one internal smoke key safely.

1. Ensure ACCESS_KEY_HASH_SECRET is loaded by runtime.
2. Create key via dashboard/API with label internal-smoke.
3. Copy raw key once to secure operator channel; do not save to repo, docs, logs, or shell history.
4. Record only key ID and masked fingerprint, e.g. sk-8router_****abcd.
5. Test invalid key rejection.
6. Test valid key with invalid model.
7. Test valid key with valid provider/model.
8. Revoke/delete key after smoke unless owner approves keeping it.
