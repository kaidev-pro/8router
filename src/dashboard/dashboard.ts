// 8Router — Pro Dashboard v3
// Full-featured dashboard inspired by 9Router with topology, usage charts, combo cascade, etc.

import express from 'express';
import cors from 'cors';

export function createDashboard(apiPort: number): express.Express {
  const app = express();
  app.use(cors());

  app.get('/', (_req, res) => {
    res.send(getDashboardHTML(apiPort));
  });

  return app;
}

function getDashboardHTML(apiPort: number): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>8Router — AI Gateway</title>
  <style>
    :root {
      --bg-primary: #0b0d17;
      --bg-secondary: #111327;
      --bg-card: #161832;
      --bg-card-hover: #1c1f40;
      --bg-input: #1a1d3a;
      --border: #252850;
      --border-light: #2d3060;
      --text-primary: #e8e9f0;
      --text-secondary: #8b8ea8;
      --text-muted: #5a5d7a;
      --accent: #6c5ce7;
      --accent-light: #8577ed;
      --green: #00d68f;
      --green-dim: rgba(0,214,143,0.12);
      --red: #ff6b6b;
      --red-dim: rgba(255,107,107,0.12);
      --orange: #ffa94d;
      --orange-dim: rgba(255,169,77,0.12);
      --blue: #4dabf7;
      --blue-dim: rgba(77,171,247,0.12);
      --purple: #b197fc;
      --purple-dim: rgba(177,151,252,0.12);
      --cyan: #22d3ee;
      --cyan-dim: rgba(34,211,238,0.12);
      --yellow: #ffd43b;
      --sidebar-width: 220px;
    }
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif; background: var(--bg-primary); color: var(--text-primary); display:flex; min-height:100vh; }
    
    /* Sidebar */
    .sidebar { 
      width: var(--sidebar-width); background: var(--bg-secondary); border-right:1px solid var(--border);
      position: fixed; top:0; left:0; bottom:0; z-index:100; display:flex; flex-direction:column;
    }
    .sidebar-logo { 
      padding:20px; display:flex; align-items:center; gap:10px; 
      border-bottom:1px solid var(--border);
    }
    .sidebar-logo .bolt { font-size:24px; }
    .sidebar-logo span { font-size:18px; font-weight:700; color:var(--text-primary); }
    .sidebar-logo .version { font-size:10px; color:var(--text-muted); margin-left:auto; background:var(--bg-card); padding:2px 6px; border-radius:4px; }
    
    .sidebar-nav { flex:1; padding:12px 8px; }
    .nav-item { 
      display:flex; align-items:center; gap:10px; padding:10px 14px; border-radius:8px; 
      cursor:pointer; color:var(--text-secondary); font-size:13px; font-weight:500; transition:all .15s;
      margin-bottom:2px;
    }
    .nav-item:hover { background:var(--bg-card); color:var(--text-primary); }
    .nav-item.active { background:var(--accent); color:#fff; }
    .nav-item .icon { font-size:16px; width:20px; text-align:center; }
    .nav-item .badge-count { 
      margin-left:auto; background:var(--red); color:#fff; font-size:10px; 
      padding:1px 6px; border-radius:10px; font-weight:600;
    }
    
    .sidebar-footer { 
      padding:16px; border-top:1px solid var(--border); font-size:11px; color:var(--text-muted);
    }
    .sidebar-footer .status-dot { display:inline-block; width:6px; height:6px; border-radius:50%; margin-right:4px; }
    .sidebar-footer .status-dot.on { background:var(--green); }
    .sidebar-footer .status-dot.off { background:var(--red); }
    
    /* Main */
    .main { margin-left: var(--sidebar-width); flex:1; min-height:100vh; }
    
    /* Top Bar */
    .topbar { 
      height:56px; background:var(--bg-secondary); border-bottom:1px solid var(--border);
      display:flex; align-items:center; justify-content:space-between; padding:0 24px; position:sticky; top:0; z-index:50;
    }
    .topbar-left { display:flex; align-items:center; gap:12px; }
    .topbar-left h2 { font-size:15px; font-weight:600; }
    .topbar-right { display:flex; align-items:center; gap:16px; }
    .endpoint-pill { 
      background:var(--bg-card); border:1px solid var(--border); border-radius:20px;
      padding:5px 14px; font-size:11px; color:var(--accent-light); font-family:monospace;
      cursor:pointer; transition:all .15s;
    }
    .endpoint-pill:hover { border-color:var(--accent); }
    .connection-badge { 
      display:flex; align-items:center; gap:6px; font-size:12px; font-weight:500;
      padding:4px 10px; border-radius:20px;
    }
    .connection-badge.connected { background:var(--green-dim); color:var(--green); }
    .connection-badge.disconnected { background:var(--red-dim); color:var(--red); }
    
    /* Content */
    .content { padding:24px; }
    .page { display:none; }
    .page.active { display:block; }
    
    /* Stats Row */
    .stats-row { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; margin-bottom:24px; }
    .stat-card { 
      background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:16px;
      transition:all .15s;
    }
    .stat-card:hover { border-color:var(--border-light); background:var(--bg-card-hover); }
    .stat-card .label { font-size:10px; color:var(--text-muted); text-transform:uppercase; letter-spacing:1.2px; margin-bottom:6px; }
    .stat-card .value { font-size:26px; font-weight:700; }
    .stat-card .sub { font-size:11px; color:var(--text-muted); margin-top:4px; }
    .stat-card .value.blue { color:var(--blue); }
    .stat-card .value.green { color:var(--green); }
    .stat-card .value.orange { color:var(--orange); }
    .stat-card .value.purple { color:var(--purple); }
    .stat-card .value.red { color:var(--red); }
    .stat-card .value.cyan { color:var(--cyan); }
    
    /* Table */
    .section-header { display:flex; justify-content:space-between; align-items:center; margin-bottom:12px; }
    .section-header h3 { font-size:15px; font-weight:600; }
    .section-header .actions { display:flex; gap:8px; }
    .btn { 
      padding:6px 14px; border-radius:6px; font-size:12px; font-weight:500; cursor:pointer;
      border:1px solid var(--border); background:var(--bg-card); color:var(--text-primary); transition:all .15s;
    }
    .btn:hover { background:var(--bg-card-hover); border-color:var(--border-light); }
    .btn.primary { background:var(--accent); border-color:var(--accent); color:#fff; }
    .btn.primary:hover { background:var(--accent-light); }
    
    .table-wrap { 
      background:var(--bg-card); border:1px solid var(--border); border-radius:12px; overflow:hidden; margin-bottom:24px;
    }
    table { width:100%; border-collapse:collapse; }
    th { 
      background:var(--bg-secondary); padding:10px 16px; text-align:left;
      font-size:10px; text-transform:uppercase; letter-spacing:1.2px; color:var(--text-muted); font-weight:600;
    }
    td { padding:12px 16px; border-top:1px solid var(--border); font-size:13px; }
    tr:hover td { background:var(--bg-card-hover); }
    
    /* Badges */
    .badge { display:inline-flex; align-items:center; padding:3px 8px; border-radius:6px; font-size:11px; font-weight:600; gap:4px; }
    .badge.healthy { background:var(--green-dim); color:var(--green); }
    .badge.unhealthy { background:var(--red-dim); color:var(--red); }
    .badge.unknown { background:rgba(90,93,122,0.15); color:var(--text-muted); }
    .badge.subscription { background:var(--purple-dim); color:var(--purple); }
    .badge.cheap { background:var(--orange-dim); color:var(--orange); }
    .badge.free { background:var(--green-dim); color:var(--green); }
    .badge.active { background:var(--green-dim); color:var(--green); }
    .badge.ready { background:var(--orange-dim); color:var(--orange); }
    .badge.error { background:var(--red-dim); color:var(--red); }
    .badge .dot { width:5px; height:5px; border-radius:50%; }
    .badge .dot.green { background:var(--green); }
    .badge .dot.red { background:var(--red); }
    .badge .dot.orange { background:var(--orange); }
    
    /* Provider Topology (Simple Canvas) */
    .topology-container { 
      background:var(--bg-card); border:1px solid var(--border); border-radius:12px; 
      padding:20px; margin-bottom:24px; position:relative; overflow:hidden;
    }
    .topology-container h3 { font-size:14px; margin-bottom:16px; color:var(--text-secondary); }
    #topology-canvas { width:100%; height:300px; }
    
    /* Combo Cards */
    .combo-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(320px,1fr)); gap:16px; margin-bottom:24px; }
    .combo-card { 
      background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px;
      transition:all .15s; position:relative; overflow:hidden;
    }
    .combo-card:hover { border-color:var(--accent); background:var(--bg-card-hover); }
    .combo-card::before { 
      content:''; position:absolute; top:0; left:0; right:0; height:3px;
      background:linear-gradient(90deg, var(--accent), var(--cyan));
    }
    .combo-card h4 { font-size:16px; color:var(--accent-light); margin-bottom:4px; display:flex; align-items:center; gap:8px; }
    .combo-card h4 .combo-icon { font-size:20px; }
    .combo-card .desc { font-size:12px; color:var(--text-muted); margin-bottom:16px; }
    .combo-tier { 
      display:flex; align-items:center; gap:10px; padding:8px 0;
      border-top:1px solid var(--border); font-size:13px;
    }
    .combo-tier .priority { 
      width:24px; height:24px; background:var(--bg-secondary); border:1px solid var(--border);
      border-radius:6px; display:flex; align-items:center; justify-content:center;
      font-size:11px; color:var(--accent); font-weight:700; flex-shrink:0;
    }
    .combo-tier .arrow { color:var(--text-muted); font-size:10px; }
    .combo-tier .provider-name { color:var(--text-primary); font-weight:500; }
    .combo-tier .model-name { color:var(--text-muted); font-size:12px; font-family:monospace; }
    
    /* Provider Limit Cards */
    .limits-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(250px,1fr)); gap:16px; margin-bottom:24px; }
    .limit-card { 
      background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:16px;
    }
    .limit-card .provider-name { font-size:14px; font-weight:600; margin-bottom:12px; display:flex; align-items:center; gap:8px; }
    .limit-card .quota-bar { 
      width:100%; height:8px; background:var(--bg-primary); border-radius:4px; overflow:hidden; margin-bottom:8px;
    }
    .limit-card .quota-fill { height:100%; border-radius:4px; transition:width .3s; }
    .limit-card .quota-text { font-size:11px; color:var(--text-muted); display:flex; justify-content:space-between; }
    .limit-card .reset-timer { font-size:10px; color:var(--orange); margin-top:4px; }
    
    /* Usage Chart */
    .chart-container { 
      background:var(--bg-card); border:1px solid var(--border); border-radius:12px;
      padding:20px; margin-bottom:24px;
    }
    .chart-container h3 { font-size:14px; margin-bottom:16px; color:var(--text-secondary); }
    .chart-bars { display:flex; align-items:flex-end; gap:8px; height:160px; padding:0 10px; }
    .chart-bar-group { flex:1; display:flex; flex-direction:column; align-items:center; gap:4px; }
    .chart-bar { 
      width:100%; min-height:4px; border-radius:4px 4px 0 0; transition:height .3s;
      position:relative;
    }
    .chart-bar.input { background:var(--accent); }
    .chart-bar.output { background:var(--cyan); }
    .chart-label { font-size:10px; color:var(--text-muted); white-space:nowrap; }
    .chart-legend { display:flex; gap:16px; margin-top:12px; justify-content:center; }
    .chart-legend-item { display:flex; align-items:center; gap:4px; font-size:11px; color:var(--text-muted); }
    .chart-legend-dot { width:8px; height:8px; border-radius:2px; }
    
    /* Caveman Slider */
    .caveman-section { 
      background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:24px;
    }
    .caveman-section h3 { font-size:14px; margin-bottom:4px; }
    .caveman-section .desc { font-size:12px; color:var(--text-muted); margin-bottom:16px; }
    .slider-container { display:flex; align-items:center; gap:16px; }
    .caveman-slider { flex:1; -webkit-appearance:none; height:6px; background:var(--bg-primary); border-radius:3px; outline:none; }
    .caveman-slider::-webkit-slider-thumb { 
      -webkit-appearance:none; width:18px; height:18px; background:var(--accent); border-radius:50%; cursor:pointer;
      border:3px solid var(--bg-card);
    }
    .caveman-level { 
      font-size:28px; font-weight:700; color:var(--accent); min-width:40px; text-align:center;
    }
    .caveman-desc { font-size:12px; color:var(--text-secondary); margin-top:8px; }
    .caveman-levels { display:flex; justify-content:space-between; margin-top:8px; }
    .caveman-levels span { font-size:10px; color:var(--text-muted); }
    
    /* Feature Toggle */
    .toggle-grid { display:grid; grid-template-columns:repeat(auto-fit, minmax(280px,1fr)); gap:16px; margin-bottom:24px; }
    .toggle-card { 
      background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:16px;
      display:flex; justify-content:space-between; align-items:center;
    }
    .toggle-card .info h4 { font-size:13px; margin-bottom:2px; }
    .toggle-card .info p { font-size:11px; color:var(--text-muted); }
    .toggle-switch { 
      width:44px; height:24px; background:var(--bg-primary); border-radius:12px; cursor:pointer;
      position:relative; transition:background .2s; border:1px solid var(--border);
    }
    .toggle-switch.on { background:var(--accent); border-color:var(--accent); }
    .toggle-switch::after { 
      content:''; position:absolute; top:2px; left:2px; width:18px; height:18px; 
      background:#fff; border-radius:50%; transition:transform .2s;
    }
    .toggle-switch.on::after { transform:translateX(20px); }
    
    /* Request Log */
    .log-entry { 
      display:flex; align-items:center; gap:12px; padding:8px 16px; border-bottom:1px solid var(--border);
      font-size:12px; font-family:monospace;
    }
    .log-entry .time { color:var(--text-muted); min-width:80px; }
    .log-entry .method { color:var(--accent); min-width:50px; }
    .log-entry .model { color:var(--cyan); min-width:120px; }
    .log-entry .provider { color:var(--purple); min-width:100px; }
    .log-entry .status-ok { color:var(--green); }
    .log-entry .status-err { color:var(--red); }
    .log-entry .tokens { color:var(--text-muted); }
    
    /* Scrollbar */
    ::-webkit-scrollbar { width:6px; }
    ::-webkit-scrollbar-track { background:transparent; }
    ::-webkit-scrollbar-thumb { background:var(--border); border-radius:3px; }
    ::-webkit-scrollbar-thumb:hover { background:var(--border-light); }
    
    @media (max-width:1200px) { .stats-row { grid-template-columns:repeat(3,1fr); } }
    @media (max-width:768px) { 
      .sidebar { display:none; }
      .main { margin-left:0; }
      .stats-row { grid-template-columns:repeat(2,1fr); }
    }
  </style>
</head>
<body>
  <!-- SIDEBAR -->
  <div class="sidebar">
    <div class="sidebar-logo">
      <span class="bolt">⚡</span>
      <span>8Router</span>
      <span class="version">v0.2.0</span>
    </div>
    <div class="sidebar-nav">
      <div class="nav-item active" onclick="showPage('dashboard')">
        <span class="icon">📊</span> Dashboard
      </div>
      <div class="nav-item" onclick="showPage('providers')">
        <span class="icon">🔌</span> Providers
        <span class="badge-count" id="provider-count">0</span>
      </div>
      <div class="nav-item" onclick="showPage('combos')">
        <span class="icon">🔗</span> Combos
      </div>
      <div class="nav-item" onclick="showPage('usage')">
        <span class="icon">📈</span> Usage
      </div>
      <div class="nav-item" onclick="showPage('connections')">
        <span class="icon">🗄️</span> Connections
      </div>
      <div class="nav-item" onclick="showPage('logs')">
        <span class="icon">📝</span> Request Log
      </div>
      <div class="nav-item" onclick="showPage('settings')">
        <span class="icon">⚙️</span> Settings
      </div>
    </div>
    <div class="sidebar-footer">
      <div><span class="status-dot on" id="sidebar-status"></span> <span id="sidebar-status-text">Connected</span></div>
      <div style="margin-top:4px">8Agents Ecosystem</div>
    </div>
  </div>

  <!-- MAIN -->
  <div class="main">
    <div class="topbar">
      <div class="topbar-left">
        <h2 id="page-title">Dashboard</h2>
      </div>
      <div class="topbar-right">
        <div class="endpoint-pill" onclick="navigator.clipboard.writeText('http://localhost:${apiPort}/v1')" title="Click to copy">
          http://localhost:${apiPort}/v1
        </div>
        <div class="connection-badge disconnected" id="connection-badge">
          <span class="dot red"></span> Disconnected
        </div>
      </div>
    </div>

    <div class="content">
      <!-- ═══════ DASHBOARD PAGE ═══════ -->
      <div id="page-dashboard" class="page active">
        <div class="stats-row" id="stats-grid">
          <div class="stat-card">
            <div class="label">Total Requests</div>
            <div class="value blue" id="s-req">0</div>
            <div class="sub">All time</div>
          </div>
          <div class="stat-card">
            <div class="label">Tokens Used</div>
            <div class="value green" id="s-tokens">0</div>
            <div class="sub">Input + Output</div>
          </div>
          <div class="stat-card">
            <div class="label">Fallbacks</div>
            <div class="value orange" id="s-fallbacks">0</div>
            <div class="sub">Auto-recovery</div>
          </div>
          <div class="stat-card">
            <div class="label">RTK Saved</div>
            <div class="value purple" id="s-rtk">0</div>
            <div class="sub">Tokens compressed</div>
          </div>
          <div class="stat-card">
            <div class="label">Success Rate</div>
            <div class="value green" id="s-rate">100%</div>
            <div class="sub" id="s-rate-sub">0 ok / 0 fail</div>
          </div>
          <div class="stat-card">
            <div class="label">Uptime</div>
            <div class="value cyan" id="s-uptime">0s</div>
            <div class="sub">Since start</div>
          </div>
        </div>

        <!-- Topology -->
        <div class="topology-container">
          <h3>Provider Topology</h3>
          <canvas id="topology-canvas"></canvas>
        </div>

        <!-- Provider Limits -->
        <div class="section-header">
          <h3>Provider Quotas</h3>
        </div>
        <div class="limits-grid" id="limits-grid"></div>

        <!-- Providers Table -->
        <div class="section-header">
          <h3>Active Providers</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Provider</th><th>Tier</th><th>Status</th><th>Requests</th><th>Tokens</th><th>Avg Latency</th><th>Errors</th></tr></thead>
            <tbody id="providers-body"></tbody>
          </table>
        </div>

        <!-- Models Table -->
        <div class="section-header">
          <h3>Available Models</h3>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Model</th><th>Providers</th><th>Type</th></tr></thead>
            <tbody id="models-body"></tbody>
          </table>
        </div>
      </div>

      <!-- ═══════ PROVIDERS PAGE ═══════ -->
      <div id="page-providers" class="page">
        <div class="section-header">
          <h3>All Provider Connections</h3>
          <div class="actions"><button class="btn primary" onclick="loadAllProviders()">Refresh</button></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Name</th><th>Provider</th><th>Tier</th><th>API Key</th><th>Status</th><th>Requests</th><th>Tokens</th><th>Errors</th></tr></thead>
            <tbody id="all-providers-body"></tbody>
          </table>
        </div>
      </div>

      <!-- ═══════ COMBOS PAGE ═══════ -->
      <div id="page-combos" class="page">
        <div class="section-header">
          <h3>Named Combos — Fallback Chains</h3>
          <div class="actions"><button class="btn primary" onclick="loadCombos()">Refresh</button></div>
        </div>
        <p style="color:var(--text-muted);font-size:13px;margin-bottom:20px">
          Combos let you use a single model name that automatically falls back through a chain of providers.
          Use a combo name as the <code style="background:var(--bg-card);padding:2px 6px;border-radius:4px">model</code> parameter in your API requests.
        </p>
        <div class="combo-grid" id="combos-grid"></div>
      </div>

      <!-- ═══════ USAGE PAGE ═══════ -->
      <div id="page-usage" class="page">
        <div class="section-header">
          <h3>Usage Analytics</h3>
          <div class="actions">
            <button class="btn" onclick="loadUsage(7)">7 Days</button>
            <button class="btn" onclick="loadUsage(14)">14 Days</button>
            <button class="btn" onclick="loadUsage(30)">30 Days</button>
          </div>
        </div>
        
        <div class="chart-container">
          <h3>Daily Token Usage</h3>
          <div class="chart-bars" id="usage-chart"></div>
          <div class="chart-legend">
            <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--accent)"></div> Input Tokens</div>
            <div class="chart-legend-item"><div class="chart-legend-dot" style="background:var(--cyan)"></div> Output Tokens</div>
          </div>
        </div>
        
        <div class="table-wrap">
          <table>
            <thead><tr><th>Date</th><th>Requests</th><th>Input Tokens</th><th>Output Tokens</th><th>Cost</th><th>Errors</th></tr></thead>
            <tbody id="usage-table-body"></tbody>
          </table>
        </div>
      </div>

      <!-- ═══════ CONNECTIONS PAGE ═══════ -->
      <div id="page-connections" class="page">
        <div class="section-header">
          <h3>Database Connections</h3>
          <div class="actions"><button class="btn primary" onclick="loadConnections()">Refresh</button></div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>ID</th><th>Provider</th><th>Name</th><th>Auth</th><th>Status</th><th>Backoff</th><th>Requests</th><th>Tokens</th><th>Cost</th></tr></thead>
            <tbody id="connections-body"></tbody>
          </table>
        </div>
      </div>

      <!-- ═══════ LOGS PAGE ═══════ -->
      <div id="page-logs" class="page">
        <div class="section-header">
          <h3>Request Log</h3>
          <div class="actions"><button class="btn" onclick="loadLogs()">Refresh</button></div>
        </div>
        <div class="table-wrap" style="max-height:600px;overflow-y:auto">
          <div id="logs-container"></div>
        </div>
      </div>

      <!-- ═══════ SETTINGS PAGE ═══════ -->
      <div id="page-settings" class="page">
        <div class="section-header"><h3>Caveman Mode</h3></div>
        <div class="caveman-section">
          <h3>Output Token Compression</h3>
          <div class="desc">Makes LLM responses terse to save output tokens. Stackable with RTK compression.</div>
          <div class="slider-container">
            <input type="range" min="0" max="5" value="0" class="caveman-slider" id="caveman-slider" oninput="updateCaveman(this.value)">
            <div class="caveman-level" id="caveman-level">0</div>
          </div>
          <div class="caveman-desc" id="caveman-desc">Disabled — Normal responses</div>
          <div class="caveman-levels">
            <span>0:Off</span><span>1:Mild</span><span>2:Medium</span><span>3:Aggressive</span><span>4:Extreme</span><span>5:Max</span>
          </div>
        </div>

        <div class="section-header"><h3>Features</h3></div>
        <div class="toggle-grid">
          <div class="toggle-card">
            <div class="info"><h4>RTK Compression</h4><p>Compress tool output (git diff, grep, tree)</p></div>
            <div class="toggle-switch on" id="toggle-rtk"></div>
          </div>
          <div class="toggle-card">
            <div class="info"><h4>Circuit Breaker</h4><p>Auto-disable failing providers</p></div>
            <div class="toggle-switch on" id="toggle-circuit"></div>
          </div>
          <div class="toggle-card">
            <div class="info"><h4>Streaming</h4><p>SSE streaming for chat completions</p></div>
            <div class="toggle-switch on" id="toggle-stream"></div>
          </div>
          <div class="toggle-card">
            <div class="info"><h4>Model Locks</h4><p>Prevent concurrent requests to same key</p></div>
            <div class="toggle-switch on" id="toggle-locks"></div>
          </div>
        </div>

        <div class="section-header"><h3>System Info</h3></div>
        <div class="table-wrap">
          <table>
            <tbody id="system-info-body"></tbody>
          </table>
        </div>
      </div>
    </div>
  </div>

  <script>
    const API = '';
    let currentPage = 'dashboard';

    // ═══════ NAVIGATION ═══════
    function showPage(name) {
      currentPage = name;
      document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
      document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));
      document.getElementById('page-' + name).classList.add('active');
      event.currentTarget.classList.add('active');
      
      const titles = {dashboard:'Dashboard',providers:'Providers',combos:'Combos',usage:'Usage Analytics',connections:'Connections',logs:'Request Log',settings:'Settings'};
      document.getElementById('page-title').textContent = titles[name] || name;
      
      const loaders = {providers:loadAllProviders,combos:loadCombos,usage:()=>loadUsage(7),connections:loadConnections,logs:loadLogs,settings:loadSettings};
      if (loaders[name]) loaders[name]();
    }

    // ═══════ DASHBOARD ═══════
    async function refresh() {
      try {
        const [statsRes, providersRes, healthRes, modelsRes] = await Promise.all([
          fetch(API+'/8router/stats').then(r=>r.json()),
          fetch(API+'/8router/providers').then(r=>r.json()),
          fetch(API+'/8router/health').then(r=>r.json()),
          fetch(API+'/8router/models').then(r=>r.json()),
        ]);

        const stats = statsRes.session || statsRes;
        const allTime = statsRes.allTime || {};
        const total = (allTime.totalRequests||0);
        const ok = (allTime.successfulRequests||0);
        const fail = (allTime.failedRequests||0);

        document.getElementById('s-req').textContent = total.toLocaleString();
        document.getElementById('s-tokens').textContent = (allTime.totalTokens||stats.totalTokens||0).toLocaleString();
        document.getElementById('s-fallbacks').textContent = (stats.fallbackCount||0).toLocaleString();
        document.getElementById('s-rtk').textContent = (stats.compressionSaved||0).toLocaleString();
        document.getElementById('s-rate').textContent = total > 0 ? Math.round(ok/total*100)+'%' : '100%';
        document.getElementById('s-rate-sub').textContent = ok + ' ok / ' + fail + ' fail';
        document.getElementById('s-uptime').textContent = formatUptime(stats.uptime||0);

        const healthMap = Object.fromEntries((healthRes||[]).map(h=>[h.providerId,h]));
        const provStats = allTime.providerStats||stats.providerStats||{};

        document.getElementById('provider-count').textContent = providersRes.length;

        // Providers table
        document.getElementById('providers-body').innerHTML = providersRes.map(p => {
          const h = healthMap[p.id]||{};
          const ps = provStats[p.id]||{};
          const statusClass = h.healthy!==false ? 'healthy' : 'unhealthy';
          const statusText = h.healthy!==false ? 'Healthy' : 'Circuit Open';
          return '<tr><td><strong>'+p.name+'</strong> <span style="color:var(--text-muted);font-size:11px">('+p.id+')</span></td>'+
            '<td><span class="badge '+p.tier+'">'+p.tier+'</span></td>'+
            '<td><span class="badge '+statusClass+'"><span class="dot '+(h.healthy!==false?'green':'red')+'"></span> '+statusText+'</span></td>'+
            '<td>'+(ps.requests||0).toLocaleString()+'</td>'+
            '<td>'+(ps.tokens||0).toLocaleString()+'</td>'+
            '<td>'+(h.avgLatencyMs?Math.round(h.avgLatencyMs)+'ms':'-')+'</td>'+
            '<td>'+(ps.errors||0)+'</td></tr>';
        }).join('');

        // Models table
        document.getElementById('models-body').innerHTML = modelsRes.map(m =>
          '<tr><td><code style="color:var(--cyan)">'+m.id+'</code></td>'+
          '<td>'+m.providers.join(', ')+'</td>'+
          '<td><span class="badge '+(m.providers[0]==='combo'?'free':'cheap')+'">'+(m.providers[0]==='combo'?'Combo':'Model')+'</span></td></tr>'
        ).join('');

        // Provider limits (estimated)
        renderProviderLimits(providersRes, provStats);

        // Topology
        drawTopology(providersRes, healthRes||[]);

        // Status
        document.getElementById('connection-badge').className = 'connection-badge connected';
        document.getElementById('connection-badge').innerHTML = '<span class="dot green"></span> Connected';
        document.getElementById('sidebar-status').className = 'status-dot on';
        document.getElementById('sidebar-status-text').textContent = 'Connected';
      } catch(err) {
        document.getElementById('connection-badge').className = 'connection-badge disconnected';
        document.getElementById('connection-badge').innerHTML = '<span class="dot red"></span> Disconnected';
        document.getElementById('sidebar-status').className = 'status-dot off';
        document.getElementById('sidebar-status-text').textContent = 'Disconnected';
      }
    }

    function formatUptime(ms) {
      const s = Math.floor(ms/1000);
      if (s < 60) return s+'s';
      if (s < 3600) return Math.floor(s/60)+'m '+s%60+'s';
      return Math.floor(s/3600)+'h '+Math.floor(s%3600/60)+'m';
    }

    // ═══════ PROVIDER LIMITS ═══════
    function renderProviderLimits(providers, stats) {
      const grid = document.getElementById('limits-grid');
      grid.innerHTML = providers.map(p => {
        const ps = stats[p.id]||{};
        const reqs = ps.requests||0;
        const maxReqs = 1000;
        const pct = Math.min(100, Math.round(reqs/maxReqs*100));
        const color = pct > 80 ? 'var(--red)' : pct > 50 ? 'var(--orange)' : 'var(--green)';
        return '<div class="limit-card">'+
          '<div class="provider-name"><span class="badge '+p.tier+'">'+p.tier+'</span> '+p.name+'</div>'+
          '<div class="quota-bar"><div class="quota-fill" style="width:'+pct+'%;background:'+color+'"></div></div>'+
          '<div class="quota-text"><span>'+reqs.toLocaleString()+' requests</span><span>'+pct+'%</span></div>'+
          '</div>';
      }).join('');
    }

    // ═══════ TOPOLOGY ═══════
    function drawTopology(providers, health) {
      const canvas = document.getElementById('topology-canvas');
      if (!canvas) return;
      const ctx = canvas.getContext('2d');
      const W = canvas.parentElement.clientWidth - 40;
      const H = 300;
      canvas.width = W;
      canvas.height = H;
      ctx.clearRect(0,0,W,H);

      const cx = W/2, cy = H/2;
      
      // Draw center node (8Router)
      ctx.beginPath();
      ctx.arc(cx, cy, 30, 0, Math.PI*2);
      ctx.fillStyle = '#6c5ce7';
      ctx.fill();
      ctx.fillStyle = '#fff';
      ctx.font = 'bold 11px Inter, sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('8Router', cx, cy+4);

      // Draw provider nodes
      const n = providers.length;
      const radius = Math.min(W,H)/2 - 50;
      providers.forEach((p, i) => {
        const angle = (i/n) * Math.PI * 2 - Math.PI/2;
        const px = cx + Math.cos(angle) * radius;
        const py = cy + Math.sin(angle) * radius;
        
        // Line
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.lineTo(px, py);
        ctx.strokeStyle = '#252850';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Node
        const h = health.find(x=>x.providerId===p.id);
        const healthy = !h || h.healthy!==false;
        ctx.beginPath();
        ctx.arc(px, py, 20, 0, Math.PI*2);
        ctx.fillStyle = healthy ? '#1a3a2a' : '#3a1a1a';
        ctx.fill();
        ctx.strokeStyle = healthy ? '#00d68f' : '#ff6b6b';
        ctx.lineWidth = 2;
        ctx.stroke();

        // Label
        ctx.fillStyle = '#e8e9f0';
        ctx.font = '10px Inter, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText(p.name, px, py+4);
      });
    }

    // ═══════ ALL PROVIDERS ═══════
    async function loadAllProviders() {
      try {
        const res = await fetch(API+'/8router/providers').then(r=>r.json());
        document.getElementById('all-providers-body').innerHTML = res.map(p =>
          '<tr><td style="font-family:monospace;font-size:11px">'+p.id+'</td>'+
          '<td><strong>'+p.name+'</strong></td>'+
          '<td>'+p.provider+'</td>'+
          '<td><span class="badge '+p.tier+'">'+p.tier+'</span></td>'+
          '<td style="font-family:monospace;font-size:11px">'+(p.apiKey||'***')+'</td>'+
          '<td><span class="badge healthy">active</span></td>'+
          '<td>'+(p.totalRequests||0)+'</td>'+
          '<td>'+(p.totalTokens||0).toLocaleString()+'</td>'+
          '<td>'+(p.errors||0)+'</td></tr>'
        ).join('');
      } catch {}
    }

    // ═══════ COMBOS ═══════
    async function loadCombos() {
      try {
        const combos = await fetch(API+'/8router/combos').then(r=>r.json());
        const icons = {MIMO:'🤖',Groq:'⚡',Mistral:'🌊',OpenRouter:'🔀',Free:'🆓',Cheap:'💰'};
        document.getElementById('combos-grid').innerHTML = combos.map(c =>
          '<div class="combo-card">'+
            '<h4><span class="combo-icon">'+(icons[c.name]||'🔗')+'</span> '+c.name+'</h4>'+
            '<div class="desc">'+c.description+'</div>'+
            c.tiers.map((t,i) =>
              '<div class="combo-tier">'+
                '<div class="priority">'+(i+1)+'</div>'+
                '<span class="provider-name">'+t.provider+'</span>'+
                '<span class="arrow">→</span>'+
                '<span class="model-name">'+t.model+'</span>'+
              '</div>'
            ).join('')+
          '</div>'
        ).join('');
      } catch {}
    }

    // ═══════ USAGE ═══════
    async function loadUsage(days) {
      try {
        const usage = await fetch(API+'/8router/usage?days='+days).then(r=>r.json());
        
        // Chart
        const maxTokens = Math.max(1, ...usage.map(u=>(u.inputTokens||0)+(u.outputTokens||0)));
        document.getElementById('usage-chart').innerHTML = usage.reverse().map(u => {
          const inH = Math.max(4, (u.inputTokens||0)/maxTokens*140);
          const outH = Math.max(4, (u.outputTokens||0)/maxTokens*140);
          return '<div class="chart-bar-group">'+
            '<div style="display:flex;gap:2px;align-items:flex-end;height:150px">'+
              '<div class="chart-bar input" style="height:'+inH+'px;width:16px"></div>'+
              '<div class="chart-bar output" style="height:'+outH+'px;width:16px"></div>'+
            '</div>'+
            '<div class="chart-label">'+(u.date||'').slice(5)+'</div>'+
          '</div>';
        }).join('');

        // Table
        document.getElementById('usage-table-body').innerHTML = usage.reverse().map(u =>
          '<tr><td>'+u.date+'</td>'+
          '<td>'+(u.requests||0).toLocaleString()+'</td>'+
          '<td>'+(u.inputTokens||0).toLocaleString()+'</td>'+
          '<td>'+(u.outputTokens||0).toLocaleString()+'</td>'+
          '<td>$'+(u.cost||0).toFixed(4)+'</td>'+
          '<td>'+(u.errors||0)+'</td></tr>'
        ).join('');
      } catch {}
    }

    // ═══════ CONNECTIONS ═══════
    async function loadConnections() {
      try {
        const conns = await fetch(API+'/8router/connections').then(r=>r.json());
        document.getElementById('connections-body').innerHTML = conns.map(c =>
          '<tr><td style="font-family:monospace;font-size:11px">'+c.id.slice(0,16)+'</td>'+
          '<td>'+c.provider+'</td>'+
          '<td>'+(c.name||'-')+'</td>'+
          '<td>'+c.authType+'</td>'+
          '<td><span class="badge '+(c.testStatus||'unknown')+'">'+(c.testStatus||'unknown')+'</span></td>'+
          '<td>'+(c.backoffLevel>0?'<span style="color:var(--orange)">L'+c.backoffLevel+'</span>':'-')+'</td>'+
          '<td>'+(c.totalRequests||0).toLocaleString()+'</td>'+
          '<td>'+(c.totalTokens||0).toLocaleString()+'</td>'+
          '<td>$'+(c.totalCost||0).toFixed(4)+'</td></tr>'
        ).join('');
      } catch {}
    }

    // ═══════ LOGS ═══════
    async function loadLogs() {
      // Show recent requests from stats (since we don't have per-request log endpoint yet)
      document.getElementById('logs-container').innerHTML = 
        '<div style="padding:40px;text-align:center;color:var(--text-muted)">'+
          '<p style="font-size:14px;margin-bottom:8px">Request logging is active</p>'+
          '<p style="font-size:12px">All requests are tracked in SQLite database</p>'+
          '<p style="font-size:12px;margin-top:12px">View stats in <strong>Usage</strong> tab for detailed analytics</p>'+
        '</div>';
    }

    // ═══════ SETTINGS ═══════
    async function loadSettings() {
      try {
        const caveman = await fetch(API+'/8router/caveman').then(r=>r.json());
        document.getElementById('caveman-slider').value = caveman.level;
        document.getElementById('caveman-level').textContent = caveman.level;
        updateCavemanDesc(caveman.level);

        const info = await fetch(API+'/8router/info').then(r=>r.json());
        document.getElementById('system-info-body').innerHTML = 
          '<tr><td style="color:var(--text-muted);width:140px">Name</td><td>'+info.name+'</td></tr>'+
          '<tr><td style="color:var(--text-muted)">Version</td><td>'+info.version+'</td></tr>'+
          '<tr><td style="color:var(--text-muted)">Description</td><td>'+info.description+'</td></tr>'+
          '<tr><td style="color:var(--text-muted)">Features</td><td>'+info.features.join(', ')+'</td></tr>'+
          Object.entries(info.endpoints).map(([k,v]) =>
            '<tr><td style="color:var(--text-muted)">'+k+'</td><td style="font-family:monospace;font-size:12px">'+v+'</td></tr>'
          ).join('');
      } catch {}
    }

    function updateCaveman(level) {
      level = parseInt(level);
      document.getElementById('caveman-level').textContent = level;
      updateCavemanDesc(level);
      fetch(API+'/8router/caveman',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({level})});
    }
    function updateCavemanDesc(level) {
      const descs = ['Disabled — Normal responses','Mild — Short sentences','Medium — One-line answers',
                     'Aggressive — Keywords only','Extreme — Caveman grunts','Maximum — Classical Chinese compression'];
      document.getElementById('caveman-desc').textContent = descs[level]||'Unknown';
    }

    // Init
    refresh();
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;
}
