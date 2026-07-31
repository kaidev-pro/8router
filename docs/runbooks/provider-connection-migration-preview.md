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
