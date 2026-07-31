#!/usr/bin/env node
const args = process.argv.slice(2);
const val = f => { const i=args.indexOf(f); return i>=0 ? args[i+1] : undefined; };
const has = f => args.includes(f);
try {
  const mod = await import('../dist/providers/connection-migration.js');
  const plan = val('--plan');
  const confirm = val('--confirm');
  const execute = has('--execute');
  if (!plan || !confirm) { console.error('--plan and --confirm required'); process.exit(1); }
  const fs = await import('node:fs');
  const planData = JSON.parse(fs.readFileSync(plan, 'utf8'));
  if (!execute) { console.log('Dry run: plan validated, no writes performed'); process.exit(0); }
  const result = mod.executeMigrationPlan(planData.planId, confirm);
  console.log(JSON.stringify(result, null, 2));
  process.exit(result.failed > 0 ? 2 : 0);
} catch (e) { console.error('migration failed:', e instanceof Error ? e.message : e); process.exit(1); }
