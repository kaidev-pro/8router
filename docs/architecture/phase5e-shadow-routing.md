# Phase 5E — Shadow Routing & Cutover Readiness

## Architecture

Eligibility snapshot, shadow evaluation, canary controls, rollback, kill switch.
All feature flags default false. Shadow never affects primary response.

## Eligibility Snapshot

`buildEligibilitySnapshot()` produces an immutable, versioned, deterministic snapshot:
- Provider eligibility (descriptor, models, certification, health, capability)
- Eligibility reasons per provider
- Feature flag state
- Version: `snap_{timestamp}_{random}`

## Shadow Evaluation

`evaluateShadow()` — deterministic hash-based sampling:
- 10% sample rate (hash of requestId)
- Simulated latency only
- Never affects primary response
- Skipped when shadow flag is false

## Canary Controls

Disabled-by-default canary configuration:
- Traffic percentage / request count limits
- Window and expiry
- Abort threshold (error rate)
- Eligible cohorts
- State machine: inactive → active → paused/completed/aborted

Operations: create, activate, evaluate, pause, abort

## Rollback

`rollbackToLastKnownGood()`:
- Aborts all active canaries
- Builds fresh snapshot
- Returns aborted canary IDs

## Kill Switch

`activateKillSwitch()` — immediate:
- Sets kill switch active
- Aborts all active canaries
- `isKillSwitchActive()` check

## Readiness Scoring

`assessReadiness()` — component-based (not opaque score):
- descriptor, models, certification, shadow_routing, canary_controls, kill_switch
- pass/fail/warn/not_tested per component
- Blockers list

## Safety

- All flags default false
- Shadow never affects primary response
- Canary requires explicit activation
- Kill switch aborts everything
- No routing mutation
- No credential access
- No network
