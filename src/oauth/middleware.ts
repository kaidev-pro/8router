// 8Router — OAuth Middleware
// Route protection and auth checks

import type { Request, Response, NextFunction } from 'express';
import type { OAuthConfig } from './config.js';
import type { SessionManager, SessionData } from './session.js';
import { isLocalRequest } from '../tunnel/index.js';

/**
 * Extend Express Request to include session
 */
declare global {
  namespace Express {
    interface Request {
      session?: SessionData;
    }
  }
}

/**
 * Middleware that requires authentication for protected routes.
 * If OAuth is disabled, all requests pass through.
 * If OAuth is enabled, unauthenticated requests to protected routes get redirected to /auth/login.
 */
export function requireAuth(config: OAuthConfig, sessionManager: SessionManager) {
  return (req: Request, res: Response, next: NextFunction) => {
    // If OAuth disabled, pass through
    if (!config.enabled) {
      return next();
    }

    // Parse session from cookie
    const cookieName = sessionManager.getCookieName();
    const cookieHeader = req.headers.cookie || '';
    const cookies = parseCookies(cookieHeader);
    const sessionCookie = cookies[cookieName];

    if (sessionCookie) {
      const session = sessionManager.parseSession(sessionCookie);
      if (session) {
        req.session = session;
        return next();
      }
    }

    // Check if this is an API request (JSON response expected)
    const accept = req.headers.accept || '';
    const isApiRequest = req.path.startsWith('/admin/') || accept.includes('application/json');

    if (isApiRequest) {
      return res.status(401).json({
        error: 'Authentication required',
        loginUrl: '/auth/login',
      });
    }

    // Browser request — redirect to login
    return res.redirect('/auth/login');
  };
}

/**
 * Middleware that checks if user is authenticated (but doesn't block).
 * Sets req.session if valid cookie exists.
 */
export function optionalAuth(sessionManager: SessionManager) {
  return (req: Request, _res: Response, next: NextFunction) => {
    const cookieName = sessionManager.getCookieName();
    const cookieHeader = req.headers.cookie || '';
    const cookies = parseCookies(cookieHeader);
    const sessionCookie = cookies[cookieName];

    if (sessionCookie) {
      const session = sessionManager.parseSession(sessionCookie);
      if (session) {
        req.session = session;
      }
    }

    next();
  };
}

/**
 * Check if a route is protected (requires auth when OAuth enabled)
 */
export function isProtectedRoute(path: string): boolean {
  // Dashboard
  if (path === '/8router/dashboard' || path.startsWith('/8router/dashboard/')) return true;
  // Setup guide (contains config)
  if (path === '/8router/setup' || path.startsWith('/8router/setup/')) return true;
  // Admin endpoints
  if (path.startsWith('/admin/')) return true;
  // Backup/export
  if (path.includes('/backup') || path.includes('/export')) return true;
  // Provider key management
  if (path.includes('/api-keys') || path.includes('/providers/keys')) return true;
  // Tunnel control
  if (path.startsWith('/admin/tunnel/')) return true;

  return false;
}

/**
 * Check if a route is public (always accessible)
 */
export function isPublicRoute(path: string): boolean {
  // Landing page
  if (path === '/8router/' || path === '/8router') return true;
  // Health check
  if (path === '/health') return true;
  // Auth routes
  if (path.startsWith('/auth/')) return true;
  // Static assets
  if (path.startsWith('/assets/') || path.startsWith('/8router/public/')) return true;

  return false;
}

/**
 * Parse cookies from Cookie header string
 */
function parseCookies(cookieHeader: string): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;

  for (const pair of cookieHeader.split(';')) {
    const [name, ...rest] = pair.split('=');
    if (name && rest.length > 0) {
      cookies[name.trim()] = rest.join('=').trim();
    }
  }

  return cookies;
}
