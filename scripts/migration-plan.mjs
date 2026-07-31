#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
const args = process.argv.slice(2);
const has = f => args.includes(f);
const val = f => { const i=args.indexOf(f); return i>=0 ? args[i+1] : undefined; };
try {
  const mod = await import('../dist/providers/connection-migration.js');
  const provider = val('--provider');
  const out = val('--output');
  const json = has('--json');
  const includeEntries = has('--include-entries');
  const plan = await mod.buildMigrationPlan({ providerId: provider });
  const body = JSON.stringify(plan, null, 2) + '\n';
  if (out) { const path = resolve(out); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, body); }
  if (json || out) process.stdout.write(body); else {
    console.log('Migration plan generated');
    console.log(`planId: ${plan.planId}`);
    console.log(`eligible: ${plan.eligible}`);
    console.log(`blocked: ${plan.blocked}`);
    console.log(`requiresReview: ${plan.requiresReview}`);
  }
  process.exit(0);
} catch (e) { console.error('migration plan failed'); process.exit(1); }
