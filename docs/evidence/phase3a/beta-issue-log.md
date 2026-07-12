# Beta Issue Log — Phase 3A

## Purpose

Track issues reported by beta users during Phase 3A testing.

## Issue Template

```
Issue ID: BETA-XXX
Date: YYYY-MM-DD
Client/Tool: (e.g., curl, Python, Cursor)
Provider/Model: (e.g., openrouter/auto)
Alias: (e.g., 8router/auto)
Request Type: (e.g., chat, streaming, tool-call)
User-visible Impact: (brief description)
Reproducible: Yes/No
Critical: Yes/No
Status: Open/Investigating/Resolved/Won't Fix
Resolution: (brief description)
```

## Active Issues

| ID | Date | Client | Model | Alias | Impact | Status |
|----|------|--------|-------|-------|--------|--------|
| (none yet) | | | | | | |

## Resolved Issues

| ID | Date | Client | Model | Alias | Impact | Resolution |
|----|------|--------|-------|-------|--------|------------|
| (none yet) | | | | | | |

---

## Issue Reporting Guidelines

### What to Include
1. **Request ID** (from response headers or error)
2. **Timestamp** (when it happened)
3. **Client/Tool** (curl, Python, Cursor, etc.)
4. **Model/Alias** (what you requested)
5. **Error message** (what went wrong)
6. **Steps to reproduce** (if possible)

### What NOT to Include
- ❌ Prompt content
- ❌ Response content
- ❌ Access key
- ❌ Provider credentials
- ❌ Authorization headers
- ❌ IP addresses

---

## Common Issues

### "All providers failed"
**Cause**: No provider credentials configured
**Fix**: Add provider credentials via dashboard

### "Model not found"
**Cause**: Model not available from any configured provider
**Fix**: Use an alias like `8router/auto`

### "Rate limited"
**Cause**: Access key rate limit exceeded
**Fix**: Check dailyRequestLimit and rateLimitPerMinute

### "Connection refused"
**Cause**: Wrong base URL
**Fix**: Use `https://8router.8agents.xyz/v1`

### "Authentication failed"
**Cause**: Invalid or revoked access key
**Fix**: Check key status in dashboard

---

## Issue Prioritization

### Critical (Immediate)
- Security vulnerabilities
- Data leaks
- Complete service failure
- Access key compromise

### High (Same Day)
- Provider routing failures
- Fallback not working
- Tool calling broken
- Streaming broken

### Medium (This Week)
- Alias routing issues
- Token Saver issues
- Usage logging issues
- Minor UI issues

### Low (Backlog)
- Feature requests
- Documentation gaps
- Minor cosmetic issues

---

## Notes

- All issues are sanitized — no raw content stored
- Critical issues trigger immediate investigation
- Beta users can revoke keys immediately if compromised
- Issue data helps improve 8Router stability
