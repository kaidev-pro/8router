#!/usr/bin/env node
import { spawn, execSync, execFile } from 'child_process';
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

// ─── Environment ───────────────────────────────────────────────
const NO_COLOR = !!process.env.NO_COLOR;
const isTTY = !!process.stdin.isTTY;
const isCI = !!process.env.CI;
const platform = process.platform;

// ─── ANSI Colors ───────────────────────────────────────────────
const C = (NO_COLOR || isCI) ? {
  reset:'',bright:'',dim:'',cyan:'',green:'',yellow:'',red:'',gray:'',orange:'',white:'',reverse:'',line:'',accent:''
} : {
  reset:'\x1b[0m',bright:'\x1b[1m',dim:'\x1b[2m',cyan:'\x1b[36m',green:'\x1b[32m',
  yellow:'\x1b[33m',red:'\x1b[31m',gray:'\x1b[90m',white:'\x1b[37m',reverse:'\x1b[7m',
  accent:'\x1b[38;2;0;209;255m',orange:'\x1b[38;2;255;159;67m',line:'\x1b[38;2;50;50;60m',
};

// ─── Box drawing ───────────────────────────────────────────────
const supportsUnicode = process.env.TERM !== 'dumb' && !process.env.ASCII_ONLY;
const B = supportsUnicode ? {
  tl:'╭',tr:'╮',bl:'╰',br:'╯',h:'─',v:'│',ml:'├',mr:'┤',
  dot:'●',dotOff:'○',arrow:'›',bullet:'•',warn:'▲',fail:'✕'
} : {
  tl:'+',tr:'+',bl:'+',br:'+',h:'-',v:'|',ml:'+',mr:'+',dot:'*',dotOff:'o',
  arrow:'>',bullet:'-',warn:'!',fail:'X'
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

function termWidth() { return Math.max(60, Math.min(120, process.stdout.columns || 80)); }

// ─── Raw stdin ─────────────────────────────────────────────────
let rawPrimed = false;
function primeRawOnce() {
  if (rawPrimed || !isTTY) return;
  try { readline.emitKeypressEvents(process.stdin); process.stdin.setRawMode(true); process.stdin.setEncoding('utf8'); process.stdin.resume(); rawPrimed = true; } catch {}
}
function cleanupRaw() {
  if (rawPrimed && isTTY) { try { process.stdin.setRawMode(false); } catch {} rawPrimed = false; }
}

// ─── Secret redaction ──────────────────────────────────────────
const SECRET_PATTERNS = [
  /sk-proj-[A-Za-z0-9]{20,}/g, /sk-[A-Za-z0-9]{20,}/g, /AIza[A-Za-z0-9_-]{20,}/g,
  /sk-ant-[A-Za-z0-9]{20,}/g,
  /[Bb]earer\s+[A-Za-z0-9_.\-]{20,}/g,
  /[?&](key|api_key|token|secret)=[A-Za-z0-9_.\-]{8,}/gi,
  /Authorization:\s*[A-Za-z0-9_.\-]{20,}/gi,
  /Cookie:\s*[^\n]{10,}/gi,
  /(?:access_token|refresh_token)[=:]\s*[A-Za-z0-9_.\-]{10,}/gi,
  /(?:password|passwd|secret)[=:]\s*[A-Za-z0-9_.\-]{6,}/gi,
  /:\/\/[^:]+:[^@]+@/g,
];

function redactLine(line) {
  let s = line;
  for (const p of SECRET_PATTERNS) { p.lastIndex = 0; s = s.replace(p, '[REDACTED]'); }
  return s;
}

function maskSecret(val) {
  if (!val || typeof val !== 'string') return '****';
  if (val.length <= 8) return '****';
  return val.slice(0, 4) + '...' + val.slice(-3);
}

// ─── Box renderer ──────────────────────────────────────────────
function stripAnsi(s) { return s.replace(/\x1b\[[0-9;]*m/g, ''); }
function boxLine(content, W) { const pad = Math.max(0, W - 4 - stripAnsi(content).length); return `  ${C.line}${B.v}${C.reset} ${content}${' '.repeat(pad)} ${C.line}${B.v}${C.reset}`; }
function boxTop(W) { return `  ${C.line}${B.tl}${B.h.repeat(W - 2)}${B.tr}${C.reset}`; }
function boxBottom(W) { return `  ${C.line}${B.bl}${B.h.repeat(W - 2)}${B.br}${C.reset}`; }
function boxDivider(W) { return `  ${C.line}${B.ml}${B.h.repeat(W - 2)}${B.mr}${C.reset}`; }

// ─── Runtime probes ────────────────────────────────────────────
function checkGatewayRunning() {
  try { const r = execSync(`curl -s -o /dev/null -w "%{http_code}" http://localhost:${API_PORT}/health --connect-timeout 1 2>/dev/null`, { encoding:'utf8', timeout:3000 }); return r.trim() === '200'; } catch { return false; }
}
function getGatewayPid() {
  try { const r = execSync(`lsof -ti:${API_PORT} 2>/dev/null`, { encoding:'utf8', timeout:3000 }); return r.trim().split('\n')[0] || null; } catch { return null; }
}
function getProviderCount() { try { const m = require(join(__dirname,'..','dist','providers','catalog.js')); return m?.PROVIDER_CATALOG?.length || 0; } catch { return 0; } }
function getMigrationFlags() {
  return { migration: process.env.PROVIDER_CONNECTION_MIGRATION_ENABLED==='true', shadowSync: process.env.PROVIDER_CONNECTION_SHADOW_SYNC_ENABLED==='true' };
}
function getRuntimeState() {
  const running = checkGatewayRunning();
  const pid = running ? getGatewayPid() : null;
  const flags = getMigrationFlags();
  return {
    status: running ? 'Running' : 'Stopped',
    statusColor: running ? C.green : C.red,
    statusIcon: running ? 'dot' : 'dotOff',
    pid: pid || null, port: API_PORT, providers: getProviderCount(),
    routing: 'Legacy',
    migration: flags.migration ? 'Enabled' : 'Disabled',
    migrationColor: flags.migration ? C.yellow : C.dim,
    shadowSync: flags.shadowSync ? 'Enabled' : 'Disabled',
    shadowSyncColor: flags.shadowSync ? C.yellow : C.dim,
    running,
  };
}

// ─── Header ────────────────────────────────────────────────────
function renderHeader(W) {
  return [boxTop(W), boxLine(`${C.accent}${C.bright}8${C.orange}${C.bright}Router${C.reset}  ${C.dim}v${VERSION}${C.reset}`, W), boxLine(`${C.dim}Unified AI Provider Gateway${C.reset}`, W), boxDivider(W)];
}

// ─── Status summary ────────────────────────────────────────────
function renderStatus(state, W) {
  const lines = [];
  const row = (l, v, color = C.white) => { lines.push(boxLine(`${C.dim}${l.padEnd(22)}${C.reset}${color}${v}${C.reset}`, W)); };
  const iconRow = (l, v, color, icon) => {
    const sym = icon === 'dot' ? `${color}${B.dot}${C.reset}` : `${C.dim}${B.dotOff}${C.reset}`;
    lines.push(boxLine(`${sym} ${C.dim}${l.padEnd(20)}${C.reset}${color}${v}${C.reset}`, W));
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
  const lines = [boxDivider(W)];
  const localApi = `http://localhost:${API_PORT}/v1`;
  const localDash = `http://localhost:${API_PORT}${DASHBOARD_PATH}`;
  const pubApi = publicUrl('/v1');
  const pubDash = publicUrl(DASHBOARD_PATH);
  lines.push(boxLine(`${C.accent}${B.bullet}${C.reset} ${C.dim}Local API${C.reset}`, W));
  lines.push(boxLine(`  ${localApi}`, W));
  lines.push(boxLine(`${C.accent}${B.bullet}${C.reset} ${C.dim}Public API${C.reset}`, W));
  lines.push(boxLine(`  ${pubApi || `${C.dim}Not configured${C.reset}`}`, W));
  lines.push(boxLine(`${C.accent}${B.bullet}${C.reset} ${C.dim}Dashboard${C.reset}`, W));
  if (pubDash) { lines.push(boxLine(`  ${pubDash}`, W)); }
  lines.push(boxLine(`${C.dim}  Local: ${localDash}${C.reset}`, W));
  return lines;
}

// ─── Menu ──────────────────────────────────────────────────────
function buildMenu(state) {
  const items = [];
  items.push({ label: 'Open Dashboard', id: 'dashboard' });
  items.push({ label: 'Provider Operations', id: 'providers' });
  items.push({ label: 'System Health', id: 'health' });
  items.push({ label: 'Run Doctor', id: 'doctor' });
  if (state.running) {
    items.push({ label: 'View Logs', id: 'logs' });
    items.push({ label: 'Restart Gateway', id: 'restart' });
    items.push({ label: 'Stop Gateway', id: 'stop' });
  } else {
    items.push({ label: 'Start Gateway', id: 'start' });
  }
  items.push({ label: 'Settings', id: 'settings' });
  items.push({ label: 'Exit', id: 'exit' });
  return items;
}

function renderMenu(items, selectedIdx, W) {
  const lines = [boxDivider(W)];
  items.forEach((item, i) => {
    const sel = i === selectedIdx;
    const icon = sel ? `${C.accent}${B.arrow}${C.reset}` : ` `;
    const text = sel ? `${C.bright}${C.white}${item.label}${C.reset}` : `${C.dim}${item.label}${C.reset}`;
    lines.push(boxLine(` ${icon} ${text}`, W));
  });
  return lines;
}

function renderFooter(W) {
  return [boxDivider(W), boxLine(isTTY ? `${C.dim}↑↓ Navigate${C.reset}   ${C.dim}Enter Select${C.reset}   ${C.dim}R Refresh${C.reset}   ${C.dim}Q Quit${C.reset}` : `${C.dim}Non-interactive mode${C.reset}`, W), boxBottom(W)];
}

function renderFull(state, items, selectedIdx) {
  const W = termWidth();
  console.log(['', ...renderHeader(W), ...renderStatus(state, W), ...renderUrls(W), ...renderMenu(items, selectedIdx, W), ...renderFooter(W), ''].join('\n'));
}

// ─── Actions ───────────────────────────────────────────────────
function openDashboard() {
  const pub = publicUrl(DASHBOARD_PATH);
  const local = `http://localhost:${API_PORT}${DASHBOARD_PATH}`;
  if (!isTTY || isCI) {
    console.log(`\n  ${C.accent}${B.bullet} Dashboard URL:${C.reset}`);
    if (pub) { console.log(`  ${pub}`); } else {
      console.log(`  ${C.yellow}Public URL not configured.${C.reset}`);
      console.log(`  ${C.dim}Local: ${local}${C.reset}`);
    }
    console.log('');
    return;
  }
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
  const child = spawn('node', [distIndex], { cwd: join(__dirname, '..'), stdio: 'inherit', env: { ...process.env } });
  child.on('exit', (code) => process.exit(code || 0));
  process.on('SIGINT', () => { child.kill('SIGINT'); process.exit(0); });
}

function stopGateway() {
  const pid = getGatewayPid();
  if (!pid) { console.log(`\n  ${C.yellow}${B.bullet} Gateway not running${C.reset}\n`); return; }
  try { process.kill(parseInt(pid), 'SIGTERM'); console.log(`\n  ${C.green}${B.dot} Gateway stopped (PID ${pid})${C.reset}\n`); }
  catch (e) { console.log(`\n  ${C.red}${B.fail} Failed to stop: ${redactLine(e.message)}${C.reset}\n`); }
}

function restartGateway() { stopGateway(); setTimeout(() => startGateway(), 1000); }

function showHealth() {
  console.log(`\n  ${C.accent}System Health${C.reset}\n`);
  const checks = [
    { label:'Health endpoint', url:`http://localhost:${API_PORT}/8router/health` },
    { label:'Models endpoint', url:`http://localhost:${API_PORT}/v1/models` },
    { label:'Dashboard', url:`http://localhost:${API_PORT}${DASHBOARD_PATH}` },
  ];
  for (const c of checks) {
    try {
      const r = execSync(`curl -s -o /dev/null -w "%{http_code}" "${c.url}" --connect-timeout 2 2>/dev/null`, { encoding:'utf8', timeout:5000 });
      const ok = r.trim() === '200';
      console.log(`  ${ok ? C.green+B.dot : C.red+B.bullet} ${c.label.padEnd(20)} ${ok ? 'OK' : 'HTTP '+r.trim()}${C.reset}`);
    } catch { console.log(`  ${C.red}${B.bullet} ${c.label.padEnd(20)} Unavailable${C.reset}`); }
  }
  const flags = getMigrationFlags();
  console.log(`\n  ${C.dim}Feature Flags:${C.reset}`);
  console.log(`  ${C.dim}Migration:${C.reset} ${flags.migration ? C.yellow+'Enabled' : C.dim+'Disabled'}${C.reset}`);
  console.log(`  ${C.dim}Shadow Sync:${C.reset} ${flags.shadowSync ? C.yellow+'Enabled' : C.dim+'Disabled'}${C.reset}`);
  console.log('');
}

function runDoctor() {
  try { execSync(`bash ${join(__dirname, '..', 'scripts', 'doctor.sh')}`, { stdio:'inherit', env:{...process.env} }); }
  catch (e) { console.log(`\n  ${C.red}Doctor failed: ${redactLine(e.message)}${C.reset}\n`); }
}

function viewLogs() {
  console.log(`\n  ${C.accent}Recent Logs${C.reset}\n`);
  try {
    const raw = execSync('journalctl -u 8router.service -n 50 --no-pager -o short-iso 2>&1', { encoding:'utf8', timeout:10000 });
    for (const line of raw.split('\n').slice(0, 50)) {
      console.log(`  ${C.dim}${redactLine(line)}${C.reset}`);
    }
  } catch { console.log(`  ${C.dim}No systemd logs available.${C.reset}`); }
  console.log('');
}

function showProviderOps() {
  console.log(`\n  ${C.accent}Provider Operations${C.reset} ${C.dim}(read-only)${C.reset}\n`);
  console.log(`  ${C.dim}${B.arrow} Provider Credentials${C.reset}   ${C.dim}View in dashboard${C.reset}`);
  console.log(`  ${C.dim}${B.arrow} Provider Connections${C.reset}   ${C.dim}Metadata summary${C.reset}`);
  console.log(`  ${C.dim}${B.arrow} Reconciliation${C.reset}         ${C.dim}Preview only${C.reset}`);
  console.log(`  ${C.dim}${B.arrow} Migration Plans${C.reset}        ${C.dim}List/status only${C.reset}`);
  console.log(`  ${C.dim}${B.arrow} Shadow Diagnostics${C.reset}     ${C.dim}Flag + summary${C.reset}`);
  console.log(`\n  ${C.dim}All operations are read-only.${C.reset}\n`);
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

// ─── Non-TTY status output ─────────────────────────────────────
function showStatusPlain() {
  const state = getRuntimeState();
  console.log(`8Router v${VERSION}`);
  console.log(`Gateway: ${state.status}  PID: ${state.pid || '-'}  Port: ${state.port}`);
  console.log(`Providers: ${state.providers}  Routing: ${state.routing}`);
  console.log(`Migration: ${state.migration}  Shadow: ${state.shadowSync}`);
  console.log(`Local API: http://localhost:${API_PORT}/v1`);
  const pub = publicUrl('/v1');
  console.log(`Public API: ${pub || 'Not configured'}`);
  const dash = publicUrl(DASHBOARD_PATH);
  console.log(`Dashboard: ${dash || 'Not configured'}`);
  console.log(`Local Dashboard: http://localhost:${API_PORT}${DASHBOARD_PATH}`);
  console.log('');
  console.log('Available commands: start, stop, restart, status, doctor, dashboard, settings, help');
}

// ─── Interactive menu ──────────────────────────────────────────
async function selectMenu(items) {
  return new Promise((resolve) => {
    let idx = 0; let active = true; primeRawOnce();
    const render = () => { if (!active) return; process.stdout.write('\x1b[2J\x1b[H'); renderFull(getRuntimeState(), items, idx); };
    const cleanup = () => { if (!active) return; active = false; process.stdin.removeListener('keypress', onKey); };
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
    process.stdin.on('keypress', onKey); render();
  });
}

// ─── Main ──────────────────────────────────────────────────────
async function main() {
  const args = process.argv.slice(2);
  const subcommand = args.find(a => !a.startsWith('-')) || null;

  // Explicit subcommands (work in any environment)
  if (subcommand === 'start' || args.includes('--start')) { startGateway(); return; }
  if (subcommand === 'stop') { stopGateway(); return; }
  if (subcommand === 'restart') { restartGateway(); return; }
  if (subcommand === 'status' || args.includes('--status')) { showStatusPlain(); return; }
  if (subcommand === 'doctor' || args.includes('--doctor')) { runDoctor(); return; }
  if (subcommand === 'dashboard' || args.includes('--dashboard')) { openDashboard(); return; }
  if (subcommand === 'settings' || args.includes('--settings')) { showSettings(); return; }

  // Help/version
  if (args.includes('--help') || args.includes('-h') || subcommand === 'help') {
    console.log(`
  ${C.accent}8${C.orange}Router${C.reset} v${VERSION}

  Usage:  8router [command] [options]

  Commands:
    start             Start gateway
    stop              Stop gateway
    restart           Restart gateway
    status            Show runtime status
    doctor            Run health check
    dashboard         Open dashboard
    settings          Show settings

  Options:
    --help, -h        Show this help
    --version, -v     Show version

  Interactive mode (no args, TTY required):
    8router
    `);
    return;
  }
  if (args.includes('--version') || args.includes('-v')) { console.log(`8router v${VERSION}`); return; }

  // Unknown subcommand
  if (subcommand) {
    console.error(`\n  ${C.red}Unknown command: ${subcommand}${C.reset}`);
    console.error(`  ${C.dim}Run '8router --help' for available commands.${C.reset}\n`);
    process.exit(1);
  }

  // Non-TTY: show status only (no implicit start)
  if (!isTTY || isCI) {
    showStatusPlain();
    return;
  }

  // Interactive loop (TTY only)
  let running = true;
  while (running) {
    const state = getRuntimeState();
    const items = buildMenu(state);
    const choice = await selectMenu(items);
    if (choice === -1 || choice === -2) { console.log(`\n  ${C.dim}Bye!${C.reset}\n`); cleanupRaw(); running = false; break; }
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
      case 'exit': console.log(`\n  ${C.dim}Bye!${C.reset}\n`); cleanupRaw(); running = false; break;
    }
  }
}

process.on('SIGINT', () => { cleanupRaw(); process.exit(0); });
process.on('SIGTERM', () => { cleanupRaw(); process.exit(0); });
main();
