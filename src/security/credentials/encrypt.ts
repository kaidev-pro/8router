// 8Router — Provider Credential Encryption (AES-256-GCM)
// Encrypts provider API keys at rest. Never stores plaintext keys.

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto';

const VERSION = 'enc:v1:';
const ALGO = 'aes-256-gcm';
const IV_LEN = 16;
const SALT_LEN = 16;
const TAG_LEN = 16;
const KEY_LEN = 32;
const SCRYPT_N = 2 ** 14;

export function getProviderEncryptionSecretStatus(): 'ready' | 'missing' | 'invalid' {
  const secret = process.env.PROVIDER_KEY_ENCRYPTION_SECRET;
  if (!secret) return 'missing';
  if (secret.trim().length < 32) return 'invalid';
  return 'ready';
}

function getSecret(): string {
  const secret = process.env.PROVIDER_KEY_ENCRYPTION_SECRET;
  if (!secret || secret.trim().length < 32) {
    // In dev/test, use a fallback with warning. Production always fails closed.
    if (process.env.NODE_ENV === 'production') {
      throw new Error('PROVIDER_KEY_ENCRYPTION_SECRET is required in production');
    }
    console.warn('[security] PROVIDER_KEY_ENCRYPTION_SECRET not set or too short — using dev fallback');
    return 'dev-only-8router-secret-do-not-use-in-prod';
  }
  return secret;
}

function deriveKey(salt: Buffer): Buffer {
  return scryptSync(getSecret(), salt, KEY_LEN, { N: SCRYPT_N, r: 8, p: 1 }) as Buffer;
}

export function encrypt(plainText: string): string {
  const salt = randomBytes(SALT_LEN);
  const iv = randomBytes(IV_LEN);
  const key = deriveKey(salt);
  const cipher = createCipheriv(ALGO, key, iv);
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  // Pack: version + salt + iv + tag + ciphertext
  const packed = Buffer.concat([salt, iv, tag, encrypted]);
  return VERSION + packed.toString('base64');
}

export function decrypt(cipherText: string): string {
  if (!cipherText.startsWith(VERSION)) {
    throw new Error('Invalid encrypted credential format');
  }
  const raw = Buffer.from(cipherText.slice(VERSION.length), 'base64');
  const salt = raw.subarray(0, SALT_LEN);
  const iv = raw.subarray(SALT_LEN, SALT_LEN + IV_LEN);
  const tag = raw.subarray(SALT_LEN + IV_LEN, SALT_LEN + IV_LEN + TAG_LEN);
  const data = raw.subarray(SALT_LEN + IV_LEN + TAG_LEN);
  const key = deriveKey(salt);
  const decipher = createDecipheriv(ALGO, key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(data, undefined, 'utf8') + decipher.final('utf8');
}

export function isEncrypted(value: string): boolean {
  return value.startsWith(VERSION);
}

export function assertEncryptionReady(): void {
  if (process.env.NODE_ENV === 'production' && getProviderEncryptionSecretStatus() !== 'ready') {
    throw new Error('PROVIDER_KEY_ENCRYPTION_SECRET is required in production');
  }
}
