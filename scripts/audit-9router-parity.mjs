#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';

const PINNED_9ROUTER_SHA = '6fcd27337a7893642c7fe630840d0a641743f28f';
const args = process.argv.slice(2);
const getArg = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

if (args.includes('--help') || args.includes('-h')) {
  console.log(`8Router ↔ 9Router parity inventory\n\nUsage:\n  npm run audit:9router-parity -- --target /path/to/9router [--output artifacts/9router-parity-inventory.json]\n\nThe target checkout must be pinned to ${PINNED_9ROUTER_SHA}.`);
  process.exit(0);
}

const target = getArg('--target');
const output = getArg('--output') || 'artifacts/9router-parity-inventory.json';
if (!target) {
  console.error('Missing --target /path/to/9router checkout. Run with --help for usage.');
  process.exit(2);
}

const root = process.cwd();
const read = (p) => fs.readFileSync(p, 'utf8');
const exists = (p) => fs.existsSync(p);
const targetRoot = path.resolve(target);

const required9 = [
  'open-sse/providers/registry/index.js',
  'src/shared/constants/providers.js',
  'docs/ARCHITECTURE.md',
];
for (const rel of required9) {
  if (!exists(path.join(targetRoot, rel))) {
    console.error(`Invalid 9Router checkout: missing ${rel}`);
    process.exit(3);
  }
}

function execGitHead(dir) {
  try {
    const headPath = path.join(dir, '.git', 'HEAD');
    const head = read(headPath).trim();
    if (/^[0-9a-f]{40}$/.test(head)) return head;
    if (head.startsWith('ref: ')) {
      const refPath = path.join(dir, '.git', head.slice(5));
      if (exists(refPath)) return read(refPath).trim();
    }
  } catch {}
  return null;
}

const targetHead = execGitHead(targetRoot);
const registryIndex = read(path.join(targetRoot, 'open-sse/providers/registry/index.js'));
const activeImports = [...registryIndex.matchAll(/^import\s+p\d+\s+from\s+"\.\/([^"\n]+)";/gm)].map(m => m[1].replace(/\.js$/, ''));
const hiddenImports = [...registryIndex.matchAll(/^\/\/\s*import\s+p\d+\s+from\s+"\.\/([^"\n]+)";/gm)].map(m => m[1].replace(/\.js$/, ''));

const catalogPath = path.join(root, 'src/providers/catalog.ts');
const catalog = read(catalogPath);
const eightProviders = [...catalog.matchAll(/\bid:\s*'([^']+)'/g)].map(m => m[1]);

const checks = {
  openaiChat: exists(path.join(root, 'src/runtime/chat-completions.ts')),
  openaiResponses: exists(path.join(root, 'src/bridge/openai-responses')),
  anthropicBridge: exists(path.join(root, 'src/bridge/anthropic')),
  geminiBridge: exists(path.join(root, 'src/bridge/gemini')),
  combos: exists(path.join(root, 'src/router/combos.ts')),
  multiKeyPool: exists(path.join(root, 'src/providers/key-pool.ts')),
  oauth: exists(path.join(root, 'src/oauth')),
  encryptedCredentials: exists(path.join(root, 'src/security/credentials/encrypt.ts')),
  accessKeys: exists(path.join(root, 'src/security/access-keys')),
  usage: exists(path.join(root, 'src/runtime/usage')),
  cloudSync: [...walk(root)].some(p => /cloud.?sync/i.test(p)),
  dashboard: exists(path.join(root, 'src/dashboard/dashboard.ts')),
  cli: exists(path.join(root, 'src/cli')),
  tunnel: exists(path.join(root, 'src/tunnel')),
};

function* walk(dir) {
  for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
    if (['node_modules', '.git', 'dist'].includes(ent.name)) continue;
    const full = path.join(dir, ent.name);
    if (ent.isDirectory()) yield* walk(full);
    else yield path.relative(root, full);
  }
}

const shared = eightProviders.filter(id => activeImports.includes(id));
const missingProviders = activeImports.filter(id => !eightProviders.includes(id));
const extraProviders = eightProviders.filter(id => !activeImports.includes(id));

const result = {
  generatedAt: new Date().toISOString(),
  target: {
    repository: 'decolua/9router',
    expectedSha: PINNED_9ROUTER_SHA,
    detectedSha: targetHead,
    shaMatches: targetHead === null ? null : targetHead === PINNED_9ROUTER_SHA,
    activeProviderCount: activeImports.length,
    hiddenProviderCount: hiddenImports.length,
  },
  source: {
    repository: 'kaidev-pro/8router',
    providerCount: eightProviders.length,
  },
  providers: {
    shared,
    missingFrom8Router: missingProviders,
    extraIn8Router: extraProviders,
  },
  capabilityPresence: checks,
  notes: [
    'Presence checks do not prove runtime parity.',
    'Each capability still requires wiring, contract tests, and operational evidence.',
    'Provider names may need alias normalization before final gap classification.',
  ],
};

const outPath = path.resolve(root, output);
fs.mkdirSync(path.dirname(outPath), { recursive: true });
fs.writeFileSync(outPath, JSON.stringify(result, null, 2) + '\n');
console.log(`Wrote ${path.relative(root, outPath)}`);
console.log(`8Router providers: ${eightProviders.length}`);
console.log(`9Router active providers: ${activeImports.length}`);
console.log(`Shared exact IDs: ${shared.length}`);
console.log(`Missing exact IDs: ${missingProviders.length}`);
if (targetHead && targetHead !== PINNED_9ROUTER_SHA) {
  console.warn(`WARNING: target HEAD ${targetHead} does not match pinned SHA ${PINNED_9ROUTER_SHA}`);
  process.exitCode = 4;
}
