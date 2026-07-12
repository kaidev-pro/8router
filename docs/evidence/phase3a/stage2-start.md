# Stage 2 Start — 5% Shadow — PENDING

## Status: NOT STARTED

Stage 2 requires Stage 1 review with PROMOTE_TO_STAGE_2 decision.

## Required Before Stage 2

- Compared requests ≥ 100
- Critical mismatches = 0
- Experiment-induced failures = 0
- p99 overhead ≤ 25 ms
- ≥ 2 hours at 1% stage

## Current Blocker

No traffic available — production database has zero provider connections and zero access keys.

## When Traffic Is Available

Set:
```
CANONICAL_RUNTIME_MODE=shadow
CANONICAL_SHADOW_SAMPLE_RATE=0.05
```

Persist in systemd unit and verify via status endpoint.
