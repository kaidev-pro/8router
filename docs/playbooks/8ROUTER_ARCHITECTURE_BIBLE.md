# 8Router Architecture Bible

Version: 1.0  
Status: Canonical target architecture for Phase 5C through v1.0 RC

## 1. Product boundary

8Router is an OpenAI-compatible AI routing gateway. Its job is to accept a stable client contract, normalize requests, select an eligible provider/model, execute safely, normalize responses, and record operational evidence.

8Router is not:

- an autonomous agent product;
- a general secrets manager;
- a billing system of record;
- a substitute for provider terms, quotas, or safety policy;
- the future shared Context/Memory product itself.

Context, Agents, and Skills may integrate later through explicit interfaces. They must not be folded into routing internals during Phase 5C–5F.

## 2. Verified and reported baseline

Two inputs exist:

1. The attached repository snapshot is an older `0.6.1` TypeScript/Express/SQLite codebase with canonical bridges, encrypted provider credentials, access keys, provider health, usage logs, dashboard, and routing modules.
2. The latest execution report states that `main` at `6cdd15fb1434a11b6cda4a67537abd08c160b022` additionally contains Phase 5A/5B provider foundation and dynamic-state work with 405/405 tests.

The live checkout is authoritative. An agent must reconcile this document with the actual `main` before implementation and update the baseline evidence when facts differ.

## 3. Architectural principles

### 3.1 Stable outside, adaptable inside

Clients receive stable OpenAI-compatible contracts. Provider-specific differences remain behind adapters and the canonical request/response model.

### 3.2 Static identity, dynamic operations

Static provider descriptors are canonical in code:

- provider ID and display name;
- protocol family;
- authentication type;
- endpoint policy;
- declared capabilities;
- adapter binding;
- feature support constraints.

Dynamic data belongs in persistent state:

- discovered models;
- manual model overrides;
- certification evidence;
- discovery history;
- operational metadata.

Dynamic state must never silently rewrite static identity.

### 3.3 Control plane and data plane separation

Control-plane operations include credential onboarding, discovery, certification, provider configuration, dashboard management, and audit.

Data-plane operations include request normalization, routing selection, provider execution, fallback, streaming, response normalization, and usage logging.

Control-plane changes produce versioned state consumed by the data plane. They must not mutate active routing through incidental side effects.

### 3.4 Safe defaults

New providers, new routing algorithms, background jobs, persistence writes, network discovery, canaries, and automated activation default to disabled.

### 3.5 Evidence over claims

Every state transition has durable evidence: who/what triggered it, when it occurred, inputs used, sanitized outcome, and the previous/new state.

## 4. Logical components

| Component | Responsibility | Must not do |
|---|---|---|
| API server | HTTP contracts, auth, validation, serialization | Decrypt credentials directly or implement routing policy |
| Provider descriptor registry | Canonical static provider definitions | Persist secrets or dynamic discovery output |
| Credential manager | Encrypt/decrypt within a narrow execution boundary | Return plaintext through API/logs |
| Discovery service | Fetch and normalize provider model catalogs | Activate providers or alter active routing |
| Certification service | Run bounded contract probes and store evidence | Treat one success as permanent health |
| Dynamic-state repository | Persist models, overrides, evidence, history, metadata | Store credentials or overwrite static descriptors |
| Routing engine | Choose eligible provider/model using a versioned snapshot | Perform discovery or schema migration |
| Provider adapter | Translate canonical protocol and execute | Own cross-provider routing policy |
| Health/circuit breaker | Track runtime health and suppress unsafe targets | Permanently change catalog definitions |
| Usage/pricing | Record normalized usage and estimates | Become a financial ledger without explicit design |
| Dashboard | Present and invoke authorized control-plane operations | Bypass APIs, validation, audit, or CSRF |
| Audit/evidence | Record security-relevant and phase evidence | Store raw request content or secrets by default |

## 5. Provider descriptor contract

Each descriptor should contain a deliberately small, validated contract:

```ts
type ProviderDescriptor = {
  id: string;
  displayName: string;
  protocol: 'openai' | 'anthropic' | 'gemini' | 'local' | string;
  auth: 'bearer' | 'header' | 'query' | 'none';
  baseUrlPolicy: 'fixed' | 'allowlisted-configurable' | 'local-only';
  declaredCapabilities: CapabilityId[];
  adapterId: string;
  lifecycle: 'experimental' | 'supported' | 'deprecated';
};
```

Exact repository types may differ. Preserve the existing type rather than creating a parallel registry. Duplicate IDs, invalid protocols/auth types, and conflicting model IDs must fail deterministically.

## 6. Dynamic-state schema

The reported Phase 5B schema contains:

| Table | Purpose | Secret policy |
|---|---|---|
| `provider_model_registry` | Discovered/manual normalized model records | No secret columns |
| `provider_model_overrides` | Operator overrides with precedence | No secret columns |
| `provider_certification_evidence` | Sanitized certification outcomes | No raw auth/request bodies |
| `provider_discovery_history` | Bounded discovery run history | No provider response dumps |
| `provider_operational_metadata` | Lifecycle/health/operator metadata | Credential reference ID only if needed |

Phase 5C must introspect the actual schema before adding columns. Desired invariants:

- unique provider/model identity;
- deterministic source precedence: override > dynamic > static where explicitly allowed;
- created/updated timestamps;
- discovery run correlation IDs;
- indexes for provider, model, status, time, and evidence lookup;
- foreign-key behavior or application integrity tests;
- additive migrations and idempotent initialization.

## 7. Model identity and precedence

Use a normalized key `(providerId, providerModelId)`. A display alias must not become the primary identity.

Recommended resolution:

1. Load static model declaration when present.
2. Merge latest successful discovered record.
3. Apply active manual override field-by-field.
4. Preserve source provenance per resolved model.
5. Sort deterministically.

An override may disable eligibility or correct metadata, but it must not fabricate certification success. Model disappearance should mark a record stale after a grace policy, not immediately delete it.

## 8. Discovery architecture

Discovery is an explicit control-plane job:

```text
request -> authorize -> validate flags/allowlist -> acquire lock
        -> resolve credential reference -> bounded provider call
        -> validate/normalize -> transactional persistence
        -> history/evidence -> release lock -> sanitized result
```

Required defenses:

- fixed or allowlisted HTTPS endpoints;
- no redirects to untrusted hosts;
- DNS/IP protections against loopback, link-local, metadata, and private ranges unless the descriptor is explicitly local-only;
- timeout, body-size, model-count, concurrency, and retry limits;
- schema validation before persistence;
- transactional last-known-good preservation;
- per-provider lock/idempotency key;
- sanitized provider errors;
- no automatic routing activation.

## 9. Certification architecture

Certification validates declared behavior at a point in time. It is metadata/evidence, not routing authority.

Certification profiles should cover, where supported:

- authentication rejection and success;
- model listing contract;
- simple non-streaming response;
- streaming framing and termination;
- tool-call request/response;
- JSON/structured output;
- multimodal input;
- usage normalization;
- timeout and error normalization;
- cancellation/abort behavior.

Statuses:

- `not_run`
- `passed`
- `failed`
- `partial`
- `expired`
- `deprecated`

Evidence records include profile version, adapter version or commit SHA, provider/model, sanitized observations, timestamps, latency summary, and failure category. Never store raw prompts, completions, or credentials unless a separately approved retention policy exists.

## 10. Four-provider Phase 5C batch

The initial batch is:

| Provider | Expected protocol strategy | Primary purpose |
|---|---|---|
| OpenAI Direct | Native OpenAI/Responses where supported | Reference compatibility and streaming |
| Gemini Direct | Native Gemini adapter | Non-OpenAI protocol validation and multimodal capability |
| xAI | OpenAI-compatible with provider-specific constraints | Compatible-provider normalization |
| Cerebras | OpenAI-compatible with high-speed constraints | Latency/throughput and compatibility edge cases |

Do not duplicate an existing provider descriptor or adapter. First reconcile IDs, endpoint policy, and capability declarations already present in the live repository.

## 11. API architecture

Reported Phase 5A/5B read APIs include catalog, detail, capabilities, models, certifications, state, dynamic models, history, evidence, and overrides endpoints. The live route list is authoritative.

Phase 5C/5D mutation contracts should be resource-oriented and minimal. Example shapes, adapted to existing route conventions:

- `POST /8router/api/providers/:id/discovery-runs`
- `POST /8router/api/providers/:id/certification-runs`
- `PUT /8router/api/providers/:id/overrides/:modelId`
- `DELETE /8router/api/providers/:id/overrides/:modelId`
- `PATCH /8router/api/providers/:id/operational-state`

Mutation responses should return job/state identifiers, never raw credentials. Long-running work should use a job record with polling rather than holding an HTTP request indefinitely.

## 12. Routing snapshot

Routing must consume an immutable, versioned eligibility snapshot derived from:

- static descriptor support;
- resolved model registry;
- explicit operational enablement;
- unexpired certification requirement;
- runtime health/circuit state;
- configured policy and tenant/access-key constraints.

Snapshot creation is deterministic and atomic. A request uses one snapshot version for its entire lifecycle. Discovery and dashboard writes publish a new candidate snapshot; they do not mutate an in-flight request.

## 13. Shadow, canary, and cutover

### Shadow

Shadow evaluation mirrors sanitized, eligible requests without affecting the user response. Default behavior should avoid duplicate billable requests; use replay fixtures or an explicitly budgeted sample.

Compare normalized outcomes rather than raw text equality:

- success/error class;
- protocol completeness;
- tool-call validity;
- structured-output validity;
- streaming correctness;
- latency and time-to-first-token;
- normalized usage/cost estimate;
- safety/redaction failures.

### Canary

Canary requires explicit operator approval, a bounded cohort or access key, a traffic ceiling, automatic abort thresholds, and immediate rollback.

### Cutover

Cutover changes a versioned policy pointer. It must be reversible without schema rollback or credential changes.

## 14. Dashboard architecture

The dashboard is a view and control surface over authenticated APIs. It must display:

- provider lifecycle and operational state;
- credential presence/health without revealing values;
- discovered/static/overridden model provenance;
- latest discovery and certification status;
- freshness and expiry;
- health/circuit state;
- recent sanitized history and audit events;
- shadow/canary readiness;
- explicit blockers.

Dangerous actions require confirmation and show expected impact. The UI must distinguish `configured`, `certified`, `enabled`, and `receiving traffic`.

## 15. Observability

Use low-cardinality structured fields:

- request/correlation ID;
- provider ID and normalized model ID;
- adapter/protocol;
- routing snapshot version;
- outcome/error class;
- fallback count/reason;
- latency/TTFT;
- normalized token usage;
- circuit state;
- discovery/certification run ID.

Never use prompt, completion, credential ID, user email, access key, or raw URL as a metric label.

Minimum operational signals:

- request rate and success rate;
- p50/p95/p99 latency and TTFT;
- provider error category;
- fallback and circuit-open rates;
- streaming abort rate;
- discovery/certification success and freshness;
- database and job health;
- redaction/security event count.

## 16. Failure semantics

Classify failures consistently:

- authentication;
- authorization;
- invalid request;
- unsupported capability;
- model unavailable;
- provider rate limit/quota;
- provider server error;
- timeout/cancellation;
- network/TLS;
- malformed provider response;
- internal persistence/configuration.

Only retry safe, transient categories. Respect provider hints with caps and jitter. Do not retry non-idempotent tool side effects.

## 17. Configuration and flags

Configuration must have one typed loader, explicit validation, and redacted diagnostics. Expected controls include:

- discovery enabled;
- provider network enabled;
- dynamic persistence enabled;
- certification enabled;
- dashboard mutations enabled;
- shadow enabled and sample budget;
- canary enabled and traffic ceiling;
- per-provider allowlists;
- timeout/retry/concurrency budgets.

Production startup should fail closed for invalid security-critical configuration and continue safely with optional features disabled when appropriate.

## 18. v1.0 RC architectural definition

8Router is architecture-ready for v1.0 RC when:

- four Phase 5C providers are defined, discoverable, and certifiable behind safe flags;
- provider state is visible and operable through authenticated, audited controls;
- routing eligibility uses immutable versioned snapshots;
- shadow and canary machinery has deterministic tests and rollback;
- security, migration, backup/restore, observability, and operator runbooks are proven;
- no unresolved P0/P1 defect remains;
- production activation remains a separate owner-authorized operation.

