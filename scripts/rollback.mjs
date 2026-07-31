#!/usr/bin/env node
const args = process.argv.slice(2);
const val = f => { const i=args.indexOf(f); return i>=0 ? args[i+1] : undefined; };
const has = f => args.includes(f);
try {
  const mod = await import('../dist/providers/connection-migration.js');
  const planId = val('--plan-id');
  const confirm = val('--confirm');
  const execute = has('--execute');
  if (!planId || !confirm) { console.error('--plan-id and --confirm required'); process.exit(1); }
  if (!execute) { console.log('Dry run: rollback validated, no writes performed'); process.exit(0); }
  const result = mod.rollbackMigrationPlan(planId, confirm);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.failed > 0 ? 5 : 0);
} catch (e) { console.error('rollback failed:', e instanceof Error ? e.message : e); process.exit(1); }
