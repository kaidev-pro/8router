// 8Router — OAuth Login Page

import type { OAuthProviderImpl } from './provider.js';
import type { OAuthConfig } from './config.js';

export function getLoginPageHTML(providers: OAuthProviderImpl[], config: OAuthConfig): string {
  const providerButtons = providers.map(p => {
    const icon = p.id === 'google' ? googleIcon() : githubIcon();
    const color = p.id === 'google' ? '#4285f4' : '#333';
    const hoverColor = p.id === 'google' ? '#3367d6' : '#222';
    return `<a href="/auth/${p.id}" class="oauth-btn" style="--btn-color:${color};--btn-hover:${hoverColor}">
      ${icon}
      <span>Continue with ${p.name}</span>
    </a>`;
  }).join('\n      ');

  const providerCount = providers.length;
  const providerNames = providers.map(p => p.name).join(' & ');

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>8Router — Login</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body {
      background: #0a0a0f;
      color: #e2e8f0;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
    }
    .login-container {
      width: 100%;
      max-width: 400px;
      padding: 48px 32px;
      background: #111118;
      border: 1px solid #1e1e2e;
      border-radius: 16px;
      text-align: center;
    }
    .logo {
      width: 48px;
      height: 48px;
      margin: 0 auto 24px;
    }
    h1 {
      font-size: 24px;
      font-weight: 600;
      margin-bottom: 8px;
      color: #f1f5f9;
    }
    .subtitle {
      font-size: 14px;
      color: #64748b;
      margin-bottom: 32px;
    }
    .oauth-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 12px;
      width: 100%;
      padding: 14px 20px;
      margin-bottom: 12px;
      background: var(--btn-color);
      color: #fff;
      border: none;
      border-radius: 10px;
      font-size: 15px;
      font-weight: 500;
      cursor: pointer;
      text-decoration: none;
      transition: background 0.2s, transform 0.1s;
    }
    .oauth-btn:hover {
      background: var(--btn-hover);
      transform: translateY(-1px);
    }
    .oauth-btn:active {
      transform: translateY(0);
    }
    .oauth-btn svg {
      width: 20px;
      height: 20px;
      flex-shrink: 0;
    }
    .info {
      margin-top: 24px;
      font-size: 12px;
      color: #475569;
      line-height: 1.5;
    }
    .info code {
      background: #1e1e2e;
      padding: 2px 6px;
      border-radius: 4px;
      font-size: 11px;
    }
  </style>
</head>
<body>
  <div class="login-container">
    <div class="logo">
      <svg viewBox="0 0 48 48" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect width="48" height="48" rx="12" fill="#3b82f6"/>
        <path d="M14 20l6-6 6 6M14 28l6 6 6-6" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>
        <circle cx="32" cy="16" r="3" fill="white"/>
        <circle cx="32" cy="32" r="3" fill="white"/>
      </svg>
    </div>
    <h1>Sign in to 8Router</h1>
    <p class="subtitle">Access the dashboard and manage your AI routing gateway</p>

    <div class="oauth-buttons">
      ${providerButtons}
    </div>

    ${providerCount === 0 ? '<p class="info">No OAuth providers configured.<br>Set <code>OAUTH_PROVIDER</code> in your config.</p>' : ''}
    ${config.allowedEmails.length > 0 || config.allowedDomains.length > 0
      ? `<p class="info">Access restricted to authorized accounts only.</p>`
      : `<p class="info">Any ${providerNames} account can sign in.<br>Configure <code>allowedEmails</code> or <code>allowedDomains</code> to restrict access.</p>`
    }
  </div>
</body>
</html>`;
}

function googleIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 01-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>`;
}

function githubIcon(): string {
  return `<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.477 2 2 6.484 2 12.017c0 4.425 2.865 8.18 6.839 9.504.5.092.682-.217.682-.483 0-.237-.008-.868-.013-1.703-2.782.605-3.369-1.343-3.369-1.343-.454-1.158-1.11-1.466-1.11-1.466-.908-.62.069-.608.069-.608 1.003.07 1.531 1.032 1.531 1.032.892 1.53 2.341 1.088 2.91.832.092-.647.35-1.088.636-1.338-2.22-.253-4.555-1.113-4.555-4.951 0-1.093.39-1.988 1.029-2.688-.103-.253-.446-1.272.098-2.65 0 0 .84-.27 2.75 1.026A9.564 9.564 0 0112 6.844c.85.004 1.705.115 2.504.337 1.909-1.296 2.747-1.027 2.747-1.027.546 1.379.202 2.398.1 2.651.64.7 1.028 1.595 1.028 2.688 0 3.848-2.339 4.695-4.566 4.943.359.309.678.92.678 1.855 0 1.338-.012 2.419-.012 2.747 0 .268.18.58.688.482A10.019 10.019 0 0022 12.017C22 6.484 17.522 2 12 2z"/></svg>`;
}
