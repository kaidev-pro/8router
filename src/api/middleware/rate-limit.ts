// 8Router — Rate Limiting Middleware (Express)
// Configurable rate limiting with IP-based and key-based tracking

import { Request, Response, NextFunction } from 'express';

export interface RateLimitConfig {
  windowMs: number;
  maxRequests: number;
  message?: string;
  statusCode?: number;
  keyGenerator?: (req: Request) => string;
}

export interface RateLimitEntry {
  count: number;
  resetAt: number;
}

// In-memory store for rate limiting
const store = new Map<string, RateLimitEntry>();

// Periodic cleanup
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    if (entry.resetAt < now) {
      store.delete(key);
    }
  }
}, 60_000);

/**
 * Create a rate limiter middleware.
 * Default: 100 requests per minute per IP.
 */
export function rateLimiter(config: RateLimitConfig) {
  const {
    windowMs = 60_000,
    maxRequests = 100,
    message = 'Too many requests, please try again later.',
    statusCode = 429,
    keyGenerator = (req: Request) => {
      // Use API key when available, fall back to IP
      const apiKey = (req as any).apiKeyRaw;
      if (apiKey) return `key:${apiKey}`;
      return req.ip || req.socket.remoteAddress || 'unknown';
    },
  } = config;

  return (req: Request, res: Response, next: NextFunction): void => {
    const key = keyGenerator(req);
    const now = Date.now();

    let entry = store.get(key);

    if (!entry || entry.resetAt < now) {
      // New window
      entry = { count: 0, resetAt: now + windowMs };
      store.set(key, entry);
    }

    entry.count++;

    // Set rate limit headers
    const remaining = Math.max(0, maxRequests - entry.count);
    res.setHeader('X-RateLimit-Limit', String(maxRequests));
    res.setHeader('X-RateLimit-Remaining', String(remaining));
    res.setHeader('X-RateLimit-Reset', String(entry.resetAt));

    if (entry.count > maxRequests) {
      res.status(statusCode).json({
        error: {
          message,
          type: 'rate_limit_error',
          code: 'rate_limited',
          remaining: 0,
          resetAt: entry.resetAt,
        },
      });
      return;
    }

    next();
  };
}

// Pre-configured limiters
export const globalRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: parseInt(process.env.RATE_LIMIT_GLOBAL || '200', 10),
  message: 'Global rate limit exceeded. Please reduce request frequency.',
});

export const chatRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: parseInt(process.env.RATE_LIMIT_CHAT || '60', 10),
  message: 'Chat rate limit exceeded. Max 60 requests per minute.',
  keyGenerator: (req: Request) => {
    const apiKey = (req as any).apiKeyRaw;
    if (apiKey) return `chat:${apiKey}`;
    return `chat:${req.ip || 'unknown'}`;
  },
});

export const adminRateLimiter = rateLimiter({
  windowMs: 60_000,
  maxRequests: parseInt(process.env.RATE_LIMIT_ADMIN || '30', 10),
  message: 'Admin rate limit exceeded. Max 30 requests per minute.',
  keyGenerator: (req: Request) => {
    const apiKey = (req as any).apiKeyRaw;
    if (apiKey) return `admin:${apiKey}`;
    return `admin:${req.ip || 'unknown'}`;
  },
});