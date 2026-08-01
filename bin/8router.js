#!/usr/bin/env node
import { spawn, execSync } from 'child_process';
import { createRequire } from 'module';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';
import readline from 'readline';

const require = createRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const pkg = JSON.parse(readFileSync(join(__dirname, '..', 'package.json'), 'utf8'));
let VERSION = pkg.version;
try { const v = require(join(__dirname, '..', 'dist', 'version.js')); if (v?.VERSION) VERSION = v.VERSION; } catch {}

// ─── NO_COLOR / Environment ────────────────────────────────────
const NO_COLOR = !!process.env.NO_COLOR;
const isTTY = !!process.stdin.isTTY;
const platform = process.platform;

// ─── ANSI Colors ───────────────────────────────────────────────
const C = NO_COLOR ? {
  reset:'',bright:'',dim:'',cyan:'',green:'',yellow:'',red:'',gray:'',orange:'',white:'',
  reverse:'',line:'',accent:''
} : {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  dim: '\x1b[2m',
  cyan: '\x1b[36m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
  gray: '\x1b[90m',
  white: '\x1b[37m',
  reverse: '\x1b[7m',
  accent: '\x1b[38;2;0;209;255m',
  orange: '\x1b[38;2;255;159;67m',
  line: '\x1b[38;2;50;50;60m',
};

// ─── Box drawing (Unicode / ASCII fallback) ────────────────────
const supportsUnicode = process.env.TERM !== 'dumb' && !process.env.ASCII_ONLY;
const B = supportsUnicode ? {
  tl:'╭',tr:'╮',bl:'╰',br:'╯',h:'─',v:'│',
  ml:'├',mr:'┤',tm:'┬',bm:'┴',cross:'┼',
  dot:'●',dotOff:'○',arrow:'›',bullet:'•'
} : {
  tl:'+',tr:'+',bl:'+',br:'+',h:'-',v:'|',
  ml:'+',mr:'+',tm:'+',bm:'+',cross:'+',
  dot:'*',dotOff:'o',arrow:'>',bullet:'-'
};

// ─── Config ────────────────────────────────────────────────────
const API_PORT = parseInt(process.env.PORT || '8080', 10);
const PUBLIC_BASE_URL = process.env.PUBLIC_BASE_URL || '';
const DASHBOARD_PATH = '/8router/dashboard';

function publicUrl(path = '') {
  if (!PUBLIC_BASE_URL) return null;
  const base = PUBLIC_BASE_URL.replace(/\/+$/, '');
  return base + (path.startsWith('/') ? path : '/' + path);
}

// ─── Terminal width ────────────────────────────────────────────
function termWidth() {
  return Math.max(60, Math.min(120, process.stdout.columns || 80));
}

// ─── Raw stdin ─────────────────────────────────────────────────
let rawPrimed = false;
function primeRawOnce() {
  if (rawPrimed || !isTTY) return;
  try {
    readline.emitKeypressEvents(process.stdin);
    process.stdin.setRawMode(true);
    process.stdin.setEncoding('utf8');
    process.stdin.resume();
    rawPrimed = true;
  } catch {}
}
function cleanupRaw() {
  if (rawPrimed && isTTY) {
    try { process.stdin.setRawMode(false); } catch {}
    rawPrimed = false;
  }
}

// ─── Box renderer ──────────────────────────────────────────────
function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }

function boxLine(content, W) {
  const stripped = stripAnsi(content);
  const pad = Math.max(0, W - 4 - stripped.length);
  return `  ${C.line}${B.v}${C.reset} ${content}${' '.repeat(pad)} ${C.line}${B.v}${C.reset}`;
}

function boxTop(W) { return `  ${C.line}${B.tl}${B.h.repeat(W - 2)}${B.tr}${C.reset}`; }
function boxBottom(W) { return `  ${C.line}${B.bl}${B.h.repeat(W - 2)}${B.br}${C.reset}`; }
function boxDivider(W) { return `  ${C.line}${B.ml}${B.h.repeat(W - 2)}${B.mr}${C.reset}`; }
function boxSep(W) { return `  ${C.line}${B.h.repeat(W)}${C.reset}`; }

// ─── Runtime state ─────────────────────────────────────────────
function checkGatewayRunning() {
  try {
    const res = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${API_PORT}/health --connect-timeout 1 2>/dev/null`, { encoding: 'utf8', timeout: 3000 });
    return res.trim() === '200';
  } catch { return false; }
}

function getGatewayPid() {
  try {
    const res = execSync(`lsof -ti:${API_PORT} 2>/dev/null || ss -tlnp sport = :${API_PORT} 2>/dev/null | grep -oP 'pid=\\K[0-9]+'`, { encoding: 'utf8', timeout: 3000 });
    return res.trim().split('\n')[0] || null;
  } catch { return null; }
}

function getProviderCount() {
  try {
    const mod = require(join(__dirname, '..', 'dist', 'providers', 'catalog.js'));
    return mod?.PROVIDER_CATALOG?.length || 0;
  } catch { return 0; }
}

function getMigrationFlags() {
  return {
    migration: process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED === 'true',
    shadowSync: process.env.PROVIDER_CONNECTION_SHADOW_SYNC_ENABLED === 'true',
  };
}

function getRuntimeState() {
  const running = checkGatewayRunning();
  const pid = running ? getGatewayPid() : null;
  const flags = getMigrationFlags();
  const providerCount = getProviderCount();
  return {
    status: running ? 'Running' : 'Stopped',
    statusIcon: running ? 'dot' : 'dotOff',
    statusColor: running ? C.green : C.red,
    pid,
    port: API_PORT,
    providers: providerCount,
    routing: 'Legacy',
    migration: flags.migration ? 'Enabled' : 'Disabled',
    migrationColor: flags.migration ? C.yellow : C.dim,
    shadowSync: flags.shadowSync ? 'Enabled' : 'Disabled',
    shadowSyncColor: flags.shadowSync ? C.yellow : C.dim,
    running,
  };
}

// ─── Secret masking ────────────────────────────────────────────
function maskSecret(val) {
  if (!val || typeof val !== 'string') return '***';
  if (val.length <= 8) return '***';
  return val.slice(0, 4) + '...' + val.slice(-3);
}

// ─── Header ────────────────────────────────────────────────────
function renderHeader(W) {
  const lines = [];
  lines.push(boxTop(W));
  const brand = `${C.accent}${C.bright}8${C.orange}${C.bright}Router${C.reset}`;
  const ver = `${C.dim}v${VERSION}${C.reset}`;
  const title = `${brand}  ${ver}`;
  lines.push(boxLine(title, W));
  lines.push(boxLine(`${C.dim}Unified AI Provider Gateway${C.reset}`, W));
  lines.push(boxDivider(W));
  return lines;
}

// ─── Status summary ────────────────────────────────────────────
function renderStatus(state, W) {
  const lines = [];
  const row = (label, value, color = C.white) => {
    const l = `${C.dim}${label.padEnd(22)}${C.reset}`;
    const v = `${color}${value}${C.reset}`;
    lines.push(boxLine(`${l}${v}`, W));
  };
  const iconRow = (label, value, color, icon) => {
    const sym = icon === 'dot' ? `${color}${B.dot}${C.reset}` : icon === 'dotOff' ? `${C.dim}${B.dotOff}${C.reset}` : `${C.yellow}${B.bullet}${C.reset}`;
    const l = `${sym} ${C.dim}${label.padEnd(20)}${C.reset}`;
    const v = `${color}${value}${C.reset}`;
    lines.push(boxLine(`${l}${v}`, W));
  };

  iconRow('Gateway', state.status, state.statusColor, state.statusIcon);
  if (state.pid) row('PID', state.pid);
  row('Port', String(state.port));
  row('Providers', String(state.providers));
  row('Routing', state.routing);
  row('Migration', state.migration, state.migrationColor);
  row('Shadow Sync', state.shadowSync, state.shadowSyncColor);

  return lines;
}

// ─── URLs ──────────────────────────────────────────────────────
function renderUrls(W) {
  const lines = [];
  lines.push(boxDivider(W));
  const localApi = `http://localhost:${API_PORT}/v1`;
  const pubApi = publicUrl('/v1');
  const dash = publicUrl(DASHBOARD_PATH);

  const urlRow = (label, url) => {
    lines.push(boxLine(`${C.accent}${B.bullet}${C.reset} ${C.dim}${label}${C.reset}`, W));
    lines.push(boxLine(`  ${url || `${C.dim}Not configured${C.reset}`}`, W));
  };

  urlRow('Local API', localApi);
  urlRow('Public API', pubApi || null);
  urlRow('Dashboard', dash || `http://localhost:${API_PORT}${DASHBOARD_PATH}`);

  return lines;
}

// ─── Menu ──────────────────────────────────────────────────────
function buildMenu(state) {
  const items = [];
  if (state.running) {
    items.push({ label: 'Open Dashboard', id: 'dashboard' });
    items.push({ label: 'Provider Operations', id: 'providers' });
    items.push({ label: 'System Health', id: 'health' });
    items.push({ label: 'Run Doctor', id: 'doctor' });
    items.push({ label: 'View Logs', id: 'logs' });
    items.push({ label: 'Restart Gateway', id: 'restart' });
    items.push({ label: 'Stop Gateway', id: 'stop' });
    items.push({ label: 'Settings', id: 'settings' });
  } else {
    items.push({ label: 'Start Gateway', id: 'start' });
    items.push({ label: 'Open Dashboard', id: 'dashboard' });
    items.push({ label: 'System Health', id: 'health' });
    items.push({ label: 'Run Doctor', id: 'doctor' });
    items.push({ label: 'Settings', id: 'settings' });
  }
  items.push({ label: 'Exit', id: 'exit' });
  return items;
}

function renderMenu(items, selectedIdx, W) {
  const lines = [];
  lines.push(boxDivider(W));
  items.forEach((item, i) => {
    const sel = i === selectedIdx;
    const icon = sel ? `${C.accent}${B.arrow}${C.reset}` : ` `;
    const text = sel ? `${C.bright}${C.white}${item.label}${C.reset}` : `${C.dim}${item.label}${C.reset}`;
    lines.push(boxLine(` ${icon} ${text}`, W));
  });
  return lines;
}

function renderFooter(W) {
  const lines = [];
  lines.push(boxDivider(W));
  const keys = isTTY
    ? `${C.dim}↑↓ Navigate${C.reset}   ${C.dim}Enter Select${C.reset}   ${C.dim}R Refresh${C.reset}   ${C.dim}Q Quit${C.reset}`
    : `${C.dim}Non-interactive mode${C.reset}`;
  lines.push(boxLine(keys, W));
  lines.push(boxBottom(W));
  return lines;
}

function renderFull(state, items, selectedIdx) {
  const W = termWidth();
  const lines = [
    '',
    ...renderHeader(W),
    ...renderStatus(state, W),
    ...renderUrls(W),
    ...renderMenu(items, selectedIdx, W),
    ...renderFooter(W),
    '',
  ];
  console.log(lines.join('\n'));
}

// ─── Actions ───────────────────────────────────────────────────
function openDashboard() {
  const pub = publicUrl(DASHBOARD_PATH);
  const local = `http://localhost:${API_PORT}${DASHBOARD_PATH}`;
  const url = pub || local;
  try {
    if (platform === 'darwin') execSync(`open "${url}"`);
    else if (platform === 'win32') execSync(`start "" "${url}"`);
    else execSync(`xdg-open "${url}" 2>/dev/null || sensible-browser "${url}" 2>/dev/null`);
    console.log(`\n  ${C.green}${B.dot} Opening ${url}${C.reset}\n`);
  } catch {
    console.log(`\n  ${C.yellow}${B.bullet} Open manually: ${url}${C.reset}\n`);
  }
}

function startGateway() {
  console.log(`\n  ${C.accent}${B.dot} Starting 8Router Gateway...${C.reset}\n`);
  const distIndex = join(__dirname, '..', 'dist', 'index.js');
  const child = spawn('node', [distIndex], {
    cwd: join(__dirname, '..'),
    stdio: 'inherit',
    env: { ...process.env },
  });
  child.on('exit', (code) => process.exit(code || 0));
  process.on('SIGINT', () => { child.kill('SIGINT'); process.exit(0); });
}

function stopGateway() {
  const pid = getGatewayPid();
  if (!pid) { console.log(`\n  ${C.yellow}${B.bullet} Gateway not running${C.reset}\n`); return; }
  try {
    process.kill(parseInt(pid), 'SIGTERM');
    console.log(`\n  ${C.green}${B.dot} Gateway stopped (PID ${pid})${C.reset}\n`);
  } catch (e) {
    console.log(`\n  ${C.red}${B.bullet} Failed to stop: ${e.message}${C.reset}\n`);
  }
}

function restartGateway() {
  stopGateway();
  setTimeout(() => startGateway(), 1000);
}

function showHealth() {
  console.log(`\n  ${C.accent}System Health${C.reset}\n`);
  const checks = [
    { label: 'Health endpoint', url: `http://localhost:${API_PORT}/8router/health` },
    { label: 'Models endpoint', url: `http://localhost:${API_PORT}/v1/models` },
    { label: 'Dashboard', url: `http://localhost:${API_PORT}${DASHBOARD_PATH}` },
  ];
  for (const c of checks) {
    try {
      const res = execSync(`curl -s -o /dev/null -w "%{http_code}" "${c.url}" --connect-timeout 2 2>/dev/null`, { encoding: 'utf8', timeout: 5000 });
      const ok = res.trim() === '200';
      console.log(`  ${ok ? C.green + B.dot : C.red + B.bullet} ${c.label.padEnd(20)} ${ok ? 'OK' : 'HTTP ' + res.trim()}${C.reset}`);
    } catch {
      console.log(`  ${C.red}${B.bullet} ${c.label.padEnd(20)} Unreachable${C.reset}`);
    }
  }
  const flags = getMigrationFlags();
  console.log(`\n  ${C.dim}Feature Flags:${C.reset}`);
  console.log(`  ${C.dim}Migration:${C.reset} ${flags.migration ? C.yellow + 'Enabled' : C.dim + 'Disabled'}${C.reset}`);
  console.log(`  ${C.dim}Shadow Sync:${C.reset} ${flags.shadowSync ? C.yellow + 'Enabled' : C.dim + 'Disabled'}${C.reset}`);
  console.log('');
}

function runDoctor() {
  try {
    execSync(`bash ${join(__dirname, '..', 'scripts', 'doctor.sh')}`, { stdio: 'inherit', env: { ...process.env } });
  } catch (e) {
    console.log(`\n  ${C.red}Doctor check failed: ${e.message}${C.reset}\n`);
  }
}

function viewLogs() {
  try {
    execSync('journalctl -u 8router.service -n 50 --no-pager', { stdio: 'inherit', timeout: 10000 });
  } catch {
    console.log(`\n  ${C.dim}No systemd logs available. Check application logs directly.${C.reset}\n`);
  }
}

function showProviderOps() {
  console.log(`\n  ${C.accent}Provider Operations${C.reset}\n`);
  console.log(`  ${C.dim}${B.arrow} Provider Credentials${C.reset}   ${C.dim}View in dashboard${C.reset}`);
  console.log(`  ${C.dim}${B.arrow} Provider Connections${C.reset}   ${C.dim}Metadata summary${C.reset}`);
  console.log(`  ${C.dim}${B.arrow} Reconciliation${C.reset}         ${C.dim}Preview only${C.reset}`);
  console.log(`  ${C.dim}${B.arrow} Migration Plans${C.reset}        ${C.dim}List/status only${C.reset}`);
  console.log(`  ${C.dim}${B.arrow} Shadow Diagnostics${C.reset}     ${C.dim}Flag + summary${C.reset}`);
  console.log(`\n  ${C.dim}All operations are read-only in this console.${C.reset}\n`);
}

function showSettings() {
  console.log(`\n  ${C.accent}Settings${C.reset}\n`);
  console.log(`  ${C.dim}Port:${C.reset}            ${API_PORT}`);
  console.log(`  ${C.dim}Local URL:${C.reset}       http://localhost:${API_PORT}/v1`);
  console.log(`  ${C.dim}Public URL:${C.reset}      ${publicUrl('/v1') || 'Not configured'}`);
  console.log(`  ${C.dim}Dashboard:${C.reset}       ${publicUrl(DASHBOARD_PATH) || 'Not configured'}`);
  console.log(`  ${C.dim}Routing:${C.reset}         Legacy`);
  const flags = getMigrationFlags();
  console.log(`  ${C.dim}Migration:${C.reset}       ${flags.migration ? 'Enabled' : 'Disabled'}`);
  console.log(`  ${C.dim}Shadow Sync:${C.reset}     ${flags.shadowSync ? 'Enabled' : 'Disabled'}`);
  console.log('');
}

// ─── Interactive menu ──────────────────────────────────────────
async function selectMenu(items) {
  return new Promise((resolve) => {
    let idx = 0;
    let active = true;
    primeRawOnce();

    const render = () => {
      if (!active) return;
      process.stdout.write('\x1b[2J\x1b[H');
      const state = getRuntimeState();
      renderFull(state, items, idx);
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
      if (key.name === 'q') { cleanup(); resolve(-2); }
      if (key.name === 'r') { render(); }
      if (key.ctrl && key.name === 'c') { cleanup(); cleanupRaw(); process.exit(0); }
    };

    process.stdin.on('keypress', onKey);
    render();
  });
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);

  // CLI flags
  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
  ${C.accent}8${C.orange}Router${C.reset} v${VERSION}

  Usage:  8router [options]

  Options:
    --help, -h        Show this help
    --version, -v     Show version
    --start           Start gateway directly
    --dashboard       Open dashboard in browser
    --doctor          Run system health check
    --status          Show runtime status
    --settings        Show settings

  Interactive mode (no args):
    8router
    `);
    return;
  }
  if (args.includes('--version') || args.includes('-v')) {
    console.log(`8router v${VERSION}`);
    return;
  }
  if (args.includes('--start')) { startGateway(); return; }
  if (args.includes('--dashboard')) { openDashboard(); return; }
  if (args.includes('--doctor')) { runDoctor(); return; }
  if (args.includes('--status')) {
    const state = getRuntimeState();
    console.log(`\n  Gateway: ${state.status}  PID: ${state.pid || '-'}  Port: ${state.port}`);
    console.log(`  Providers: ${state.providers}  Routing: ${state.routing}`);
    console.log(`  Migration: ${state.migration}  Shadow: ${state.shadowSync}\n`);
    return;
  }
  if (args.includes('--settings')) { showSettings(); return; }

  // Non-TTY: start gateway directly
  if (!isTTY) {
    startGateway();
    return;
  }

  // Interactive loop
  let running = true;
  while (running) {
    const state = getRuntimeState();
    const items = buildMenu(state);
    const choice = await selectMenu(items);

    if (choice === -1 || choice === -2) {
      console.log(`\n  ${C.dim}Bye!${C.reset}\n`);
      cleanupRaw();
      running = false;
      break;
    }

    const action = items[choice]?.id;
    switch (action) {
      case 'start': startGateway(); running = false; break;
      case 'dashboard': openDashboard(); break;
      case 'providers': showProviderOps(); break;
      case 'health': showHealth(); break;
      case 'doctor': runDoctor(); break;
      case 'logs': viewLogs(); break;
      case 'restart': restartGateway(); break;
      case 'stop': stopGateway(); break;
      case 'settings': showSettings(); break;
      case 'exit':
        console.log(`\n  ${C.dim}Bye!${C.reset}\n`);
        cleanupRaw();
        running = false;
        break;
    }
  }
}

process.on('SIGINT', () => { cleanupRaw(); process.exit(0); });
process.on('SIGTERM', () => { cleanupRaw(); process.exit(0); });
main();
