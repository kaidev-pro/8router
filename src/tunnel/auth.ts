// 8Router — Tunnel Auth Middleware
import { Request, Response, NextFunction } from 'express';

export function tunnelAuthMiddleware(validToken: string) {
  return (req: Request, res: Response, next: NextFunction) => {
    // Always allow local requests
    const ip = req.ip || req.socket.remoteAddress || '';
    const isLocal = ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
    if (isLocal) return next();

    // Check tunnel token from multiple sources
    const token = (req.headers['x-8router-token'] as string)
      || (req.query.token as string)
      || extractBearerToken(req);

    if (!token || token !== validToken) {
      return res.status(401).json({
        error: { message: 'Invalid or missing tunnel token. Pass via Authorization: Bearer <token> or x-8router-token header.', code: 401 }
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

export function isLocalRequest(req: Request): boolean {
  const ip = req.ip || req.socket.remoteAddress || '';
  return ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1';
}
