# Rollback Runbook

Rollback restores prior encrypted credentials from protected snapshots.

Requirements:
- feature flag enabled
- plan-id and confirm match
- target record not drifted

Exit codes: 0 success, 1 error, 2 validation, 5 drift refusal
