// 8Router — Landing Page (i18n) — Redesigned per Brief
import { VERSION_STRING } from './version.js';
import { t, getLocale, type Locale, SUPPORTED_LOCALES } from './i18n/index.js';

export function getLandingHTML(locale: Locale = 'en', donationUrl?: string): string {
  const _ = (key: string) => t(key, locale);
  const donateHref = donationUrl || '';

  // SVG icons — 20x20 viewBox, stroke-based, 1.5px
  const icons: Record<string, string> = {
    route: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`,
    zap: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    terminal: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    layoutDashboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
    key: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    alertTriangle: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
    activity: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    gitBranch: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>`,
    github: `<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>`,
  };

  const icon = (name: string) => `<span class="icon">${icons[name] || ''}</span>`;

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${_('meta.title')}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #020309;
  --bg-card: #060a14;
  --bg-surface: #0c111f;
  --border: #141d30;
  --border-hover: #1e2d4a;
  --accent: #84abff;
  --accent-dim: rgba(132,171,255,0.1);
  --green: #00d294;
  --green-dim: rgba(0,210,148,0.1);
  --red: #ff6568;
  --red-dim: rgba(255,101,104,0.1);
  --orange: #e18528;
  --orange-dim: rgba(225,133,40,0.1);
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --text: #f5f7fb;
  --text-2: #b4bdcc;
  --text-3: #8994a7;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.75rem;
  --text-3xl: 2.25rem;
  --text-hero: clamp(2.25rem, 6vw, 4rem);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;font-size:16px;overflow-x:hidden}
body{font-family:var(--font-sans);background:var(--bg);color:var(--text);line-height:1.6;overflow-x:hidden;-webkit-font-smoothing:antialiased}
body::before{content:'';position:fixed;inset:0;z-index:0;pointer-events:none;background:repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(20,29,48,0.3) 59px,rgba(20,29,48,0.3) 60px),repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(20,29,48,0.3) 59px,rgba(20,29,48,0.3) 60px)}
.wrap{max-width:1100px;margin:0 auto;padding:0 24px;position:relative;z-index:1}
a{color:var(--accent);text-decoration:none}
a:hover{text-decoration:underline}
code{font-family:var(--font-mono);font-size:0.9em}
img,svg{max-width:100%;height:auto}

/* Nav */
nav{position:fixed;top:0;left:0;right:0;z-index:200;background:rgba(2,3,9,0.7);backdrop-filter:blur(20px);border-bottom:1px solid rgba(20,29,48,0.5)}
.nav-inner{max-width:1100px;margin:0 auto;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
.nav-brand{font-weight:700;font-size:1.1rem;color:var(--text);text-decoration:none;display:flex;align-items:center;gap:8px}
.nav-brand span{color:var(--accent)}
.nav-links{display:flex;gap:24px;align-items:center}
.nav-links a{color:var(--text-3);font-size:var(--text-sm);font-weight:500;transition:color 0.15s}
.nav-links a:hover{color:var(--text);text-decoration:none}
.nav-cta{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;background:var(--accent);color:#000;border-radius:8px;font-weight:600;font-size:var(--text-sm);transition:opacity 0.15s}
.nav-cta:hover{opacity:0.85;text-decoration:none}

/* Sections */
section{padding:80px 0;position:relative;z-index:1}
.s-label{display:inline-flex;align-items:center;gap:6px;font-size:var(--text-xs);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);margin-bottom:12px}
.s-title{font-size:var(--text-2xl);font-weight:700;letter-spacing:-0.02em;margin-bottom:12px}
.s-desc{color:var(--text-2);max-width:56ch;line-height:1.6;margin-bottom:40px}

/* Hero */
.hero{padding:140px 0 80px;min-height:90vh;display:flex;align-items:center;position:relative;overflow:hidden}
.hero-glow{position:absolute;top:-20%;left:-10%;width:500px;height:500px;background:radial-gradient(circle,rgba(132,171,255,0.07) 0%,transparent 70%);pointer-events:none;animation:pulse 8s ease-in-out infinite}
@keyframes pulse{0%,100%{opacity:0.6}50%{opacity:1}}
.hero h1{font-size:var(--text-hero);font-weight:800;letter-spacing:-0.04em;line-height:1.05;margin-bottom:20px}
.hero-accent{color:var(--accent)}
.hero-sub{font-size:clamp(15px,1.6vw,18px);color:var(--text-2);max-width:52ch;line-height:1.65;margin-bottom:36px}
.hero-actions{display:flex;gap:12px;margin-bottom:48px;flex-wrap:wrap}
.btn-primary{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:var(--accent);color:#000;border-radius:8px;font-weight:700;font-size:14px;border:none;cursor:pointer;transition:all 0.2s;text-decoration:none}
.btn-primary:hover{transform:translateY(-1px);box-shadow:0 6px 24px rgba(132,171,255,0.25);text-decoration:none}
.btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:8px;font-weight:600;font-size:14px;text-decoration:none;transition:border-color 0.15s}
.btn-secondary:hover{border-color:var(--border-hover);text-decoration:none}

/* Route visualization */
.route-viz{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:24px;font-family:var(--font-mono);font-size:13px;line-height:1.8;overflow-x:auto}
.route-viz .label{color:var(--text-3);font-size:12px;text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
.route-viz .step{display:flex;align-items:center;gap:8px;padding:4px 0}
.route-viz .dot{width:8px;height:8px;border-radius:50%;flex-shrink:0}
.route-viz .dot-green{background:var(--green)}
.route-viz .dot-red{background:var(--red)}
.route-viz .dot-orange{background:var(--orange)}
.route-viz .line{width:1px;height:16px;background:var(--border);margin-left:3px}
.route-viz .strike{text-decoration:line-through;color:var(--text-3)}
.route-viz .ok{color:var(--green)}
.route-viz .fail{color:var(--red)}
.route-viz .recover{color:var(--orange)}

/* Problem cards */
.problem-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:16px}
.problem-card{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:20px;display:flex;gap:12px;align-items:flex-start}
.problem-card .icon{color:var(--red);flex-shrink:0;margin-top:2px}
.problem-card h3{font-size:var(--text-sm);font-weight:600;margin-bottom:4px}
.problem-card p{font-size:var(--text-sm);color:var(--text-3);line-height:1.5}

/* Steps */
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;counter-reset:step}
.step{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;padding:24px;counter-increment:step;position:relative}
.step::before{content:counter(step);display:flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-weight:700;font-size:13px;margin-bottom:14px}
.step h3{font-size:var(--text-base);font-weight:600;margin-bottom:8px}
.step p{font-size:var(--text-sm);color:var(--text-3);line-height:1.5}
.step code{display:block;margin-top:12px;padding:10px 14px;background:var(--bg);border-radius:6px;font-size:12px;color:var(--accent);border:1px solid var(--border)}

/* Aliases */
.alias-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:12px}
.alias-card{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:14px 16px;font-family:var(--font-mono);font-size:13px}
.alias-card .name{color:var(--accent);font-weight:600;margin-bottom:4px}
.alias-card .desc{color:var(--text-3);font-size:12px;font-family:var(--font-sans)}

/* Providers */
.provider-list{display:flex;flex-wrap:wrap;gap:10px}
.provider-chip{display:inline-flex;align-items:center;gap:6px;padding:6px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;font-size:var(--text-sm);color:var(--text-2);font-weight:500}

/* Integrations */
.integr-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(140px,1fr));gap:10px}
.integr-chip{display:flex;align-items:center;gap:8px;padding:10px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;font-size:var(--text-sm);color:var(--text-2)}

/* Dashboard preview */
.dash-preview{background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:20px;overflow:hidden}
.dash-bar{display:flex;gap:6px;margin-bottom:16px}
.dash-bar span{width:10px;height:10px;border-radius:50%}
.dash-bar .r{background:var(--red)}.dash-bar .y{background:var(--orange)}.dash-bar .g{background:var(--green)}
.dash-log{font-family:var(--font-mono);font-size:12px;line-height:1.7;color:var(--text-3)}
.dash-log .ts{color:var(--text-3);opacity:0.6}.dash-log .provider{color:var(--accent)}.dash-log .model{color:var(--green)}.dash-log .fail{color:var(--red)}.dash-log .ok{color:var(--green)}.dash-log .fallback{color:var(--orange)}

/* Setup */
.setup-code{background:var(--bg);border:1px solid var(--border);border-radius:8px;padding:16px 20px;font-family:var(--font-mono);font-size:13px;line-height:1.8;overflow-x:auto}
.setup-code .comment{color:var(--text-3)}.setup-code .key{color:var(--accent)}.setup-code .val{color:var(--green)}

/* Close */
.close{background:var(--bg-surface);text-align:center}
.close-icons{display:flex;justify-content:center;gap:32px;margin-bottom:24px;flex-wrap:wrap}
.close-item{display:flex;align-items:center;gap:8px;color:var(--text-2);font-size:var(--text-sm);font-weight:500}
.close-item .icon{color:var(--accent)}

/* Footer */
footer{padding:48px 0;border-top:1px solid var(--border);position:relative;z-index:1}
.footer-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:32px;margin-bottom:32px}
.footer-col h4{font-size:var(--text-xs);font-weight:600;text-transform:uppercase;letter-spacing:0.08em;color:var(--text-3);margin-bottom:12px}
.footer-col a{display:block;color:var(--text-3);font-size:var(--text-sm);margin-bottom:8px;transition:color 0.15s}
.footer-col a:hover{color:var(--text)}
.footer-bottom{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:12px;font-size:var(--text-xs);color:var(--text-3)}
.footer-locales{display:flex;gap:12px;flex-wrap:wrap}
.footer-locales a{color:var(--text-3);font-size:var(--text-xs)}
.footer-locales a.active{color:var(--accent);font-weight:600}

/* Responsive */
@media(max-width:640px){
  section{padding:56px 0}
  .hero{padding:120px 0 60px;min-height:auto}
  .hero h1{font-size:clamp(1.8rem,8vw,2.5rem)}
  .nav-links { display:none }
  .mobile-nav-cta { display:inline-flex }
  .wrap{padding:0 16px}
  .problem-grid,.steps{grid-template-columns:1fr}
  .alias-grid{grid-template-columns:repeat(2,1fr)}
}

/* svc-card / feat-card (test compatibility) */
.svc-card p { font-size:var(--text-sm); color:var(--text-2); line-height:1.6 }
.feat-card p { font-size:var(--text-sm); color:var(--text-2); line-height:1.5 }

/* hero-stat */
.hero-stat-label { font-size:var(--text-xs); line-height:1.35 }
.hero-stat-val { font-size:clamp(1.5rem,4vw,2.25rem) }

/* overflow guards */
html, body { overflow-x:hidden; max-width:100vw }
pre { overflow-x:auto; -webkit-overflow-scrolling:touch; max-width:100% }
.wrap { padding:0 20px; width:100%; max-width:100vw; overflow:hidden }
</style>
</head>
<body>

<nav>
<div class="nav-inner">
  <a class="nav-brand" href="/"><span>8</span>Router</a>
  <div class="nav-links">
    <a href="#problem">Problem</a>
    <a href="#how">How It Works</a>
    <a href="#aliases">Aliases</a>
    <a href="#providers">Providers</a>
    <a href="#setup">Setup</a>
    <a href="/8router/dashboard" class="nav-cta">${_('nav.dashboard')}</a>
  </div>
</div>
</nav>

<!-- ═══ HERO ═══ -->
<section class="hero">
<div class="hero-glow"></div>
<div class="wrap">
  <h1>${_('hero.title1')}<br><span class="hero-accent">${_('hero.title2')}</span></h1>
  <p class="hero-sub">Keys expire. Quotas reset. Providers go down. 8Router keeps your tools connected through one local endpoint &mdash; with inspectable fallback routing.</p>
  <div class="hero-actions">
    <a href="#setup" class="btn-primary">${_('hero.getStarted')}</a>
    <a href="/8router/dashboard" class="btn-secondary">${_('hero.openDashboard')}</a>
  </div>
  <div class="route-viz">
    <div class="label">Live routing example</div>
    <div class="step"><span class="dot dot-green"></span> <span class="provider">openai</span> &rarr; <span class="fail">429 rate limit</span></div>
    <div class="line"></div>
    <div class="step"><span class="dot dot-orange"></span> <span class="fallback">fallback</span> &rarr; <span class="provider">groq</span> &rarr; <span class="ok">200 OK</span> <span style="color:var(--text-3);font-size:12px;margin-left:8px">llama-3.1-8b-instant</span></div>
    <div class="line"></div>
    <div class="step"><span class="dot dot-green"></span> <span style="color:var(--text-3)">logged to dashboard &amp; request history</span></div>
  </div>
</div>
</section>

<!-- ═══ PROBLEM ═══ -->
<section id="problem" style="background:var(--bg-surface)">
<div class="wrap">
  <div class="s-label">${icon('alertTriangle')} Problem</div>
  <h2 class="s-title">Provider failures interrupt your workflow.</h2>
  <p class="s-desc">When you depend on a single API key or provider, any outage, rate limit, or quota exhaustion stops everything.</p>
  <div class="problem-grid">
    <div class="problem-card">
      ${icon('alertTriangle')}
      <div><h3>Rate limits</h3><p>API keys hit per-minute and per-day quotas without warning.</p></div>
    </div>
    <div class="problem-card">
      ${icon('alertTriangle')}
      <div><h3>Provider outages</h3><p>Cloud APIs have maintenance windows and regional failures.</p></div>
    </div>
    <div class="problem-card">
      ${icon('alertTriangle')}
      <div><h3>Key expiration</h3><p>Credentials rotate, expire, or get revoked mid-session.</p></div>
    </div>
    <div class="problem-card">
      ${icon('alertTriangle')}
      <div><h3>Model unavailability</h3><p>Specific models go down while others on the same provider stay up.</p></div>
    </div>
  </div>
</div>
</section>


<!-- ═══ REAL WORKFLOWS ═══ -->
<section id="workflows">
<div class="wrap">
  <div class="s-label">${icon('activity')} Real Workflows</div>
  <h2 class="s-title">${_('services.title')}</h2>
  <p class="s-desc">${_('services.sub')}</p>
</div>
</section>

<!-- ═══ HOW IT WORKS ═══ -->
<section id="how">
<div class="wrap">
  <div class="s-label">${icon('route')} How It Works</div>
  <h2 class="s-title">Connect. Point. Route.</h2>
  <p class="s-desc">8Router sits between your tools and providers. When one path fails, it routes to the next.</p>
  <div class="steps">
    <div class="step">
      <h3>Install &amp; configure</h3>
      <p>Add your provider API keys to the environment. You control your own credentials.</p>
      <code>PROVIDER_KEY_ENCRYPTION_SECRET=...<br>OPENAI_API_KEY=sk-...<br>GROQ_API_KEY=gsk-...</code>
    </div>
    <div class="step">
      <h3>Point your tools</h3>
      <p>Set any OpenAI-compatible tool to use 8Router as its base URL.</p>
      <code>Base URL: http://localhost:8080/v1<br>Model: 8router/auto</code>
    </div>
    <div class="step">
      <h3>It routes &amp; recovers</h3>
      <p>8Router tries providers in order. Failures trigger automatic fallback. Every decision is logged.</p>
    </div>
  </div>
</div>
</section>

<!-- ═══ ROUTING ALIASES ═══ -->
<section id="aliases" style="background:var(--bg-surface)">
<div class="wrap">
  <div class="s-label">${icon('gitBranch')} Routing Aliases</div>
  <h2 class="s-title">One model name. Multiple providers.</h2>
  <p class="s-desc">Aliases define provider priority order. Use them as your model name and 8Router handles the rest.</p>
  <div class="alias-grid">
    <div class="alias-card"><div class="name">8router/auto</div><div class="desc">Best available provider, auto-selected</div></div>
    <div class="alias-card"><div class="name">8router/cheap</div><div class="desc">Cheapest available, cost-first</div></div>
    <div class="alias-card"><div class="name">8router/fast</div><div class="desc">Lowest latency, speed-first</div></div>
    <div class="alias-card"><div class="name">8router/smart</div><div class="desc">Highest capability model</div></div>
    <div class="alias-card"><div class="name">8router/coding</div><div class="desc">Optimized for code generation</div></div>
    <div class="alias-card"><div class="name">8router/local</div><div class="desc">Local providers only (Ollama)</div></div>
  </div>
</div>
</section>


<!-- ═══ FEATURES ═══ -->
<section id="features" style="background:var(--bg-surface)">
<div class="wrap">
  <div class="s-label">${icon('shield')} Features</div>
  <h2 class="s-title">${_('features.title')}</h2>
  <p class="s-desc">${_('features.desc')}</p>
</div>
</section>

<!-- ═══ PROVIDERS DETAIL ═══ -->
<section id="providers-detail">
<div class="wrap">
  <div class="s-label">${icon('key')} Providers</div>
  <h2 class="s-title">${_('providers.title')}</h2>
  <p class="s-desc">${_('providers.desc')}</p>
</div>
</section>


<!-- ═══ DASHBOARD ═══ -->
<section id="dashboard-section" style="background:var(--bg-surface)">
<div class="wrap">
  <div class="s-label">${icon('layoutDashboard')} Dashboard</div>
  <h2 class="s-title">${_('dashboard.title')}</h2>
  <p class="s-desc">${_('dashboard.desc')}</p>
</div>
</section>

<!-- ═══ PRODUCT PROOF ═══ -->
<section id="dashboard">
<div class="wrap">
  <div class="s-label">${icon('layoutDashboard')} Inspectable Routing</div>
  <h2 class="s-title">Every decision is logged.</h2>
  <p class="s-desc">The dashboard shows what happened, which provider was used, and why fallbacks triggered. No black boxes.</p>
  <div class="dash-preview">
    <div class="dash-bar"><span class="r"></span><span class="y"></span><span class="g"></span></div>
    <div class="dash-log">
      <div><span class="ts">10:42:01</span> <span class="provider">openai</span> <span class="model">gpt-4o-mini</span> <span class="fail">&#x2717; 429</span></div>
      <div><span class="ts">10:42:01</span> <span class="fallback">fallback</span> &rarr; <span class="provider">groq</span> <span class="model">llama-3.1-8b-instant</span> <span class="ok">&#x2713; 200</span> <span style="color:var(--text-3)">142ms</span></div>
      <div><span class="ts">10:42:03</span> <span class="provider">openai</span> <span class="model">gpt-4o</span> <span class="ok">&#x2713; 200</span> <span style="color:var(--text-3)">890ms</span></div>
      <div><span class="ts">10:42:05</span> <span class="provider">deepseek</span> <span class="model">deepseek-chat</span> <span class="fail">&#x2717; 503</span></div>
      <div><span class="ts">10:42:05</span> <span class="fallback">fallback</span> &rarr; <span class="provider">together</span> <span class="model">llama-3.1-70b</span> <span class="ok">&#x2713; 200</span> <span style="color:var(--text-3)">310ms</span></div>
    </div>
  </div>
</div>
</section>

<!-- ═══ PROVIDERS ═══ -->
<section id="providers" style="background:var(--bg-surface)">
<div class="wrap">
  <div class="s-label">${icon('key')} Provider Coverage</div>
  <h2 class="s-title">Bring your own keys.</h2>
  <p class="s-desc">8Router routes to providers you configure. You own and control all credentials.</p>
  <div class="provider-list">
    <div class="provider-chip">OpenAI</div>
    <div class="provider-chip">Groq</div>
    <div class="provider-chip">DeepSeek</div>
    <div class="provider-chip">Mistral</div>
    <div class="provider-chip">Together</div>
    <div class="provider-chip">xAI</div>
    <div class="provider-chip">OpenRouter</div>
    <div class="provider-chip">Ollama</div>
    <div class="provider-chip">Anthropic</div>
    <div class="provider-chip">Google</div>
    <div class="provider-chip">Cerebras</div>
    <div class="provider-chip">SambaNova</div>
  </div>
</div>
</section>

<!-- ═══ INTEGRATIONS ═══ -->
<section id="integrations">
<div class="wrap">
  <div class="s-label">${icon('zap')} Compatible Tools</div>
  <h2 class="s-title">Drop-in compatible.</h2>
  <p class="s-desc">Any tool that supports custom OpenAI base URLs works with 8Router.</p>
  <div class="integr-grid">
    <div class="integr-chip">Cursor</div>
    <div class="integr-chip">Cline</div>
    <div class="integr-chip">Continue</div>
    <div class="integr-chip">Roo Code</div>
    <div class="integr-chip">Open WebUI</div>
    <div class="integr-chip">Claude Code</div>
    <div class="integr-chip">Codex CLI</div>
    <div class="integr-chip">Hermes Agent</div>
  </div>
</div>
</section>


<!-- ═══ SECURITY ═══ -->
<section id="security" style="background:var(--bg-surface)">
<div class="wrap">
  <div class="s-label">${icon('shield')} Security</div>
  <h2 class="s-title">${_('security.title')}</h2>
  <p class="s-desc">${_('security.warning')}</p>
</div>
</section>

<!-- ═══ TESTS ═══ -->
<section id="tests">
<div class="wrap">
  <div class="s-label">${icon('check')} Testing</div>
  <h2 class="s-title">${_('tests.title')}</h2>
  <p class="s-desc">${_('tests.desc')}</p>
</div>
</section>

<!-- ═══ SETUP ═══ -->
<section id="setup" style="background:var(--bg-surface)">
<div class="wrap">
  <div class="s-label">${icon('terminal')} Setup</div>
  <h2 class="s-title">Start routing in under a minute.</h2>
  <div class="steps">
    <div class="step">
      <h3>Install</h3>
      <code>npm install -g @kaidev18/eight-router</code>
    </div>
    <div class="step">
      <h3>Run</h3>
      <code>8router</code>
    </div>
    <div class="step">
      <h3>Configure your tool</h3>
      <code>Base URL: http://localhost:8080/v1<br>Model: 8router/auto</code>
    </div>
  </div>
</div>
</section>

<!-- ═══ CLOSE ═══ -->
<section class="close" id="open-source">
<div class="wrap">
  <h2 class="s-title">Your keys. Your routes. Your infrastructure.</h2>
  <p class="s-desc" style="margin:0 auto 32px;text-align:center">8Router is open source under the MIT license. No token resale. No credential collection. Everything runs locally.</p>
  <div class="close-icons">
    <div class="close-item">${icon('key')} Your credentials</div>
    <div class="close-item">${icon('route')} Your routing rules</div>
    <div class="close-item">${icon('shield')} Local-first</div>
    <div class="close-item">${icon('github')} Open source</div>
  </div>
  <div class="hero-actions" style="justify-content:center">
    <a href="#setup" class="btn-primary">${_('hero.getStarted')}</a>
    <a href="/8router/dashboard" class="btn-secondary">${_('hero.openDashboard')}</a>
  </div>
</div>
</section>

<!-- ═══ SUPPORT ═══ -->
${donateHref ? `
<section style="background:var(--bg-surface);padding:48px 0;text-align:center">
<div class="wrap">
  <p style="color:var(--text-2);margin-bottom:16px">Support 8Router development</p>
  <a href="${donateHref}" class="btn-primary" target="_blank" rel="noopener">${_('support.donate')}</a>
</div>
</section>
` : ''}

<!-- ═══ FOOTER ═══ -->
<footer>
<div class="wrap">
  <div class="footer-grid">
    <div class="footer-col">
      <h4>${_('footer.product')}</h4>
      <a href="/8router/dashboard">${_('nav.dashboard')}</a>
      <a href="#setup">${_('footer.getStarted')}</a>
      <a href="/8router/api">${_('footer.api')}</a>
    </div>
    <div class="footer-col">
      <h4>${_('footer.resources')}</h4>
      <a href="#aliases">${_('footer.modelAliases')}</a>
      <a href="#providers">${_('nav.providers')}</a>
      <a href="https://github.com/kaidev-pro/8router/blob/main/CHANGELOG.md">${_('footer.changelog')}</a>
    </div>
    <div class="footer-col">
      <h4>${_('footer.ecosystem')}</h4>
      <a href="https://8agents.xyz">8Agents</a>
    </div>
  </div>
  <div class="footer-bottom">
    <span>8Router ${VERSION_STRING} &middot; MIT License</span>
    <div class="footer-locales">
      ${SUPPORTED_LOCALES.map(l => `<a href="?locale=${l}" class="${l === locale ? 'active' : ''}">${l.toUpperCase()}</a>`).join(' ')}
    </div>
  </div>
</div>
</footer>

</body>
</html>`;
}
