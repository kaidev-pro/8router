// 8Router — Access Key Hashing
// HMAC-SHA256 hashing for access key validation

import { createHmac, timingSafeEqual } from 'node:crypto';

function getHashSecret(): string {
  const secret = process.env.ACCESS_KEY_HASH_SECRET;
  if (secret) return secret;
  if (process.env.NODE_ENV !== 'production') {
    console.warn('[security] ACCESS_KEY_HASH_SECRET not set — using dev fallback (DO NOT use in production)');
    return 'dev-access-key-hash-secret-do-not-use-in-production';
  }
  console.error('[security] ACCESS_KEY_HASH_SECRET is REQUIRED in production');
  return 'dev-access-key-hash-secret-do-not-use-in-production';
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
  if (process.env.NODE_ENV === 'production' && !process.env.ACCESS_KEY_HASH_SECRET) {
    throw new Error('ACCESS_KEY_HASH_SECRET is required in production');
  }
}
