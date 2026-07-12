# Runtime Telemetry Validation — Phase 3A.4

## Status: PENDING PROVIDER ACTIVATION

Telemetry validation requires:
1. At least one provider credential configured
2. At least one access key created
3. Real traffic flowing through the runtime

## Expected Telemetry After Activation

### Runtime Request Logs
```sql
SELECT COUNT(*) FROM runtime_request_logs;
-- Expected: > 0 after smoke tests
```

### Provider Health
```sql
SELECT provider, COUNT(*) FROM provider_health GROUP BY provider;
-- Expected: entries for each activated provider
```

### Canonical Experiment Logs
```sql
SELECT COUNT(*) FROM canonical_experiment_logs;
-- Expected: > 0 after shadow sampling triggers
```

---

## Telemetry Checks

| Check | Expected | Current |
|-------|----------|---------|
| runtime_request_logs | > 0 | 0 |
| canonical_experiment_logs | > 0 | 0 |
| provider_health updated | yes | no |
| shadow requests | > 0 | 0 |
| compared requests | > 0 | 0 |
| usage logs | > 0 | 0 |

---

## After Smoke Traffic

Verify:
1. ✅ Request IDs are present
2. ✅ Provider/model attribution correct
3. ✅ Alias attribution correct
4. ✅ Streaming flag correct
5. ✅ Tool-call flag correct
6. ✅ No content stored
7. ✅ No secrets stored
8. ✅ Shadow comparisons increment
9. ✅ No duplicate provider calls

---

## Evidence Required

After smoke tests pass, update this document with:
- Total runtime requests
- Total shadow requests
- Total compared requests
- Provider distribution
- Alias distribution
- Error counts
- Latency metrics

---

## Next Steps

1. Add provider credentials
2. Run smoke tests
3. Query telemetry
4. Update this document with live data
