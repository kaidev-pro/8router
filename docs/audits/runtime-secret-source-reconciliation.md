# Runtime Secret Source Reconciliation

Repository: `/root/8router`  
VPS: `187.77.142.198`  
Branch: `main`  
Current HEAD: `1dc8868`

No `.env` values, process environment values, raw access keys, provider credentials, hashes, or encrypted payloads were printed or recorded.

## HEAD reconciliation

Previous documented audit HEAD `c41897cc162137e0ddb3b49912208fde17c4c509` is an ancestor of current `HEAD`.

```text
ancestor_exit=0
```

Commits added after previous audit:

```text
1dc8868 docs(security): verify runtime secret enforcement
461d892 fix(security): enforce required runtime secrets
```

| Commit | Classification |
|---|---|
| `461d892` | Code + tests: enforces required runtime secrets and production fail-closed behavior. |
| `1dc8868` | Documentation: verifies runtime secret enforcement and Phase 3A readiness notes. |

Current divergence:

```text
## main...origin/main [ahead 28]
rev-list origin/main...main = 0 28
```

## `.env` tracking, permissions, and history

`.env` exists at `/root/8router/.env`, contains sensitive credentials, and remains untracked.

```text
.gitignore:16:.env .env
check_ignore_exit=0
!! .env
tracked_check_exit=1
```

Permission was corrected without reading or changing contents:

```text
before: owner=root group=root mode=644 file=/root/8router/.env
after:  owner=root group=root mode=600 file=/root/8router/.env
```

Filename-only history checks for `.env` produced no output. No obvious reachable `.env` path exists in Git history.

## Effective service configuration

```text
FragmentPath=/etc/systemd/system/8router.service
DropInPaths=/etc/systemd/system/8router.service.d/secrets.conf
WorkingDirectory=/root/8router
ExecStart=/root/8router/node_modules/.bin/tsx src/index.ts
User=
Group=
MainPID=1109487
EnvironmentFiles=/etc/8router/secrets.env (ignore_errors=no)
```

Blank `User` and `Group` mean service runs as root. Unit does not directly declare `/root/8router/.env`; drop-in declares `/etc/8router/secrets.env`.

## Runtime environment presence

Presence-only `/proc/<pid>/environ` check:

```text
ACCESS_KEY_HASH_SECRET: PRESENT_IN_PROCESS_ENV
PROVIDER_KEY_ENCRYPTION_SECRET: PRESENT_IN_PROCESS_ENV
```

Earlier `NOT_LOADED_BY_RUNTIME` finding is superseded. Accurate status is `PRESENT_IN_PROCESS_ENV` via `EnvironmentFile=/etc/8router/secrets.env`.

## Environment loading chain

1. `/etc/systemd/system/8router.service`
2. `/etc/systemd/system/8router.service.d/secrets.conf`
3. `EnvironmentFile=/etc/8router/secrets.env`
4. `WorkingDirectory=/root/8router`
5. `ExecStart=/root/8router/node_modules/.bin/tsx src/index.ts`
6. runtime modules read `process.env` at operation time

No evidence found for `dotenv.config()`, `import "dotenv/config"`, Node `--env-file`, Next.js automatic env loading, custom parser, PM2 ecosystem config, or shell wrapper sourcing `/root/8router/.env` in production startup.

## `hash.ts` fail-closed audit

1. Undefined `ACCESS_KEY_HASH_SECRET`: status `missing`; production throws before creation/hash use.
2. Empty string: treated as missing.
3. Default value: none in production; dev fallback only outside production.
4. Random ephemeral secret: none.
5. Development fallback active in production: no.
6. Read timing: operation time, not import time.
7. Creation/verification path: both use `hashAccessKey()` / `getHashSecret()`; creation and rotation assert readiness; validation asserts readiness and returns invalid if absent.
8. Timing safety: `timingSafeEqual` after length check.
9. Restart verification: works if same `ACCESS_KEY_HASH_SECRET` is loaded; fails if secret changes.
10. Tests: `test:provider-activation-security` exercises `NODE_ENV=production` with missing/short secrets.

Classification: `FAIL_CLOSED_CONFIRMED`, `FALSE_NEGATIVE_RESOLVED`.

## Isolated missing-secret test

```text
npm run test:provider-activation-security
=== Results: 24 passed, 0 failed ===
```

Production enforcement tests passed for access-key creation and provider credential creation with absent/short secrets. No provider-backed traffic was run.

## Full-history secret scan

`gitleaks` installed and run with redaction:

```text
gitleaks version: 8.28.0
findings: 4
```

| Rule | File | Classification |
|---|---|---|
| `generic-api-key` | `src/__tests__/provider-credentials.test.ts` | TEST_FIXTURE |
| `generic-api-key` | `src/__tests__/provider-credentials.test.ts` | TEST_FIXTURE |
| `curl-auth-header` | `scripts/test-openai-compat.sh` | FALSE_POSITIVE |
| `curl-auth-header` | `scripts/test-openai-compat.sh` | FALSE_POSITIVE |

No `REAL_SECRET` found.

## Decision

`FALSE_NEGATIVE_RESOLVED`

Phase 3A remains `NOT_READY` until live validation prerequisites and runtime diagnostics are updated/validated end to end.

## Recommendation

Keep production secrets outside Git working tree. Current active source already follows target pattern:

```text
/etc/8router/secrets.env
```

Retire `/root/8router/.env` or mark it local-only after confirming no operator workflow depends on it.
