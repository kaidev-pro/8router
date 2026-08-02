# 8Router Master Execution Playbook — Phase 5C to v1.0 RC

Version: 1.0  
Execution mode: End-to-end, evidence-driven  
Owner: Bagus / 8Router

## 0. Agent directive

Execute this playbook from Phase 5C through Phase 5F and prepare a v1.0 Release Candidate without repeatedly asking for ordinary implementation decisions.

Use best engineering judgment inside the defined architecture. Pause only for a real stop condition: missing authority, unavailable credential, security risk, conflicting user changes, destructive migration risk, protected merge/review requirement, or unexplained failing gate.

Read these companion documents before changing code:

1. `8ROUTER_AGENT_CONSTITUTION.md`
2. `8ROUTER_ARCHITECTURE_BIBLE.md`
3. `8ROUTER_SECURITY_CONSTITUTION.md`
4. `8ROUTER_RELEASE_PLAYBOOK.md`

Repository-local instructions and current owner direction remain authoritative.

## 1. Mission

Advance 8Router from the reported Phase 5B baseline to a v1.0 RC that is:

- capable of safely onboarding, discovering, and certifying OpenAI Direct, Gemini Direct, xAI, and Cerebras;
- operable through an authenticated provider dashboard and APIs;
- shadow/canary/cutover-ready through versioned routing state;
- hardened for migration, recovery, observability, security, and release;
- disabled-by-default for new production traffic until owner-authorized.

The endpoint is `READY_FOR_V1_RC`, not automatic production deployment.

## 2. Reported starting checkpoint

```text
main: 6cdd15fb1434a11b6cda4a67537abd08c160b022
Phase 5A: merged as aca0981
Phase 5B: merged as 6cdd15f
provider foundation: 90/90
provider foundation API: 19/19
dynamic state: 74/74
discovery: 26/26
provider connections: 24/24
provider connection preview: 43/43
provider connection migration: 80/80
full regression: 49/49
reported total: 405/405
working tree: clean
```

Do not proceed from an older ZIP/snapshot. Verify the actual Git checkout contains the Phase 5A/5B work. If the live repository differs, produce a reconciliation report before editing.

## 3. Global workflow

For each phase:

1. Synchronize and verify `main`.
2. Create the named feature branch.
3. Write a phase plan and traceability matrix in `docs/evidence/<phase>/`.
4. Implement in small reviewable commits.
5. Run focused tests continuously.
6. Run the full phase gate.
7. Update architecture, runbook, evidence, and changelog documents.
8. Confirm expected diff and clean working tree.
9. Push normally, open PR, inspect checks/reviews, and address actionable feedback.
10. Merge only when authorized by this playbook, branch rules permit it, and every gate passes.
11. Synchronize local `main` and run post-merge verification.
12. Start the next phase only from merged `main`.

Never stack Phase 5D on an unmerged 5C branch, and so on.

## 4. Universal preflight

Run at the start of every phase:

```bash
git status --short --branch
git fetch origin
git checkout main
git pull --ff-only origin main
git rev-parse HEAD
git rev-parse origin/main
git log --oneline --decorate -20
git diff --check
node --version
npm --version
```

Then inspect:

- `AGENTS.md` and repository instructions;
- `package.json` scripts;
- migrations/database initialization;
- current provider descriptors/adapters;
- provider foundation/dynamic-state APIs and tests;
- credential manager and redaction utilities;
- router, canonical bridge, health, circuit breaker, usage, and dashboard;
- existing evidence/runbook conventions.

Create `docs/evidence/<phase>/baseline.md` with actual SHA, relevant scripts, schema, flags, routes, and gaps. Never copy old test counts as new results.

## 5. Universal quality gate

Every phase must run:

```bash
git diff --check
npx tsc --noEmit
npm run build
npm test
gitleaks detect --source . --redact --no-banner
```

Also run every focused script affected by the phase, discovered from `package.json`. If a required script is missing, add a real runner or integrate the test into the canonical suite; do not record a nonexistent command as passed.

Run `npm audit --omit=dev` and truthfully record results. A finding is not automatically a blocker, but an unexplained reachable high/critical issue is.

## 6. Phase 5C — Certified Provider Batch Expansion

Branch: `phase5c/certified-provider-batch`  
PR title: `feat(providers): add certified provider batch expansion`

### 6.1 Objective

Add controlled real-provider foundations for OpenAI Direct, Gemini Direct, xAI, and Cerebras. Finish with each provider defined, credential-reference-ready, discoverable and certifiable behind flags, visible through read APIs, and unable to affect active routing.

### 6.2 Phase 5C.0 — Reconciliation

Inventory existing provider IDs, adapters, credentials, model catalogs, capabilities, API routes, CLI commands, and test fixtures.

Produce:

- provider collision report;
- reuse-vs-new adapter decision for each provider;
- endpoint/SSRF policy;
- credential metadata mapping;
- capability normalization matrix;
- certification profiles;
- explicit non-goals and routing non-impact proof plan.

Do not create duplicate IDs such as `openai` and `openai-direct` unless the distinction is intentional and documented.

### 6.3 Phase 5C.1 — Provider contracts

For each provider:

- Add or complete one static canonical descriptor.
- Bind to an existing adapter when contracts match; extend rather than fork duplicated logic.
- Define fixed/allowlisted endpoint policy.
- Define auth placement without storing raw secrets in descriptor/state.
- Declare supported capabilities conservatively.
- Add deterministic model/capability normalization.
- Add provider-specific error and rate-limit normalization.
- Document unsupported or unverified features.

Provider notes:

- OpenAI Direct: cover Chat Completions and Responses only where the current canonical bridge supports them; do not claim unsupported parity.
- Gemini Direct: use the native Gemini bridge/adapter and verify model/tool/multimodal differences.
- xAI: treat OpenAI compatibility as a tested subset, not an assumption.
- Cerebras: treat OpenAI compatibility as a tested subset; enforce provider-specific limits.

### 6.4 Phase 5C.2 — Credential onboarding boundary

Integrate provider credentials with the existing encrypted credential subsystem:

- credential create/replace/revoke remains separate from provider dynamic-state tables;
- API returns stable ID, provider ID, timestamps, status, and masked hint only;
- raw secret is never readable after creation;
- discovery/certification receives credential reference IDs;
- add redaction and canary-secret tests;
- document environment/config prerequisites without including secret values.

Do not ask the owner to paste credentials into chat or documentation. If configured credentials are absent, complete implementation and mock/contract validation, then mark only live certification as `BLOCKED_CREDENTIALS`.

### 6.5 Phase 5C.3 — Real discovery adapters

Replace mock-only behavior with controlled network-capable implementations while preserving deterministic mock tests.

Required gates:

```text
DISCOVERY_ENABLED=true
NETWORK_ENABLED=true
PERSIST_ENABLED=true (only for persistence)
provider explicitly allowlisted
credential reference present
operator-triggered execution
```

Implement:

- bounded timeout, retries, concurrency, response size, and model count;
- SSRF-safe endpoint resolution;
- provider-specific list-model request;
- strict response validation;
- normalized dynamic rows with provenance/freshness;
- transactional persistence and last-known-good preservation;
- per-provider lock/idempotency;
- sanitized history/errors;
- dry-run mode that performs no persistence;
- no startup or implicit scheduled discovery.

### 6.6 Phase 5C.4 — Certification engine

Add versioned certification profiles and executor:

- `dry-run`: validate plan, flags, provider, credential reference, and estimated calls;
- `mock`: deterministic adapter contract tests;
- `live`: operator-triggered, allowlisted, bounded, potentially billable, and only when authorized/configured.

Persist sanitized evidence with expiry. Certification must never update active routing or operational enablement.

At minimum test authentication, model listing, simple completion, streaming, cancellation, usage normalization, error mapping, and declared optional capabilities.

### 6.7 Phase 5C.5 — APIs and CLI

Use existing route conventions. Add only missing operations:

- create/view discovery run;
- create/view certification run;
- provider-specific readiness/detail;
- read sanitized evidence/history.

Mutations require auth, authorization, CSRF where applicable, rate limits, validation, audit, and `no-store`.

CLI commands must support human and JSON output, stable exit codes, dry-run, provider selection, and redaction. No command may default to live network.

### 6.8 Phase 5C tests

Add real tests for:

- descriptor validation and uniqueness;
- provider-specific discovery normalization;
- malformed/oversized provider responses;
- timeouts, retries, cancellation, and rate limits;
- SSRF/redirect rejection;
- flag/allowlist/credential gates;
- dry-run/no-persist behavior;
- transactional last-known-good behavior;
- certification status/expiry and sanitized evidence;
- authenticated runtime APIs and stable errors;
- CLI redaction/exit codes;
- no credential columns/response fields;
- no active routing import/mutation;
- no network in default test runs.

Use local mock HTTP servers for runtime network behavior. Real provider calls are certification evidence, not unit tests.

### 6.9 Optional controlled live certification

Only run when already-configured credentials, network authorization, and budget authorization are available. Execute one provider at a time with the smallest safe request set. Never print response content or credentials. Record call count, sanitized result, and estimated/known cost.

If live certification cannot run, this does not invalidate code readiness; it blocks `LIVE_CERTIFIED` and later canary eligibility for that provider.

### 6.10 Phase 5C acceptance

- Four providers reconciled with no duplicate architecture.
- Network-capable discovery is fully gated and disabled by default.
- Certification engine/evidence exists and cannot mutate routing.
- Mock/runtime contract tests pass.
- Credential canaries never leak.
- Static descriptors remain canonical.
- Dynamic writes are transactional.
- No startup discovery.
- No production traffic/deploy/restart.
- Full quality gate passes.
- Phase evidence states each provider as `IMPLEMENTED`, `MOCK_CERTIFIED`, `LIVE_CERTIFIED`, or truthfully blocked.

### 6.11 Phase 5C publication

Commit recommendations:

```text
feat(providers): add batch provider contracts
feat(discovery): add gated real provider discovery
feat(certification): add provider certification evidence
test(providers): cover batch discovery and certification
docs(providers): record phase5c evidence and runbooks
```

Push normally, open PR, review changed files/checks, resolve feedback, and merge only when all gates pass. Then sync `main` and repeat focused/full validation.

## 7. Phase 5D — Dashboard and Provider Operations

Branch: `phase5d/provider-operations-dashboard`  
PR title: `feat(dashboard): add provider operations control plane`

### 7.1 Objective

Create a clear authenticated operational surface for provider state without exposing secrets or allowing accidental activation.

### 7.2 Information architecture

Implement routes/views consistent with the existing dashboard:

- provider overview;
- provider detail;
- models and provenance;
- discovery history/run detail;
- certification evidence;
- overrides;
- credential status (masked metadata only);
- health/circuit and readiness;
- audit history.

The UI must visually distinguish:

- configured;
- credential present;
- discovered;
- certified and certification freshness;
- shadow-ready;
- enabled;
- receiving traffic.

### 7.3 Read operations

- Use authenticated APIs rather than direct database access from UI rendering logic.
- Add pagination/filtering and deterministic empty/error/loading states.
- Show source provenance for every model field affected by static/dynamic/override precedence.
- Show timestamps in explicit timezone/local formatting.
- Show sanitized blockers and recommended next action.

### 7.4 Mutations

Add only narrowly scoped actions:

- trigger dry-run/mock/live discovery according to permissions;
- trigger certification profile;
- create/update/remove model override;
- update non-routing operational metadata;
- cancel eligible jobs;
- rotate/revoke credential through the credential subsystem if already supported.

Do not add an easy `Activate` button during Phase 5D. Routing enablement belongs to Phase 5E gates.

All mutations require confirmation appropriate to impact, CSRF, rate limit, authorization, audit, idempotency, stable errors, and `no-store`.

### 7.5 Job UX

- Return immediately with job ID.
- Poll or stream sanitized status through an authenticated channel.
- Display queued/running/succeeded/failed/cancelled.
- Prevent duplicate clicks with server-side idempotency, not only disabled buttons.
- Preserve last known-good state on failure.

### 7.6 Accessibility and responsive quality

- Keyboard-operable controls and focus order.
- Proper labels, headings, table semantics, and contrast.
- Status meaning is not color-only.
- Responsive tables/cards for narrow screens.
- No layout shift from unknown model/error text.
- No secret-bearing data in HTML, hydration state, analytics, or clipboard affordances.

### 7.7 Phase 5D tests

- Authenticated/unauthenticated route behavior.
- CSRF and allowed-origin behavior.
- Role/permission boundaries.
- Mutation rate limits/idempotency/audit.
- XSS payload rendering in provider-supplied fields.
- Secret canaries absent from HTML/API/log/audit.
- Pagination/filter/empty/error/loading states.
- Static/dynamic/override provenance.
- Job polling/cancellation/recovery.
- No routing mutation from dashboard actions.
- Accessibility checks and visual QA at desktop/mobile widths.

### 7.8 Phase 5D acceptance

- Provider operations are understandable without reading database rows.
- Every mutation is authenticated, authorized, CSRF-protected where relevant, rate-limited, audited, and tested.
- Credential values never reach browser state.
- Dashboard cannot activate production routing.
- UI and runtime tests pass with visual evidence.
- Full quality gate passes.
- No deploy/restart/production traffic.

Publish, review, merge, and post-merge verify using the global workflow.

## 8. Phase 5E — Shadow Routing and Cutover Readiness

Branch: `phase5e/shadow-routing-cutover-readiness`  
PR title: `feat(routing): add shadow and canary cutover controls`

### 8.1 Objective

Connect certified provider state to an immutable routing eligibility snapshot and prove shadow/canary/rollback behavior without automatically changing production traffic.

### 8.2 Eligibility snapshot

Implement one canonical builder that combines:

- provider descriptor;
- resolved model registry;
- explicit operational enablement candidate;
- certification status/freshness policy;
- runtime health/circuit state;
- access-key/tenant routing policy;
- capability requirements;
- feature flags.

Output a deterministic, immutable, versioned snapshot with reasons for inclusion/exclusion. Persist or audit snapshot activation according to existing architecture.

### 8.3 Shadow evaluation

Support:

- fixture/offline replay as default;
- explicitly budgeted live shadow only when authorized;
- deterministic sampling by stable request/access-key hash;
- data minimization and opt-in policy;
- no effect on primary response;
- concurrency/cost ceilings and kill switch;
- normalized comparisons and sanitized evidence.

Never mirror tool actions or sensitive requests without an explicit safe policy.

### 8.4 Readiness scoring

Do not hide failures behind one opaque score. Produce a decision with components:

- certification current;
- sample size sufficient;
- protocol/stream/tool correctness;
- error-rate difference;
- latency/TTFT thresholds;
- usage/cost anomaly;
- health stability;
- security/redaction pass;
- rollback tested.

Thresholds must be configuration backed by evidence, not hard-coded guesses presented as universal truth.

### 8.5 Canary controls

Implement disabled-by-default canary configuration:

- provider/model target;
- eligible cohort or named internal access keys;
- maximum traffic percentage/request count/time window;
- automatic abort thresholds;
- operator kill switch;
- expiry and one-way-safe state machine;
- audit and snapshot version.

Canary must not begin merely because a configuration record exists. Activation is a separately authorized action.

### 8.6 Rollback

Prove rollback in deterministic tests and a safe environment:

- atomically return to last known-good snapshot;
- stop new target traffic;
- avoid in-flight corruption;
- preserve audit/evidence;
- avoid schema or credential rollback;
- remain functional when dashboard is unavailable through a documented CLI/API kill switch.

### 8.7 Phase 5E tests

- deterministic eligibility and exclusion reasons;
- immutable snapshot per request;
- certification expiry and health/circuit effects;
- deterministic shadow sampling;
- no primary-response impact;
- tool/sensitive request shadow exclusion;
- cost/concurrency/volume caps;
- mismatch/error/latency normalization;
- canary cohort/ceiling/expiry;
- automatic abort and manual kill switch;
- atomic rollback and restart recovery;
- no activation when flags/authorization are absent;
- legacy routing unchanged when all new flags are false.

### 8.8 Phase 5E acceptance

- New provider state reaches routing only through the canonical snapshot builder.
- Default flags preserve legacy behavior exactly.
- Shadow comparison is bounded, private, and non-authoritative.
- Canary controls cannot start traffic without explicit authorization.
- Kill switch and rollback are proven.
- No production traffic/deploy/restart occurs during implementation.
- Full quality gate passes.

Publish, review, merge, and post-merge verify using the global workflow.

## 9. Phase 5F — Production Hardening and v1.0 RC

Branch: `phase5f/production-hardening-v1-rc`  
PR title: `chore(release): harden 8router for v1 release candidate`

### 9.1 Objective

Close operational, security, migration, observability, recovery, and documentation gaps required to declare an immutable v1.0 RC candidate.

### 9.2 Reliability

- Health/readiness reflects database, job system, configuration, and routing snapshot viability.
- Discovery/certification locks recover from crash and expire safely.
- Graceful shutdown aborts/finishes streams and jobs safely.
- Retries use category allowlists, exponential backoff, jitter, and caps.
- Circuit breakers prevent provider failure storms.
- Streaming enforces idle/total timeout, cancellation, and memory bounds.
- SQLite busy/transaction behavior is tested under realistic concurrency.
- Retention for history/evidence/logs is bounded and non-destructive by default.

### 9.3 Observability

- Structured logs with correlation and routing snapshot IDs.
- Low-cardinality metrics for request, provider, routing, job, discovery, certification, health, and security outcomes.
- Operator dashboards/readouts for error, latency/TTFT, fallback, circuit, job, and freshness.
- Alerts have severity, threshold, runbook link, and anti-noise behavior.
- No prompt/completion/secret in logs or labels.

### 9.4 Backup, restore, and disaster recovery

- Document database/config/credential-key assets and separation.
- Create safe backup and integrity verification procedure.
- Perform restore drill in an isolated environment.
- Prove schema initialization/idempotency after restore.
- Define RPO/RTO targets as owner-approved operational goals.
- Document failure modes for lost database vs lost encryption key.
- Never claim DR pass from backup creation alone.

### 9.5 Security closure

- Update threat model.
- Test SSRF, auth, CSRF, rate limits, injection, XSS, redaction, access-key enumeration, resource exhaustion, and routing authorization.
- Review dependency and package contents.
- Run gitleaks and secret-canary suite.
- Confirm no production credential in Git, database fixtures, artifacts, or evidence.
- Resolve or document every security finding with owner/expiry.

### 9.6 Performance and resilience

Use deterministic/local load where possible. Establish evidence-backed budgets for:

- baseline gateway overhead;
- streaming TTFT overhead;
- memory per concurrent stream;
- database/job throughput;
- fallback/circuit behavior;
- dashboard/API pagination;
- discovery response size/model count.

Real-provider load is billable and requires explicit authorization. Never turn a unit test into load against a provider.

### 9.7 Documentation closure

Update:

- README quick start and security boundaries;
- architecture and provider lifecycle;
- credential, discovery, certification, dashboard, shadow, canary, kill-switch, backup/restore, incident, and release runbooks;
- API/CLI reference;
- migrations/upgrades;
- configuration/feature-flag matrix;
- changelog and known limitations;
- traceability matrix from Phase 5C–5F requirements to tests/evidence.

### 9.8 RC validation matrix

Run all scripts from `package.json` that are safe and relevant. Categorize:

- unit;
- runtime API;
- database/migration;
- bridge/protocol;
- provider discovery/certification;
- credential/access-key/security;
- routing/health/shadow/canary;
- dashboard/i18n/responsive;
- integration/smoke;
- live/billable (`NOT RUN` without authorization).

No unexplained skip is allowed. Live tests may remain `NOT RUN` with an explicit external blocker and cannot support a `LIVE_CERTIFIED` claim.

### 9.9 Phase 5F acceptance

- All non-live automated gates pass.
- Backup/restore and rollback drills pass in a safe environment.
- Observability and runbooks cover every critical failure.
- No unresolved P0/P1 bug or reachable unaccepted high/critical security issue.
- New provider/routing features remain disabled by default.
- Package dry-run contains no sensitive/unnecessary artifact.
- Full phase evidence and traceability are complete.
- No production deploy/restart/traffic unless separately authorized.

Publish, review, merge, and post-merge verify using the global workflow.

## 10. Prepare v1.0 Release Candidate

After Phase 5F is merged and verified:

1. Follow `8ROUTER_RELEASE_PLAYBOOK.md`.
2. Create `release/v1.0.0-rc.1` from verified `main`.
3. Update version/changelog/release evidence only; no feature work.
4. Run the complete RC gate and migration/restore rehearsal.
5. Inspect `npm pack --dry-run` contents.
6. Create an RC PR.
7. Merge only if all gates pass.
8. Create a tag/release/package only with explicit owner authorization.
9. Do not deploy production automatically.

## 11. Required evidence tree

Use the repository's existing evidence conventions. Recommended structure:

```text
docs/evidence/
  phase5c/
    baseline.md
    provider-matrix.md
    discovery-certification-report.md
    security-report.md
    final-readiness-report.md
  phase5d/
    baseline.md
    api-ui-contract-report.md
    accessibility-visual-qa.md
    security-report.md
    final-readiness-report.md
  phase5e/
    baseline.md
    shadow-comparison-report.md
    canary-rollback-drill.md
    routing-non-impact-report.md
    final-readiness-report.md
  phase5f/
    baseline.md
    reliability-observability-report.md
    backup-restore-drill.md
    security-closure.md
    rc-readiness-report.md
```

Evidence must contain commands/results/SHA/context but no secrets, raw prompts, raw completions, or sensitive provider bodies.

## 12. Readiness states

Use these exact meanings:

- `READY_FOR_PUSH`: branch gates pass and diff is scoped.
- `READY_FOR_MERGE`: push/PR/checks/review gates pass.
- `READY_FOR_NEXT_PHASE`: merged `main` passes post-merge verification.
- `READY_FOR_V1_RC`: Phase 5C–5F merged; RC entry criteria pass.
- `READY_FOR_STAGING`: exact RC passed local/migration/artifact gates and staging authorization exists.
- `READY_FOR_PRODUCTION_DEPLOY`: exact RC passed staging/soak/security/rollback gates and owner explicitly authorizes production.
- `LIVE_CERTIFIED`: controlled real provider certification actually passed and remains fresh.

Never substitute one for another.

## 13. End-to-end final report

Return one consolidated report:

```markdown
# 8Router Phase 5C -> v1.0 RC Final Report

## Repository identity
- Starting main SHA:
- Final main SHA:
- RC candidate SHA/version:
- Working tree:

## Phase 5C
- Branch/commits/PR/merge SHA:
- Provider status matrix:
- Discovery/certification/API/CLI:
- Tests:
- Network calls and cost authorization:
- Blockers:

## Phase 5D
- Branch/commits/PR/merge SHA:
- Dashboard/API operations:
- Auth/CSRF/rate limit/audit:
- Accessibility/visual QA:
- Tests:

## Phase 5E
- Branch/commits/PR/merge SHA:
- Snapshot/shadow/canary/rollback:
- Legacy non-impact proof:
- Tests:

## Phase 5F
- Branch/commits/PR/merge SHA:
- Reliability/observability/security:
- Backup/restore/migration drills:
- Package inspection:
- Tests:

## Complete validation
- Every suite and actual pass/fail/skip count:
- TypeScript/build:
- Full regression:
- Gitleaks:
- npm audit:
- Runtime secret canary:

## Safety
- Production deployed:
- Service restarted:
- Production traffic changed:
- Provider activated:
- Real discovery/certification calls:
- Routing impact:
- Credential exposure:

## Readiness
- READY_FOR_V1_RC:
- READY_FOR_STAGING:
- READY_FOR_PRODUCTION_DEPLOY:
- Exact blockers and owner actions required:
```

## 14. Final instruction

Proceed continuously through the next safe step. Do not request confirmation for routine code structure, tests, documentation, commits, branch pushes, or PR creation already authorized by this playbook. Do stop at missing permissions, required human review, credentials/budget, destructive risk, or production authorization boundaries—and return a precise ready-to-resume checkpoint.

