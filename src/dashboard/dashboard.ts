// 8Router — Command Center Dashboard v4
// Inspired by 9Router: Endpoint config, Usage with topology + recent requests, Quota Tracker, etc.

import express from 'express';
import cors from 'cors';
import http from 'http';

export function createDashboard(engineOrPort: any, portOrUndef?: number): express.Express {
  const app = express();
  app.use(cors());
  const port = typeof portOrUndef === 'number' ? portOrUndef : (typeof engineOrPort === 'number' ? engineOrPort : 8081);
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

  app.get('/', (_req, res) => { res.send(getHTML(port)); });
  return app;
}

function getHTML(apiPort: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>8Router — Command Center</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root{
  --bg:#0f1117;--bg2:#161822;--bg3:#1c1f2e;--bg4:#232640;
  --border:#2a2d45;--border2:#353860;
  --text:#e4e5f1;--text2:#9496b0;--text3:#5d5f78;
  --accent:#ff6b35;--accent2:#ff8c5a;--accent-dim:rgba(255,107,53,0.12);
  --green:#00e676;--green-dim:rgba(0,230,118,0.12);
  --red:#ff5252;--red-dim:rgba(255,82,82,0.12);
  --blue:#448aff;--blue-dim:rgba(68,138,255,0.12);
  --purple:#b388ff;--purple-dim:rgba(179,136,255,0.12);
  --cyan:#18ffff;--cyan-dim:rgba(24,255,255,0.12);
  --yellow:#ffd740;--yellow-dim:rgba(255,215,64,0.12);
  --pink:#ff4081;
  --sidebar:240px;
}
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Inter',sans-serif;background:var(--bg);color:var(--text);display:flex;min-height:100vh;overflow:hidden}

/* ═══ SIDEBAR ═══ */
.sidebar{width:var(--sidebar);background:var(--bg2);border-right:1px solid var(--border);position:fixed;top:0;left:0;bottom:0;display:flex;flex-direction:column;z-index:100}
.sb-header{padding:20px 16px;display:flex;align-items:center;gap:10px;border-bottom:1px solid var(--border)}
.sb-logo{width:36px;height:36px;background:linear-gradient(135deg,var(--accent),#ff3d00);border-radius:10px;display:flex;align-items:center;justify-content:center;font-size:18px}
.sb-brand{flex:1}
.sb-brand .name{font-size:16px;font-weight:700;color:var(--text)}
.sb-brand .ver{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace}

.sb-update{margin:8px 12px;padding:10px;background:var(--accent-dim);border:1px solid rgba(255,107,53,0.3);border-radius:8px}
.sb-update .new{font-size:11px;color:var(--accent);font-weight:600;margin-bottom:4px}
.sb-update .cmd{font-size:10px;color:var(--text3);font-family:'JetBrains Mono',monospace}

.sb-nav{flex:1;padding:8px;overflow-y:auto}
.sb-section{font-size:9px;text-transform:uppercase;letter-spacing:1.5px;color:var(--text3);padding:12px 12px 6px;font-weight:700}
.sb-item{display:flex;align-items:center;gap:10px;padding:9px 12px;border-radius:8px;cursor:pointer;color:var(--text2);font-size:13px;font-weight:500;transition:all .15s;margin-bottom:1px}
.sb-item:hover{background:var(--bg3);color:var(--text)}
.sb-item.active{background:var(--accent);color:#fff}
.sb-item .ico{width:20px;text-align:center;font-size:15px}
.sb-item .cnt{margin-left:auto;font-size:10px;background:var(--bg4);padding:1px 6px;border-radius:8px;color:var(--text3)}
.sb-item.active .cnt{background:rgba(255,255,255,0.2);color:#fff}

.sb-footer{padding:12px}
.sb-shutdown{width:100%;padding:10px;border-radius:10px;border:1px solid var(--border);background:var(--bg3);color:var(--text2);font-size:12px;font-weight:600;cursor:pointer;display:flex;align-items:center;justify-content:center;gap:6px;transition:all .15s}
.sb-shutdown:hover{background:var(--red-dim);color:var(--red);border-color:var(--red)}

/* ═══ MAIN ═══ */
.main{margin-left:var(--sidebar);flex:1;display:flex;flex-direction:column;height:100vh}
.topbar{height:48px;background:var(--bg2);border-bottom:1px solid var(--border);display:flex;align-items:center;padding:0 20px;gap:16px;flex-shrink:0}
.topbar .title{font-size:15px;font-weight:600;display:flex;align-items:center;gap:8px}
.topbar .subtitle{font-size:11px;color:var(--text3)}
.topbar .spacer{flex:1}
.topbar .actions{display:flex;gap:8px}
.topbar .pill{background:var(--bg3);border:1px solid var(--border);border-radius:6px;padding:5px 12px;font-size:11px;color:var(--text2);cursor:pointer;font-family:'JetBrains Mono',monospace;transition:all .15s}
.topbar .pill:hover{border-color:var(--accent);color:var(--accent)}
.topbar .badge{padding:4px 10px;border-radius:6px;font-size:11px;font-weight:600;display:flex;align-items:center;gap:5px}
.topbar .badge.on{background:var(--green-dim);color:var(--green)}
.topbar .badge.off{background:var(--red-dim);color:var(--red)}

.content{flex:1;overflow-y:auto;padding:20px}
.page{display:none}.page.active{display:block}

/* ═══ ENDPOINT PAGE ═══ */
.endpoint-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:20px;margin-bottom:16px}
.endpoint-card h3{font-size:13px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.endpoint-card h3 .ico{font-size:18px}
.ep-row{display:flex;align-items:center;gap:12px;padding:10px 14px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:8px}
.ep-row .label{font-size:11px;color:var(--text3);min-width:60px;font-weight:600;text-transform:uppercase}
.ep-row .url{flex:1;font-family:'JetBrains Mono',monospace;font-size:12px;color:var(--accent2);cursor:pointer}
.ep-row .url:hover{text-decoration:underline}
.ep-row .copy{width:28px;height:28px;background:var(--bg4);border:1px solid var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;cursor:pointer;font-size:12px;color:var(--text3);transition:all .15s}
.ep-row .copy:hover{color:var(--accent);border-color:var(--accent)}
.ep-status{display:flex;align-items:center;gap:6px;font-size:11px;color:var(--green)}
.ep-status .dot{width:6px;height:6px;border-radius:50%;background:var(--green);animation:pulse 2s infinite}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}

.warning-box{background:var(--yellow-dim);border:1px solid rgba(255,215,64,0.3);border-radius:8px;padding:12px 16px;margin-bottom:8px;display:flex;align-items:center;gap:10px;font-size:12px;color:var(--yellow)}
.warning-box .icon{font-size:16px}
.warning-box .action{margin-left:auto;color:var(--accent);font-weight:600;cursor:pointer;text-decoration:underline}

.toggle-row{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;background:var(--bg2);border:1px solid var(--border);border-radius:8px;margin-bottom:8px}
.toggle-row .info{font-size:13px;font-weight:500}
.toggle-row .desc{font-size:11px;color:var(--text3);margin-top:2px}
.toggle{width:44px;height:24px;background:var(--bg4);border-radius:12px;cursor:pointer;position:relative;transition:all .2s;border:1px solid var(--border)}
.toggle.on{background:var(--accent);border-color:var(--accent)}
.toggle::after{content:'';position:absolute;top:2px;left:2px;width:18px;height:18px;background:#fff;border-radius:50%;transition:transform .2s}
.toggle.on::after{transform:translateX(20px)}

/* Token Saver */
.caveman-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:20px;margin-top:16px}
.caveman-card h3{font-size:13px;font-weight:600;margin-bottom:4px;display:flex;align-items:center;gap:8px}
.caveman-card .sub{font-size:11px;color:var(--text3);margin-bottom:16px}
.caveman-row{display:flex;align-items:center;gap:16px}
.caveman-slider{flex:1;-webkit-appearance:none;height:6px;background:var(--bg);border-radius:3px;outline:none}
.caveman-slider::-webkit-slider-thumb{-webkit-appearance:none;width:20px;height:20px;background:var(--accent);border-radius:50%;cursor:pointer;border:3px solid var(--bg3)}
.caveman-val{font-size:32px;font-weight:800;color:var(--accent);min-width:40px;text-align:center}
.caveman-levels{display:flex;justify-content:space-between;margin-top:12px;font-size:10px;color:var(--text3)}

/* ═══ USAGE PAGE ═══ */
.usage-grid{display:grid;grid-template-columns:1fr 320px;gap:16px;height:calc(100vh - 140px)}
.usage-left{display:flex;flex-direction:column;gap:16px;overflow:hidden}
.usage-right{display:flex;flex-direction:column;gap:16px;overflow:hidden}

/* Topology */
.topo-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;flex:1;overflow:hidden;display:flex;flex-direction:column}
.topo-card .hdr{padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600;display:flex;align-items:center;gap:8px}
.topo-card canvas{flex:1;width:100%}

/* Recent Requests */
.recent-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;display:flex;flex-direction:column;overflow:hidden}
.recent-card .hdr{padding:14px 16px;border-bottom:1px solid var(--border);font-size:13px;font-weight:600}
.recent-list{flex:1;overflow-y:auto;padding:4px 0}
.recent-item{display:flex;align-items:center;gap:10px;padding:8px 16px;border-bottom:1px solid var(--border);font-size:12px}
.recent-item .dot{width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0}
.recent-item .model{flex:1;font-weight:500;font-family:'JetBrains Mono',monospace;font-size:11px;color:var(--text)}
.recent-item .tokens{text-align:right;font-family:'JetBrains Mono',monospace;font-size:11px}
.recent-item .tokens .in{color:var(--accent2)}
.recent-item .tokens .out{color:var(--cyan)}

/* ═══ QUOTA TRACKER ═══ */
.quota-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:16px}
.quota-card{background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:16px}
.quota-card .name{font-size:14px;font-weight:600;margin-bottom:12px;display:flex;align-items:center;gap:8px}
.quota-card .name .tier{font-size:10px;padding:2px 6px;border-radius:4px}
.quota-bar{width:100%;height:8px;background:var(--bg);border-radius:4px;overflow:hidden;margin-bottom:8px}
.quota-fill{height:100%;border-radius:4px;transition:width .3s}
.quota-info{display:flex;justify-content:space-between;font-size:11px;color:var(--text3)}
.quota-reset{font-size:10px;color:var(--yellow);margin-top:6px}

/* ═══ PROV TABLE ═══ */
.tbl-wrap{background:var(--bg3);border:1px solid var(--border);border-radius:12px;overflow:hidden}
table{width:100%;border-collapse:collapse}
th{background:var(--bg2);padding:10px 16px;text-align:left;font-size:10px;text-transform:uppercase;letter-spacing:1.2px;color:var(--text3);font-weight:700}
td{padding:12px 16px;border-top:1px solid var(--border);font-size:13px}
tr:hover td{background:var(--bg4)}
.badge{display:inline-flex;align-items:center;padding:3px 8px;border-radius:6px;font-size:11px;font-weight:600;gap:4px}
.badge.free{background:var(--green-dim);color:var(--green)}
.badge.cheap{background:var(--accent-dim);color:var(--accent)}
.badge.subscription{background:var(--purple-dim);color:var(--purple)}
.badge.healthy{background:var(--green-dim);color:var(--green)}
.badge.unhealthy{background:var(--red-dim);color:var(--red)}

/* ═══ MODELS ═══ */
.model-chips{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px}
.model-chip{background:var(--bg3);border:1px solid var(--border);border-radius:8px;padding:8px 14px;font-size:12px;display:flex;align-items:center;gap:6px;transition:all .15s;cursor:default}
.model-chip:hover{border-color:var(--accent);background:var(--bg4)}
.model-chip .provider{font-size:10px;color:var(--text3)}

/* ═══ SCROLLBAR ═══ */
::-webkit-scrollbar{width:5px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--border2)}

/* ═══ MOBILE RESPONSIVE ═══ */
@media (max-width: 768px) {
  :root {
    --sidebar: 0px;
  }

  /* Sidebar - hidden by default on mobile */
  .sidebar {
    width: 280px;
    transform: translateX(-100%);
    transition: transform 0.3s ease;
    z-index: 200;
  }

  .sidebar.open {
    transform: translateX(0);
  }

  /* Overlay when sidebar is open */
  .sidebar-overlay {
    display: none;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    background: rgba(0,0,0,0.5);
    z-index: 199;
  }

  .sidebar-overlay.show {
    display: block;
  }

  /* Main content - full width on mobile */
  .main {
    margin-left: 0;
  }

  /* Topbar - add hamburger menu */
  .topbar {
    padding: 0 12px;
    gap: 8px;
  }

  .topbar .hamburger {
    display: flex;
    flex-direction: column;
    gap: 4px;
    cursor: pointer;
    padding: 8px;
  }

  .topbar .hamburger span {
    width: 20px;
    height: 2px;
    background: var(--text);
    border-radius: 2px;
  }

  .topbar .title {
    font-size: 14px;
  }

  .topbar .subtitle {
    display: none;
  }

  .topbar .pill {
    display: none;
  }

  .topbar .badge {
    font-size: 10px;
    padding: 3px 8px;
  }

  /* Content - reduce padding */
  .content {
    padding: 12px;
  }

  /* Stats grid - 2 columns on mobile */
  .stats-row {
    grid-template-columns: repeat(2, 1fr) !important;
  }

  /* Usage grid - stack on mobile */
  .usage-grid {
    grid-template-columns: 1fr !important;
    height: auto !important;
  }

  .usage-left, .usage-right {
    overflow: visible;
  }

  /* Quota grid - 1 column on mobile */
  .quota-grid {
    grid-template-columns: 1fr !important;
  }

  /* Endpoint rows - stack on mobile */
  .ep-row {
    flex-wrap: wrap;
  }

  .ep-row .url {
    width: 100%;
    order: 3;
    margin-top: 4px;
    word-break: break-all;
  }

  /* Toggle rows - stack on mobile */
  .toggle-row {
    flex-direction: column;
    align-items: flex-start;
    gap: 12px;
  }

  .toggle {
    align-self: flex-end;
  }

  /* Caveman slider - stack on mobile */
  .caveman-row {
    flex-direction: column;
    gap: 12px;
  }

  .caveman-val {
    align-self: flex-end;
  }

  /* Tables - horizontal scroll */
  .tbl-wrap {
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }

  table {
    min-width: 600px;
  }

  /* Combo cards - 1 column on mobile */
  #combo-cards {
    grid-template-columns: 1fr !important;
  }

  /* Recent requests - full height on mobile */
  .recent-card {
    min-height: 300px;
  }

  /* Topology - fixed height on mobile */
  .topo-card {
    min-height: 250px;
  }

  /* Warning box - stack on mobile */
  .warning-box {
    flex-wrap: wrap;
    gap: 8px;
  }

  .warning-box .action {
    margin-left: 0;
    width: 100%;
    text-align: right;
  }

  /* Model chips - wrap on mobile */
  .model-chips {
    gap: 6px;
  }

  .model-chip {
    font-size: 11px;
    padding: 6px 10px;
  }
}

/* Tablet (769px - 1024px) */
@media (min-width: 769px) and (max-width: 1024px) {
  :root {
    --sidebar: 200px;
  }

  .sidebar {
    width: 200px;
  }

  .sb-header {
    padding: 16px 12px;
  }

  .sb-brand .name {
    font-size: 14px;
  }

  .sb-item {
    font-size: 12px;
    padding: 8px 10px;
  }

  .sb-update {
    display: none;
  }

  .content {
    padding: 16px;
  }

  .stats-row {
    grid-template-columns: repeat(3, 1fr) !important;
  }

  .usage-grid {
    grid-template-columns: 1fr 280px !important;
  }

  .quota-grid {
    grid-template-columns: repeat(2, 1fr) !important;
  }
}

/* Large screens (1440px+) */
@media (min-width: 1440px) {
  .stats-row {
    grid-template-columns: repeat(6, 1fr) !important;
  }

  .quota-grid {
    grid-template-columns: repeat(4, 1fr) !important;
  }

  #combo-cards {
    grid-template-columns: repeat(3, 1fr) !important;
  }
}
</style>
</head>
<body>

<!-- ═══ SIDEBAR ═══ -->
<div class="sidebar-overlay" id="sidebar-overlay"></div>
<div class="sidebar" id="sidebar">
  <div class="sb-header">
    <div class="sb-logo">⚡</div>
    <div class="sb-brand">
      <div class="name">8Router</div>
      <div class="ver">v0.2.0</div>
    </div>
  </div>

  <div class="sb-update">
    <div class="new">↑ 8Agents Ecosystem</div>
    <div class="cmd">OpenAI-compatible AI gateway</div>
  </div>

  <div class="sb-nav">
    <div class="sb-item active" onclick="go('endpoint')">
      <span class="ico">🔌</span> Endpoint
    </div>
    <div class="sb-item" onclick="go('usage')">
      <span class="ico">📊</span> Usage
    </div>
    <div class="sb-item" onclick="go('quota')">
      <span class="ico">🔄</span> Quota Tracker
    </div>
    <div class="sb-item" onclick="go('providers')">
      <span class="ico">🏢</span> Providers
      <span class="cnt" id="prov-cnt">0</span>
    </div>
    <div class="sb-item" onclick="go('combos')">
      <span class="ico">🔗</span> Combos
    </div>
    <div class="sb-section">System</div>
    <div class="sb-item" onclick="go('settings')">
      <span class="ico">⚙️</span> Settings
    </div>
    <div class="sb-item" onclick="go('connections')">
      <span class="ico">🗄️</span> Connections
    </div>
  </div>

  <div class="sb-footer">
    <div class="sb-shutdown" onclick="if(confirm('Shutdown 8Router?'))fetch('/8router/shutdown',{method:'POST'})">⏻ Shutdown</div>
  </div>
</div>

<!-- ═══ MAIN ═══ -->
<div class="main">
  <div class="topbar">
    <div class="hamburger" onclick="toggleSidebar()"><span></span><span></span><span></span></div>
    <div class="title" id="tb-title">🔌 Endpoint</div>
    <div class="subtitle" id="tb-sub">API endpoint configuration</div>
    <div class="spacer"></div>
    <div class="pill" onclick="navigator.clipboard.writeText('http://localhost:${apiPort}/v1')" title="Copy endpoint">📋 http://localhost:${apiPort}/v1</div>
    <div class="badge on" id="conn-badge"><span class="dot" style="width:6px;height:6px;border-radius:50%;background:var(--green)"></span> Connected</div>
  </div>

  <div class="content">

    <!-- ═══ ENDPOINT ═══ -->
    <div id="pg-endpoint" class="page active">
      <div class="endpoint-card">
        <h3><span class="ico">🌐</span> API Endpoint</h3>
        <div class="ep-row">
          <span class="label">Local</span>
          <span class="url" onclick="navigator.clipboard.writeText('http://localhost:${apiPort}/v1')">http://localhost:${apiPort}/v1</span>
          <span class="copy" onclick="navigator.clipboard.writeText('http://localhost:${apiPort}/v1')" title="Copy">📋</span>
        </div>
        <div class="ep-row">
          <span class="label">Public</span>
          <span class="url" onclick="navigator.clipboard.writeText('http://5.223.60.79/v1')">http://5.223.60.79/v1</span>
          <span class="copy" onclick="navigator.clipboard.writeText('http://5.223.60.79/v1')" title="Copy">📋</span>
          <span class="ep-status"><span class="dot"></span> Active</span>
        </div>
      </div>

      <div class="warning-box">
        <span class="icon">⚠️</span>
        <span>Require API key is disabled — your endpoint is publicly accessible without authentication.</span>
        <span class="action" onclick="go('settings')">Enable →</span>
      </div>

      <div class="toggle-row">
        <div>
          <div class="info">Enable API key authentication</div>
          <div class="desc">Require API key for requests to your endpoint</div>
        </div>
        <div class="toggle" id="toggle-auth" onclick="this.classList.toggle('on')"></div>
      </div>

      <div class="toggle-row">
        <div>
          <div class="info">Allow dashboard access via public IP</div>
          <div class="desc">Dashboard is accessible at http://5.223.60.79/8router</div>
        </div>
        <div class="toggle on" id="toggle-dashboard"></div>
      </div>

      <!-- Token Saver -->
      <div class="caveman-card">
        <h3>⚡ Token Saver</h3>
        <div class="sub">Make LLM responses terse to save output tokens. Stackable with RTK compression.</div>
        <div class="caveman-row">
          <input type="range" min="0" max="5" value="0" class="caveman-slider" id="caveman" oninput="setCaveman(this.value)">
          <div class="caveman-val" id="caveman-val">0</div>
        </div>
        <div id="caveman-desc" style="font-size:12px;color:var(--text2);margin-top:8px">Disabled — Normal responses</div>
        <div class="caveman-levels">
          <span>0:Off</span><span>1:Mild</span><span>2:Medium</span><span>3:Aggressive</span><span>4:Extreme</span><span>5:Max</span>
        </div>
      </div>
    </div>

    <!-- ═══ USAGE ═══ -->
    <div id="pg-usage" class="page">
      <div class="usage-grid">
        <div class="usage-left">
          <div class="stats-row" style="display:grid;grid-template-columns:repeat(4,1fr);gap:10px">
            <div class="stat-mini" style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px">
              <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Requests</div>
              <div style="font-size:22px;font-weight:700;color:var(--blue)" id="u-req">0</div>
            </div>
            <div class="stat-mini" style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px">
              <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Tokens</div>
              <div style="font-size:22px;font-weight:700;color:var(--green)" id="u-tokens">0</div>
            </div>
            <div class="stat-mini" style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px">
              <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">Fallbacks</div>
              <div style="font-size:22px;font-weight:700;color:var(--accent)" id="u-fb">0</div>
            </div>
            <div class="stat-mini" style="background:var(--bg3);border:1px solid var(--border);border-radius:10px;padding:14px">
              <div style="font-size:10px;color:var(--text3);text-transform:uppercase;letter-spacing:1px;margin-bottom:4px">RTK Saved</div>
              <div style="font-size:22px;font-weight:700;color:var(--purple)" id="u-rtk">0</div>
            </div>
          </div>
          <div class="topo-card">
            <div class="hdr">🌐 Provider Topology</div>
            <canvas id="topo-canvas"></canvas>
          </div>
        </div>
        <div class="usage-right">
          <div class="recent-card">
            <div class="hdr">📝 Recent Requests</div>
            <div class="recent-list" id="recent-list">
              <div style="padding:40px;text-align:center;color:var(--text3);font-size:12px">No requests yet</div>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══ QUOTA ═══ -->
    <div id="pg-quota" class="page">
      <div style="margin-bottom:16px">
        <h3 style="font-size:15px;margin-bottom:4px">Quota Tracker</h3>
        <p style="font-size:12px;color:var(--text3)">Monitor provider quotas and usage limits</p>
      </div>
      <div class="quota-grid" id="quota-grid"></div>
    </div>

    <!-- ═══ PROVIDERS ═══ -->
    <div id="pg-providers" class="page">
      <div style="margin-bottom:16px;display:flex;justify-content:space-between;align-items:center">
        <div>
          <h3 style="font-size:15px;margin-bottom:4px">Provider Connections</h3>
          <p style="font-size:12px;color:var(--text3)">All connected AI providers and their status</p>
        </div>
        <button style="padding:8px 16px;background:var(--accent);border:none;border-radius:8px;color:#fff;font-size:12px;font-weight:600;cursor:pointer" onclick="loadProv()">Refresh</button>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>Provider</th><th>Tier</th><th>Status</th><th>API Keys</th><th>Requests</th><th>Tokens</th><th>Errors</th></tr></thead>
          <tbody id="prov-tbody"></tbody>
        </table>
      </div>
    </div>

    <!-- ═══ COMBOS ═══ -->
    <div id="pg-combos" class="page">
      <div style="margin-bottom:16px">
        <h3 style="font-size:15px;margin-bottom:4px">Model Combos</h3>
        <p style="font-size:12px;color:var(--text3)">Fallback chains — use a single model name that auto-routes through provider tiers</p>
      </div>
      <div id="combo-cards" style="display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:16px"></div>
    </div>

    <!-- ═══ SETTINGS ═══ -->
    <div id="pg-settings" class="page">
      <div style="margin-bottom:16px">
        <h3 style="font-size:15px;margin-bottom:4px">Settings</h3>
        <p style="font-size:12px;color:var(--text3)">Configure 8Router behavior</p>
      </div>
      <div class="toggle-row">
        <div><div class="info">RTK Token Compression</div><div class="desc">Compress tool output (git diff, grep, tree) to save tokens</div></div>
        <div class="toggle on" id="t-rtk"></div>
      </div>
      <div class="toggle-row">
        <div><div class="info">Circuit Breaker</div><div class="desc">Auto-disable failing providers after consecutive errors</div></div>
        <div class="toggle on" id="t-circuit"></div>
      </div>
      <div class="toggle-row">
        <div><div class="info">SSE Streaming</div><div class="desc">Enable streaming responses for chat completions</div></div>
        <div class="toggle on" id="t-stream"></div>
      </div>
      <div class="toggle-row">
        <div><div class="info">Multi-Key Rotation</div><div class="desc">Round-robin across multiple API keys per provider</div></div>
        <div class="toggle on" id="t-rotation"></div>
      </div>
      <div class="toggle-row">
        <div><div class="info">Auto-Fallback</div><div class="desc">Automatically try next provider on failure</div></div>
        <div class="toggle on" id="t-fallback"></div>
      </div>

      <div style="margin-top:24px">
        <h3 style="font-size:15px;margin-bottom:12px">System Info</h3>
        <div class="tbl-wrap">
          <table><tbody id="sysinfo-tbody"></tbody></table>
        </div>
      </div>
    </div>

    <!-- ═══ CONNECTIONS ═══ -->
    <div id="pg-connections" class="page">
      <div style="margin-bottom:16px">
        <h3 style="font-size:15px;margin-bottom:4px">Database Connections</h3>
        <p style="font-size:12px;color:var(--text3)">SQLite-backed connection tracking with backoff and cost</p>
      </div>
      <div class="tbl-wrap">
        <table>
          <thead><tr><th>ID</th><th>Provider</th><th>Name</th><th>Auth</th><th>Status</th><th>Backoff</th><th>Requests</th><th>Tokens</th><th>Cost</th></tr></thead>
          <tbody id="conn-tbody"></tbody>
        </table>
      </div>
    </div>
  </div>
</div>

<script>
const API = '';
let curPage = 'endpoint';

function toggleSidebar() {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebar-overlay").classList.toggle("show");
}

function go(name) {
  curPage = name;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.querySelectorAll('.sb-item').forEach(n => n.classList.remove('active'));
  document.getElementById('pg-' + name).classList.add('active');
  event.currentTarget.classList.add('active');
  // Close sidebar on mobile
  if (window.innerWidth <= 768) {
    document.getElementById("sidebar").classList.remove("open");
    document.getElementById("sidebar-overlay").classList.remove("show");
  }
  const titles = {
    endpoint: ['🔌 Endpoint','API endpoint configuration'],
    usage: ['📊 Usage & Analytics','Monitor your API usage, token consumption, and request logs'],
    quota: ['🔄 Quota Tracker','Monitor provider quotas and usage limits'],
    providers: ['🏢 Providers','Connected AI providers'],
    combos: ['🔗 Combos','Model fallback chains'],
    settings: ['⚙️ Settings','Configure 8Router behavior'],
    connections: ['🗄️ Connections','Database connection tracking']
  };
  const t = titles[name] || [name, ''];
  document.getElementById('tb-title').textContent = t[0];
  document.getElementById('tb-sub').textContent = t[1];
  if (name === 'usage') loadUsage();
  if (name === 'providers') loadProv();
  if (name === 'combos') loadCombos();
  if (name === 'connections') loadConns();
  if (name === 'settings') loadSettings();
  if (name === 'quota') loadQuota();
}

// ═══ DASHBOARD DATA ═══
async function refresh() {
  try {
    const [stats, provs, health, models] = await Promise.all([
      fetch(API+'/8router/stats').then(r=>r.json()),
      fetch(API+'/8router/providers').then(r=>r.json()),
      fetch(API+'/8router/health').then(r=>r.json()),
      fetch(API+'/8router/models').then(r=>r.json()),
    ]);
    const s = stats.session || stats;
    const at = stats.allTime || {};
    const total = at.totalRequests||0;

    document.getElementById('u-req').textContent = total.toLocaleString();
    document.getElementById('u-tokens').textContent = (at.totalTokens||0).toLocaleString();
    document.getElementById('u-fb').textContent = (s.fallbackCount||0).toLocaleString();
    document.getElementById('u-rtk').textContent = (s.compressionSaved||0).toLocaleString();
    document.getElementById('prov-cnt').textContent = provs.length;

    drawTopology(provs, health||[]);
    document.getElementById('conn-badge').className = 'badge on';
    document.getElementById('conn-badge').innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:var(--green);display:inline-block"></span> Connected';
  } catch(e) {
    document.getElementById('conn-badge').className = 'badge off';
    document.getElementById('conn-badge').innerHTML = '<span style="width:6px;height:6px;border-radius:50%;background:var(--red);display:inline-block"></span> Disconnected';
  }
}

// ═══ TOPOLOGY ═══
function drawTopology(provs, health) {
  const canvas = document.getElementById('topo-canvas');
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  const W = canvas.parentElement.clientWidth;
  const H = canvas.parentElement.clientHeight - 48;
  canvas.width = W; canvas.height = H;
  ctx.clearRect(0, 0, W, H);
  const cx = W/2, cy = H/2;

  // Center node
  ctx.beginPath(); ctx.arc(cx, cy, 28, 0, Math.PI*2);
  const grad = ctx.createRadialGradient(cx,cy,0,cx,cy,28);
  grad.addColorStop(0,'#ff8c5a'); grad.addColorStop(1,'#ff3d00');
  ctx.fillStyle = grad; ctx.fill();
  ctx.fillStyle='#fff'; ctx.font='bold 11px Inter,sans-serif'; ctx.textAlign='center';
  ctx.fillText('8Router',cx,cy+4);

  const hMap = Object.fromEntries(health.map(h=>[h.providerId,h]));
  const n = provs.length;
  const radius = Math.min(W,H)/2 - 50;

  provs.forEach((p,i) => {
    const angle = (i/n)*Math.PI*2 - Math.PI/2;
    const px = cx + Math.cos(angle)*radius;
    const py = cy + Math.sin(angle)*radius;
    const h = hMap[p.id];
    const ok = !h || h.healthy!==false;

    // Connection line with gradient
    ctx.beginPath(); ctx.moveTo(cx,cy); ctx.lineTo(px,py);
    ctx.strokeStyle = ok ? 'rgba(0,230,118,0.3)' : 'rgba(255,82,82,0.3)';
    ctx.lineWidth = 2; ctx.stroke();

    // Animated dot
    const t = (Date.now()/2000 + i*0.3) % 1;
    const dx = cx + (px-cx)*t, dy = cy + (py-cy)*t;
    ctx.beginPath(); ctx.arc(dx,dy,3,0,Math.PI*2);
    ctx.fillStyle = ok ? '#00e676' : '#ff5252'; ctx.fill();

    // Provider node
    ctx.beginPath(); ctx.arc(px,py,18,0,Math.PI*2);
    ctx.fillStyle = ok ? '#1a2a1a' : '#2a1a1a'; ctx.fill();
    ctx.strokeStyle = ok ? '#00e676' : '#ff5252';
    ctx.lineWidth = 2; ctx.stroke();

    ctx.fillStyle='#e4e5f1'; ctx.font='10px Inter,sans-serif'; ctx.textAlign='center';
    ctx.fillText(p.name,px,py+4);
  });
}

// ═══ USAGE ═══
async function loadUsage() {
  try {
    const provs = await fetch(API+'/8router/providers').then(r=>r.json());
    const health = await fetch(API+'/8router/health').then(r=>r.json());
    drawTopology(provs, health);
  } catch {}
}

// ═══ PROVIDERS ═══
async function loadProv() {
  try {
    const provs = await fetch(API+'/8router/providers').then(r=>r.json());
    document.getElementById('prov-tbody').innerHTML = provs.map(p =>
      '<tr><td><strong>'+p.name+'</strong> <span style="color:var(--text3);font-size:11px">('+p.id+')</span></td>'+
      '<td><span class="badge '+p.tier+'">'+p.tier+'</span></td>'+
      '<td><span class="badge healthy">● Active</span></td>'+
      '<td>'+(p.apiKeys?p.apiKeys.length:1)+' keys</td>'+
      '<td>'+(p.totalRequests||0).toLocaleString()+'</td>'+
      '<td>'+(p.totalTokens||0).toLocaleString()+'</td>'+
      '<td>'+(p.errors||0)+'</td></tr>'
    ).join('');
  } catch {}
}

// ═══ COMBOS ═══
async function loadCombos() {
  try {
    const combos = await fetch(API+'/8router/combos').then(r=>r.json());
    document.getElementById('combo-cards').innerHTML = combos.map(c =>
      '<div style="background:var(--bg3);border:1px solid var(--border);border-radius:12px;padding:20px;position:relative;overflow:hidden">'+
        '<div style="position:absolute;top:0;left:0;right:0;height:3px;background:linear-gradient(90deg,var(--accent),var(--cyan))"></div>'+
        '<h4 style="font-size:16px;color:var(--accent);margin-bottom:4px">🔗 '+c.name+'</h4>'+
        '<div style="font-size:12px;color:var(--text3);margin-bottom:16px">'+c.description+'</div>'+
        c.tiers.map((t,i) =>
          '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-top:1px solid var(--border)">'+
            '<div style="width:24px;height:24px;background:var(--bg4);border:1px solid var(--border);border-radius:6px;display:flex;align-items:center;justify-content:center;font-size:11px;color:var(--accent);font-weight:700">'+(i+1)+'</div>'+
            '<span style="font-weight:500">'+t.provider+'</span>'+
            '<span style="color:var(--text3)">→</span>'+
            '<span style="font-family:JetBrains Mono,monospace;font-size:12px;color:var(--text3)">'+t.model+'</span>'+
          '</div>'
        ).join('')+
      '</div>'
    ).join('');
  } catch {}
}

// ═══ QUOTA ═══
async function loadQuota() {
  try {
    const provs = await fetch(API+'/8router/providers').then(r=>r.json());
    document.getElementById('quota-grid').innerHTML = provs.map(p => {
      const reqs = p.totalRequests||0;
      const max = 1000;
      const pct = Math.min(100,Math.round(reqs/max*100));
      const color = pct>80?'var(--red)':pct>50?'var(--yellow)':'var(--green)';
      return '<div class="quota-card">'+
        '<div class="name"><span class="badge '+p.tier+'">'+p.tier+'</span> '+p.name+'</div>'+
        '<div class="quota-bar"><div class="quota-fill" style="width:'+pct+'%;background:'+color+'"></div></div>'+
        '<div class="quota-info"><span>'+reqs.toLocaleString()+' requests</span><span>'+pct+'%</span></div>'+
        '<div class="quota-reset">↻ Resets daily</div></div>';
    }).join('');
  } catch {}
}

// ═══ CONNECTIONS ═══
async function loadConns() {
  try {
    const c = await fetch(API+'/8router/connections').then(r=>r.json());
    document.getElementById('conn-tbody').innerHTML = c.map(x =>
      '<tr><td style="font-family:JetBrains Mono,monospace;font-size:11px">'+x.id.slice(0,12)+'...</td>'+
      '<td>'+x.provider+'</td><td>'+(x.name||'-')+'</td><td>'+x.authType+'</td>'+
      '<td><span class="badge '+(x.testStatus||'unknown')+'">'+(x.testStatus||'unknown')+'</span></td>'+
      '<td>'+(x.backoffLevel>0?'<span style="color:var(--yellow)">L'+x.backoffLevel+'</span>':'—')+'</td>'+
      '<td>'+(x.totalRequests||0)+'</td><td>'+(x.totalTokens||0).toLocaleString()+'</td>'+
      '<td>$'+(x.totalCost||0).toFixed(4)+'</td></tr>'
    ).join('');
  } catch {}
}

// ═══ SETTINGS ═══
async function loadSettings() {
  try {
    const info = await fetch(API+'/8router/info').then(r=>r.json());
    document.getElementById('sysinfo-tbody').innerHTML =
      '<tr><td style="color:var(--text3);width:140px">Name</td><td>'+info.name+'</td></tr>'+
      '<tr><td style="color:var(--text3)">Version</td><td>'+info.version+'</td></tr>'+
      '<tr><td style="color:var(--text3)">Description</td><td>'+info.description+'</td></tr>'+
      '<tr><td style="color:var(--text3)">Features</td><td>'+info.features.join(', ')+'</td></tr>';
  } catch {}
}

// ═══ CAVEMAN ═══
function setCaveman(v) {
  document.getElementById('caveman-val').textContent = v;
  const descs = ['Disabled — Normal responses','Mild — Short sentences','Medium — One-line answers','Aggressive — Keywords only','Extreme — Caveman grunts','Maximum — Classical Chinese compression'];
  document.getElementById('caveman-desc').textContent = descs[v];
  fetch(API+'/8router/caveman',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level:parseInt(v)})});
}

// Init
refresh();
// Close sidebar when clicking overlay
document.getElementById("sidebar-overlay").addEventListener("click", toggleSidebar);

setInterval(refresh, 5000);
</script>
</body>
</html>`;
}
