#!/usr/bin/env node
import { spawn } from 'child_process';
import { createRequire } from 'module';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import readline from 'readline';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));

// ─── ANSI Colors ───────────────────────────────────────────────
const C = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  magenta: '\x1b[35m',
  white: '\x1b[37m',
  gray: '\x1b[90m',
  bgDark: '\x1b[48;2;24;24;28m',
  reverse: '\x1b[7m',
  // 8Router brand
  accent: '\x1b[38;2;0;209;255m',
  accentBg: '\x1b[48;2;0;209;255m',
  orange: '\x1b[38;2;255;159;67m',
  line: '\x1b[38;2;50;50;60m',
};

// ─── Config ────────────────────────────────────────────────────
const API_PORT = 8080;
const DASHBOARD_PORT = API_PORT;

// ─── Raw stdin setup ───────────────────────────────────────────
let rawPrimed = false;
function primeRawOnce() {
  if (rawPrimed || !process.stdin.isTTY) return;
  try {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    rawPrimed = true;
  } catch {}
}

function cleanupRaw() {
  if (rawPrimed && process.stdin.isTTY) {
    try { process.stdin.setRawMode(false); } catch {}
  }
}

// ─── Draw box ──────────────────────────────────────────────────
function drawBox(lines, width = 50) {
  const top = `  ${C.line}┌${'─'.repeat(width - 2)}┐${C.reset}`;
  const bottom = `  ${C.line}└${'─'.repeat(width - 2)}┘${C.reset}`;
  const rows = lines.map(l => {
    const stripped = l.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, width - 4 - stripped.length);
    return `  ${C.line}│${C.reset} ${l}${' '.repeat(pad)} ${C.line}│${C.reset}`;
  });
  return [top, ...rows, bottom].join('\n');
}

// ─── Interactive Menu ──────────────────────────────────────────
function showMenu() {
  const W = 50;
  const hr = `${C.line}${'═'.repeat(W)}${C.reset}`;
  
  console.clear();
  console.log('');
  console.log(`  ${C.accent}${C.bright}8${C.orange}${C.bright}Router${C.reset} ${C.dim}v${pkg.version}${C.reset}`);
  console.log(`  ${C.line}${'─'.repeat(W)}${C.reset}`);
  console.log(`  ${C.dim}AI Gateway — One Router. Multi Providers. Zero Downtime.${C.reset}`);
  console.log('');
  console.log(`  ${C.accent}🚀  Server${C.reset}  ${C.dim}http://localhost:${API_PORT}/v1${C.reset}`);
  console.log(`  ${C.accent}📊  Dashboard${C.reset}  ${C.dim}http://localhost:${DASHBOARD_PORT}/8router/dashboard${C.reset}`);
  console.log('');
  console.log(`  ${C.line}${'─'.repeat(W)}${C.reset}`);
  console.log('');
}

async function selectMenu(items) {
  return new Promise((resolve) => {
    let idx = 0;
    let active = true;

    primeRawOnce();

    const render = () => {
      if (!active) return;
      // Move cursor up and redraw
      process.stdout.write('\x1b[2J\x1b[H');
      showMenu();
      items.forEach((item, i) => {
        const sel = i === idx;
        const icon = sel ? `${C.accent}★${C.reset}` : `${C.gray}☆${C.reset}`;
        if (sel) {
          console.log(`  ${C.reverse}${C.bright} ${icon} ${item.label} ${C.reset}`);
        } else {
          console.log(`    ${icon} ${item.label}`);
        }
      });
      console.log('');
      console.log(`  ${C.dim}↑↓ Navigate  •  Enter Select  •  Esc Quit${C.reset}`);
      console.log('');
    };

    const cleanup = () => {
      if (!active) return;
      active = false;
      process.stdin.removeListener('keypress', onKey);
    };

    const onKey = (_str, key) => {
      if (!active || !key) return;
      if (key.name === 'up') { idx = (idx - 1 + items.length) % items.length; render(); }
      if (key.name === 'down') { idx = (idx + 1) % items.length; render(); }
      if (key.name === 'return') { cleanup(); resolve(idx); }
      if (key.name === 'escape') { cleanup(); resolve(-1); }
      if (key.ctrl && key.name === 'c') { cleanup(); cleanupRaw(); process.exit(0); }
    };

    process.stdin.on('keypress', onKey);
    render();
  });
}

// ─── Actions ───────────────────────────────────────────────────
function startServer() {
  console.log(`\n  ${C.accent}🚀 Starting 8Router server...${C.reset}\n`);
  
  const distIndex = join(__dirname, '..', 'dist', 'index.js');
  const child = spawn('node', [distIndex], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env },
  });

  child.on('exit', (code) => {
    process.exit(code || 0);
  });

  // Handle graceful shutdown
  process.on('SIGINT', () => {
    child.kill('SIGINT');
    process.exit(0);
  });
}

function openDashboard() {
  const url = `http://localhost:${DASHBOARD_PORT}/8router/dashboard`;
  const platform = process.platform;
  try {
    if (platform === 'darwin') execSync(`open "${url}"`);
    else if (platform === 'win32') execSync(`start "" "${url}"`);
    else execSync(`xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null`);
    console.log(`\n  ${C.green}✓ Opening ${url}${C.reset}\n`);
  } catch {
    console.log(`\n  ${C.yellow}⚡ Open manually: ${url}${C.reset}\n`);
  }
}

function showStatus() {
  console.log(`\n  ${C.accent}📊 8Router Status${C.reset}\n`);
  console.log(`  Package:   ${C.bright}@kaidev18/eight-router${C.reset} v${pkg.version}`);
  console.log(`  API:       ${C.dim}http://localhost:${API_PORT}/v1${C.reset}`);
  console.log(`  Dashboard: ${C.dim}http://localhost:${DASHBOARD_PORT}/8router/dashboard${C.reset}`);
  console.log(`  Live:      ${C.dim}https://8router.8agents.xyz${C.reset}`);
  console.log('');
  console.log(`  ${C.dim}Providers: 20+ • Fallback: 3-tier • Token Saver: 20-65%${C.reset}`);
  console.log('');
  
  // Quick health check
  try {
    const res = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${API_PORT}/health --connect-timeout 2 2>/dev/null`, { encoding: 'utf8' });
    if (res.trim() === '200') {
      console.log(`  ${C.green}● Server is running${C.reset}`);
    } else {
      console.log(`  ${C.red}● Server is not running${C.reset}`);
    }
  } catch {
    console.log(`  ${C.red}● Server is not running${C.reset}`);
  }
  console.log('');
}

function maskKey(key) {
  if (!key || key.length <= 12) return '***';
  return key.slice(0, 6) + '...' + key.slice(-4);
}

function exportConfig() {
  console.log(`\n  ${C.accent}📦 Exporting 8Router Config...${C.reset}\n`);

  try {
    // Read .env file
    const envPath = join(__dirname, '..', '.env');
    const env8Path = join(__dirname, '..', '8router.env');
    const configPath = existsSync(env8Path) ? env8Path : (existsSync(envPath) ? envPath : null);

    if (!configPath) {
      console.log(`  ${C.red}No .env or 8router.env found${C.reset}\n`);
      return;
    }

    const envContent = readFileSync(configPath, 'utf8');
    const config = {};

    // Parse env vars (mask keys)
    for (const line of envContent.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) continue;

      const eqIdx = trimmed.indexOf('=');
      if (eqIdx < 0) continue;

      const key = trimmed.slice(0, eqIdx).trim();
      let value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');

      // Mask API keys
      if (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET')) {
        value = maskKey(value);
      }

      config[key] = value;
    }

    const output = {
      exportedAt: new Date().toISOString(),
      version: pkg.version,
      config,
    };

    const outPath = join(process.cwd(), `8router-config-${Date.now()}.json`);
    require('fs').writeFileSync(outPath, JSON.stringify(output, null, 2));
    console.log(`  ${C.green}✓ Config exported to: ${outPath}${C.reset}`);
    console.log(`  ${C.dim}API keys are masked for security${C.reset}\n`);
  } catch (e) {
    console.log(`  ${C.red}Error: ${e.message}${C.reset}\n`);
  }
}

function backupAll() {
  console.log(`\n  ${C.accent}💾 Full 8Router Backup...${C.reset}\n`);

  try {
    const backupDir = join(process.cwd(), `8router-backup-${Date.now()}`);
    require('fs').mkdirSync(backupDir, { recursive: true });

    // 1. Export config
    const envPath = join(__dirname, '..', '.env');
    const env8Path = join(__dirname, '..', '8router.env');
    const configPath = existsSync(env8Path) ? env8Path : (existsSync(envPath) ? envPath : null);

    if (configPath) {
      const envContent = readFileSync(configPath, 'utf8');
      const config = {};
      for (const line of envContent.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) continue;
        const eqIdx = trimmed.indexOf('=');
        if (eqIdx < 0) continue;
        const key = trimmed.slice(0, eqIdx).trim();
        let value = trimmed.slice(eqIdx + 1).trim().replace(/^["']|["']$/g, '');
        if (key.includes('KEY') || key.includes('TOKEN') || key.includes('SECRET')) {
          value = maskKey(value);
        }
        config[key] = value;
      }
      require('fs').writeFileSync(join(backupDir, 'config.json'), JSON.stringify(config, null, 2));
      console.log(`  ${C.green}✓ Config saved${C.reset}`);
    }

    // 2. Database
    const dbPath = join(require('os').homedir(), '.8router', 'db', 'data.sqlite');
    if (existsSync(dbPath)) {
      require('fs').copyFileSync(dbPath, join(backupDir, 'data.sqlite'));
      console.log(`  ${C.green}✓ Database saved${C.reset}`);
    }

    // 3. Settings via API (if running)
    try {
      const res = execSync(`curl -s http://localhost:${API_PORT}/8router/settings --connect-timeout 2 2>/dev/null`, { encoding: 'utf8' });
      require('fs').writeFileSync(join(backupDir, 'settings.json'), res);
      console.log(`  ${C.green}✓ Settings saved${C.reset}`);
    } catch {}

    // 4. Quota data via API
    try {
      const res = execSync(`curl -s http://localhost:${API_PORT}/8router/quota --connect-timeout 2 2>/dev/null`, { encoding: 'utf8' });
      require('fs').writeFileSync(join(backupDir, 'quota.json'), res);
      console.log(`  ${C.green}✓ Quota data saved${C.reset}`);
    } catch {}

    console.log(`\n  ${C.green}✓ Backup complete: ${backupDir}${C.reset}`);
    console.log(`  ${C.dim}Database + config + settings + quota${C.reset}\n`);
  } catch (e) {
    console.log(`  ${C.red}Error: ${e.message}${C.reset}\n`);
  }
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  // Check for CLI commands first (work in any environment)
  const args = process.argv.slice(2);
  
  if (args.includes('--export-config')) { exportConfig(); return; }
  if (args.includes('--backup')) { backupAll(); return; }
  if (args.includes('--doctor')) {
    cleanupRaw();
    try {
      execSync(`bash ${join(__dirname, '..', 'scripts', 'doctor.sh')}`, { stdio: 'inherit', env: { ...process.env } });
    } catch (e) {
      console.log(`\n  ${C.red}Doctor check failed:${C.reset} ${e.message}\n`);
    }
    cleanupRaw();
    return;
  }
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
  ${C.accent}8${C.orange}Router${C.reset} v${pkg.version}

  Usage:  8router [options]

  Options:
    --help, -h      Show this help
    --version, -v   Show version
    --start         Start server directly (no menu)
    --dashboard     Open dashboard in browser
    --tui           Open Terminal UI directly
    --export-config Export config to JSON (keys masked)
    --backup        Full backup (config + quota + settings)
    --doctor        Run system health check

  Interactive mode (no args):
    8router
    `);
    return;
  }
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`8router v${pkg.version}`);
    return;
  }
  if (args.includes('--start')) { startServer(); return; }
  if (args.includes('--dashboard')) { openDashboard(); return; }
  if (args.includes('--tui') || args.includes('--terminal')) {
    cleanupRaw();
    try {
      const { startTerminalUI } = await import('../src/cli/terminalUI.js');
      await startTerminalUI(API_PORT);
    } catch (e) {
      console.log(`\n  ${C.red}Failed to start Terminal UI:${C.reset} ${e.message}\n`);
    }
    cleanupRaw();
    return;
  }

  // If no TTY, just start server directly
  if (!process.stdin.isTTY) {
    startServer();
    return;
  }

  // Interactive menu
  const items = [
    { label: 'Start Server', action: () => startServer() },
    { label: 'Open Dashboard', action: () => { openDashboard(); setTimeout(() => main(), 500); } },
    { label: 'Terminal UI (Interactive CLI)', action: async () => {
      cleanupRaw();
      try {
        const { startTerminalUI } = await import('../src/cli/terminalUI.js');
        await startTerminalUI(API_PORT);
      } catch (e) {
        console.log(`\n  ${C.red}Failed to start Terminal UI:${C.reset} ${e.message}\n`);
      }
      cleanupRaw();
      setTimeout(() => main(), 100);
    }},
    { label: 'Status', action: () => { showStatus(); setTimeout(() => main(), 1500); } },
    { label: 'Exit', action: () => { console.log(`\n  ${C.dim}Bye!${C.reset}\n`); cleanupRaw(); process.exit(0); } },
  ];

  const choice = await selectMenu(items);
  if (choice >= 0 && choice < items.length) {
    items[choice].action();
  } else {
    cleanupRaw();
    process.exit(0);
  }
}

main();
