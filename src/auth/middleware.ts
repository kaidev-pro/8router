// 8Router — Auth Middleware (Express)
// Protects API endpoints with API key validation.
// Open endpoints: /health, /8router/info, /v1/models

import { Request, Response, NextFunction } from 'express';
import { validateAPIKey, checkRateLimit, updateKeyUsage, ensureDefaultKey } from './api-keys.js';

// Ensure default API key exists at startup
ensureDefaultKey();

// Paths that do NOT require authentication
const OPEN_PATHS = [
  '/health',
  '/8router/info',
  '/v1/models',
];

// Paths that use dashboard JWT auth instead of API key
const DASHBOARD_PATHS = [
  '/dashboard',
];

export function apiKeyAuth(req: Request, res: Response, next: NextFunction): void {
  const path = req.path;

  // Open paths — skip auth
  if (OPEN_PATHS.some(p => path === p || path.startsWith(p + '/') && path !== '/v1/models')) {
    // Special case: /v1/models is open, but /v1/chat/completions is protected
    if (path.startsWith('/v1/') && path !== '/v1/models') {
      // Protected v1 endpoint, continue to check auth
    } else {
      next();
      return;
    }
  }

  // Check for private API key via header
  const authHeader = req.headers.authorization;

  if (authHeader && authHeader.startsWith('Bearer ')) {
    const apiKey = authHeader.slice(7).trim();

    const validation = validateAPIKey(apiKey);
    if (!validation.valid || !validation.key) {
      res.status(401).json({
        error: {
          message: validation.error || 'Invalid API key',
          type: 'auth_error',
          code: 'unauthorized',
        },
      });
      return;
    }

    // Check rate limit
    const rateCheck = checkRateLimit(apiKey, validation.key.rateLimit);
    if (!rateCheck.allowed) {
      res.setHeader('X-RateLimit-Remaining', '0');
      res.setHeader('X-RateLimit-Reset', String(rateCheck.resetAt));
      res.status(429).json({
        error: {
          message: 'Rate limit exceeded. Try again later.',
          type: 'rate_limit_error',
          code: 'rate_limited',
          remaining: 0,
          resetAt: rateCheck.resetAt,
        },
      });
      return;
    }

    // Check if key has required permission for this path
    const isChatPath = path.includes('/chat/completions');
    const isAdminPath = path.includes('/8router/') && (path !== '/8router/info');

    if (isChatPath && !validation.key.permissions.includes('chat')) {
      res.status(403).json({
        error: {
          message: 'API key does not have chat permission',
          type: 'permission_error',
          code: 'forbidden',
        },
      });
      return;
    }

    if (isAdminPath && !validation.key.permissions.includes('admin')) {
      res.status(403).json({
        error: {
          message: 'API key does not have admin permission',
          type: 'permission_error',
          code: 'forbidden',
        },
      });
      return;
    }

    // Attach key info to request for downstream use
    (req as any).apiKey = validation.key;
    (req as any).apiKeyRaw = apiKey;

    // Set rate limit headers
    res.setHeader('X-RateLimit-Remaining', String(rateCheck.remaining));
    res.setHeader('X-RateLimit-Limit', String(validation.key.rateLimit.requestsPerMinute));

    next();
    return;
  }

  // No auth header present
  res.status(401).json({
    error: {
      message: 'Authentication required. Provide API key via Authorization: Bearer <key> header.',
      type: 'auth_error',
      code: 'unauthorized',
    },
  });
}

// Track token usage for API keys
export function trackApiKeyUsage(req: Request, _res: Response, next: NextFunction): void {
  const apiKey = (req as any).apiKeyRaw;
  const response = (req as any).responseData;

  if (apiKey && response?.usage?.total_tokens) {
    updateKeyUsage(apiKey, response.usage.total_tokens);
  }

  next();
}

// Get the API key from the request (for logging)
export function getRequestApiKeyName(req: Request): string {
  return (req as any).apiKey?.name || 'anonymous';
}
