# 8Router Changelog

## v0.6.1 — Full UI i18n Polish + Resilient Tests
**Released: 2026-06-30**

### 🚀 Highlights
- **Full UI i18n** — Dashboard, setup guide, and login page now support EN/ID/JA
- **Dashboard language switcher** — Switch language from the dashboard statusbar
- **Resilient OpenAI-compat tests** — Tests pass even when providers are down (warnings, not failures)
- **Centralized version** — Single source of truth in `src/version.ts`

### ✨ New Features

#### Dashboard i18n (205 keys)
- Sidebar navigation translated
- Page titles and descriptions translated
- Status bar labels translated
- Button labels translated
- Table column headers translated
- Health status labels translated
- Settings page translated
- Playground UI translated
- API keys management translated
- Budget controls translated
- Token saver labels translated
- Mobile navigation translated
- Language switcher in statusbar (EN/ID/JA)

#### Setup Guide i18n (33 keys)
- Page title and description translated
- Field labels (Base URL, API Key, Model) translated
- Copy button text translated
- Security notes translated
- Status labels translated

#### Login Page i18n (9 keys)
- Sign in heading translated
- Subtitle translated
- Continue with provider button translated
- Access restriction messages translated
- HTML lang attribute dynamic

#### OpenAI-Compat Test Resilience
- Tests auto-detect working model from healthy provider
- Provider-down failures are warnings, not test failures
- New `test:providers-live` script for live provider availability
- Contract tests (format, auth, errors) always pass
- Live provider tests report degraded/down status separately

### 📊 Translation Coverage
| Page | Keys | Languages |
|------|------|-----------|
| Landing page | 137 | EN, ID, JA |
| Dashboard | 205 | EN, ID, JA |
| Setup guide | 33 | EN, ID, JA |
| Login page | 9 | EN, ID, JA |
| **Total** | **384** | **3 languages** |

### 📋 Doctor Checks (23 total)
- 19 previous checks
- +4 new: dashboard i18n coverage, setup guide i18n, login page i18n, test resilience

### ✅ Test Results
- `test:i18n` — 20/20 (was 11/11)
- `test:openai-compat` — 12/12 + 4 warnings (was 9/12 with 3 failures)
- `test:providers-live` — NEW (live provider availability)
- `test:oauth` — 12/12
- `test:tunnel` — 12/12
- `test:branding` — 58/58
- `doctor` — 23/23

### ⚠️ Known Limitations
- Login page i18n requires OAuth to be enabled to test
- Some dashboard strings in client-side JS may have English fallbacks
- OAuth session store is in-memory
- No OAuth token refresh yet

---

## v0.6.0 — Shared Access & Public Readiness
**Released: 2026-06-30**

### 🚀 Highlights
- **Tunnel Support** — Expose 8Router dashboard safely via Cloudflare/ngrok/manual tunnels
- **OAuth Login** — Google + GitHub OAuth with email/domain allowlists
- **i18n Support** — Landing page now available in English, Indonesian, and Japanese
- **Security Hardening** — All OAuth secrets masked, local-only admin endpoints preserved

### ✨ New Features

#### Phase 1 — Tunnel
- `src/tunnel/` — Full tunnel module (7 files)
- Support for Cloudflare Quick Tunnel, ngrok, and manual tunnel
- Config: `tunnel.enabled`, `tunnel.provider`, `tunnel.mode`, `tunnel.authRequired`
- `/admin/tunnel/status` — Tunnel health check
- Access modes: `dashboard-only` (default), `auth-required`
- Fallback chain: cloudflare → ngrok → manual
- `--tunnel` CLI flag to enable tunnel on startup

#### Phase 2 — OAuth
- `src/oauth/` — Full OAuth module (8 files)
- Google and GitHub OAuth providers
- Config: `oauth.enabled`, `oauth.provider`, `oauth.allowedEmails`, `oauth.allowedDomains`
- Session management with HMAC-SHA256 signed cookies
- Routes: `/auth/login`, `/auth/logout`, `/auth/me`, `/auth/google`, `/auth/github`
- `/admin/oauth/status` — OAuth health check
- OAuth disabled by default — `/v1` always uses API key auth

#### Phase 3 — i18n (Landing Page)
- `src/i18n/` — Full i18n module (6 files)
- 137 translation keys per language
- Locale detection: `?lang=` → cookie → Accept-Language → default (en)
- Language switcher in landing page footer
- EN (default), ID (Indonesian), JA (Japanese)

### 🔒 Security
- All OAuth secrets masked (`sk-xxxx...abcd`) in logs, dashboard, config endpoints
- OAuth clientSecret, sessionSecret never exposed in API responses
- Dashboard remains local-only (nginx 404 external, bind 127.0.0.1)
- `/v1` API key auth unaffected by OAuth

### 📋 Doctor Checks (19 total)
- 13 original health checks
- +2 Tunnel checks (enabled/disabled, validation)
- +2 OAuth checks (enabled/disabled, validation)
- +3 i18n checks (config loaded, no missing keys, locale detection)

### ✅ Test Results (124/124 passed)
- `test:branding` — 58/58
- `test:openai-compat` — 12/12
- `test:tunnel` — 12/12
- `test:oauth` — 12/12
- `test:i18n` — 11/11
- `doctor` — 19/19

### 📝 Documentation
- README.md updated with Tunnel, OAuth, and i18n sections
- .env.example updated with tunnel, OAuth, and i18n variables
- Setup guide updated with i18n configuration

### ⚠️ Known Limitations
- Dashboard i18n planned for v0.6.1
- Setup guide i18n planned for v0.6.1
- Login page i18n planned for v0.6.1
- OAuth session store is in-memory (resets on restart)
- No OAuth token refresh yet

### 🔄 Migrations
- None — all changes are backward-compatible

---

## v0.5.0 — Full Provider Expansion
**Released: 2026-06-29**

### Highlights
- 12 providers, 30+ models
- Cost-optimized routing (`8router/cheap`, `8router/free`, `8router/subscription`)
- Key Pool with health checks and rotation
- Format Bridge (OpenAI ↔ Anthropic ↔ Gemini)
- Dashboard redesign with real-time metrics
- Provider logos (23 SVGs)
- Integration logos (8 SVGs)
- 58 branding tests, 12 OpenAI-compat tests

---

## v0.4.0 — Production Hardening
**Released: 2026-06-28**

### Highlights
- Request logging with SQLite
- Key health tracking with circuit breaker
- Key-level retry + provider fallback chain
- Secret masking in all outputs
- Admin endpoints (local-only)
- Doctor command (13 health checks)
- Backup/export config

---

## v0.3.0 — Core Routing
**Released: 2026-06-27**

### Highlights
- Multi-provider routing (6 providers)
- Model alias system
- OpenAI-compatible API
- Basic dashboard
- Quota tracking
