# Doctor Hygiene and i18n Completion Audit

## Baseline

- Host: `187.77.142.198`
- Repository: `/root/8router`
- Branch: `main`
- Starting HEAD: `c06e1d607e2cae933cf877cfc671e8e51e28dfda`
- Baseline tag: `phase3a-ui-baseline-20260718` unchanged
- Initial working tree: clean
- Initial ahead/behind: `main...origin/main` clean, `0 behind / 0 ahead`
- Service: `8router.service` active/running
- Baseline MainPID: `1252212`

## Previous Doctor Summary

```text
FAILURES=0 WARNINGS=1 BLOCKED=1
DOCTOR_EXIT=0
```

Known findings:

- i18n missing keys: `id:18`, `ja:1`
- `/v1/chat/completions` not live-tested due provider credential/smoke key configuration requirement

## Exact Missing Keys

### Indonesian

All missing Indonesian keys were active dashboard CLI configuration UI strings.

- `db.cli.supported`
- `db.cli.experimental`
- `db.cli.comingSoon`
- `db.cli.comingSoonMsg`
- `db.cli.step1Title`
- `db.cli.step2Title`
- `db.cli.step3Title`
- `db.cli.step4Title`
- `db.cli.keyWarning`
- `db.cli.testConnection`
- `db.cli.connected`
- `db.cli.testFailed`
- `db.cli.testing`
- `db.cli.enterKey`
- `db.cli.copied`
- `db.cli.copyFailed`
- `db.cli.configDesc`
- `db.cli.securityNote`

### Japanese

- `db.cli.unknown`

## Translation Decisions

- Added natural Indonesian CLI/dashboard translations while preserving product and technical terms: `8Router`, `API key`, `access key`, `provider`, `tool`, `Model`.
- Added Japanese `db.cli.unknown` as `不明`, matching compact dashboard status context.
- No deprecated keys found.
- No locale exclusions added.
- No wildcard exclusions added.
- No placeholders changed; placeholder validation passes across English, Indonesian, and Japanese.

## Doctor Category Definitions

Doctor now documents and supports these semantic categories:

- `PASS`: required configured check works.
- `WARNING`: non-critical issue exists, feature remains usable.
- `NOT_CONFIGURED`: supported optional capability intentionally lacks configuration.
- `BLOCKED_EXTERNAL`: configured or requested validation is blocked by an external dependency.
- `FAIL`: required configured feature is broken.

## `/v1/chat/completions` Classification

Final classification: `NOT_CONFIGURED`.

Reason:

- Provider-backed chat live test has not been configured with provider credential plus smoke access key.
- Doctor does not generate credentials, access keys, or execute provider-backed traffic.
- Doctor does not claim `/v1/chat/completions` has been live-verified.

Output:

```text
/v1/chat/completions live test not configured — provider credential and smoke access key required
```

## Final Doctor Summary

```text
FAILURES=0 WARNINGS=0 BLOCKED=0 NOT_CONFIGURED=1
DOCTOR_EXIT=0
```

## Tests Added/Updated

- `src/__tests__/doctor-hygiene.test.ts`
- `src/__tests__/run-doctor-hygiene.ts`
- `npm run test:doctor-hygiene`
- strengthened `src/__tests__/i18n-regression.test.ts`
- integrated doctor hygiene tests into `npm test`

New coverage includes:

- zero missing active Indonesian/Japanese keys
- placeholder parity across locales
- no unsupported wildcard exclusions
- doctor `NOT_CONFIGURED` does not increment `WARNINGS`, `BLOCKED`, or `FAILURES`
- configured external dependency branch maps to `BLOCKED_EXTERNAL`
- unexpected live validation failure maps to `FAIL`
- successful live validation branch maps to `PASS`
- summary includes `NOT_CONFIGURED`
- doctor does not claim provider-backed chat success without evidence

## Validation

- `npx tsc --noEmit`: exit `0`
- `npm run build`: exit `0`
- `npm run test:typography-responsive`: exit `0`, `15 passed, 0 failed`
- `npm run test:i18n-regression`: exit `0`, `16 passed, 0 failed`
- `npm run test:doctor-hygiene`: exit `0`, `10 passed, 0 failed`
- `npm test`: exit `0`, `49 passed, 0 failed`
- `npm run test:provider-activation-security`: exit `0`, `24 passed, 0 failed`
- `npm run doctor`: exit `0`, `FAILURES=0 WARNINGS=0 BLOCKED=0 NOT_CONFIGURED=1`
- lint: `NOT_CONFIGURED`

## Secret/Hygiene Notes

- No `.env` file staged.
- No provider credential changed.
- No access key generated.
- No runtime database or log staged.
- Worktree gitleaks scan saw ignored `.env` and existing fixture matches; no new secret values were printed. Staged changes were reviewed before commit.

## Deployment Evidence

To be updated after commit and service restart.

## Rollback

```bash
cd /root/8router
git revert <DOCTOR_HYGIENE_COMMIT_HASH>
systemctl restart 8router.service
systemctl status 8router.service --no-pager
```

If a separate documentation commit exists, revert in reverse chronological order.

## Deployment Evidence

- Implementation commit: `30749cfda831b2114df9a49c027e8dbef4f57465`
- Old PID: `1252212`
- New PID: `1391395`
- Service restart: PASS
- Service state: active/running
- `health_http=200`
- `landing_http=200`
- Public/local raw translation key check: CLEAN
- Locale runtime verification: default, `id`, `ja`, `id-ID`, `ja-JP`, `en-US` all clean
- Final doctor summary: `FAILURES=0 WARNINGS=0 BLOCKED=0 NOT_CONFIGURED=1`
- Final doctor exit: `0`
- Push status: not pushed
- Baseline tag `phase3a-ui-baseline-20260718`: unchanged

## Final Phase Status

```text
Doctor hygiene: PASSED
i18n coverage: COMPLETE
Phase 3A: BLOCKED_EXTERNAL
```

Phase 3A remains `BLOCKED_EXTERNAL` because no provider credential has been activated, no provider-backed completion has been verified, and no canonical/shadow live provider evidence exists.
