// 8Router — JWT Dashboard Authentication
// Secure dashboard access with JWT tokens

import crypto from 'crypto';

export interface DashboardUser {
  id: string;
  username: string;
  passwordHash: string;
  role: 'admin' | 'viewer';
  createdAt: number;
  lastLogin?: number;
}

export interface JWTToken {
  token: string;
  expiresAt: number;
  userId: string;
}

// In-memory stores
const users: Map<string, DashboardUser> = new Map();
const tokens: Map<string, JWTToken> = new Map();
const JWT_SECRET = crypto.randomBytes(32).toString('hex');

// ═══ Password Hashing ═══

function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const hash = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return `${salt}:${hash}`;
}

function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const verify = crypto.pbkdf2Sync(password, salt, 100000, 64, 'sha512').toString('hex');
  return hash === verify;
}

// ═══ JWT Token Generation ═══

function base64url(data: Buffer | string): string {
  return (typeof data === 'string' ? Buffer.from(data) : data)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

export function createJWT(userId: string, expiresInMs: number = 24 * 60 * 60 * 1000): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const payload = {
    sub: userId,
    iat: Math.floor(Date.now() / 1000),
    exp: Math.floor((Date.now() + expiresInMs) / 1000)
  };

  const headerB64 = base64url(JSON.stringify(header));
  const payloadB64 = base64url(JSON.stringify(payload));
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${headerB64}.${payloadB64}`)
    .digest();

  return `${headerB64}.${payloadB64}.${base64url(signature)}`;
}

export function verifyJWT(token: string): { valid: boolean; userId?: string; error?: string } {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) {
      return { valid: false, error: 'Invalid token format' };
    }

    const [headerB64, payloadB64, signatureB64] = parts;

    // Verify signature
    const expectedSig = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${headerB64}.${payloadB64}`)
      .digest();

    const actualSig = Buffer.from(signatureB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64');

    if (!crypto.timingSafeEqual(expectedSig, actualSig)) {
      return { valid: false, error: 'Invalid signature' };
    }

    // Decode payload
    const payload = JSON.parse(
      Buffer.from(payloadB64.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString()
    );

    // Check expiration
    if (payload.exp && payload.exp * 1000 < Date.now()) {
      return { valid: false, error: 'Token expired' };
    }

    return { valid: true, userId: payload.sub };
  } catch (err) {
    return { valid: false, error: 'Token verification failed' };
  }
}

// ═══ User Management ═══

export function createUser(username: string, password: string, role: DashboardUser['role'] = 'viewer'): DashboardUser {
  const user: DashboardUser = {
    id: crypto.randomUUID(),
    username,
    passwordHash: hashPassword(password),
    role,
    createdAt: Date.now()
  };
  users.set(user.id, user);
  return user;
}

export function authenticateUser(username: string, password: string): { success: boolean; user?: DashboardUser; error?: string } {
  const user = Array.from(users.values()).find(u => u.username === username);
  if (!user) {
    return { success: false, error: 'User not found' };
  }

  if (!verifyPassword(password, user.passwordHash)) {
    return { success: false, error: 'Invalid password' };
  }

  user.lastLogin = Date.now();
  return { success: true, user };
}

export function getUserById(id: string): DashboardUser | undefined {
  return users.get(id);
}

export function getAllUsers(): Omit<DashboardUser, 'passwordHash'>[] {
  return Array.from(users.values()).map(({ passwordHash, ...user }) => user);
}

export function updateUserPassword(userId: string, newPassword: string): boolean {
  const user = users.get(userId);
  if (!user) return false;
  user.passwordHash = hashPassword(newPassword);
  return true;
}

export function deleteUser(userId: string): boolean {
  return users.delete(userId);
}

// ═══ Session Management ═══

export function createSession(userId: string): { token: string; expiresAt: number } {
  const token = createJWT(userId);
  const expiresAt = Date.now() + 24 * 60 * 60 * 1000;

  tokens.set(token, {
    token,
    expiresAt,
    userId
  });

  return { token, expiresAt };
}

export function validateSession(token: string): { valid: boolean; userId?: string; error?: string } {
  const session = tokens.get(token);
  if (!session) {
    return { valid: false, error: 'Session not found' };
  }

  if (session.expiresAt < Date.now()) {
    tokens.delete(token);
    return { valid: false, error: 'Session expired' };
  }

  return { valid: true, userId: session.userId };
}

export function destroySession(token: string): boolean {
  return tokens.delete(token);
}

export function destroyAllUserSessions(userId: string): number {
  let count = 0;
  for (const [token, session] of tokens) {
    if (session.userId === userId) {
      tokens.delete(token);
      count++;
    }
  }
  return count;
}

// ═══ Default Admin ═══

export function ensureDefaultAdmin(): DashboardUser {
  const existing = Array.from(users.values()).find(u => u.username === 'admin');
  if (existing) return existing;
  return createUser('admin', 'changeme', 'admin');
}

// ═══ Middleware ═══

export function authMiddleware(req: any, res: any, next: any): void {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authorization required' });
    return;
  }

  const token = authHeader.slice(7);
  const result = validateSession(token);

  if (!result.valid) {
    res.status(401).json({ error: result.error });
    return;
  }

  req.userId = result.userId;
  next();
}
