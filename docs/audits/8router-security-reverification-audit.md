# 8Router Security Re-Verification Audit (2026-07-15)

## 1. Access Keys
- **Prefix `sk-8router_`:** Confirmed. Used in `src/security/access-keys/generate.ts`.
- **Raw key handling:** Raw key is returned only upon creation. It is NOT stored.
- **Storage mechanism:** Stored as an HMAC-SHA256 hash.
- **Verification:** Uses constant-time comparison.
- **Environment Dependency:** `ACCESS_KEY_HASH_SECRET` is required in production; fails closed if missing.
- **Status:** CORRECTED / CONFIRMED. Prior claims that this was missing are dismissed.

## 2. Provider Credential Encryption
- **Algorithm:** `aes-256-gcm`. Confirmed in `src/security/credentials/encrypt.ts`.
- **Nonce/IV:** Random 12-byte IV generated per encryption.
- **Authentication tag:** Included to prevent ciphertext tampering.
- **Environment Dependency:** `PROVIDER_KEY_ENCRYPTION_SECRET` is required in production; fails closed if missing.
- **Status:** CORRECTED / CONFIRMED. Prior claims that encryption was missing are dismissed.

## 3. General Security Posture
- **Secret Redaction:** Logs and dashboard sanitize `sk-8router_` and provider credentials.
- **Error Messages:** Normalized, do not leak raw upstream keys.
- **Authorization boundaries:** Need further refinement for team workspaces (currently local/admin focus).

## Conclusion
The fundamental security architecture (keys, encryption, redaction) matches the PRD requirements and is implemented in the canonical repository.
