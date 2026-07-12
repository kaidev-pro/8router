# Kill-Switch Drill — 2026-07-12

## Procedure

1. ✅ Confirmed shadow mode active (mode=shadow, rate=0.01)
2. ✅ Recorded current metrics (observed=0, shadow=0)
3. ✅ Triggered manual disable via POST /8router/api/canonical-experiment/manual-disable
4. ✅ Verified mode state: enabled=false
5. ✅ Verified health endpoint: status=ok
6. ✅ Verified /v1/models: 13 models available
7. ✅ Verified disable event recorded: manual_disable_events=1
8. ✅ Re-enabled shadow via POST /8router/api/canonical-experiment/enable
9. ✅ Verified re-enable: mode=shadow, enabled=true

## Results

| Check | Result |
|-------|--------|
| Mode changed to disabled | ✅ PASS |
| Legacy stayed healthy | ✅ PASS |
| No inference failure | ✅ PASS |
| No duplicate provider call | ✅ PASS |
| No content/secret exposure | ✅ PASS |
| Shadow re-enabled successfully | ✅ PASS |
| Disable event counter incremented | ✅ PASS |

## Verdict

**PASS** — Manual kill switch works correctly. Shadow mode can be toggled on/off without affecting legacy runtime.

## Drill Timestamp

2026-07-12T15:21:35Z
