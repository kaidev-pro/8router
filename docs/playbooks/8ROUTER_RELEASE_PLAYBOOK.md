# 8Router Release Playbook

Version: 1.0  
Target: v1.0 Release Candidate preparation and owner-authorized release

## 1. Release modes

| Mode | Purpose | Production impact |
|---|---|---|
| Phase merge | Land reviewed capability behind safe flags | None by default |
| RC build | Produce immutable candidate and evidence | None by default |
| Staging validation | Validate deploy/migration/rollback in staging | Staging only |
| Production release | Owner-authorized deploy | Yes |
| Hotfix | Minimal fix for production regression/security issue | Yes |

An RC tag is not permission to deploy.

## 2. Version policy

- Follow semantic versioning.
- `1.0.0-rc.1`, `rc.2`, etc. represent immutable candidates.
- Every rebuilt candidate receives a new version; never move an existing tag.
- `1.0.0` requires the complete production release gate and owner authorization.
- Keep `package.json`, runtime version output, changelog, and release notes consistent.

## 3. RC entry criteria

Before branching for RC:

- Phase 5C–5F PRs are merged to `main`.
- `main` is clean and synchronized.
- All feature flags default safely.
- Four-provider batch is certified or has explicit, documented external blockers.
- Dashboard operations are authenticated, audited, and tested.
- Shadow/canary/cutover mechanisms are implemented and disabled by default.
- Backup, restore, migration, and rollback drills pass in a safe environment.
- No open P0/P1 issue.
- Architecture, security, operator, and release docs are current.

## 4. Build the candidate

Create `release/v1.0.0-rc.1` from verified `main`.

Preflight:

```bash
git status --short --branch
git fetch origin
git rev-parse HEAD
git rev-parse origin/main
git diff --check
npm ci
npx tsc --noEmit
npm run build
```

Run every repository test script relevant to runtime, provider foundation, dynamic state, discovery, certification, dashboard, routing, migration, security, and release. Enumerate scripts from `package.json`; do not rely on a stale hard-coded list.

Mandatory scanners/checks:

```bash
npm test
npm audit --omit=dev
gitleaks detect --source . --redact --no-banner
```

If `npm audit` reports findings, record severity, affected runtime path, remediation, and owner acceptance. Do not state `clean` unless there are zero relevant findings.

## 5. Artifact inspection

Inspect package contents before publish:

```bash
npm pack --dry-run
```

Reject an artifact containing:

- `.env` files;
- SQLite databases or backups;
- credentials, keys, tokens, certificates, or cookies;
- logs or raw evidence;
- test output and local caches;
- operator-specific hostnames/IPs;
- unnecessary source maps containing sensitive paths;
- development-only fixtures with realistic secrets.

Verify the CLI entrypoint, compiled imports, license, README, and Node support.

## 6. Database migration rehearsal

Use a sanitized copy of representative pre-Phase-5 and current databases.

For each:

1. Record checksum and schema.
2. Start the candidate with network/provider activation disabled.
3. Apply initialization/migration.
4. Inspect tables, columns, indexes, constraints, and row preservation.
5. Run application smoke tests.
6. Restart and prove idempotency.
7. Exercise restore/rollback strategy.
8. Confirm no credential plaintext or destructive state change.

SQLite rollback normally means restoring a verified backup plus reverting application code. Do not pretend a destructive migration is reversible merely because the binary can be downgraded.

## 7. Staging deployment

Requires staging authorization and known target.

Checklist:

- Capture current staging SHA/config version.
- Create and verify backup.
- Confirm flags disable live provider traffic unless specifically approved.
- Deploy the exact RC commit/artifact.
- Run health/readiness checks.
- Run authenticated dashboard/API smoke tests.
- Run one explicitly approved provider certification at a time.
- Validate logs, metrics, audit events, and redaction.
- Restart once to verify persistence/recovery.
- Rehearse rollback to the prior staging version.

Do not use production credentials in staging unless explicitly approved and scoped.

## 8. RC soak gate

Recommended staging soak: at least 24 hours for the final RC, longer when real canary traffic is introduced.

Observe:

- crashes/restarts and memory growth;
- database locks/integrity;
- job duplication/stuck state;
- provider error normalization;
- stream cancellation/leaks;
- authentication/rate-limit anomalies;
- discovery/certification freshness;
- shadow mismatch and cost budget;
- log/metric redaction.

Any code change creates a new RC and restarts the relevant soak period.

## 9. Production go/no-go

Owner authorization must explicitly name:

- version/SHA;
- production target;
- allowed migration;
- allowed restart/deploy window;
- provider traffic/canary scope;
- rollback authority.

Go only when:

- exact RC passed all gates;
- backup and restore evidence is current;
- rollback artifact/commit is available;
- operator and monitoring are present;
- kill switch is tested;
- change window and success/abort thresholds are documented.

## 10. Production deployment sequence

Adapt commands to the verified production runbook; never infer paths from old messages.

1. Announce change start and freeze unrelated changes.
2. Record current commit, service state, health, and traffic baseline.
3. Create and verify recoverable backups.
4. Confirm secrets/config without printing them.
5. Deploy exact immutable artifact/SHA.
6. Apply only reviewed migrations.
7. Restart/roll services using the approved method.
8. Verify liveness/readiness and database integrity.
9. Run non-billable smoke tests first.
10. If approved, enable bounded canary for named access keys/cohort.
11. Observe abort metrics through the defined window.
12. Expand only by explicit step; do not jump to 100%.
13. Record evidence and close the window.

## 11. Default abort conditions

Define numeric thresholds from real baselines before release. At minimum abort on:

- authentication or credential leakage;
- database corruption/migration failure;
- sustained elevated 5xx/error rate;
- material latency/TTFT regression;
- fallback loop or unexpected provider billing fan-out;
- loss of streaming termination/cancellation;
- audit/logging failure for administrative actions;
- health/readiness instability;
- inability to execute the kill switch.

## 12. Rollback

Rollback order:

1. Disable canary/new routing policy using the kill switch.
2. Restore last known-good routing snapshot.
3. Stop new discovery/certification jobs.
4. Revert application artifact/code.
5. Restore database only when schema/data compatibility requires it.
6. Restart using the approved procedure.
7. Verify health, routing, and data integrity.
8. Preserve evidence and open an incident report.

Never delete failed-release evidence during rollback.

## 13. GitHub release and package publication

These are separate Class C operations and require authorization.

Before publishing:

- Tag the exact approved commit with a signed/annotated immutable tag where supported.
- Generate release notes from reviewed commits and changelog.
- State migrations, flags, breaking changes, known limitations, and rollback.
- Attach only verified artifacts with checksums.
- Verify package identity and registry target.
- Publish once; do not overwrite an existing version.

## 14. Hotfix workflow

1. Branch `hotfix/<issue>` from the production tag/commit.
2. Make the smallest safe change.
3. Add regression proof.
4. Run the full security/build/test gates possible for the affected surface.
5. Open a focused PR and obtain required review.
6. Create a new patch/RC version.
7. Deploy only with explicit authorization.
8. Merge the fix forward into `main` without history rewriting.

Do not bundle refactors or feature work into a hotfix.

## 15. Post-release validation

Report:

- deployed SHA/version and target;
- migration and backup identifiers (non-secret);
- service/health results;
- smoke/canary results;
- routing snapshot/version;
- error, latency, fallback, and circuit comparison;
- security/redaction checks;
- deployment and rollback timestamps;
- incidents or limitations.

Continue monitoring through the agreed observation window. A successful deploy command is not a successful release.

## 16. RC report template

```markdown
# 8Router v1.0.0-rc.N Readiness Report

## Identity
- Candidate SHA:
- Branch/tag:
- Base main SHA:
- Artifact checksum:

## Validation
- TypeScript:
- Build:
- Test suites and counts:
- Migration rehearsal:
- Backup/restore drill:
- Gitleaks:
- Dependency audit:
- Artifact inspection:

## Provider readiness
- OpenAI Direct:
- Gemini Direct:
- xAI:
- Cerebras:

## Operational readiness
- Dashboard/API:
- Discovery/certification:
- Shadow/canary:
- Observability:
- Kill switch/rollback:

## Security
- Auth/CSRF/rate limit:
- SSRF/redaction:
- Secrets:
- Open findings:

## Production actions
- Deployed: NO unless explicitly authorized
- Restarted: NO unless explicitly authorized
- Traffic changed: NO unless explicitly authorized

## Decision
- READY_FOR_RC_TAG:
- READY_FOR_STAGING:
- READY_FOR_PRODUCTION_DEPLOY:
- Blockers:
```

