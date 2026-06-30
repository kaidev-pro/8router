// 8Router — Setup Guide Page
export function getSetupGuideHTML(): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>8Router — Setup Guide</title>
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

body::before {
  content:''; position:fixed; inset:0; z-index:0; pointer-events:none;
  background:
    repeating-linear-gradient(0deg,transparent,transparent 59px,rgba(20,29,48,0.4) 59px,rgba(20,29,48,0.4) 60px),
    repeating-linear-gradient(90deg,transparent,transparent 59px,rgba(20,29,48,0.4) 59px,rgba(20,29,48,0.4) 60px);
}

.wrap { max-width:960px; margin:0 auto; padding:0 32px; position:relative; z-index:1 }

/* Header */
header {
  padding:48px 0 16px;
  border-bottom:1px solid var(--border);
  margin-bottom:48px;
}
header a {
  color:var(--accent); text-decoration:none; font-size:13px; font-weight:500;
  display:inline-flex; align-items:center; gap:6px; margin-bottom:20px;
}
header a:hover { text-decoration:underline }
header h1 {
  font-size:clamp(28px,4vw,42px);
  font-weight:800; letter-spacing:-0.03em; line-height:1.15;
}
header h1 .accent { color:var(--accent) }
header p {
  font-size:15px; color:var(--text-2); margin-top:12px; max-width:560px; line-height:1.6;
}

/* Sections */
.section {
  background:var(--bg-card);
  border:1px solid var(--border);
  border-radius:14px;
  padding:32px;
  margin-bottom:20px;
  transition:border-color 0.2s;
  position:relative;
  overflow:hidden;
}
.section::before {
  content:'';
  position:absolute; top:0; left:0; right:0;
  height:2px;
  background:linear-gradient(90deg,transparent,var(--accent),transparent);
  opacity:0; transition:opacity 0.3s;
}
.section:hover { border-color:var(--border-hover) }
.section:hover::before { opacity:1 }

.section-head {
  display:flex; align-items:center; gap:14px; margin-bottom:6px;
}
.section-icon {
  width:40px; height:40px; border-radius:10px;
  background:var(--accent-dim); color:var(--accent);
  display:flex; align-items:center; justify-content:center;
  font-size:18px; font-weight:700; flex-shrink:0;
}
.section-head h2 { font-size:18px; font-weight:700 }
.section-subtitle {
  font-size:13px; color:var(--text-3); margin-bottom:20px;
  padding-left:54px;
}

/* Code blocks */
.code-block {
  background:var(--bg-surface);
  border:1px solid var(--border);
  border-radius:10px;
  position:relative;
  overflow:hidden;
}
.code-block pre {
  padding:16px 20px;
  font-family:'JetBrains Mono',monospace;
  font-size:13px;
  line-height:1.7;
  color:var(--text);
  overflow-x:auto;
  white-space:pre-wrap;
  word-break:break-all;
}
.code-block .copy-btn {
  position:absolute; top:8px; right:8px;
  background:var(--bg-card);
  border:1px solid var(--border);
  color:var(--text-2);
  padding:6px 12px;
  border-radius:6px;
  font-family:'Inter',sans-serif;
  font-size:11px;
  font-weight:600;
  cursor:pointer;
  transition:all 0.15s;
  display:flex; align-items:center; gap:5px;
}
.code-block .copy-btn:hover {
  border-color:var(--accent);
  color:var(--accent);
  background:var(--accent-dim);
}
.code-block .copy-btn.copied {
  border-color:var(--green);
  color:var(--green);
  background:var(--green-dim);
}

/* Field rows */
.field-row {
  display:flex; align-items:center; gap:12px;
  padding:10px 16px;
  background:var(--bg-surface);
  border:1px solid var(--border);
  border-radius:8px;
  margin-bottom:8px;
}
.field-label {
  font-size:12px; color:var(--text-3);
  font-weight:600; text-transform:uppercase;
  letter-spacing:0.06em;
  min-width:80px; flex-shrink:0;
}
.field-value {
  font-family:'JetBrains Mono',monospace;
  font-size:13px; color:var(--accent);
  flex:1;
}
.field-row .copy-btn {
  background:var(--bg-card);
  border:1px solid var(--border);
  color:var(--text-2);
  padding:4px 10px;
  border-radius:5px;
  font-family:'Inter',sans-serif;
  font-size:10px;
  font-weight:600;
  cursor:pointer;
  transition:all 0.15s;
  flex-shrink:0;
}
.field-row .copy-btn:hover {
  border-color:var(--accent);
  color:var(--accent);
}
.field-row .copy-btn.copied {
  border-color:var(--green);
  color:var(--green);
}

/* Steps note */
.step-note {
  font-size:13px; color:var(--text-2); margin-bottom:16px;
  padding-left:54px;
}
.step-note code {
  font-family:'JetBrains Mono',monospace;
  font-size:12px;
  background:var(--accent-dim);
  color:var(--accent);
  padding:2px 6px;
  border-radius:4px;
}

/* Footer */
footer {
  text-align:center; padding:48px 0; color:var(--text-3); font-size:13px;
  border-top:1px solid var(--border); margin-top:48px;
}
footer a { color:var(--accent); text-decoration:none }
footer a:hover { text-decoration:underline }

.warning-box { background: rgba(255,101,104,0.1); border: 1px solid #ff6568; border-radius: 8px; padding: 16px 20px; margin-bottom: 24px; }
.warning-box h3 { color: #ff6568; margin-bottom: 8px; }
.warning-box p { color: #e0e0e0; }

/* Responsive */
@media (max-width:640px) {
  .wrap { padding:0 20px }
  .section { padding:24px 20px }
  .section-subtitle, .step-note { padding-left:0 }
  .field-row { flex-direction:column; align-items:flex-start; gap:6px }
  .field-row .copy-btn { align-self:flex-end }
}
</style>
</head>
<body>
<div class="wrap">

<header>
  <a href="/8router">← Back to 8Router</a>
  <h1><span class="accent">8Router</span> Setup Guide</h1>
  <p>Connect your favorite AI tools to 8Router in seconds. Copy the configuration below and you're ready to go.</p>
</header>

<div class="warning-box">
  <h3>⚠️ Security Notice</h3>
  <p>If deploying publicly, set <code>AUTH_REQUIRED=true</code> and configure an API key. Public access without authentication exposes your provider API keys.</p>
</div>

<!-- Cursor -->
<div class="section">
  <div class="section-head">
    <div class="section-icon">⌘</div>
    <h2>Cursor</h2>
  </div>
  <div class="step-note">Settings → Models → Add OpenAI API</div>
  <div class="field-row">
    <span class="field-label">Base URL</span>
    <span class="field-value">http://localhost:8080/v1</span>
    <button class="copy-btn" onclick="copyText('http://localhost:8080/v1',this)">Copy</button>
  </div>
  <div class="field-row">
    <span class="field-label">API Key</span>
    <span class="field-value">sk-8router</span>
    <button class="copy-btn" onclick="copyText('sk-8router',this)">Copy</button>
  </div>
</div>

<!-- Cline / Roo Code -->
<div class="section">
  <div class="section-head">
    <div class="section-icon">⟩</div>
    <h2>Cline / Roo Code</h2>
  </div>
  <div class="step-note">OpenAI Compatible provider</div>
  <div class="field-row">
    <span class="field-label">Base URL</span>
    <span class="field-value">http://localhost:8080/v1</span>
    <button class="copy-btn" onclick="copyText('http://localhost:8080/v1',this)">Copy</button>
  </div>
  <div class="field-row">
    <span class="field-label">API Key</span>
    <span class="field-value">sk-8router</span>
    <button class="copy-btn" onclick="copyText('sk-8router',this)">Copy</button>
  </div>
  <div class="field-row">
    <span class="field-label">Model</span>
    <span class="field-value">llama-3.3-70b-versatile</span>
    <button class="copy-btn" onclick="copyText('llama-3.3-70b-versatile',this)">Copy</button>
  </div>
</div>

<!-- Continue.dev -->
<div class="section">
  <div class="section-head">
    <div class="section-icon">▶</div>
    <h2>Continue.dev</h2>
  </div>
  <div class="step-note">Add to your <code>config.json</code></div>
  <div class="code-block">
    <button class="copy-btn" onclick="copyText(document.getElementById('continue-config').textContent,this)">Copy</button>
    <pre id="continue-config">{
  "models": [
    {
      "title": "8Router",
      "provider": "openai",
      "model": "llama-3.3-70b-versatile",
      "apiBase": "http://localhost:8080/v1",
      "apiKey": "sk-8router"
    }
  ]
}</pre>
  </div>
</div>

<!-- Open WebUI -->
<div class="section">
  <div class="section-head">
    <div class="section-icon">🌐</div>
    <h2>Open WebUI</h2>
  </div>
  <div class="step-note">Settings → Connections</div>
  <div class="field-row">
    <span class="field-label">OpenAI API</span>
    <span class="field-value">http://localhost:8080/v1</span>
    <button class="copy-btn" onclick="copyText('http://localhost:8080/v1',this)">Copy</button>
  </div>
  <div class="field-row">
    <span class="field-label">API Key</span>
    <span class="field-value">sk-8router</span>
    <button class="copy-btn" onclick="copyText('sk-8router',this)">Copy</button>
  </div>
</div>

<!-- Claude Code -->
<div class="section">
  <div class="section-head">
    <div class="section-icon">◈</div>
    <h2>Claude Code</h2>
  </div>
  <div class="step-note">Run in terminal</div>
  <div class="code-block">
    <button class="copy-btn" onclick="copyText('ANTHROPIC_BASE_URL=http://localhost:8080 claude',this)">Copy</button>
    <pre>ANTHROPIC_BASE_URL=http://localhost:8080 claude</pre>
  </div>
</div>

<!-- Codex CLI -->
<div class="section">
  <div class="section-head">
    <div class="section-icon">$</div>
    <h2>Codex CLI</h2>
  </div>
  <div class="step-note">Run in terminal</div>
  <div class="code-block">
    <button class="copy-btn" onclick="copyText('OPENAI_BASE_URL=http://localhost:8080/v1 codex',this)">Copy</button>
    <pre>OPENAI_BASE_URL=http://localhost:8080/v1 codex</pre>
  </div>
</div>

<!-- Generic curl -->
<div class="section">
  <div class="section-head">
    <div class="section-icon">⟐</div>
    <h2>Generic curl</h2>
  </div>
  <div class="step-note">Test with any HTTP client</div>
  <div class="code-block">
    <button class="copy-btn" onclick="copyText(document.getElementById('curl-cmd').textContent,this)">Copy</button>
    <pre id="curl-cmd">curl http://localhost:8080/v1/chat/completions \\
  -H 'Content-Type: application/json' \\
  -d '{
    "model": "llama-3.3-70b-versatile",
    "messages": [{"role": "user", "content": "Hello"}]
  }'</pre>
  </div>
</div>

<footer>
  <a href="/8router">8Router</a> — One Router. Every AI Provider. Zero Downtime.
</footer>

</div>

<script>
async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
  } catch {
    // Fallback
    const ta = document.createElement('textarea');
    ta.value = text; ta.style.position = 'fixed'; ta.style.opacity = '0';
    document.body.appendChild(ta); ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    const orig = btn.textContent;
    btn.textContent = 'Copied!';
    btn.classList.add('copied');
    setTimeout(() => { btn.textContent = orig; btn.classList.remove('copied'); }, 2000);
  }
}
</script>
</body>
</html>`;
}
