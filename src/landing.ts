// 8Router — Landing Page (i18n)
import { VERSION_STRING } from './version.js';
import { t, getLocale, type Locale, SUPPORTED_LOCALES } from './i18n/index.js';

export function getLandingHTML(locale: Locale = 'en'): string {
  const _ = (key: string) => t(key, locale);
  // SVG icon helper — 24x24 viewBox, stroke-based, 1.5px
  const icons: Record<string, string> = {
    messageSquare: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>`,
    cable: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    route: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="19" r="3"/><path d="M9 19h8.5a3.5 3.5 0 0 0 0-7h-11a3.5 3.5 0 0 1 0-7H15"/><circle cx="18" cy="5" r="3"/></svg>`,
    gauge: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="m12 14 4-4"/><path d="M3.34 19a10 10 0 1 1 17.32 0"/></svg>`,
    brainCircuit: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/><path d="M17.599 6.5a3 3 0 0 0 .399-1.375"/><path d="M6.003 5.125A3 3 0 0 0 6.401 6.5"/><path d="M3.477 10.896a4 4 0 0 1 .585-.396"/><path d="M19.938 10.5a4 4 0 0 1 .585.396"/><path d="M6 18a4 4 0 0 1-1.967-.516"/><path d="M19.967 17.484A4 4 0 0 1 18 18"/></svg>`,
    wrench: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`,
    gitBranch: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="6" y1="3" x2="6" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/></svg>`,
    database: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>`,
    image: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>`,
    zap: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>`,
    shield: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>`,
    activity: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>`,
    terminal: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg>`,
    layoutDashboard: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="9"/><rect x="14" y="3" width="7" height="5"/><rect x="14" y="12" width="7" height="9"/><rect x="3" y="16" width="7" height="5"/></svg>`,
    key: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg>`,
    barChart: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg>`,
    settings: `<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M12 1v2m0 18v2M4.22 4.22l1.42 1.42m12.72 12.72l1.42 1.42M1 12h2m18 0h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/></svg>`,
    check: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`,
    alertTriangle: `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>`,
  };

  function icon(name: string): string {
    return `<span class="svc-icon-box">${icons[name] || ''}</span>`;
  }

  return `<!DOCTYPE html>
<html lang="${locale}">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${_('meta.title')}</title>
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

/* Prevent any child from overflowing viewport */
html, body { overflow-x:hidden; max-width:100vw }
img, video, svg { max-width:100%; height:auto }
pre { overflow-x:auto; -webkit-overflow-scrolling:touch; max-width:100% }
code { word-break:break-all; white-space:pre-wrap }
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
@keyframes fade-up { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
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
.nav-brand { display:flex; align-items:center; text-decoration:none; flex-shrink:0 }
.nav-logo { height:28px; width:auto; object-fit:contain }
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
  padding:160px 0 80px;
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
  margin-bottom:40px;
  word-break:break-word;
}
.hero-actions {
  display:flex; gap:14px; margin-bottom:56px; flex-wrap:wrap;
}
.btn-primary {
  display:inline-flex; align-items:center; gap:10px;
  padding:14px 28px; background:var(--accent); color:#000;
  border-radius:10px; font-weight:700; font-size:15px;
  text-decoration:none; transition:all 0.2s; border:none; cursor:pointer;
}
.btn-primary:hover { transform:translateY(-2px); box-shadow:0 8px 30px rgba(132,171,255,0.3) }
.btn-secondary {
  display:inline-flex; align-items:center; gap:10px;
  padding:14px 28px; background:transparent; color:var(--text);
  border:1px solid var(--border); border-radius:10px;
  font-weight:600; font-size:15px; text-decoration:none;
  transition:all 0.2s; cursor:pointer;
}
.btn-secondary:hover { border-color:var(--accent); background:var(--accent-dim); transform:translateY(-2px) }

/* Hero code block */
.hero-code { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; margin-bottom:48px; max-width:500px; overflow:hidden }
.hero-code-label { font-size:12px; font-weight:600; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px }
.hero-code pre { margin:0 }
.hero-code code { font-size:13px }

/* Hero stats */
.hero-stats {
  display:flex; gap:16px; flex-wrap:wrap;
}
.hero-stat { text-align:center; padding:16px 24px; background:var(--bg-card); border:1px solid var(--border); border-radius:10px; min-width:0 }
.hero-stat-val { font-size:22px; font-weight:800; color:var(--accent); font-family:'JetBrains Mono',monospace }
.hero-stat-label { font-size:11px; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin-top:4px }

/* ─── SECTIONS ─── */
section { padding:80px 0; position:relative; z-index:1 }
.s-title {
  font-size:clamp(24px,3.5vw,40px);
  font-weight:800; letter-spacing:-0.03em;
  line-height:1.15; margin-bottom:12px;
}
.s-desc { font-size:15px; color:var(--text-2); max-width:520px; line-height:1.7; margin-bottom:40px }
.s-intro { font-size:16px; color:var(--text-2); max-width:560px; line-height:1.7; margin-bottom:8px }

/* ─── SERVICE ICON BOX ─── */
.svc-icon-box {
  display:flex; align-items:center; justify-content:center;
  width:36px; height:36px; border-radius:10px;
  border:1px solid rgba(132,171,255,0.15);
  background:rgba(132,171,255,0.06);
  color:var(--accent); flex-shrink:0;
  margin-bottom:16px;
}
.svc-icon-box svg { width:18px; height:18px }

/* ─── DOT STATUS ─── */
.status-dot { display:inline-flex; align-items:center; gap:6px; font-size:12px; margin-top:14px }
.status-dot .dot-sm { width:6px; height:6px; border-radius:50% }
.status-dot.s-green { color:var(--green) }
.status-dot.s-green .dot-sm { background:var(--green) }
.status-dot.s-orange { color:var(--orange) }
.status-dot.s-orange .dot-sm { background:var(--orange) }
.status-dot.s-slate { color:var(--text-3) }
.status-dot.s-slate .dot-sm { background:var(--text-3) }

/* ─── SERVICES ─── */
.svc-grid {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:14px;
}
.svc-card {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:12px;
  padding:22px 20px;
  transition:all 0.25s;
  position:relative;
  overflow:hidden;
}
.svc-card:hover { border-color:var(--border-hover); background:var(--bg-card-hover) }
.svc-card h3 { font-size:15px; font-weight:700; margin-bottom:8px }
.svc-card p { font-size:13px; color:var(--text-2); line-height:1.6 }

/* ─── PROVIDERS ─── */
.prov-section { background:var(--bg-surface) }
.prov-tiers { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:40px }
.prov-tier { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px }
.prov-tier-header { display:flex; align-items:center; gap:8px; margin-bottom:14px }
.prov-tier-header h3 { font-size:15px; font-weight:700 }
.prov-tier-label { font-size:11px; font-weight:600; text-transform:uppercase; letter-spacing:0.08em; color:var(--text-3); padding:2px 8px; border-radius:4px; border:1px solid var(--border) }
.prov-list { display:flex; flex-direction:column; gap:6px }
.prov-item { display:flex; justify-content:space-between; align-items:center; padding:8px 10px; background:var(--bg-surface); border-radius:8px }
.prov-name { font-size:13px; font-weight:500; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap }
.prov-logo-wrap { width:24px; height:24px; display:flex; align-items:center; justify-content:center; flex-shrink:0; border-radius:4px; overflow:hidden }
.prov-logo { width:20px; height:20px; object-fit:contain }
.prov-logo-fb { width:20px; height:20px; border-radius:4px; display:flex; align-items:center; justify-content:center; font-size:9px; font-weight:700 }

/* ─── BADGE STYLES (compact) ─── */
.badge-sm { display:inline-block; padding:1px 6px; border-radius:3px; font-size:10px; font-weight:600 }
.badge-active { background:rgba(0,210,148,0.15); color:var(--green) }
.badge-beta { background:rgba(225,133,40,0.15); color:var(--orange) }
.badge-coming { background:rgba(90,96,112,0.15); color:var(--text-3) }
.badge-local { background:rgba(132,171,255,0.15); color:var(--accent) }

/* ─── ALIAS CARDS ─── */
.alias-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:40px }
.alias-card { background:var(--bg-card); border:1px solid var(--border); border-radius:10px; padding:18px }
.alias-name { font-family:'JetBrains Mono',monospace; font-size:14px; font-weight:600; color:var(--accent); margin-bottom:6px }
.alias-card p { font-size:13px; color:var(--text-2); line-height:1.5 }
.alias-note { text-align:center; margin-top:14px; font-size:12px; color:var(--text-3) }

/* ─── HOW IT WORKS ─── */
.how-grid { display:grid; grid-template-columns:repeat(5,1fr); gap:14px; margin-top:40px }
.how-step { background:var(--bg-card); border:1px solid var(--border); border-radius:10px; padding:18px; text-align:center }
.how-num { width:28px; height:28px; border-radius:50%; background:var(--accent-dim); color:var(--accent); font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; margin:0 auto 10px }
.how-step h3 { font-size:13px; font-weight:700; margin-bottom:6px }
.how-step p { font-size:12px; color:var(--text-2); line-height:1.5 }
.how-step pre { margin-top:8px }

/* ─── FEATURES ─── */
.feat-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:40px }
.feat-card { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:20px; transition:all 0.25s }
.feat-card:hover { border-color:var(--border-hover); background:var(--bg-card-hover) }
.feat-icon { display:flex; align-items:center; justify-content:center; width:32px; height:32px; border-radius:8px; border:1px solid rgba(132,171,255,0.12); background:rgba(132,171,255,0.04); color:var(--accent); margin-bottom:14px }
.feat-icon svg { width:16px; height:16px }
.feat-card h3 { font-size:14px; font-weight:700; margin-bottom:6px }
.feat-card p { font-size:13px; color:var(--text-2); line-height:1.5 }

/* ─── DASHBOARD PREVIEW ─── */
.dash-preview {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:14px;
  overflow:hidden;
  position:relative;
  max-width:100%;
}
.dash-topbar { display:flex; align-items:center; justify-content:space-between; padding:12px 18px; border-bottom:1px solid var(--border); background:var(--bg-surface) }
.dash-topbar span { font-size:13px; font-weight:600 }
.dash-url { font-size:12px; color:var(--text-3); font-family:'JetBrains Mono',monospace }
.dash-body {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:14px;
  padding:20px;
}
.dash-metric {
  background:var(--bg-surface);
  border:1px solid var(--border);
  border-radius:8px;
  padding:14px;
}
.dash-metric .dm-label { font-size:11px; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:4px }
.dash-metric .dm-val { font-size:22px; font-weight:800; color:var(--accent) }
.dash-provider-bar {
  margin-bottom:12px;
}
.dash-provider-bar .dpb-head {
  display:flex; justify-content:space-between; align-items:center;
  margin-bottom:4px;
}
.dash-provider-bar .dpb-name { font-size:12px; font-weight:600 }
.dash-provider-bar .dpb-pct { font-size:11px; color:var(--text-3) }
.dash-provider-bar .dpb-track {
  height:4px; border-radius:2px;
  background:var(--bg-card);
  overflow:hidden;
}
.dash-provider-bar .dpb-fill {
  height:100%; border-radius:2px;
  transition:width 1s ease-out;
}

/* ─── INTEGRATIONS ─── */
.int-grid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:40px }
.int-card { display:flex; justify-content:space-between; align-items:center; padding:12px 16px; background:var(--bg-card); border:1px solid var(--border); border-radius:10px; gap:10px }
.int-left { display:flex; align-items:center; gap:10px; min-width:0 }
.int-logo-wrap { width:24px; height:24px; border-radius:5px; display:flex; align-items:center; justify-content:center; flex-shrink:0; overflow:hidden }
.int-logo-wrap img { width:24px; height:24px; object-fit:contain }
.int-name { font-size:13px; font-weight:600; white-space:nowrap; overflow:hidden; text-overflow:ellipsis }
.int-config { margin-top:28px; text-align:center }
.int-config-label { font-size:12px; font-weight:600; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:10px }
.int-config pre { display:block; text-align:left; overflow-x:auto; max-width:100%; padding:0 16px }

/* ─── SECURITY ─── */
.sec-checklist { display:flex; flex-direction:column; gap:0; margin-top:32px }
.sec-check { display:flex; align-items:center; gap:10px; padding:10px 0; border-bottom:1px solid var(--border); font-size:14px; color:var(--text-2) }
.sec-check:last-child { border-bottom:none }
.sec-check .check-icon { color:var(--green); flex-shrink:0 }
.sec-check.warn { color:var(--red) }
.sec-check.warn .check-icon { color:var(--red) }
.sec-warning { margin-top:20px; padding:14px; background:rgba(255,101,104,0.06); border:1px solid rgba(255,101,104,0.15); border-radius:8px; color:var(--red); font-size:13px; display:flex; align-items:center; gap:10px }

/* ─── TEST STATS ─── */
.test-stats { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; margin-top:40px }
.test-stat { text-align:center; padding:20px; background:var(--bg-card); border:1px solid var(--border); border-radius:10px }
.ts-val { font-size:26px; font-weight:800; color:var(--green); font-family:'JetBrains Mono',monospace }
.ts-label { font-size:11px; color:var(--text-3); margin-top:4px }

/* ─── GET STARTED ─── */
.start-steps { display:grid; grid-template-columns:repeat(3,1fr); gap:14px; margin-top:40px }
.start-step { background:var(--bg-card); border:1px solid var(--border); border-radius:10px; padding:20px; text-align:center }
.start-num { width:28px; height:28px; border-radius:50%; background:var(--accent-dim); color:var(--accent); font-weight:700; font-size:13px; display:flex; align-items:center; justify-content:center; margin:0 auto 10px }
.start-label { font-size:14px; font-weight:600; margin-bottom:10px }
.start-actions { display:flex; gap:12px; justify-content:center; margin-top:28px; flex-wrap:wrap }

/* ─── FOOTER ─── */
footer {
  padding:48px 0 32px;
  border-top:1px solid var(--border);
  position:relative; z-index:1;
}
.footer-grid {
  display:grid;
  grid-template-columns:1.5fr repeat(3,1fr);
  gap:40px;
  margin-bottom:40px;
}
.footer-brand p { font-size:13px; color:var(--text-2); margin-top:10px; max-width:280px; line-height:1.6 }
.footer-logo { height:28px; width:auto; object-fit:contain }
.footer-col h4 { font-size:12px; font-weight:700; color:var(--text); margin-bottom:14px; text-transform:uppercase; letter-spacing:0.06em }
.footer-col a {
  display:block; font-size:13px; color:var(--text-2);
  text-decoration:none; padding:3px 0; transition:color 0.15s;
}
.footer-col a:hover { color:var(--accent) }
.footer-bottom {
  display:flex; justify-content:space-between; align-items:center;
  padding-top:20px; border-top:1px solid var(--border);
  font-size:12px; color:var(--text-3);
}
.lang-switcher { display:flex; gap:8px; align-items:center }
.lang-switcher a { color:var(--text-3); text-decoration:none; transition:color 0.15s }
.lang-switcher a:hover { color:var(--accent) }
.lang-active { color:var(--accent); font-weight:600 }

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
  /* Container */
  .wrap { padding:0 20px; width:100%; max-width:100vw; overflow:hidden }

  /* Nav */
  .nav-inner { padding:0 20px; height:56px }
  .nav-logo { height:24px }

  /* Sections */
  section { padding:56px 0; overflow:hidden }
  .s-title { font-size:clamp(22px,6vw,30px) }
  .s-desc { max-width:100%; font-size:14px; margin-bottom:28px }

  /* Hero */
  .hero { padding:100px 0 48px; min-height:auto }
  .hero-inner { width:100%; overflow:hidden }
  .hero h1 { font-size:clamp(28px,8vw,38px) !important; letter-spacing:-0.02em; word-break:break-word }
  .hero-sub { font-size:15px; max-width:100%; margin-bottom:28px; line-height:1.6 }
  .hero-badge { font-size:11px; padding:5px 12px; margin-bottom:20px }
  .hero-code { max-width:100%; padding:14px; overflow:hidden }
  .hero-code pre { overflow-x:auto; max-width:100%; margin:0 }
  .hero-code code { font-size:11px; white-space:pre; word-break:normal }
  .hero-stats { flex-direction:column; gap:10px; width:100% }
  .hero-stat { padding:14px 16px; width:100% }
  .hero-stat-val { font-size:20px }
  .hero-actions { flex-direction:column; gap:10px; margin-bottom:32px; width:100% }
  .btn-primary, .btn-secondary { width:100%; justify-content:center; padding:14px 20px; font-size:14px; box-sizing:border-box }

  /* Grids */
  .svc-grid { grid-template-columns:1fr; gap:10px }
  .svc-card { padding:18px 16px }
  .svc-icon-box { width:32px; height:32px; margin-bottom:12px }
  .svc-icon-box svg { width:16px; height:16px }
  .svc-card h3 { font-size:14px }
  .svc-card p { font-size:13px }
  .feat-grid { grid-template-columns:1fr; gap:10px }
  .feat-card { padding:16px }
  .feat-icon { width:28px; height:28px; margin-bottom:10px }
  .feat-icon svg { width:14px; height:14px }
  .feat-card h3 { font-size:13px }
  .feat-card p { font-size:12px }
  .int-grid { grid-template-columns:1fr; gap:10px }
  .int-card { padding:10px 14px }
  .prov-tiers { grid-template-columns:1fr; gap:14px }
  .prov-tier { padding:16px }
  .alias-grid { grid-template-columns:1fr; gap:10px }
  .alias-card { padding:14px }
  .how-grid { grid-template-columns:1fr; gap:10px }
  .how-step { padding:14px }
  .how-step pre { overflow-x:auto; max-width:100% }
  .test-stats { grid-template-columns:repeat(2,1fr); gap:10px }
  .test-stat { padding:14px 10px }
  .test-stat .ts-val { font-size:22px }
  .start-steps { grid-template-columns:1fr; gap:10px }
  .start-step { padding:16px }
  .start-step pre { overflow-x:auto; max-width:100% }
  .start-actions { flex-direction:column; width:100% }
  .start-actions .btn-primary,
  .start-actions .btn-secondary { width:100%; justify-content:center }
  .sec-check { font-size:13px; padding:8px 0 }
  .sec-warning { font-size:12px; padding:12px }

  /* Integrations config */
  .int-config pre { padding:0; margin:0 auto; max-width:100% }
  .int-config code { font-size:12px }

  /* Dashboard */
  .dash-body { grid-template-columns:1fr; padding:14px }
  .dash-topbar { padding:10px 14px }
  .dash-url { font-size:11px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:50% }

  /* Footer */
  .footer-grid { grid-template-columns:1fr; gap:24px }
  .footer-bottom { flex-direction:column; gap:8px; text-align:center }
  .footer-brand p { max-width:100% }

  /* Nav links hide */
  .nav-links { display:none }
}
</style>
</head>
<body>

<!-- NAV -->
<nav>
  <div class="nav-inner">
    <a href="/" class="nav-brand">
      <img src="/assets/8router-logo-dark.png" alt="8Router" class="nav-logo">
    </a>
    <div class="nav-links">
      <a href="#services">Services</a>
      <a href="#providers">${_('nav.providers')}</a>
      <a href="#features">${_('nav.features')}</a>
      <a href="#aliases">${_('nav.aliases')}</a>
      <a href="#start">${_('nav.getStarted')}</a>
      <a href="/8router/dashboard" class="nav-cta">${_('nav.dashboard')}</a>
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
        ${_('hero.badge')}
      </div>
      <h1>
        ${_('hero.title1')}<br>
        <span class="hero-accent">${_('hero.title2')}</span><br>
        ${_('hero.title3')}
      </h1>
      <p class="hero-sub">
        ${_('hero.sub')}
      </p>
      <div class="hero-actions">
        <a href="#start" class="btn-primary">${_('hero.getStarted')}</a>
        <a href="/8router/dashboard" class="btn-secondary">${_('hero.openDashboard')}</a>
        <a href="/8router/setup" class="btn-secondary">${_('hero.setupGuide')}</a>
      </div>
      <div class="hero-code">
        <div class="hero-code-label">${_('hero.installLabel')}</div>
        <pre><code>$ npm install -g 8router
$ 8router

# API live at http://localhost:8080/v1
# Dashboard at http://localhost:8080/8router/dashboard</code></pre>
      </div>
      <div class="hero-stats">
        <div class="hero-stat">
          <div class="hero-stat-val">12</div>
          <div class="hero-stat-label">${_('hero.statProviders')}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">6</div>
          <div class="hero-stat-label">${_('hero.statAliases')}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">3-Tier</div>
          <div class="hero-stat-label">${_('hero.statFallback')}</div>
        </div>
        <div class="hero-stat">
          <div class="hero-stat-val">41</div>
          <div class="hero-stat-label">${_('hero.statTests')}</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section id="services">
  <div class="wrap">
    <h2 class="s-title">${_('services.title')}</h2>
    <div class="s-intro">${_('services.sub')}</div>
    <div class="svc-grid">
      <div class="svc-card">
        ${icon('messageSquare')}
        <h3>${_('svc.chat')}</h3>
        <p>${_('svc.chatDesc')}</p>
        <span class="status-dot s-green"><span class="dot-sm"></span>${_('status.active')}</span>
      </div>
      <div class="svc-card">
        ${icon('cable')}
        <h3>${_('svc.api')}</h3>
        <p>${_('svc.apiDesc')}</p>
        <span class="status-dot s-green"><span class="dot-sm"></span>${_('status.active')}</span>
      </div>
      <div class="svc-card">
        ${icon('route')}
        <h3>${_('svc.routing')}</h3>
        <p>${_('svc.routingDesc')}</p>
        <span class="status-dot s-green"><span class="dot-sm"></span>${_('status.active')}</span>
      </div>
      <div class="svc-card">
        ${icon('gauge')}
        <h3>${_('svc.quota')}</h3>
        <p>${_('svc.quotaDesc')}</p>
        <span class="status-dot s-green"><span class="dot-sm"></span>${_('status.active')}</span>
      </div>
      <div class="svc-card">
        ${icon('brainCircuit')}
        <h3>${_('svc.smart')}</h3>
        <p>${_('svc.smartDesc')}</p>
        <span class="status-dot s-orange"><span class="dot-sm"></span>${_('status.beta')}</span>
      </div>
      <div class="svc-card">
        ${icon('wrench')}
        <h3>${_('svc.tools')}</h3>
        <p>${_('svc.toolsDesc')}</p>
        <span class="status-dot s-orange"><span class="dot-sm"></span>${_('status.beta')}</span>
      </div>
      <div class="svc-card">
        ${icon('gitBranch')}
        <h3>${_('svc.streaming')}</h3>
        <p>${_('svc.streamingDesc')}</p>
        <span class="status-dot s-orange"><span class="dot-sm"></span>${_('status.beta')}</span>
      </div>
      <div class="svc-card">
        ${icon('database')}
        <h3>${_('svc.embeddings')}</h3>
        <p>${_('svc.embeddingsDesc')}</p>
        <span class="status-dot s-slate"><span class="dot-sm"></span>${_('status.comingSoon')}</span>
      </div>
      <div class="svc-card">
        ${icon('image')}
        <h3>${_('svc.image')}</h3>
        <p>${_('svc.imageDesc')}</p>
        <span class="status-dot s-slate"><span class="dot-sm"></span>${_('status.comingSoon')}</span>
      </div>
    </div>
  </div>
</section>

<!-- PROVIDERS -->
<section id="providers" class="prov-section">
  <div class="wrap">
    <h2 class="s-title">${_('providers.title')}</h2>
    <div class="s-desc">${_('providers.desc')}</div>
    <div class="prov-tiers">
      <div class="prov-tier">
        <div class="prov-tier-header">
          <span class="prov-tier-label">${_('tier.premium')}</span>
        </div>
        <div class="prov-list">
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/openai.svg" alt="OpenAI" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">OA</span></div><span class="prov-name">OpenAI</span><span class="badge-sm badge-active">Active</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/anthropic.svg" alt="Anthropic" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">A</span></div><span class="prov-name">Anthropic</span><span class="badge-sm badge-active">Active</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/gemini.svg" alt="Gemini" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">G</span></div><span class="prov-name">Gemini</span><span class="badge-sm badge-active">Active</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/xai.svg" alt="xAI" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">xAI</span></div><span class="prov-name">xAI</span><span class="badge-sm badge-coming">Soon</span></div>
        </div>
      </div>
      <div class="prov-tier">
        <div class="prov-tier-header">
          <span class="prov-tier-label">${_('tier.efficient')}</span>
        </div>
        <div class="prov-list">
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/groq.svg" alt="Groq" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">GQ</span></div><span class="prov-name">Groq</span><span class="badge-sm badge-active">Active</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/openrouter.svg" alt="OpenRouter" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">OR</span></div><span class="prov-name">OpenRouter</span><span class="badge-sm badge-active">Active</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/mistral.svg" alt="Mistral" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">M</span></div><span class="prov-name">Mistral</span><span class="badge-sm badge-active">Active</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/deepseek.svg" alt="DeepSeek" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">DS</span></div><span class="prov-name">DeepSeek</span><span class="badge-sm badge-beta">Beta</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/together.svg" alt="Together AI" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">TG</span></div><span class="prov-name">Together AI</span><span class="badge-sm badge-beta">Beta</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/cohere.svg" alt="Cohere" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">C</span></div><span class="prov-name">Cohere</span><span class="badge-sm badge-coming">Soon</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/perplexity.svg" alt="Perplexity" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">PX</span></div><span class="prov-name">Perplexity</span><span class="badge-sm badge-coming">Soon</span></div>
        </div>
      </div>
      <div class="prov-tier">
        <div class="prov-tier-header">
          <span class="prov-tier-label">${_('tier.local')}</span>
        </div>
        <div class="prov-list">
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/ollama.svg" alt="Ollama" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">OL</span></div><span class="prov-name">Ollama</span><span class="badge-sm badge-local">Local</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/lmstudio.svg" alt="LM Studio" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">LM</span></div><span class="prov-name">LM Studio</span><span class="badge-sm badge-local">Local</span></div>
          <div class="prov-item"><div class="prov-logo-wrap"><img src="/assets/providers/vllm.svg" alt="vLLM" class="prov-logo" onerror="this.style.display='none';this.nextElementSibling.style.display='flex'"><span class="prov-logo-fb" style="display:none">vL</span></div><span class="prov-name">vLLM</span><span class="badge-sm badge-local">Local</span></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- MODEL ALIASES -->
<section id="aliases">
  <div class="wrap">
    <h2 class="s-title">${_('aliases.title')}</h2>
    <div class="s-desc">${_('aliases.desc')}</div>
    <div class="alias-grid">
      <div class="alias-card">
        <div class="alias-name">8router/auto</div>
        <p>${_('alias.autoDesc')}</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/cheap</div>
        <p>${_('alias.cheapDesc')}</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/fast</div>
        <p>${_('alias.fastDesc')}</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/smart</div>
        <p>${_('alias.smartDesc')}</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/coding</div>
        <p>${_('alias.codingDesc')}</p>
      </div>
      <div class="alias-card">
        <div class="alias-name">8router/local</div>
        <p>${_('alias.localDesc')}</p>
      </div>
    </div>
    <div class="alias-note">${_('aliases.note')}</div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section id="how" style="background:var(--bg-surface)">
  <div class="wrap">
    <h2 class="s-title">${_('how.title')}</h2>
    <div class="s-desc">${_('how.desc')}</div>
    <div class="how-grid">
      <div class="how-step">
        <div class="how-num">1</div>
        <h3>${_('how.install')}</h3>
        <pre><code>npm install -g 8router</code></pre>
      </div>
      <div class="how-step">
        <div class="how-num">2</div>
        <h3>${_('how.connect')}</h3>
        <p>${_('how.connectDesc')}</p>
      </div>
      <div class="how-step">
        <div class="how-num">3</div>
        <h3>${_('how.point')}</h3>
        <p>${_('how.pointDesc')}</p>
        <pre><code>http://localhost:8080/v1</code></pre>
      </div>
      <div class="how-step">
        <div class="how-num">4</div>
        <h3>${_('how.aliases')}</h3>
        <p>${_('how.aliasesDesc')}</p>
      </div>
      <div class="how-step">
        <div class="how-num">5</div>
        <h3>${_('how.monitor')}</h3>
        <p>${_('how.monitorDesc')}</p>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES -->
<section id="features">
  <div class="wrap">
    <h2 class="s-title">${_('features.title')}</h2>
    <div class="s-desc">${_('features.desc')}</div>
    <div class="feat-grid">
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>
        <h3>${_('feat.adapters')}</h3>
        <p>${_('feat.adaptersDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg></div>
        <h3>${_('feat.capability')}</h3>
        <p>${_('feat.capabilityDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 5a3 3 0 1 0-5.997.125 4 4 0 0 0-2.526 5.77 4 4 0 0 0 .556 6.588A4 4 0 1 0 12 18Z"/><path d="M12 5a3 3 0 1 1 5.997.125 4 4 0 0 1 2.526 5.77 4 4 0 0 1-.556 6.588A4 4 0 1 1 12 18Z"/><path d="M15 13a4.5 4.5 0 0 1-3-4 4.5 4.5 0 0 1-3 4"/></svg></div>
        <h3>${_('feat.smartPicker')}</h3>
        <p>${_('feat.smartPickerDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg></div>
        <h3>${_('feat.costTable')}</h3>
        <p>${_('feat.costTableDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg></div>
        <h3>${_('feat.latency')}</h3>
        <p>${_('feat.latencyDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg></div>
        <h3>${_('feat.circuit')}</h3>
        <p>${_('feat.circuitDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.778 7.778 5.5 5.5 0 0 1 7.777-7.777zm0 0L15.5 7.5m0 0l3 3L22 7l-3-3m-3.5 3.5L19 4"/></svg></div>
        <h3>${_('feat.keyPool')}</h3>
        <p>${_('feat.keyPoolDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="16"/></svg></div>
        <h3>${_('feat.quotaTracker')}</h3>
        <p>${_('feat.quotaTrackerDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg></div>
        <h3>${_('feat.secrets')}</h3>
        <p>${_('feat.secretsDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg></div>
        <h3>${_('feat.sanitization')}</h3>
        <p>${_('feat.sanitizationDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><path d="M4 17 10 11 4 5"/><line x1="12" y1="19" x2="20" y2="19"/></svg></div>
        <h3>${_('feat.compat')}</h3>
        <p>${_('feat.compatDesc')}</p>
      </div>
      <div class="feat-card">
        <div class="feat-icon"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg></div>
        <h3>${_('feat.setupGuide')}</h3>
        <p>${_('feat.setupGuideDesc')}</p>
      </div>
    </div>
  </div>
</section>

<!-- DASHBOARD PREVIEW -->
<section id="dashboard" style="background:var(--bg-surface)">
  <div class="wrap">
    <h2 class="s-title">${_('dashboard.title')}</h2>
    <div class="s-desc">${_('dashboard.desc')}</div>
    <div class="dash-preview">
      <div class="dash-topbar">
        <span>8Router Dashboard</span>
        <span class="dash-url">localhost:8080/8router/dashboard</span>
      </div>
      <div class="dash-body">
        <div class="dash-metric">
          <div class="dm-label">${_('dash.totalRequests')}</div>
          <div class="dm-val">24,891</div>
        </div>
        <div class="dash-metric">
          <div class="dm-label">${_('dash.tokensUsed')}</div>
          <div class="dm-val">1.2M</div>
        </div>
        <div class="dash-metric">
          <div class="dm-label">${_('dash.avgLatency')}</div>
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
    <div style="display:flex;align-items:center;gap:10px;margin-bottom:16px"><img src="/assets/8router-logo-dark.png" alt="8Router" style="height:28px;width:auto;object-fit:contain"></div>
    <h2 class="s-title">${_('integrations.title')}</h2>
    <div class="s-desc">${_('integrations.desc')}</div>
    <div class="int-grid">
      <div class="int-card"><div class="int-left"><div class="int-logo-wrap"><img src="/assets/integrations/cursor.svg" alt="Cursor" width="24" height="24"></div><span class="int-name">Cursor</span></div><span class="badge-sm badge-active">Tested</span></div>
      <div class="int-card"><div class="int-left"><div class="int-logo-wrap"><img src="/assets/integrations/cline.svg" alt="Cline" width="24" height="24"></div><span class="int-name">Cline</span></div><span class="badge-sm badge-active">Tested</span></div>
      <div class="int-card"><div class="int-left"><div class="int-logo-wrap"><img src="/assets/integrations/continue.svg" alt="Continue" width="24" height="24"></div><span class="int-name">Continue</span></div><span class="badge-sm badge-active">Tested</span></div>
      <div class="int-card"><div class="int-left"><div class="int-logo-wrap"><img src="/assets/integrations/roo-code.svg" alt="Roo Code" width="24" height="24"></div><span class="int-name">Roo Code</span></div><span class="badge-sm badge-active">Tested</span></div>
      <div class="int-card"><div class="int-left"><div class="int-logo-wrap"><img src="/assets/integrations/open-webui.svg" alt="Open WebUI" width="24" height="24"></div><span class="int-name">Open WebUI</span></div><span class="badge-sm badge-active">Tested</span></div>
      <div class="int-card"><div class="int-left"><div class="int-logo-wrap"><img src="/assets/integrations/claude-code.svg" alt="Claude Code" width="24" height="24"></div><span class="int-name">Claude Code</span></div><span class="badge-sm badge-beta">Compat</span></div>
      <div class="int-card"><div class="int-left"><div class="int-logo-wrap"><img src="/assets/integrations/codex-cli.svg" alt="Codex CLI" width="24" height="24"></div><span class="int-name">Codex CLI</span></div><span class="badge-sm badge-beta">Compat</span></div>
      <div class="int-card"><div class="int-left"><div class="int-logo-wrap"><img src="/assets/integrations/hermes-agent.svg" alt="Hermes Agent" width="24" height="24"></div><span class="int-name">Hermes Agent</span></div><span class="badge-sm badge-active">Tested</span></div>
    </div>
    <div class="int-config">
      <div class="int-config-label">${_('integrations.configLabel')}</div>
      <pre><code>Base URL: http://localhost:8080/v1
API Key:  ***
Model:    8router/auto</code></pre>
    </div>
  </div>
</section>

<!-- SECURITY -->
<section style="background:var(--bg-surface)">
  <div class="wrap">
    <h2 class="s-title">${_('security.title')}</h2>
    <div class="sec-checklist">
      <div class="sec-check"><span class="check-icon">${icons.check}</span>${_('security.masking')}</div>
      <div class="sec-check"><span class="check-icon">${icons.check}</span>${_('security.sanitization')}</div>
      <div class="sec-check"><span class="check-icon">${icons.check}</span>${_('security.adminLocal')}</div>
      <div class="sec-check"><span class="check-icon">${icons.check}</span>${_('security.circuit')}</div>
      <div class="sec-check"><span class="check-icon">${icons.check}</span>${_('security.quota')}</div>
      <div class="sec-check"><span class="check-icon">${icons.check}</span>${_('security.backup')}</div>
      <div class="sec-check warn"><span class="check-icon">${icons.alertTriangle}</span>${_('security.warning')}</div>
    </div>
  </div>
</section>

<!-- TESTS -->
<section>
  <div class="wrap">
    <h2 class="s-title">${_('tests.title')}</h2>
    <div class="s-desc">${_('tests.desc')}</div>
    <div class="test-stats">
      <div class="test-stat">
        <div class="ts-val">18/18</div>
        <div class="ts-label">${_('tests.router')}</div>
      </div>
      <div class="test-stat">
        <div class="ts-val">12/12</div>
        <div class="ts-label">${_('tests.compat')}</div>
      </div>
      <div class="test-stat">
        <div class="ts-val">13/13</div>
        <div class="ts-label">${_('tests.doctor')}</div>
      </div>
      <div class="test-stat">
        <div class="ts-val">43</div>
        <div class="ts-label">${_('tests.total')}</div>
      </div>
    </div>
  </div>
</section>

<!-- GET STARTED -->
<section id="start" style="background:var(--bg-surface)">
  <div class="wrap">
    <h2 class="s-title">${_('start.title')}</h2>
    <div class="start-steps">
      <div class="start-step">
        <div class="start-num">1</div>
        <div class="start-label">${_('start.install')}</div>
        <pre><code>npm install -g 8router</code></pre>
      </div>
      <div class="start-step">
        <div class="start-num">2</div>
        <div class="start-label">${_('start.run')}</div>
        <pre><code>8router</code></pre>
      </div>
      <div class="start-step">
        <div class="start-num">3</div>
        <div class="start-label">${_('start.configure')}</div>
        <pre><code>Base URL: http://localhost:8080/v1
Model:    8router/auto</code></pre>
      </div>
    </div>
    <div class="start-actions">
      <a href="/8router/dashboard" class="btn-primary">${_('start.openDashboard')}</a>
      <a href="/8router/setup" class="btn-secondary">${_('start.setupGuide')}</a>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <img src="/assets/8router-logo-dark.png" alt="8Router" class="footer-logo">
        <p>8Router ${VERSION_STRING} &mdash; ${_('footer.builtFor')}</p>
      </div>
      <div class="footer-col">
        <h4>${_('footer.product')}</h4>
        <a href="/8router/dashboard">${_('nav.dashboard')}</a>
        <a href="/8router/setup">${_('hero.setupGuide')}</a>
        <a href="/v1/models">API</a>
        <a href="#features">${_('nav.features')}</a>
      </div>
      <div class="footer-col">
        <h4>${_('footer.resources')}</h4>
        <a href="#aliases">${_('footer.modelAliases')}</a>
        <a href="#providers">${_('nav.providers')}</a>
        <a href="#start">${_('footer.getStarted')}</a>
      </div>
      <div class="footer-col">
        <h4>${_('footer.8agents')}</h4>
        <a href="#">${_('footer.8agents')}</a>
        <a href="#">8Flow</a>
        <a href="#">8Chat</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>8Router ${VERSION_STRING} &mdash; ${_('footer.ecosystem')}</span>
      <span class="lang-switcher">
        ${(['en', 'id', 'ja'] as string[]).map((l: string) => l === locale
          ? `<span class="lang-active">${t('lang.'+l, locale)}</span>`
          : `<a href="?lang=${l}">${t('lang.'+l, locale)}</a>`
        ).join(' | ')}
      </span>
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
        e.target.style.animation='fade-up 0.5s ease-out forwards';
        obs.unobserve(e.target);
      }
    });
  },{threshold:0.1});
  document.querySelectorAll('.svc-card,.feat-card,.int-card,.prov-item,.how-step,.start-step,.alias-card').forEach(function(el){
    el.style.opacity='0';
    el.style.transform='translateY(16px)';
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
