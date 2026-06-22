import express from 'express';
import cors from 'cors';

export function getDashboardHTML(_engineOrPort?: any, apiPort?: number): string {
  // Support both createDashboard(port) and createDashboard(engine, port)
  const port = typeof apiPort === 'number' ? apiPort : (typeof _engineOrPort === 'number' ? _engineOrPort : 8081);
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>8Router — Command Center</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
:root{
--bg-primary:#020309;--bg-secondary:#0c111f;--bg-card:#060911;--bg-card-hover:#0e1525;
--bg-input:#111524;--border:#1a2135;--border-light:#252d45;
--text-primary:#f2f2f2;--text-secondary:#8a8f9c;--text-muted:#5a6070;
--accent:#84abff;--accent-hover:#9dbdff;--accent-dim:rgba(132,171,255,0.12);
--green:#00d294;--green-dim:rgba(0,210,148,0.12);
--red:#ff6568;--red-dim:rgba(255,101,104,0.12);
--orange:#e18528;--orange-dim:rgba(225,133,40,0.12);
--blue:#84abff;--purple:#6c5594;--purple-dim:rgba(108,85,148,0.12);
--cyan:#009399;--cyan-dim:rgba(0,147,153,0.12);
--yellow:#fcbb00;
--sidebar-w:56px;--sidebar-expanded:200px;
--font-body:'Inter',system-ui,-apple-system,sans-serif;
--font-mono:'JetBrains Mono','SF Mono','Cascadia Code',monospace;
}
html{font-size:13px;-webkit-font-smoothing:antialiased;-moz-osx-font-smoothing:grayscale}
body{
font-family:var(--font-body);color:var(--text-primary);background:var(--bg-primary);
background-image:linear-gradient(rgba(26,33,53,0.3) 1px,transparent 1px),
                  linear-gradient(90deg,rgba(26,33,53,0.3) 1px,transparent 1px);
background-size:48px 48px;min-height:100vh;display:flex;
}
body::before{
content:'';position:fixed;inset:0;z-index:9999;pointer-events:none;opacity:.025;
background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='256' height='256'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)'/%3E%3C/svg%3E");
background-repeat:repeat;background-size:256px;
}

/* SIDEBAR */
.sidebar{
position:fixed;left:0;top:0;bottom:0;width:var(--sidebar-w);background:var(--bg-secondary);
border-right:1px solid var(--border);display:flex;flex-direction:column;z-index:100;
transition:width .2s ease;overflow:hidden;
}
.sidebar:hover{width:var(--sidebar-expanded)}
.sidebar-logo{
display:flex;align-items:center;gap:10px;height:56px;padding:0 16px;
border-bottom:1px solid var(--border);flex-shrink:0;white-space:nowrap;overflow:hidden;
}
.sidebar-logo svg{width:24px;height:24px;flex-shrink:0;color:var(--accent)}
.sidebar-logo span{font-size:15px;font-weight:700;color:var(--text-primary);opacity:0;transition:opacity .2s}
.sidebar:hover .sidebar-logo span{opacity:1}
.sidebar nav{flex:1;display:flex;flex-direction:column;padding:8px;gap:2px}
.nav-item{
display:flex;align-items:center;gap:12px;height:40px;padding:0 14px;border-radius:8px;
color:var(--text-secondary);cursor:pointer;transition:all .15s ease;white-space:nowrap;
overflow:hidden;text-decoration:none;font-size:13px;font-weight:500;
}
.nav-item svg{width:18px;height:18px;flex-shrink:0;opacity:.7}
.nav-item:hover{background:var(--accent-dim);color:var(--text-primary)}
.nav-item:hover svg{opacity:1}
.nav-item.active{background:var(--accent-dim);color:var(--accent)}
.nav-item.active svg{opacity:1;color:var(--accent)}
.nav-item .nav-label{opacity:0;transition:opacity .2s}
.sidebar:hover .nav-item .nav-label{opacity:1}
.sidebar-footer{
padding:8px;border-top:1px solid var(--border);flex-shrink:0;
}
#sidebar-status{
display:flex;align-items:center;gap:8px;padding:0 14px;height:36px;
font-family:var(--font-mono);font-size:11px;color:var(--text-muted);overflow:hidden;
}
#sidebar-status::before{content:'';width:6px;height:6px;border-radius:50%;background:var(--green);flex-shrink:0}
#sidebar-status-text{white-space:nowrap;opacity:0;transition:opacity .2s}
.sidebar:hover #sidebar-status-text{opacity:1}

/* HAMBURGER (mobile) */
.hamburger{display:none;position:fixed;top:12px;left:12px;z-index:200;
width:40px;height:40px;background:var(--bg-secondary);border:1px solid var(--border);
border-radius:8px;align-items:center;justify-content:center;cursor:pointer;color:var(--text-primary)}
.hamburger svg{width:20px;height:20px}

/* MAIN CONTENT */
.main{margin-left:var(--sidebar-w);flex:1;min-height:100vh;padding:0}
.content{padding:24px 28px;max-width:1400px;margin:0 auto}

/* PAGE HEADER */
.page-header{display:flex;align-items:baseline;gap:16px;margin-bottom:20px}
#page-title{
font-size:clamp(28px,3vw,40px);font-weight:700;letter-spacing:-0.04em;
color:var(--text-primary);line-height:1.1;
}
.endpoint-badge{
font-family:var(--font-mono);font-size:11px;color:var(--text-muted);
background:var(--bg-card);border:1px solid var(--border);padding:3px 10px;border-radius:20px;
}

/* STATUS BAR */
.status-bar{
background:var(--bg-secondary);border:1px solid var(--border);border-radius:6px;
padding:8px 16px;margin-bottom:20px;
display:flex;align-items:center;gap:0;overflow-x:auto;
font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);
}
.status-bar .sep{color:var(--border-light);margin:0 10px;user-select:none}
.status-bar .metric-label{color:var(--text-muted);margin-right:4px}
.status-bar .metric-val{color:var(--text-primary)}

/* BENTO GRID */
.bento{display:grid;grid-template-columns:repeat(12,1fr);gap:12px;margin-bottom:12px}
.bento-cell{
background:var(--bg-card);border:1px solid var(--border);border-radius:8px;
padding:14px 16px;transition:background .15s ease;overflow:hidden;
}
.bento-cell:hover{background:var(--bg-card-hover)}
.bento-cell.span8{grid-column:span 8}
.bento-cell.span7{grid-column:span 7}
.bento-cell.span5{grid-column:span 5}
.bento-cell.span4{grid-column:span 4}
.bento-cell.span12{grid-column:span 12}
.cell-title{
font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
color:var(--text-muted);margin-bottom:10px;display:flex;align-items:center;gap:6px;
}
.cell-title .dot{width:6px;height:6px;border-radius:50%;background:var(--green)}

/* PROVIDER HEALTH ROWS */
.provider-row{
display:flex;align-items:center;gap:10px;padding:6px 0;
border-bottom:1px solid rgba(26,33,53,0.4);
}
.provider-row:last-child{border-bottom:none}
.provider-row .p-name{flex:1;font-size:12px;color:var(--text-primary);min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.provider-row .p-dot{width:7px;height:7px;border-radius:50%;flex-shrink:0}
.provider-row .p-dot.ok{background:var(--green);box-shadow:0 0 6px rgba(0,210,148,0.4)}
.provider-row .p-dot.warn{background:var(--orange);box-shadow:0 0 6px rgba(225,133,40,0.3)}
.provider-row .p-dot.err{background:var(--red);box-shadow:0 0 6px rgba(255,101,104,0.3)}
.provider-row .p-latency{font-family:var(--font-mono);font-size:11px;color:var(--text-muted);width:52px;text-align:right}
.provider-row .p-reqs{font-family:var(--font-mono);font-size:11px;color:var(--text-secondary);width:60px;text-align:right}
@keyframes pulse-green{0%,100%{opacity:1}50%{opacity:.5}}
.p-dot.ok{animation:pulse-green 2s ease-in-out infinite}

/* QUICK STATS TERMINAL */
.stat-readout{padding:4px 0;display:flex;justify-content:space-between;align-items:baseline;border-bottom:1px solid rgba(26,33,53,0.3)}
.stat-readout:last-child{border-bottom:none}
.stat-readout .sr-label{font-size:11px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.04em}
.stat-readout .sr-val{font-family:var(--font-mono);font-size:14px;font-weight:600;color:var(--accent)}

/* SPARKLINE */
.sparkline-container{height:100px;margin-top:4px}
.sparkline-container svg{width:100%;height:100%}
.sparkline-line{fill:none;stroke:var(--accent);stroke-width:1.5}
.sparkline-area{fill:url(#sparkGrad);opacity:.3}

/* QUOTA BARS */
.quota-item{margin-bottom:10px}
.quota-item:last-child{margin-bottom:0}
.quota-header{display:flex;justify-content:space-between;margin-bottom:4px}
.quota-header .q-name{font-size:12px;color:var(--text-secondary)}
.quota-header .q-pct{font-family:var(--font-mono);font-size:11px;color:var(--text-muted)}
.quota-bar{height:4px;background:var(--bg-input);border-radius:2px;overflow:hidden}
.quota-bar-fill{height:100%;border-radius:2px;transition:width .4s ease}

/* MODEL PILLS */
.models-wrap{display:flex;flex-wrap:wrap;gap:6px}
.model-pill{
font-family:var(--font-mono);font-size:11px;padding:4px 10px;
background:var(--bg-input);border:1px solid var(--border);border-radius:20px;
color:var(--text-secondary);transition:all .15s;cursor:default;white-space:nowrap;
}
.model-pill:hover{background:var(--accent-dim);color:var(--accent);border-color:var(--accent)}

/* GENERIC TABLE */
table{width:100%;border-collapse:collapse}
th{
font-size:10px;font-weight:600;text-transform:uppercase;letter-spacing:0.08em;
color:var(--text-muted);text-align:left;padding:8px 12px;
border-bottom:1px solid var(--border);font-family:var(--font-mono);
}
td{
padding:8px 12px;font-size:12px;color:var(--text-secondary);
border-bottom:1px solid rgba(26,33,53,0.3);
}
td.mono{font-family:var(--font-mono);font-size:11px}
tr:hover td{background:var(--bg-card-hover)}

/* GRID LAYOUTS */
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:16px}
.grid-3{display:grid;grid-template-columns:1fr 1fr 1fr;gap:16px}
.card{
background:var(--bg-card);border:1px solid var(--border);border-radius:8px;
padding:16px;transition:background .15s;
}
.card:hover{background:var(--bg-card-hover)}
.card-title{
font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:0.06em;
color:var(--text-muted);margin-bottom:12px;
}

/* COMBOS GRID */
#combos-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(280px,1fr));gap:12px}
.combo-card{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:14px 16px;transition:background .15s}
.combo-card:hover{background:var(--bg-card-hover)}
.combo-card h3{font-size:14px;font-weight:600;color:var(--text-primary);margin-bottom:8px}
.combo-card p{font-size:12px;color:var(--text-secondary);line-height:1.5}

/* CHART */
#usage-chart{width:100%;height:220px}

/* LOGS */
#logs-container{
font-family:var(--font-mono);font-size:11px;line-height:1.6;
max-height:60vh;overflow-y:auto;background:var(--bg-card);border:1px solid var(--border);
border-radius:8px;padding:12px 16px;color:var(--text-secondary);
}
#logs-container .log-line{padding:1px 0;white-space:pre-wrap;word-break:break-all}
#logs-container .log-line .log-ts{color:var(--text-muted)}
#logs-container .log-line .log-err{color:var(--red)}

/* TOPOLOGY (used in providers page) */
#topology-canvas{width:100%;height:300px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px}

/* SETTINGS */
#system-info-body{font-family:var(--font-mono);font-size:12px;color:var(--text-secondary)}
#system-info-body tr:hover td{background:transparent}
#limits-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:12px}
.toggle-row{
display:flex;align-items:center;justify-content:space-between;padding:10px 0;
border-bottom:1px solid rgba(26,33,53,0.3);
}
.toggle-row:last-child{border-bottom:none}
.toggle-label{font-size:13px;color:var(--text-secondary)}
.toggle{
width:36px;height:20px;background:var(--bg-input);border:1px solid var(--border);
border-radius:10px;position:relative;cursor:pointer;transition:all .2s;
}
.toggle.on{background:var(--accent-dim);border-color:var(--accent)}
.toggle::after{
content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;
border-radius:50%;background:var(--text-muted);transition:all .2s;
}
.toggle.on::after{left:18px;background:var(--accent)}
.slider-container{padding:10px 0}
.slider-container label{font-size:12px;color:var(--text-secondary);display:block;margin-bottom:8px}
input[type=range]{
width:100%;height:4px;-webkit-appearance:none;background:var(--bg-input);
border-radius:2px;outline:none;
}
input[type=range]::-webkit-slider-thumb{
-webkit-appearance:none;width:14px;height:14px;border-radius:50%;
background:var(--accent);cursor:pointer;border:2px solid var(--bg-primary);
}

/* BADGE */
.badge{
display:inline-flex;align-items:center;font-family:var(--font-mono);font-size:11px;
padding:2px 8px;border-radius:10px;font-weight:500;
}
.badge-green{background:var(--green-dim);color:var(--green)}
.badge-red{background:var(--red-dim);color:var(--red)}
.badge-orange{background:var(--orange-dim);color:var(--orange)}
.badge-accent{background:var(--accent-dim);color:var(--accent)}
#connection-badge{font-family:var(--font-mono);font-size:11px;color:var(--text-muted)}

/* STATS GRID (providers page) */
#stats-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;margin-bottom:16px}
.stat-card{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:12px 14px}
.stat-card .sc-val{font-family:var(--font-mono);font-size:22px;font-weight:600;color:var(--text-primary)}
.stat-card .sc-label{font-size:11px;color:var(--text-muted);margin-top:2px}

/* SCROLLBAR */
::-webkit-scrollbar{width:6px;height:6px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:var(--border);border-radius:3px}
::-webkit-scrollbar-thumb:hover{background:var(--border-light)}

/* PAGE SECTIONS */
.page-section{display:none}
.page-section.active{display:block}

/* MOBILE */
@media(max-width:768px){
.sidebar{transform:translateX(-100%);width:var(--sidebar-expanded)}
.sidebar.open{transform:translateX(0)}
.hamburger{display:flex}
.main{margin-left:0}
.content{padding:16px}
.bento-cell.span8,.bento-cell.span7{grid-column:span 12}
.bento-cell.span5,.bento-cell.span4{grid-column:span 12}
.grid-2,.grid-3{grid-template-columns:1fr}
}
</style>
</head>
<body>

<!-- HAMBURGER -->
<button class="hamburger" onclick="document.querySelector('.sidebar').classList.toggle('open')">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
</button>

<!-- SIDEBAR -->
<div class="sidebar">
<div class="sidebar-logo">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
<span>8Router</span>
</div>
<nav>
<a href="javascript:void(0)" class="nav-item active" onclick="showPage('dashboard')" data-page="dashboard">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>
<span class="nav-label">Dashboard</span>
</a>
<a href="javascript:void(0)" class="nav-item" onclick="showPage('providers')" data-page="providers">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="4" rx="1"/><rect x="2" y="10" width="20" height="4" rx="1"/><rect x="2" y="17" width="20" height="4" rx="1"/><circle cx="6" cy="5" r="1" fill="currentColor"/><circle cx="6" cy="12" r="1" fill="currentColor"/><circle cx="6" cy="19" r="1" fill="currentColor"/></svg>
<span class="nav-label">Providers</span>
</a>
<a href="javascript:void(0)" class="nav-item" onclick="showPage('combos')" data-page="combos">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="9" cy="9" r="5"/><circle cx="15" cy="15" r="5"/></svg>
<span class="nav-label">Combos</span>
</a>
<a href="javascript:void(0)" class="nav-item" onclick="showPage('usage')" data-page="usage">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
<span class="nav-label">Usage</span>
</a>
<a href="javascript:void(0)" class="nav-item" onclick="showPage('connections')" data-page="connections">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>
<span class="nav-label">Connections</span>
</a>
<a href="javascript:void(0)" class="nav-item" onclick="showPage('logs')" data-page="logs">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>
<span class="nav-label">Logs</span>
</a>
<a href="javascript:void(0)" class="nav-item" onclick="showPage('settings')" data-page="settings">
<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
<span class="nav-label">Settings</span>
</a>
</nav>
<div class="sidebar-footer">
<div id="sidebar-status"><span id="sidebar-status-text">connected ${port}</span></div>
</div>
</div>

<!-- MAIN -->
<div class="main">
<div class="content">

<!-- ===== DASHBOARD ===== -->
<div id="page-dashboard" class="page-section active">
<div class="page-header">
<h1 id="page-title">Command Center</h1>
<span class="endpoint-badge">localhost:${port}</span>
</div>

<!-- STATUS BAR -->
<div class="status-bar">
<span><span class="metric-label">REQ</span><span class="metric-val" id="s-req">—</span></span>
<span class="sep">·</span>
<span><span class="metric-label">TOK</span><span class="metric-val" id="s-tokens">—</span></span>
<span class="sep">·</span>
<span><span class="metric-label">FB</span><span class="metric-val" id="s-fallbacks">—</span></span>
<span class="sep">·</span>
<span><span class="metric-label">RTK</span><span class="metric-val" id="s-rtk">—</span></span>
<span class="sep">·</span>
<span><span class="metric-label">RATE</span><span class="metric-val" id="s-rate">—</span><span id="s-rate-sub" style="color:var(--text-muted);margin-left:4px"></span></span>
<span class="sep">·</span>
<span><span class="metric-label">UP</span><span class="metric-val" id="s-uptime">—</span></span>
<span class="sep">·</span>
<span><span class="metric-label">PROV</span><span class="metric-val" id="provider-count">—</span></span>
</div>

<!-- BENTO ROW 1 -->
<div class="bento">
<div class="bento-cell span8">
<div class="cell-title"><span class="dot"></span> Provider Health</div>
<div id="providers-body"></div>
</div>
<div class="bento-cell span4">
<div class="cell-title">System Readout</div>
<div id="stats-grid">
<div class="stat-readout"><span class="sr-label">Requests</span><span class="sr-val" id="sr-reqs">—</span></div>
<div class="stat-readout"><span class="sr-label">Tokens</span><span class="sr-val" id="sr-tokens">—</span></div>
<div class="stat-readout"><span class="sr-label">Fallbacks</span><span class="sr-val" id="sr-fb">—</span></div>
<div class="stat-readout"><span class="sr-label">Uptime</span><span class="sr-val" id="sr-up">—</span></div>
<div class="stat-readout"><span class="sr-label">Providers</span><span class="sr-val" id="sr-prov">—</span></div>
<div class="stat-readout"><span class="sr-label">Connections</span><span class="sr-val" id="sr-conn">—</span></div>
</div>
</div>
</div>

<!-- BENTO ROW 2 -->
<div class="bento">
<div class="bento-cell span7">
<div class="cell-title">Token Usage Trend</div>
<div class="sparkline-container" id="usage-sparkline">
<svg viewBox="0 0 400 100" preserveAspectRatio="none">
<defs><linearGradient id="sparkGrad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="var(--accent)" stop-opacity="0.4"/><stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/></linearGradient></defs>
<polyline class="sparkline-line" id="sparkline-path" points="0,100 400,100"/>
<polygon class="sparkline-area" id="sparkline-area" points="0,100 400,100 400,100"/>
</svg>
</div>
</div>
<div class="bento-cell span5">
<div class="cell-title">Provider Quotas</div>
<div id="limits-grid"></div>
</div>
</div>

<!-- BENTO ROW 3 -->
<div class="bento">
<div class="bento-cell span12">
<div class="cell-title">Available Models</div>
<div id="models-body" class="models-wrap"></div>
</div>
</div>
</div>

<!-- ===== PROVIDERS ===== -->
<div id="page-providers" class="page-section">
<div class="page-header"><h1 id="page-title">Providers</h1></div>
<div id="stats-grid">
<div class="stat-card"><div class="sc-val" id="sc-prov-count">—</div><div class="sc-label">Active Providers</div></div>
<div class="stat-card"><div class="sc-val" id="sc-model-count">—</div><div class="sc-label">Models</div></div>
<div class="stat-card"><div class="sc-val" id="sc-health">—</div><div class="sc-label">Health</div></div>
</div>
<div class="card" style="margin-bottom:16px">
<div class="card-title">Topology</div>
<canvas id="topology-canvas"></canvas>
</div>
<div class="card">
<div class="card-title">All Providers</div>
<div style="overflow-x:auto">
<table><thead><tr><th>Provider</th><th>Status</th><th>Models</th><th>Requests</th><th>Latency</th></tr></thead>
<tbody id="all-providers-body"></tbody></table>
</div>
</div>
</div>

<!-- ===== COMBOS ===== -->
<div id="page-combos" class="page-section">
<div class="page-header"><h1 id="page-title">Combos</h1></div>
<div id="combos-grid"></div>
</div>

<!-- ===== USAGE ===== -->
<div id="page-usage" class="page-section">
<div class="page-header"><h1 id="page-title">Usage</h1></div>
<div class="card" style="margin-bottom:16px">
<div class="card-title">Token Usage</div>
<canvas id="usage-chart"></canvas>
</div>
<div class="card">
<div class="card-title">Usage Log</div>
<div style="overflow-x:auto">
<table><thead><tr><th>Timestamp</th><th>Provider</th><th>Model</th><th>Tokens</th><th>Latency</th></tr></thead>
<tbody id="usage-table-body"></tbody></table>
</div>
</div>
</div>

<!-- ===== CONNECTIONS ===== -->
<div id="page-connections" class="page-section">
<div class="page-header"><h1 id="page-title">Connections</h1><span id="connection-badge"></span></div>
<div class="card">
<div style="overflow-x:auto">
<table><thead><tr><th>ID</th><th>Client</th><th>Provider</th><th>Model</th><th>Status</th><th>Duration</th></tr></thead>
<tbody id="connections-body"></tbody></table>
</div>
</div>
</div>

<!-- ===== LOGS ===== -->
<div id="page-logs" class="page-section">
<div class="page-header"><h1 id="page-title">Logs</h1></div>
<div id="logs-container"></div>
</div>

<!-- ===== SETTINGS ===== -->
<div id="page-settings" class="page-section">
<div class="page-header"><h1 id="page-title">Settings</h1></div>
<div class="grid-2">
<div class="card">
<div class="card-title">Toggles</div>
<div class="toggle-row"><span class="toggle-label">Real-time Keys</span><div class="toggle" id="toggle-rtk" onclick="this.classList.toggle('on')"></div></div>
<div class="toggle-row"><span class="toggle-label">Circuit Breaker</span><div class="toggle on" id="toggle-circuit" onclick="this.classList.toggle('on')"></div></div>
<div class="toggle-row"><span class="toggle-label">Streaming</span><div class="toggle on" id="toggle-stream" onclick="this.classList.toggle('on')"></div></div>
<div class="toggle-row"><span class="toggle-label">Provider Locks</span><div class="toggle" id="toggle-locks" onclick="this.classList.toggle('on')"></div></div>
</div>
<div class="card">
<div class="card-title">Caveman Mode</div>
<div class="slider-container">
<label>Level: <span id="caveman-level">0</span> — <span id="caveman-desc">Off</span></label>
<input type="range" id="caveman-slider" min="0" max="3" value="0" oninput="updateCaveman(this.value)">
</div>
</div>
</div>
<div class="card" style="margin-top:16px">
<div class="card-title">System Info</div>
<table><tbody id="system-info-body"></tbody></table>
</div>
</div>

</div><!-- .content -->
</div><!-- .main -->

<script>
let currentPage='dashboard';
let usageHistory=[];

function showPage(page){
currentPage=page;
document.querySelectorAll('.page-section').forEach(el=>el.classList.remove('active'));
document.getElementById('page-'+page).classList.add('active');
document.querySelectorAll('.nav-item').forEach(el=>{
el.classList.toggle('active',el.dataset.page===page);
});
if(page==='providers') loadAllProviders();
if(page==='combos') loadCombos();
if(page==='usage') loadUsage();
if(page==='connections') loadConnections();
if(page==='logs') loadLogs();
if(page==='settings') loadSettings();
}

function formatUptime(seconds){
if(!seconds&&seconds!==0) return '—';
const d=Math.floor(seconds/86400);
const h=Math.floor((seconds%86400)/3600);
const m=Math.floor((seconds%3600)/60);
if(d>0) return d+'d '+h+'h';
if(h>0) return h+'h '+m+'m';
return m+'m';
}

function formatNum(n){
if(!n&&n!==0) return '—';
if(n>=1e6) return (n/1e6).toFixed(1)+'M';
if(n>=1e3) return (n/1e3).toFixed(1)+'K';
return n.toLocaleString();
}

function renderProviderLimits(providers){
const grid=document.getElementById('limits-grid');
if(!grid) return;
let html='';
(providers||[]).forEach(p=>{
const pct=p.usage&&p.limit?Math.min(100,(p.usage/p.limit)*100):0;
const color=pct>80?'var(--red)':pct>50?'var(--orange)':'var(--accent)';
html+=\`<div class="quota-item">
<div class="quota-header"><span class="q-name">\${p.name||p.provider}</span><span class="q-pct">\${pct.toFixed(0)}%</span></div>
<div class="quota-bar"><div class="quota-bar-fill" style="width:\${pct}%;background:\${color}"></div></div>
</div>\`;
});
grid.innerHTML=html||'<div style="color:var(--text-muted);font-size:12px">No quota data</div>';
}

function drawTopology(){
const canvas=document.getElementById('topology-canvas');
if(!canvas) return;
const ctx=canvas.getContext('2d');
const rect=canvas.getBoundingClientRect();
canvas.width=rect.width*2;canvas.height=rect.height*2;
ctx.scale(2,2);
const w=rect.width,h=rect.height;
ctx.fillStyle='#060911';ctx.fillRect(0,0,w,h);

fetch('/8router/providers').then(r=>r.json()).then(data=>{
const providers=Array.isArray(data)?data:(data.providers||[]);
const cx=w/2,cy=h/2;
const centerX=cx,centerY=cy;
ctx.beginPath();ctx.arc(centerX,centerY,20,0,Math.PI*2);
ctx.fillStyle='rgba(132,171,255,0.15)';ctx.fill();
ctx.strokeStyle='var(--accent)';ctx.lineWidth=1.5;ctx.stroke();
ctx.fillStyle='#84abff';ctx.font='9px JetBrains Mono';ctx.textAlign='center';
ctx.fillText('8R',centerX,centerY+3);

const count=providers.length||1;
providers.forEach((p,i)=>{
const angle=(i/count)*Math.PI*2-Math.PI/2;
const radius=Math.min(w,h)*0.35;
const px=centerX+Math.cos(angle)*radius;
const py=centerY+Math.sin(angle)*radius;
ctx.beginPath();ctx.moveTo(centerX,centerY);ctx.lineTo(px,py);
ctx.strokeStyle='rgba(26,33,53,0.8)';ctx.lineWidth=1;ctx.stroke();
ctx.beginPath();ctx.arc(px,py,8,0,Math.PI*2);
ctx.fillStyle=p.status==='healthy'||p.status==='ok'?'rgba(0,210,148,0.2)':'rgba(255,101,104,0.2)';
ctx.fill();
ctx.strokeStyle=p.status==='healthy'||p.status==='ok'?'#00d294':'#ff6568';
ctx.lineWidth=1;ctx.stroke();
ctx.fillStyle='#8a8f9c';ctx.font='9px JetBrains Mono';ctx.textAlign='center';
ctx.fillText((p.name||p.provider||'').slice(0,12),px,py+22);
});
}).catch(()=>{});
}

function loadAllProviders(){
Promise.all([
fetch('/8router/providers').then(r=>r.json()).catch(()=>({})),
fetch('/8router/models').then(r=>r.json()).catch(()=>({}))
]).then(([pData,mData])=>{
const providers=Array.isArray(pData)?pData:(pData.providers||[]);
const models=Array.isArray(mData)?mData:(mData.models||[]);
const body=document.getElementById('all-providers-body');
const scProv=document.getElementById('sc-prov-count');
const scModel=document.getElementById('sc-model-count');
const scHealth=document.getElementById('sc-health');
if(scProv) scProv.textContent=providers.length;
if(scModel) scModel.textContent=models.length;
const healthy=providers.filter(p=>p.status==='healthy'||p.status==='ok').length;
if(scHealth) scHealth.textContent=healthy+'/'+providers.length;
let html='';
providers.forEach(p=>{
const st=p.status==='healthy'||p.status==='ok'?'<span class="badge badge-green">OK</span>'
:p.status==='degraded'?'<span class="badge badge-orange">DEG</span>'
:'<span class="badge badge-red">ERR</span>';
html+=\`<tr><td>\${p.name||p.provider}</td><td>\${st}</td>
<td class="mono">\${(p.models||[]).length||'—'}</td>
<td class="mono">\${formatNum(p.requests)}</td>
<td class="mono">\${p.latency?p.latency+'ms':'—'}</td></tr>\`;
});
if(body) body.innerHTML=html||'<tr><td colspan="5" style="color:var(--text-muted)">No providers</td></tr>';
drawTopology();
});
}

function loadCombos(){
fetch('/8router/combos').then(r=>r.json()).then(data=>{
const combos=Array.isArray(data)?data:(data.combos||[]);
const grid=document.getElementById('combos-grid');
let html='';
combos.forEach(c=>{
html+=\`<div class="combo-card"><h3>\${c.name||'Combo'}</h3>
<p>\${c.description||JSON.stringify(c.providers||c.models||c)}</p></div>\`;
});
if(grid) grid.innerHTML=html||'<div style="color:var(--text-muted)">No combos configured</div>';
}).catch(()=>{});
}

function loadUsage(){
fetch('/8router/usage').then(r=>r.json()).then(data=>{
const entries=Array.isArray(data)?data:(data.entries||data.usage||[]);
const tbody=document.getElementById('usage-table-body');
let html='';
entries.slice(-50).reverse().forEach(e=>{
html+=\`<tr><td class="mono">\${e.timestamp||e.ts||'—'}</td>
<td>\${e.provider||'—'}</td><td>\${e.model||'—'}</td>
<td class="mono">\${formatNum(e.tokens||e.total_tokens)}</td>
<td class="mono">\${e.latency?e.latency+'ms':'—'}</td></tr>\`;
});
if(tbody) tbody.innerHTML=html||'<tr><td colspan="5" style="color:var(--text-muted)">No usage data</td></tr>';
const canvas=document.getElementById('usage-chart');
if(canvas&&entries.length){
const ctx=canvas.getContext('2d');
const rect=canvas.getBoundingClientRect();
canvas.width=rect.width*2;canvas.height=rect.height*2;
ctx.scale(2,2);
const w=rect.width,h=rect.height;
ctx.fillStyle='#060911';ctx.fillRect(0,0,w,h);
const vals=entries.map(e=>e.tokens||e.total_tokens||0);
const max=Math.max(...vals,1);
const step=w/(vals.length-1||1);
ctx.beginPath();ctx.moveTo(0,h);
vals.forEach((v,i)=>{
const x=i*step;
const y=h-(v/max)*(h-20);
if(i===0) ctx.moveTo(x,y); else ctx.lineTo(x,y);
});
ctx.strokeStyle='#84abff';ctx.lineWidth=1.5;ctx.stroke();
ctx.lineTo(w,h);ctx.lineTo(0,h);ctx.closePath();
ctx.fillStyle='rgba(132,171,255,0.08)';ctx.fill();
}
}).catch(()=>{});
}

function loadConnections(){
fetch('/8router/connections').then(r=>r.json()).then(data=>{
const conns=Array.isArray(data)?data:(data.connections||[]);
const body=document.getElementById('connections-body');
const badge=document.getElementById('connection-badge');
if(badge) badge.textContent=conns.length+' active';
let html='';
conns.forEach(c=>{
const st=c.status==='active'?'<span class="badge badge-green">ACTIVE</span>'
:'<span class="badge badge-accent">IDLE</span>';
html+=\`<tr><td class="mono">\${c.id||'—'}</td><td>\${c.client||'—'}</td>
<td>\${c.provider||'—'}</td><td>\${c.model||'—'}</td>
<td>\${st}</td><td class="mono">\${c.duration||'—'}</td></tr>\`;
});
if(body) body.innerHTML=html||'<tr><td colspan="6" style="color:var(--text-muted)">No connections</td></tr>';
}).catch(()=>{});
}

function loadLogs(){
fetch('/8router/health').then(r=>r.json()).then(data=>{
const container=document.getElementById('logs-container');
const logs=data.logs||data.recent||[];
let html='';
(Array.isArray(logs)?logs:[]).forEach(l=>{
const ts=l.timestamp||l.ts||'';
const msg=l.message||l.msg||JSON.stringify(l);
const cls=l.level==='error'?'log-err':'';
html+=\`<div class="log-line"><span class="log-ts">\${ts}</span> \${cls?'<span class="'+cls+'">'+msg+'</span>':msg}</div>\`;
});
if(container) container.innerHTML=html||'<div style="color:var(--text-muted)">No logs available</div>';
}).catch(()=>{
const container=document.getElementById('logs-container');
if(container) container.innerHTML='<div style="color:var(--text-muted)">No logs available</div>';
});
}

function loadSettings(){
fetch('/8router/info').then(r=>r.json()).then(data=>{
const body=document.getElementById('system-info-body');
let html='';
Object.entries(data).forEach(([k,v])=>{
if(typeof v==='object') v=JSON.stringify(v);
html+=\`<tr><td style="color:var(--text-muted);font-family:var(--font-mono);width:180px">\${k}</td>
<td style="color:var(--text-secondary);font-family:var(--font-mono)">\${v}</td></tr>\`;
});
if(body) body.innerHTML=html;
}).catch(()=>{});
}

function updateCaveman(val){
const slider=document.getElementById('caveman-slider');
const level=document.getElementById('caveman-level');
if(level) level.textContent=val;
fetch('/8router/caveman',{method:'POST',headers:{'Content-Type':'application/json'},
body:JSON.stringify({level:parseInt(val)})}).catch(()=>{});
updateCavemanDesc(val);
}

function updateCavemanDesc(val){
const desc=document.getElementById('caveman-desc');
const descs=['Off','Low — basic fallbacks','Medium — aggressive retry','High — maximum resilience'];
if(desc) desc.textContent=descs[parseInt(val)]||'Off';
}

function refresh(){
fetch('/8router/stats').then(r=>r.json()).then(d=>{
const el=(id)=>document.getElementById(id);
const sReq=el('s-req'),sTokens=el('s-tokens'),sFb=el('s-fallbacks');
const sRtk=el('s-rtk'),sRate=el('s-rate'),sRateSub=el('s-rate-sub');
const sUp=el('s-uptime'),pCount=el('provider-count');
const srReqs=el('sr-reqs'),srTokens=el('sr-tokens'),srFb=el('sr-fb');
const srUp=el('sr-up'),srProv=el('sr-prov'),srConn=el('sr-conn');

if(sReq) sReq.textContent=formatNum(d.requests);
if(sTokens) sTokens.textContent=formatNum(d.tokens);
if(sFb) sFb.textContent=formatNum(d.fallbacks);
if(sRtk) sRtk.textContent=d.realtimeKeys||d.rtk||'—';
if(sRate) sRate.textContent=d.rateLimit?d.rateLimit.toFixed(1)+'%':'—';
if(sRateSub) sRateSub.textContent=d.rateLimitSub?'('+d.rateLimitSub.toFixed(1)+'%)':'';
if(sUp) sUp.textContent=formatUptime(d.uptime);
if(pCount) pCount.textContent=d.providers||'—';

if(srReqs) srReqs.textContent=formatNum(d.requests);
if(srTokens) srTokens.textContent=formatNum(d.tokens);
if(srFb) srFb.textContent=formatNum(d.fallbacks);
if(srUp) srUp.textContent=formatUptime(d.uptime);
if(srProv) srProv.textContent=d.providers||'—';
if(srConn) srConn.textContent=d.connections||'—';

// Sparkline
if(d.tokens!==undefined){
usageHistory.push(d.tokens);
if(usageHistory.length>60) usageHistory.shift();
const max=Math.max(...usageHistory,1);
const pts=usageHistory.map((v,i)=>{
const x=(i/(usageHistory.length-1||1))*400;
const y=100-(v/max)*80;
return x.toFixed(1)+','+y.toFixed(1);
}).join(' ');
const path=el('sparkline-path');
const area=el('sparkline-area');
if(path) path.setAttribute('points',pts);
if(area) area.setAttribute('points','0,100 '+pts+' 400,100');
}

// Provider health list
fetch('/8router/providers').then(r=>r.json()).then(pData=>{
const providers=Array.isArray(pData)?pData:(pData.providers||[]);
const body=el('providers-body');
let html='';
providers.slice(0,10).forEach(p=>{
const ok=p.status==='healthy'||p.status==='ok';
const cls=ok?'ok':p.status==='degraded'?'warn':'err';
html+=\`<div class="provider-row">
<div class="p-dot \${cls}"></div>
<div class="p-name">\${p.name||p.provider}</div>
<div class="p-latency">\${p.latency?p.latency+'ms':'—'}</div>
<div class="p-reqs">\${formatNum(p.requests)}</div>
</div>\`;
});
if(body) body.innerHTML=html||'<div style="color:var(--text-muted);font-size:12px">No providers</div>';
}).catch(()=>{});

// Quotas
fetch('/8router/providers').then(r=>r.json()).then(pData=>{
const providers=Array.isArray(pData)?pData:(pData.providers||[]);
renderProviderLimits(providers);
}).catch(()=>{});

// Models
fetch('/8router/models').then(r=>r.json()).then(mData=>{
const models=Array.isArray(mData)?mData:(mData.models||[]);
const body=el('models-body');
let html='';
models.forEach(m=>{
const name=typeof m==='string'?m:(m.name||m.model||m.id||'');
html+=\`<span class="model-pill">\${name}</span>\`;
});
if(body) body.innerHTML=html||'<span style="color:var(--text-muted);font-size:12px">No models</span>';
}).catch(()=>{});

// Status bar status text
const ssText=el('sidebar-status-text');
if(ssText) ssText.textContent='connected ${port}';
}).catch(()=>{});
}

// INIT
refresh();
setInterval(refresh,5000);
</script>
</body>
</html>`;
}

export function createDashboard(engineOrPort: any, portOrUndef?: number): express.Express {
  const app = express();
  app.use(cors());
  app.use(express.json());
  const port = typeof portOrUndef === 'number' ? portOrUndef : (typeof engineOrPort === 'number' ? engineOrPort : 8081);

  app.get('/', (_req, res) => {
    res.type('html').send(getDashboardHTML(null, port));
  });

  return app;
}
