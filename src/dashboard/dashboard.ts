// 8Router — Dashboard Server

import express from 'express';
import path from 'path';
import { RouterEngine } from '../router/engine.js';

export function createDashboard(engine: RouterEngine, port: number): express.Express {
  const app = express();
  app.use(express.json());

  // Serve dashboard HTML
  app.get('/', (_req, res) => {
    res.send(getDashboardHTML());
  });

  // Dashboard API
  app.get('/api/stats', (_req, res) => {
    const stats = engine.getStats();
    res.json({
      ...stats,
      providerStats: Object.fromEntries(stats.providerStats),
    });
  });

  app.get('/api/providers', (_req, res) => {
    const providers = engine.getRegistry().getAllProviders().map(p => ({
      ...p,
      apiKey: p.apiKey.slice(0, 8) + '***',
    }));
    res.json(providers);
  });

  app.get('/api/health', (_req, res) => {
    res.json(engine.getRegistry().getHealth());
  });

  app.get('/api/models', (_req, res) => {
    res.json(engine.getRegistry().getAvailableModels());
  });

  return app;
}

function getDashboardHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>8Router Dashboard</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: 'Inter', -apple-system, sans-serif; background: #0a0a0f; color: #e0e0e0; }
    .header { background: linear-gradient(135deg, #1a1a2e 0%, #16213e 100%); padding: 20px 32px; border-bottom: 1px solid #2a2a4a; display: flex; align-items: center; justify-content: space-between; }
    .logo { font-size: 28px; font-weight: 800; background: linear-gradient(90deg, #00d2ff, #7b2ff7); -webkit-background-clip: text; -webkit-text-fill-color: transparent; }
    .status { padding: 6px 16px; border-radius: 20px; font-size: 13px; font-weight: 600; }
    .status.ok { background: #0a3d1a; color: #4ade80; border: 1px solid #166534; }
    .container { max-width: 1200px; margin: 0 auto; padding: 24px; }
    .grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 16px; margin-bottom: 24px; }
    .card { background: #111118; border: 1px solid #1e1e2e; border-radius: 12px; padding: 20px; }
    .card-title { font-size: 13px; color: #888; text-transform: uppercase; letter-spacing: 1px; margin-bottom: 8px; }
    .card-value { font-size: 32px; font-weight: 700; }
    .card-value.blue { color: #60a5fa; }
    .card-value.green { color: #4ade80; }
    .card-value.purple { color: #a78bfa; }
    .card-value.orange { color: #fb923c; }
    .section { margin-bottom: 24px; }
    .section-title { font-size: 18px; font-weight: 700; margin-bottom: 12px; color: #fff; }
    table { width: 100%; border-collapse: collapse; background: #111118; border-radius: 12px; overflow: hidden; }
    th { background: #1a1a2e; padding: 12px 16px; text-align: left; font-size: 12px; text-transform: uppercase; color: #888; letter-spacing: 1px; }
    td { padding: 12px 16px; border-top: 1px solid #1e1e2e; font-size: 14px; }
    .badge { padding: 3px 10px; border-radius: 12px; font-size: 12px; font-weight: 600; }
    .badge.healthy { background: #0a3d1a; color: #4ade80; }
    .badge.unhealthy { background: #3d0a0a; color: #f87171; }
    .badge.tier-sub { background: #1e1b4b; color: #818cf8; }
    .badge.tier-cheap { background: #1e3a1b; color: #86efac; }
    .badge.tier-free { background: #3a351b; color: #fde68a; }
    .refresh-btn { background: #1e1e2e; border: 1px solid #2a2a4a; color: #e0e0e0; padding: 8px 16px; border-radius: 8px; cursor: pointer; font-size: 13px; }
    .refresh-btn:hover { background: #2a2a4a; }
    .endpoint-box { background: #111118; border: 1px solid #1e1e2e; border-radius: 12px; padding: 20px; font-family: 'Fira Code', monospace; }
    .endpoint { color: #60a5fa; font-size: 16px; }
    .footer { text-align: center; padding: 24px; color: #555; font-size: 12px; }
  </style>
</head>
<body>
  <div class="header">
    <div class="logo">⚡ 8Router</div>
    <span class="status ok" id="status">● Connected</span>
  </div>
  <div class="container">
    <div class="endpoint-box" style="margin-bottom: 24px;">
      <div style="font-size: 12px; color: #888; margin-bottom: 8px; text-transform: uppercase;">OpenAI-Compatible Endpoint</div>
      <div class="endpoint">http://localhost:<span id="port">8080</span>/v1</div>
      <div style="font-size: 12px; color: #666; margin-top: 8px;">Use this endpoint in Claude Code, Codex, Cursor, or any OpenAI-compatible client</div>
    </div>

    <div class="grid" id="stats-grid">
      <div class="card"><div class="card-title">Total Requests</div><div class="card-value blue" id="total-req">0</div></div>
      <div class="card"><div class="card-title">Tokens Used</div><div class="card-value green" id="total-tokens">0</div></div>
      <div class="card"><div class="card-title">Fallbacks</div><div class="card-value orange" id="fallbacks">0</div></div>
      <div class="card"><div class="card-title">Tokens Saved (RTK)</div><div class="card-value purple" id="saved">0</div></div>
    </div>

    <div class="section">
      <div class="section-title">Providers</div>
      <table id="providers-table">
        <thead><tr><th>Name</th><th>Tier</th><th>Status</th><th>Requests</th><th>Tokens</th><th>Errors</th></tr></thead>
        <tbody id="providers-body"></tbody>
      </table>
    </div>

    <div class="section">
      <div class="section-title">Available Models</div>
      <table id="models-table">
        <thead><tr><th>Model</th><th>Providers</th></tr></thead>
        <tbody id="models-body"></tbody>
      </table>
    </div>
  </div>
  <div class="footer">8Router v0.1.0 — Part of the 8Agents Ecosystem</div>

  <script>
    async function refresh() {
      try {
        const [stats, providers, health, models] = await Promise.all([
          fetch('/api/stats').then(r => r.json()),
          fetch('/api/providers').then(r => r.json()),
          fetch('/api/health').then(r => r.json()),
          fetch('/api/models').then(r => r.json()),
        ]);

        document.getElementById('total-req').textContent = stats.totalRequests.toLocaleString();
        document.getElementById('total-tokens').textContent = stats.totalTokens.toLocaleString();
        document.getElementById('fallbacks').textContent = stats.fallbackCount.toLocaleString();
        document.getElementById('saved').textContent = stats.compressionSaved.toLocaleString();

        const healthMap = Object.fromEntries(health.map(h => [h.providerId, h]));

        const provBody = document.getElementById('providers-body');
        provBody.innerHTML = providers.map(p => {
          const h = healthMap[p.id] || {};
          const statusClass = h.healthy !== false ? 'healthy' : 'healthy unhealthy';
          const statusText = h.healthy !== false ? 'Healthy' : 'Circuit Open';
          const tierClass = 'tier-' + p.tier;
          const ps = stats.providerStats[p.id] || {};
          return \`<tr>
            <td>\${p.name} <span style="color:#555;font-size:11px">(\${p.id})</span></td>
            <td><span class="badge \${tierClass}">\${p.tier}</span></td>
            <td><span class="badge \${statusClass}">\${statusText}</span></td>
            <td>\${(ps.requests || 0).toLocaleString()}</td>
            <td>\${(ps.tokens || 0).toLocaleString()}</td>
            <td>\${ps.errors || 0}</td>
          </tr>\`;
        }).join('');

        const modBody = document.getElementById('models-body');
        modBody.innerHTML = models.map(m =>
          \`<tr><td>\${m.id}</td><td>\${m.providers.join(', ')}</td></tr>\`
        ).join('');

        document.getElementById('status').textContent = '● Connected';
      } catch (err) {
        document.getElementById('status').textContent = '● Disconnected';
        document.getElementById('status').className = 'status';
      }
    }

    refresh();
    setInterval(refresh, 5000);
  </script>
</body>
</html>`;
}
