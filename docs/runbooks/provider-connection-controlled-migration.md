# Controlled Migration Runbook

1. Generate plan: `npm run provider-connections:migration-plan -- --json --output artifacts/plan.json`
2. Review plan
3. Validate: CLI validates automatically
4. Execute dry-run: `npm run provider-connections:migrate -- --plan artifacts/plan.json --confirm <planId>`
5. Execute real: add `--execute`
6. Rollback if needed: `npm run provider-connections:rollback -- --plan-id <planId> --confirm <planId> --execute`
