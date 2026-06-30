# 8Router Dashboard — Redesign Brief for Design Agent

## Project Location
```
/root/8router/
```

## Architecture
- **Single HTML file** embedded in TypeScript: `src/dashboard/dashboard.ts`
- Dashboard is served by Express on port `8081`
- API endpoints on port `8080` (proxied via nginx at `/8router/api/*`)
- **No build step** — pure HTML/CSS/JS in a template literal string

## File to Edit
```
/root/8router/src/dashboard/dashboard.ts
```
This file contains ONE function `getDashboardHTML()` that returns the full HTML string. The HTML is self-contained (inline CSS + JS).

## Current Structure (what exists)
The dashboard has **7 pages** managed by JS tab switching:

1. **Dashboard** (`page-dashboard`) — Main overview
   - Stats row: 6 cards (Requests, Tokens, Fallbacks, RTK Saved, Success Rate, Uptime)
   - Provider Topology: Canvas-based graph (center=8Router, orbiting=providers)
   - Provider Quotas: Grid of limit cards with progress bars
   - Providers Table: Name, Tier, Status, Requests, Tokens, Latency, Errors
   - Models Table: Model ID, Providers, Type

2. **Providers** (`page-providers`) — All provider connections table

3. **Combos** (`page-combos`) — Fallback chain cards with cascade visualization

4. **Usage** (`page-usage`) — Bar chart (input/output tokens per day) + usage table

5. **Connections** (`page-connections`) — DB connection details table

6. **Logs** (`page-logs`) — Request log viewer

7. **Settings** (`page-settings`)
   - Caveman Mode slider (0-5 levels)
   - Feature toggles (RTK, Circuit Breaker, Streaming, Model Locks)
   - System Info table

## API Endpoints (already working)
All endpoints return JSON. The dashboard JS fetches these:

```javascript
// Stats
GET /8router/stats          → { session: {...}, allTime: {...} }

// Providers  
GET /8router/providers      → [{ id, name, apiKey, baseUrl, adapter, tier, models, enabled, totalRequests, totalTokens, errors }]

// Health
GET /8router/health         → [{ providerId, healthy, lastCheck, consecutiveErrors, avgLatencyMs }]

// Models
GET /8router/models         → [{ id, providers: ["groq"], object: "model" }]

// Combos
GET /8router/combos         → [{ name, description, tiers: [{ priority, provider, model }] }]

// Usage
GET /8router/usage?days=7   → [{ date, requests, inputTokens, outputTokens, cost, errors }]

// Connections
GET /8router/connections    → [{ id, provider, name, authType, testStatus, backoffLevel, totalRequests, totalTokens, totalCost }]

// Caveman Mode
GET /8router/caveman        → { level: 0-5 }
POST /8router/caveman       → body: { level: 0-5 }

// System Info
GET /8router/info           → { name, version, description, features, endpoints }
```

## Constraints
1. **Must be self-contained HTML** — no external dependencies (no npm packages for frontend)
2. **Must keep same page IDs** (`page-dashboard`, `page-providers`, etc.) for JS routing
3. **Must keep same element IDs** for JS to update data (`s-req`, `s-tokens`, `providers-body`, etc.)
4. **Can use any CSS framework approach** (inline styles, <style> tag, CSS variables)
5. **Can add new visualizations** (gauges, sparklines, heatmaps) using Canvas/SVG
6. **Dark theme** — must stay dark
7. **Mobile responsive** — sidebar collapses on mobile

## Design Direction
- Modern, clean, professional
- Inspired by: Vercel Dashboard, Linear, Raycast
- Color palette: Deep navy/dark blue backgrounds, purple accent, green/red status
- Smooth transitions, hover effects
- Good typography (Inter font)
- Card-based layouts with subtle borders

## How to Test Changes
```bash
# After editing dashboard.ts, restart the server:
cd /root/8router
pkill -f "tsx src/index.ts"
npx tsx src/index.ts &

# Test:
curl http://localhost:8080/ | head -5
```

## Current CSS Variables (can change)
```css
--bg-primary: #0b0d17
--bg-secondary: #111327
--bg-card: #161832
--border: #252850
--accent: #6c5ce7
--green: #00d68f
--red: #ff6b6b
--blue: #4dabf7
--purple: #b197fc
--cyan: #22d3ee
```

## Notes
- The `createDashboard()` function signature must stay the same
- The API port is passed as parameter `apiPort`
- Dashboard auto-refreshes every 5 seconds via `setInterval(refresh, 5000)`
- Topology uses Canvas API (can replace with SVG or CSS-only)
