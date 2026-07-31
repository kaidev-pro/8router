#!/usr/bin/env node
const args = process.argv.slice(2);
const has = f => args.includes(f);
try {
  const mod = await import('../dist/providers/shadow-sync.js');
  const result = await mod.runShadowSync();
  if (has('--json')) { console.log(JSON.stringify(result, null, 2)); } else {
    console.log('Shadow sync diagnostic');
    console.log(`enabled: ${result.enabled}`);
    console.log(`recordsCompared: ${result.recordsCompared}`);
    console.log(`driftCategories: ${result.driftCategories.length}`);
  }
  process.exit(0);
} catch (e) { console.error('shadow sync failed:', e instanceof Error ? e.message : e); process.exit(1); }
