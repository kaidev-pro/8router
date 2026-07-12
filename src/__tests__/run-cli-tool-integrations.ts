// 8Router — CLI Tool Integration Test Runner (Phase 2G)
import { execSync } from 'child_process';
try {
  execSync('npx tsx src/__tests__/cli-tool-integrations.test.ts', { cwd: process.cwd(), stdio: 'inherit' });
} catch { process.exit(1); }
