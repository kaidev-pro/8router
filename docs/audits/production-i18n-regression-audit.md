# Production i18n Regression Audit

## Baseline

- Repository: `/root/8router`
- Branch: `main`
- Starting HEAD: `c780af5c6f39c0e11762bc2ac880c8769192302b`
- Working tree at baseline: clean
- Remote state: `origin/main [ahead 29]`
- Service: `8router.service`
- Service status at baseline: active/running
- Main PID at baseline: `1109487`
- Runtime process PID observed listening: `1109498`
- WorkingDirectory: `/root/8router`
- ExecStart: `/root/8router/node_modules/.bin/tsx src/index.ts`
- Drop-in: `/etc/systemd/system/8router.service.d/secrets.conf`
- Public route: `https://8router.8agents.xyz/`
- Local route: `http://127.0.0.1:8080/8router/`

## Root Cause

`src/i18n/en.json` and `src/i18n/ja.json` were invalid JSON due missing commas after `db.cli.securityNote`.

`src/i18n/translator.ts` swallowed dictionary parse failures and cached an empty translation map. Because English is default fallback, default/public render returned raw translation keys like `hero.title1`, `services.title`, `providers.title`, and `security.title`.

Secondary defect: query/cookie locale values like `id-ID`, `en-US`, and `ja-JP` were not normalized before validation, so variant locales could fall back unexpectedly.

## Affected Locales

- `en`: affected. Default English dictionary failed to parse.
- `ja`: affected. Japanese dictionary failed to parse.
- `id`: dictionary parsed correctly, but `id-ID` query/cookie variant was not normalized.

## Affected Routes

- `/8router/`
- public `/`
- query/cookie locale variants for landing page rendering

## Source vs Deployment

Service runs source directly via `tsx src/index.ts` from `/root/8router`. No separate stale `dist`/static build root was identified for landing page rendering.

## Translation Loading Path

request -> Express route `/8router/` -> `getLocale(req)` -> locale normalization/selection -> `getLandingHTML(locale)` -> `t(key, locale)` -> `src/i18n/{locale}.json` via `readFileSync` -> English fallback -> sanitized missing-key fallback.

## Fix

- Added missing JSON commas in `src/i18n/en.json` and `src/i18n/ja.json`.
- Added safe `normalizeLocale()` for `id-ID -> id`, `en-US -> en`, `ja-JP -> ja`.
- Applied normalization to query parameter, cookie, and Accept-Language flows.
- Changed missing-key behavior to log sanitized diagnostics and return non-key fallback text instead of public raw key.
- Added production i18n regression tests.

## Tests Added

`src/__tests__/i18n-regression.test.ts` covers:

1. Default locale loads real text.
2. Indonesian locale loads real text.
3. English locale loads real text.
4. Japanese locale loads real text.
5. `id-ID` normalizes correctly.
6. `en-US` normalizes correctly.
7. `ja-JP` normalizes correctly.
8. Unsupported locale falls back safely.
9. Production homepage HTML does not contain known raw keys.
10. Dictionary resources exist and parse.
11. Missing-key behavior is sanitized.
12. Linux-sensitive i18n paths resolve exactly.

## Validation

- `npx tsc --noEmit`: exit `0`
- `npm run build`: exit `0`
- `npm test`: exit `0`; result line `20 passed, 0 failed`; includes i18n subtests `12 passed, 0 failed`
- `npm run test:provider-activation-security`: exit `0`; `24 passed, 0 failed`
- `npm run doctor`: exit `0`; `FAILURES=0 WARNINGS=1 BLOCKED=1`
- lint: `NOT_CONFIGURED`

Doctor warning/blocker unchanged: i18n key coverage warning and provider-backed chat not live-tested due missing access key/provider config. No provider activation was performed.

## Mobile Viewport Verification

Source CSS already contains viewport overflow guards and responsive nav hiding. Post-fix HTML was checked for translation key leakage; no layout redesign was performed because defect was i18n parsing/loading, not confirmed layout regression.

Planned viewport checklist for browser QA after restart/public verification:

- 320 px
- 375 px
- 390 px
- 768 px
- 1024 px
- 1440 px

Checks: navigation overflow, readable hero copy, non-colliding buttons, usable cards/tables, natural section heading wraps, no horizontal overflow.

## Deployment

Official service restart required after commit because runtime process was already loaded from source. Restart performed only after root cause identified and validation passed.

## Rollback

Use Git rollback to previous HEAD, rebuild/validate, and restart service:

```bash
cd /root/8router
git revert <fix-commit>
npm run build
sudo systemctl restart 8router.service
```

Do not reset or rewrite history.

## Final Deployment Evidence

- Ending HEAD: `0349516f76560d0dd28f115b8783688d32c0bd2b`
- Commit: `0349516 fix(i18n): restore production translation loading`
- Push status: not pushed; local `main` ahead of `origin/main` by 30 commits.
- Service restart: PASS; `8router.service` active/running after restart.
- Restarted MainPID: `1222544`
- Runtime command after restart: `/root/8router/node_modules/.bin/tsx src/index.ts`

## Render Verification After Restart

Checked URLs:

- `http://127.0.0.1:8080/8router/`
- `http://127.0.0.1:8080/8router/?lang=id`
- `http://127.0.0.1:8080/8router/?lang=en`
- `http://127.0.0.1:8080/8router/?lang=ja`
- `http://127.0.0.1:8080/8router/?lang=id-ID`
- `http://127.0.0.1:8080/8router/?lang=en-US`
- `http://127.0.0.1:8080/8router/?lang=ja-JP`
- `http://127.0.0.1:8080/8router/?lang=miss`
- `https://8router.8agents.xyz/`

Result: no `hero.title1`, `services.title`, `providers.title`, `security.title`, or `start.title` leaks found.

## Mobile Viewport Verification Result

Headless Chrome screenshots captured and inspected at:

- 320 px: PASS
- 375 px: PASS
- 390 px: PASS
- 768 px: PASS
- 1024 px: PASS
- 1440 px: PASS

Checks passed: navigation did not overflow, hero copy remained readable, buttons did not collide, cards stayed usable, headings wrapped naturally, and no horizontal page overflow was visible.
