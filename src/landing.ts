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

/* Noise texture overlay */
.noise {
  position:fixed; inset:0; z-index:0; pointer-events:none;
  opacity:0.03; width:100%; height:100%;
}

/* Container */
.wrap { max-width:1280px; margin:0 auto; padding:0 32px; position:relative; z-index:1 }

/* ─── ANIMATIONS ─── */
@keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
@keyframes drift { 0%,100%{transform:translate(0,0) rotate(0deg)} 33%{transform:translate(8px,-6px) rotate(1deg)} 66%{transform:translate(-4px,4px) rotate(-0.5deg)} }
@keyframes bob { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
@keyframes glow-pulse { 0%,100%{opacity:0.6;filter:blur(20px)} 50%{opacity:1;filter:blur(30px)} }
@keyframes fade-up { from{opacity:0;transform:translateY(30px)} to{opacity:1;transform:translateY(0)} }
@keyframes spin { to{transform:rotate(360deg)} }
@keyframes blink { 0%,100%{opacity:1} 50%{opacity:0} }
@keyframes shimmer { 0%{background-position:-200% 0} 100%{background-position:200% 0} }
@keyframes border-flow { 0%{background-position:0% 50%} 50%{background-position:100% 50%} 100%{background-position:0% 50%} }

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
.nav-bar {
  max-width:1280px; margin:0 auto; padding:0 32px;
  height:64px; display:flex; align-items:center; justify-content:space-between;
}
.nav-brand { display:flex; align-items:center; gap:10px; text-decoration:none }
.nav-logo { height:30px; width:auto; object-fit:contain }
.nav-brand span { font-size:17px; font-weight:700; color:var(--text) }
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
.hero h1 .accent { color:var(--accent) }
.hero h1 .dim { color:var(--text-3) }
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
.btn-primary svg, .btn-secondary svg { width:18px; height:18px }
.hero-stats {
  display:flex; gap:16px; flex-wrap:wrap;
}
.stat-badge {
  display:flex; align-items:center; gap:10px;
  padding:10px 20px; border-radius:10px;
  border:1px solid var(--border); background:var(--bg-card);
  transition:all 0.2s;
}
.stat-badge:hover { border-color:var(--border-hover); background:var(--bg-card-hover) }
.stat-badge .stat-num {
  font-size:20px; font-weight:800; color:var(--accent);
}
.stat-badge .stat-label {
  font-size:12px; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; font-weight:600;
}

/* ─── SECTIONS ─── */
section { padding:100px 0; position:relative; z-index:1 }
.s-label {
  font-size:11px; text-transform:uppercase; letter-spacing:2.5px;
  color:var(--accent); font-weight:700; margin-bottom:12px;
}
.s-title {
  font-size:clamp(28px,4vw,48px);
  font-weight:800; letter-spacing:-0.03em;
  line-height:1.15; margin-bottom:16px;
}
.s-desc { font-size:16px; color:var(--text-2); max-width:560px; line-height:1.7; margin-bottom:48px }
.centered { text-align:center }
.centered .s-desc { margin-left:auto; margin-right:auto }

/* ─── SERVICES ─── */
.svc-grid {
  display:grid;
  grid-template-columns:repeat(4,1fr);
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
  width:48px; height:48px; border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  margin-bottom:18px;
}
.svc-icon svg { width:24px; height:24px }
.svc-card h3 { font-size:16px; font-weight:700; margin-bottom:8px }
.svc-card p { font-size:13px; color:var(--text-2); line-height:1.6 }

/* ─── HOW IT WORKS ─── */
.how-track {
  display:grid;
  grid-template-columns:repeat(5,1fr);
  gap:4px;
  position:relative;
}
.how-step {
  text-align:center;
  padding:32px 16px;
  background:var(--bg-card);
  border:1px solid var(--border);
  position:relative;
  transition:all 0.3s;
}
.how-step:first-child { border-radius:14px 0 0 14px }
.how-step:last-child { border-radius:0 14px 14px 0 }
.how-step:hover { background:var(--bg-card-hover); border-color:var(--border-hover) }
.how-num {
  width:40px; height:40px; border-radius:50%;
  background:var(--accent-dim); color:var(--accent);
  display:flex; align-items:center; justify-content:center;
  font-weight:800; font-size:16px; margin:0 auto 16px;
  border:2px solid rgba(132,171,255,0.2);
}
.how-step h4 { font-size:14px; font-weight:700; margin-bottom:8px }
.how-step p { font-size:12px; color:var(--text-3); line-height:1.5 }
.how-arrow {
  position:absolute; right:-14px; top:50%; transform:translateY(-50%);
  z-index:2; width:28px; height:28px; border-radius:50%;
  background:var(--bg); border:1px solid var(--border);
  display:flex; align-items:center; justify-content:center;
  color:var(--accent);
}
.how-arrow svg { width:14px; height:14px }

/* ─── PROVIDERS ─── */
.prov-section { background:var(--bg-surface) }
.prov-tier { margin-bottom:40px }
.prov-tier:last-child { margin-bottom:0 }
.prov-tier-head {
  display:flex; align-items:center; gap:12px;
  margin-bottom:20px;
}
.prov-tier-head h3 { font-size:18px; font-weight:700 }
.prov-tag {
  font-size:10px; padding:3px 10px; border-radius:6px;
  font-weight:700; text-transform:uppercase; letter-spacing:0.05em;
}
.tag-premium { background:var(--accent-dim); color:var(--accent) }
.tag-cheap { background:var(--orange-dim); color:var(--orange) }
.tag-local { background:var(--green-dim); color:var(--green) }
.tag-active { background:rgba(0,210,148,0.15); color:#00d294; font-size:9px; padding:2px 7px; border-radius:4px; margin-left:6px; vertical-align:middle }
.tag-beta { background:rgba(255,170,0,0.15); color:#ffaa00; font-size:9px; padding:2px 7px; border-radius:4px; margin-left:6px; vertical-align:middle }
.tag-soon { background:rgba(120,130,150,0.15); color:#788896; font-size:9px; padding:2px 7px; border-radius:4px; margin-left:6px; vertical-align:middle }
.prov-row { display:flex; flex-wrap:wrap; gap:12px }
.prov-pill {
  display:flex; align-items:center; gap:12px;
  padding:12px 22px; background:var(--bg-card);
  border:1px solid var(--border); border-radius:12px;
  font-size:14px; font-weight:600; transition:all 0.2s;
  cursor:default;
}
.prov-pill:hover { border-color:var(--border-hover); background:var(--bg-card-hover); transform:translateY(-2px) }
.prov-icon {
  width:36px; height:36px; border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.prov-icon svg { width:18px; height:18px }

/* ─── FEATURES BENTO ─── */
.bento {
  display:grid;
  grid-template-columns:repeat(4,1fr);
  grid-template-rows:auto auto auto;
  gap:16px;
}
.bento .feat { background:var(--bg-card); border:1px solid var(--border); border-radius:14px; padding:28px; transition:all 0.25s; overflow:hidden; position:relative }
.bento .feat:hover { border-color:var(--border-hover); transform:translateY(-2px) }
.bento .feat:nth-child(1) { grid-column:span 2; grid-row:span 2 }
.bento .feat:nth-child(2) { grid-column:span 2 }
.bento .feat:nth-child(3) { grid-column:span 1 }
.bento .feat:nth-child(4) { grid-column:span 1 }
.bento .feat:nth-child(5) { grid-column:span 2 }
.bento .feat:nth-child(6) { grid-column:span 1 }
.bento .feat:nth-child(7) { grid-column:span 1 }
.bento .feat:nth-child(8) { grid-column:span 2 }
.bento .feat:nth-child(9) { grid-column:span 1 }
.bento .feat:nth-child(10) { grid-column:span 1 }
.bento .feat:nth-child(11) { grid-column:span 2 }
.bento .feat:nth-child(12) { grid-column:span 1 }
.bento .feat:nth-child(13) { grid-column:span 1 }
.feat-head { display:flex; align-items:center; gap:12px; margin-bottom:14px }
.feat-icon {
  width:40px; height:40px; border-radius:10px;
  display:flex; align-items:center; justify-content:center;
  flex-shrink:0;
}
.feat-icon svg { width:20px; height:20px }
.feat-head h3 { font-size:16px; font-weight:700 }
.feat p { font-size:13px; color:var(--text-2); line-height:1.6 }
.feat-lg h3 { font-size:20px }
.feat-lg p { font-size:14px }

/* ─── TESTIMONIALS ─── */
.test-section { background:var(--bg-surface) }
.test-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:20px; margin-top:48px }
.test-card { background:var(--bg-card); border:1px solid var(--border); border-radius:12px; padding:28px 24px; position:relative }
.test-card::before { content:'\\201C'; font-size:48px; line-height:1; color:var(--accent); opacity:0.3; position:absolute; top:12px; left:20px; font-family:Georgia,serif }
.test-quote { font-size:15px; line-height:1.7; color:var(--text-secondary); margin-bottom:20px; padding-top:24px }
.test-author { display:flex; align-items:center; gap:12px }
.test-avatar { width:36px; height:36px; border-radius:50%; background:var(--accent-dim); display:flex; align-items:center; justify-content:center; font-size:14px; font-weight:600; color:var(--accent) }
.test-name { font-size:13px; font-weight:600; color:var(--text-primary) }
.test-role { font-size:12px; color:var(--text-muted) }
@media (max-width:768px) { .test-grid { grid-template-columns:1fr } }

/* ─── DASHBOARD PREVIEW ─── */
.dash-preview {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:16px;
  overflow:hidden;
  position:relative;
}
.dash-bar {
  display:flex; align-items:center; gap:8px;
  padding:14px 20px;
  border-bottom:1px solid var(--border);
  background:var(--bg-surface);
}
.dash-dot { width:10px; height:10px; border-radius:50% }
.dash-bar span { font-size:13px; color:var(--text-3); margin-left:12px; font-family:'JetBrains Mono',monospace }
.dash-body {
  display:grid;
  grid-template-columns:220px 1fr 260px;
  min-height:420px;
}
.dash-sidebar {
  border-right:1px solid var(--border);
  padding:20px 16px;
  background:rgba(6,10,20,0.5);
}
.dash-sidebar-item {
  display:flex; align-items:center; gap:10px;
  padding:10px 12px; border-radius:8px;
  font-size:13px; color:var(--text-2);
  margin-bottom:4px; transition:all 0.15s;
}
.dash-sidebar-item.active { background:var(--accent-dim); color:var(--accent) }
.dash-sidebar-item svg { width:16px; height:16px; flex-shrink:0 }
.dash-main { padding:24px }
.dash-main-title { font-size:18px; font-weight:700; margin-bottom:20px }
.dash-metrics {
  display:grid; grid-template-columns:repeat(3,1fr);
  gap:12px; margin-bottom:24px;
}
.dash-metric {
  background:var(--bg-surface);
  border:1px solid var(--border);
  border-radius:10px;
  padding:16px;
}
.dash-metric .dm-label { font-size:11px; color:var(--text-3); text-transform:uppercase; letter-spacing:0.06em; margin-bottom:6px }
.dash-metric .dm-val { font-size:24px; font-weight:800; color:var(--accent) }
.dash-metric .dm-delta { font-size:11px; color:var(--green); margin-top:4px }
.dash-chart {
  background:var(--bg-surface);
  border:1px solid var(--border);
  border-radius:10px;
  padding:20px;
  height:180px;
  position:relative;
  overflow:hidden;
}
.dash-chart-title { font-size:12px; font-weight:600; color:var(--text-2); margin-bottom:16px }
.dash-chart-line {
  position:absolute; bottom:20px; left:20px; right:20px;
  height:120px;
}
.dash-chart-line svg { width:100%; height:100% }
.dash-right {
  border-left:1px solid var(--border);
  padding:20px 16px;
  background:rgba(6,10,20,0.3);
}
.dash-right-title { font-size:12px; font-weight:600; color:var(--text-2); margin-bottom:16px }
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
.dash-status-row {
  display:flex; align-items:center; gap:8px;
  padding:8px 0; border-bottom:1px solid rgba(20,29,48,0.3);
  font-size:13px;
}
.dash-status-dot { width:8px; height:8px; border-radius:50%; flex-shrink:0 }

/* ─── CLI INTEGRATIONS ─── */
.cli-grid {
  display:grid;
  grid-template-columns:repeat(4,1fr);
  gap:16px;
}
.cli-card {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:14px;
  padding:24px;
  transition:all 0.25s;
  display:flex;
  flex-direction:column;
  align-items:center;
  text-align:center;
  gap:12px;
}
.cli-card:hover { border-color:var(--border-hover); transform:translateY(-4px); background:var(--bg-card-hover) }
.cli-icon {
  width:56px; height:56px; border-radius:14px;
  display:flex; align-items:center; justify-content:center;
}
.cli-icon svg { width:28px; height:28px }
.cli-card h4 { font-size:15px; font-weight:700 }
.cli-card p { font-size:12px; color:var(--text-3); line-height:1.5 }

/* ─── USE CASES ─── */
.uc-grid {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:16px;
}
.uc-card {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:14px;
  padding:32px 24px;
  transition:all 0.25s;
  position:relative;
  overflow:hidden;
}
.uc-card:hover { border-color:var(--border-hover); transform:translateY(-4px) }
.uc-card::after {
  content:'';
  position:absolute; bottom:0; left:0; right:0;
  height:3px;
  background:linear-gradient(90deg,var(--accent),var(--green));
  opacity:0; transition:opacity 0.3s;
}
.uc-card:hover::after { opacity:1 }
.uc-icon {
  width:44px; height:44px; border-radius:12px;
  display:flex; align-items:center; justify-content:center;
  margin-bottom:18px;
}
.uc-icon svg { width:22px; height:22px }
.uc-card h3 { font-size:16px; font-weight:700; margin-bottom:8px }
.uc-card p { font-size:13px; color:var(--text-2); line-height:1.6 }

/* ─── GET STARTED ─── */
.gs-box {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:20px;
  padding:64px 48px;
  position:relative;
  overflow:hidden;
}
.gs-box::before {
  content:'';
  position:absolute; top:-50%; left:-50%; width:200%; height:200%;
  background:conic-gradient(from 0deg,transparent,rgba(132,171,255,0.08),transparent 25%);
  animation:spin 15s linear infinite;
  pointer-events:none;
}
.gs-inner { position:relative; z-index:1 }
.gs-steps {
  display:grid;
  grid-template-columns:repeat(3,1fr);
  gap:24px;
  margin-top:40px;
}
.gs-step {
  text-align:center;
}
.gs-step-num {
  width:48px; height:48px; border-radius:50%;
  background:var(--accent-dim); color:var(--accent);
  display:flex; align-items:center; justify-content:center;
  font-weight:800; font-size:18px; margin:0 auto 14px;
  border:2px solid rgba(132,171,255,0.15);
}
.gs-step h4 { font-size:15px; font-weight:700; margin-bottom:6px }
.gs-step p { font-size:13px; color:var(--text-3) }
.cmd-block {
  display:flex; align-items:center; gap:12px;
  background:var(--bg-surface);
  border:1px solid var(--border);
  border-radius:12px;
  padding:16px 24px;
  font-family:'JetBrains Mono',monospace;
  font-size:15px;
  color:var(--accent);
  cursor:pointer;
  transition:all 0.2s;
  max-width:500px;
  margin:0 auto;
}
.cmd-block:hover { border-color:var(--accent); transform:translateY(-1px) }
.cmd-block .prompt { color:var(--text-3) }
.cmd-block svg { width:16px; height:16px; color:var(--text-3); flex-shrink:0; margin-left:auto }
.cmd-hint {
  text-align:center; font-size:13px; color:var(--text-3);
  margin-top:16px;
}
.cmd-hint strong { color:var(--accent) }

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
.footer-bottom a { color:var(--accent); text-decoration:none }

/* ─── MOBILE ─── */
@media(max-width:1024px) {
  .svc-grid { grid-template-columns:repeat(2,1fr) }
  .cli-grid { grid-template-columns:repeat(2,1fr) }
  .uc-grid { grid-template-columns:repeat(2,1fr) }
  .bento { grid-template-columns:repeat(2,1fr) }
  .bento .feat:nth-child(1) { grid-column:span 2; grid-row:span 1 }
  .bento .feat:nth-child(2) { grid-column:span 2 }
  .bento .feat:nth-child(5) { grid-column:span 2 }
  .bento .feat:nth-child(8) { grid-column:span 2 }
  .dash-body { grid-template-columns:1fr }
  .dash-sidebar, .dash-right { display:none }
  .footer-grid { grid-template-columns:repeat(2,1fr) }
  .how-track { grid-template-columns:1fr; gap:0 }
  .how-step { border-radius:0 !important }
  .how-step:first-child { border-radius:14px 14px 0 0 !important }
  .how-step:last-child { border-radius:0 0 14px 14px !important }
  .how-arrow { display:none }
}
@media(max-width:640px) {
  .wrap { padding:0 20px }
  section { padding:64px 0 }
  .hero { padding:120px 0 64px; min-height:auto }
  .hero h1 { font-size:36px !important }
  .hero-stats { flex-direction:column }
  .svc-grid { grid-template-columns:1fr }
  .cli-grid { grid-template-columns:repeat(2,1fr) }
  .uc-grid { grid-template-columns:1fr }
  .bento { grid-template-columns:1fr }
  .bento .feat:nth-child(n) { grid-column:span 1 !important; grid-row:span 1 !important }
  .gs-steps { grid-template-columns:1fr }
  .gs-box { padding:40px 24px }
  .footer-grid { grid-template-columns:1fr }
  .footer-bottom { flex-direction:column; gap:8px; text-align:center }
  .dash-metrics { grid-template-columns:1fr }
  .nav-links { display:none }
  .hero-actions { flex-direction:column }
  .btn-primary, .btn-secondary { width:100%; justify-content:center }
}
</style>
</head>
<body>

<!-- Noise texture -->
<svg class="noise" viewBox="0 0 256 256" xmlns="http://www.w3.org/2000/svg">
  <filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="4" stitchTiles="stitch"/></filter>
  <rect width="100%" height="100%" filter="url(#n)"/>
</svg>

<!-- NAV -->
<nav>
  <div class="nav-bar">
    <a href="#" class="nav-brand">
      <img src="/assets/8router-logo-dark.png" alt="8Router" class="nav-logo">
    </a>
    <div class="nav-links">
      <a href="#services">Services</a>
      <a href="#how">How It Works</a>
      <a href="#providers">Providers</a>
      <a href="#features">Features</a>
      <a href="/dashboard">Dashboard</a>
      <a href="#integrations">Integrations</a>
      <a href="#start" class="nav-cta">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
        Get Started
      </a>
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
        Open Source &middot; v0.4.0 &middot; 8Agents Ecosystem
      </div>
      <h1>
        One Router.<br>
        <span class="accent">Every AI Provider.</span><br>
        <span class="dim">Zero Downtime.</span>
      </h1>
      <p class="hero-sub">
        Connect every AI coding tool, agent, and app to a single local endpoint.
        9 service kinds, format translation, and smart 3-tier fallback across 20+ providers. Never hit a rate limit again.
      </p>
      <div class="hero-actions">
        <a href="#start" class="btn-primary">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="13 17 18 12 13 7"/><polyline points="6 17 11 12 6 7"/></svg>
          Get Started
        </a>
        <a href="/dashboard" class="btn-secondary" target="_blank">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>
          Open Dashboard
        </a>
      </div>
      <div class="hero-stats">
        <div class="stat-badge">
          <span class="stat-num">20+</span>
          <span class="stat-label">Providers</span>
        </div>
        <div class="stat-badge">
          <span class="stat-num">9</span>
          <span class="stat-label">Service Kinds</span>
        </div>
        <div class="stat-badge">
          <span class="stat-num">3</span>
          <span class="stat-label">Tier Fallback</span>
        </div>
        <div class="stat-badge">
          <span class="stat-num">20-65%</span>
          <span class="stat-label">Token Saver</span>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- SERVICES -->
<section id="services">
  <div class="wrap">
    <div class="s-label">Services</div>
    <div class="s-title">9 Services, One Gateway</div>
    <div class="s-desc">Route every AI workload through a single unified endpoint. No API juggling, no provider lock-in.</div>
    <div class="svc-grid">
      <div class="svc-card">
        <div class="svc-icon" style="background:var(--accent-dim);color:var(--accent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h3>Chat / LLM</h3>
        <p>Route chat completions across providers with automatic model selection and 3-tier fallback.</p>
      </div>
      <div class="svc-card">
        <div class="svc-icon" style="background:var(--green-dim);color:var(--green)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <h3>Embeddings</h3>
        <p>Vector embeddings from multiple providers with batching, caching, and dimension control.</p>
      </div>
      <div class="svc-card">
        <div class="svc-icon" style="background:var(--purple-dim);color:var(--purple)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>
        </div>
        <h3>Text-to-Speech</h3>
        <p>Natural voice synthesis from multiple TTS providers with streaming audio output.</p>
      </div>
      <div class="svc-card">
        <div class="svc-icon" style="background:var(--cyan-dim);color:var(--cyan)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </div>
        <h3>Speech-to-Text</h3>
        <p>Real-time audio transcription with Whisper-compatible endpoints and multi-language support.</p>
      </div>
      <div class="svc-card">
        <div class="svc-icon" style="background:var(--orange-dim);color:var(--orange)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><path d="M21 15l-5-5L5 21"/></svg>
        </div>
        <h3>Image Generation</h3>
        <p>Create images via DALL-E, Stable Diffusion, and other models through one unified API.</p>
      </div>
      <div class="svc-card">
        <div class="svc-icon" style="background:var(--accent-dim);color:var(--accent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>
        </div>
        <h3>Vision</h3>
        <p>Multimodal image understanding — send images to GPT-4V, Claude, Gemini and more.</p>
      </div>
      <div class="svc-card">
        <div class="svc-icon" style="background:var(--green-dim);color:var(--green)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
        </div>
        <h3>Web Search</h3>
        <p>Grounded AI responses with integrated web search across multiple search providers.</p>
      </div>
      <div class="svc-card">
        <div class="svc-icon" style="background:var(--purple-dim);color:var(--purple)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
        </div>
        <h3>Local Models</h3>
        <p>Route to Ollama, LM Studio, and vLLM for fully offline, private AI with zero API costs.</p>
      </div>
    </div>
  </div>
</section>

<!-- HOW IT WORKS -->
<section id="how" style="background:var(--bg-surface)">
  <div class="wrap">
    <div class="centered">
      <div class="s-label">How It Works</div>
      <div class="s-title">Five Steps to Zero Downtime</div>
      <div class="s-desc">Install once, connect your providers, and never think about rate limits again.</div>
    </div>
    <div class="how-track">
      <div class="how-step">
        <div class="how-num">1</div>
        <h4>Install</h4>
        <p>npm install -g 8router globally on your machine.</p>
        <div class="how-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>
      <div class="how-step">
        <div class="how-num">2</div>
        <h4>Connect Providers</h4>
        <p>Add API keys for your preferred providers. Format translation auto-detects OpenAI, Anthropic &amp; Gemini APIs.</p>
        <div class="how-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>
      <div class="how-step">
        <div class="how-num">3</div>
        <h4>Use One Endpoint</h4>
        <p>Point tools at localhost:8080/v1 — it speaks OpenAI, Anthropic &amp; Gemini API natively.</p>
        <div class="how-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>
      <div class="how-step">
        <div class="how-num">4</div>
        <h4>Auto Fallback</h4>
        <p>Free &rarr; Cheap &rarr; Premium routing kicks in on any failure.</p>
        <div class="how-arrow"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="9 18 15 12 9 6"/></svg></div>
      </div>
      <div class="how-step">
        <div class="how-num">5</div>
        <h4>Monitor Dashboard</h4>
        <p>Track usage, quotas, health, and costs in real time.</p>
      </div>
    </div>
  </div>
</section>

<!-- PROVIDERS -->
<section id="providers" class="prov-section">
  <div class="wrap">
    <div class="s-label">Providers</div>
    <div class="s-title">20+ Providers, 3 Tiers</div>
    <div class="s-desc">Subscription first, then cheap, then free/local. Automatic fallback ensures zero downtime.</div>

    <div class="prov-tier">
      <div class="prov-tier-head">
        <h3>Subscription <span class="prov-tag tag-premium" style="font-size:12px;padding:4px 12px;border-radius:8px;margin-left:8px">9 Providers</span></h3>
        <span class="prov-tag tag-premium">Tier 1</span>
      </div>
      <div class="prov-row">
        <div class="prov-pill"><div class="prov-icon" style="background:var(--accent-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>OpenAI <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--purple-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2"><path d="M22 2L11 13"/><path d="M22 2l-7 20-4-9-9-4 20-7z"/></svg></div>Anthropic <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--green-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg></div>Gemini <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--cyan-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg></div>xAI <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--orange-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M9.59 4.59A2 2 0 1 1 11 8H2m10.59 11.41A2 2 0 1 0 14 16H2m15.73-8.27A2.5 2.5 0 1 1 19.5 12H2"/></svg></div>Mistral <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--accent-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg></div>Cohere <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--cyan-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2"><path d="M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z"/></svg></div>Azure <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--green-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg></div>Vertex <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--orange-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg></div>Bedrock <span class="tag-active">Active</span></div>
      </div>
    </div>

    <div class="prov-tier">
      <div class="prov-tier-head">
        <h3>Cheap <span class="prov-tag tag-cheap" style="font-size:12px;padding:4px 12px;border-radius:8px;margin-left:8px">8 Providers</span></h3>
        <span class="prov-tag tag-cheap">Tier 2</span>
      </div>
      <div class="prov-row">
        <div class="prov-pill"><div class="prov-icon" style="background:var(--accent-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg></div>OpenRouter <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--cyan-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>DeepSeek <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--green-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/></svg></div>Together <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--orange-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg></div>Fireworks <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--green-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>Replicate <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--cyan-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg></div>Perplexity <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--purple-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>Cerebras <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--accent-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--accent)" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg></div>SambaNova <span class="tag-active">Active</span></div>
      </div>
    </div>

    <div class="prov-tier">
      <div class="prov-tier-head">
        <h3>Free / Local <span class="prov-tag tag-local" style="font-size:12px;padding:4px 12px;border-radius:8px;margin-left:8px">4 Providers</span></h3>
        <span class="prov-tag tag-local">Tier 3</span>
      </div>
      <div class="prov-row">
        <div class="prov-pill"><div class="prov-icon" style="background:var(--orange-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--orange)" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"/></svg></div>Groq <span class="tag-active">Active</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--green-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--green)" stroke-width="2"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="4"/></svg></div>Ollama <span class="tag-local">Local</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--purple-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--purple)" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg></div>LM Studio <span class="tag-local">Local</span></div>
        <div class="prov-pill"><div class="prov-icon" style="background:var(--cyan-dim)"><svg viewBox="0 0 24 24" fill="none" stroke="var(--cyan)" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg></div>vLLM <span class="tag-local">Local</span></div>
      </div>
    </div>
  </div>
</section>

<!-- FEATURES BENTO -->
<section id="features">
  <div class="wrap">
    <div class="centered">
      <div class="s-label">Features</div>
      <div class="s-title">Built for Power Users</div>
      <div class="s-desc">Everything you need to run AI workloads reliably, cheaply, and privately.</div>
    </div>
    <div class="bento">
      <div class="feat feat-lg">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--accent-dim);color:var(--accent)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
          </div>
          <h3>OpenAI-Compatible Endpoint</h3>
        </div>
        <p>Drop-in replacement. Point any OpenAI-compatible tool — Claude Code, Cursor, Codex, Continue — at localhost:8080/v1 &mdash; designed to work out of the box. Supports /v1/chat/completions, /v1/embeddings, /v1/images/generations, and more. Zero config changes needed in your existing tools.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--green-dim);color:var(--green)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          </div>
          <h3>Smart Fallback</h3>
        </div>
        <p>Automatic 3-tier failover: Premium &rarr; Cheap &rarr; Free/Local. Your code never sees an outage.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--orange-dim);color:var(--orange)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20"/></svg>
          </div>
          <h3>Token Saver</h3>
        </div>
        <p>RTK compression reduces token usage 20-65% with intelligent prompt optimization.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--accent-dim);color:var(--accent)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8m-4-4v4"/></svg>
          </div>
          <h3>Quota Dashboard</h3>
        </div>
        <p>Real-time usage tracking, cost breakdowns, and quota countdowns per provider.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--green-dim);color:var(--green)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <h3>Provider Health Check</h3>
        </div>
        <p>Continuous latency and uptime monitoring. Unhealthy providers are deprioritized automatically.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--purple-dim);color:var(--purple)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
          </div>
          <h3>Multi-Account Key Pool</h3>
        </div>
        <p>Round-robin across multiple API keys per provider with health tracking and automatic failover.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--cyan-dim);color:var(--cyan)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="8.5" cy="7" r="4"/><path d="M20 8v6m3-3h-6"/></svg>
          </div>
          <h3>Agent Presets <span class="tag-beta">Beta</span></h3>
        </div>
        <p>Pre-configured routing profiles for coding agents, chatbots, and specialized workloads.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--green-dim);color:var(--green)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
          </div>
          <h3>Privacy Mode <span class="tag-beta">Beta</span></h3>
        </div>
        <p>Route to local models only. Zero data leaves your machine when privacy mode is enabled.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--orange-dim);color:var(--orange)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/><path d="M9 12l2 2 4-4"/></svg>
          </div>
          <h3>Guardrails <span class="tag-beta">Beta</span></h3>
        </div>
        <p>Content filtering, output validation, and safety checks applied at the routing layer.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--cyan-dim);color:var(--cyan)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
          </div>
          <h3>Format Translator</h3>
        </div>
        <p>Auto-detect and translate between OpenAI, Anthropic, and Gemini API formats. Use any tool with any provider.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--green-dim);color:var(--green)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
          </div>
          <h3>9 Service Kinds</h3>
        </div>
        <p>Chat, Embeddings, TTS, STT, Image Gen, Vision, Web Search, Local Models &amp; more — one gateway.</p>
      </div>
      <div class="feat">
        <div class="feat-head">
          <div class="feat-icon" style="background:var(--orange-dim);color:var(--orange)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/></svg>
          </div>
          <h3>Web Search Providers</h3>
        </div>
        <p>Ground responses with Tavily, Brave, and Exa web search. Route to the cheapest available search API.</p>
      </div>
    </div>
  </div>
</section>

<!-- TESTIMONIALS -->
<section id="testimonials" class="test-section">
  <div class="wrap">
    <div class="centered">
      <div class="s-label">Testimonials</div>
      <div class="s-title">Developers Love 8Router</div>
      <div class="s-desc">Real feedback from teams running AI workloads through the gateway.</div>
    </div>
    <div class="test-grid">
      <div class="test-card">
        <p class="test-quote">The quota dashboard is incredibly satisfying to watch. I can see exactly where my tokens go and auto-switch saves me from hitting walls mid-session.</p>
        <div class="test-author">
          <div class="test-avatar">A</div>
          <div><div class="test-name">Andi S.</div><div class="test-role">Backend Engineer, Jakarta</div></div>
        </div>
      </div>
      <div class="test-card">
        <p class="test-quote">My team had 3 AI subscriptions. 8Router pools them all. We cut our per-seat cost by 60% and nobody even noticed the switch.</p>
        <div class="test-author">
          <div class="test-avatar">R</div>
          <div><div class="test-name">Raka P.</div><div class="test-role">CTO, SaaS Startup</div></div>
        </div>
      </div>
      <div class="test-card">
        <p class="test-quote">Install once, forget rate limits forever. The 3-tier fallback is genuinely invisible — I only notice it when I check the logs and see the handoffs.</p>
        <div class="test-author">
          <div class="test-avatar">M</div>
          <div><div class="test-name">Maya T.</div><div class="test-role">AI/ML Engineer</div></div>
        </div>
      </div>
      <div class="test-card">
        <p class="test-quote">Quota countdown plus auto-switch should be in every AI tool. I don't understand why nobody else does this. 8Router just works.</p>
        <div class="test-author">
          <div class="test-avatar">D</div>
          <div><div class="test-name">Dimas W.</div><div class="test-role">Fullstack Developer</div></div>
        </div>
      </div>
      <div class="test-card">
        <p class="test-quote">Finally no more rate-limit errors at 2am. Groq goes down, Mistral picks up. Mistral quota hits, OpenRouter takes over. Beautiful.</p>
        <div class="test-author">
          <div class="test-avatar">K</div>
          <div><div class="test-name">Kevin L.</div><div class="test-role">Indie Developer</div></div>
        </div>
      </div>
      <div class="test-card">
        <p class="test-quote">npm install -g 8router and you're done. I pointed Cursor at localhost:8080/v1 and everything just worked. Zero config friction.</p>
        <div class="test-author">
          <div class="test-avatar">S</div>
          <div><div class="test-name">Sarah N.</div><div class="test-role">Frontend Lead</div></div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- DASHBOARD PREVIEW -->
<section id="dashboard" style="background:var(--bg-surface)">
  <div class="wrap">
    <div class="centered">
      <div class="s-label">Dashboard</div>
      <div class="s-title">Your AI Command Center</div>
      <div class="s-desc">Real-time visibility into every request, provider, and quota across your fleet.</div>
    </div>
    <div class="dash-preview">
      <div class="dash-bar">
        <div class="dash-dot" style="background:#ff5f57"></div>
        <div class="dash-dot" style="background:#febc2e"></div>
        <div class="dash-dot" style="background:#28c840"></div>
        <span>8router dashboard &mdash; localhost:8080/8router</span>
      </div>
      <div class="dash-body">
        <div class="dash-sidebar">
          <div class="dash-sidebar-item active">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="7" height="7"/><rect x="14" y="3" width="7" height="7"/><rect x="14" y="14" width="7" height="7"/><rect x="3" y="14" width="7" height="7"/></svg>
            Overview
          </div>
          <div class="dash-sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>
            Requests
          </div>
          <div class="dash-sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20"/></svg>
            Providers
          </div>
          <div class="dash-sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
            API Keys
          </div>
          <div class="dash-sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10m6 10V4M6 20v-4"/></svg>
            Tokens
          </div>
          <div class="dash-sidebar-item">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>
            Settings
          </div>
        </div>
        <div class="dash-main">
          <div class="dash-main-title">Request Overview</div>
          <div class="dash-metrics">
            <div class="dash-metric">
              <div class="dm-label">Total Requests</div>
              <div class="dm-val" id="dm-total">24,891</div>
              <div class="dm-delta">+12.4% this week</div>
            </div>
            <div class="dash-metric">
              <div class="dm-label">Tokens Saved</div>
              <div class="dm-val" id="dm-tokens">1.2M</div>
              <div class="dm-delta">40.2% compression</div>
            </div>
            <div class="dash-metric">
              <div class="dm-label">Avg Latency</div>
              <div class="dm-val" id="dm-latency">142ms</div>
              <div class="dm-delta">-18ms vs last week</div>
            </div>
          </div>
          <div class="dash-chart">
            <div class="dash-chart-title">Requests / hour (24h)</div>
            <div class="dash-chart-line">
              <svg viewBox="0 0 600 120" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="cg" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stop-color="var(--accent)" stop-opacity="0.3"/>
                    <stop offset="100%" stop-color="var(--accent)" stop-opacity="0"/>
                  </linearGradient>
                </defs>
                <path d="M0,100 Q30,90 60,85 T120,70 T180,80 T240,45 T300,50 T360,30 T420,55 T480,20 T540,35 T600,15 L600,120 L0,120Z" fill="url(#cg)"/>
                <path d="M0,100 Q30,90 60,85 T120,70 T180,80 T240,45 T300,50 T360,30 T420,55 T480,20 T540,35 T600,15" fill="none" stroke="var(--accent)" stroke-width="2"/>
              </svg>
            </div>
          </div>
        </div>
        <div class="dash-right">
          <div class="dash-right-title">Provider Health</div>
          <div class="dash-provider-bar">
            <div class="dpb-head"><span class="dpb-name">OpenAI</span><span class="dpb-pct">34%</span></div>
            <div class="dpb-track"><div class="dpb-fill" style="width:34%;background:var(--accent)"></div></div>
          </div>
          <div class="dash-provider-bar">
            <div class="dpb-head"><span class="dpb-name">Anthropic</span><span class="dpb-pct">28%</span></div>
            <div class="dpb-track"><div class="dpb-fill" style="width:28%;background:var(--purple)"></div></div>
          </div>
          <div class="dash-provider-bar">
            <div class="dpb-head"><span class="dpb-name">DeepSeek</span><span class="dpb-pct">22%</span></div>
            <div class="dpb-track"><div class="dpb-fill" style="width:22%;background:var(--orange)"></div></div>
          </div>
          <div class="dash-provider-bar">
            <div class="dpb-head"><span class="dpb-name">Groq</span><span class="dpb-pct">16%</span></div>
            <div class="dpb-track"><div class="dpb-fill" style="width:16%;background:var(--green)"></div></div>
          </div>
          <div class="dash-right-title" style="margin-top:24px">Status</div>
          <div class="dash-status-row"><div class="dash-status-dot" style="background:var(--green)"></div> OpenAI — 23ms</div>
          <div class="dash-status-row"><div class="dash-status-dot" style="background:var(--green)"></div> Anthropic — 45ms</div>
          <div class="dash-status-row"><div class="dash-status-dot" style="background:var(--green)"></div> DeepSeek — 89ms</div>
          <div class="dash-status-row"><div class="dash-status-dot" style="background:var(--orange)"></div> Groq — 180ms</div>
          <div class="dash-status-row"><div class="dash-status-dot" style="background:var(--green)"></div> Ollama — 12ms</div>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- CLI INTEGRATIONS -->
<section id="integrations">
  <div class="wrap">
    <div class="centered">
      <div class="s-label">Integrations</div>
      <div class="s-title">Works With Every AI Tool</div>
      <div class="s-desc">Drop-in OpenAI-compatible API. Point any CLI tool at localhost:8080/v1 and start coding.</div>
    </div>
    <div class="cli-grid">
      <div class="cli-card">
        <div class="cli-icon" style="background:var(--accent-dim);color:var(--accent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5"/></svg>
        </div>
        <h4>Claude Code</h4>
        <p>Anthropic's CLI coding agent</p>
      </div>
      <div class="cli-card">
        <div class="cli-icon" style="background:var(--green-dim);color:var(--green)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/></svg>
        </div>
        <h4>Codex</h4>
        <p>OpenAI's CLI code assistant</p>
      </div>
      <div class="cli-card">
        <div class="cli-icon" style="background:var(--cyan-dim);color:var(--cyan)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" y1="14" x2="21" y2="3"/></svg>
        </div>
        <h4>Cline</h4>
        <p>VS Code autonomous coding agent</p>
      </div>
      <div class="cli-card">
        <div class="cli-icon" style="background:var(--purple-dim);color:var(--purple)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>
        </div>
        <h4>Cursor</h4>
        <p>AI-first code editor</p>
      </div>
      <div class="cli-card">
        <div class="cli-icon" style="background:var(--orange-dim);color:var(--orange)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 20V10m6 10V4M6 20v-4"/></svg>
        </div>
        <h4>Continue</h4>
        <p>VS Code / JetBrains AI autocomplete</p>
      </div>
      <div class="cli-card">
        <div class="cli-icon" style="background:var(--green-dim);color:var(--green)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>
        </div>
        <h4>Roo Code</h4>
        <p>Agentic coding assistant</p>
      </div>
      <div class="cli-card">
        <div class="cli-icon" style="background:var(--accent-dim);color:var(--accent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><path d="M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/></svg>
        </div>
        <h4>OpenWebUI</h4>
        <p>Self-hosted ChatGPT interface</p>
      </div>
      <div class="cli-card">
        <div class="cli-icon" style="background:var(--purple-dim);color:var(--purple)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h4>Hermes</h4>
        <p>8Agents AI agent</p>
      </div>
    </div>
  </div>
</section>

<!-- USE CASES -->
<section style="background:var(--bg-surface)">
  <div class="wrap">
    <div class="centered">
      <div class="s-label">Use Cases</div>
      <div class="s-title">One Router, Infinite Possibilities</div>
      <div class="s-desc">From coding agents to customer service bots — 8Router powers them all.</div>
    </div>
    <div class="uc-grid">
      <div class="uc-card">
        <div class="uc-icon" style="background:var(--accent-dim);color:var(--accent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="16 18 22 12 16 6"/><polyline points="8 6 2 12 8 18"/></svg>
        </div>
        <h3>AI Coding Tools</h3>
        <p>Power Claude Code, Cursor, Codex, and Continue with zero-downtime routing. Never lose a coding session to a rate limit.</p>
      </div>
      <div class="uc-card">
        <div class="uc-icon" style="background:var(--green-dim);color:var(--green)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>
        </div>
        <h3>AI Customer Service</h3>
        <p>Route customer support bots through the cheapest available provider. Auto-scale with fallback when demand spikes.</p>
      </div>
      <div class="uc-card">
        <div class="uc-icon" style="background:var(--cyan-dim);color:var(--cyan)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"/></svg>
        </div>
        <h3>Telegram & WhatsApp Agents</h3>
        <p>Build always-on chat agents that never go down. 8Router keeps your bots responsive 24/7 across every provider.</p>
      </div>
      <div class="uc-card">
        <div class="uc-icon" style="background:var(--purple-dim);color:var(--purple)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
        </div>
        <h3>VTuber AI</h3>
        <p>Power live VTuber characters with TTS, chat, and vision AI. Route to local models for zero-latency streaming.</p>
      </div>
      <div class="uc-card">
        <div class="uc-icon" style="background:var(--orange-dim);color:var(--orange)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2"/><rect x="2" y="14" width="20" height="8" rx="2"/><line x1="6" y1="6" x2="6.01" y2="6"/><line x1="6" y1="18" x2="6.01" y2="18"/></svg>
        </div>
        <h3>Local AI Stack</h3>
        <p>Run Ollama + LM Studio + vLLM through one endpoint. Keep all data on your machine with privacy mode.</p>
      </div>
      <div class="uc-card">
        <div class="uc-icon" style="background:var(--accent-dim);color:var(--accent)">
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"/><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"/></svg>
        </div>
        <h3>SaaS AI Backend</h3>
        <p>Embed 8Router as your AI gateway. Multi-tenant API key management, usage tracking, and cost optimization built in.</p>
      </div>
    </div>
  </div>
</section>

<!-- GET STARTED -->
<section id="start">
  <div class="wrap">
    <div class="gs-box">
      <div class="gs-inner centered">
        <div class="s-label">Get Started</div>
        <div class="s-title">Up and Running in 60 Seconds</div>
        <div class="s-desc" style="margin-left:auto;margin-right:auto">Install globally, run the server, and point your tools at localhost:8080/v1. That's it.</div>
        <div class="cmd-block" onclick="navigator.clipboard.writeText('npm install -g 8router')">
          <span class="prompt">$</span> npm install -g 8router
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        </div>
        <div class="gs-steps">
          <div class="gs-step">
            <div class="gs-step-num">1</div>
            <h4>Install</h4>
            <p>npm install -g 8router</p>
          </div>
          <div class="gs-step">
            <div class="gs-step-num">2</div>
            <h4>Run</h4>
            <p>8router</p>
          </div>
          <div class="gs-step">
            <div class="gs-step-num">3</div>
            <h4>Connect</h4>
            <p>Point tools at localhost:8080/v1</p>
          </div>
        </div>
        <div class="cmd-hint">
          API live at <strong>localhost:8080/v1</strong> &middot; Dashboard at <strong>localhost:8080/8router</strong>
        </div>
      </div>
    </div>
  </div>
</section>

<!-- FOOTER -->
<footer>
  <div class="wrap">
    <div class="footer-grid">
      <div class="footer-brand">
        <a href="#" class="nav-brand">
          <img src="/assets/8router-logo-dark.png" alt="8Router" class="nav-logo">
        </a>
        <p>The AI Routing Gateway for the 8Agents Ecosystem. One endpoint, every provider, zero downtime.</p>
      </div>
      <div class="footer-col">
        <h4>Product</h4>
        <a href="#features">Features</a>
        <a href="#providers">Providers</a>
        <a href="/dashboard">Dashboard</a>
        <a href="#integrations">Integrations</a>
        <a href="#start">Get Started</a>
      </div>
      <div class="footer-col">
        <h4>8Agents Ecosystem</h4>
        <a href="#">8Router</a>
        <a href="#">8Flow</a>
        <a href="#">8Agents</a>
        <a href="#">8Chat</a>
        <a href="#">8Search</a>
      </div>
      <div class="footer-col">
        <h4>Resources</h4>
        <a href="#">Documentation</a>
        <a href="#">GitHub</a>
        <a href="#">Changelog</a>
        <a href="#">Status</a>
      </div>
    </div>
    <div class="footer-bottom">
      <span>8Router v0.4.0 &mdash; Built for the 8Agents Ecosystem</span>
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
  document.querySelectorAll('.svc-card,.feat,.cli-card,.uc-card,.prov-pill,.how-step,.gs-step').forEach(function(el){
    el.style.opacity='0';
    el.style.transform='translateY(20px)';
    obs.observe(el);
  });
})();

// Animated counter for hero stats
(function(){
  var els=document.querySelectorAll('.stat-num');
  var obs=new IntersectionObserver(function(entries){
    entries.forEach(function(e){
      if(e.isIntersecting){
        var el=e.target;
        var text=el.textContent;
        var num=parseFloat(text);
        var suffix=text.replace(/[\d.]/g,'');
        var isFloat=text.includes('.');
        var dur=1500;
        var start=null;
        function step(ts){
          if(!start)start=ts;
          var p=Math.min((ts-start)/dur,1);
          var val=isFloat?(p*num).toFixed(1):Math.floor(p*num);
          el.textContent=val+suffix;
          if(p<1)requestAnimationFrame(step);
        }
        requestAnimationFrame(step);
        obs.unobserve(el);
      }
    });
  },{threshold:0.5});
  els.forEach(function(el){obs.observe(el)});

  // Float animation on stat badges
  document.querySelectorAll('.stat-badge').forEach(function(el,i){
    el.style.animation='float '+(3+i*0.5)+'s ease-in-out infinite '+i*0.3+'s';
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
