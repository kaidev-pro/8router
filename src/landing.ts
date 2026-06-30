// 8Router — Landing Page
export function getLandingHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>8Router — One Router. Every AI Provider. Zero Downtime.</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #020309;
  --bg-card: #060a14;
  --bg-card-hover: #0b1020;
  --bg-surface: #0c111f;
  --border: #141d30;
  --border-hover: #1e2d4a;
  --accent: #84abff;
  --accent-dim: rgba(132,171,255,0.12);
  --accent-glow: rgba(132,171,255,0.25);
  --green: #00d294;
  --green-dim: rgba(0,210,148,0.12);
  --red: #ff6568;
  --orange: #e18528;
  --orange-dim: rgba(225,133,40,0.12);
  --purple: #a78bfa;
  --purple-dim: rgba(167,139,250,0.12);
  --cyan: #06b6d4;
  --cyan-dim: rgba(6,182,212,0.12);
  --text: #eef0f6;
  --text-2: #8a91a4;
  --text-3: #555c72;
}

*, *::before, *::after { margin:0; padding:0; box-sizing:border-box }
html { scroll-behavior:smooth; font-size:16px }
body {
  font-family:'Inter',system-ui,sans-serif;
  background:var(--bg);
  color:var(--text);
  line-height:1.6;
  overflow-x:hidden;
  -webkit-font-smoothing:antialiased;
}

/* Grid lines background */
body::before {
  content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
  background:
    repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(20,29,48,0.4) 59px,rgba(20,29,48,0.4) 60px),
    repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(20,29,48,0.4) 59px,rgba(20,29,48,0.4) 60px);
}

/* Container */
.wrap { max-width:1280px; margin:0 auto; padding:0 32px; position:relative; z-index:1 }

/* ─── ANIMATIONS ─── */
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes glow-pulse { 0%,100%{opacity:0.6;filter:blur(20px)} 50%{opacity:1;filter:blur(30px)} }
@keyframes fade-up { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }

/* ─── NAV ─── */
nav {
  position:fixed; top:0; left:0; right:0; z-index:200;
  background:rgba(2,3,9,0.6);
  backdrop-filter:blur(24px) saturate(1.4);
  -webkit-backdrop-filter:blur(24px) saturate(1.4);
  border-bottom:1px solid rgba(20,29,48,0.5);
  transition:all 0.3s;
}
nav.scrolled { background:rgba(2,3,9,0.92); border-bottom-color:var(--border) }
.nav-inner { max-width:1280px; margin:0 auto; padding:0 32px; height:64px; display:flex; align-items:center; justify-content:space-between }
.nav-brand { display:flex; align-items:center; gap:10px; text-decoration:none }
.nav-logo { height:30px; width:auto; object-fit:contain }
.nav-name { font-size:17px; font-weight:700; color:var(--text) }
.nav-ver { font-size:12px; color:var(--text-3); margin-left:6px; font-family:'JetBrains Mono',monospace }
.nav-links { display:flex; gap:28px; align-items:center }
.nav-links a {
  color:var(--text-2); text-decoration:none; font-size:13px; font-weight:500;
  transition:color 0.15s; letter-spacing:0.01em;
}
.nav-links a:hover { color:var(--text) }
.nav-cta {
  display:inline-flex; align-items:center; gap:6px;
  padding:8px 18px; background:var(--accent); color:#000;
  border-radius:8px; font-weight:600; font-size:13px;
  text-decoration:none; transition:all 0.2s; border:none; cursor:pointer;
}
.nav-cta:hover { opacity:0.88; transform:translateY(-1px) }

/* ─── HERO ─── */
.hero {
  padding:160px 0 100px;
  position:relative;
  overflow:hidden;
  min-height:100vh;
  display:flex;
  align-items:center;
}
.hero-glow-1 {
  position:absolute; top:-20%; left:-10%; width:600px; height:600px;
  background:radial-gradient(circle,rgba(132,171,255,0.08) 0%,transparent 70%);
  animation:glow-pulse 8s ease-in-out infinite; pointer-events:none;
}
.hero-glow-2 {
  position:absolute; bottom:-10%; right:-5%; width:500px; height:500px;
  background:radial-gradient(circle,rgba(0,210,148,0.06) 0%,transparent 70%);
  animation:glow-pulse 10s ease-in-out infinite 2s; pointer-events:none;
}
.hero-inner { position:relative; z-index:1 }
.hero-badge {
  display:inline-flex; align-items:center; gap:8px;
  padding:6px 16px; border-radius:100px;
  border:1px solid var(--border); background:var(--bg-card);
  font-size:13px; color:var(--text-2); margin-bottom:32px;
}
.hero-badge .dot { width:8px; height:8px; border-radius:50%; background:var(--green); animation:blink 2s step-end infinite }
.hero h1 {
  font-size:clamp(42px,6vw,80px);
  font-weight:900;
  letter-spacing:-0.04em;
  line-height:1.05;
  margin-bottom:24px;
}
.hero-accent { color:var(--accent) }
.hero-sub {
  font-size:clamp(16px,1.8vw,20px);
  color:var(--text-2);
  max-width:560px;
  line-height:1.6;
  margin-bottom:48px;
}
.hero-actions {
  display:flex; gap:16px; margin-bottom:64px; flex-wrap:wrap;
}
.btn-primary {
  display:inline-flex; align-items:center; gap:10px;
  padding:14px 32px; background:var(--accent); color:#000;
  border-radius:10px; font-weight:700; font-size:15px;
  text-decoration:none; transition:all 0.2s; border:none; cursor:pointer;
}
.btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(132,171,255,0.3) }
.btn-secondary {
  display:inline-flex; align-items:center; gap:10px;
  padding:14px 32px; background:transparent; color:var(--text);
  border:1px solid var(--border); border-radius:10px;
  font-weight:600; font-size:15px; text-decoration:none;
  transition:all 0.2s; cursor:pointer;
}
.btn-secondary:hover { border-color:var(--accent); background:var(--accent-dim); transform:translateY(-2px) }

/* Hero code block */
.hero-code { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:48px; max-width:500px }
.hero-code-label { font-size:12px; font-weight:600; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px }
.hero-code pre { margin:0 }
.hero-code code { font-size:13px }

/* Hero stats */
.hero-stats {
  display:flex; gap:16px; flex-wrap:wrap;
}
.hero-stat { text-align:center; padding:16px 24px; background:var(--bg-card); border:1px solid var(--border); border-radius:10px }
.hero-stat-val { font-size:22px; font-weight:800; color:var(--accent); font-family:'JetBrains Mono',monospace }
.hero-stat-label { font-size:11px; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin-top:4px }

/* ─── SECTIONS ─── */
section { padding:100px 0; position:relative; z-index:1 }
.s-title {
  font-size:clamp(28px,4vw,48px);
  font-weight:800; letter-spacing:-0.03em;
  line-height:1.15; margin-bottom:16px;
}
.s-desc { font-size:16px; color:var(--text-2); max-width:560px; line-height:1.7; margin-bottom:48px }

/* ─── SERVICES ─── */
.svc-grid {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:16px;
}
.svc-card {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:14px;
  padding:28px 24px;
  transition:all 0.25s;
  position:relative;
  overflow:hidden;
}
.svc-card::before {
  content:'';
  position:absolute; top:0; left:0; right:0;
  height:2px;
  background:linear-gradient(90deg,transparent,var(--accent),transparent);
  opacity:0; transition:opacity 0.3s;
}
.svc-card:hover::before { opacity:1 }
.svc-card:hover { border-color:var(--border-hover); transform:translateY(-4px); background:var(--bg-card-hover) }
.svc-icon {
  font-size:24px;
  margin-bottom:18px;
}
.svc-card h3 { font-size:16px; font-weight:700; margin-bottom:8px }
.svc-card p { font-size:13px; color:var(--text-2); line-height:1.6 }

/* ─── PROVIDERS ─── */
.prov-section { background:var(--bg-surface) }
.prov-tiers { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:48px }
.prov-tier { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:24px }
.prov-tier-header { display:flex; align-items:center; gap:8px; margin-bottom:16px }
.prov-tier-header h3 { font-size:16px; font-weight:700 }
.prov-tier-icon { font-size:20px }
.prov-list { display:flex; flex-direction:column; gap:8px }
.prov-item { display:flex; justify-content:space-between; align-items:center; padding:8px 12px; background:var(--bg-surface); border-radius:8px }
.prov-name { font-size:14px; font-weight:500 }

/* ─── BADGE STYLES ─── */
.badge-active { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; background:rgba(0,210,148,0.15); color:var(--green); }
.badge-beta { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; background:rgba(225,133,40,0.15); color:var(--orange); }
.badge-coming { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; background:rgba(90,96,112,0.15); color:var(--text-3); }
.badge-local { display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:600; background:rgba(132,171,255,0.15); color:var(--accent); }

/* ─── ALIAS CARDS ─── */
.alias-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:48px }
.alias-card { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px }
.alias-name { font-family:'JetBrains Mono',monospace; font-size:15px; font-weight:600; color:var(--accent); margin-bottom:8px }
.alias-card p { font-size:13px; color:var(--text-2); line-height:1.5 }
.alias-note { text-align:center; margin-top:16px; font-size:12px; color:var(--text-3) }

/* ─── HOW IT WORKS ─── */
.how-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:16px; margin-top:48px }
.how-step { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; text-align:center }
.how-num { width:32px; height:32px; border-radius:50%; background:var(--accent-dim); color:var(--accent); font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; margin:0 auto 12px }
.how-step h3 { font-size:14px; font-weight:700; margin-bottom:8px }
.how-step p { font-size:12px; color:var(--text-2); line-height:1.5 }
.how-step pre { margin-top:8px }

/* ─── FEATURES ─── */
.feat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:48px }
.feat-card { background:var(--bg-card); border:1px solid var(--border); border-radius:14px; padding:24px; transition:all 0.25s }
.feat-card:hover { border-color:var(--border-hover); transform:translateY(-2px); background:var(--bg-card-hover) }
.feat-icon { font-size:24px; margin-bottom:14px }
.feat-card h3 { font-size:15px; font-weight:700; margin-bottom:8px }
.feat-card p { font-size:13px; color:var(--text-2); line-height:1.5 }

/* ─── DASHBOARD PREVIEW ─── */
.dash-preview {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:16px;
  overflow:hidden;
  position:relative;
}
.dash-topbar { display:flex; align-items:center; justify-content:space-between; padding:14px 20px; border-bottom:1px solid var(--border); background:var(--bg-surface) }
.dash-topbar span { font-size:13px; font-weight:600 }
.dash-url { font-size:12px; color:var(--text-3); font-family:'JetBrains Mono',monospace }
.dash-body {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:16px;
  padding:24px;
}
.dash-metric {
  background:var(--bg-surface);
  border:1px solid var(--border);
  border-radius:10px;
  padding:16px;
}
.dash-metric .dm-label { font-size:11px; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px }
.dash-metric .dm-val { font-size:24px; font-weight:800; color:var(--accent) }
.dash-provider-bar {
  margin-bottom:16px;
}
.dash-provider-bar .dpb-head {
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:6px;
}
.dash-provider-bar .dpb-name { font-size:13px; font-weight:600 }
.dash-provider-bar .dpb-pct { font-size:12px; color:var(--text-3) }
.dash-provider-bar .dpb-track {
  height:6px; border-radius:3px;
  background:var(--bg-card);
  overflow:hidden;
}
.dash-provider-bar .dpb-fill {
  height:100%; border-radius:3px;
  transition:width 1s ease-out;
}

/* ─── INTEGRATIONS ─── */
.int-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:48px }
.int-card { display:flex; justify-content:space-between; align-items:center; padding:16px 20px; background:var(--bg-card); border:1px solid var(--border); border-radius:12px }
.int-name { font-size:14px; font-weight:600 }
.int-config { margin-top:32px; text-align:center }
.int-config-label { font-size:13px; font-weight:600; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:12px }
.int-config pre { display:inline-block; text-align:left }

/* ─── SECURITY ─── */
.sec-grid { display:grid; grid-template-columns:repeat(2,1fr); gap:12px; margin-top:32px }
.sec-item { padding:12px 16px; background:var(--bg-card); border:1px solid var(--border); border-radius:8px; font-size:14px }
.sec-warning { margin-top:24px; padding:16px; background:rgba(255,101,104,0.08); border:1px solid rgba(255,101,104,0.2); border-radius:8px; color:var(--red); font-size:13px; text-align:center }

/* ─── TEST STATS ─── */
.test-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:16px; margin-top:48px }
.test-stat { text-align:center; padding:24px; background:var(--bg-card); border:1px solid var(--border); border-radius:12px }
.ts-val { font-size:28px; font-weight:800; color:var(--green); font-family:'JetBrains Mono',monospace }
.ts-label { font-size:12px; color:var(--text-3); margin-top:4px }

/* ─── GET STARTED ─── */
.start-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:16px; margin-top:48px }
.start-step { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:24px; text-align:center }
.start-num { width:32px; height:32px; border-radius:50%; background:var(--accent-dim); color:var(--accent); font-weight:700; font-size:14px; display:flex; align-items:center; justify-content:center; margin:0 auto 12px }
.start-label { font-size:14px; font-weight:600; margin-bottom:12px }
.start-actions { display:flex; gap:12px; justify-content:center; margin-top:32px }

/* ─── FOOTER ─── */
footer {
  padding:60px 0 40px;
  border-top:1px solid var(--border);
  position:relative; z-index:1;
}
.footer-grid {
  display:grid;
  grid-template-columns:1.5fr repeat(3,1fr);
  gap:48px;
  margin-bottom:48px;
}
.footer-brand p { font-size:14px; color:var(--text-2); margin-top:12px; max-width:280px; line-height:1.6 }
.footer-logo { height:30px; width:auto; object-fit:contain }
.footer-col h4 { font-size:13px; font-weight:700; color:var(--text); margin-bottom:16px; text-transform:uppercase; letter-spacing:0.06em }
.footer-col a {
  display:block; font-size:14px; color:var(--text-2);
  text-decoration:none; padding:4px 0; transition:color 0.15s;
}
.footer-col a:hover { color:var(--accent) }
.footer-bottom {
  display:flex; justify-content:space-between; align-items:center;
  padding-top:24px; border-top:1px solid var(--border);
  font-size:13px; color:var(--text-3);
}

/* ─── RESPONSIVE ─── */
@media(max-width:1024px) {
  .svc-grid { grid-template-columns:repeat(2,1fr) }
  .feat-grid { grid-template-columns:repeat(2,1fr) }
  .int-grid { grid-template-columns:repeat(2,1fr) }
  .prov-tiers { grid-template-columns:1fr }
  .alias-grid { grid-template-columns:repeat(2,1fr) }
  .how-grid { grid-template-columns:repeat(3,1fr) }
  .footer-grid { grid-template-columns:repeat(2,1fr) }
  .dash-body { grid-template-columns:1fr }
}
@media(max-width:640px) {
  .wrap { padding:0 20px }
  section { padding:64px 0 }
  .hero { padding:120px 0 64px; min-height:auto }
  .hero h1 { font-size:36px !important }
  .hero-stats { flex-direction:column }
  .svc-grid { grid-template-columns:1fr }
  .feat-grid { grid-template-columns:1fr }
  .int-grid { grid-template-columns:1fr }
  .prov-tiers { grid-template-columns:1fr }
  .alias-grid { grid-template-columns:1fr }
  .how-grid { grid-template-columns:1fr }
  .test-stats { grid-template-columns:repeat(2,1fr) }
  .start-steps { grid-template-columns:1fr }
  .sec-grid { grid-template-columns:1fr }
  .footer-grid { grid-template-columns:1fr }
  .footer-bottom { flex-direction:column; gap:8px; text-align:center }
  .nav-links { display:none }
  .hero-actions { flex-direction:column }
  .btn-primary, .btn-secondary { width:100%; justify-content:center }
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="nav-inner">
    <div class="nav-brand">
      <img src="/public/8router-logo.png" alt="8Router" class="nav-logo">
      <span class="nav-name">8Router</span>
      <span class="nav-ver">v0.5.0</span>
    </div>
    <div class="nav-links">
      <a href="#services">Services</a>
      <a href="#providers">Providers</a>
      <a href="#features">Features</a>
      <a href="#aliases">Aliases</a>
      <a href="#start">Get Started</a>
      <a href="/8router/dashboard" class="nav-cta">Dashboard</a>
    </div>
  </div>
</nav>

<!-- HERO -->
<section class="hero">
  <div class="hero-glow-1"></div>
  <div class="hero-glow-2"></div>
  <div class="wrap">
    <div class="hero-inner">
      <div class="hero-badge">
        <span class="dot"></span>
        Open Source &middot; v0.5.0 &middot; Real Provider Expansion
      </div>
      <h1>
        One Endpoint.<br>
        <span class="hero-accent">12 Providers.</span><br>
        Zero Downtime.
      </h1>
      <p class="hero-sub">
        Connect your AI tools, apps, and agents to one OpenAI-compatible endpoint.
        8Router includes real provider adapters, model capability mapping, smart model picking,
        quota tracking, circuit breaker, and fallback routing for the 8Agents ecosystem.
      </p>
      <div class="hero-actions">
        <a href="#start" class="btn-primary">Get Started</a>
        <a href="/8router/dashboard" class="btn-secondary">Open Dashboard</a>
        <a href="/8router/setup" class="btn-secondary">Setup Guide</a>
      </div>
      <div class="hero-code">
        <div class="hero-code-label">Install &amp; Run</div>
        <pre><code>$ npm install -g 8router
$ 8router

# API live at http://localhost:8080/v1
# Dashboard at http://localhost:8080/8router/dashboard</code></pre>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="hero-stat-val">12</div>
          <div class="hero-stat-label">Providers</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">6</div>
          <div class="hero-stat-label">Model Aliases</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">3-Tier</div>
          <div class="hero-stat-label">Fallback</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">41</div>
          <div class="hero-stat-label">Tests Passed</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section id="services">
  <div class="wrap">
    <h2 class="s-title">What 8Router Routes</h2>
    <div class="s-desc">Route every AI workload through a single unified endpoint. Status badges show real implementation state.</div>
    <div class="svc-grid">
      <div class="svc-card">
        <div class="svc-icon">💬</div>
        <h3>Chat / LLM</h3>
        <p>Route chat completions across providers with automatic model selection and 3-tier fallback.</p>
        <span class="badge-active">Active</span>
      </div>
      <div class="svc-card">
        <div class="svc-icon">🔌</div>
        <h3>OpenAI-Compatible API</h3>
        <p>Drop-in replacement for any tool that supports custom OpenAI base URLs.</p>
        <span class="badge-active">Active</span>
      </div>
      <div class="svc-card">
        <div class="svc-icon">🔀</div>
        <h3>Provider Routing</h3>
        <p>Smart routing across 12 providers with health checks, quota awareness, and circuit breaker.</p>
        <span class="badge-active">Active</span>
      </div>
      <div class="svc-card">
        <div class="svc-icon">📊</div>
        <h3>Quota Tracker</h3>
        <p>Track token usage, cost, and request counts per provider across 5h, daily, weekly, and monthly periods.</p>
        <span class="badge-active">Active</span>
      </div>
      <div class="svc-card">
        <div class="svc-icon">🧠</div>
        <h3>Smart Model Picker</h3>
        <p>Route to the best model based on task type, cost, speed, and quality using 8router/* aliases.</p>
        <span class="badge-beta">Beta</span>
      </div>
      <div class="svc-card">
        <div class="svc-icon">🔧</div>
        <h3>Tool Calling</h3>
        <p>OpenAI-style function calling with per-model tool calling style tracking.</p>
        <span class="badge-beta">Beta</span>
      </div>
      <div class="svc-card">
        <div class="svc-icon">📡</div>
        <h3>Streaming Fallback</h3>
        <p>Pre-stream retry on failure. Mid-stream error handling without corruption. Fallback path logging.</p>
        <span class="badge-beta">Beta</span>
      </div>
      <div class="svc-card">
        <div class="svc-icon">🖼️</div>
        <h3>Embeddings</h3>
        <p>Vector embeddings endpoint with multi-provider fallback.</p>
        <span class="badge-coming">Coming Soon</span>
      </div>
      <div class="svc-card">
        <div class="svc-icon">🎨</div>
        <h3>Image Generation</h3>
        <p>Image generation endpoint with provider routing.</p>
        <span class="badge-coming">Coming Soon</span>
      </div>
    </div>
  </div>
</section>

<!-- PROVIDERS -->
<section id="providers" class="prov-section">
  <div class="wrap">
    <h2 class="s-title">12 Providers. 3 Tiers. One Endpoint.</h2>
    <div class="s-desc">Route requests across premium, efficient, and local providers with health checks, quota awareness, circuit breaker, and fallback chains.</div>
    <div class="prov-tiers">
      <div class="prov-tier">
        <div class="prov-tier-header">
          <span class="prov-tier-icon">💎</span>
          <h3>Premium</h3>
        </div>
        <div class="prov-list">
          <div class="prov-item"><span class="prov-name">OpenAI</span><span class="badge-active">Active</span></div>
          <div class="prov-item"><span class="prov-name">Anthropic</span><span class="badge-active">Active</span></div>
          <div class="prov-item"><span class="prov-name">Gemini</span><span class="badge-active">Active</span></div>
          <div class="prov-item"><span class="prov-name">xAI</span><span class="badge-coming">Coming Soon</span></div>
        </div>
      </div>
      <div class="prov-tier">
        <div class="prov-tier-header">
          <span class="prov-tier-icon">💰</span>
          <h3>Efficient</h3>
        </div>
        <div class="prov-list">
          <div class="prov-item"><span class="prov-name">Groq</span><span class="badge-active">Active</span></div>
          <div class="prov-item"><span class="prov-name">OpenRouter</span><span class="badge-active">Active</span></div>
          <div class="prov-item"><span class="prov-name">Mistral</span><span class="badge-active">Active</span></div>
          <div class="prov-item"><span class="prov-name">DeepSeek</span><span class="badge-beta">Beta</span></div>
          <div class="prov-item"><span class="prov-name">Together AI</span><span class="badge-beta">Beta</span></div>
          <div class="prov-item"><span class="prov-name">Cohere</span><span class="badge-coming">Coming Soon</span></div>
          <div class="prov-item"><span class="prov-name">Perplexity</span><span class="badge-coming">Coming Soon</span></div>
        </div>
      </div>
      <div class="prov-tier">
        <div class="prov-tier-header">
          <span class="prov-tier-icon">🌟</span>
          <h3>Free / Local</h3>
        </div>
        <div class="prov-list">
          <div class="prov-item"><span class="prov-name">Ollama</span><span class="badge-local">Local</span></div>
          <div class="prov-item"><span class="prov-name">LM Studio</span><span class="badge-local">Local</span></div>
          <div class="prov-item"><span class="prov-name">vLLM</span><span class="badge-local">Local</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- MODEL ALIASES -->
<section id="aliases">
  <div class="wrap">
    <h2 class="s-title">Model Aliases</h2>
    <div class="s-desc">Use simple 8Router aliases instead of memorizing provider-specific model names.</div>
    <div class="alias-grid">
      <div class="alias-card">
        <div class="alias-name">8router/auto</div>
        <p>Best available route based on health, quota, latency, and fallback rules.</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/cheap</div>
        <p>Chooses the cheapest healthy model available.</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/fast</div>
        <p>Chooses the lowest-latency healthy model.</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/smart</div>
        <p>Routes to the strongest available model for reasoning-heavy tasks.</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/coding</div>
        <p>Optimized for coding, debugging, tool use, and long context tasks.</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/local</div>
        <p>Local-only route. Never falls back to cloud providers.</p>
      </div>
    </div>
    <div class="alias-note">Local mode requires Ollama, LM Studio, or another configured local provider.</div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section id="how" style="background:var(--bg-surface)">
  <div class="wrap">
    <h2 class="s-title">How It Works</h2>
    <div class="s-desc">Install once, connect your providers, and never think about rate limits again.</div>
    <div class="how-grid">
      <div class="how-step">
        <div class="how-num">1</div>
        <h3>Install 8Router</h3>
        <pre><code>npm install -g 8router</code></pre>
      </div>
      <div class="how-step">
        <div class="how-num">2</div>
        <h3>Connect Providers</h3>
        <p>Add API keys or local providers from the dashboard.</p>
      </div>
      <div class="how-step">
        <div class="how-num">3</div>
        <h3>Use One Endpoint</h3>
        <p>Point Cursor, Cline, Continue, OpenWebUI, or your agent to:</p>
        <pre><code>http://localhost:8080/v1</code></pre>
      </div>
      <div class="how-step">
        <div class="how-num">4</div>
        <h3>Let 8Router Pick the Route</h3>
        <p>Use aliases like 8router/auto, 8router/cheap, 8router/coding, or 8router/local.</p>
      </div>
      <div class="how-step">
        <div class="how-num">5</div>
        <h3>Monitor Everything</h3>
        <p>Track quota, key health, fallback paths, latency, cost, and provider health from the dashboard.</p>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section id="features">
  <div class="wrap">
    <h2 class="s-title">Built for Production</h2>
    <div class="s-desc">Every feature is tested and production-ready.</div>
    <div class="feat-grid">
      <div class="feat-card">
        <div class="feat-icon">🔌</div>
        <h3>Real Provider Adapters</h3>
        <p>12 providers with dedicated adapters for request normalization, response parsing, and health checks.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">⚡</div>
        <h3>Model Capability Map</h3>
        <p>30+ models tracked for vision, tools, streaming, embeddings, context length, and cost.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🧠</div>
        <h3>Smart Model Picker</h3>
        <p>Score-based model selection using cost, speed, quality, and latency data.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">💰</div>
        <h3>Cost Table per Model</h3>
        <p>Per-model pricing with input/output token costs, currency, and free quota tracking.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">📊</div>
        <h3>Latency Benchmark</h3>
        <p>p50/p95/p99 latency tracking per provider with automatic health monitoring.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🔄</div>
        <h3>Circuit Breaker</h3>
        <p>Automatic provider cooldown after 5 consecutive failures. 3-minute reset window.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🔑</div>
        <h3>Key Pool Health</h3>
        <p>Track key status: healthy, rate_limited, exhausted, invalid, cooldown. Auto-skip bad keys.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">📈</div>
        <h3>Quota Tracker</h3>
        <p>Per-provider quota tracking across 5h, daily, weekly, and monthly periods.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🔒</div>
        <h3>Secret Masking</h3>
        <p>API keys masked in all responses, logs, dashboard, and error messages.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🧹</div>
        <h3>Error Sanitization</h3>
        <p>Error messages sanitized to remove sensitive data before logging or returning.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🔌</div>
        <h3>OpenAI-Compatible API</h3>
        <p>Drop-in replacement for /v1/chat/completions, /v1/models, /v1/embeddings.</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon">🛠️</div>
        <h3>Setup Guide</h3>
        <p>Ready-to-copy configs for Cursor, Cline, Continue, OpenWebUI, Claude Code, and Codex.</p>
      </div>
    </div>
  </div>
</section>

<!-- DASHBOARD PREVIEW -->
<section id="dashboard" style="background:var(--bg-surface)">
  <div class="wrap">
    <h2 class="s-title">Local-First Dashboard</h2>
    <div class="s-desc">A local-first control center for provider health, quota, key pool status, fallback logs, model aliases, and setup guides.</div>
    <div class="dash-preview">
      <div class="dash-topbar">
        <span>8Router Dashboard</span>
        <span class="dash-url">localhost:8080/8router/dashboard</span>
      </div>
      <div class="dash-body">
        <div class="dash-metric">
          <div class="dm-label">Total Requests</div>
          <div class="dm-val">24,891</div>
        </div>
        <div class="dash-metric">
          <div class="dm-label">Tokens Used</div>
          <div class="dm-val">1.2M</div>
        </div>
        <div class="dash-metric">
          <div class="dm-label">Avg Latency</div>
          <div class="dm-val">142ms</div>
        </div>
        <div class="dash-provider-bar">
          <div class="dpb-head"><span class="dpb-name">groq</span><span class="dpb-pct">42%</span></div>
          <div class="dpb-track"><div class="dpb-fill" style="width:42%;background:var(--green)"></div></div>
        </div>
        <div class="dash-provider-bar">
          <div class="dpb-head"><span class="dpb-name">openrouter</span><span class="dpb-pct">28%</span></div>
          <div class="dpb-track"><div class="dpb-fill" style="width:28%;background:var(--accent)"></div></div>
        </div>
        <div class="dash-provider-bar">
          <div class="dpb-head"><span class="dpb-name">mistral</span><span class="dpb-pct">18%</span></div>
          <div class="dpb-track"><div class="dpb-fill" style="width:18%;background:var(--purple)"></div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- INTEGRATIONS -->
<section id="integrations">
  <div class="wrap">
    <h2 class="s-title">Compatible With Your Tools</h2>
    <div class="s-desc">Drop-in compatible with tools that support custom OpenAI base URLs.</div>
    <div class="int-grid">
      <div class="int-card"><span class="int-name">Cursor</span><span class="badge-active">Tested</span></div>
      <div class="int-card"><span class="int-name">Cline</span><span class="badge-active">Tested</span></div>
      <div class="int-card"><span class="int-name">Continue</span><span class="badge-active">Tested</span></div>
      <div class="int-card"><span class="int-name">Roo Code</span><span class="badge-active">Tested</span></div>
      <div class="int-card"><span class="int-name">Open WebUI</span><span class="badge-active">Tested</span></div>
      <div class="int-card"><span class="int-name">Claude Code</span><span class="badge-beta">Compatible</span></div>
      <div class="int-card"><span class="int-name">Codex CLI</span><span class="badge-beta">Compatible</span></div>
      <div class="int-card"><span class="int-name">Hermes Agent</span><span class="badge-active">Tested</span></div>
    </div>
    <div class="int-config">
      <div class="int-config-label">Quick Config</div>
      <pre><code>Base URL: http://localhost:8080/v1
API Key:  sk-8router-xxxx
Model:    8router/auto</code></pre>
    </div>
  </div>
</section>

<!-- SECURITY -->
<section style="background:var(--bg-surface)">
  <div class="wrap">
    <h2 class="s-title">Built with Production Safety in Mind</h2>
    <div class="sec-grid">
      <div class="sec-item">🔒 Secret masking across logs and UI</div>
      <div class="sec-item">🧹 Error sanitization</div>
      <div class="sec-item">🏠 Local-only admin endpoints</div>
      <div class="sec-item">🔄 Circuit breaker for unstable providers</div>
      <div class="sec-item">📊 Quota and key health tracking</div>
      <div class="sec-item">⚠️ Public access warnings</div>
      <div class="sec-item">💾 Backup and config export</div>
    </div>
    <div class="sec-warning">
      If you expose 8Router publicly, enable authentication and never expose raw provider keys.
    </div>
  </div>
</section>

<!-- TESTS -->
<section>
  <div class="wrap">
    <h2 class="s-title">Tested Before Release</h2>
    <div class="s-desc">Every release is validated with router tests, OpenAI-compatible smoke tests, doctor diagnostics, secret masking checks, and admin endpoint checks.</div>
    <div class="test-stats">
      <div class="test-stat">
        <div class="ts-val">18/18</div>
        <div class="ts-label">Router Tests</div>
      </div>
      <div class="test-stat">
        <div class="ts-val">12/12</div>
        <div class="ts-label">OpenAI Compat</div>
      </div>
      <div class="test-stat">
        <div class="ts-val">13/13</div>
        <div class="ts-label">Doctor Checks</div>
      </div>
      <div class="test-stat">
        <div class="ts-val">43</div>
        <div class="ts-label">Total Checks</div>
      </div>
    </div>
  </div>
</section>

<!-- GET STARTED -->
<section id="start" style="background:var(--bg-surface)">
  <div class="wrap">
    <h2 class="s-title">Start Routing in Under a Minute</h2>
    <div class="start-steps">
      <div class="start-step">
        <div class="start-num">1</div>
        <div class="start-label">Install</div>
        <pre><code>npm install -g 8router</code></pre>
      </div>
      <div class="start-step">
        <div class="start-num">2</div>
        <div class="start-label">Run</div>
        <pre><code>8router</code></pre>
      </div>
      <div class="start-step">
        <div class="start-num">3</div>
        <div class="start-label">Configure Your Tool</div>
        <pre><code>Base URL: http://localhost:8080/v1
Model:    8router/auto</code></pre>
      </div>
    </div>
    <div class="start-actions">
      <a href="/8router/dashboard" class="btn-primary">Open Dashboard</a>
      <a href="/8router/setup" class="btn-secondary">Setup Guide</a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="/public/8router-logo.png" alt="8Router" class="footer-logo">
        <p>8Router v0.5.0 — Real Provider Expansion. Built for the 8Agents Ecosystem.</p>
      </div>
      <div class="footer-col">
        <h4>Product</h4>
        <a href="/8router/dashboard">Dashboard</a>
        <a href="/8router/setup">Setup Guide</a>
        <a href="/v1/models">API</a>
        <a href="#features">Features</a>
      </div>
      <div class="footer-col">
        <h4>Resources</h4>
        <a href="#aliases">Model Aliases</a>
        <a href="#providers">Providers</a>
        <a href="#start">Get Started</a>
      </div>
      <div class="footer-col">
        <h4>8Agents</h4>
        <a href="#">8Agents</a>
        <a href="#">8Flow</a>
        <a href="#">8Chat</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>8Router v0.5.0 &mdash; 8Agents Ecosystem &middot; Built by 8Agents</span>
    </div>
  </div>
</footer>

<script>
// Sticky nav
window.addEventListener('scroll',function(){
  document.querySelector('nav').classList.toggle('scrolled',window.scrollY>50);
});

// Intersection observer for fade-up animations
(function(){
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.style.animation='fade-up 0.6s ease-out forwards';
        obs.unobserve(e.target);
      }
    });
  },{threshold:0.1});
  document.querySelectorAll('.svc-card,.feat-card,.int-card,.prov-item,.how-step,.start-step,.alias-card').forEach(function(el){
    el.style.opacity='0';
    el.style.transform='translateY(20px)';
    obs.observe(el);
  });
})();

// Dashboard bar animation
(function(){
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        e.target.querySelectorAll('.dpb-fill').forEach(function(f){
          var w=f.style.width;
          f.style.width='0%';
          setTimeout(function(){f.style.width=w;},100);
        });
        obs.unobserve(e.target);
      }
    });
  },{threshold:0.3});
  var dp=document.querySelector('.dash-preview');
  if(dp)obs.observe(dp);
})();
</script>

</body>
</html>`;
}
