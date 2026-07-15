// 8Router — Access Key Hashing
// HMAC-SHA256 hashing for access key validation

import { createHmac, timingSafeEqual } from 'node:crypto';

export function getAccessKeyHashSecretStatus(): 'ready' | 'missing' | 'invalid' {
  const secret = process.env.ACCESS_KEY_HASH_SECRET;
  if (!secret) return 'missing';
  if (secret.trim().length < 32) return 'invalid';
  return 'ready';
}

function getHashSecret(): string {
  const secret = process.env.ACCESS_KEY_HASH_SECRET;
  if (secret && secret.trim().length >= 32) return secret;
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[security] ACCESS_KEY_HASH_SECRET not set or too short — using dev fallback (DO NOT use in production)');
    return 'dev-access-key-hash-secret-do-not-use-in-production';
  }
  throw new Error('ACCESS_KEY_HASH_SECRET is required in production');
}

/**
 * Hash an access key using HMAC-SHA256.
 * This is a one-way operation — the raw key cannot be recovered.
 */
export function hashAccessKey(rawKey: string): string {
  const hmac = createHmac('sha256', getHashSecret()).update(rawKey).digest('hex');
  return hmac;
}

/**
 * Verify a raw access key against its stored hash using constant-time comparison.
 */
export function verifyAccessKey(rawKey: string, storedHash: string): boolean {
  const computed = hashAccessKey(rawKey);
  if (computed.length !== storedHash.length) return false;
  return timingSafeEqual(Buffer.from(computed, 'hex'), Buffer.from(storedHash, 'hex'));
}

/**
 * Assert that the access key hash secret is configured.
 * Throws in production if not set.
 */
export function assertAccessKeyHashReady(): void {
  if (process.env.NODE_ENV === 'production' && getAccessKeyHashSecretStatus() !== 'ready') {
    throw new Error('ACCESS_KEY_HASH_SECRET is required in production');
  }
}
