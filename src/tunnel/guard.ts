// 8Router — Tunnel Auth & Access Mode Middleware
import { Request, Response, NextFunction } from 'express';
import { TunnelConfig, isRouteAllowedInMode, maskSecret } from './config.js';

export function isLocalRequest(req: Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}

/**
 * Tunnel access mode guard.
 * Blocks routes not allowed in the current tunnel mode for non-local requests.
 */
export function tunnelAccessGuard(config: TunnelConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // If tunnel is disabled, skip (normal local-only behavior)
    if (!config.enabled) return next();

    // Local requests are always allowed
    if (isLocalRequest(req)) return next();

    // Check if route is allowed in current tunnel mode
    if (!isRouteAllowedInMode(req.path, config.mode)) {
      return res.status(403).json({
        error: {
          message: `Route ${req.path} is not accessible in tunnel mode '${config.mode}'.`,
          code: 403,
          tunnelMode: config.mode,
        }
      });
    }

    next();
  };
}

/**
 * Tunnel token authentication.
 * Validates tunnel token from header, query, or Bearer token.
 * Only applies to non-local requests when tunnel is active.
 */
export function tunnelTokenAuth(config: TunnelConfig) {
  return (req: Request, res: Response, next: NextFunction) => {
    // If tunnel is disabled, skip
    if (!config.enabled) return next();

    // Local requests bypass tunnel auth
    if (isLocalRequest(req)) return next();

    // If auth not required, skip (but this should generate a doctor warning)
    if (!config.authRequired) return next();

    // Extract token from multiple sources
    const token = (req.headers['x-8router-token'] as string)
      || (req.query.token as string)
      || extractBearerToken(req);

    if (!token || token !== config.token) {
      return res.status(401).json({
        error: {
          message: 'Invalid or missing tunnel token. Provide via Authorization: Bearer *** or x-8router-token header.',
          code: 401,
        }
      });
    }

    next();
  };
}

/**
 * Admin endpoint guard — always local-only, even with tunnel.
 * These endpoints control the tunnel itself and must not be exposed.
 */
export function adminLocalOnly() {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!isLocalRequest(req)) {
      return res.status(403).json({
        error: {
          message: 'Admin endpoints are local-only. Access via localhost or SSH tunnel.',
          code: 403,
        }
      });
    }
    next();
  };
}

function extractBearerToken(req: Request): string | null {
  const auth = req.headers.authorization;
  if (auth && auth.startsWith('Bearer ')) return auth.slice(7);
  return null;
}

/**
 * Generate tunnel security warnings for doctor/display.
 */
export function getTunnelWarnings(config: TunnelConfig): string[] {
  const warnings: string[] = [];

  if (!config.enabled) return warnings;

  if (!config.authRequired) {
    warnings.push('⚠️  TUNNEL WARNING: authRequired=false — API is accessible without token authentication!');
  }

  if (config.mode === 'full') {
    warnings.push('⚠️  TUNNEL WARNING: mode=full — all endpoints (except admin) are exposed via tunnel.');
  }

  if (config.mode === 'api-only' && !config.authRequired) {
    warnings.push('⚠️  CRITICAL: API exposed via tunnel without authentication. Set authRequired=true immediately.');
  }

  if (!config.token) {
    warnings.push('⚠️  TUNNEL WARNING: No token configured. Generate one with 8router --generate-token.');
  }

  if (config.publicUrl && !config.publicUrl.startsWith('https://')) {
    warnings.push('⚠️  TUNNEL WARNING: Public URL is not HTTPS. Traffic is not encrypted.');
  }

  return warnings;
}
