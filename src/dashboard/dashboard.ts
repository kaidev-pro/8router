// 8Router — Enhanced Dashboard v2
// Full dashboard with combos, connections, usage analytics, caveman mode

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
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { 
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: #0a0a1a; color: #e0e0e0; min-height: 100vh;
    }
    
    /* Header */
    .header { 
      background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%);
      padding: 16px 24px; display: flex; justify-content: space-between; align-items: center;
      border-bottom: 1px solid #2a2a4a;
    }
    .header h1 { font-size: 20px; font-weight: 600; }
    .header h1 span { color: #6366f1; }
    .status { font-size: 13px; }
    .status.connected { color: #22c55e; }
    .status.disconnected { color: #ef4444; }
    
    /* Navigation Tabs */
    .nav { 
      background: #0f0f23; padding: 0 24px; display: flex; gap: 0;
      border-bottom: 1px solid #1a1a3a;
    }
    .nav-tab { 
      padding: 12px 20px; cursor: pointer; font-size: 14px; font-weight: 500;
      color: #888; border-bottom: 2px solid transparent; transition: all 0.2s;
    }
    .nav-tab:hover { color: #bbb; }
    .nav-tab.active { color: #6366f1; border-bottom-color: #6366f1; }
    
    /* Content */
    .content { padding: 24px; max-width: 1200px; margin: 0 auto; }
    .section { display: none; }
    .section.active { display: block; }
    
    /* Endpoint Box */
    .endpoint-box { 
      background: #1a1a2e; border-radius: 12px; padding: 16px 20px; margin-bottom: 20px;
      border: 1px solid #2a2a4a;
    }
    .endpoint-box .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .endpoint-box .url { color: #6366f1; font-size: 15px; margin: 6px 0; text-decoration: underline; cursor: pointer; }
    .endpoint-box .desc { font-size: 12px; color: #555; }
    
    /* Stats Grid */
    .stats-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(180px, 1fr)); gap: 12px; margin-bottom: 24px; }
    .stat-card { 
      background: #1a1a2e; border-radius: 10px; padding: 16px;
      border: 1px solid #2a2a4a;
    }
    .stat-card .label { font-size: 11px; color: #666; text-transform: uppercase; letter-spacing: 1px; }
    .stat-card .value { font-size: 28px; font-weight: 700; margin-top: 4px; }
    .stat-card .value.blue { color: #6366f1; }
    .stat-card .value.green { color: #22c55e; }
    .stat-card .value.orange { color: #f59e0b; }
    .stat-card .value.purple { color: #a855f7; }
    .stat-card .value.red { color: #ef4444; }
    .stat-card .value.cyan { color: #06b6d4; }
    
    /* Tables */
    .table-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px; }
    .table-header h2 { font-size: 18px; font-weight: 600; }
    .table-wrap { 
      background: #1a1a2e; border-radius: 12px; overflow: hidden;
      border: 1px solid #2a2a4a; margin-bottom: 24px;
    }
    table { width: 100%; border-collapse: collapse; }
    th { 
      background: #16213e; padding: 10px 16px; text-align: left;
      font-size: 11px; text-transform: uppercase; letter-spacing: 1px; color: #666;
    }
    td { padding: 10px 16px; border-top: 1px solid #1a1a3a; font-size: 13px; }
    tr:hover { background: #16213e22; }
    
    /* Badges */
    .badge { 
      display: inline-block; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500;
    }
    .badge.healthy { background: #22c55e22; color: #22c55e; }
    .badge.unhealthy { background: #ef444422; color: #ef4444; }
    .badge.unknown { background: #6b728022; color: #6b7280; }
    .badge.subscription { background: #a855f722; color: #a855f7; }
    .badge.cheap { background: #f59e0b22; color: #f59e0b; }
    .badge.free { background: #22c55e22; color: #22c55e; }
    .badge.combo { background: #6366f122; color: #6366f1; }
    .badge.active { background: #22c55e22; color: #22c55e; }
    .badge.ready { background: #f59e0b22; color: #f59e0b; }
    .badge.error { background: #ef444422; color: #ef4444; }
    
    /* Combo Cards */
    .combo-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .combo-card { 
      background: #1a1a2e; border-radius: 12px; padding: 16px;
      border: 1px solid #2a2a4a;
    }
    .combo-card h3 { font-size: 16px; color: #6366f1; margin-bottom: 4px; }
    .combo-card .desc { font-size: 12px; color: #666; margin-bottom: 12px; }
    .combo-tier { 
      display: flex; align-items: center; gap: 8px; padding: 6px 0;
      border-bottom: 1px solid #1a1a3a; font-size: 13px;
    }
    .combo-tier:last-child { border-bottom: none; }
    .combo-tier .priority { 
      width: 20px; height: 20px; background: #16213e; border-radius: 4px;
      display: flex; align-items: center; justify-content: center;
      font-size: 11px; color: #6366f1; font-weight: 600;
    }
    
    /* Caveman Control */
    .caveman-control { 
      background: #1a1a2e; border-radius: 12px; padding: 20px;
      border: 1px solid #2a2a4a; margin-bottom: 24px;
    }
    .caveman-slider { 
      width: 100%; margin: 12px 0; accent-color: #6366f1;
    }
    .caveman-levels { display: flex; justify-content: space-between; font-size: 11px; color: #666; }
    .caveman-desc { font-size: 13px; color: #888; margin-top: 8px; }
    
    /* Footer */
    .footer { 
      text-align: center; padding: 20px; color: #444; font-size: 12px;
      border-top: 1px solid #1a1a3a; margin-top: 40px;
    }
  </style>
</head>
<body>
  <div class="header">
    <h1><span>⚡</span> 8Router</h1>
    <span id="status" class="status disconnected">● Disconnected</span>
  </div>

  <div class="nav">
    <div class="nav-tab active" onclick="showSection('dashboard')">Dashboard</div>
    <div class="nav-tab" onclick="showSection('providers')">Providers</div>
    <div class="nav-tab" onclick="showSection('combos')">Combos</div>
    <div class="nav-tab" onclick="showSection('connections')">Connections</div>
    <div class="nav-tab" onclick="showSection('settings')">Settings</div>
  </div>

  <div class="content">
    <!-- DASHBOARD SECTION -->
    <div id="section-dashboard" class="section active">
      <div class="endpoint-box">
        <div class="label">OpenAI-Compatible Endpoint</div>
        <div class="url" onclick="navigator.clipboard.writeText('http://localhost:${apiPort}/v1')">http://localhost:${apiPort}/v1</div>
        <div class="desc">Use this endpoint in Claude Code, Codex, Cursor, or any OpenAI-compatible client</div>
      </div>

      <div class="stats-grid">
        <div class="stat-card">
          <div class="label">Total Requests</div>
          <div id="total-req" class="value blue">0</div>
        </div>
        <div class="stat-card">
          <div class="label">Tokens Used</div>
          <div id="total-tokens" class="value green">0</div>
        </div>
        <div class="stat-card">
          <div class="label">Fallbacks</div>
          <div id="fallbacks" class="value orange">0</div>
        </div>
        <div class="stat-card">
          <div class="label">Tokens Saved (RTK)</div>
          <div id="saved" class="value purple">0</div>
        </div>
        <div class="stat-card">
          <div class="label">Successful</div>
          <div id="successful" class="value green">0</div>
        </div>
        <div class="stat-card">
          <div class="label">Failed</div>
          <div id="failed" class="value red">0</div>
        </div>
      </div>

      <div class="table-header"><h2>Providers</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Name</th><th>Tier</th><th>Status</th><th>Requests</th><th>Tokens</th><th>Errors</th></tr></thead>
          <tbody id="providers-body"></tbody>
        </table>
      </div>

      <div class="table-header"><h2>Available Models</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>Model</th><th>Providers</th></tr></thead>
          <tbody id="models-body"></tbody>
        </table>
      </div>
    </div>

    <!-- PROVIDERS SECTION -->
    <div id="section-providers" class="section">
      <div class="table-header"><h2>All Providers</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Name</th><th>Tier</th><th>API Key</th><th>Requests</th><th>Tokens</th><th>Errors</th></tr></thead>
          <tbody id="all-providers-body"></tbody>
        </table>
      </div>
    </div>

    <!-- COMBOS SECTION -->
    <div id="section-combos" class="section">
      <div class="table-header"><h2>Named Combos</h2></div>
      <div class="combo-grid" id="combos-grid"></div>
    </div>

    <!-- CONNECTIONS SECTION -->
    <div id="section-connections" class="section">
      <div class="table-header"><h2>Database Connections</h2></div>
      <div class="table-wrap">
        <table>
          <thead><tr><th>ID</th><th>Provider</th><th>Name</th><th>Status</th><th>Backoff</th><th>Requests</th><th>Tokens</th></tr></thead>
          <tbody id="connections-body"></tbody>
        </table>
      </div>
    </div>

    <!-- SETTINGS SECTION -->
    <div id="section-settings" class="section">
      <div class="table-header"><h2>Caveman Mode</h2></div>
      <div class="caveman-control">
        <p style="font-size:14px;margin-bottom:8px">Output token compression — saves up to 65% output tokens by making responses terse.</p>
        <input type="range" min="0" max="5" value="0" class="caveman-slider" id="caveman-slider" onchange="setCaveman(this.value)">
        <div class="caveman-levels">
          <span>0: Off</span><span>1: Mild</span><span>2: Medium</span><span>3: Aggressive</span><span>4: Extreme</span><span>5: Max</span>
        </div>
        <div id="caveman-desc" class="caveman-desc">Current: Disabled</div>
      </div>

      <div class="table-header"><h2>System Info</h2></div>
      <div class="endpoint-box">
        <div class="label">Version</div>
        <div id="sys-version" style="color:#6366f1;font-size:15px;margin:6px 0">8Router v0.2.0</div>
        <div class="label" style="margin-top:12px">Features</div>
        <div id="sys-features" style="font-size:13px;color:#888;margin-top:4px"></div>
      </div>
    </div>
  </div>

  <div class="footer">8Router v0.2.0 — Part of the 8Agents Ecosystem</div>

  <script>
    const API = '';

    function showSection(name) {
      document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));
      document.querySelectorAll('.nav-tab').forEach(t => t.classList.remove('active'));
      document.getElementById('section-' + name).classList.add('active');
      event.target.classList.add('active');
      
      if (name === 'providers') loadAllProviders();
      if (name === 'combos') loadCombos();
      if (name === 'connections') loadConnections();
      if (name === 'settings') loadSettings();
    }

    async function refresh() {
      try {
        const [statsRes, providersRes, healthRes, modelsRes] = await Promise.all([
          fetch(API + '/8router/stats').then(r => r.json()),
          fetch(API + '/8router/providers').then(r => r.json()),
          fetch(API + '/8router/health').then(r => r.json()),
          fetch(API + '/8router/models').then(r => r.json()),
        ]);

        const stats = statsRes.session || statsRes;
        const allTime = statsRes.allTime || {};

        document.getElementById('total-req').textContent = (allTime.totalRequests || stats.totalRequests || 0).toLocaleString();
        document.getElementById('total-tokens').textContent = (allTime.totalTokens || stats.totalTokens || 0).toLocaleString();
        document.getElementById('fallbacks').textContent = (stats.fallbackCount || 0).toLocaleString();
        document.getElementById('saved').textContent = (stats.compressionSaved || 0).toLocaleString();
        document.getElementById('successful').textContent = (allTime.successfulRequests || stats.successfulRequests || 0).toLocaleString();
        document.getElementById('failed').textContent = (allTime.failedRequests || stats.failedRequests || 0).toLocaleString();

        const healthMap = Object.fromEntries((healthRes || []).map(h => [h.providerId, h]));
        const provStats = allTime.providerStats || stats.providerStats || {};

        document.getElementById('providers-body').innerHTML = providersRes.map(p => {
          const h = healthMap[p.id] || {};
          const statusClass = h.healthy !== false ? 'healthy' : 'unhealthy';
          const statusText = h.healthy !== false ? 'Healthy' : 'Circuit Open';
          const ps = provStats[p.id] || {};
          return '<tr>' +
            '<td>' + p.name + ' <span style="color:#555;font-size:11px">(' + p.id + ')</span></td>' +
            '<td><span class="badge ' + p.tier + '">' + p.tier + '</span></td>' +
            '<td><span class="badge ' + statusClass + '">' + statusText + '</span></td>' +
            '<td>' + (ps.requests || 0).toLocaleString() + '</td>' +
            '<td>' + (ps.tokens || 0).toLocaleString() + '</td>' +
            '<td>' + (ps.errors || 0) + '</td>' +
          '</tr>';
        }).join('');

        document.getElementById('models-body').innerHTML = modelsRes.map(m =>
          '<tr><td>' + m.id + '</td><td>' + m.providers.join(', ') + '</td></tr>'
        ).join('');

        document.getElementById('status').textContent = '● Connected';
        document.getElementById('status').className = 'status connected';
      } catch (err) {
        document.getElementById('status').textContent = '● Disconnected';
        document.getElementById('status').className = 'status disconnected';
      }
    }

    async function loadAllProviders() {
      try {
        const res = await fetch(API + '/8router/providers').then(r => r.json());
        document.getElementById('all-providers-body').innerHTML = res.map(p =>
          '<tr>' +
            '<td>' + p.id + '</td>' +
            '<td>' + p.name + '</td>' +
            '<td><span class="badge ' + p.tier + '">' + p.tier + '</span></td>' +
            '<td style="font-family:monospace;font-size:11px">' + (p.apiKey || '***') + '</td>' +
            '<td>' + (p.totalRequests || 0) + '</td>' +
            '<td>' + (p.totalTokens || 0).toLocaleString() + '</td>' +
            '<td>' + (p.errors || 0) + '</td>' +
          '</tr>'
        ).join('');
      } catch {}
    }

    async function loadCombos() {
      try {
        const combos = await fetch(API + '/8router/combos').then(r => r.json());
        document.getElementById('combos-grid').innerHTML = combos.map(c =>
          '<div class="combo-card">' +
            '<h3>' + c.name + '</h3>' +
            '<div class="desc">' + c.description + '</div>' +
            c.tiers.map((t, i) =>
              '<div class="combo-tier">' +
                '<div class="priority">' + (i + 1) + '</div>' +
                '<span>' + t.provider + '</span>' +
                '<span style="color:#666">→</span>' +
                '<span style="color:#888">' + t.model + '</span>' +
              '</div>'
            ).join('') +
          '</div>'
        ).join('');
      } catch {}
    }

    async function loadConnections() {
      try {
        const conns = await fetch(API + '/8router/connections').then(r => r.json());
        document.getElementById('connections-body').innerHTML = conns.map(c =>
          '<tr>' +
            '<td style="font-family:monospace;font-size:11px">' + c.id.slice(0, 12) + '</td>' +
            '<td>' + c.provider + '</td>' +
            '<td>' + (c.name || '-') + '</td>' +
            '<td><span class="badge ' + (c.testStatus || 'unknown') + '">' + (c.testStatus || 'unknown') + '</span></td>' +
            '<td>' + (c.backoffLevel > 0 ? 'Level ' + c.backoffLevel : '-') + '</td>' +
            '<td>' + (c.totalRequests || 0) + '</td>' +
            '<td>' + (c.totalTokens || 0).toLocaleString() + '</td>' +
          '</tr>'
        ).join('');
      } catch {}
    }

    async function loadSettings() {
      try {
        const caveman = await fetch(API + '/8router/caveman').then(r => r.json());
        document.getElementById('caveman-slider').value = caveman.level;
        updateCavemanDesc(caveman.level);

        const info = await fetch(API + '/8router/info').then(r => r.json());
        document.getElementById('sys-version').textContent = info.name + ' v' + info.version;
        document.getElementById('sys-features').innerHTML = info.features.map(f => '• ' + f).join('<br>');
      } catch {}
    }

    function setCaveman(level) {
      fetch(API + '/8router/caveman', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ level: parseInt(level) })
      });
      updateCavemanDesc(parseInt(level));
    }

    function updateCavemanDesc(level) {
      const descs = ['Disabled', 'Mild — Short sentences', 'Medium — One-line answers', 
                     'Aggressive — Keywords only', 'Extreme — Caveman grunts', 'Maximum — Classical Chinese'];
      document.getElementById('caveman-desc').textContent = 'Current: ' + descs[level] || 'Unknown';
    }

    refresh();
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;
}
