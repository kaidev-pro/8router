# 8Router v0.6.0 — Technical Plan
## Shared Access & Public Readiness

---

## 1. Architecture Plan

### Current State (v0.5.0)
```
[Client] → [nginx:443] → [Express:8080] → [Router Engine] → [Providers]
                                    ↓
                              [Dashboard] (local-only)
                              [Admin API] (local-only)
```

### Target State (v0.6.0)
```
[Client] → [nginx:443] → [Express:8080] → [Router Engine] → [Providers]
                                    ↓
                         ┌──────────┴──────────┐
                    [Local Access]        [Tunnel Access]
                         ↓                      ↓
                   [Dashboard]           [OAuth Gate]
                   [Admin API]                ↓
                                        [Dashboard]
                                        [API (token)]
```

### Module Structure
```
src/
├── tunnel/
│   ├── config.ts          ← Tunnel config schema
│   ├── provider.ts        ← Tunnel provider abstraction
│   ├── cloudflare.ts      ← Cloudflare tunnel integration
│   ├── ngrok.ts           ← ngrok tunnel integration
│   └── manager.ts         ← Tunnel lifecycle manager
├── auth/
│   ├── oauth-config.ts    ← OAuth config schema
│   ├── oauth-flow.ts      ← Google/GitHub OAuth flow
│   ├── jwt.ts             ← JWT sign/verify
│   ├── session.ts         ← Session store (in-memory + cookie)
│   ├── middleware.ts       ← requireAuth, optionalAuth
│   └── login-page.ts      ← Login UI
├── i18n/
│   ├── en.json            ← English strings
│   ├── id.json            ← Indonesian strings
│   ├── ja.json            ← Japanese strings
│   └── index.ts           ← t() function + language detection
├── api/
│   └── server.ts          ← Modified: mount tunnel/auth/i18n routes
├── dashboard/
│   └── dashboard.ts       ← Modified: add tunnel panel, auth UI, lang switch
└── landing.ts             ← Modified: i18n support
```

---

## 2. Route Plan

### Existing Routes (unchanged)
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/v1/chat/completions` | POST | API Key | Chat completions |
| `/v1/models` | GET | API Key | List models |
| `/v1/messages` | POST | API Key | Anthropic compat |
| `/health` | GET | None | Health check |
| `/8router/` | GET | None | Landing page |

### Tunnel Routes (new)
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/admin/tunnel` | GET | Local/OAuth | Get tunnel status |
| `/admin/tunnel/start` | POST | Local/OAuth | Start tunnel |
| `/admin/tunnel/stop` | POST | Local/OAuth | Stop tunnel |
| `/admin/tunnel/config` | GET | Local/OAuth | Get tunnel config |

### OAuth Routes (new)
| Route | Method | Auth | Description |
|-------|--------|------|-------------|
| `/auth/login` | GET | None | Login page |
| `/auth/google` | GET | None | Redirect to Google |
| `/auth/google/callback` | GET | None | Google callback |
| `/auth/github` | GET | None | Redirect to GitHub |
| `/auth/github/callback` | GET | None | GitHub callback |
| `/auth/me` | GET | Cookie | Current user info |
| `/auth/logout` | POST | Cookie | Clear session |

### Protected Routes (when AUTH_REQUIRED=true)
| Route | Protection |
|-------|-----------|
| `/8router/dashboard` | OAuth required |
| `/8router/setup` | OAuth required |
| `/admin/*` | OAuth required |
| `/8router/quotas` | OAuth required |
| `/8router/keys` | OAuth required |

### Public Routes (always accessible)
| Route | Notes |
|-------|-------|
| `/8router/` | Landing page (i18n) |
| `/v1/*` | API (API key auth only) |
| `/health` | Health check |
| `/auth/*` | OAuth flow |

---

## 3. Env / Config Plan

### New Environment Variables
```bash
# ─── Tunnel ───
TUNNEL_ENABLED=false
TUNNEL_PROVIDER=cloudflare       # cloudflare | ngrok | manual
TUNNEL_AUTH_REQUIRED=true        # require auth token for tunnel access
TUNNEL_TOKEN=                    # auto-generated if empty
TUNNEL_CLOUDFLARE_TOKEN=         # cloudflare tunnel token (optional)
TUNNEL_NGROK_TOKEN=              # ngrok auth token (optional)
TUNNEL_PUBLIC_URL=               # manual public URL if using reverse proxy

# ─── OAuth ───
AUTH_REQUIRED=false
AUTH_PROVIDER=none               # none | google | github | both
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=
AUTH_ALLOWED_EMAILS=             # comma-separated email whitelist
AUTH_ALLOWED_DOMAINS=            # comma-separated domain whitelist
SESSION_SECRET=                  # auto-generated if empty
SESSION_EXPIRY=24                # hours

# ─── i18n ───
DEFAULT_LOCALE=en                # en | id | ja
SUPPORTED_LOCALES=en,id,ja
```

### YAML Config Addition (8router.yaml)
```yaml
tunnel:
  enabled: false
  provider: cloudflare
  authRequired: true
  token: ""
  publicUrl: ""

oauth:
  enabled: false
  provider: none
  allowedEmails: []
  allowedDomains: []
  sessionSecret: ""
  sessionExpiry: 24
  google:
    clientId: ""
    clientSecret: ""
  github:
    clientId: ""
    clientSecret: ""

i18n:
  defaultLocale: en
  supportedLocales: [en, id, ja]
```

---

## 4. Security Plan

### Tunnel Security
| Risk | Mitigation |
|------|-----------|
| Exposing admin endpoints | Admin routes blocked on non-local when tunnel active |
| No auth on tunnel | `TUNNEL_AUTH_REQUIRED=true` by default, big warning if disabled |
| Provider key leak | Existing secret masking applies, verified in tests |
| Token brute force | Token is 32-char random, rate limit failed auth |

### OAuth Security
| Risk | Mitigation |
|------|-----------|
| CSRF on OAuth callback | `state` parameter with signed JWT |
| Session hijacking | httpOnly + Secure + SameSite=Lax cookies |
| Email spoofing | Email verified via OAuth provider, not user input |
| Secret leak | OAuth secrets never in responses/logs/errors |
| Open redirect | Callback URL hardcoded to `/auth/{provider}/callback` |

### i18n Security
| Risk | Mitigation |
|------|-----------|
| XSS via translations | Translation files are static JSON, no user input |
| Lang injection | Only allowlisted locales accepted |

### Doctor Command Additions
```
✓ Tunnel status check (disabled/active/error)
✓ Tunnel auth warning (if enabled without auth)
✓ OAuth config validation
✓ OAuth provider connectivity check
✓ i18n completeness check
```

---

## 5. Test Plan

### Phase 1 — Tunnel Tests
```bash
scripts/test-tunnel.sh
```
- [ ] Tunnel disabled by default
- [ ] `--tunnel` flag enables tunnel config
- [ ] Tunnel token auto-generated when empty
- [ ] Tunnel token masked in all responses
- [ ] `/admin/tunnel` returns 401 from non-local when tunnel active
- [ ] `/admin/tunnel` returns 200 from localhost
- [ ] Warning when `TUNNEL_AUTH_REQUIRED=false`
- [ ] Doctor detects tunnel without auth
- [ ] No provider keys in tunnel status response
- [ ] API endpoints accessible via tunnel with valid token
- [ ] API endpoints reject invalid tunnel token

### Phase 2 — OAuth Tests
```bash
scripts/test-oauth.sh
```
- [ ] OAuth disabled by default
- [ ] `/auth/login` shows login page when enabled
- [ ] Protected routes redirect to `/auth/login` when auth required
- [ ] Public routes accessible without auth
- [ ] `/auth/me` returns user info with valid session
- [ ] `/auth/me` returns 401 without session
- [ ] `/auth/logout` clears session
- [ ] OAuth missing config shows helpful error
- [ ] Allowed email whitelist enforced
- [ ] Allowed domain whitelist enforced
- [ ] No OAuth secrets in any response
- [ ] Doctor validates OAuth config

### Phase 3 — i18n Tests
```bash
scripts/test-i18n.sh
```
- [ ] All EN keys exist in ID
- [ ] All EN keys exist in JA
- [ ] No missing translations
- [ ] `?lang=id` returns Indonesian page
- [ ] `?lang=ja` returns Japanese page
- [ ] `Accept-Language: id` auto-detects Indonesian
- [ ] Code blocks unchanged across languages
- [ ] Provider names unchanged
- [ ] Model aliases unchanged
- [ ] Language switcher renders on landing page
- [ ] Language persists via cookie

---

## 6. Execution Order

### Phase 1 — Tunnel (6 tasks)
1. `src/tunnel/config.ts` — config schema + token generation
2. `src/tunnel/provider.ts` — provider abstraction
3. `src/tunnel/cloudflare.ts` — Cloudflare tunnel integration
4. `src/tunnel/ngrok.ts` — ngrok tunnel integration
5. `src/tunnel/manager.ts` — lifecycle manager + CLI integration
6. `src/api/server.ts` — mount tunnel routes
7. `src/dashboard/dashboard.ts` — tunnel status panel
8. `scripts/test-tunnel.sh` — tests
9. `src/cli/terminalUI.js` — add tunnel menu
10. `README.md` — tunnel documentation

### Phase 2 — OAuth (8 tasks)
1. `src/auth/oauth-config.ts` — config schema
2. `src/auth/jwt.ts` — JWT utilities
3. `src/auth/session.ts` — session store
4. `src/auth/oauth-flow.ts` — OAuth flow handler
5. `src/auth/middleware.ts` — auth middleware
6. `src/auth/login-page.ts` — login UI
7. `src/api/server.ts` — mount auth routes + protect endpoints
8. `src/dashboard/dashboard.ts` — auth status in UI
9. `scripts/test-oauth.sh` — tests
10. `README.md` — OAuth documentation

### Phase 3 — i18n (6 tasks)
1. `src/i18n/en.json` — English strings
2. `src/i18n/id.json` — Indonesian strings
3. `src/i18n/ja.json` — Japanese strings
4. `src/i18n/index.ts` — translation function + detection
5. `src/landing.ts` — add i18n support
6. `src/dashboard/dashboard.ts` — add language switcher
7. `scripts/test-i18n.sh` — tests
8. `README.md` — i18n documentation

---

## 7. Risks and Limitations

### Tunnel
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Cloudflare tunnel binary not installed | Medium | Fall back to ngrok, then manual instructions |
| ngrok requires account | Low | Document setup steps |
| Tunnel drops connection | Medium | Auto-reconnect with exponential backoff |
| Public URL changes on restart | Low | Document stable URL setup |

### OAuth
| Risk | Impact | Mitigation |
|------|--------|-----------|
| OAuth provider downtime | Medium | Graceful error page, retry prompt |
| Cookie not set in HTTP | Low | Set Secure=false for local dev |
| Email not returned by GitHub | Medium | Use login@github.com fallback |
| Session store lost on restart | Low | Acceptable for v0.6.0, Redis later |

### i18n
| Risk | Impact | Mitigation |
|------|--------|-----------|
| Translation quality | Medium | Manual review, native speaker QA |
| Missing keys | Low | Fallback to English |
| Page size increase | Low | Only 3 languages, ~2KB per lang |

---

## 8. Files to Modify

### New Files
| File | Purpose |
|------|---------|
| `src/tunnel/config.ts` | Tunnel config schema |
| `src/tunnel/provider.ts` | Tunnel provider abstraction |
| `src/tunnel/cloudflare.ts` | Cloudflare tunnel |
| `src/tunnel/ngrok.ts` | ngrok tunnel |
| `src/tunnel/manager.ts` | Tunnel lifecycle |
| `src/auth/oauth-config.ts` | OAuth config |
| `src/auth/jwt.ts` | JWT utilities |
| `src/auth/session.ts` | Session store |
| `src/auth/oauth-flow.ts` | OAuth flow |
| `src/auth/middleware.ts` | Auth middleware |
| `src/auth/login-page.ts` | Login UI |
| `src/i18n/en.json` | English |
| `src/i18n/id.json` | Indonesian |
| `src/i18n/ja.json` | Japanese |
| `src/i18n/index.ts` | i18n core |
| `scripts/test-tunnel.sh` | Tunnel tests |
| `scripts/test-oauth.sh` | OAuth tests |
| `scripts/test-i18n.sh` | i18n tests |

### Modified Files
| File | Changes |
|------|---------|
| `src/api/server.ts` | Mount tunnel/auth routes, protect endpoints |
| `src/dashboard/dashboard.ts` | Tunnel panel, auth UI, lang switcher |
| `src/landing.ts` | i18n support |
| `src/cli/terminalUI.js` | Tunnel menu, auth menu |
| `src/config.ts` | Add tunnel/oauth/i18n to YAML schema |
| `src/index.ts` | Init tunnel manager, auth, i18n |
| `scripts/doctor.sh` | Tunnel/OAuth health checks |
| `README.md` | Feature documentation |
| `8router.yaml` | Default config with new sections |

---

## Approval Required

Setelah plan ini di-approve, eksekusi dimulai:

1. **Phase 1 — Tunnel** → coding, test, commit
2. **Phase 2 — OAuth** → coding, test, commit
3. **Phase 3 — i18n** → coding, test, commit
4. **Final** → version bump v0.6.0, git tag, README update
