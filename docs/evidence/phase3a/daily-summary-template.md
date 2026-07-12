# Daily Evidence Template

```markdown
# Daily Summary — YYYY-MM-DD

## Date:
## Shadow sample rate:
## Compared requests:
## Unique access keys:

## Mismatch Summary
| Kind | Count | Severity | Providers | First Seen | Last Seen |
|------|-------|----------|-----------|------------|-----------|
| (none yet) | | | | | |

## Latency
- p50 comparison overhead:
- p95 comparison overhead:
- p99 comparison overhead:

## Coverage
### Providers
| Provider | Compared Requests |
|----------|-------------------|
| (none yet) | |

### Aliases
| Alias | Compared Requests |
|-------|-------------------|
| (none yet) | |

### Request Types
| Type | Count |
|------|-------|
| streaming | |
| tool_calls | |
| fallback | |
| token_saver | |

## Resources
- CPU usage:
- Memory usage:
- Database size:
- Experiment log row count:
- Disk free space:

## Security
- [ ] No plaintext request content
- [ ] No plaintext response content
- [ ] No tool arguments
- [ ] No provider keys
- [ ] No access keys
- [ ] No Authorization headers
- [ ] No sensitive webhook payloads

## Operational
- [ ] Legacy responses unchanged
- [ ] No duplicate provider calls
- [ ] Canary remains blocked
- [ ] Enforced remains blocked
- [ ] Alerts not noisy
- [ ] Retention cleanup functioning

## Blockers:
## Warnings:
## Decision: Continue / Hold / Rollback / Increase Sample Rate / Insufficient Data
```
