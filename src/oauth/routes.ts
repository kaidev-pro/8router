// 8Router — OAuth Routes
// /auth/login, /auth/logout, /auth/me, /auth/google, /auth/github, callbacks

import { Router, Request, Response } from 'express';
import type { OAuthConfig } from './config.js';
import type { SessionManager } from './session.js';
import type { OAuthProviderImpl, OAuthUser } from './provider.js';
import { GoogleOAuthProvider } from './providers/google.js';
import { GitHubOAuthProvider } from './providers/github.js';
import { generateState, signState, verifyState } from './session.js';
import { getLoginPageHTML } from './login-page.js';
import { getLocale } from '../i18n/locale.js';

// Temporary state storage (in-memory, short-lived)
const pendingStates = new Map<string, { provider: string; createdAt: number }>();
const STATE_MAX_AGE_MS = 10 * 60 * 1000; // 10 minutes

// Cleanup expired states every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [state, data] of pendingStates) {
    if (now - data.createdAt > STATE_MAX_AGE_MS) {
      pendingStates.delete(state);
    }
  }
}, 5 * 60 * 1000);

export function createAuthRoutes(config: OAuthConfig, sessionManager: SessionManager): Router {
  const router = Router();
  const isSecure = false; // Will be determined by request context

  // Get OAuth providers based on config
  function getProviders(): OAuthProviderImpl[] {
    const providers: OAuthProviderImpl[] = [];
    if ((config.provider === 'google' || config.provider === 'both') && config.google.clientId) {
      providers.push(new GoogleOAuthProvider(config.google.clientId, config.google.clientSecret));
    }
    if ((config.provider === 'github' || config.provider === 'both') && config.github.clientId) {
      providers.push(new GitHubOAuthProvider(config.github.clientId, config.github.clientSecret));
    }
    return providers;
  }

  // ─── GET /auth/login ───
  router.get('/auth/login', (_req: Request, res: Response) => {
    if (!config.enabled) {
      return res.redirect('/8router/dashboard');
    }

    const providers = getProviders();
    const locale = getLocale(_req);
    const html = getLoginPageHTML(providers, config, locale);
    res.type('html').send(html);
  });

  // ─── GET /auth/logout ───
  router.get('/auth/logout', (_req: Request, res: Response) => {
    res.setHeader('Set-Cookie', sessionManager.getClearCookieHeader());
    res.redirect('/8router/');
  });

  // ─── GET /auth/me ───
  router.get('/auth/me', (req: Request, res: Response) => {
    if (req.session) {
      return res.json({
        authenticated: true,
        user: {
          email: req.session.email,
          name: req.session.name,
          avatar: req.session.avatar,
          provider: req.session.provider,
        },
      });
    }
    return res.json({ authenticated: false });
  });

  // ─── GET /auth/google ───
  router.get('/auth/google', (req: Request, res: Response) => {
    if (!config.enabled) return res.redirect('/8router/dashboard');

    const provider = new GoogleOAuthProvider(config.google.clientId, config.google.clientSecret);
    const state = generateState();
    const signedState = signState(state, config.sessionSecret);
    pendingStates.set(state, { provider: 'google', createdAt: Date.now() });

    const redirectUri = `${getBaseUrl(req)}/auth/google/callback`;
    const authUrl = provider.getAuthorizationUrl(redirectUri, signedState);

    // Set state cookie for CSRF protection
    res.setHeader('Set-Cookie', `8router_state=${signedState}; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=600`);
    res.redirect(authUrl);
  });

  // ─── GET /auth/google/callback ───
  router.get('/auth/google/callback', async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const stateParam = req.query.state as string;

      if (!code || !stateParam) {
        return res.status(400).send(getErrorPage('Missing authorization code or state'));
      }

      // Verify state
      const state = verifyState(stateParam, config.sessionSecret);
      if (!state || !pendingStates.has(state)) {
        return res.status(403).send(getErrorPage('Invalid or expired state parameter'));
      }
      pendingStates.delete(state);

      // Exchange code
      const provider = new GoogleOAuthProvider(config.google.clientId, config.google.clientSecret);
      const redirectUri = `${getBaseUrl(req)}/auth/google/callback`;
      const user = await provider.exchangeCode(code, redirectUri);

      // Check allowlist
      const allowed = checkAllowlist(user, config);
      if (!allowed) {
        return res.status(403).send(getErrorPage('Access denied. Your email is not authorized.'));
      }

      // Create session
      const sessionValue = sessionManager.createSession(user);
      const cookieOptions = isRequestSecure(req)
        ? `8router_session=${sessionValue}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${config.sessionMaxAgeHours * 3600}`
        : `8router_session=${sessionValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${config.sessionMaxAgeHours * 3600}`;
      res.setHeader('Set-Cookie', cookieOptions);
      res.redirect('/8router/dashboard');
    } catch (err: any) {
      console.error('[8Router] Google OAuth error:', err.message);
      res.status(500).send(getErrorPage('Authentication failed. Please try again.'));
    }
  });

  // ─── GET /auth/github ───
  router.get('/auth/github', (req: Request, res: Response) => {
    if (!config.enabled) return res.redirect('/8router/dashboard');

    const provider = new GitHubOAuthProvider(config.github.clientId, config.github.clientSecret);
    const state = generateState();
    const signedState = signState(state, config.sessionSecret);
    pendingStates.set(state, { provider: 'github', createdAt: Date.now() });

    const redirectUri = `${getBaseUrl(req)}/auth/github/callback`;
    const authUrl = provider.getAuthorizationUrl(redirectUri, signedState);

    res.setHeader('Set-Cookie', `8router_state=${signedState}; Path=/auth; HttpOnly; SameSite=Lax; Max-Age=600`);
    res.redirect(authUrl);
  });

  // ─── GET /auth/github/callback ───
  router.get('/auth/github/callback', async (req: Request, res: Response) => {
    try {
      const code = req.query.code as string;
      const stateParam = req.query.state as string;

      if (!code || !stateParam) {
        return res.status(400).send(getErrorPage('Missing authorization code or state'));
      }

      // Verify state
      const state = verifyState(stateParam, config.sessionSecret);
      if (!state || !pendingStates.has(state)) {
        return res.status(403).send(getErrorPage('Invalid or expired state parameter'));
      }
      pendingStates.delete(state);

      // Exchange code
      const provider = new GitHubOAuthProvider(config.github.clientId, config.github.clientSecret);
      const redirectUri = `${getBaseUrl(req)}/auth/github/callback`;
      const user = await provider.exchangeCode(code, redirectUri);

      // Check allowlist
      const allowed = checkAllowlist(user, config);
      if (!allowed) {
        return res.status(403).send(getErrorPage('Access denied. Your email is not authorized.'));
      }

      // Create session
      const sessionValue = sessionManager.createSession(user);
      const cookieOptions = isRequestSecure(req)
        ? `8router_session=${sessionValue}; Path=/; HttpOnly; SameSite=Lax; Secure; Max-Age=${config.sessionMaxAgeHours * 3600}`
        : `8router_session=${sessionValue}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${config.sessionMaxAgeHours * 3600}`;
      res.setHeader('Set-Cookie', cookieOptions);
      res.redirect('/8router/dashboard');
    } catch (err: any) {
      console.error('[8Router] GitHub OAuth error:', err.message);
      res.status(500).send(getErrorPage('Authentication failed. Please try again.'));
    }
  });

  return router;
}

// ─── Helpers ───

function getBaseUrl(req: Request): string {
  const proto = req.headers['x-forwarded-proto'] || (isRequestSecure(req) ? 'https' : 'http');
  const host = req.headers['x-forwarded-host'] || req.headers.host || 'localhost:8080';
  return `${proto}://${host}`;
}

function isRequestSecure(req: Request): boolean {
  return !!(req.headers['x-forwarded-proto'] === 'https' || req.socket.localPort === 443);
}

function checkAllowlist(user: OAuthUser, config: OAuthConfig): boolean {
  // If no allowlist configured, allow all (dev mode)
  if (config.allowedEmails.length === 0 && config.allowedDomains.length === 0) {
    return true;
  }

  // Check email allowlist
  if (config.allowedEmails.length > 0 && config.allowedEmails.includes(user.email)) {
    return true;
  }

  // Check domain allowlist
  if (config.allowedDomains.length > 0 && user.email) {
    const domain = user.email.split('@')[1]?.toLowerCase();
    if (domain && config.allowedDomains.map(d => d.toLowerCase()).includes(domain)) {
      return true;
    }
  }

  return false;
}

function getErrorPage(message: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>8Router — Access Denied</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { background: #0a0a0f; color: #e2e8f0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; }
    .container { text-align: center; max-width: 480px; padding: 48px 32px; background: #111118; border: 1px solid #1e1e2e; border-radius: 16px; }
    h1 { font-size: 24px; color: #ef4444; margin-bottom: 16px; }
    p { color: #94a3b8; margin-bottom: 24px; line-height: 1.6; }
    a { color: #3b82f6; text-decoration: none; font-weight: 500; }
    a:hover { text-decoration: underline; }
  </style>
</head>
<body>
  <div class="container">
    <h1>⚠️ Access Denied</h1>
    <p>${escapeHtml(message)}</p>
    <a href="/auth/login">← Back to Login</a>
  </div>
</body>
</html>`;
}

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
