# 8Router Agent Constitution

Version: 1.0  
Status: Mandatory  
Applies to: every human or AI agent changing 8Router

## 1. Purpose

This constitution defines non-negotiable operating rules. The Master Execution Playbook explains what to build; this document controls how the work is performed.

When instructions conflict, use this precedence:

1. Explicit owner instruction for the current task.
2. Security and authorization boundaries in this constitution.
3. Repository-local `AGENTS.md` and current architecture decisions.
4. The Master Execution Playbook.
5. Phase-specific plans and ordinary implementation preferences.

Never interpret an ambitious objective as permission to deploy, expose secrets, spend money, enable traffic, or destroy data.

## 2. Baseline and evidence

The reported Phase 5B baseline is:

- `main`: `6cdd15fb1434a11b6cda4a67537abd08c160b022`
- Phase 5A and 5B merged.
- Provider-focused tests: 405/405.
- Static provider descriptors are canonical in code.
- Dynamic provider state uses five database tables.
- Discovery, network, and persistence flags default to false.
- No provider activation or production routing change occurred.

This baseline is a checkpoint, not a fact to assume forever. At the beginning of an execution:

```bash
git status --short --branch
git rev-parse HEAD
git rev-parse origin/main
git log --oneline --decorate -20
```

If the checkout does not contain the reported Phase 5A/5B implementation, stop and report the mismatch. Do not silently recreate, cherry-pick, or overwrite it.

## 3. Authorization classes

### Class A — allowed by an implementation request

- Read repository files and history.
- Create a feature branch.
- Edit code, tests, documentation, fixtures, and migrations in scope.
- Run local builds, tests, linters, scanners, and mock services.
- Create local commits.
- Push the explicitly named feature branch when the playbook requests publication.
- Open a draft or normal PR when the playbook requests it.

### Class B — allowed only when explicitly included in the current playbook run

- Merge a PR after all gates pass and branch protection permits it.
- Update local `main` from `origin/main` using non-destructive fast-forward operations.
- Run controlled network certification against explicitly approved provider endpoints using already-configured credentials.

### Class C — requires fresh owner authorization

- Production deployment or service restart.
- Production database migration.
- Enabling production provider traffic, canary traffic, or routing cutover.
- Changing production secrets, DNS, firewall, Cloudflare, systemd, or reverse proxy configuration.
- Spending money or running potentially billable load/benchmark tests.
- Deleting branches, tags, releases, data, credentials, backups, or evidence.
- Publishing an npm package or GitHub Release.

If Class C authorization is absent, prepare the change and stop at release/cutover readiness.

## 4. Absolute prohibitions

The agent must never:

- Force-push.
- Rewrite published history.
- Commit directly to `main`.
- Use destructive commands such as `git reset --hard` or broad recursive deletion.
- Print, log, snapshot, or return plaintext credentials.
- Place secrets in tests, fixtures, documentation, PR text, shell history, query strings, or screenshots.
- Invent a passing test, successful deployment, provider response, metric, review, or SHA.
- claim runtime proof from source inspection alone.
- activate routing as a side effect of discovery, certification, migration, or dashboard work.
- weaken auth, CSRF, access-key, encryption, rate-limit, or redaction controls merely to make tests pass.
- make real provider requests from unit tests.
- merge with failing required checks or unresolved security findings.

## 5. Repository hygiene

Before editing:

```bash
git status --short
git branch --show-current
git diff --stat
```

Rules:

- Preserve pre-existing user changes.
- Do not include unrelated formatting or generated artifacts.
- Keep fixtures deterministic and scanner-safe.
- Do not modify lockfiles unless dependencies actually change.
- Prefer additive, reversible migrations.
- Every migration must be idempotent or explicitly guarded.
- Feature flags must have safe defaults and documented rollback behavior.

## 6. Branch and commit rules

Use one branch per phase:

- `phase5c/certified-provider-batch`
- `phase5d/provider-operations-dashboard`
- `phase5e/shadow-routing-cutover-readiness`
- `phase5f/production-hardening-v1-rc`

Start each phase from the latest verified `origin/main`. Do not stack a new phase on an unmerged feature branch.

Commit rules:

- Use Conventional Commits.
- Separate implementation, tests, and documentation when that improves reviewability.
- Never squash locally just to hide intermediate security or migration work.
- A PR may be squash-merged after review if repository policy allows it.

## 7. Test and evidence rules

Every changed behavior needs proof at the correct layer:

| Claim | Minimum proof |
|---|---|
| Pure logic | Unit test |
| HTTP contract | Runtime request test |
| Schema/index | Database introspection test |
| Migration | Upgrade, idempotency, and rollback/compatibility evidence |
| CLI | Executed CLI test with redacted output |
| Provider integration | Contract test plus controlled certification evidence |
| Routing behavior | Deterministic simulation, shadow comparison, and explicit safety proof |
| UI behavior | Component/runtime test and visual inspection |
| Production behavior | Authorized post-deploy smoke test and telemetry evidence |

Source grep is useful safety evidence but never substitutes for runtime behavior.

Tests must not depend on test order, live network, developer credentials, local clock ambiguity, or mutable external model catalogs.

## 8. Credential handling

- Credentials enter through the existing encrypted credential subsystem or approved environment mechanism.
- Raw values are write-only and shown at most once when product behavior requires it.
- Database records store ciphertext and non-secret metadata, never plaintext.
- API and CLI responses use stable credential IDs and masked hints.
- Logs redact authorization headers, API keys, cookies, URLs containing tokens, and provider error bodies that may echo secrets.
- Discovery receives a credential reference, not raw credential material from controllers or UI.
- Test credentials use unmistakably fake scanner-safe values.
- Run `gitleaks` before every PR and after merge.

## 9. Provider safety

Provider onboarding, discovery, certification, health, routing, and activation are separate states.

Required lifecycle:

```text
defined -> credentialed -> discovered -> certified -> shadow-ready
        -> canary-approved -> active -> suspended/deprecated
```

No stage may implicitly advance another. In particular:

- Discovery must not activate a provider.
- Certification must not mutate routing.
- Dashboard actions must not bypass lifecycle validation.
- A provider marked unhealthy must not be silently re-enabled.
- Model disappearance must be recorded before any destructive catalog change.
- A failed discovery must preserve the last known-good dynamic state.

## 10. Network rules

Network access is deny-by-default.

Real discovery requires all of the following:

- `DISCOVERY_ENABLED=true`
- `NETWORK_ENABLED=true`
- a provider allowlist containing the target provider
- a configured credential reference
- an explicit execution command or operator action
- bounded timeout, response-size limit, retry budget, and concurrency
- provider endpoint allowlist and SSRF-safe URL handling

Scheduled or startup discovery is prohibited until Phase 5F explicitly approves it. Even then, it must be disabled by default and protected by leases/locks.

## 11. Database rules

- Static descriptors remain canonical in code.
- Dynamic model rows, overrides, certification evidence, discovery history, and operational metadata may persist in the database.
- No credential columns may be added to provider-state tables.
- All writes use transactions where partial state would be harmful.
- Timestamps use the repository's canonical format and timezone policy.
- Migrations must work on a copy of a representative existing database.
- Destructive cleanup requires a separate retention policy and owner approval.

## 12. API rules

Provider administration endpoints must:

- Require the existing authenticated founder/admin boundary.
- Use `Cache-Control: no-store` for sensitive operational data.
- Validate query and body fields with allowlists and stable 4xx responses.
- Apply CSRF protection to mutations where browser sessions are accepted.
- Apply rate limits to mutation, discovery, certification, and credential operations.
- Return structured, sanitized errors without stack, SQL, path, env, or secret leakage.
- Enforce pagination with a maximum page size of 100 unless a documented exception exists.
- Emit audit events for every mutation.

## 13. Review and merge gates

A PR is mergeable only when:

- The branch is based on current `main`.
- Diff scope matches the phase.
- All required automated checks pass.
- Runtime tests cover new API behavior.
- Migrations are verified.
- Gitleaks is clean.
- Evidence and architecture docs are updated.
- No unresolved review thread remains.
- Rollback behavior is documented.
- The working tree is clean.

If repository protection requires a human review, stop with the PR ready and provide the exact blocker. Do not bypass protection.

## 14. Reporting rules

Every phase report must include:

- Starting and final SHA.
- Branch and PR URL/number.
- Exact commits and changed files.
- Schema and migration changes.
- API, CLI, UI, and flags added or changed.
- Tests by suite with actual counts.
- TypeScript, build, regression, and gitleaks results.
- Network calls performed, including provider and purpose; say `none` when none.
- Credential access proof.
- Routing impact proof.
- Deployment/restart/traffic status.
- Known limitations and blockers.
- Working-tree state.
- A truthful readiness decision.

Use `PASS`, `FAIL`, `BLOCKED`, or `NOT RUN`. Never convert `NOT RUN` into `PASS`.

## 15. Stop conditions

Stop immediately and report when:

- Baseline or branch identity is uncertain.
- Unrelated user changes overlap the task.
- A secret is found in history, diff, output, or fixture.
- A migration could lose or corrupt data.
- A real provider call would be billable and is not authorized.
- Required credentials are absent or invalid.
- A provider response violates the expected security boundary.
- Tests are flaky or fail for an unexplained reason.
- Required review or merge permission is unavailable.
- Production access, deployment, restart, or cutover would be required without authorization.

Stopping at a genuine authorization boundary is correct execution, not failure.

