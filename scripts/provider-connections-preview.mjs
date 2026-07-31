#!/usr/bin/env node
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';

const args = process.argv.slice(2);
const has = f => args.includes(f);
const val = f => { const i=args.indexOf(f); return i>=0 ? args[i+1] : undefined; };
try {
  const mod = await import('../dist/providers/connection-reconciliation.js');
  const includeRecords = has('--include-records');
  const json = has('--json');
  const provider = val('--provider');
  const out = val('--output');
  const strict = has('--strict');
  const report = await mod.buildDefaultPreviewReport(includeRecords || json || !!out);
  if (provider) {
    report.records = report.records.filter(r => r.providerId === provider);
    report.providers = report.providers.filter(p => p.providerId === provider);
  }
  const blocked = report.summary.blocked || 0;
  const ambiguous = report.summary.ambiguous || 0;
  const body = JSON.stringify(report, null, 2) + '\n';
  if (out) { const path = resolve(out); mkdirSync(dirname(path), { recursive: true }); writeFileSync(path, body); }
  if (json) process.stdout.write(body); else {
    console.log('Provider connection preview');
    console.log(`schemaVersion: ${report.schemaVersion}`);
    console.log(`legacy: ${report.summary.totalLegacy}`);
    console.log(`providerConnections: ${report.summary.totalProviderConnections}`);
    console.log(`exactMatches: ${report.summary.exactMatches}`);
    console.log(`requiresReview: ${report.summary.requiresReview}`);
    console.log(`blocked: ${blocked}`);
  }
  process.exit(strict && (blocked > 0 || ambiguous > 0) ? 2 : 0);
} catch (e) {
  console.error('provider-connections preview failed');
  process.exit(1);
}
