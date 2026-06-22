#!/usr/bin/env node
// 8Router CLI Entry Point
import { createRequire } from 'module';
const require = createRequire(import.meta.url);

// Use tsx for TypeScript execution
const tsxPath = require.resolve('tsx/cli');
import { execSync } from 'child_process';

const args = process.argv.slice(2).map(a => JSON.stringify(a)).join(' ');
execSync(`node --import tsx ${tsxPath} ${args}`, {
  cwd: new URL('..', import.meta.url).pathname,
  stdio: 'inherit',
});
