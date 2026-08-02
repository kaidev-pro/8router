# 8Router Security Constitution

Version: 1.0  
Status: Mandatory security baseline

## 1. Security objectives

Protect:

- provider credentials and access keys;
- client request/response confidentiality;
- routing and provider configuration integrity;
- operator sessions and administrative actions;
- availability under provider failure or abuse;
- trustworthy audit and release evidence.

## 2. Threat model

Primary threats:

- credential disclosure through API, logs, error bodies, backups, fixtures, or Git;
- unauthorized provider activation or routing mutation;
- SSRF through configurable provider endpoints or discovery;
- abuse of discovery/certification to create billable traffic;
- malicious or malformed provider responses;
- SQL injection or unsafe dynamic queries;
- CSRF/session abuse on dashboard mutations;
- access-key brute force and enumeration;
- dependency or build-pipeline compromise;
- denial of service through streaming, retries, large payloads, or job fan-out;
- telemetry leakage and high-cardinality exhaustion.

## 3. Secret lifecycle

### Ingress

- Accept secrets only through approved authenticated mutation paths or server-side configuration.
- Require TLS outside local development.
- Never accept credentials in URL/query parameters.
- Apply request-size limits and CSRF/rate-limit controls.

### Storage

- Use the repository's authenticated encryption implementation (reported AES-256-GCM) with unique nonces.
- Keep encryption keys outside the application database.
- Store credential metadata separately from ciphertext when practical.
- Access-key verification uses one-way keyed hashing; raw access keys are shown once.

### Use

- Resolve and decrypt at the narrow provider-execution boundary.
- Keep plaintext lifetime short and out of long-lived objects/caches.
- Do not pass raw credentials through API controllers, dashboard state, jobs, or audit payloads.

### Rotation and revocation

- Support replacement without changing provider identity.
- Record rotation/revocation audit events without secret values.
- Ensure revoked credentials fail closed and cannot remain in worker caches.

### Backup

- Treat encrypted credential databases and encryption keys as separate sensitive assets.
- Never store the database and its key in the same unprotected backup location.

## 4. Authentication and authorization

- Public inference uses validated access keys and explicit scope/policy.
- Administrative provider APIs use founder/admin authentication.
- Mutations require authorization at the route and service layers.
- Browser-session mutations require CSRF protection and allowed-origin validation.
- Reject by default; do not infer admin rights from network location alone.
- Use stable 401/403 behavior without account or key enumeration.

Suggested permissions:

- `providers:read`
- `providers:credential:write`
- `providers:discover`
- `providers:certify`
- `providers:override`
- `routing:shadow`
- `routing:canary`
- `routing:activate`
- `audit:read`

One founder role may initially hold all permissions, but code paths should keep action boundaries distinct.

## 5. Endpoint and SSRF policy

Provider base URLs are security-sensitive configuration.

- Prefer fixed descriptor URLs.
- Configurable URLs require a descriptor-specific hostname allowlist.
- Require HTTPS except explicit loopback/local providers.
- Reject credentials in URL, fragments, userinfo, unexpected ports, encoded host tricks, and ambiguous IP formats.
- Resolve DNS and reject loopback, private, link-local, multicast, and cloud metadata ranges unless local-only is explicitly declared.
- Revalidate redirect targets or disable redirects.
- Pin request method/path patterns per discovery adapter.
- Bound connect/read/total timeouts and response size.

## 6. Input and output handling

- Validate content type, body size, enum fields, IDs, pagination, and nested depth.
- Treat provider JSON as untrusted.
- Limit arrays, model counts, strings, and metadata depth before persistence.
- Ignore or reject unknown security-sensitive fields.
- Escape dashboard rendering; never inject provider-supplied HTML.
- Sanitize errors to stable categories.
- Do not proxy arbitrary provider headers back to clients.

## 7. Logging and telemetry

Default-deny logging fields:

- authorization/cookie headers;
- API/access keys and ciphertext;
- prompts, completions, uploaded content, tool arguments/results;
- raw provider errors or response bodies;
- full configurable URLs;
- user identifiers not needed for operations.

Allow operational fields only after explicit review. Redaction must occur before serialization and before data enters external log systems.

Add tests that inject recognizable secret canaries and assert they are absent from:

- application logs;
- API/CLI errors;
- audit events;
- discovery history;
- certification evidence;
- dashboard HTML/state.

## 8. Database security

- Parameterize all values.
- Allowlist dynamic sort/filter identifiers.
- Use least-privilege filesystem permissions for SQLite files and backups.
- Use transactions for multi-table state changes.
- Enable and verify required SQLite integrity/foreign-key settings where compatible.
- Prevent path traversal in database configuration.
- Do not persist raw provider payloads.
- Cap history/evidence growth with an approved retention mechanism.

## 9. Job and concurrency security

- Discovery/certification jobs require authenticated creation.
- Enforce per-provider locks, global concurrency, and per-actor rate limits.
- Use idempotency keys.
- Persist a bounded state machine: queued, running, succeeded, failed, cancelled.
- Jobs must recover from crashes without duplicate uncontrolled network calls.
- Cancellation must abort outbound requests where possible.
- Never execute discovery automatically at process startup.

## 10. Routing security

- Only explicit, versioned operational state can make a provider eligible.
- Certification evidence cannot directly activate routing.
- Shadow and canary are separate flags with separate permissions.
- Routing snapshots are immutable per request.
- Reject configuration that yields an ambiguous or empty unsafe policy.
- Circuit breakers and fallback have bounded retry/fan-out.
- Prevent fallback loops and repeated billing storms.

## 11. Streaming security

- Bound idle and total stream duration.
- Propagate client cancellation.
- Enforce maximum event/frame size.
- Validate stream framing and finalization.
- Avoid buffering an unbounded stream in memory.
- Do not emit provider-internal headers or raw errors mid-stream.
- Record normalized completion/abort outcome without content.

## 12. Supply-chain security

For every phase:

```bash
npm audit --omit=dev
gitleaks detect --source . --redact --no-banner
```

Also:

- Review new dependency necessity, maintenance, license, install scripts, and transitive risk.
- Pin with the existing lockfile.
- Do not add a dependency for trivial validation or formatting.
- Treat audit findings by exploitability and runtime reachability, but never hide them.
- Record accepted risk with owner, reason, mitigation, and expiry.

If repository CI supports them, add dependency review, CodeQL/static analysis, and secret scanning without making local development dependent on proprietary services.

## 13. Security tests required by Phase 5C–5F

### Phase 5C

- No secret fields in every provider/discovery/certification response.
- Credential canary absent from logs, evidence, history, and errors.
- SSRF URL cases rejected.
- Real-network adapters cannot run without all gates.
- Discovery cannot activate or mutate routing.
- Provider response/body limits enforced.

### Phase 5D

- Admin auth and CSRF for all mutations.
- Rate limiting and stable errors.
- XSS-safe display of provider-supplied model names/errors.
- Audit completeness for every action.
- Confirmation and permission separation for dangerous actions.

### Phase 5E

- Shadow data minimization.
- Canary cohort and ceiling cannot be bypassed.
- Automatic abort and manual kill switch.
- No fallback/retry loops.
- Snapshot rollback is atomic.

### Phase 5F

- Backup/restore confidentiality and integrity.
- Restart/crash recovery.
- Resource exhaustion tests.
- Dependency and secret scans.
- Authentication/rate-limit abuse tests.
- Release artifact contains no `.env`, database, logs, evidence secrets, or development credentials.

## 14. Incident response

If secret exposure is suspected:

1. Stop output and preserve minimal evidence without repeating the secret.
2. Disable affected credential/provider through the approved control path if authorized.
3. Notify the owner with credential/provider scope and exposure location.
4. Rotate/revoke through the provider; do not merely delete the local value.
5. Remove the secret from current files and assess Git history, logs, backups, artifacts, and PRs.
6. Add a regression test/redaction rule.
7. Document timeline and prevention without including the secret.

If routing integrity is compromised:

1. Trigger the documented kill switch.
2. Roll back to the last known-good routing snapshot.
3. Preserve audit and request correlation IDs.
4. Verify no further traffic reaches the affected provider.
5. Investigate before reactivation.

## 15. Security release gate

Security passes only when:

- threat model reflects changed surfaces;
- no plaintext secret is found;
- gitleaks is clean;
- dependency findings are resolved or explicitly accepted;
- SSRF, auth, CSRF, rate-limit, injection, redaction, and routing safety tests pass;
- audit and rollback controls are proven;
- no unresolved P0/P1 security defect exists.

`Scanner clean` alone is not a security pass.

