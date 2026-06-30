// 8Router — Session Management
// Cookie-based session with HMAC signing

import crypto from 'crypto';
import type { OAuthConfig } from './config.js';

export interface SessionData {
  userId: string;
  email: string;
  name: string;
  avatar: string;
  provider: 'google' | 'github';
  createdAt: number;
  expiresAt: number;
}

export interface SessionCookie {
  data: SessionData;
  signature: string;
}

const COOKIE_NAME = '8router_session';

export class SessionManager {
  private secret: string;
  private maxAgeMs: number;

  constructor(config: OAuthConfig) {
    this.secret = config.sessionSecret;
    this.maxAgeMs = config.sessionMaxAgeHours * 60 * 60 * 1000;
  }

  /**
   * Create a signed session cookie value
   */
  createSession(user: Omit<SessionData, 'createdAt' | 'expiresAt'>): string {
    const now = Date.now();
    const data: SessionData = {
      ...user,
      createdAt: now,
      expiresAt: now + this.maxAgeMs,
    };
    const payload = Buffer.from(JSON.stringify(data)).toString('base64url');
    const signature = this.sign(payload);
    return `${payload}.${signature}`;
  }

  /**
   * Parse and verify a session cookie value
   */
  parseSession(cookieValue: string): SessionData | null {
    try {
      const [payload, signature] = cookieValue.split('.');
      if (!payload || !signature) return null;

      // Verify signature
      const expectedSig = this.sign(payload);
      if (!crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSig))) {
        return null;
      }

      // Parse data
      const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData;

      // Check expiration
      if (Date.now() > data.expiresAt) {
        return null;
      }

      return data;
    } catch {
      return null;
    }
  }

  /**
   * Get cookie options for Set-Cookie header
   */
  getCookieOptions(isSecure: boolean): string {
    const maxAgeSec = Math.floor(this.maxAgeMs / 1000);
    const parts = [
      `${COOKIE_NAME}=`, // value set separately
      `Path=/`,
      `HttpOnly`,
      `SameSite=Lax`,
      `Max-Age=${maxAgeSec}`,
    ];
    if (isSecure) {
      parts.push('Secure');
    }
    return parts.join('; ');
  }

  /**
   * Get the cookie name
   */
  getCookieName(): string {
    return COOKIE_NAME;
  }

  /**
   * Get the clear cookie header value
   */
  getClearCookieHeader(): string {
    return `${COOKIE_NAME}=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0`;
  }

  /**
   * HMAC-SHA256 signature
   */
  private sign(payload: string): string {
    return crypto.createHmac('sha256', this.secret).update(payload).digest('base64url');
  }
}

/**
 * Generate a random state parameter for OAuth CSRF protection
 */
export function generateState(): string {
  return crypto.randomBytes(32).toString('base64url');
}

/**
 * Sign a state parameter
 */
export function signState(state: string, secret: string): string {
  const sig = crypto.createHmac('sha256', secret).update(state).digest('base64url');
  return `${state}.${sig}`;
}

/**
 * Verify and extract state parameter
 */
export function verifyState(signedState: string, secret: string): string | null {
  try {
    const [state, sig] = signedState.split('.');
    if (!state || !sig) return null;
    const expectedSig = crypto.createHmac('sha256', secret).update(state).digest('base64url');
    if (!crypto.timingSafeEqual(Buffer.from(sig), Buffer.from(expectedSig))) return null;
    return state;
  } catch {
    return null;
  }
}
