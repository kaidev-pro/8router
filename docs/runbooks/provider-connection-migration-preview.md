# Provider Connection Migration Preview Runbook

Run summary:

```bash
npm run provider-connections:preview
```

JSON with records:

```bash
npm run provider-connections:preview -- --json --include-records --output artifacts/provider-connection-preview.json
```

Strict mode exits `2` when ambiguous or blocked records exist.

Hardening note: dedicated preview coverage now exercises matching, summaries, CLI, API route/auth/no-store/static-before-dynamic ordering, redaction, no-write/no-decrypt seams, strict exit behavior, and feature flag default. Dashboard UI is deferred; API and CLI are complete for this phase.
