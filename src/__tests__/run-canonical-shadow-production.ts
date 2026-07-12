// 8Router — Shadow Production Validation Test Runner (Phase 3A)
import { execSync } from 'child_process';
try {
  execSync('npx tsx src/__tests__/canonical-shadow-production.test.ts', { cwd: process.cwd(), stdio: 'inherit' });
} catch { process.exit(1); }
