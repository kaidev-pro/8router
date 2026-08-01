#!/usr/bin/env node
// 8Router — Provider Foundation CLI
import { buildProviderDescriptors, getCapabilityRegistry, getModelRegistry } from '../dist/providers/provider-foundation.js';

const args = process.argv.slice(2);
const command = args[0];
const json = args.includes('--json');

if (command === 'list') {
  const descriptors = buildProviderDescriptors();
  if (json) { console.log(JSON.stringify(descriptors, null, 2)); process.exit(0); }
  console.log('\n  Provider Catalog\n');
  for (const d of descriptors) {
    const caps = Object.entries(d.capabilities).filter(([_, v]) => v).map(([k]) => k).join(', ');
    console.log(`  ${d.id.padEnd(20)} ${d.displayName.padEnd(25)} ${d.protocol.padEnd(12)} ${d.tier.padEnd(14)} ${d.status}`);
    console.log(`  ${''.padEnd(20)} Capabilities: ${caps}`);
  }
  console.log(`\n  Total: ${descriptors.length} providers\n`);
  process.exit(0);
}

if (command === 'models') {
  const registry = getModelRegistry();
  const providerFilter = args.find(a => a.startsWith('--provider='))?.split('=')[1];
  const models = providerFilter ? registry.getModels(providerFilter) : registry.getAllModels();
  if (json) { console.log(JSON.stringify(models, null, 2)); process.exit(0); }
  console.log('\n  Model Registry\n');
  for (const m of models.slice(0, 50)) {
    console.log(`  ${m.providerId.padEnd(20)} ${m.id.padEnd(40)} ${m.source}`);
  }
  console.log(`\n  Total: ${models.length} models\n`);
  process.exit(0);
}

if (command === 'capabilities') {
  const reg = getCapabilityRegistry();
  const descriptors = reg.getAllDescriptors();
  if (json) { console.log(JSON.stringify(descriptors.map(d => ({ id: d.id, capabilities: d.capabilities })), null, 2)); process.exit(0); }
  console.log('\n  Provider Capabilities\n');
  const capKeys = ['chat', 'vision', 'image', 'embedding', 'streaming', 'toolCalling', 'jsonMode', 'reasoning'];
  console.log('  ' + 'Provider'.padEnd(20) + capKeys.map(k => k.padEnd(12)).join(''));
  console.log('  ' + '-'.repeat(20 + capKeys.length * 12));
  for (const d of descriptors) {
    const row = capKeys.map(k => (d.capabilities[k] ? 'Y' : '.').padEnd(12)).join('');
    console.log(`  ${d.id.padEnd(20)}${row}`);
  }
  console.log('');
  process.exit(0);
}

if (command === 'discover') {
  console.log('\n  Discovery (dry-run only in Phase 5A)\n');
  process.exit(0);
}

console.log(`
  8Router Provider Foundation CLI

  Usage:
    npm run providers:list              List all providers
    npm run providers:models            List all models
    npm run providers:capabilities      Show capability matrix
    npm run providers:discover          Discovery (dry-run)
  `);
