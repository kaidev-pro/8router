import { execSync } from 'child_process';
try {
  execSync('npx tsx src/__tests__/provider-activation-security.test.ts', { cwd: process.cwd(), stdio: 'inherit' });
} catch { process.exit(1); }
