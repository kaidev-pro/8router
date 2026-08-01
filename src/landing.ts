// 8Router — Landing Page V3 (i18n)
// Circuit-loop identity hero, dedicated mobile, editorial typography
import { VERSION_STRING } from './version.js';
import { t, getLocale, type Locale, SUPPORTED_LOCALES } from './i18n/index.js';

export function getLandingHTML(locale: Locale = 'en', donationUrl?: string): string {
  const _ = (key: string) => t(key, locale);
  const donateHref = donationUrl || '';
  const LOGO_NAV = 'https://8agents.xyz/assets/8router-logo-dark.png';
  const LOGO_FOOTER = 'https://8agents.xyz/assets/8router-logo-dashboard.png';

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${_('meta.title')}</title>
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
<!-- 8Router landing build: f03a18b5c87f9ea2315735c58aaa1d36643cffe4 -->
<!-- branch-head: d514a62af73af8c07cfe9758631000edf2b2a344 -->
<style>
:root {
  --bg: #050810;
  --bg-card: #0a0f1a;
  --bg-surface: #0d1220;
  --border: #1a2236;
  --accent: #4a90d9;
  --accent-bright: #6bb3ff;
  --accent-dim: rgba(74,144,217,0.1);
  --cyan: #5be0e6;
  --green: #34d399;
  --red: #ef4444;
  --text: #e2e8f0;
  --text-2: #94a3b8;
  --text-3: #64748b;
  --font-sans: 'Inter', system-ui, -apple-system, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, monospace;

  --text-hero: clamp(2.2rem,4.5vw,3.2rem);
  --text-sm: 0.875rem;
  --text-xs: 0.75rem;
}
*,*::before,*::after{margin:0;padding:0;box-sizing:border-box}
html{scroll-behavior:smooth}
body{font-family:var(--font-sans);background:var(--bg);color:var(--text);line-height:1.7;-webkit-font-smoothing:antialiased;overflow-x:hidden}
a{color:var(--accent-bright);text-decoration:none}
a:hover{text-decoration:underline}
code{font-family:var(--font-mono);font-size:0.85em;background:var(--bg-card);padding:2px 6px;border-radius:3px}
img{max-width:100%;height:auto}
.container{max-width:1120px;margin:0 auto;padding:0 28px}

/* ── NAV ── */
nav{position:fixed;top:0;left:0;right:0;z-index:100;background:rgba(5,8,16,0.92);backdrop-filter:blur(20px);border-bottom:1px solid var(--border)}
.nav-inner{max-width:1120px;margin:0 auto;padding:0 28px;height:60px;display:flex;align-items:center;justify-content:space-between}
.nav-logo{display:flex;align-items:center;gap:12px;text-decoration:none}
.nav-logo img{height:32px;width:auto}
.nav-logo span{font-weight:700;font-size:1.1rem;color:var(--text);letter-spacing:-0.01em}
.nav-links{display:flex;gap:24px;align-items:center}
.nav-links a{color:var(--text-2);font-size:0.9rem;font-weight:500;transition:color 0.15s}
.nav-links a:hover{color:var(--text);text-decoration:none}
.nav-cta{display:inline-flex;align-items:center;gap:6px;padding:8px 18px;background:var(--accent);color:#fff;border-radius:6px;font-weight:600;font-size:0.9rem;transition:background 0.15s}
.nav-cta:hover{background:var(--accent-bright);text-decoration:none}
.mobile-nav-cta{display:none}

/* ── HERO ── */
.hero{padding:100px 0 60px;min-height:90vh;display:flex;align-items:center}
.hero-grid{display:grid;grid-template-columns:1fr 1.15fr;gap:56px;align-items:center}
.hero-content h1{font-size:var(--text-hero);font-weight:800;letter-spacing:-0.035em;line-height:1.08;margin-bottom:20px}
.hero-content h1 .accent{color:var(--accent-bright)}
.hero-sub{font-size:1.1rem;color:var(--text-2);max-width:42ch;line-height:1.6;margin-bottom:12px}
.hero-tech{font-size:0.8rem;color:var(--text-3);margin-bottom:28px;display:flex;gap:16px;flex-wrap:wrap}
.hero-tech span{display:inline-flex;align-items:center;gap:4px}
.hero-tech .dot{width:5px;height:5px;border-radius:50%;background:var(--accent);display:inline-block}
.hero-actions{display:flex;gap:12px;flex-wrap:wrap}
.btn-primary{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:var(--accent);color:#fff;border-radius:6px;font-weight:600;font-size:0.95rem;border:none;cursor:pointer;transition:background 0.15s;text-decoration:none}
.btn-primary:hover{background:var(--accent-bright);text-decoration:none}
.btn-secondary{display:inline-flex;align-items:center;gap:8px;padding:12px 28px;background:transparent;color:var(--text);border:1px solid var(--border);border-radius:6px;font-weight:600;font-size:0.95rem;text-decoration:none;transition:border-color 0.15s}
.btn-secondary:hover{border-color:var(--text-3);text-decoration:none}

/* ── ROUTING VISUAL (CIRCUIT LOOP) ── */
.route-visual{position:relative;background:var(--bg-card);border:1px solid var(--border);border-radius:12px;padding:40px 32px;overflow:hidden}
.route-visual::before{content:'';position:absolute;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,var(--accent),var(--cyan),transparent)}
.route-circuit{display:flex;flex-direction:column;gap:0;font-size:0.9rem}
.route-step{display:flex;align-items:center;gap:16px;padding:14px 0;position:relative}
.route-step::before{content:'';position:absolute;left:15px;top:100%;width:2px;height:14px;background:var(--border)}
.route-step:last-child::before{display:none}
.route-icon{width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.75rem;font-weight:700;flex-shrink:0;border:2px solid}
.route-icon.client{border-color:var(--text-3);color:var(--text-2);background:var(--bg)}
.route-icon.router{border-color:var(--accent);color:var(--accent-bright);background:var(--accent-dim);box-shadow:0 0 12px rgba(74,144,217,0.2)}
.route-icon.fail{border-color:var(--red);color:var(--red);background:rgba(239,68,68,0.08);opacity:0.7}
.route-icon.ok{border-color:var(--green);color:var(--green);background:rgba(52,211,153,0.08)}
.route-label{flex:1}
.route-label .name{font-weight:600;color:var(--text)}
.route-label .detail{font-size:0.8rem;color:var(--text-3);margin-top:2px}
.route-badge{font-size:0.75rem;font-weight:600;padding:3px 10px;border-radius:4px;flex-shrink:0}
.route-badge.fail{color:var(--red);background:rgba(239,68,68,0.1);text-decoration:line-through}
.route-badge.ok{color:var(--green);background:rgba(52,211,153,0.1)}
.route-badge.fallback{color:var(--accent);background:var(--accent-dim)}
.route-line{width:2px;height:14px;margin-left:15px;background:var(--border)}
.route-line.active{background:var(--accent)}
.route-line.fail{background:var(--red);opacity:0.4}

/* ── SECTIONS ── */
section{padding:80px 0}
section.s-alt{background:var(--bg-surface)}
.s-label{font-size:0.75rem;font-weight:600;letter-spacing:0.1em;text-transform:uppercase;color:var(--accent);margin-bottom:8px}
.s-title{font-size:clamp(1.5rem,3vw,2rem);font-weight:700;letter-spacing:-0.025em;margin-bottom:8px;line-height:1.2}
.s-desc{color:var(--text-2);max-width:54ch;line-height:1.65;margin-bottom:36px;font-size:1.05rem}

/* ── WHY GRID ── */
.why-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.why-item{padding:24px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;transition:border-color 0.15s}
.why-item:hover{border-color:var(--accent)}
.why-item h3{font-size:1rem;font-weight:600;margin-bottom:8px}
.why-item p{font-size:0.9rem;color:var(--text-3);line-height:1.6}

/* ── ROUTING FLOW ── */
.flow-row{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin:32px 0;font-size:0.9rem}
.flow-node{display:flex;align-items:center;gap:8px;padding:12px 20px;background:var(--bg-card);border:1px solid var(--border);border-radius:8px;font-weight:500}
.flow-node.active{border-color:var(--accent);box-shadow:0 0 8px rgba(74,144,217,0.1)}
.flow-node.failed{border-color:var(--red);opacity:0.6;text-decoration:line-through}
.flow-arrow{color:var(--text-3);font-size:1.1rem}
.flow-label{display:block;font-size:0.78rem;color:var(--text-3);font-weight:400;margin-top:2px}

/* ── ALIASES ── */
.alias-table{width:100%;border-collapse:collapse;font-size:0.9rem}
.alias-table th{text-align:left;padding:12px 16px;color:var(--text-3);font-weight:500;font-size:0.75rem;text-transform:uppercase;letter-spacing:0.06em;border-bottom:1px solid var(--border)}
.alias-table td{padding:12px 16px;border-bottom:1px solid var(--border)}
.alias-table .name{font-family:var(--font-mono);color:var(--accent-bright);font-weight:500;font-size:0.85rem}
.alias-table .desc{color:var(--text-3);font-size:0.88rem}

/* ── DASHBOARD ── */
.dash-window{background:var(--bg-card);border:1px solid var(--border);border-radius:10px;overflow:hidden}
.dash-titlebar{display:flex;align-items:center;gap:8px;padding:12px 18px;background:var(--bg-surface);border-bottom:1px solid var(--border);font-size:0.8rem;color:var(--text-3)}
.dash-titlebar .dots{display:flex;gap:5px}
.dash-titlebar .dots span{width:8px;height:8px;border-radius:50%}
.dash-titlebar .dots .r{background:#ff5f57}.dash-titlebar .dots .y{background:#febc2e}.dash-titlebar .dots .g{background:#28c840}
.dash-titlebar .title{margin-left:8px;font-family:var(--font-mono);font-size:0.78rem}
.dash-body{padding:20px;font-family:var(--font-mono);font-size:0.8rem;line-height:1.9}
.dash-body .label-example{display:inline-block;padding:3px 10px;background:var(--bg);border:1px solid var(--border);border-radius:4px;font-size:0.7rem;color:var(--text-3);margin-bottom:12px}
.dash-body .row{display:flex;gap:12px;flex-wrap:wrap}
.dash-body .ts{color:var(--text-3);opacity:0.5;min-width:60px}
.dash-body .provider{color:var(--accent-bright)}
.dash-body .model{color:var(--text-3)}
.dash-body .ok{color:var(--green)}
.dash-body .fail{color:var(--red)}
.dash-body .fallback{color:var(--accent)}
.dash-side{display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:20px}
.dash-card{padding:18px;background:var(--bg-surface);border:1px solid var(--border);border-radius:8px}
.dash-card h4{font-size:0.75rem;color:var(--text-3);text-transform:uppercase;letter-spacing:0.06em;margin-bottom:8px}
.dash-card .val{font-size:1.5rem;font-weight:700;color:var(--text)}
.dash-card .sub{font-size:0.78rem;color:var(--text-3);margin-top:4px}

/* ── PROVIDERS STRIP ── */
.providers-strip{display:flex;flex-wrap:wrap;gap:8px;margin:16px 0}
.provider-tag{padding:7px 14px;background:var(--bg-card);border:1px solid var(--border);border-radius:6px;font-size:0.88rem;color:var(--text-2)}

/* ── SETUP ── */
.setup-steps{display:grid;grid-template-columns:repeat(3,1fr);gap:20px}
.setup-step .num{display:inline-flex;align-items:center;justify-content:center;width:28px;height:28px;border-radius:50%;background:var(--accent-dim);color:var(--accent);font-size:0.78rem;font-weight:700;margin-bottom:10px}
.setup-step h3{font-size:0.95rem;font-weight:600;margin-bottom:8px}
.setup-step code{display:block;padding:12px 14px;background:var(--bg);border:1px solid var(--border);border-radius:6px;font-size:0.8rem;color:var(--accent-bright);margin-top:10px;word-break:break-all;line-height:1.5}

/* ── CLOSE ── */
.close{text-align:center;padding:72px 0}
.close p{color:var(--text-2);max-width:48ch;margin:0 auto 24px;font-size:1.05rem;line-height:1.65}
.close-badges{display:flex;justify-content:center;gap:24px;margin-bottom:28px;flex-wrap:wrap;font-size:0.88rem;color:var(--text-3)}

/* ── FOOTER ── */
footer{padding:40px 0;border-top:1px solid var(--border)}
.footer-inner{display:flex;justify-content:space-between;align-items:center;flex-wrap:wrap;gap:16px}
.footer-brand{display:flex;align-items:center;gap:10px}
.footer-brand img{height:22px;opacity:0.6}
.footer-brand span{font-size:0.78rem;color:var(--text-3)}
.footer-links{display:flex;gap:18px;flex-wrap:wrap}
.footer-links a{color:var(--text-3);font-size:0.78rem;transition:color 0.15s}
.footer-links a:hover{color:var(--text)}
.footer-locales{display:flex;gap:12px}
.footer-locales a{color:var(--text-3);font-size:0.78rem}
.footer-locales a.active{color:var(--accent);font-weight:600}

/* ── MOBILE ── */
@media(max-width:640px){
  .hero{padding:80px 0 40px;min-height:auto}
  .hero-grid{grid-template-columns:1fr;gap:36px}
  .hero-content h1{font-size:clamp(1.8rem,7vw,2.4rem)}
  .hero-sub{font-size:1rem;max-width:none}
  .nav-links { display:none }
  .mobile-nav-cta { display:inline-flex
  .route-visual{padding:28px 20px}
  .route-step{padding:12px 0}
  .route-icon{width:28px;height:28px;font-size:0.7rem}
  .route-label .name{font-size:0.88rem}
  .route-label .detail{font-size:0.75rem}
  .why-grid{grid-template-columns:1fr}
  .setup-steps{grid-template-columns:1fr}
  .flow-row{flex-direction:column;align-items:flex-start;gap:8px}
  .flow-arrow{transform:rotate(90deg);padding:0 0 0 20px}
  .dash-side{grid-template-columns:1fr}
  section{padding:60px 0}
  .close{padding:48px 0}
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

<!-- HERO -->
<section class="hero">
<div class="container">
  <div class="hero-grid">
    <div class="hero-content">
      <h1>${_('hero.title1')}</h1>
      <p class="hero-sub">${_('hero.sub')}</p>
      <div class="hero-tech">
        <span><span class="dot"></span> ${_('feat.circuit')}</span>
        <span><span class="dot"></span> ${_('feat.keyPool')}</span>
        <span><span class="dot"></span> ${_('feat.latency')}</span>
      </div>
      <div class="hero-actions">
        <a href="#setup" class="btn-primary">${_('hero.getStarted')}</a>
        <a href="https://github.com/kaidev-pro/8router" class="btn-secondary" target="_blank" rel="noopener">GitHub</a>
      </div>
    </div>
    <div class="route-visual">
      <div class="route-circuit">
        <div class="route-step">
          <div class="route-icon client">C</div>
          <div class="route-label"><div class="name">${_('rv.client')}</div><div class="detail">${_('rv.request')}</div></div>
        </div>
        <div class="route-line active"></div>
        <div class="route-step">
          <div class="route-icon router">8R</div>
          <div class="route-label"><div class="name">8Router</div><div class="detail">${_('how.title')}</div></div>
        </div>
        <div class="route-line fail"></div>
        <div class="route-step">
          <div class="route-icon fail">O</div>
          <div class="route-label"><div class="name">OpenAI</div></div>
          <span class="route-badge fail">${_('rv.openai_fail')}</span>
        </div>
        <div class="route-line active"></div>
        <div class="route-step">
          <div class="route-icon ok">G</div>
          <div class="route-label"><div class="name">Groq</div></div>
          <span class="route-badge ok">${_('rv.groq_ok')}</span>
        </div>
        <div class="route-line active"></div>
        <div class="route-step">
          <div class="route-icon client">C</div>
          <div class="route-label"><div class="name">${_('rv.client')}</div><div class="detail">${_('rv.response')}</div></div>
        </div>
      </div>
    </div>
  </div>
</div>
</section>

<!-- WHY -->
<section id="why" class="s-alt">
<div class="container">
  <div class="s-label">${_('services.title')}</div>
  <h2 class="s-title">${_('services.title')}</h2>
  <p class="s-desc">${_('services.sub')}</p>
  <div class="why-grid">
    <div class="why-item"><h3>${_('svc.routing')}</h3><p>${_('svc.routingDesc')}</p></div>
    <div class="why-item"><h3>${_('svc.quota')}</h3><p>${_('svc.quotaDesc')}</p></div>
    <div class="why-item"><h3>${_('svc.smart')}</h3><p>${_('svc.smartDesc')}</p></div>
  </div>
</div>
</section>

<!-- ROUTING FLOW -->
<section id="flow">
<div class="container">
  <div class="s-label">${_('how.title')}</div>
  <h2 class="s-title">${_('how.title')}</h2>
  <p class="s-desc">${_('how.desc')}</p>
  <div class="flow-row">
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

<!-- ALIASES -->
<section id="aliases" class="s-alt">
<div class="container">
  <div class="s-label">${_('aliases.title')}</div>
  <h2 class="s-title">${_('aliases.title')}</h2>
  <p class="s-desc">${_('aliases.desc')}</p>
  <table class="alias-table">
    <thead><tr><th>${_('aliases.alias')}</th><th>${_('aliases.description')}</th></tr></thead>
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

<!-- DASHBOARD -->
<section id="dashboard">
<div class="container">
  <div class="s-label">${_('dashboard.title')}</div>
  <h2 class="s-title">${_('dashboard.title')}</h2>
  <p class="s-desc">${_('features.desc')}</p>
  <div class="dash-window">
    <div class="dash-titlebar">
      <div class="dots"><span class="r"></span><span class="y"></span><span class="g"></span></div>
      <span class="title">${_('dash.title')}</span>
    </div>
    <div class="dash-body">
      <div class="label-example">${_('rv.title')}</div>
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

<!-- FEATURES -->
<section>
<div class="container">
  <div class="s-label">${_('features.title')}</div>
  <h2 class="s-title">${_('features.title')}</h2>
  <p class="s-desc">${_('features.desc')}</p>
</div>
</section>

<!-- INTEGRATIONS -->
<section class="s-alt">
<div class="container">
  <div class="s-label">${_('integrations.title')}</div>
  <h2 class="s-title">${_('integrations.title')}</h2>
  <p class="s-desc">${_('integrations.desc')}</p>
</div>
</section>

<!-- PROVIDERS + TOOLS -->
<section class="s-alt">
<div class="container">
  <div class="s-label">${_('providers.title')}</div>
  <h2 class="s-title">${_('providers.title')}</h2>
  <p class="s-desc">${_('providers.desc')}</p>
  <div class="providers-strip">
    <span class="provider-tag">OpenAI</span><span class="provider-tag">Groq</span><span class="provider-tag">DeepSeek</span>
    <span class="provider-tag">Mistral</span><span class="provider-tag">Together</span><span class="provider-tag">xAI</span>
    <span class="provider-tag">OpenRouter</span><span class="provider-tag">Ollama</span><span class="provider-tag">Anthropic</span><span class="provider-tag">Google</span>
  </div>
  <div class="providers-strip" style="margin-top:12px">
    <span class="provider-tag">Cursor</span><span class="provider-tag">Cline</span><span class="provider-tag">Continue</span>
    <span class="provider-tag">Roo Code</span><span class="provider-tag">Open WebUI</span><span class="provider-tag">Claude Code</span>
    <span class="provider-tag">Codex CLI</span><span class="provider-tag">Hermes Agent</span>
  </div>
</div>
</section>

<!-- SETUP -->
<section id="setup">
<div class="container">
  <div class="s-label">${_('start.title')}</div>
  <h2 class="s-title">${_('start.title')}</h2>
  <div class="setup-steps">
    <div class="setup-step"><div class="num">1</div><h3>${_('start.install')}</h3><code>npm install -g @kaidev18/eight-router</code></div>
    <div class="setup-step"><div class="num">2</div><h3>${_('start.run')}</h3><code>8router</code></div>
    <div class="setup-step"><div class="num">3</div><h3>${_('start.configure')}</h3><code>Base URL: http://localhost:8080/v1<br>Model: 8router/auto</code></div>
  </div>
</div>
</section>

<!-- CLOSE -->
<section class="close">
<div class="container">
  <h2 class="s-title">${_('hero.title1')}</h2>
  <h2 class="s-title">${_('security.title')}</h2>
  <p>${_('footer.builtFor')}</p>
  <div class="close-badges">
    <span>MIT License</span><span>Your keys</span><span>Your routes</span><span>Local-first</span>
    <span>${_('security.title')}</span><span>${_('tests.title')}</span>
  </div>
  <div class="hero-actions" style="justify-content:center">
    <a href="#setup" class="btn-primary">${_('hero.getStarted')}</a>
    <a href="https://github.com/kaidev-pro/8router" class="btn-secondary" target="_blank" rel="noopener">GitHub</a>
  </div>
</div>
</section>

${donateHref ? `<section style="background:var(--bg-surface);padding:40px 0;text-align:center"><div class="container"><a href="${donateHref}" class="btn-primary" target="_blank" rel="noopener">${_('support.donate')}</a></div></section>` : ''}

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
