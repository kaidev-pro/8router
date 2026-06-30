/**
 * 8Router — Live Dashboard (Terminal UI)
 * 
 * Real-time stats view: requests, tokens, cost, uptime, provider health, recent logs.
 * Auto-refreshes every 3 seconds. Press 'q' or Esc to go back.
 */

import api from '../api/client.js';
import { COLORS } from '../utils/input.js';

// ─── Helpers ──────────────────────────────────────────────────────

function formatUptime(seconds) {
  if (seconds > 86400) return `${Math.floor(seconds / 86400)}d ${Math.floor((seconds % 86400) / 3600)}h`;
  if (seconds > 3600) return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
  if (seconds > 60) return `${Math.floor(seconds / 60)}m ${Math.floor(seconds % 60)}s`;
  return `${Math.floor(seconds)}s`;
}

function formatCost(cost) {
  if (!cost || cost === 0) return '$0.00';
  if (cost < 0.01) return `$${cost.toFixed(6)}`;
  return `$${cost.toFixed(4)}`;
}

function formatTokens(tokens) {
  if (!tokens) return '0';
  if (tokens >= 1000000) return `${(tokens / 1000000).toFixed(1)}M`;
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}K`;
  return String(tokens);
}

function padRight(str, len) {
  const stripped = str.replace(/\x1b\[[0-9;]*m/g, '');
  return str + ' '.repeat(Math.max(0, len - stripped.length));
}

function drawBox(title, lines, width = 56) {
  const result = [];
  const top = `  ${COLORS.line}┌─${COLORS.reset} ${COLORS.bright}${title}${COLORS.reset} ${COLORS.line}${'─'.repeat(Math.max(0, width - title.length - 3))}┐${COLORS.reset}`;
  result.push(top);
  for (const line of lines) {
    const stripped = line.replace(/\x1b\[[0-9;]*m/g, '');
    const pad = Math.max(0, width - 1 - stripped.length);
    result.push(`  ${COLORS.line}│${COLORS.reset} ${line}${' '.repeat(pad)}${COLORS.line}│${COLORS.reset}`);
  }
  const bot = `  ${COLORS.line}└${'─'.repeat(width)}┘${COLORS.reset}`;
  result.push(bot);
  return result.join('\n');
}

// ─── Data Fetch ───────────────────────────────────────────────────

async function fetchDashboardData() {
  const [statsRes, healthRes, logsRes, infoRes] = await Promise.all([
    api.get('/8router/stats'),
    api.get('/8router/health'),
    api.get('/8router/logs'),
    api.get('/8router/info'),
  ]);

  return {
    stats: statsRes.success ? statsRes.data : null,
    health: healthRes.success ? healthRes.data : null,
    logs: logsRes.success ? logsRes.data : null,
    info: infoRes.success ? infoRes.data : null,
  };
}

// ─── Render ───────────────────────────────────────────────────────

function render(data) {
  const { stats, health, logs, info } = data;
  const W = 56;

  // Move cursor to top-left (no clear — avoids flicker)
  process.stdout.write('\x1b[H\x1b[?25l');

  const out = [];
  const hr = `${COLORS.line}${'─'.repeat(W)}${COLORS.reset}`;

  // ── Header
  out.push('');
  out.push(`  ${COLORS.accent}${COLORS.bright}8${COLORS.orange}${COLORS.bright}Router${COLORS.reset} ${COLORS.dim}Live Dashboard${COLORS.reset}`);
  out.push(`  ${hr}`);

  // ── Server Info
  const version = info?.version || '?';
  const uptime = info?.uptime ? formatUptime(info.uptime) : '?';
  const features = info?.features?.length || 0;
  out.push(`  ${COLORS.dim}Version:${COLORS.reset} ${COLORS.bright}v${version}${COLORS.reset}  ${COLORS.dim}Uptime:${COLORS.reset} ${COLORS.cyan}${uptime}${COLORS.reset}  ${COLORS.dim}Features:${COLORS.reset} ${COLORS.cyan}${features}${COLORS.reset}`);
  out.push('');

  // ── Stats Box
  if (stats?.session) {
    const s = stats.session;
    const a = stats.allTime || {};
    const statLines = [
      `${COLORS.dim}Session:${COLORS.reset}`,
      `  Requests:  ${COLORS.bright}${s.totalRequests || 0}${COLORS.reset}  (${COLORS.green}${s.successfulRequests || 0} ok${COLORS.reset} / ${COLORS.red}${s.failedRequests || 0} fail${COLORS.reset})`,
      `  Tokens:    ${COLORS.cyan}${formatTokens(s.totalTokens)}${COLORS.reset}`,
      `  Fallbacks: ${COLORS.yellow}${s.fallbackCount || 0}${COLORS.reset}  Compressed: ${COLORS.green}${formatTokens(s.compressionSaved)}${COLORS.reset}`,
      `${COLORS.dim}All-Time:${COLORS.reset}`,
      `  Requests:  ${COLORS.bright}${a.totalRequests || 0}${COLORS.reset}  Cost: ${COLORS.orange}${formatCost(a.totalCost)}${COLORS.reset}`,
      `  Tokens:    ${COLORS.cyan}${formatTokens(a.totalTokens)}${COLORS.reset}`,
    ];
    out.push(drawBox('📊 Stats', statLines, W));
  } else {
    out.push(drawBox('📊 Stats', [`${COLORS.dim}No data yet — send a request to see stats${COLORS.reset}`], W));
  }
  out.push('');

  // ── Provider Health
  if (health?.providers) {
    const providers = health.providers;
    const healthy = providers.filter(p => p.healthy).length;
    const provLines = [
      `${healthy}/${providers.length} ${COLORS.green}healthy${COLORS.reset}`,
    ];
    for (const p of providers) {
      const icon = p.healthy ? `${COLORS.green}●${COLORS.reset}` : `${COLORS.red}○${COLORS.reset}`;
      const rt = p.responseTime ? ` ${COLORS.dim}${p.responseTime}ms${COLORS.reset}` : '';
      const id = p.id || p.name || '?';
      provLines.push(`  ${icon} ${id}${rt}`);
    }
    out.push(drawBox('🔌 Providers', provLines, W));
  } else {
    out.push(drawBox('🔌 Providers', [`${COLORS.dim}No provider data${COLORS.reset}`], W));
  }
  out.push('');

  // ── Recent Logs
  if (logs?.requests && logs.requests.length > 0) {
    const logLines = [];
    const recent = logs.requests.slice(-5).reverse();
    for (const r of recent) {
      const status = r.success !== false ? `${COLORS.green}✓${COLORS.reset}` : `${COLORS.red}✗${COLORS.reset}`;
      const model = r.model || r.provider || '?';
      const tokens = r.tokens ? formatTokens(r.tokens) : '';
      const time = r.timestamp ? new Date(r.timestamp).toLocaleTimeString() : '';
      logLines.push(`  ${status} ${COLORS.dim}${time}${COLORS.reset} ${model} ${COLORS.dim}${tokens}${COLORS.reset}`);
    }
    out.push(drawBox('📋 Recent Logs', logLines, W));
  } else {
    out.push(drawBox('📋 Recent Logs', [`${COLORS.dim}No requests yet${COLORS.reset}`], W));
  }

  out.push('');
  out.push(`  ${COLORS.dim}Auto-refresh: 3s  •  Press 'q' or Esc to go back${COLORS.reset}`);
  out.push('');

  process.stdout.write(out.join('\n'));
}

// ─── Main ─────────────────────────────────────────────────────────

export async function showLiveDashboard(port = 8080) {
  // Clear screen once
  process.stdout.write('\x1b[2J\x1b[H');
  process.stdout.write('\x1b[?25l'); // Hide cursor

  let running = true;
  let lastData = {};

  const stop = () => {
    running = false;
  };

  // Key handler
  const onKey = (_str, key) => {
    if (!key) return;
    if (key.name === 'q' || key.name === 'escape') {
      stop();
    }
    if (key.ctrl && key.name === 'c') {
      stop();
      process.stdout.write('\x1b[?25h'); // Show cursor
      process.exit(0);
    }
  };

  if (process.stdin.isTTY) {
    process.stdin.on('keypress', onKey);
  }

  // Initial render
  try {
    lastData = await fetchDashboardData();
    render(lastData);
  } catch (e) {
    process.stdout.write(`\x1b[H  ${COLORS.red}Error: ${e.message}${COLORS.reset}\n`);
  }

  // Auto-refresh loop
  const interval = setInterval(async () => {
    if (!running) {
      clearInterval(interval);
      return;
    }
    try {
      lastData = await fetchDashboardData();
      render(lastData);
    } catch {
      // Keep showing last data on error
    }
  }, 3000);

  // Wait until user quits
  while (running) {
    await new Promise(r => setTimeout(r, 100));
  }

  clearInterval(interval);
  if (process.stdin.isTTY) {
    process.stdin.removeListener('keypress', onKey);
  }
  process.stdout.write('\x1b[?25h'); // Show cursor
}
