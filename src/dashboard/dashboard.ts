// 8Router — Command Center Dashboard v4
// Inspired by 9Router: Endpoint config, Usage with topology + recent requests, Quota Tracker, etc.

import express from 'express';
import cors from 'cors';
import http from 'http';
import { getLandingHTML } from '../landing.js';
import { t, getKeys, getLocale, type Locale } from '../i18n/index.js';

export function createDashboard(engineOrPort: any, portOrUndef?: number): express.Express {
  const app = express();
  app.use(cors());
  const port = typeof portOrUndef === 'number' ? portOrUndef : (typeof engineOrPort === 'number' ? engineOrPort : 8080);
  const apiPort = 8080;

  // Proxy /8router/* to main API server
  app.all('/8router/*', (req, res) => {
    const opts = {
      hostname: 'localhost', port: apiPort,
      path: req.originalUrl, method: req.method,
      headers: { ...req.headers, host: `localhost:${apiPort}` },
    };
    const proxy = http.request(opts, (proxyRes) => {
      res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
      proxyRes.pipe(res, { end: true });
    });
    proxy.on('error', () => res.status(502).json({ error: 'API unreachable' }));
    if (req.method === 'POST' || req.method === 'PUT') req.pipe(proxy, { end: true });
    else proxy.end();
  });

  app.get('/', (_req, res) => { res.send(getLandingHTML('en', process.env.DONATION_URL)); });
  app.get('/dashboard', (req, res) => { const locale = getLocale(req); res.send(getDashboardHTML(port, locale)); });
  return app;
}
function buildClientI18n(locale: Locale): Record<string, string> {
  const keys = getKeys('en').filter(k => k.startsWith('db.'));
  const map: Record<string, string> = {};
  for (const key of keys) {
    map[key] = t(key, locale);
  }
  return map;
}
export function getDashboardHTML(port: number = 8080, locale: Locale = 'en'): string {
  const apiPort = port;
  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>8Router — Command Center</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --bg-primary: #020309;
  --bg-secondary: #0c111f;
  --bg-card: #060911;
  --bg-card-hover: #0e1525;
  --bg-input: #111524;
  --border: #1a2135;
  --border-light: #252d45;
  --text-primary: #f2f2f2;
  --text-secondary: #8a8f9c;
  --text-muted: #5a6070;
  --accent: #84abff;
  --accent-hover: #9dbdff;
  --accent-dim: rgba(132,171,255,0.12);
  --green: #00d294;
  --green-dim: rgba(0,210,148,0.12);
  --red: #ff6568;
  --red-dim: rgba(255,101,104,0.12);
  --orange: #e18528;
  --orange-dim: rgba(225,133,40,0.12);
  --blue: #84abff;
  --purple: #6c5594;
  --purple-dim: rgba(108,85,148,0.12);
  --cyan: #009399;
  --cyan-dim: rgba(0,147,153,0.12);
  --yellow: #fcbb00;
  --sidebar-w: 180px;
  --sidebar-expanded: 200px;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:var(--bg-primary);color:var(--text-primary);display:flex;min-height:100vh;overflow:hidden}

/* ═══ BACKGROUND GRID + NOISE ═══ */
body::before {
  content:'';
  position:fixed;
  inset:0;
  background:
    repeating-linear-gradient(0deg,transparent,transparent 47px,rgba(26,33,53,0.35) 47px,rgba(26,33,53,0.35) 48px),
    repeating-linear-gradient(90deg,transparent,transparent 47px,rgba(26,33,53,0.35) 47px,rgba(26,33,53,0.35) 48px);
  pointer-events:none;
  z-index:0;
}
.noise-overlay {
  position:fixed;
  inset:0;
  opacity:0.025;
  pointer-events:none;
  z-index:0;
  width:100%;
  height:100%;
}

/* ═══ SIDEBAR ═══ */
.sidebar {
  width:var(--sidebar-w);
  background:var(--bg-secondary);
  border-right:1px solid var(--border);
  position:fixed;
  top:0;left:0;bottom:0;
  display:flex;
  flex-direction:column;
  z-index:100;
  transition:width 0.25s ease;
  overflow:hidden;
}
.sidebar:hover {
  width:var(--sidebar-expanded);
}
.sidebar-overlay {
  display:none;
  position:fixed;
  inset:0;
  background:rgba(0,0,0,0.6);
  z-index:199;
}
.sidebar-overlay.show { display:block }

.sb-header {
  padding:14px 12px;
  display:flex;
  align-items:center;
  gap:12px;
  border-bottom:1px solid var(--border);
  min-height:56px;
}
.sb-logo {
  height:28px;width:auto;flex-shrink:0;
  object-fit:contain;
}
.sidebar:hover .sb-logo { height:32px }
.sb-section {
  font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text-muted);
  padding:16px 8px 6px;font-weight:700;
  opacity:1;width:auto;
  transition:opacity 0.2s ease,width 0.2s ease;
}
.sidebar:hover .sb-section { opacity:1;width:auto }
.sb-item {
  display:flex;align-items:center;gap:12px;
  padding:10px 12px;border-radius:8px;cursor:pointer;
  color:var(--text-secondary);font-size:13px;font-weight:500;
  transition:all 0.15s;
  white-space:nowrap;
  min-height:40px;
}
.sb-item:hover { background:var(--bg-card-hover);color:var(--text-primary) }
.sb-item.active { background:var(--accent-dim);color:var(--accent) }
.sb-item .ico {
  width:20px;height:20px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
}
.sb-item .ico svg { width:18px;height:18px }
.sb-item .lbl {
  opacity:1;width:auto;
  transition:opacity 0.2s ease,width 0.2s ease;
}
.sidebar:hover .sb-item .lbl { opacity:1;width:auto }
.sb-item .cnt {
  margin-left:auto;font-size:10px;
  background:var(--bg-card);padding:1px 6px;border-radius:8px;
  color:var(--text-muted);
  opacity:1;width:auto;
  transition:opacity 0.2s ease,width 0.2s ease;
}
.sidebar:hover .sb-item .cnt { opacity:1;width:auto }
.sb-item.active .cnt { background:var(--accent-dim);color:var(--accent) }

.sb-footer {
  padding:8px;border-top:1px solid var(--border);
}
.sb-shutdown {
  width:100%;padding:10px 12px;border-radius:8px;
  border:1px solid var(--border);background:transparent;
  color:var(--text-muted);font-size:12px;font-weight:600;
  cursor:pointer;display:flex;align-items:center;gap:10px;
  transition:all 0.15s;white-space:nowrap;min-height:40px;
}
.sb-shutdown .ico {
  width:20px;height:20px;flex-shrink:0;
  display:flex;align-items:center;justify-content:center;
}
.sb-shutdown:hover { background:var(--red-dim);color:var(--red);border-color:var(--red) }

/* ═══ MAIN ═══ */
.main {
  margin-left:var(--sidebar-w);
  flex:1;display:flex;flex-direction:column;
  height:100vh;
  position:relative;z-index:1;
}

/* ═══ STATUS BAR ═══ */
.statusbar {
  height:32px;background:var(--bg-secondary);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;
  padding:0 20px;gap:6px;
  font-family:'JetBrains Mono',monospace;
  font-size:11px;color:var(--text-muted);
  flex-shrink:0;
}
.statusbar .sep { color:var(--border-light);margin:0 2px }
.statusbar .val { color:var(--text-secondary) }
.statusbar .val.accent { color:var(--accent) }
.statusbar .val.green { color:var(--green) }
.statusbar .spacer { flex:1 }

/* ═══ TOPBAR ═══ */
.topbar {
  height:56px;background:var(--bg-secondary);
  border-bottom:1px solid var(--border);
  display:flex;align-items:center;
  padding:0 20px;gap:16px;flex-shrink:0;
  position:relative;z-index:201;
}
.topbar .hamburger {
  display:none;cursor:pointer;
  padding:6px;border-radius:6px;
  background:transparent;border:none;color:var(--text-secondary);
  transition:all 0.15s;
}
.topbar .hamburger:hover { color:var(--text-primary);background:var(--bg-card-hover) }
.topbar .page-icon { color:var(--accent);display:flex;align-items:center }
.topbar .title-area { display:flex;flex-direction:column;gap:1px }
.topbar .title {
  font-size:clamp(28px,3vw,40px);font-weight:700;
  letter-spacing:-0.04em;line-height:1.1;
}
.topbar .subtitle { font-size:12px;color:var(--text-muted) }
.topbar .spacer { flex:1 }
.topbar .actions { display:flex;gap:8px;align-items:center }
.topbar .pill {
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:6px;padding:5px 12px;
  font-size:11px;color:var(--text-secondary);cursor:pointer;
  font-family:'JetBrains Mono',monospace;transition:all 0.15s;
}
.topbar .pill:hover { border-color:var(--accent);color:var(--accent) }
.topbar .badge {
  padding:4px 10px;border-radius:6px;
  font-size:11px;font-weight:600;
  display:flex;align-items:center;gap:5px;
}
.topbar .badge.on { background:var(--green-dim);color:var(--green) }
.topbar .badge.off { background:var(--red-dim);color:var(--red) }
.topbar .badge .dot {
  width:6px;height:6px;border-radius:50%;
  background:currentColor;
}
.topbar .badge.on .dot { animation:pulse 2s infinite }

/* ═══ CONTENT ═══ */
.content { flex:1;overflow-y:auto;padding:20px }
.page { display:none }.page.active { display:block }

/* ═══ BENTO GRID ═══ */
.bento {
  display:grid;
  grid-template-columns:repeat(12,1fr);
  gap:16px;
}
.span-3 { grid-column:span 3 }
.span-4 { grid-column:span 4 }
.span-5 { grid-column:span 5 }
.span-6 { grid-column:span 6 }
.span-7 { grid-column:span 7 }
.span-8 { grid-column:span 8 }
.span-12 { grid-column:span 12 }

/* ═══ CARDS ═══ */
.card {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:12px;
  padding:20px;
  transition:all 0.15s;
}
.card:hover {
  border-color:var(--border-light);
  background:var(--bg-card-hover);
}
.card-header {
  display:flex;align-items:center;gap:10px;
  margin-bottom:16px;
}
.card-header svg { color:var(--accent);flex-shrink:0 }
.card-header h3 {
  font-size:13px;font-weight:600;color:var(--text-primary);
}

/* Stat cards */
.stat-card {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:12px;
  padding:20px;
  transition:all 0.15s;
}
.stat-card:hover { border-color:var(--border-light);background:var(--bg-card-hover) }
.stat-card .label {
  font-size:10px;color:var(--text-muted);
  text-transform:uppercase;letter-spacing:1px;
  margin-bottom:8px;
  display:flex;align-items:center;gap:6px;
}
.stat-card .label svg { width:12px;height:12px }
.stat-card .value {
  font-family:'JetBrains Mono',monospace;
  font-size:24px;font-weight:700;
}

/* ═══ ENDPOINT PAGE ═══ */
.endpoint-card .ep-row {
  display:flex;align-items:center;gap:12px;
  padding:10px 14px;
  background:var(--bg-input);
  border:1px solid var(--border);
  border-radius:8px;margin-bottom:8px;
}
.endpoint-card .ep-row .label {
  font-size:11px;color:var(--text-muted);
  min-width:60px;font-weight:600;
  text-transform:uppercase;
}
.endpoint-card .ep-row .url {
  flex:1;font-family:'JetBrains Mono',monospace;
  font-size:12px;color:var(--accent);cursor:pointer;
}
.endpoint-card .ep-row .url:hover { text-decoration:underline }
.endpoint-card .ep-row .copy-btn {
  width:28px;height:28px;
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:6px;display:flex;align-items:center;justify-content:center;
  cursor:pointer;color:var(--text-muted);transition:all 0.15s;
}
.endpoint-card .ep-row .copy-btn:hover { color:var(--accent);border-color:var(--accent) }
.ep-status {
  display:flex;align-items:center;gap:6px;
  font-size:11px;color:var(--green);
}
.ep-status .dot {
  width:6px;height:6px;border-radius:50%;
  background:var(--green);animation:pulse 2s infinite;
}

.warning-box {
  background:rgba(252,187,0,0.08);
  border:1px solid rgba(252,187,0,0.25);
  border-radius:8px;padding:12px 16px;
  margin-bottom:12px;
  display:flex;align-items:center;gap:10px;
  font-size:12px;color:var(--yellow);
}
.warning-box svg { flex-shrink:0;color:var(--yellow) }
.warning-box .action {
  margin-left:auto;color:var(--accent);
  font-weight:600;cursor:pointer;text-decoration:underline;
}

.toggle-row {
  display:flex;align-items:center;justify-content:space-between;
  padding:14px 16px;
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:8px;margin-bottom:8px;
  transition:all 0.15s;
}
.toggle-row:hover { border-color:var(--border-light) }
.toggle-row .info { font-size:13px;font-weight:500 }
.toggle-row .desc { font-size:11px;color:var(--text-muted);margin-top:2px }

.toggle {
  width:44px;height:24px;
  background:var(--bg-input);border-radius:12px;
  cursor:pointer;position:relative;
  transition:all 0.2s;border:1px solid var(--border);
}
.toggle.on { background:var(--accent);border-color:var(--accent) }
.toggle::after {
  content:'';position:absolute;top:2px;left:2px;
  width:18px;height:18px;background:#fff;border-radius:50%;
  transition:transform 0.2s;
}
.toggle.on::after { transform:translateX(20px) }

/* Token Saver / Caveman */
.caveman-card {
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:12px;padding:20px;margin-top:16px;
}
.caveman-card .card-header h3 { display:flex;align-items:center;gap:8px }
.caveman-card .sub { font-size:11px;color:var(--text-muted);margin-bottom:16px }
.caveman-row { display:flex;align-items:center;gap:16px }
.caveman-slider {
  flex:1;-webkit-appearance:none;height:6px;
  background:var(--bg-input);border-radius:3px;outline:none;
}
.caveman-slider::-webkit-slider-thumb {
  -webkit-appearance:none;width:20px;height:20px;
  background:var(--accent);border-radius:50%;cursor:pointer;
  border:3px solid var(--bg-card);
}
.caveman-val {
  font-family:'JetBrains Mono',monospace;
  font-size:32px;font-weight:800;color:var(--accent);
  min-width:40px;text-align:center;
}
.caveman-levels {
  display:flex;justify-content:space-between;
  margin-top:12px;font-size:10px;
  font-family:'JetBrains Mono',monospace;
  color:var(--text-muted);
}

/* ═══ USAGE PAGE ═══ */
.usage-grid {
  display:grid;grid-template-columns:1fr 320px;
  gap:16px;height:calc(100vh - 180px);
}
.usage-left { display:flex;flex-direction:column;gap:16px;overflow:hidden }
.usage-right { display:flex;flex-direction:column;gap:16px;overflow:hidden }

/* Topology */
.topo-card {
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:12px;flex:1;overflow:hidden;
  display:flex;flex-direction:column;
}
.topo-card .hdr {
  padding:14px 16px;border-bottom:1px solid var(--border);
  font-size:13px;font-weight:600;
  display:flex;align-items:center;gap:8px;
}
.topo-card .hdr svg { color:var(--accent) }
.topo-card canvas { flex:1;width:100% }

/* Recent Requests */
.recent-card {
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:12px;display:flex;flex-direction:column;overflow:hidden;
}
.recent-card .hdr {
  padding:14px 16px;border-bottom:1px solid var(--border);
  font-size:13px;font-weight:600;
  display:flex;align-items:center;gap:8px;
}
.recent-card .hdr svg { color:var(--accent) }
.recent-list { flex:1;overflow-y:auto }
.recent-item {
  display:flex;align-items:center;gap:10px;
  padding:8px 12px;border-bottom:1px solid var(--border);
  font-size:12px;transition:background 0.15s;
}
.recent-item:hover { background:var(--bg-card-hover) }
.recent-item .dot {
  width:6px;height:6px;border-radius:50%;
  background:var(--green);flex-shrink:0;
}
.recent-item .model {
  flex:1;font-weight:500;
  font-family:'JetBrains Mono',monospace;
  font-size:11px;color:var(--text-primary);
}
.recent-item .tokens {
  text-align:right;
  font-family:'JetBrains Mono',monospace;font-size:11px;
}
.recent-item .tokens .in { color:var(--accent) }
.recent-item .tokens .out { color:var(--cyan) }

/* ═══ QUOTA TRACKER ═══ */
.quota-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:16px;
}
.quota-card {
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:12px;padding:16px;transition:all 0.15s;
}
.quota-card:hover { border-color:var(--border-light);background:var(--bg-card-hover) }
.quota-card .name {
  font-size:14px;font-weight:600;margin-bottom:12px;
  display:flex;align-items:center;gap:8px;
}
.quota-card .name .tier {
  font-size:10px;padding:2px 6px;border-radius:4px;
  font-family:'JetBrains Mono',monospace;
}
.quota-bar {
  width:100%;height:6px;background:var(--bg-input);
  border-radius:3px;overflow:hidden;margin-bottom:8px;
}
.quota-fill { height:100%;border-radius:3px;transition:width 0.3s }
.quota-info {
  display:flex;justify-content:space-between;
  font-size:11px;font-family:'JetBrains Mono',monospace;
  color:var(--text-muted);
}
.quota-reset {
  font-size:10px;color:var(--yellow);margin-top:6px;
  font-family:'JetBrains Mono',monospace;
}

/* ═══ TABLES ═══ */
.tbl-wrap {
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:12px;overflow:hidden;
}
table { width:100%;border-collapse:collapse }
th {
  background:var(--bg-secondary);
  padding:8px 12px;text-align:left;
  font-size:10px;text-transform:uppercase;
  letter-spacing:1.2px;color:var(--text-muted);
  font-weight:700;
}
td {
  padding:8px 12px;
  border-top:1px solid var(--border);
  font-size:13px;font-family:'JetBrains Mono',monospace;
}
tr { transition:background 0.15s }
tr:hover td { background:var(--bg-card-hover) }
.badge {
  display:inline-flex;align-items:center;
  padding:3px 8px;border-radius:6px;
  font-size:11px;font-weight:600;gap:4px;
  font-family:'JetBrains Mono',monospace;
}
.badge.free { background:var(--green-dim);color:var(--green) }
.badge.cheap { background:var(--accent-dim);color:var(--accent) }
.badge.subscription { background:var(--purple-dim);color:var(--purple) }
.badge.healthy { background:var(--green-dim);color:var(--green) }
.badge.unhealthy { background:var(--red-dim);color:var(--red) }

/* ═══ MODELS ═══ */
.model-chips { display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px }
.model-chip {
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:8px;padding:8px 14px;font-size:12px;
  display:flex;align-items:center;gap:6px;
  transition:all 0.15s;cursor:default;
}
.model-chip:hover { border-color:var(--accent);background:var(--bg-card-hover) }
.model-chip .provider { font-size:10px;color:var(--text-muted) }

/* ═══ COMBO CARDS ═══ */
.combo-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(300px,1fr));
  gap:16px;
}
.combo-card {
  background:var(--bg-card);border:1px solid var(--border);
  border-radius:12px;padding:20px;position:relative;overflow:hidden;
  transition:all 0.15s;
}
.combo-card:hover { border-color:var(--border-light);background:var(--bg-card-hover) }
.combo-card .accent-bar {
  position:absolute;top:0;left:0;right:0;height:3px;
  background:linear-gradient(90deg,var(--accent),var(--cyan));
}
.combo-card h4 {
  font-size:16px;color:var(--accent);margin-bottom:4px;
  display:flex;align-items:center;gap:8px;
}
.combo-card h4 svg { width:16px;height:16px }
.combo-card .desc { font-size:12px;color:var(--text-muted);margin-bottom:16px }
.combo-tier {
  display:flex;align-items:center;gap:10px;
  padding:8px 0;border-top:1px solid var(--border);
}
.combo-tier .step {
  width:24px;height:24px;
  background:var(--bg-input);border:1px solid var(--border);
  border-radius:6px;display:flex;align-items:center;justify-content:center;
  font-size:11px;color:var(--accent);font-weight:700;
  font-family:'JetBrains Mono',monospace;
}
.combo-tier .provider-name { font-weight:500 }
.combo-tier .arrow { color:var(--text-muted) }
.combo-tier .model-name {
  font-family:'JetBrains Mono',monospace;
  font-size:12px;color:var(--text-muted);
}

/* ═══ PAGE TITLE ═══ */
.page-title {
  font-size:clamp(28px,3vw,40px);
  font-weight:700;letter-spacing:-0.04em;
  margin-bottom:4px;
}
.page-subtitle {
  font-size:13px;color:var(--text-muted);
  margin-bottom:20px;
}

/* ═══ SCROLLBAR ═══ */
::-webkit-scrollbar { width:5px }
::-webkit-scrollbar-track { background:transparent }
::-webkit-scrollbar-thumb { background:var(--border);border-radius:3px }
::-webkit-scrollbar-thumb:hover { background:var(--border-light) }

/* ═══ ANIMATIONS ═══ */
@keyframes pulse { 0%,100%{opacity:1} 50%{opacity:0.4} }

/* ═══ MOBILE ═══ */
@media (max-width: 768px) {
  /* Sidebar — hidden, slides in as overlay */
  .sidebar {
    width:240px !important;
    transform:translateX(-100%);
    transition:transform .25s cubic-bezier(.23,1,.32,1);
    z-index:200;
    background:var(--bg-secondary);
  }
  .sidebar.open { transform:translateX(0) }

/* Tablet */
@media (min-width: 769px) and (max-width: 1024px) {
  .statusbar { padding:0 16px }
  .content { padding:16px }
  .usage-grid { grid-template-columns:1fr 280px !important }
  .quota-grid { grid-template-columns:repeat(2, 1fr) !important }
}

/* Large mobile landscape */
@media (min-width: 769px) and (max-width: 1024px) and (orientation:landscape) {
  .sidebar { width:56px !important }
  .sidebar .sb-item .cnt { display:none }
}

/* ═══ CLI TOOLS ═══ */
.cli-grid {
  display:grid;
  grid-template-columns:repeat(auto-fill,minmax(280px,1fr));
  gap:16px;
}
.cli-card {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:14px;
  padding:20px;
  cursor:pointer;
  transition:all .2s;
  position:relative;
  overflow:hidden;
}
.cli-card:hover {
  background:var(--bg-card-hover);
  border-color:var(--border-light);
  transform:translateY(-2px);
  box-shadow:0 8px 24px rgba(0,0,0,0.2);
}
.cli-card-inner {
  display:flex;
  align-items:center;
  gap:14px;
}
.cli-logo {
  width:44px;height:44px;
  border-radius:12px;
  display:flex;align-items:center;justify-content:center;
  flex-shrink:0;
  transition:transform 0.2s;
}
.cli-card:hover .cli-logo { transform:scale(1.1) }
.cli-logo svg { width:22px;height:22px }
.cli-info { flex:1;min-width:0 }
.cli-name { font-size:15px;font-weight:700;color:var(--text-primary);margin-bottom:4px;letter-spacing:-0.2px }
.cli-desc { font-size:12px;color:var(--text-muted);margin-bottom:8px;line-height:1.4 }
.cli-status { font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px }
.cli-status.connected { color:var(--green) }
.cli-status.not-installed { color:var(--red) }
.cli-status.unknown { color:var(--text-muted) }
.cli-arrow { color:var(--text-muted);flex-shrink:0 }

@media (max-width:768px) {
  .cli-grid { grid-template-columns:1fr }
}

/* ═══ LOGS ═══ */
.logs-panel {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:12px;
  font-family:'JetBrains Mono',monospace;
  font-size:12px;
  max-height:calc(100vh - 220px);
  overflow-y:auto;
}
.log-entry {
  display:flex;
  align-items:center;
  gap:12px;
  padding:10px 16px;
  border-bottom:1px solid var(--border);
  transition:background .15s;
}
.log-entry:hover { background:var(--bg-card-hover) }
.log-entry:last-child { border-bottom:none }
.log-time { color:var(--text-muted);min-width:70px }
.log-method { color:var(--accent);font-weight:600;min-width:50px }
.log-path { color:var(--text-secondary);flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap }
.log-status { font-weight:600;min-width:36px;text-align:right }
.log-entry.success .log-status { color:var(--green) }
.log-entry.error .log-status { color:var(--red) }
.log-latency { color:var(--text-muted);min-width:50px;text-align:right }
.log-model { color:var(--text-muted);font-size:11px;min-width:60px }

/* ═══ TOKEN SAVER STATS ═══ */
.ts-stats { display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin:16px 0 }
.ts-stat {
  background:var(--bg-input);border:1px solid var(--border);
  border-radius:8px;padding:12px;text-align:center;
}
.ts-stat .ts-label { font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px }
.ts-stat .ts-val { font-family:'JetBrains Mono',monospace;font-size:18px;font-weight:700 }
.ts-stat .ts-val.green { color:var(--green) }
.ts-stat .ts-val.accent { color:var(--accent) }
.ts-stat .ts-val.purple { color:var(--purple) }
.ts-stat .ts-val.cyan { color:var(--cyan) }
.ts-before-after { display:flex;gap:12px;margin-top:12px }
.ts-ba-box { flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:12px;text-align:center }
.ts-ba-box .ts-ba-label { font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px }
.ts-ba-box .ts-ba-val { font-family:'JetBrains Mono',monospace;font-size:22px;font-weight:700 }

/* ═══ USAGE BAR CHART ═══ */
.bar-chart { display:flex;align-items:flex-end;gap:6px;height:120px;padding:8px 0 }
.bar-col { flex:1;display:flex;flex-direction:column;align-items:center;gap:4px }
.bar { width:100%;border-radius:4px 4px 0 0;transition:height 0.3s;min-height:2px }
.bar-label { font-size:9px;color:var(--text-muted);font-family:'JetBrains Mono',monospace }
.bar-val { font-size:9px;color:var(--text-secondary);font-family:'JetBrains Mono',monospace }
.top-items { display:flex;gap:12px;margin:8px 0 }
.top-item { flex:1;background:var(--bg-input);border:1px solid var(--border);border-radius:8px;padding:10px 14px }
.top-item .ti-label { font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px }
.top-item .ti-val { font-family:'JetBrains Mono',monospace;font-size:13px;font-weight:600;color:var(--accent);margin-top:2px }

/* ═══ QUOTA ENHANCED ═══ */
.quota-card.warn { border-color:rgba(252,187,0,0.4) }
.quota-card.danger { border-color:rgba(255,101,104,0.4) }
.quota-card .status-badge { display:inline-flex;align-items:center;gap:4px;padding:2px 8px;border-radius:6px;font-size:10px;font-weight:600 }
.quota-card .status-badge.ok { background:var(--green-dim);color:var(--green) }
.quota-card .status-badge.warn { background:var(--orange-dim);color:var(--orange) }
.quota-card .status-badge.danger { background:var(--red-dim);color:var(--red) }
.budget-controls { margin-top:24px }
.budget-row { display:flex;gap:16px;margin-bottom:12px }
.budget-field { flex:1;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:14px 16px }
.budget-field label { font-size:11px;color:var(--text-muted);display:block;margin-bottom:6px;font-weight:600;text-transform:uppercase;letter-spacing:0.5px }
.budget-field input, .budget-field select { width:100%;background:var(--bg-input);border:1px solid var(--border);border-radius:6px;padding:8px 12px;color:var(--text-primary);font-family:'JetBrains Mono',monospace;font-size:13px;outline:none;transition:border-color 0.15s }
.budget-field input:focus, .budget-field select:focus { border-color:var(--accent) }
.budget-field select { cursor:pointer;-webkit-appearance:none;appearance:none }
.budget-field select option { background:var(--bg-secondary);color:var(--text-primary) }
.budget-save-btn { padding:8px 20px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;transition:all 0.15s;margin-top:8px }
.budget-save-btn:hover { background:var(--accent-hover) }
.settings-section { margin-top:24px }
.settings-section .section-title { font-size:14px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px }
.settings-section .section-title svg { color:var(--accent) }

/* ═══ PLAYGROUND ═══ */
.pg-playground { display:grid; grid-template-columns:1fr 1fr; gap:16px; height:calc(100vh - 180px) }
.pg-left { display:flex; flex-direction:column; gap:12px }
.pg-right { display:flex; flex-direction:column; gap:12px }
.pg-textarea {
  width:100%; min-height:160px; resize:vertical;
  background:var(--bg-input); border:1px solid var(--border);
  border-radius:12px; padding:16px; color:var(--text-primary);
  font-family:'JetBrains Mono',monospace; font-size:13px;
  outline:none; transition:border-color 0.15s;
  line-height:1.5;
}
.pg-textarea:focus { border-color:var(--accent) }
.pg-controls { display:flex; flex-wrap:wrap; gap:10px; align-items:center }
.pg-select, .pg-input {
  background:var(--bg-input); border:1px solid var(--border);
  border-radius:10px; padding:10px 14px; color:var(--text-primary);
  font-family:'JetBrains Mono',monospace; font-size:12px;
  outline:none; transition:border-color 0.15s;
}
.pg-select:focus, .pg-input:focus { border-color:var(--accent) }
.pg-slider-wrap { display:flex; align-items:center; gap:12px; flex:1; min-width:180px }
.pg-slider {
  flex:1; -webkit-appearance:none; height:8px;
  background:var(--bg-input); border-radius:4px; outline:none;
}
.pg-slider::-webkit-slider-thumb {
  -webkit-appearance:none; width:18px; height:18px;
  background:var(--accent); border-radius:50%; cursor:pointer;
  border:3px solid var(--bg-card);
  transition:transform 0.15s;
}
.pg-slider::-webkit-slider-thumb:hover { transform:scale(1.15) }
.pg-btn {
  padding:10px 20px; background:var(--accent); border:none;
  border-radius:10px; color:#fff; font-size:13px; font-weight:700;
  cursor:pointer; display:flex; align-items:center; gap:6px;
  transition:all 0.2s;
}
.pg-btn:hover { background:var(--accent-hover) }
.pg-btn.secondary {
  background:transparent; border:1px solid var(--border);
  color:var(--text-secondary);
}
.pg-btn.secondary:hover { border-color:var(--accent); color:var(--accent) }
.pg-btn:disabled { opacity:0.5; cursor:not-allowed }
.pg-toggle-wrap { display:flex; align-items:center; gap:8px; font-size:12px; color:var(--text-secondary);padding:6px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:10px }
.pg-response {
  flex:1; background:var(--bg-card); border:1px solid var(--border);
  border-radius:14px; overflow:hidden; display:flex; flex-direction:column;
  min-height:300px;
}
.pg-response .hdr {
  padding:14px 18px; border-bottom:1px solid var(--border);
  display:flex; align-items:center; justify-content:space-between;
  font-size:14px; font-weight:700;
}
.pg-response-body {
  flex:1; padding:20px; overflow-y:auto;
  font-family:'JetBrains Mono',monospace; font-size:12px;
  white-space:pre-wrap; word-break:break-word; color:var(--text-secondary);
  line-height:1.6;
}
.pg-meta {
  background:var(--bg-card); border:1px solid var(--border);
  border-radius:14px; padding:16px 18px;
  display:grid; grid-template-columns:repeat(auto-fill,minmax(130px,1fr));
  gap:12px;
}
.pg-meta-item { display:flex; flex-direction:column; gap:4px }
.pg-meta-label { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.2px;font-weight:600 }
.pg-meta-val { font-family:'JetBrains Mono',monospace; font-size:14px; font-weight:700 }

@media (max-width:900px) {
  .pg-playground { grid-template-columns:1fr; height:auto }
  .pg-textarea { min-height:120px }
  .pg-response { min-height:300px }
}

/* ═══ HEALTH BADGES ═══ */
.health-badge {
  display:inline-flex; align-items:center; gap:4px;
  padding:3px 10px; border-radius:6px; font-size:11px; font-weight:600;
  font-family:'JetBrains Mono',monospace;
}
.health-badge.healthy { background:var(--green-dim); color:var(--green) }
.health-badge.degraded { background:rgba(252,187,0,0.12); color:var(--yellow) }
.health-badge.down { background:var(--red-dim); color:var(--red) }
.health-badge.disabled { background:rgba(90,96,112,0.12); color:var(--text-muted) }
.health-dot {
  width:6px; height:6px; border-radius:50%; background:currentColor;
}
.health-badge.healthy .health-dot { animation:pulse 2s infinite }
.test-btn {
  padding:4px 10px; border-radius:6px; border:1px solid var(--border);
  background:transparent; color:var(--text-secondary); font-size:11px;
  font-weight:600; cursor:pointer; transition:all 0.15s;
}
.test-btn:hover { border-color:var(--accent); color:var(--accent) }
.test-btn:disabled { opacity:0.4; cursor:not-allowed }
.test-btn.testing { border-color:var(--yellow); color:var(--yellow) }
.error-text { font-size:11px; color:var(--red); max-width:200px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.latency-text { font-family:'JetBrains Mono',monospace; font-size:12px }

.prov-logo-box { display:inline-flex; align-items:center; justify-content:center; width:24px; height:24px; border-radius:4px; overflow:hidden; vertical-align:middle; margin-right:6px }
.prov-logo-fb { width:100%; height:100%; display:flex; align-items:center; justify-content:center; border-radius:4px; font-weight:700 }

</style>
<body>

<!-- ═══ PUBLIC ACCESS WARNING ═══ -->
<div id="public-warning" style="display:none;background:#ff656822;border:1px solid #ff6568;color:#ff6568;padding:12px 20px;text-align:center;font-weight:600;font-size:14px;position:fixed;top:0;left:0;right:0;z-index:9999">
  ⚠️ Public access is enabled without authentication. This is unsafe for production.
</div>

<!-- ═══ NOISE OVERLAY ═══ -->
<svg class="noise-overlay" xmlns="http://www.w3.org/2000/svg">
  <filter id="noiseFilter">
    <feTurbulence type="fractalNoise" baseFrequency="0.65" numOctaves="3" stitchTiles="stitch"/>
  </filter>
  <rect width="100%" height="100%" filter="url(#noiseFilter)"/>
</svg>

<!-- ═══ SIDEBAR OVERLAY ═══ -->
<div class="sidebar-overlay" id="sidebar-overlay"></div>

<!-- ═══ SIDEBAR ═══ -->
<div class="sidebar" id="sidebar">
  <div class="sb-header">
    <img src="/8router/public/assets/8router-logo-dashboard.png" alt="8Router" class="sb-logo">
  </div>

  <div class="sb-nav">
    <div class="sb-item active" onclick="go('endpoint',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8z"/></svg></span>
      <span class="lbl">${t('db.sidebar.endpoint', locale)}</span>
    </div>
    <div class="sb-item" onclick="go('usage',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg></span>
      <span class="lbl">${t('db.sidebar.usage', locale)}</span>
    </div>
    <div class="sb-item" onclick="go('quota',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg></span>
      <span class="lbl">${t('db.sidebar.quota', locale)}</span>
    </div>
    <div class="sb-item" onclick="go('providers',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg></span>
      <span class="lbl">${t('db.sidebar.providers', locale)}</span>
      <span class="cnt" id="prov-cnt">0</span>
    </div>
    <div class="sb-item" onclick="go('combos',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg></span>
      <span class="lbl">${t('db.sidebar.combos', locale)}</span>
    </div>
    <div class="sb-item" onclick="go('clitools',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg></span>
      <span class="lbl">${t('db.sidebar.cli', locale)}</span>
    </div>
    <div class="sb-item" onclick="go('apikeys',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></span>
      <span class="lbl">${t('db.sidebar.keys', locale)}</span>
    </div>
    <div class="sb-item" onclick="go('accesskeys',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z"/></svg></span>
      <span class="lbl">${t('db.sidebar.accessKeys', locale)}</span>
    </div>
    <div class="sb-section">${t('db.sidebar.system', locale)}</div>
    <div class="sb-item" onclick="go('settings',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg></span>
      <span class="lbl">${t('db.sidebar.settings', locale)}</span>
    </div>
    <div class="sb-item" onclick="go('connections',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg></span>
      <span class="lbl">${t('db.sidebar.connections', locale)}</span>
    </div>
    <div class="sb-item" onclick="go('logs',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg></span>
      <span class="lbl">${t('db.sidebar.logs', locale)}</span>
    </div>
    <div class="sb-item" onclick="go('playground',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg></span>
      <span class="lbl">${t('db.sidebar.playground', locale)}</span>
    </div>
    <div class="sb-section">Experiment</div>
    <div class="sb-item" onclick="go('canonicalexperiment',this)">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg></span>
      <span class="lbl">${t('db.sidebar.canonical', locale)}</span>
    </div>
  </div>

  <div class="sb-footer">
    <div class="sb-shutdown" onclick="if(confirm('Shutdown 8Router?')){fetch('/8router/shutdown',{method:'POST'}).then(function(r){if(!r.ok)throw new Error();alert('Shutdown signal sent.');}).catch(function(){alert('Shutdown command sent (endpoint may not be implemented yet).');})}">
      <span class="ico"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18.36 6.64a9 9 0 1 1-12.73 0"/><line x1="12" x2="12" y1="2" y2="12"/></svg></span>
      <span class="lbl">${t('db.sidebar.shutdown', locale)}</span>
    </div>
  </div>
</div>

<!-- ═══ MAIN ═══ -->
<div class="main">

  <!-- Status Bar -->
  <div class="statusbar">
    <span>8Router</span><span class="sep">\u00b7</span>
    <span>${t('db.status.port', locale)} ${apiPort}</span><span class="sep">\u00b7</span>
    <span>${t('db.status.gateway', locale)}</span><span class="sep">\u00b7</span>
    <span class="val green" id="conn-badge-text">${t('db.status.connected', locale)}</span>
    <span class="sep">\u00b7</span>
    <span class="val" id="oauth-badge">OAuth: disabled</span>
    <span class="sep">\u00b7</span>
    <select id="lang-switch" onchange="document.cookie='8router_locale='+this.value+';path=/;max-age=31536000';location.reload()" style="background:var(--bg-card);color:var(--text-secondary);border:1px solid var(--border);border-radius:4px;padding:1px 4px;font-size:11px;cursor:pointer;font-family:inherit">
      <option value="en"${locale==='en'?' selected':''}>EN</option>
      <option value="id"${locale==='id'?' selected':''}>ID</option>
      <option value="ja"${locale==='ja'?' selected':''}>JA</option>
    </select>
    <span class="spacer"></span>
    <span class="val accent">${t('db.status.openai', locale)}</span>
  </div>

  <!-- Topbar -->
  <div class="topbar">
    <button class="hamburger" onclick="toggleSidebar()">
      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="18" y2="18"/></svg>
    </button>
    <div class="page-icon" id="tb-page-icon">
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8z"/></svg>
    </div>
    <div class="title-area">
      <div class="title" id="tb-title">${t('db.page.endpoint', locale)}</div>
      <div class="subtitle" id="tb-sub">${t('db.page.endpointDesc', locale)}</div>
    </div>
    <div class="spacer"></div>
    <div class="actions">
      <div class="pill" onclick="navigator.clipboard.writeText('http://localhost:${apiPort}/v1')" title="Copy endpoint">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-1px"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
        localhost:${apiPort}/v1
      </div>
      <div class="badge on" id="conn-badge"><span class="dot"></span> ${t('db.status.connected', locale)}</div>
    </div>
  </div>

  <div class="content">

    <!-- ═══ ENDPOINT ═══ -->
    <div id="pg-endpoint" class="page active">
      <div class="card endpoint-card">
        <div class="card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20"/><path d="M2 12h20"/></svg>
          <h3>${t('db.endpoint.apiEndpoint', locale)}</h3>
        </div>
        <div class="ep-row">
          <span class="label">${t('db.endpoint.local', locale)}</span>
          <span class="url" onclick="navigator.clipboard.writeText('http://localhost:${apiPort}/v1')">http://localhost:${apiPort}/v1</span>
          <span class="copy-btn" onclick="navigator.clipboard.writeText('http://localhost:${apiPort}/v1')" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </span>
        </div>
        <div class="ep-row">
          <span class="label">${t('db.endpoint.public', locale)}</span>
          <span class="url" onclick="navigator.clipboard.writeText('http://5.223.60.79/v1')">http://5.223.60.79/v1</span>
          <span class="copy-btn" onclick="navigator.clipboard.writeText('http://5.223.60.79/v1')" title="Copy">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
          </span>
          <span class="ep-status"><span class="dot"></span> ${t('db.endpoint.active', locale)}</span>
        </div>
      </div>

      <div class="warning-box">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
        <span>${t('db.endpoint.noAuth', locale)}</span>
        <span class="action" onclick="go('settings',this)">${t('db.btn.enable', locale)}</span>
      </div>

      <div class="toggle-row">
        <div>
          <div class="info">${t('db.endpoint.enableAuth', locale)}</div>
          <div class="desc">${t('db.endpoint.requireKey', locale)}</div>
        </div>
        <div class="toggle" id="toggle-auth" onclick="this.classList.toggle('on')"></div>
      </div>

      <div class="toggle-row">
        <div>
          <div class="info">${t('db.endpoint.allowPublic', locale)}</div>
          <div class="desc">${t('db.endpoint.dashAt', locale)} http://5.223.60.79/8router</div>
        </div>
        <div class="toggle on" id="toggle-dashboard"></div>
      </div>

      <!-- Token Saver / Safe Compression -->
      <div class="caveman-card" style="margin-top:16px">
        <div class="card-header" style="margin-bottom:4px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          <h3>${t('db.toksv.title', locale)}</h3>
        </div>
        <div class="sub">${t('db.toksv.desc', locale)}</div>
        <div style="margin:12px 0">
          <label style="font-size:12px;color:var(--text-muted);display:block;margin-bottom:6px">${t('db.toksv.mode', locale)}</label>
          <select id="ts-mode" style="width:100%;padding:8px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;color:var(--text-main);font-size:13px;cursor:pointer">
            <option value="off">${t('db.toksv.modeOff', locale)}</option>
            <option value="safe">${t('db.toksv.modeSafe', locale)}</option>
            <option value="balanced">${t('db.toksv.modeBalanced', locale)}</option>
            <option value="aggressive">${t('db.toksv.modeAggressive', locale)}</option>
          </select>
          <div id="ts-mode-desc" style="font-size:12px;color:var(--text-secondary);margin-top:6px">${t('db.toksv.modeOffDesc', locale)}</div>
        </div>
        <div style="margin:8px 0;padding:10px 12px;background:rgba(255,255,255,0.03);border-radius:8px;border-left:3px solid var(--accent)">
          <div style="font-size:11px;color:var(--text-muted);line-height:1.5">${t('db.toksv.safetyNote', locale)}</div>
        </div>
        <div style="margin-top:12px;display:flex;gap:8px;align-items:center">
          <button id="ts-save-btn" onclick="saveTokenSaver()" style="padding:8px 20px;background:var(--accent);color:#fff;border:none;border-radius:8px;font-size:13px;cursor:pointer;font-weight:600">${t('db.toksv.save', locale)}</button>
          <span id="ts-save-status" style="font-size:12px;color:var(--text-muted)"></span>
        </div>
        <!-- Token Saver Stats -->
        <div id="ts-stats-container" style="margin-top:16px;border-top:1px solid var(--border);padding-top:16px">
          <div style="font-size:11px;color:var(--text-muted);margin-bottom:8px;font-weight:600;text-transform:uppercase;letter-spacing:1px">${t('db.compress.title', locale)}</div>
          <div class="ts-stats">
            <div class="ts-stat">
              <div class="ts-label">${t('db.compress.saved', locale)}</div>
              <div class="ts-val green" id="ts-saved-today">0</div>
            </div>
            <div class="ts-stat">
              <div class="ts-label">${t('db.compress.pct', locale)}</div>
              <div class="ts-val accent" id="ts-pct-saved">0%</div>
            </div>
            <div class="ts-stat">
              <div class="ts-label">${t('db.compress.cost', locale)}</div>
              <div class="ts-val purple" id="ts-cost-saved">$0.00</div>
            </div>
            <div class="ts-stat">
              <div class="ts-label">${t('db.compress.total', locale)}</div>
              <div class="ts-val cyan" id="ts-total-compressed">0</div>
            </div>
          </div>
          <div class="ts-before-after">
            <div class="ts-ba-box">
              <div class="ts-ba-label">${t('db.compress.before', locale)}</div>
              <div class="ts-ba-val" id="ts-before" style="color:var(--red)">0</div>
            </div>
            <div class="ts-ba-box">
              <div class="ts-ba-label">${t('db.compress.after', locale)}</div>
              <div class="ts-ba-val" id="ts-after" style="color:var(--green)">0</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ USAGE ═══ -->
    <div id="pg-usage" class="page">
      <div class="bento" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
        <div class="stat-card">
          <div class="label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
            ${t('db.usage.totalReqs', locale)}
          </div>
          <div class="value" style="color:var(--accent)" id="u-req">0</div>
        </div>
        <div class="stat-card">
          <div class="label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="17 8 12 3 7 8"/><line x1="12" x2="12" y1="3" y2="15"/></svg>
            ${t('db.usage.inputTok', locale)}
          </div>
          <div class="value" style="color:var(--green)" id="u-input-tokens">0</div>
        </div>
        <div class="stat-card">
          <div class="label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
            ${t('db.usage.outputTok', locale)}
          </div>
          <div class="value" style="color:var(--cyan)" id="u-output-tokens">0</div>
        </div>
        <div class="stat-card">
          <div class="label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8h-6a2 2 0 0 0 0 4h4a2 2 0 0 1 0 4H8"/><path d="M12 18V6"/></svg>
            ${t('db.usage.totalTok', locale)}
          </div>
          <div class="value" style="color:var(--accent)" id="u-tokens">0</div>
        </div>
      </div>
      <div class="bento" style="grid-template-columns:repeat(4,1fr);margin-bottom:16px">
        <div class="stat-card">
          <div class="label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
            ${t('db.usage.estCost', locale)}
          </div>
          <div class="value" style="color:var(--green)" id="u-cost">$0.00</div>
        </div>
        <div class="stat-card">
          <div class="label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
            ${t('db.usage.avgLatency', locale)}
          </div>
          <div class="value" style="color:var(--yellow)" id="u-latency">0ms</div>
        </div>
        <div class="stat-card">
          <div class="label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>
            ${t('db.usage.errorRate', locale)}
          </div>
          <div class="value" style="color:var(--red)" id="u-error-rate">0%</div>
        </div>
        <div class="stat-card">
          <div class="label">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
            ${t('db.usage.fallbacks', locale)}
          </div>
          <div class="value" style="color:var(--orange)" id="u-fb">0</div>
        </div>
      </div>
      <!-- Daily Requests Chart + Top Items -->
      <div class="card" style="margin-bottom:16px">
        <div class="card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>
          <h3>${t('db.usage.dailyReqs', locale)}</h3>
        </div>
        <div class="bar-chart" id="daily-chart"></div>
      </div>
      <div class="top-items">
        <div class="top-item">
          <div class="ti-label">${t('db.usage.topProvider', locale)}</div>
          <div class="ti-val" id="u-top-provider">-</div>
        </div>
        <div class="top-item">
          <div class="ti-label">${t('db.usage.topModel', locale)}</div>
          <div class="ti-val" id="u-top-model">-</div>
        </div>
      </div>
      <!-- Recent Requests Table -->
      <div class="card" style="margin-top:16px">
        <div class="card-header">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
          <h3>${t('db.usage.recentReqs', locale)}</h3>
        </div>
        <div class="tbl-wrap">
          <table>
            <thead><tr><th>${t('db.col.time', locale)}</th><th>${t('db.col.provider', locale)}</th><th>${t('db.col.model', locale)}</th><th>${t('db.col.tokens', locale)}</th><th>${t('db.col.latency', locale)}</th><th>${t('db.col.status', locale)}</th></tr></thead>
            <tbody id="recent-list"><tr><td colspan="6" style="text-align:center;color:var(--text-muted);padding:40px;font-family:Inter,sans-serif">${t('db.usage.noReqs', locale)}</td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- ═══ QUOTA ═══ -->
    <div id="pg-quota" class="page">
      <div class="card-header" style="margin-bottom:20px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>
        <div>
          <div class="page-title" style="font-size:22px">${t('db.page.quota', locale)}</div>
          <div class="page-subtitle" style="margin-bottom:0">${t('db.page.quotaDesc', locale)}</div>
        </div>
      </div>
      <div class="quota-grid" id="quota-grid"></div>
      <!-- Budget Controls -->
      <div class="budget-controls">
        <div class="card-header" style="margin-bottom:12px">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
          <h3>${t('db.budget.title', locale)}</h3>
        </div>
        <div class="budget-row">
          <div class="budget-field">
            <label>${t('db.budget.dailyReqs', locale)}</label>
            <input type="number" id="budget-daily-req" placeholder="e.g. 1000" min="0">
          </div>
          <div class="budget-field">
            <label>${t('db.budget.monthlyReqs', locale)}</label>
            <input type="number" id="budget-monthly-req" placeholder="e.g. 30000" min="0">
          </div>
          <div class="budget-field">
            <label>${t('db.budget.dailyTokens', locale)}</label>
            <input type="number" id="budget-daily-tokens" placeholder="e.g. 1000000" min="0">
          </div>
        </div>
        <div class="budget-row">
          <div class="budget-field">
            <label>${t('db.budget.dailyCost', locale)}</label>
            <input type="number" id="budget-daily-cost" placeholder="e.g. 10.00" min="0" step="0.01">
          </div>
          <div class="budget-field">
            <label>${t('db.budget.monthlyCost', locale)}</label>
            <input type="number" id="budget-monthly-cost" placeholder="e.g. 100.00" min="0" step="0.01">
          </div>
          <div class="budget-field" style="display:flex;flex-direction:column;justify-content:flex-end">
            <button class="budget-save-btn" onclick="saveBudget()">${t('db.btn.save', locale)}</button>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ PROVIDERS ═══ -->
    <div id="pg-providers" class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div class="card-header" style="margin-bottom:0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
          <div>
            <div class="page-title" style="font-size:22px">${t('db.page.providers', locale)}</div>
            <div class="page-subtitle" style="margin-bottom:0">${t('db.page.providersDesc', locale)}</div>
          </div>
        </div>
        <button style="padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s;flex-shrink:0" onclick="loadProv()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 12a9 9 0 0 0-9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/><path d="M3 12a9 9 0 0 0 9 9 9.75 9.75 0 0 0 6.74-2.74L21 16"/><path d="M16 16h5v5"/></svg>
          ${t('db.btn.refresh', locale)}
        </button>
      </div>
      <p style="margin:0 0 16px;font-size:12px;color:var(--text-muted)">Your provider keys are encrypted and never shown again after saving. Add your own API key or local endpoint to start routing.</p>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>${t('db.col.provider', locale)}</th><th>${t('db.col.tier', locale)}</th><th>${t('db.col.health', locale)}</th><th>${t('db.col.latency', locale)}</th><th>${t('db.col.apiKeys', locale)}</th><th>${t('db.col.requests', locale)}</th><th>${t('db.col.tokens', locale)}</th><th>${t('db.col.errors', locale)}</th><th>${t('db.col.lastError', locale)}</th><th></th></tr></thead>
          <tbody id="prov-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- ═══ COMBOS ═══ -->
    <div id="pg-combos" class="page">
      <div class="card-header" style="margin-bottom:20px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
        <div>
          <div class="page-title" style="font-size:22px">${t('db.page.combos', locale)}</div>
          <div class="page-subtitle" style="margin-bottom:0">${t('db.page.combosDesc', locale)}</div>
        </div>
      </div>
      <div class="combo-grid" id="combo-cards"></div>
    </div>

    <!-- ═══ SETTINGS ═══ -->
    <div id="pg-settings" class="page">
      <div class="card-header" style="margin-bottom:20px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
        <div>
          <div class="page-title" style="font-size:22px">${t('db.page.settings', locale)}</div>
          <div class="page-subtitle" style="margin-bottom:0">${t('db.page.settingsDesc', locale)}</div>
        </div>
      </div>

      <div class="toggle-row">
        <div><div class="info">${t('db.settings.rtk', locale)}</div><div class="desc">${t('db.settings.rtkDesc', locale)}</div></div>
        <div class="toggle on" id="t-rtk"></div>
      </div>
      <div class="toggle-row">
        <div><div class="info">${t('db.settings.circuit', locale)}</div><div class="desc">${t('db.settings.circuitDesc', locale)}</div></div>
        <div class="toggle on" id="t-circuit"></div>
      </div>
      <div class="toggle-row">
        <div><div class="info">${t('db.settings.sse', locale)}</div><div class="desc">${t('db.settings.sseDesc', locale)}</div></div>
        <div class="toggle on" id="t-stream"></div>
      </div>
      <div class="toggle-row">
        <div><div class="info">${t('db.settings.rotation', locale)}</div><div class="desc">${t('db.settings.rotationDesc', locale)}</div></div>
        <div class="toggle on" id="t-rotation"></div>
      </div>
      <div class="toggle-row">
        <div><div class="info">${t('db.settings.fallback', locale)}</div><div class="desc">${t('db.settings.fallbackDesc', locale)}</div></div>
        <div class="toggle on" id="t-fallback"></div>
      </div>

      <!-- Advanced Settings -->
      <div class="settings-section">
        <div class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
          ${t('db.settings.compressMode', locale)}
        </div>
        <div class="budget-row">
          <div class="budget-field">
            <label>${t('db.settings.compressMode', locale)}</label>
            <select id="s-compression-mode" onchange="saveSetting('compressionMode', this.value)">
              <option value="off">${t('db.settings.off', locale)}</option>
              <option value="safe">${t('db.settings.safe', locale)}</option>
              <option value="balanced" selected>${t('db.settings.balanced', locale)}</option>
              <option value="aggressive">${t('db.settings.aggressive', locale)}</option>
            </select>
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M8 12h8"/><path d="M12 8v8"/></svg>
          ${t('db.settings.modelRouting', locale)}
        </div>
        <div class="budget-row">
          <div class="budget-field">
            <label>${t('db.settings.defaultAlias', locale)}</label>
            <select id="s-default-model" onchange="saveSetting('defaultModel', this.value)">
              <option value="">${t('db.settings.sysDefault', locale)}</option>
              <option value="auto">${t('db.settings.autoBest', locale)}</option>
              <option value="gpt-4o">GPT-4o</option>
              <option value="gpt-4o-mini">GPT-4o Mini</option>
              <option value="claude-sonnet-4-20250514">Claude Sonnet 4</option>
              <option value="claude-3-5-haiku-20241022">Claude 3.5 Haiku</option>
              <option value="gemini-2.5-flash">Gemini 2.5 Flash</option>
              <option value="deepseek-chat">DeepSeek Chat</option>
            </select>
          </div>
          <div class="budget-field">
            <label>${t('db.settings.fallbackTimeout', locale)}</label>
            <input type="number" id="s-fallback-timeout" placeholder="e.g. 30000" min="1000" max="120000" onchange="saveSetting('fallbackTimeout', parseInt(this.value))">
          </div>
        </div>
      </div>

      <div class="settings-section">
        <div class="section-title">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 9V5a3 3 0 0 0-3-3l-4 9v11h11.28a2 2 0 0 0 2-1.7l1.38-9a2 2 0 0 0-2-2.3zM7 22H4a2 2 0 0 1-2-2v-7a2 2 0 0 1 2-2h3"/></svg>
          ${t('db.settings.logging', locale)}
        </div>
        <div class="budget-row">
          <div class="budget-field">
            <label>${t('db.settings.logLevel', locale)}</label>
            <select id="s-log-level" onchange="saveSetting('logLevel', this.value)">
              <option value="error">${t('db.settings.error', locale)}</option>
              <option value="warn">${t('db.settings.warning', locale)}</option>
              <option value="info" selected>${t('db.settings.info', locale)}</option>
              <option value="debug">${t('db.settings.debug', locale)}</option>
              <option value="verbose">${t('db.settings.verbose', locale)}</option>
            </select>
          </div>
        </div>
      </div>

      <div style="margin-top:24px">
        <div class="card-header">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>
          <h3>${t('db.settings.sysInfo', locale)}</h3>
        </div>
        <div class="tbl-wrap">
          <table><tbody id="sysinfo-tbody"></tbody></table>
        </div>
      </div>
    </div>

    <!-- ═══ CONNECTIONS ═══ -->
    <div id="pg-connections" class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div class="card-header" style="margin-bottom:0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>
          <div>
            <div class="page-title" style="font-size:22px">${t('db.page.connections', locale)}</div>
            <div class="page-subtitle" style="margin-bottom:0">${t('db.page.connectionsDesc', locale)}</div>
          </div>
        </div>
        <button style="padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s;flex-shrink:0" onclick="testAllConns()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          ${t('db.btn.testAll', locale)}
        </button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>${t('db.col.id', locale)}</th><th>${t('db.col.provider', locale)}</th><th>${t('db.col.name', locale)}</th><th>${t('db.col.auth', locale)}</th><th>${t('db.col.status', locale)}</th><th>${t('db.col.health', locale)}</th><th>${t('db.col.backoff', locale)}</th><th>${t('db.col.retry', locale)}</th><th>${t('db.col.nextRetry', locale)}</th><th>${t('db.col.requests', locale)}</th><th>${t('db.col.tokens', locale)}</th><th>${t('db.col.cost', locale)}</th><th></th></tr></thead>
          <tbody id="conn-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- ═══ CLI TOOLS ═══ -->
    <div id="pg-clitools" class="page">
      <div class="card-header" style="margin-bottom:20px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>
        <div>
          <div class="page-title" style="font-size:22px">${t('db.page.cli', locale)}</div>
          <div class="page-subtitle" style="margin-bottom:0">${t('db.page.cliDesc', locale)}</div>
        </div>
      </div>
      <div class="cli-grid" id="cli-grid"></div>
    </div>

    <!-- ═══ API KEYS ═══ -->
    <div id="pg-apikeys" class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div class="card-header" style="margin-bottom:0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>
          <div>
            <div class="page-title" style="font-size:22px">${t('db.page.keys', locale)}</div>
            <div class="page-subtitle" style="margin-bottom:0">${t('db.page.keysDesc', locale)}</div>
          </div>
        </div>
        <button style="padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s;flex-shrink:0" onclick="createApiKey()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          ${t('db.btn.createKey', locale)}
        </button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>${t('db.col.key', locale)}</th><th>${t('db.col.name', locale)}</th><th>${t('db.col.created', locale)}</th><th>${t('db.col.lastUsed', locale)}</th><th>${t('db.col.requests', locale)}</th><th>${t('db.col.status', locale)}</th><th></th></tr></thead>
          <tbody id="apikey-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- ═══ ACCESS KEYS (Phase 2B) ═══ -->
    <div id="pg-accesskeys" class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div class="card-header" style="margin-bottom:0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z"/></svg>
          <div>
            <div class="page-title" style="font-size:22px">${t('db.page.accessKeys', locale)}</div>
            <div class="page-subtitle" style="margin-bottom:0">${t('db.page.accessKeysDesc', locale)}</div>
          </div>
        </div>
        <button style="padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;gap:6px;transition:all 0.15s;flex-shrink:0" onclick="createAccessKey()">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" x2="12" y1="5" y2="19"/><line x1="5" x2="19" y1="12" y2="12"/></svg>
          ${t('db.btn.createKey', locale)}
        </button>
      </div>
      <p style="margin:0 0 16px;font-size:12px;color:var(--text-muted)">Provider keys stay encrypted inside 8Router. Your tools only use these 8Router access keys.</p>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>${t('db.col.name', locale)}</th><th>Key</th><th>Project</th><th>Routing</th><th>Model</th><th>${t('db.col.status', locale)}</th><th>${t('db.col.lastUsed', locale)}</th><th></th></tr></thead>
          <tbody id="accesskey-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- ═══ LOGS ═══ -->
    <div id="pg-logs" class="page">
      <div class="card-header" style="margin-bottom:20px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>
        <div>
          <div class="page-title" style="font-size:22px">${t('db.page.logs', locale)}</div>
          <div class="page-subtitle" style="margin-bottom:0">${t('db.page.logsDesc', locale)}</div>
        </div>
        <button style="margin-left:auto;padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer" onclick="loadLogs()">${t('db.btn.refresh', locale)}</button>
      </div>
      <div class="logs-panel" id="logs-panel">
        <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">${t('db.logs.noLogs', locale)}</div>
      </div>
    </div>

    <!-- ═══ PLAYGROUND ═══ -->
    <div id="pg-playground" class="page">
      <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-bottom:20px">
        <div class="card-header" style="margin-bottom:0">
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>
          <div>
            <div class="page-title" style="font-size:22px">${t('db.page.playground', locale)}</div>
            <div class="page-subtitle" style="margin-bottom:0">${t('db.page.playgroundDesc', locale)}</div>
          </div>
        </div>
      </div>
      <div class="pg-playground">
        <div class="pg-left">
          <textarea class="pg-textarea" id="pg-prompt" placeholder="${t('db.play.placeholder', locale)}"></textarea>
          <div class="pg-controls">
            <select class="pg-select" id="pg-model">
              <option value="auto">auto</option>
              <option value="cheap">cheap</option>
              <option value="fast">fast</option>
              <option value="smart">smart</option>
              <option value="coding">coding</option>
              <option value="creative">creative</option>
              <option value="local">local</option>
              <option value="privacy">privacy</option>
            </select>
            <div class="pg-slider-wrap">
              <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${t('db.play.temp', locale)}</span>
              <input type="range" class="pg-slider" id="pg-temp" min="0" max="2" step="0.1" value="0.7" oninput="document.getElementById('pg-temp-val').textContent=this.value">
              <span id="pg-temp-val" style="font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent);min-width:24px">0.7</span>
            </div>
            <div style="display:flex;align-items:center;gap:6px">
              <span style="font-size:11px;color:var(--text-muted);white-space:nowrap">${t('db.play.maxTokens', locale)}</span>
              <input type="number" class="pg-input" id="pg-maxtokens" value="1024" min="1" max="128000" style="width:80px">
            </div>
          </div>
          <div class="pg-controls">
            <button class="pg-btn" id="pg-send-btn" onclick="pgSend()">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg>
              ${t('db.btn.send', locale)}
            </button>
            <div class="pg-toggle-wrap">
              <div class="toggle" id="pg-stream-toggle" onclick="this.classList.toggle('on')"></div>
              <span>${t('db.play.stream', locale)}</span>
            </div>
            <span style="flex:1"></span>
            <button class="pg-btn secondary" onclick="pgCopy()" title="Copy response">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>
              ${t('db.btn.copy', locale)}
            </button>
          </div>
          <div class="pg-meta" id="pg-meta">
            <div class="pg-meta-item"><span class="pg-meta-label">${t('db.col.provider', locale)}</span><span class="pg-meta-val" id="pg-m-provider">\u2014</span></div>
            <div class="pg-meta-item"><span class="pg-meta-label">${t('db.col.tokens', locale)}</span><span class="pg-meta-val" id="pg-m-tokens">\u2014</span></div>
            <div class="pg-meta-item"><span class="pg-meta-label">${t('db.col.latency', locale)}</span><span class="pg-meta-val" id="pg-m-latency">\u2014</span></div>
            <div class="pg-meta-item"><span class="pg-meta-label">${t('db.col.cost', locale)}</span><span class="pg-meta-val" id="pg-m-cost">\u2014</span></div>
            <div class="pg-meta-item"><span class="pg-meta-label">${t('db.health.healthy', locale)}</span><span class="pg-meta-val" id="pg-m-fallback">\u2014</span></div>
            <div class="pg-meta-item"><span class="pg-meta-label">${t('db.col.model', locale)}</span><span class="pg-meta-val" id="pg-m-model">\u2014</span></div>
          </div>
        </div>
        <div class="pg-right">
          <div class="pg-response">
            <div class="hdr">
              <span style="display:flex;align-items:center;gap:8px">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
                ${t('db.play.response', locale)}
              </span>
              <span id="pg-status" style="font-size:11px;color:var(--text-muted)"></span>
            </div>
            <div class="pg-response-body" id="pg-response">
              <span style="color:var(--text-muted)">${t('db.play.responsePlaceholder', locale)}</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ CANONICAL EXPERIMENT ═══ -->
    <div id="pg-canonicalexperiment" class="page">
      <div class="card-header" style="margin-bottom:20px">
        <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg>
        <div>
          <div class="page-title" style="font-size:22px">${t('db.page.canonical', locale)}</div>
          <div class="page-subtitle" style="margin-bottom:0">${t('db.page.canonicalDesc', locale)}</div>
        </div>
        <button style="margin-left:auto;padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer" onclick="loadCanonicalExperiment()">${t('db.btn.refresh', locale)}</button>
      </div>
      <div id="canonexp-content">
        <div style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">${t('db.canonical.loading', locale)}</div>
      </div>
    </div>

  </div><!-- /content -->
</div><!-- /main -->

<script>window.__i18n = ${JSON.stringify(buildClientI18n(locale))};</script>
<script>function ct(key) { return (window.__i18n && window.__i18n[key]) || key; }</script>
<script>
const API = '';
let curPage = 'endpoint';
let _retryCache = {};

async function apiFetch(url, retries) {
  retries = retries || 2;
  for (var i = 0; i <= retries; i++) {
    try {
      var r = await fetch(url);
      if (r.ok) {
        var data = await r.json();
        _retryCache[url] = data;
        return data;
      }
    } catch(e) {}
    if (i < retries) await new Promise(function(res){ setTimeout(res, 500 * (i+1)) });
  }
  return _retryCache[url] || null;
}

// Provider logo helper
var PROVIDER_LOGOS = {
  openai: {logo: '/assets/providers/openai.svg', fallback: 'OA', color: '#10A37F'},
  anthropic: {logo: '/assets/providers/anthropic.svg', fallback: 'A', color: '#D4A27F'},
  google: {logo: '/assets/providers/gemini.svg', fallback: 'G', color: '#8AB4F8'},
  groq: {logo: '/assets/providers/groq.svg', fallback: 'GQ', color: '#F55036'},
  openrouter: {logo: '/assets/providers/openrouter.svg', fallback: 'OR', color: '#FFFFFF'},
  mistral: {logo: '/assets/providers/mistral.svg', fallback: 'M', color: '#FFAF00'},
  deepseek: {logo: '/assets/providers/deepseek.svg', fallback: 'DS', color: '#4D6BFE'},
  ollama: {logo: '/assets/providers/ollama.svg', fallback: 'OL', color: '#FFFFFF'},
  together: {logo: '/assets/providers/together.svg', fallback: 'TG', color: '#FF4F00'},
  mimo: {logo: '/assets/providers/mimo.svg', fallback: 'MM', color: '#FF6B35'},
  'xiaomi-tokenplan': {logo: '/assets/providers/mimo.svg', fallback: 'XI', color: '#FF6B35'},
  cerebras: {logo: '/assets/providers/cerebras.svg', fallback: 'CB', color: '#FF6B00'},
  sambanova: {logo: '/assets/providers/sambanova.svg', fallback: 'SN', color: '#00B4D8'},
  fireworks: {logo: '/assets/providers/fireworks.svg', fallback: 'FW', color: '#FF4500'},
  perplexity: {logo: '/assets/providers/perplexity.svg', fallback: 'PX', color: '#20B8CD'},
  cohere: {logo: '/assets/providers/cohere.svg', fallback: 'C', color: '#39594D'},
  replicate: {logo: '/assets/providers/replicate.svg', fallback: 'RP', color: '#FFFFFF'},
  xai: {logo: '/assets/providers/xai.svg', fallback: 'xAI', color: '#FFFFFF'},
  azure: {logo: '/assets/providers/azure.svg', fallback: 'AZ', color: '#0078D4'},
  bedrock: {logo: '/assets/providers/aws-bedrock.svg', fallback: 'AWS', color: '#FF9900'},
  antigravity: {logo: '/assets/providers/antigravity.svg', fallback: 'AG', color: '#9333EA'},
};

function provLogo(id, size) {
  var p = PROVIDER_LOGOS[id] || {logo: '', fallback: id.slice(0,2).toUpperCase(), color: '#94A3B8'};
  return '<span class="prov-logo-box" style="width:'+(size+4)+'px;height:'+(size+4)+'px"><img src="'+p.logo+'" width="'+size+'" height="'+size+'" style="object-fit:contain" onerror="this.style.display=\\'none\\';this.nextElementSibling.style.display=\\'flex\\'"><span class="prov-logo-fb" style="display:none;background:'+p.color+'20;color:'+p.color+';font-size:'+Math.round(size*0.4)+'px">'+p.fallback+'</span></span>';
}

const pageIcons = {
  endpoint: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a6 6 0 0 1-6 6 6 6 0 0 1-6-6V8z"/></svg>',
  usage: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>',
  quota: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M3 21v-5h5"/></svg>',
  providers: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="20" height="8" x="2" y="2" rx="2" ry="2"/><rect width="20" height="8" x="2" y="14" rx="2" ry="2"/><line x1="6" x2="6.01" y1="6" y2="6"/><line x1="6" x2="6.01" y1="18" y2="18"/></svg>',
  combos: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
  settings: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>',
  connections: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5V19A9 3 0 0 0 21 19V5"/><path d="M3 12A9 3 0 0 0 21 12"/></svg>',
  clitools: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>',
  apikeys: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>',
  accesskeys: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 12a1 1 0 1 0 0-2 1 1 0 0 0 0 2z"/><path d="M2 8a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V8z"/></svg>',
  logs: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>',
  playground: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m18 16 4-4-4-4"/><path d="m6 8-4 4 4 4"/><path d="m14.5 4-5 16"/></svg>'
};

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("show");
}

function go(name, el) {
  curPage = name;
  document.querySelectorAll('.page').forEach(function(p){ p.classList.remove('active') });
  document.querySelectorAll('.sb-item').forEach(function(n){ n.classList.remove('active') });
  document.getElementById('pg-' + name).classList.add('active');
  el.classList.add('active');
  if (window.innerWidth <= 768) {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("show");
  }
  var titles = {
    endpoint: [ct('db.page.endpoint'),ct('db.page.endpointDesc')],
    usage: [ct('db.page.usage'),ct('db.page.usageDesc')],
    quota: [ct('db.page.quota'),ct('db.page.quotaDesc')],
    providers: [ct('db.page.providers'),ct('db.page.providersDesc')],
    combos: [ct('db.page.combos'),ct('db.page.combosDesc')],
    settings: [ct('db.page.settings'),ct('db.page.settingsDesc')],
    connections: [ct('db.page.connections'),ct('db.page.connectionsDesc')],
    clitools: [ct('db.page.cli'),ct('db.page.cliDesc')],
    apikeys: [ct('db.page.keys'),ct('db.page.keysDesc')],
    accesskeys: [ct('db.page.accessKeys'),ct('db.page.accessKeysDesc')],
    logs: [ct('db.page.logs'),ct('db.page.logsDesc')],
    playground: [ct('db.page.playground'),ct('db.page.playgroundDesc')],
    canonicalexperiment: [ct('db.page.canonical'),ct('db.page.canonicalDesc')]
  };
  var ttl = titles[name] || [name, ''];
  document.getElementById('tb-title').textContent = ttl[0];
  document.getElementById('tb-sub').textContent = ttl[1];
  if (pageIcons[name]) document.getElementById('tb-page-icon').innerHTML = pageIcons[name];
  if (name === 'usage') loadUsage();
  if (name === 'providers') loadProv();
  if (name === 'combos') loadCombos();
  if (name === 'connections') loadConns();
  if (name === 'settings') loadSettings();
  if (name === 'quota') loadQuota();
  if (name === 'clitools') loadCliTools();
  if (name === 'apikeys') loadApiKeys();
  if (name === 'accesskeys') loadAccessKeys();
  if (name === 'logs') loadLogs();
  if (name === 'canonicalexperiment') loadCanonicalExperiment();
}

// ═══ DASHBOARD DATA ═══
async function refresh() {
  try {
    var stats = await apiFetch(API+'/8router/stats');
    var provs = await apiFetch(API+'/8router/providers');
    var health = await apiFetch(API+'/8router/health');
    var models = await apiFetch(API+'/8router/models');
    if (!stats || !provs) throw new Error('Failed to load');
    var s = stats.session || stats;
    var at = stats.allTime || {};
    var total = at.totalRequests||0;

    document.getElementById('u-req').textContent = total.toLocaleString();
    document.getElementById('u-tokens').textContent = (at.totalTokens||0).toLocaleString();
    document.getElementById('u-fb').textContent = (s.fallbackCount||0).toLocaleString();
    document.getElementById('u-rtk').textContent = (s.compressionSaved||0).toLocaleString();
    document.getElementById('prov-cnt').textContent = provs.length;

    drawTopology(provs, health||[]);
    loadTokenSaverStats();
    document.getElementById('conn-badge').className = 'badge on';
    document.getElementById('conn-badge').innerHTML = '<span class="dot"></span> ' + ct('db.status.connected');
    document.getElementById('conn-badge-text').textContent = ct('db.status.connected');
    document.getElementById('conn-badge-text').className = 'val green';

    // Fetch OAuth status
    try {
      var oauthStatus = await apiFetch(API+'/admin/oauth/status');
      var ob = document.getElementById('oauth-badge');
      if (oauthStatus && oauthStatus.enabled) {
        ob.textContent = 'OAuth: ' + oauthStatus.provider;
        ob.style.color = 'var(--green)';
      } else {
        ob.textContent = 'OAuth: disabled';
        ob.style.color = 'var(--text-muted)';
      }
    } catch(e) { /* ignore */ }
  } catch(e) {
    document.getElementById('conn-badge').className = 'badge off';
    document.getElementById('conn-badge').innerHTML = '<span class="dot"></span> ' + ct('db.status.disconnected');
    document.getElementById('conn-badge-text').textContent = ct('db.status.disconnected');
    document.getElementById('conn-badge-text').className = 'val';
    document.getElementById('conn-badge-text').style.color = 'var(--red)';
  }
}

// ═══ TOPOLOGY ═══
function drawTopology(provs, health) {
  var canvas = document.getElementById('topo-canvas');
  if (!canvas) return;
  var ctx = canvas.getContext('2d');
  var W = canvas.parentElement.clientWidth;
  var H = canvas.parentElement.clientHeight - 48;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  var cx = W/2, cy = H/2;

  // Center node
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI*2);
  var grad = ctx.createRadialGradient(cx,cy,0,cx,cy,28);
  grad.addColorStop(0,'#84abff'); grad.addColorStop(1,'#5a7bff');
  ctx.fillStyle = grad; ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 11px Inter,sans-serif'; ctx.textAlign='center';
  ctx.fillText('8Router',cx,cy+4);

  var hMap = {};
  health.forEach(function(h){ hMap[h.providerId] = h });
  var n = provs.length;
  var radius = Math.min(W,H)/2 - 50;

  provs.forEach(function(p,i) {
    var angle = (i/n)*Math.PI*2 - Math.PI/2;
    var px = cx + Math.cos(angle)*radius;
    var py = cy + Math.sin(angle)*radius;
    var h = hMap[p.id];
    var ok = !h || h.healthy!==false;

    // Connection line
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(px,py);
    ctx.strokeStyle = ok ? 'rgba(0,210,148,0.3)' : 'rgba(255,101,104,0.3)';
    ctx.lineWidth = 2; ctx.stroke();

    // Animated dot
    var t = (Date.now()/2000 + i*0.3) % 1;
    var dx = cx + (px-cx)*t, dy = cy + (py-cy)*t;
    ctx.beginPath(); ctx.arc(dx,dy,3,0,Math.PI*2);
    ctx.fillStyle = ok ? '#00d294' : '#ff6568'; ctx.fill();

    // Provider node
    ctx.beginPath(); ctx.arc(px,py,18,0,Math.PI*2);
    ctx.fillStyle = ok ? 'rgba(0,210,148,0.1)' : 'rgba(255,101,104,0.1)'; ctx.fill();
    ctx.strokeStyle = ok ? '#00d294' : '#ff6568';
    ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle='#f2f2f2'; ctx.font='10px Inter,sans-serif'; ctx.textAlign='center';
    ctx.fillText(p.name,px,py+4);
  });
}

// ═══ USAGE ═══
async function loadUsage() {
  try {
    var range = '7d';
    var usage = await apiFetch(API+'/8router/api/usage/summary?range='+range);
    if (usage) {
      document.getElementById('u-req').textContent = (usage.totalRequests||0).toLocaleString();
      document.getElementById('u-input-tokens').textContent = (usage.totalInputTokens||0).toLocaleString();
      document.getElementById('u-output-tokens').textContent = (usage.totalOutputTokens||0).toLocaleString();
      document.getElementById('u-tokens').textContent = (usage.totalTokens||0).toLocaleString();
      document.getElementById('u-cost').textContent = usage.estimatedTotalCost != null ? '$'+usage.estimatedTotalCost.toFixed(6) : '$0.00';
      document.getElementById('u-latency').textContent = usage.averageLatencyMs != null ? usage.averageLatencyMs+'ms' : '0ms';
      document.getElementById('u-error-rate').textContent = (100 - (usage.successRate||0)).toFixed(1)+'%';
      document.getElementById('u-fb').textContent = (usage.fallbackCount||0).toLocaleString();
    }
    // Chart
    var tsData = await apiFetch(API+'/8router/api/usage/timeseries?range='+range+'&metric=requests&granularity=day');
    var chartEl = document.getElementById('daily-chart');
    if (chartEl && tsData && tsData.data && tsData.data.length) {
      var maxVal = Math.max.apply(null, tsData.data.map(function(d){ return d.value||0 }));
      if (maxVal === 0) maxVal = 1;
      chartEl.innerHTML = tsData.data.slice(-7).map(function(d) {
        var val = d.value||0;
        var h = Math.max(2, Math.round((val / maxVal) * 100));
        var day = d.timestamp ? d.timestamp.slice(5) : '';
        return '<div class="bar-col"><div class="bar-val">'+val+'</div><div class="bar" style="height:'+h+'px;background:var(--accent)"></div><div class="bar-label">'+day+'</div></div>';
      }).join('');
    } else if (chartEl) {
      chartEl.innerHTML = '<div style="padding:20px;text-align:center;color:var(--text-muted);font-size:12px;width:100%">No data yet — send requests through your /v1/chat/completions endpoint</div>';
    }
    // Breakdowns
    var provs = await apiFetch(API+'/8router/api/usage/providers?range='+range);
    var models = await apiFetch(API+'/8router/api/usage/models?range='+range);
    if (provs && provs.items && provs.items.length) document.getElementById('u-top-provider').textContent = provs.items[0].key;
    if (models && models.items && models.items.length) document.getElementById('u-top-model').textContent = models.items[0].key;
    // Recent requests
    var logs = await apiFetch(API+'/8router/api/logs/requests?pageSize=10');
    var recentEl = document.getElementById('recent-list');
    if (recentEl && logs && logs.items && logs.items.length) {
      recentEl.innerHTML = logs.items.map(function(log) {
        var sc = log.status==='success' ? 'color:var(--green)' : 'color:var(--red)';
        var ts = log.createdAt ? new Date(log.createdAt).toLocaleTimeString() : '--';
        var tokens = log.totalTokens ? log.totalTokens.toLocaleString() : '-';
        var latency = log.latencyMs ? log.latencyMs+'ms' : '-';
        return '<tr><td style="font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+ts+'</td><td style="font-family:Inter,sans-serif;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+(log.actualProvider||'-')+'</td><td style="font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border);color:var(--accent)">'+(log.actualModel||log.requestedModel||'-')+'</td><td style="text-align:right;font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+tokens+'</td><td style="text-align:right;font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+latency+'</td><td style="text-align:right;font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border);font-weight:600;'+sc+'">'+log.status+'</td></tr>';
      }).join('');
    }
  } catch(e) {}
}

// ═══ PROVIDERS ═══
async function loadProv() {
  try {
    var provs = await apiFetch(API+'/8router/providers');
    var health = [];
    try { health = await apiFetch(API+'/8router/health') || []; } catch(e) {}
    // Phase 2D: also fetch per-credential health from new endpoint
    var credHealth = [];
    try { var chResp = await apiFetch(API+'/8router/api/provider-health'); credHealth = (chResp && chResp.items) || []; } catch(e) {}
    var hMap = {};
    health.forEach(function(h){ hMap[h.providerId || h.id] = h });
    // Merge credential health
    var credMap = {};
    credHealth.forEach(function(ch){ credMap[ch.providerCredentialId || ch.id] = ch });
    document.getElementById('prov-tbody').innerHTML = provs.map(function(p) {
      var h = hMap[p.id] || hMap[p.name] || null;
      // Phase 2D: check credential health for circuit state
      var credKey = Object.keys(credMap).find(function(k) { return credMap[k].provider === p.id });
      var ch = credKey ? credMap[credKey] : null;
      var status = 'healthy';
      var statusLabel = ct('db.health.healthy');
      if (ch && ch.status) {
        status = ch.status;
        statusLabel = ct('db.health.' + ch.status) || ch.status;
        if (ch.circuitState === 'open') {
          status = 'down';
          statusLabel = ct('db.health.down') + ' (circuit)';
        }
      } else if (h) {
        if (h.healthy === false) { status = 'down'; statusLabel = ct('db.health.down'); }
        else if (h.degraded === true) { status = 'degraded'; statusLabel = ct('db.health.degraded'); }
        else if (h.disabled === true) { status = 'disabled'; statusLabel = ct('db.health.disabled'); }
      }
      var latency = ch ? (ch.averageLatencyMs || ch.lastLatencyMs || '-') : ((h && (h.latencyMs || h.latency || h.avgLatency)) || '-');
      if (typeof latency === 'number') latency = latency + 'ms';
      var lastError = ch ? (ch.lastErrorMessage || '') : ((h && (h.lastError || h.error)) || '');
      var lastErrorHtml = lastError ? '<span class="error-text" title="' + lastError.replace(/"/g,'&quot;') + '">' + lastError + '</span>' : '<span style="color:var(--text-muted)">\\u2014</span>';
      var circuitLabel = ch && ch.circuitState ? ' <span style="font-size:10px;color:var(--text-muted)">[' + ch.circuitState + ']</span>' : '';
      return '<tr><td style="font-family:Inter,sans-serif">'+provLogo(p.id)+'<strong>'+p.name+'</strong> <span style="color:var(--text-muted);font-size:11px">('+p.id+')</span></td>' +
      '<td><span class="badge '+p.tier+'">'+p.tier+'</span></td>' +
      '<td><span class="health-badge '+status+'"><span class="health-dot"></span> '+statusLabel+'</span>'+circuitLabel+'</td>' +
      '<td><span class="latency-text">'+latency+'</span></td>' +
      '<td>'+(p.apiKeys?p.apiKeys.length:1)+' keys</td>' +
      '<td>'+(p.totalRequests||0).toLocaleString()+'</td>' +
      '<td>'+(p.totalTokens||0).toLocaleString()+'</td>' +
      '<td style="color:var(--red)">'+(p.errors||0)+'</td>' +
      '<td>'+lastErrorHtml+'</td>' +
      '<td><button class="test-btn" onclick="testProvider(this,\\\\''+p.id+'\\\\')">Test</button>' +
      (credKey ? ' <button class="test-btn" style="margin-left:4px;font-size:10px" onclick="resetHealth(\\\\''+credKey+'\\\\')">Reset</button>' : '') +
      '</td></tr>';
    }).join('');
  } catch(e) {}
}

async function testProvider(btn, providerId) {
  btn.disabled = true;
  btn.className = 'test-btn testing';
  btn.textContent = ct('db.btn.testing');
  try {
    var resp = await fetch(API+'/8router/connections/' + encodeURIComponent(providerId) + '/test', { method: 'POST' });
    var result = await resp.json();
    if (result.ok || result.success || result.healthy) {
      btn.textContent = ct('db.btn.ok');
      btn.style.color = 'var(--green)';
      btn.style.borderColor = 'var(--green)';
    } else {
      btn.textContent = ct('db.btn.fail');
      btn.style.color = 'var(--red)';
      btn.style.borderColor = 'var(--red)';
    }
  } catch(e) {
    btn.textContent = ct('db.btn.error');
    btn.style.color = 'var(--red)';
    btn.style.borderColor = 'var(--red)';
  }
  btn.disabled = false;
  setTimeout(function(){ btn.className = 'test-btn'; btn.textContent = ct('db.btn.test'); btn.style.color = ''; btn.style.borderColor = ''; }, 3000);
}

// Phase 2D: Reset health for a provider credential
async function resetHealth(credentialId) {
  try {
    await fetch(API+'/8router/api/provider-health/' + encodeURIComponent(credentialId) + '/reset', { method: 'POST' });
    loadProv(); // Refresh table
  } catch(e) { alert('Reset failed'); }
}

// ═══ COMBOS ═══
async function loadCombos() {
  try {
    var combos = await apiFetch(API+'/8router/combos');
    document.getElementById('combo-cards').innerHTML = combos.map(function(c) {
      return '<div class="combo-card">' +
        '<div class="accent-bar"></div>' +
        '<h4><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>'+c.name+'</h4>' +
        '<div class="desc">'+c.description+'</div>' +
        c.tiers.map(function(t,i) {
          return '<div class="combo-tier">' +
            '<div class="step">'+(i+1)+'</div>' +
            '<span class="provider-name">'+provLogo(t.provider, 16)+t.provider+'</span>' +
            '<span class="arrow">\u2192</span>' +
            '<span class="model-name">'+t.model+'</span>' +
          '</div>';
        }).join('') +
      '</div>';
    }).join('');
  } catch(e) {}
}

// ═══ QUOTA ═══
async function loadQuota() {
  try {
    var provs = await apiFetch(API+'/8router/providers');
    var stats = null;
    try {
      var sr = await fetch(API+'/8router/stats');
      if (sr.ok) stats = await sr.json();
    } catch(e) {}
    
    var s = (stats && stats.session) || stats || {};
    var at = (stats && stats.allTime) || {};
    
    // Load saved budget limits
    var budget = null;
    try {
      var br = await fetch(API+'/8router/settings');
      if (br.ok) budget = await br.json();
    } catch(e) {}
    
    if (budget && budget.budget) {
      var b = budget.budget;
      if (document.getElementById('budget-daily-req')) document.getElementById('budget-daily-req').value = b.dailyRequests || '';
      if (document.getElementById('budget-monthly-req')) document.getElementById('budget-monthly-req').value = b.monthlyRequests || '';
      if (document.getElementById('budget-daily-tokens')) document.getElementById('budget-daily-tokens').value = b.dailyTokens || '';
      if (document.getElementById('budget-daily-cost')) document.getElementById('budget-daily-cost').value = b.dailyCost || '';
      if (document.getElementById('budget-monthly-cost')) document.getElementById('budget-monthly-cost').value = b.monthlyCost || '';
    }
    
    document.getElementById('quota-grid').innerHTML = provs.map(function(p) {
      var reqs = p.totalRequests || 0;
      var tokens = p.totalTokens || 0;
      var errors = p.errors || 0;
      var max = 1000;
      var pct = Math.min(100, Math.round(reqs / max * 100));
      var color = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--yellow)' : 'var(--green)';
      var statusClass = pct > 80 ? 'danger' : pct > 50 ? 'warn' : 'ok';
      var statusText = pct > 80 ? ct('db.health.critical') : pct > 50 ? ct('db.health.warning') : ct('db.health.healthy');
      var cardClass = pct > 80 ? 'danger' : pct > 50 ? 'warn' : '';
      
      return '<div class="quota-card ' + cardClass + '">' +
        '<div class="name">' + provLogo(p.id, 16) + '<span class="badge ' + p.tier + '">' + p.tier + '</span> ' + p.name +
        ' <span class="status-badge ' + statusClass + '">\\u25cf ' + statusText + '</span></div>' +
        '<div class="quota-bar"><div class="quota-fill" style="width:' + pct + '%;background:' + color + '"></div></div>' +
        '<div class="quota-info"><span>' + reqs.toLocaleString() + ' ' + ct('db.quota.requests') + '</span><span>' + tokens.toLocaleString() + ' ' + ct('db.quota.tokens') + '</span><span>' + pct + '%</span></div>' +
        '<div style="display:flex;justify-content:space-between;margin-top:8px;font-size:11px;font-family:JetBrains Mono,monospace;color:var(--text-muted)">' +
          '<span>' + ct('db.quota.errors') + ' <span style="color:' + (errors > 0 ? 'var(--red)' : 'var(--text-muted)') + '">' + errors + '</span></span>' +
          '<span>' + ct('db.quota.remaining') + ' ' + Math.max(0, max - reqs).toLocaleString() + '</span>' +
        '</div>' +
        '<div class="quota-reset">\\u21bb ' + ct('db.quota.resets') + '</div></div>';
    }).join('');
  } catch(e) {}
}

async function saveBudget() {
  var payload = {
    budget: {
      dailyRequests: parseInt(document.getElementById('budget-daily-req').value) || 0,
      monthlyRequests: parseInt(document.getElementById('budget-monthly-req').value) || 0,
      dailyTokens: parseInt(document.getElementById('budget-daily-tokens').value) || 0,
      dailyCost: parseFloat(document.getElementById('budget-daily-cost').value) || 0,
      monthlyCost: parseFloat(document.getElementById('budget-monthly-cost').value) || 0
    }
  };
  try {
    await fetch(API+'/8router/settings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
    alert(ct('db.budget.saved'));
  } catch(e) {
    alert(ct('db.budget.failed'));
  }
}

// ═══ CONNECTIONS ═══
async function loadConns() {
  try {
    var resp = await fetch(API+'/8router/connections');
    if (!resp.ok) {
      document.getElementById('conn-tbody').innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--text-muted);padding:40px;font-family:Inter,sans-serif">' + ct('db.conn.noConns') + '</td></tr>';
      return;
    }
    var c = await resp.json();
    if (!c || !c.length) {
      document.getElementById('conn-tbody').innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--text-muted);padding:40px;font-family:Inter,sans-serif">' + ct('db.conn.noConns') + '</td></tr>';
      return;
    }
    var health = [];
    try { health = await apiFetch(API+'/8router/health') || []; } catch(e) {}
    var hMap = {};
    health.forEach(function(h){ hMap[h.providerId || h.id] = h });

    document.getElementById('conn-tbody').innerHTML = c.map(function(x) {
      var h = hMap[x.provider] || hMap[x.providerId] || null;
      var statusLabel = (x.testStatus || 'healthy');
      var statusCls = 'healthy';
      if (statusLabel === 'down' || statusLabel === 'error') statusCls = 'down';
      else if (statusLabel === 'degraded') statusCls = 'degraded';
      else if (statusLabel === 'disabled') statusCls = 'disabled';

      var healthLabel = 'Healthy';
      var healthCls = 'healthy';
      if (h) {
        if (h.healthy === false) { healthLabel = ct('db.health.down'); healthCls = 'down'; }
        else if (h.degraded === true) { healthLabel = ct('db.health.degraded'); healthCls = 'degraded'; }
        else if (h.disabled === true) { healthLabel = ct('db.health.disabled'); healthCls = 'disabled'; }
      }

      var backoffLevel = x.backoffLevel || 0;
      var backoffHtml = backoffLevel > 0 ? '<span style="color:var(--yellow)">L'+backoffLevel+'</span>' : '\u2014';
      var retryCount = x.retryCount || x.consecutiveFailures || 0;
      var nextRetry = '';
      if (backoffLevel > 0 && x.nextRetryAt) {
        var nr = new Date(x.nextRetryAt);
        nextRetry = nr.toLocaleTimeString();
      } else if (backoffLevel > 0) {
        nextRetry = ct('db.conn.now');
      } else {
        nextRetry = '\u2014';
      }

      return '<tr><td style="font-size:11px">'+x.id.slice(0,12)+'\u2026</td>' +
      '<td style="font-family:Inter,sans-serif">'+provLogo(x.provider || x.providerId || '', 16)+x.provider+'</td><td>'+(x.name||'-')+'</td><td>'+x.authType+'</td>' +
      '<td><span class="health-badge '+statusCls+'"><span class="health-dot"></span> '+statusLabel+'</span></td>' +
      '<td><span class="health-badge '+healthCls+'"><span class="health-dot"></span> '+healthLabel+'</span></td>' +
      '<td>'+backoffHtml+'</td>' +
      '<td>'+(retryCount > 0 ? '<span style="color:var(--orange)">'+retryCount+'</span>' : '0')+'</td>' +
      '<td style="font-family:JetBrains Mono,monospace;font-size:11px">'+nextRetry+'</td>' +
      '<td>'+(x.totalRequests||0)+'</td><td>'+(x.totalTokens||0).toLocaleString()+'</td>' +
      '<td style="color:var(--green)">$'+(x.totalCost||0).toFixed(4)+'</td>' +
      '<td><button class="test-btn" onclick="testConnection(this,\\''+x.id+'\\')">Test</button></td></tr>';
    }).join('');
  } catch(e) {
    document.getElementById('conn-tbody').innerHTML = '<tr><td colspan="13" style="text-align:center;color:var(--text-muted);padding:40px;font-family:Inter,sans-serif">' + ct('db.conn.loadFailed') + '</td></tr>';
  }
}

async function testConnection(btn, connId) {
  btn.disabled = true;
  btn.className = 'test-btn testing';
  btn.textContent = ct('db.btn.testing');
  try {
    var resp = await fetch(API+'/8router/connections/' + encodeURIComponent(connId) + '/test', { method: 'POST' });
    var result = await resp.json();
    if (result.ok || result.success || result.healthy) {
      btn.textContent = ct('db.btn.ok');
      btn.style.color = 'var(--green)';
      btn.style.borderColor = 'var(--green)';
    } else {
      btn.textContent = ct('db.btn.fail');
      btn.style.color = 'var(--red)';
      btn.style.borderColor = 'var(--red)';
    }
  } catch(e) {
    btn.textContent = ct('db.btn.error');
    btn.style.color = 'var(--red)';
    btn.style.borderColor = 'var(--red)';
  }
  btn.disabled = false;
  setTimeout(function(){ btn.className = 'test-btn'; btn.textContent = ct('db.btn.test'); btn.style.color = ''; btn.style.borderColor = ''; }, 3000);
}

async function testAllConns() {
  var btns = document.querySelectorAll('#conn-tbody .test-btn');
  btns.forEach(function(btn) { btn.click(); });
}

// ═══ SETTINGS ═══
async function loadSettings() {
  try {
    var settings = null;
    try {
      var sr = await fetch(API+'/8router/settings');
      if (sr.ok) settings = await sr.json();
    } catch(e) {}

    // Sync toggles with backend settings if available
    if (settings) {
      var toggles = {
        't-rtk': settings.rtkCompression !== false,
        't-circuit': settings.circuitBreaker !== false,
        't-stream': settings.sseStreaming !== false,
        't-rotation': settings.multiKeyRotation !== false,
        't-fallback': settings.autoFallback !== false
      };
      Object.keys(toggles).forEach(function(id) {
        var el = document.getElementById(id);
        if (el) {
          if (toggles[id]) el.classList.add('on'); else el.classList.remove('on');
          el.setAttribute('data-setting', id.replace('t-',''));
          el.onclick = function() {
            this.classList.toggle('on');
            var key = this.getAttribute('data-setting');
            var val = this.classList.contains('on');
            var payload = {}; payload[key] = val;
            fetch(API+'/8router/settings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).catch(function(){});
          };
        }
      });
      
      // Sync new settings controls
      var compressionEl = document.getElementById('s-compression-mode');
      if (compressionEl && settings.compressionMode) compressionEl.value = settings.compressionMode;
      var modelEl = document.getElementById('s-default-model');
      if (modelEl && settings.defaultModel) modelEl.value = settings.defaultModel;
      var timeoutEl = document.getElementById('s-fallback-timeout');
      if (timeoutEl && settings.fallbackTimeout) timeoutEl.value = settings.fallbackTimeout;
      var logEl = document.getElementById('s-log-level');
      if (logEl && settings.logLevel) logEl.value = settings.logLevel;
    } else {
      // Backend pending - mark toggles with data attrs for future use
      ['t-rtk','t-circuit','t-stream','t-rotation','t-fallback'].forEach(function(id) {
        var el = document.getElementById(id);
        if (el && !el.getAttribute('data-setting')) {
          el.setAttribute('data-setting', id.replace('t-',''));
          el.onclick = function() {
            this.classList.toggle('on');
          };
        }
      });
    }

    var info = await apiFetch(API+'/8router/info');
    var infoHtml =
      '<tr><td style="color:var(--text-muted);width:140px;font-family:Inter,sans-serif">'+ct('db.col.name')+'</td><td>'+info.name+'</td></tr>' +
      '<tr><td style="color:var(--text-muted);font-family:Inter,sans-serif">Version</td><td>'+info.version+'</td></tr>' +
      '<tr><td style="color:var(--text-muted);font-family:Inter,sans-serif">'+ct('db.settings.description')+'</td><td>'+info.description+'</td></tr>' +
      '<tr><td style="color:var(--text-muted);font-family:Inter,sans-serif">'+ct('db.settings.features')+'</td><td>'+info.features.join(', ')+'</td></tr>' +
      (settings ? '' : '<tr><td style="color:var(--yellow);font-family:Inter,sans-serif">'+ct('db.settings.settingsApi')+'</td><td style="color:var(--yellow)">'+ct('db.settings.backendPending')+'</td></tr>');
    document.getElementById('sysinfo-tbody').innerHTML = infoHtml;
  } catch(e) {}
}
// ═══ CLI TOOLS ═══
var cliTools = [
  {id:'cursor', name:'Cursor', desc:'AI-first code editor', color:'#f2f2f2', icon:'<svg viewBox="0 0 24 24" fill="currentColor"><polygon points="4 4 12 20 14 14 20 12 4 4"/></svg>', status:'supported'},
  {id:'cline', name:'Cline', desc:'AI coding assistant for VS Code', color:'#8b5cf6', icon:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="11" font-weight="bold" fill="#fff">C</text></svg>', status:'supported'},
  {id:'continue', name:'Continue', desc:'Open-source AI code assistant', color:'#00d294', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="1 4 1 10 7 10"/><path d="M3.51 15a9 9 0 1 0 2.13-9.36L1 10"/></svg>', status:'supported'},
  {id:'roo-code', name:'Roo Code', desc:'AI coding assistant', color:'#ff6568', icon:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="8" r="4"/><path d="M6 20c0-3.3 2.7-6 6-6s6 2.7 6 6"/></svg>', status:'supported'},
  {id:'openwebui', name:'Open WebUI', desc:'Self-hosted LLM interface', color:'#10a37f', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><line x1="8" y1="21" x2="16" y2="21"/><line x1="12" y1="17" x2="12" y2="21"/></svg>', status:'supported'},
  {id:'claude-code', name:'Claude Code', desc:'Anthropic CLI (experimental)', color:'#e87040', icon:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><path d="M8 12l3 3 5-5" stroke="#fff" stroke-width="2" fill="none"/></svg>', status:'experimental'},
  {id:'codex', name:'Codex CLI', desc:'OpenAI-compatible CLI (experimental)', color:'#10a37f', icon:'<svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="10"/><text x="12" y="16" text-anchor="middle" font-size="12" font-weight="bold" fill="#fff">C</text></svg>', status:'experimental'},
  {id:'aider', name:'Aider', desc:'AI pair programming (experimental)', color:'#84abff', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>', status:'experimental'},
  {id:'openai-sdk', name:'OpenAI SDK', desc:'Python & Node.js SDK', color:'#f2f2f2', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>', status:'supported'},
  {id:'curl', name:'cURL', desc:'Command-line HTTP client', color:'#eab308', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="4 17 10 11 4 5"/><line x1="12" x2="20" y1="19" y2="19"/></svg>', status:'supported'},
  {id:'librechat', name:'LibreChat', desc:'Multi-model ChatGPT clone', color:'#8a8f9c', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="5" y="2" width="14" height="20" rx="3"/><circle cx="10" cy="10" r="1.5" fill="currentColor"/><circle cx="14" cy="10" r="1.5" fill="currentColor"/></svg>', status:'coming_soon'},
  {id:'lobechat', name:'LobeChat', desc:'Modern ChatGPT UI framework', color:'#8a8f9c', icon:'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9"/><line x1="15" y1="9" x2="15.01" y2="9"/></svg>', status:'coming_soon'}
];

var cliSetupTool = null;
var cliSetupEnv = 'hosted';
var cliSetupKey = '';
var cliSetupModel = '8router/auto';
var cliTestResult = null;

async function loadCliTools() {
  var grid = document.getElementById('cli-grid');
  grid.innerHTML = cliTools.map(function(tool) {
    var badgeColor = tool.status === 'supported' ? 'var(--green)' : tool.status === 'experimental' ? 'var(--accent)' : 'var(--text-muted)';
    var badgeText = tool.status === 'supported' ? ct('db.cli.supported') : tool.status === 'experimental' ? ct('db.cli.experimental') : ct('db.cli.comingSoon');
    return '<div class="cli-card" onclick="handleCliClick(\\'' + tool.id + '\\')">' +
      '<div class="cli-card-inner">' +
        '<div class="cli-logo" style="background:' + tool.color + '20;color:' + tool.color + '">' + tool.icon + '</div>' +
        '<div class="cli-info">' +
          '<div class="cli-name">' + tool.name + '</div>' +
          '<div class="cli-desc">' + tool.desc + '</div>' +
          '<div class="cli-status" style="color:' + badgeColor + '">' + badgeText + '</div>' +
        '</div>' +
        '<div class="cli-arrow"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>' +
      '</div>' +
    '</div>';
  }).join('');

  // Add setup builder panel below if a tool is selected
  if (cliSetupTool) {
    grid.innerHTML += renderSetupBuilder();
  }
}

function handleCliClick(id) {
  cliSetupTool = id;
  cliTestResult = null;
  loadCliTools();
}

function closeSetupBuilder() {
  cliSetupTool = null;
  cliTestResult = null;
  loadCliTools();
}

function renderSetupBuilder() {
  var tool = cliTools.find(function(t) { return t.id === cliSetupTool; });
  if (!tool) return '';
  var isSupported = tool.status !== 'coming_soon';
  var baseUrl = cliSetupEnv === 'hosted' ? 'https://8router.8agents.xyz/v1' : cliSetupEnv === 'local' ? 'http://localhost:8081/v1' : '';
  var badgeColor = tool.status === 'supported' ? 'var(--green)' : tool.status === 'experimental' ? 'var(--accent)' : 'var(--text-muted)';

  var html = '<div style="margin-top:24px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:16px;padding:32px">';
  html += '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:24px">';
  html += '<div style="display:flex;align-items:center;gap:12px">';
  html += '<div class="cli-logo" style="background:' + tool.color + '20;color:' + tool.color + '">' + tool.icon + '</div>';
  html += '<div>';
  html += '<div style="font-size:18px;font-weight:700">' + tool.name + '</div>';
  html += '<div style="font-size:12px;color:' + badgeColor + '">' + (tool.status === 'supported' ? ct('db.cli.supported') : tool.status === 'experimental' ? ct('db.cli.experimental') : ct('db.cli.comingSoon')) + '</div>';
  html += '</div></div>';
  html += '<button onclick="closeSetupBuilder()" style="background:none;border:1px solid var(--border);border-radius:8px;padding:8px 16px;color:var(--text);cursor:pointer;font-size:12px">✕ ' + ct('db.btn.close') + '</button>';
  html += '</div>';

  if (!isSupported) {
    html += '<div style="text-align:center;padding:40px;color:var(--text-muted)">' + ct('db.cli.comingSoonMsg') + '</div></div>';
    return html;
  }

  // Step 1 — Environment
  html += '<div style="margin-bottom:20px">';
  html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text)">' + ct('db.cli.step1Title') + '</div>';
  html += '<div style="display:flex;gap:8px">';
  [{v:'h',l:'Hosted'},{v:'l',l:'Local'},{v:'c',l:'Custom'}].forEach(function(e) {
    var active = (e.v === 'h' && cliSetupEnv==='hosted') || (e.v === 'l' && cliSetupEnv==='local') || (e.v === 'c' && cliSetupEnv==='custom');
    html += '<button onclick="cliSetupEnv=\''+(e.v==='h'?'hosted':e.v==='l'?'local':'custom')+'\';loadCliTools()" style="padding:8px 16px;border-radius:8px;border:1px solid '+(active?'var(--accent)':'var(--border)')+';background:'+(active?'var(--accent)':'transparent')+';color:'+(active?'#fff':'var(--text)')+';cursor:pointer;font-size:12px">'+e.l+'</button>';
  });
  html += '</div>';
  if (cliSetupEnv === 'custom') {
    html += '<input id="cli-custom-url" type="text" placeholder="https://your-endpoint.com/v1" value="'+baseUrl+'" style="margin-top:8px;width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:13px;font-family:monospace">';
  }
  html += '</div>';

  // Step 2 — Access Key
  html += '<div style="margin-bottom:20px">';
  html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text)">' + ct('db.cli.step2Title') + '</div>';
  html += '<input id="cli-api-key" type="password" placeholder="sk-8router_..." style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:13px;font-family:monospace">';
  html += '<div style="margin-top:6px;font-size:11px;color:var(--text-muted)">' + ct('db.cli.keyWarning') + '</div>';
  html += '</div>';

  // Step 3 — Model
  html += '<div style="margin-bottom:20px">';
  html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text)">' + ct('db.cli.step3Title') + '</div>';
  html += '<select id="cli-model-select" onchange="cliSetupModel=this.value" style="width:100%;padding:10px 14px;border-radius:8px;border:1px solid var(--border);background:var(--bg);color:var(--text);font-size:13px">';
  var groups = {General:['8router/auto','8router/smart','8router/fast','8router/cheap'],Specialized:['8router/coding','8router/creative'],'Local':['8router/local','8router/privacy']};
  Object.keys(groups).forEach(function(g) {
    html += '<optgroup label="'+g+'">';
    groups[g].forEach(function(m) {
      html += '<option value="'+m+'"'+(m===cliSetupModel?' selected':'')+'>'+m+'</option>';
    });
    html += '</optgroup>';
  });
  html += '</select></div>';

  // Step 4 — Generated Config
  baseUrl = cliSetupEnv === 'custom' ? (document.getElementById('cli-custom-url') ? document.getElementById('cli-custom-url').value : baseUrl) : baseUrl;
  html += '<div style="margin-bottom:20px">';
  html += '<div style="font-size:13px;font-weight:600;margin-bottom:8px;color:var(--text)">' + ct('db.cli.step4Title') + '</div>';

  var config = generateConfig(tool.id, baseUrl, cliSetupModel);
  html += '<div style="position:relative">';
  html += '<pre style="background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:16px;font-size:12px;font-family:monospace;overflow-x:auto;white-space:pre-wrap;word-break:break-all;color:var(--text)">' + escapeHtml(config) + '</pre>';
  html += '<button onclick="copyCliConfig()" style="position:absolute;top:8px;right:8px;padding:6px 12px;background:var(--accent);border:none;border-radius:6px;color:#fff;font-size:11px;cursor:pointer;font-weight:600">' + ct('db.btn.copy') + '</button>';
  html += '</div></div>';

  // Test Connection
  html += '<div style="display:flex;gap:8px;align-items:center">';
  html += '<button onclick="testCliConnection()" style="padding:10px 20px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:13px;cursor:pointer;font-weight:600">' + ct('db.cli.testConnection') + '</button>';
  if (cliTestResult) {
    var ok = cliTestResult.success;
    html += '<div style="display:flex;align-items:center;gap:6px;font-size:12px;color:'+(ok?'var(--green)':'var(--red)')+'">';
    html += ok ? '✓ ' + ct('db.cli.connected') : '✗ ' + (cliTestResult.error || ct('db.cli.testFailed'));
    if (cliTestResult.latencyMs) html += ' (' + cliTestResult.latencyMs + 'ms)';
    html += '</div>';
  }
  html += '</div>';

  // Security note
  html += '<div style="margin-top:16px;padding:12px;border-radius:8px;background:var(--bg);border:1px solid var(--border);font-size:11px;color:var(--text-muted)">';
  html += '🔒 ' + ct('db.cli.securityNote');
  html += '</div>';

  html += '</div>';
  return html;
}

function generateConfig(toolId, baseUrl, model) {
  var configs = {
    'curl': 'curl ' + baseUrl + '/chat/completions \\\n  -H \'Authorization: Bearer <YOUR_KEY>\' \\\n  -H \'Content-Type: application/json\' \\\n  -d \'{"model":"' + model + '","messages":[{"role":"user","content":"Hello from 8Router"}]}\'',
    'openai-sdk': 'import OpenAI from \'openai\';\n\nconst client = new OpenAI({\n  baseURL: \''+baseUrl+'\',\n  apiKey: \'<YOUR_KEY>\',\n});\n\nconst r = await client.chat.completions.create({\n  model: \''+model+'\',\n  messages: [{role:\'user\', content:\'Hello from 8Router\'}],\n});\nconsole.log(r.choices[0].message.content);',
    'continue': '{\n  "models": [{\n    "title": "8Router ' + model + '",\n    "provider": "openai",\n    "model": "' + model + '",\n    "apiBase": "' + baseUrl + '",\n    "apiKey": "<YOUR_KEY>"\n  }]\n}',
    'env-file': 'EIGHTROUTER_BASE_URL=' + baseUrl + '\nEIGHTROUTER_API_KEY=<YOUR_KEY>\nEIGHTROUTER_MODEL=' + model,
  };
  if (configs[toolId]) return configs[toolId];
  return ct('db.cli.configDesc') + '\n\nBase URL: ' + baseUrl + '\nAPI Key: <YOUR_KEY>\nModel: ' + model;
}

function copyCliConfig() {
  var el = document.querySelector('#cli-grid pre');
  if (el) {
    navigator.clipboard.writeText(el.textContent).then(function() {
      alert(ct('db.cli.copied'));
    }).catch(function() {
      alert(ct('db.cli.copyFailed'));
    });
  }
}

async function testCliConnection() {
  var apiKey = document.getElementById('cli-api-key');
  var keyVal = apiKey ? apiKey.value : '';
  if (!keyVal) { alert(ct('db.cli.enterKey')); return; }
  var baseUrl = cliSetupEnv === 'custom' ? (document.getElementById('cli-custom-url') ? document.getElementById('cli-custom-url').value : '') : (cliSetupEnv === 'hosted' ? 'https://8router.8agents.xyz/v1' : 'http://localhost:8081/v1');

  cliTestResult = { success: false, error: ct('db.cli.testing') };
  loadCliTools();

  try {
    var resp = await fetch(API + '/8router/api/integrations/test', {
      method: 'POST',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({ baseUrl: baseUrl, apiKey: keyVal, model: cliSetupModel, testType: 'models' })
    });
    cliTestResult = await resp.json();
  } catch(e) {
    cliTestResult = { success: false, error: ct('db.cli.testFailed') };
  }
  loadCliTools();
}

function escapeHtml(s) {
  return s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

// ═══ LOGS ═══
async function loadLogs() {
  var panel = document.getElementById('logs-panel');
  try {
    var data = await apiFetch(API+'/8router/api/logs/requests?pageSize=50');
    if (!data || !data.items || !data.items.length) {
      panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">'+ct('db.logs.noLogs')+'</div>';
      return;
    }
    var html = '<div style="margin-bottom:12px;font-size:11px;color:var(--text-muted)">'+(data.pagination.total||0)+' requests</div>';
    html += '<table style="width:100%"><thead><tr><th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);font-weight:700;background:var(--bg-secondary)">'+ct('db.col.timestamp')+'</th><th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);font-weight:700;background:var(--bg-secondary)">Status</th><th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);font-weight:700;background:var(--bg-secondary)">'+ct('db.col.provider')+'</th><th style="padding:8px 12px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);font-weight:700;background:var(--bg-secondary)">'+ct('db.col.model')+'</th><th style="padding:8px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);font-weight:700;background:var(--bg-secondary)">Tokens</th><th style="padding:8px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);font-weight:700;background:var(--bg-secondary)">Cost</th><th style="padding:8px 12px;text-align:right;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);font-weight:700;background:var(--bg-secondary)">'+ct('db.col.latency')+'</th><th style="padding:8px 12px;text-align:center;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--text-muted);font-weight:700;background:var(--bg-secondary)">FB</th></tr></thead><tbody>';
    data.items.forEach(function(log) {
      var sc = log.status==='success' ? 'color:var(--green)' : 'color:var(--red)';
      var ts = log.createdAt ? new Date(log.createdAt).toLocaleString() : '--';
      var tokens = log.totalTokens ? log.totalTokens.toLocaleString() : '-';
      var cost = log.estimatedTotalCost != null ? '$'+log.estimatedTotalCost.toFixed(6) : '-';
      var latency = log.latencyMs ? log.latencyMs+'ms' : '-';
      var fb = log.hadFallback ? '<span style="color:var(--yellow)">'+(log.fallbackCount||0)+'</span>' : '-';
      html += '<tr style="cursor:pointer" onclick="showRequestDetail(\\\\''+log.id+'\\\\')"><td style="font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+ts+'</td><td style="font-size:12px;padding:8px 12px;border-top:1px solid var(--border);font-weight:600;'+sc+'">'+log.status+'</td><td style="font-family:Inter,sans-serif;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+(log.actualProvider||'-')+'</td><td style="font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border);color:var(--accent)">'+(log.actualModel||log.requestedModel||'-')+'</td><td style="text-align:right;font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+tokens+'</td><td style="text-align:right;font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+cost+'</td><td style="text-align:right;font-family:JetBrains Mono,monospace;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+latency+'</td><td style="text-align:center;font-size:12px;padding:8px 12px;border-top:1px solid var(--border)">'+fb+'</td></tr>';
    });
    html += '</tbody></table>';
    panel.innerHTML = html;
  } catch(e) {
    panel.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">'+ct('db.logs.loadFailed')+'</div>';
  }
}

async function showRequestDetail(requestId) {
  var panel = document.getElementById('logs-panel');
  try {
    var detail = await apiFetch(API+'/8router/api/logs/requests/'+encodeURIComponent(requestId));
    if (!detail || !detail.log) { alert('Request not found'); return; }
    var log = detail.log;
    var attempts = detail.attempts || [];
    var html = '<div style="margin-bottom:16px"><button onclick="loadLogs()" style="padding:6px 12px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;color:var(--text);cursor:pointer;font-size:11px">← Back to Logs</button></div>';
    html += '<div class="card" style="margin-bottom:16px"><div class="card-header"><h3>Request Detail</h3></div><div style="padding:16px">';
    var fields = [
      ['ID', log.id], ['Time', log.createdAt], ['Status', log.status],
      ['Provider', log.actualProvider||'-'], ['Model', log.actualModel||log.requestedModel||'-'],
      ['Alias', log.requestedAlias||'-'], ['Access Key', log.accessKeyName||log.accessKeyId||'-'],
      ['Latency', log.latencyMs ? log.latencyMs+'ms' : '-'], ['HTTP Status', log.httpStatus||'-'],
      ['Input Tokens', log.inputTokens||'-'], ['Output Tokens', log.outputTokens||'-'],
      ['Total Tokens', log.totalTokens||'-'], ['Estimated Cost', log.estimatedTotalCost != null ? '$'+log.estimatedTotalCost.toFixed(6) : '-'],
      ['Fallback Count', log.fallbackCount||'0'], ['Attempts', log.attemptCount||attempts.length||'1'],
      ['Error Type', log.errorType||'-'], ['Error', log.errorMessage||'-'],
      ['Circuit State', log.circuitState||'-'], ['Provider Health', log.providerHealthStatus||'-'],
      ['Streaming', log.streaming ? 'Yes' : 'No'], ['Endpoint', log.endpoint||'-'],
    ];
    html += fields.map(function(f) {
      return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)"><span style="color:var(--text-muted);font-size:11px">'+f[0]+'</span><span style="font-size:11px;font-family:JetBrains Mono,monospace">'+f[1]+'</span></div>';
    }).join('');
    html += '</div></div>';
    if (attempts.length) {
      html += '<div class="card"><div class="card-header"><h3>Attempts ('+attempts.length+')</h3></div><div style="padding:16px">';
      html += '<table style="width:100%"><thead><tr><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted)">#</th><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted)">Provider</th><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted)">Model</th><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted)">Status</th><th style="padding:6px 10px;text-align:right;font-size:10px;color:var(--text-muted)">Latency</th><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted)">Error Type</th><th style="padding:6px 10px;text-align:left;font-size:10px;color:var(--text-muted)">Circuit</th></tr></thead><tbody>';
      attempts.forEach(function(a) {
        var sc = a.status==='success' ? 'color:var(--green)' : 'color:var(--red)';
        html += '<tr><td style="padding:6px 10px;font-size:11px">'+a.attemptIndex+'</td><td style="padding:6px 10px;font-size:11px">'+a.provider+'</td><td style="padding:6px 10px;font-size:11px;color:var(--accent)">'+a.model+'</td><td style="padding:6px 10px;font-size:11px;font-weight:600;'+sc+'">'+a.status+'</td><td style="padding:6px 10px;font-size:11px;text-align:right">'+(a.latencyMs||'-')+'ms</td><td style="padding:6px 10px;font-size:11px">'+(a.failureType||'-')+'</td><td style="padding:6px 10px;font-size:11px">'+(a.circuitStateBefore||'-')+'</td></tr>';
      });
      html += '</tbody></table></div></div>';
    }
    panel.innerHTML = html;
  } catch(e) { alert('Failed to load request detail'); }
}

// ═══ API KEYS ═══
async function loadApiKeys() {
  try {
    var resp = await fetch(API+'/8router/api-keys');
    if (!resp.ok) {
      document.getElementById('apikey-tbody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;font-family:Inter,sans-serif">' + ct('db.keys.createFailed') + '</td></tr>';
      return;
    }
    var keys = await resp.json();
    if (!keys || !keys.length) {
      document.getElementById('apikey-tbody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;font-family:Inter,sans-serif">' + ct('db.keys.createFailed') + '</td></tr>';
      return;
    }
    document.getElementById('apikey-tbody').innerHTML = keys.map(function(k) {
      var displayKey = k.key || k.apiKey || k.id;
      if (displayKey && displayKey.length > 16) displayKey = displayKey.slice(0,12) + '\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022';
      var created = k.createdAt ? new Date(k.createdAt).toLocaleDateString() : '-';
      var lastUsed = k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : ct('db.keys.never');
      var active = k.active !== false;
      return '<tr><td style="font-family:JetBrains Mono,monospace;font-size:12px">'+displayKey+'</td>' +
        '<td style="font-family:Inter,sans-serif">'+(k.name||ct('db.keys.unnamed'))+'</td>' +
        '<td>'+created+'</td>' +
        '<td>'+lastUsed+'</td>' +
        '<td>'+(k.requests||0)+'</td>' +
        '<td><span class="badge '+(active?'healthy':'unhealthy')+'">'+(active?ct('db.keys.active'):ct('db.keys.revoked'))+'</span></td>' +
        '<td>'+(active?'<button style="padding:4px 10px;border-radius:6px;border:1px solid var(--red);background:transparent;color:var(--red);font-size:11px;font-weight:600;cursor:pointer;transition:all 0.15s" onclick="revokeApiKey(\\\''+(k.id||k.key)+'\\\')">'+ct('db.btn.revoke')+'</button>':'')+'</td></tr>';
    }).join('');
  } catch(e) {
    document.getElementById('apikey-tbody').innerHTML = '<tr><td colspan="7" style="text-align:center;color:var(--text-muted);padding:40px;font-family:Inter,sans-serif">' + ct('db.warn.apiUnreachable') + '</td></tr>';
  }
}

async function createApiKey() {
  var name = prompt(ct('db.keys.namePrompt'));
  if (name === null) return;
  try {
    var resp = await fetch(API+'/8router/api-keys', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: name || 'Unnamed'})
    });
    if (resp.ok) {
      loadApiKeys();
    } else {
      alert(ct('db.keys.createFailed'));
    }
  } catch(e) {
    alert(ct('db.keys.createFailed'));
  }
}

async function revokeApiKey(id) {
  if (!confirm(ct('db.keys.revokeConfirm'))) return;
  try {
    await fetch(API+'/8router/api-keys/' + encodeURIComponent(id), {method: 'DELETE'});
    loadApiKeys();
  } catch(e) {
    alert(ct('db.keys.revokeFailed'));
  }
}

// ═══ ACCESS KEYS (Phase 2B) ═══
async function loadAccessKeys() {
  try {
    var resp = await apiFetch(API+'/8router/api-access-keys');
    var keys = resp && resp.accessKeys ? resp.accessKeys : [];
    var tbody = document.getElementById('accesskey-tbody');
    if (!keys.length) {
      tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;font-family:Inter,sans-serif">No access keys yet. Create your first 8Router access key to connect Cursor, Cline, OpenWebUI, or your own AI agent.</td></tr>';
      return;
    }
    tbody.innerHTML = keys.map(function(k) {
      var lastUsed = k.lastUsedAt ? new Date(k.lastUsedAt).toLocaleDateString() : '-';
      var statusCls = k.status === 'active' ? 'healthy' : 'unhealthy';
      var provCount = Array.isArray(k.allowedProviders) ? k.allowedProviders.length : 0;
      var modelCount = Array.isArray(k.allowedModels) ? k.allowedModels.length : 0;
      return '<tr>' +
        '<td style="font-family:Inter,sans-serif;font-weight:500">' + (k.name||'Unnamed') + '</td>' +
        '<td style="font-family:JetBrains Mono,monospace;font-size:12px">' + (k.keyHint||'') + '</td>' +
        '<td>' + (k.projectName||'-') + '</td>' +
        '<td><span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(255,255,255,0.06)">' + (k.routingMode||'auto') + '</span></td>' +
        '<td style="font-size:12px">' + (k.defaultModelAlias||'8router/auto') + '</td>' +
        '<td><span class="badge ' + statusCls + '">' + k.status + '</span></td>' +
        '<td style="font-size:12px">' + lastUsed + '</td>' +
        '<td style="display:flex;gap:4px">' +
          '<button style="padding:4px 10px;border-radius:6px;border:1px solid var(--red);background:transparent;color:var(--red);font-size:11px;font-weight:600;cursor:pointer" onclick="revokeAccessKey(\'' + k.id + '\')">Revoke</button>' +
        '</td></tr>';
    }).join('');
  } catch(e) {
    document.getElementById('accesskey-tbody').innerHTML = '<tr><td colspan="8" style="text-align:center;color:var(--text-muted);padding:40px;font-family:Inter,sans-serif">Failed to load access keys</td></tr>';
  }
}

async function createAccessKey() {
  var name = prompt('Access key name (e.g. "Cursor Laptop", "Cline Agent"):');
  if (name === null) return;
  try {
    var resp = await fetch(API+'/8router/api-access-keys', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify({name: name || 'Unnamed Key'})
    });
    if (resp.ok) {
      var data = await resp.json();
      if (data.rawKey) {
        alert('✅ Access key created!\n\n🔑 ' + data.rawKey + '\n\nCopy this key now. You will not be able to see it again.\n\nBase URL: ' + window.location.origin + '/v1');
      }
      loadAccessKeys();
    } else {
      alert('Failed to create access key');
    }
  } catch(e) {
    alert('Failed to create access key');
  }
}

async function revokeAccessKey(id) {
  if (!confirm('Revoke this access key? It will be permanently disabled.')) return;
  try {
    await fetch(API+'/8router/api-access-keys/' + encodeURIComponent(id) + '/revoke', {method: 'POST'});
    loadAccessKeys();
  } catch(e) {
    alert('Failed to revoke');
  }
}

// ═══ CAVEMAN ═══
// Token Saver mode descriptions
var tsModeDescs = {off:'db.toksv.modeOffDesc',safe:'db.toksv.modeSafeDesc',balanced:'db.toksv.modeBalancedDesc',aggressive:'db.toksv.modeAggressiveDesc'};
function onTokenSaverModeChange() {
  var sel = document.getElementById('ts-mode');
  if (!sel) return;
  var mode = sel.value;
  var descEl = document.getElementById('ts-mode-desc');
  if (descEl) descEl.textContent = ct(tsModeDescs[mode] || 'db.toksv.modeOffDesc');
}

async function saveTokenSaver() {
  var sel = document.getElementById('ts-mode');
  if (!sel) return;
  var status = document.getElementById('ts-save-status');
  var btn = document.getElementById('ts-save-btn');
  if (btn) btn.disabled = true;
  if (status) { status.textContent = ct('db.toksv.saving'); status.style.color = 'var(--text-muted)'; }
  try {
    var r = await fetch(API+'/8router/api/settings/token-saver', {
      method: 'PATCH',
      headers: {'Content-Type':'application/json'},
      body: JSON.stringify({mode: sel.value})
    });
    if (r.ok) {
      if (status) { status.textContent = ct('db.toksv.saved'); status.style.color = 'var(--green)'; }
    } else {
      var err = await r.json().catch(function(){return {}});
      if (status) { status.textContent = err.error || ct('db.toksv.saveError'); status.style.color = 'var(--red)'; }
    }
  } catch(e) {
    if (status) { status.textContent = ct('db.toksv.saveError'); status.style.color = 'var(--red)'; }
  }
  if (btn) btn.disabled = false;
  setTimeout(function() { if (status) status.textContent = ''; }, 3000);
}

// ═══ TOKEN SAVER STATS ═══
async function loadTokenSaverStats() {
  try {
    // Load token saver mode setting
    try {
      var r = await fetch(API+'/8router/api/settings/token-saver');
      if (r.ok) {
        var cfg = await r.json();
        var sel = document.getElementById('ts-mode');
        if (sel && cfg.mode) sel.value = cfg.mode;
        onTokenSaverModeChange();
      }
    } catch(e) {}
    
    // Load compression stats
    var stats = null;
    try {
      var sr = await fetch(API+'/8router/stats');
      if (sr.ok) stats = await sr.json();
    } catch(e) {}
    
    if (!stats) return;
    var s = stats.session || stats;
    var at = stats.allTime || {};
    
    var compressionSaved = at.compressionSaved || s.compressionSaved || 0;
    var totalCompressed = at.totalCompressed || s.totalCompressed || compressionSaved;
    var tokensBefore = at.tokensBeforeCompression || s.tokensBeforeCompression || 0;
    var tokensAfter = at.tokensAfterCompression || s.tokensAfterCompression || 0;
    var pctSaved = tokensBefore > 0 ? ((tokensBefore - tokensAfter) / tokensBefore * 100) : (compressionSaved > 0 ? 15 : 0);
    var costSaved = compressionSaved * 0.000002;
    
    var el;
    if ((el = document.getElementById('ts-saved-today'))) el.textContent = compressionSaved.toLocaleString();
    if ((el = document.getElementById('ts-pct-saved'))) el.textContent = pctSaved.toFixed(1) + '%';
    if ((el = document.getElementById('ts-cost-saved'))) el.textContent = '$' + costSaved.toFixed(2);
    if ((el = document.getElementById('ts-total-compressed'))) el.textContent = totalCompressed.toLocaleString();
    if ((el = document.getElementById('ts-before'))) el.textContent = (tokensBefore || compressionSaved * 2).toLocaleString();
    if ((el = document.getElementById('ts-after'))) el.textContent = (tokensAfter || compressionSaved).toLocaleString();
  } catch(e) {}
}

// ═══ CANONICAL EXPERIMENT ═══
async function loadCanonicalExperiment() {
  var el = document.getElementById('canonexp-content');
  if (!el) return;
  el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-muted);font-size:12px">'+ct('db.canonical.loading')+'</div>';
  try {
    var [statusRes, metricsRes, readinessRes] = await Promise.all([
      fetch(API+'/8router/api/canonical-experiment/status').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(API+'/8router/api/canonical-experiment/metrics').then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(API+'/8router/api/canonical-experiment/readiness').then(r => r.ok ? r.json() : null).catch(() => null),
    ]);

    if (!statusRes) { el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--red);font-size:12px">'+ct('db.canonical.error')+'</div>'; return; }

    var cfg = statusRes.config || {};
    var state = statusRes.state || {};
    var metrics = statusRes.metrics || {};
    var readiness = readinessRes || {};
    var topKinds = metrics.topMismatchKinds || [];
    var providers = metrics.requestsByProvider || {};
    var aliases = metrics.requestsByAlias || {};
    var modeColor = state.mode === 'shadow' ? 'var(--green)' : state.mode === 'canary' ? 'var(--yellow)' : 'var(--text-muted)';

    // ── Status Card ──
    var statusHtml = '<div class="card" style="margin-bottom:20px">' +
      '<div class="card-header"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z"/><path d="m9 12 2 2 4-4"/></svg> '+ct('db.canonical.status')+'</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;padding:16px">' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+ct('db.canonical.mode')+'</div><div style="font-size:18px;font-weight:700;color:'+modeColor+'">'+(state.mode||'off')+'</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+ct('db.canonical.enabled')+'</div><div style="font-size:18px;font-weight:700">'+(state.enabled ? ct('db.canonical.yes') : ct('db.canonical.no'))+'</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+ct('db.canonical.autoDisabled')+'</div><div style="font-size:18px;font-weight:700">'+(state.autoDisabled ? '🔴 YES' : ct('db.canonical.no'))+'</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+ct('db.canonical.observed')+'</div><div style="font-size:18px;font-weight:700">'+(state.requestsObserved||0).toLocaleString()+'</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Sample Rate</div><div style="font-size:18px;font-weight:700">'+(cfg.shadowSampleRate||0)+'</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Auto-Disable</div><div style="font-size:18px;font-weight:700">'+(cfg.autoDisable ? 'ON' : 'OFF')+'</div></div>' +
      '</div></div>';

    // ── Readiness Card ──
    var readyStatus = readiness.status || 'insufficient_data';
    var readyColor = readyStatus === 'ready' ? 'var(--green)' : readyStatus === 'blocked' ? 'var(--red)' : readyStatus === 'warning' ? 'var(--yellow)' : 'var(--text-muted)';
    var gates = readiness.gates || [];
    var gatesHtml = '<div class="card" style="margin-bottom:20px">' +
      '<div class="card-header"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg> Readiness <span style="font-size:12px;font-weight:400;margin-left:auto;padding:4px 10px;border-radius:12px;background:'+readyColor+'22;color:'+readyColor+'">'+readyStatus.toUpperCase()+'</span></div>' +
      '<div style="padding:16px"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="text-align:left;color:var(--text-muted)"><th style="padding:6px 8px">Gate</th><th style="padding:6px 8px">Status</th><th style="padding:6px 8px">Current</th><th style="padding:6px 8px">Threshold</th></tr></thead><tbody>';
    for (var i = 0; i < gates.length; i++) {
      var g = gates[i];
      var gIcon = g.status === 'passed' ? '✅' : g.status === 'blocked' ? '🔴' : g.status === 'warning' ? '🟡' : '⚪';
      var gColor = g.status === 'passed' ? 'var(--green)' : g.status === 'blocked' ? 'var(--red)' : g.status === 'warning' ? 'var(--yellow)' : 'var(--text-muted)';
      gatesHtml += '<tr style="border-top:1px solid var(--border)"><td style="padding:6px 8px">'+g.name+'</td><td style="padding:6px 8px;color:'+gColor+'">'+gIcon+' '+g.status+'</td><td style="padding:6px 8px">'+g.current+'</td><td style="padding:6px 8px">'+g.threshold+'</td></tr>';
    }
    gatesHtml += '</tbody></table></div></div>';

    // ── Metrics Card ──
    var metricsHtml = '<div class="card" style="margin-bottom:20px">' +
      '<div class="card-header"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg> '+ct('db.canonical.metrics')+'</div>' +
      '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px;padding:16px">' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+ct('db.canonical.matchRate')+'</div><div style="font-size:18px;font-weight:700">'+((metrics.matchRate||0)*100).toFixed(2)+'%</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+ct('db.canonical.mismatchRate')+'</div><div style="font-size:18px;font-weight:700">'+((metrics.mismatchRate||0)*100).toFixed(2)+'%</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+ct('db.canonical.failRate')+'</div><div style="font-size:18px;font-weight:700">'+((metrics.canonicalFailureRate||0)*100).toFixed(2)+'%</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">'+ct('db.canonical.fallbacks')+'</div><div style="font-size:18px;font-weight:700">'+(state.legacyFallbacks||0).toLocaleString()+'</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">Critical Mismatches</div><div style="font-size:18px;font-weight:700;color:'+(metrics.criticalMismatchCount>0?'var(--red)':'var(--green)')+'">'+(metrics.criticalMismatchCount||0)+'</div></div>' +
        '<div><div style="font-size:11px;color:var(--text-muted);margin-bottom:4px">p50 / p95 / p99</div><div style="font-size:14px;font-weight:600">'+(metrics.comparisonLatencyP50Ms!=null?metrics.comparisonLatencyP50Ms.toFixed(1):'—')+'ms / '+(metrics.comparisonLatencyP95Ms!=null?metrics.comparisonLatencyP95Ms.toFixed(1):'—')+'ms / '+(metrics.comparisonLatencyP99Ms!=null?metrics.comparisonLatencyP99Ms.toFixed(1):'—')+'ms</div></div>' +
      '</div></div>';

    // ── Coverage Matrix Card ──
    var covHtml = '<div class="card" style="margin-bottom:20px">' +
      '<div class="card-header"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect width="18" height="18" x="3" y="3" rx="2"/><path d="M3 9h18"/><path d="M3 15h18"/><path d="M9 3v18"/><path d="M15 3v18"/></svg> Coverage Matrix</div>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;padding:16px">' +
        '<div><div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--text-muted)">Providers</div>';
    var provKeys = Object.keys(providers);
    if (provKeys.length === 0) covHtml += '<div style="font-size:12px;color:var(--text-muted)">No data yet</div>';
    for (var pi = 0; pi < provKeys.length; pi++) {
      covHtml += '<div style="font-size:12px;margin-bottom:4px"><span style="color:var(--text-main)">'+provKeys[pi]+'</span> <span style="color:var(--text-muted)">('+providers[provKeys[pi]]+')</span></div>';
    }
    covHtml += '</div><div><div style="font-size:12px;font-weight:600;margin-bottom:8px;color:var(--text-muted)">Aliases</div>';
    var aliasKeys = Object.keys(aliases);
    if (aliasKeys.length === 0) covHtml += '<div style="font-size:12px;color:var(--text-muted)">No data yet</div>';
    for (var ai = 0; ai < aliasKeys.length; ai++) {
      covHtml += '<div style="font-size:12px;margin-bottom:4px"><span style="color:var(--text-main)">'+aliasKeys[ai]+'</span> <span style="color:var(--text-muted)">('+aliases[aliasKeys[ai]]+')</span></div>';
    }
    covHtml += '</div></div></div>';

    // ── Mismatch Breakdown Card ──
    var misHtml = '<div class="card" style="margin-bottom:20px">' +
      '<div class="card-header"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg> Top Mismatch Kinds</div>' +
      '<div style="padding:16px">';
    if (topKinds.length === 0) misHtml += '<div style="font-size:12px;color:var(--text-muted)">No mismatches recorded</div>';
    for (var mi = 0; mi < Math.min(topKinds.length, 10); mi++) {
      var mk = topKinds[mi];
      var isCritical = ['request_role','response_role','response_tool_call_name','response_tool_call_id','response_finish_reason','response_text_hash','stream_event_order','conversion_error'].indexOf(mk.kind)>=0;
      misHtml += '<div style="display:flex;justify-content:space-between;padding:4px 0;font-size:12px;border-bottom:1px solid var(--border)"><span'+(isCritical?' style="color:var(--red)"':'')+'>'+mk.kind+'</span><span style="font-weight:600">'+mk.count+'</span></div>';
    }
    misHtml += '</div></div>';

    // ── Controls Card ──
    var ctrlHtml = '<div class="card" style="margin-bottom:20px">' +
      '<div class="card-header"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg> '+ct('db.canonical.controls')+'</div>' +
      '<div style="padding:16px;display:flex;flex-wrap:wrap;gap:10px">' +
        '<button onclick="canonicalSetMode(\'shadow\')" style="padding:8px 16px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text-main);font-size:12px;cursor:pointer;'+(state.mode==='shadow'?'border-color:var(--green);background:var(--green);color:#fff':'')+'">Shadow</button>' +
        '<button onclick="canonicalSetMode(\'off\')" style="padding:8px 16px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text-main);font-size:12px;cursor:pointer;'+(state.mode==='off'?'border-color:var(--accent);background:var(--accent);color:#fff':'')+'">Off</button>' +
        '<button onclick="canonicalManualDisable()" style="padding:8px 16px;border:1px solid var(--red);border-radius:8px;background:transparent;color:var(--red);font-size:12px;cursor:pointer">Kill Switch</button>' +
        '<button onclick="canonicalRetentionPolicy()" style="padding:8px 16px;border:1px solid var(--border);border-radius:8px;background:var(--card);color:var(--text-main);font-size:12px;cursor:pointer">Retention Cleanup</button>' +
      '</div>' +
      '<div style="padding:0 16px 16px;font-size:11px;color:var(--text-muted)">'+ct('db.canonical.shadowInfo')+'</div>' +
      '</div>';

    // ── Canary Blocked Notice ──
    var canaryHtml = '<div class="card" style="margin-bottom:20px;opacity:0.5">' +
      '<div class="card-header"><svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg> Canary <span style="font-size:11px;font-weight:400;margin-left:auto;padding:4px 10px;border-radius:12px;background:var(--red)22;color:var(--red)">BLOCKED UNTIL SHADOW VALIDATION PASSES</span></div>' +
      '<div style="padding:0 16px 16px;font-size:11px;color:var(--text-muted)">'+ct('db.canonical.canaryWarn')+'</div>' +
      '</div>';

    el.innerHTML = statusHtml + gatesHtml + metricsHtml + covHtml + misHtml + ctrlHtml + canaryHtml;
  } catch(e) {
    el.innerHTML = '<div style="padding:40px;text-align:center;color:var(--red);font-size:12px">'+ct('db.canonical.error')+'</div>';
  }
}

async function canonicalSetMode(mode) {
  try {
    if (mode === 'off') {
      await fetch(API+'/8router/api/canonical-experiment/disable', {method:'POST'});
    } else {
      await fetch(API+'/8router/api/canonical-experiment/enable', {method:'POST'});
      await fetch(API+'/8router/api/canonical-experiment/settings', {
        method:'PATCH',
        headers:{'Content-Type':'application/json'},
        body: JSON.stringify({mode: mode})
      });
    }
    loadCanonicalExperiment();
  } catch(e) {}
}

async function canonicalManualDisable() {
  if (!confirm('Trigger manual kill switch? This will disable the canonical experiment.')) return;
  try {
    await fetch(API+'/8router/api/canonical-experiment/manual-disable', {method:'POST'});
    loadCanonicalExperiment();
  } catch(e) {}
}

async function canonicalRetentionPolicy() {
  try {
    var r = await fetch(API+'/8router/api/canonical-experiment/retention-cleanup', {method:'POST'});
    if (r.ok) {
      var data = await r.json();
      alert('Retention cleanup complete. Deleted: ' + data.deleted + ' logs');
    }
  } catch(e) {}
}

// ═══ SAVE SETTING ═══
async function saveSetting(key, value) {
  var payload = {};
  payload[key] = value;
  try {
    await fetch(API+'/8router/settings', {
      method: 'POST',
      headers: {'Content-Type': 'application/json'},
      body: JSON.stringify(payload)
    });
  } catch(e) {}
}

// ═══ PLAYGROUND ═══
var pgLastResponse = '';
async function pgSend() {
  var prompt = document.getElementById('pg-prompt').value.trim();
  if (!prompt) return;
  var model = document.getElementById('pg-model').value;
  var temp = parseFloat(document.getElementById('pg-temp').value);
  var maxTokens = parseInt(document.getElementById('pg-maxtokens').value) || 1024;
  var streaming = document.getElementById('pg-stream-toggle').classList.contains('on');
  var btn = document.getElementById('pg-send-btn');
  var respEl = document.getElementById('pg-response');
  var statusEl = document.getElementById('pg-status');

  btn.disabled = true;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" class="spin"><path d="M21 12a9 9 0 1 1-6.219-8.56"/></svg> Sending...';
  respEl.textContent = '';
  statusEl.textContent = 'Sending...';
  statusEl.style.color = 'var(--yellow)';
  document.getElementById('pg-m-provider').textContent = '\u2014';
  document.getElementById('pg-m-tokens').textContent = '\u2014';
  document.getElementById('pg-m-latency').textContent = '\u2014';
  document.getElementById('pg-m-cost').textContent = '\u2014';
  document.getElementById('pg-m-fallback').textContent = '\u2014';
  document.getElementById('pg-m-model').textContent = '\u2014';

  var startTime = Date.now();
  try {
    var body = {
      model: model,
      messages: [{ role: 'user', content: prompt }],
      temperature: temp,
      max_tokens: maxTokens,
      stream: streaming
    };

    if (streaming) {
      var resp = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      var reader = resp.body.getReader();
      var decoder = new TextDecoder();
      var fullText = '';
      var meta = {};
      while (true) {
        var chunk = await reader.read();
        if (chunk.done) break;
        var text = decoder.decode(chunk.value, { stream: true });
        var lines = text.split('\\n');
        for (var i = 0; i < lines.length; i++) {
          var line = lines[i].trim();
          if (!line || !line.startsWith('data: ')) continue;
          var data = line.slice(6);
          if (data === '[DONE]') continue;
          try {
            var j = JSON.parse(data);
            if (j.choices && j.choices[0] && j.choices[0].delta && j.choices[0].delta.content) {
              fullText += j.choices[0].delta.content;
              respEl.textContent = fullText;
              respEl.scrollTop = respEl.scrollHeight;
            }
            if (j.x_8router) meta = j.x_8router;
            if (j.model) meta.model = j.model;
            if (j.usage) meta.usage = j.usage;
          } catch(e) {}
        }
      }
      pgLastResponse = fullText;
      var elapsed = Date.now() - startTime;
      pgUpdateMeta(meta, elapsed);
      statusEl.textContent = 'Complete (' + elapsed + 'ms)';
      statusEl.style.color = 'var(--green)';
    } else {
      var resp = await fetch('/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      var result = await resp.json();
      var elapsed = Date.now() - startTime;

      if (result.error) {
        respEl.textContent = 'Error: ' + (result.error.message || JSON.stringify(result.error));
        respEl.style.color = 'var(--red)';
        statusEl.textContent = 'Error';
        statusEl.style.color = 'var(--red)';
      } else {
        var content = (result.choices && result.choices[0] && result.choices[0].message && result.choices[0].message.content) || JSON.stringify(result, null, 2);
        pgLastResponse = content;
        respEl.textContent = content;
        respEl.style.color = '';
        var meta = {};
        if (result.x_8router) meta = result.x_8router;
        if (result.model) meta.model = result.model;
        if (result.usage) meta.usage = result.usage;
        pgUpdateMeta(meta, elapsed);
        statusEl.textContent = 'Complete (' + elapsed + 'ms)';
        statusEl.style.color = 'var(--green)';
      }
    }
  } catch(e) {
    respEl.textContent = 'Request failed: ' + e.message;
    respEl.style.color = 'var(--red)';
    statusEl.textContent = 'Failed';
    statusEl.style.color = 'var(--red)';
  }
  btn.disabled = false;
  btn.innerHTML = '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="22" y1="2" x2="11" y2="13"/><polygon points="22 2 15 22 11 13 2 9 22 2"/></svg> Send';
}

function pgUpdateMeta(meta, elapsed) {
  document.getElementById('pg-m-provider').innerHTML = (meta.provider || meta.providerId) ? provLogo(meta.provider || meta.providerId, 16) + (meta.provider || meta.providerId) : '\u2014';
  document.getElementById('pg-m-model').textContent = meta.model || '\u2014';
  document.getElementById('pg-m-latency').textContent = elapsed + 'ms';
  if (meta.usage) {
    var total = (meta.usage.prompt_tokens||0) + (meta.usage.completion_tokens||0);
    document.getElementById('pg-m-tokens').textContent = total.toLocaleString() + ' (' + (meta.usage.prompt_tokens||0) + '+' + (meta.usage.completion_tokens||0) + ')';
  }
  document.getElementById('pg-m-cost').textContent = meta.cost != null ? '$' + meta.cost.toFixed(6) : (meta.usage && meta.usage.cost != null ? '$' + meta.usage.cost.toFixed(6) : '\u2014');
  document.getElementById('pg-m-fallback').textContent = meta.fallbackPath ? meta.fallbackPath.join(' \u2192 ') : (meta.fallback ? 'Yes' : '\u2014');
}

function pgCopy() {
  if (!pgLastResponse) return;
  navigator.clipboard.writeText(pgLastResponse).then(function() {
    var btn = document.querySelector('.pg-btn.secondary');
    if (btn) {
      var orig = btn.innerHTML;
      btn.innerHTML = '<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg> Copied!';
      setTimeout(function(){ btn.innerHTML = orig; }, 1500);
    }
  });
}

// Init
refresh();
document.getElementById("sidebar-overlay").addEventListener("click", toggleSidebar);

// ═══ BOTTOM NAV (mobile) ═══
function renderBottomNav() {
  if (window.innerWidth > 768) { var bn = document.querySelector('.bottom-nav'); if(bn) bn.remove(); return; }
  if (document.querySelector('.bottom-nav')) return;
  var nav = document.createElement('div');
  nav.className = 'bottom-nav';
  var items = [
    {name:'endpoint', label:'Home'},
    {name:'usage', label:'Usage'},
    {name:'quota', label:'Quota'},
    {name:'providers', label:'Providers'},
    {name:'settings', label:'Settings'}
  ];
  nav.innerHTML = items.map(function(it) {
    var active = curPage===it.name ? ' active' : '';
    var icons = {
      endpoint:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>',
      usage:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
      quota:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>',
      providers:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"/><rect x="2" y="14" width="20" height="8" rx="2" ry="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>',
      settings:'<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>'
    };
    return '<div class="nav-item'+active+'" onclick="go(\\''+it.name+'\\',this)">'+(icons[it.name]||'')+'<span>'+it.label+'</span></div>';
  }).join('');
  document.body.appendChild(nav);
  updateBottomNav();
}
function updateBottomNav() {
  document.querySelectorAll('.bottom-nav .nav-item').forEach(function(el) {
    var onclick = el.getAttribute('onclick') || '';
    var idx = onclick.indexOf("go('");
    if (idx >= 0) {
      var name = onclick.substring(idx+4, onclick.indexOf("'", idx+4));
      el.classList.toggle('active', name === curPage);
    }
  });
}
renderBottomNav();
window.addEventListener('resize', renderBottomNav);
setInterval(updateBottomNav, 500);

// Public access warning check
if (window.location.hostname !== 'localhost' && window.location.hostname !== '127.0.0.1') {
  document.getElementById('public-warning').style.display = 'block';
}
</script>
</body>
</html>`;
}