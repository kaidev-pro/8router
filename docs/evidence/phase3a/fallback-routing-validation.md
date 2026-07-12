# Fallback Routing Validation — Phase 3A.4

## Status: PENDING PROVIDER ACTIVATION

Fallback routing requires at least two providers configured.

## Fallback Behavior

When primary provider fails:
1. 8Router catches the error
2. Increments failure counter
3. Selects next available provider
4. Retries the request
5. Returns response from successful provider
6. Logs the fallback event

---

## Test Scenarios

### 1. Primary Healthy Path
```
Request → Provider A (healthy) → Response
Result: No fallback, clean response
```

### 2. Primary Timeout
```
Request → Provider A (timeout) → Provider B → Response
Result: Fallback triggered, response from B
```

### 3. Primary Rate Limit
```
Request → Provider A (429) → Provider B → Response
Result: Fallback triggered, response from B
```

### 4. Primary 5xx
```
Request → Provider A (500) → Provider B → Response
Result: Fallback triggered, response from B
```

### 5. All Providers Failed
```
Request → Provider A (fail) → Provider B (fail) → Error
Result: all_providers_failed error returned
```

---

## Verification Checklist

- [ ] Primary provider healthy
- [ ] Fallback provider healthy
- [ ] Fallback triggers on primary failure
- [ ] Fallback response correct
- [ ] Usage logs attribute to correct provider
- [ ] Shadow comparison attributes correctly
- [ ] No duplicate provider calls (only one request per attempt)
- [ ] Error messages sanitized
- [ ] No credentials exposed
- [ ] Circuit breaker interaction works

---

## Circuit Breaker Integration

| State | Behavior |
|-------|----------|
| closed | Normal routing, fallback on failure |
| half-open | Limited requests, fallback on failure |
| open | Skip provider, use fallback immediately |

---

## Evidence Required

After activation, document:
- Providers tested
- Fallback scenarios triggered
- Success/failure rates
- Latency impact
- Circuit breaker interactions
- Usage log attribution

---

## Next Steps

1. Add OpenRouter (primary)
2. Add Groq (fallback)
3. Test primary healthy path
4. Test fallback scenarios
5. Document results
