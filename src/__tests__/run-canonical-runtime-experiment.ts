// 8Router — Canonical Runtime Experiment Test Runner (Phase 2H)
import { execSync } from 'child_process';
try {
  execSync('npx tsx src/__tests__/canonical-runtime-experiment.test.ts', { cwd: process.cwd(), stdio: 'inherit' });
} catch { process.exit(1); }
