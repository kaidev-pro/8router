// 8Router — Landing Page V2 (i18n)
// Asymmetric hero, circuit-loop identity, real product evidence
import { VERSION_STRING } from './version.js';
import { t, getLocale, type Locale, SUPPORTED_LOCALES } from './i18n/index.js';

export function getLandingHTML(locale: Locale = 'en', donationUrl?: string): string {
  const _ = (key: string) => t(key, locale);
  const donateHref = donationUrl || '';

  // Logo assets
  const LOGO_NAV = 'https://8agents.xyz/assets/8router-logo-dark.png';
  const LOGO_HERO = 'https://8agents.xyz/assets/8router-logo-transparent.png';
  const LOGO_FOOTER = 'https://8agents.xyz/assets/8router-logo-dashboard.png';

  return `<!DOCTYPE html>
<!-- 8Router landing build: abfc0889752180565786734e7e936c7a40a4338c -->
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${_('meta.title')}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<style>
:root {
  --bg: #06080e;
  --bg-card: #0c1018;
  --bg-surface: #10141e;
  --border: #1a2030;
  --accent: #5b8def;
  --accent-bright: #7eaaff;
  --green: #34d399;
  --red: #f87171;
  --text: #e8ecf4;
  --text-2: #94a3b8;
  --text-3: #64748b;
  --font-sans: 'Inter', system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;
  --text-xs: 0.75rem;
  --text-sm: 0.875rem;
  --text-base: 1rem;
  --text-lg: 1.125rem;
  --text-xl: 1.25rem;
  --text-2xl: 1.75rem;
  --text-3xl: 2.5rem;
  --text-hero: clamp(2.5rem, 5vw, 3.5rem);
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth;font-size:16px}
body{font-family:var(--font-sans);background:var(--bg);color:var(--text);line-height:1.65;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:var(--accent-bright);text-decoration:none}
a:hover{text-decoration:underline}
code{font-family:var(--font-mono);font-size:0.88em}
img{max-width:100%;height:auto}
.container{max-width:1080px;margin:0 auto;padding:0 24px}

/* ── NAV ── */
nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(6,8,14,0.85);backdrop-filter:blur(16px);border-bottom:1px solid var(--border)}
.nav-inner{max-width:1080px;margin:0 auto;padding:0 24px;height:56px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{display:flex;align-items:center;gap:10px;text-decoration:none}
.nav-logo img{height:28px;width:auto}
.nav-logo span{font-weight:700;font-size:1.05rem;color:var(--text)}
.nav-links{display:flex;gap:20px;align-items:center}
.nav-links a{color:var(--text-3);font-size:var(--text-sm);font-weight:500;transition:color 0.15s}
.nav-links a:hover{color:var(--text);text-decoration:none}
.nav-cta{display:inline-flex;align-items:center;gap:6px;padding:7px 16px;background:var(--accent);color:#fff;border-radius:6px;font-weight:600;font-size:var(--text-sm);transition:opacity 0.15s}
.nav-cta:hover{opacity:0.85;text-decoration:none}
.mobile-nav-cta { display:none }

/* ── HERO ── */
.hero{padding:120px 0 80px;min-height:85vh;display:flex;align-items:center}
.hero-grid{display:grid;grid-template-columns:1fr 1fr;gap:48px;align-items:center}
.hero-content{position:relative}
.hero h1{font-size:var(--text-hero);font-weight:800;letter-spacing:-0.03em;line-height:1.1;margin-bottom:16px}
.hero h1 .accent{color:var(--accent-bright)}
.hero-sub{font-size:var(--text-lg);color:var(--text-2);max-width:44ch;line-height:1.6;margin-bottom:32px}
.hero-actions{display:flex;gap:12px;margin-bottom:24px;flex-wrap:wrap}
.btn-primary{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:var(--accent);color:#fff;border-radius:6px;font-weight:600;font-size:var(--text-sm);border:none;cursor:pointer;transition:background 0.15s;text-decoration:none}
.btn-primary:hover{background:var(--accent-bright);text-decoration:none}
.btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:12px 24px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:6px;font-weight:600;font-size:var(--text-sm);text-decoration:none;transition:border-color 0.15s}
.btn-secondary:hover{border-color:var(--text-3);text-decoration:none}

/* ── ROUTING VISUAL ── */
.routing-visual{position:relative;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;padding:32px 24px;font-family:var(--font-mono);font-size:12px;overflow:hidden}
.routing-visual::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),transparent)}
.rv-header{display:flex;align-items:center;gap:8px;margin-bottom:20px;color:var(--text-3);font-size:12px;text-transform:uppercase;letter-spacing:0.05em}
.rv-header .dot{width:6px;height:6px;border-radius:50%;background:var(--green)}
.rv-row{display:flex;align-items:center;gap:10px;padding:6px 0}
.rv-row .arrow{color:var(--text-3);font-size:14px}
.rv-row .provider{color:var(--accent-bright);min-width:80px}
.rv-row .model{color:var(--text-3);font-size:12px}
.rv-row .status-ok{color:var(--green)}
.rv-row .status-fail{color:var(--red);text-decoration:line-through;opacity:0.7}
.rv-row .status-fallback{color:var(--accent)}
.rv-divider{height:1px;background:var(--border);margin:4px 0}
.rv-node{display:inline-flex;align-items:center;gap:6px;padding:4px 10px;background:var(--bg);border:1px solid var(--border);border-radius:4px}
.rv-node.active{border-color:var(--accent);box-shadow:0 0 8px rgba(91,141,239,0.15)}
.rv-node.failed{border-color:var(--red);opacity:0.5}

/* ── SECTIONS ── */
section{padding:72px 0}
section.s-surface{background:var(--bg-surface)}
.s-label{font-size:var(--text-xs);font-weight:600;letter-spacing:0.08em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.s-title{font-size:var(--text-2xl);font-weight:700;letter-spacing:-0.02em;margin-bottom:8px;line-height:1.2}
.s-desc{color:var(--text-2);max-width:52ch;line-height:1.6;margin-bottom:32px}
.s-desc-wide{max-width:64ch}

/* ── WHY ── */
.why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.why-item{padding:20px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px}
.why-item h3{font-size:var(--text-base);font-weight:600;margin-bottom:6px}
.why-item p{font-size:var(--text-sm);color:var(--text-3);line-height:1.55}

/* ── ROUTING FLOW ── */
.flow-path{display:flex;align-items:center;gap:0;flex-wrap:wrap;margin:32px 0;font-family:var(--font-mono);font-size:13px}
.flow-node{display:flex;align-items:center;gap:6px;padding:10px 16px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px}
.flow-node.active{border-color:var(--accent)}
.flow-node.failed{border-color:var(--red);opacity:0.6;text-decoration:line-through}
.flow-arrow{padding:0 8px;color:var(--text-3);font-size:16px}
.flow-label{display:block;font-size:12px;color:var(--text-3);font-family:var(--font-sans)}

/* ── ALIASES ── */
.alias-table{width:100%;border-collapse:collapse;font-size:var(--text-sm)}
.alias-table th{text-align:left;padding:10px 16px;color:var(--text-3);font-weight:500;font-size:var(--text-xs);text-transform:uppercase;letter-spacing:0.05em;border-bottom:1px solid var(--border)}
.alias-table td{padding:10px 16px;border-bottom:1px solid var(--border)}
.alias-table .name{font-family:var(--font-mono);color:var(--accent-bright);font-weight:500}
.alias-table .desc{color:var(--text-3)}

/* ── PROVIDERS STRIP ── */
.providers-strip{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
.provider-tag{padding:6px 12px;background:var(--bg-card);border:1px solid var(--border);border-radius:4px;font-size:var(--text-sm);color:var(--text-2)}

/* ── DASHBOARD ── */
.dash-window{background:var(--bg-card);border:1px solid var(--border);border-radius:8px;overflow:hidden}
.dash-titlebar{display:flex;align-items:center;gap:8px;padding:10px 16px;background:var(--bg-surface);border-bottom:1px solid var(--border);font-size:var(--text-xs);color:var(--text-3)}
.dash-titlebar .dots{display:flex;gap:5px}
.dash-titlebar .dots span{width:8px;height:8px;border-radius:50%}
.dash-titlebar .dots .r{background:#ff5f57}.dash-titlebar .dots .y{background:#febc2e}.dash-titlebar .dots .g{background:#28c840}
.dash-titlebar .title{margin-left:8px;font-family:var(--font-mono)}
.dash-body{padding:16px;font-family:var(--font-mono);font-size:12px;line-height:1.8}
.dash-body .row{display:flex;gap:12px;flex-wrap:wrap}
.dash-body .ts{color:var(--text-3);opacity:0.5;min-width:60px}
.dash-body .provider{color:var(--accent-bright)}
.dash-body .model{color:var(--text-3)}
.dash-body .ok{color:var(--green)}
.dash-body .fail{color:var(--red)}
.dash-body .fallback{color:var(--accent)}
.dash-body .label-example{display:inline-block;padding:2px 8px;background:var(--bg);border:1px solid var(--border);border-radius:3px;font-size:12px;color:var(--text-3);margin-bottom:8px}
.dash-side{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px}
.dash-card{padding:16px;background:var(--bg-surface);border:1px solid var(--border);border-radius:6px}
.dash-card h4{font-size:var(--text-xs);color:var(--text-3);text-transform:uppercase;letter-spacing:0.05em;margin-bottom:8px}
.dash-card .val{font-size:var(--text-2xl);font-weight:700;color:var(--text)}
.dash-card .sub{font-size:var(--text-xs);color:var(--text-3);margin-top:4px}

/* ── SETUP ── */
.setup-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}
.setup-step{counter-increment:step}
.setup-step .num{display:inline-flex;align-items:center;justify-content:center;width:24px;height:24px;border-radius:50%;background:rgba(91,141,239,0.12);color:var(--accent);font-size:var(--text-xs);font-weight:700;margin-bottom:8px}
.setup-step h3{font-size:var(--text-sm);font-weight:600;margin-bottom:6px}
.setup-step code{display:block;padding:10px 12px;background:var(--bg);border:1px solid var(--border);border-radius:4px;font-size:12px;color:var(--accent-bright);margin-top:8px;word-break:break-all}

/* ── CLOSE ── */
.close{text-align:center;padding:64px 0}
.close p{color:var(--text-2);max-width:48ch;margin:0 auto 24px}
.close-badges{display:flex;justify-content:center;gap:24px;margin-bottom:24px;flex-wrap:wrap;font-size:var(--text-sm);color:var(--text-3)}

/* ── FOOTER ── */
footer{padding:40px 0;border-top:1px solid var(--border)}
.footer-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.footer-brand{display:flex;align-items:center;gap:8px}
.footer-brand img{height:20px;opacity:0.5}
.footer-brand span{font-size:var(--text-xs);color:var(--text-3)}
.footer-links{display:flex;gap:16px;flex-wrap:wrap}
.footer-links a{color:var(--text-3);font-size:var(--text-xs);transition:color 0.15s}
.footer-links a:hover{color:var(--text)}
.footer-locales{display:flex;gap:10px}
.footer-locales a{color:var(--text-3);font-size:var(--text-xs)}
.footer-locales a.active{color:var(--accent);font-weight:600}

/* ── RESPONSIVE ── */
@media(max-width:640px){
  .nav-links { display:none }
  .mobile-nav-cta { display:inline-flex }
  .hero{padding:100px 0 60px;min-height:auto}
  .hero-grid{grid-template-columns:1fr;gap:32px}
  .hero h1{font-size:clamp(1.8rem,7vw,2.5rem)}
  .nav-links{display:none}
  .mobile-nav-cta{display:inline-flex}
  .why-grid{grid-template-columns:1fr}
  .setup-steps{grid-template-columns:1fr}
  .flow-path{flex-direction:column;align-items:flex-start}
  .flow-arrow{transform:rotate(90deg);padding:4px 0}
  .dash-side{grid-template-columns:1fr}
  section{padding:56px 0}
}

.svc-card p { font-size:var(--text-sm); color:var(--text-2); line-height:1.6 }
.feat-card p { font-size:var(--text-sm); color:var(--text-2); line-height:1.5 }

.hero-stat-label { font-size:var(--text-xs); line-height:1.35 }
.hero-stat-val { font-size:clamp(1.5rem,4vw,2.25rem) }

html, body { overflow-x:hidden; max-width:100vw }
pre { overflow-x:auto; -webkit-overflow-scrolling:touch; max-width:100% }
.wrap { padding:0 20px; width:100%; max-width:100vw; overflow:hidden }
</style>
</head>
<body>

<nav>
<div class="nav-inner">
  <a class="nav-logo" href="/"><img src="${LOGO_NAV}" alt="8Router" onerror="this.style.display='none';this.nextElementSibling.style.display='inline'"><span style="display:none">8Router</span></a>
  <div class="nav-links">
    <a href="#why">${_('nav.features')}</a>
    <a href="#aliases">${_('nav.aliases')}</a>
    <a href="#dashboard">${_('dashboard.title')}</a>
    <a href="#setup">${_('nav.getStarted')}</a>
    <a href="https://github.com/kaidev-pro/8router" class="nav-cta" target="_blank" rel="noopener">GitHub</a>
  </div>
  <a href="https://github.com/kaidev-pro/8router" class="nav-cta mobile-nav-cta" target="_blank" rel="noopener">GitHub</a>
</div>
</nav>

<!-- ═══ HERO ═══ -->
<section class="hero">
<div class="container">
  <div class="hero-grid">
    <div class="hero-content">
      <h1>${_('hero.title1')}</h1>
      <p class="hero-sub">${_('hero.sub')}</p>
      <p style="font-size:var(--text-xs);color:var(--text-3);margin-bottom:24px">${_('feat.circuit')} · ${_('feat.keyPool')} · ${_('feat.latency')}</p>
      <div class="hero-actions">
        <a href="#setup" class="btn-primary">${_('hero.getStarted')}</a>
        <a href="https://github.com/kaidev-pro/8router" class="btn-secondary" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
    <div class="routing-visual">
      <div class="rv-header"><span class="dot"></span> <span>Example route</span></div>
      <div class="rv-row"><span class="rv-node active">Client</span> <span class="arrow">→</span> <span class="rv-node active">8Router</span></div>
      <div class="rv-divider"></div>
      <div class="rv-row"><span class="arrow">→</span> <span class="rv-node failed">openai</span> <span class="status-fail">429</span> <span class="model">gpt-4o</span></div>
      <div class="rv-row"><span class="arrow">→</span> <span class="rv-node active">groq</span> <span class="status-ok">200</span> <span class="model">llama-3.1-8b</span></div>
      <div class="rv-divider"></div>
      <div class="rv-row"><span class="arrow">→</span> <span class="rv-node active">Client</span> <span class="status-fallback">fallback</span></div>
    </div>
  </div>
</div>
</section>

<!-- ═══ WHY ═══ -->
<section id="why" class="s-surface">
<div class="container">
  <div class="s-label">${_('services.title')}</div>
  <h2 class="s-title">${_('services.title')}</h2>
  <p class="s-desc s-desc-wide">${_('services.sub')}</p>
  <div class="why-grid">
    <div class="why-item">
      <h3>${_('svc.routing')}</h3>
      <p>${_('svc.routingDesc')}</p>
    </div>
    <div class="why-item">
      <h3>${_('svc.quota')}</h3>
      <p>${_('svc.quotaDesc')}</p>
    </div>
    <div class="why-item">
      <h3>${_('svc.smart')}</h3>
      <p>${_('svc.smartDesc')}</p>
    </div>
  </div>
</div>
</section>

<!-- ═══ ROUTING FLOW ═══ -->
<section id="flow">
<div class="container">
  <div class="s-label">${_('how.title')}</div>
  <h2 class="s-title">${_('how.title')}</h2>
  <p class="s-desc">${_('how.desc')}</p>
  <div class="flow-path">
    <div class="flow-node active">${_('how.install')}<span class="flow-label">npm i -g @kaidev18/eight-router</span></div>
    <span class="flow-arrow">→</span>
    <div class="flow-node active">${_('how.connect')}<span class="flow-label">${_('how.connectDesc')}</span></div>
    <span class="flow-arrow">→</span>
    <div class="flow-node active">${_('how.point')}<span class="flow-label">http://localhost:8080/v1</span></div>
    <span class="flow-arrow">→</span>
    <div class="flow-node active">${_('how.monitor')}<span class="flow-label">${_('how.monitorDesc')}</span></div>
  </div>
</div>
</section>

<!-- ═══ ALIASES ═══ -->
<section id="aliases" class="s-surface">
<div class="container">
  <div class="s-label">${_('aliases.title')}</div>
  <h2 class="s-title">${_('aliases.title')}</h2>
  <p class="s-desc">${_('aliases.desc')}</p>
  <table class="alias-table">
    <thead><tr><th>Alias</th><th>Description</th></tr></thead>
    <tbody>
      <tr><td class="name">8router/auto</td><td class="desc">${_('alias.autoDesc')}</td></tr>
      <tr><td class="name">8router/cheap</td><td class="desc">${_('alias.cheapDesc')}</td></tr>
      <tr><td class="name">8router/fast</td><td class="desc">${_('alias.fastDesc')}</td></tr>
      <tr><td class="name">8router/smart</td><td class="desc">${_('alias.smartDesc')}</td></tr>
      <tr><td class="name">8router/coding</td><td class="desc">${_('alias.codingDesc')}</td></tr>
      <tr><td class="name">8router/local</td><td class="desc">${_('alias.localDesc')}</td></tr>
    </tbody>
  </table>
</div>
</section>

<!-- ═══ DASHBOARD ═══ -->
<section id="dashboard">
<div class="container">
  <div class="s-label">${_('dashboard.title')}</div>
  <h2 class="s-title">${_('features.title')}</h2>
  <p class="s-desc s-desc-wide">${_('features.desc')}</p>
  <div class="dash-window">
    <div class="dash-titlebar">
      <div class="dots"><span class="r"></span><span class="y"></span><span class="g"></span></div>
      <span class="title">8Router Dashboard — Request Log</span>
    </div>
    <div class="dash-body">
      <div class="label-example">${_('how.title')}</div>
      <div class="row"><span class="ts">10:42:01</span><span class="provider">openai</span><span class="model">gpt-4o</span><span class="fail">429</span></div>
      <div class="row"><span class="ts">10:42:01</span><span class="fallback">fallback</span> → <span class="provider">groq</span><span class="model">llama-3.1-8b</span><span class="ok">200</span><span style="color:var(--text-3)">142ms</span></div>
      <div class="row"><span class="ts">10:42:03</span><span class="provider">deepseek</span><span class="model">deepseek-chat</span><span class="fail">503</span></div>
      <div class="row"><span class="ts">10:42:03</span><span class="fallback">fallback</span> → <span class="provider">together</span><span class="model">llama-3.1-70b</span><span class="ok">200</span><span style="color:var(--text-3)">310ms</span></div>
      <div class="dash-side">
        <div class="dash-card">
          <h4>${_('feat.circuit')}</h4>
          <div class="val" style="color:var(--green)">● ${_('status.active')}</div>
          <div class="sub">${_('feat.circuitDesc')}</div>
        </div>
        <div class="dash-card">
          <h4>${_('feat.keyPool')}</h4>
          <div class="val">3 / 4</div>
          <div class="sub">${_('feat.keyPoolDesc')}</div>
        </div>
      </div>
    </div>
  </div>
</div>
</section>

<!-- ═══ INTEGRATIONS ═══ -->
<section>
<div class="container">
  <div class="s-label">${_('integrations.title')}</div>
  <h2 class="s-title">${_('integrations.title')}</h2>
  <p class="s-desc">${_('integrations.desc')}</p>
</div>
</section>

<!-- ═══ PROVIDERS + TOOLS ═══ -->
<section class="s-surface">
<div class="container">
  <div class="s-label">${_('providers.title')}</div>
  <h2 class="s-title">${_('providers.title')}</h2>
  <p class="s-desc">${_('providers.desc')}</p>
  <div class="providers-strip">
    <span class="provider-tag">OpenAI</span>
    <span class="provider-tag">Groq</span>
    <span class="provider-tag">DeepSeek</span>
    <span class="provider-tag">Mistral</span>
    <span class="provider-tag">Together</span>
    <span class="provider-tag">xAI</span>
    <span class="provider-tag">OpenRouter</span>
    <span class="provider-tag">Ollama</span>
    <span class="provider-tag">Anthropic</span>
    <span class="provider-tag">Google</span>
  </div>
  <div class="providers-strip" style="margin-top:12px">
    <span class="provider-tag">Cursor</span>
    <span class="provider-tag">Cline</span>
    <span class="provider-tag">Continue</span>
    <span class="provider-tag">Roo Code</span>
    <span class="provider-tag">Open WebUI</span>
    <span class="provider-tag">Claude Code</span>
    <span class="provider-tag">Codex CLI</span>
    <span class="provider-tag">Hermes Agent</span>
  </div>
</div>
</section>

<!-- ═══ SETUP ═══ -->
<section id="setup">
<div class="container">
  <div class="s-label">${_('start.title')}</div>
  <h2 class="s-title">${_('start.title')}</h2>
  <div class="setup-steps">
    <div class="setup-step">
      <div class="num">1</div>
      <h3>${_('start.install')}</h3>
      <code>npm install -g @kaidev18/eight-router</code>
    </div>
    <div class="setup-step">
      <div class="num">2</div>
      <h3>${_('start.run')}</h3>
      <code>8router</code>
    </div>
    <div class="setup-step">
      <div class="num">3</div>
      <h3>${_('start.configure')}</h3>
      <code>Base URL: http://localhost:8080/v1<br>Model: 8router/auto</code>
    </div>
  </div>
</div>
</section>


<!-- ═══ SECURITY ═══ -->
<section class="s-surface">
<div class="container">
  <div class="s-label">${_('security.title')}</div>
  <h2 class="s-title">${_('security.title')}</h2>
  <p class="s-desc">${_('security.warning')}</p>
</div>
</section>

<!-- ═══ TESTS ═══ -->
<section>
<div class="container">
  <div class="s-label">${_('tests.title')}</div>
  <h2 class="s-title">${_('tests.title')}</h2>
  <p class="s-desc">${_('tests.desc')}</p>
</div>
</section>

<!-- ═══ CLOSE ═══ -->
<section class="close">
<div class="container">
  <h2 class="s-title">${_('hero.title1')}</h2>
  <p>${_('footer.builtFor')}</p>
  <div class="close-badges">
    <span>MIT License</span>
    <span>Your keys</span>
    <span>Your routes</span>
    <span>Local-first</span>
  </div>
  <div class="hero-actions" style="justify-content:center">
    <a href="#setup" class="btn-primary">${_('hero.getStarted')}</a>
    <a href="https://github.com/kaidev-pro/8router" class="btn-secondary" target="_blank" rel="noopener">GitHub</a>
  </div>
</div>
</section>

<!-- ═══ DONATE ═══ -->
${donateHref ? `<section style="background:var(--bg-surface);padding:40px 0;text-align:center"><div class="container"><a href="${donateHref}" class="btn-primary" target="_blank" rel="noopener">${_('support.donate')}</a></div></section>` : ''}

<!-- ═══ FOOTER ═══ -->
<footer>
<div class="container">
  <div class="footer-inner">
    <div class="footer-brand">
      <img src="${LOGO_FOOTER}" alt="8Router" onerror="this.style.display='none'">
      <span>8Router ${VERSION_STRING} · MIT</span>
    </div>
    <div class="footer-links">
      <a href="/8router/dashboard">${_('nav.dashboard')}</a>
      <a href="https://github.com/kaidev-pro/8router/blob/main/CHANGELOG.md">${_('footer.changelog')}</a>
      <a href="https://github.com/kaidev-pro/8router">${_('footer.8agents')}</a>
    </div>
    <div class="footer-locales">
      ${SUPPORTED_LOCALES.map(l => `<a href="?lang=${l}" class="${l === locale ? 'active' : ''}">${l.toUpperCase()}</a>`).join(' ')}
    </div>
  </div>
</div>
</footer>

</body>
</html>`;
}
