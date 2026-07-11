// 8Router — Access Key Generation
// Generates high-entropy sk-8router_* access keys

import { randomBytes } from 'node:crypto';
import { maskAccessKey } from './mask.js';

const KEY_SECRET_LEN = 32; // 32 bytes = 64 hex chars
const KEY_PREFIX = 'sk-8router_';

export interface GeneratedAccessKey {
  rawKey: string;
  keyPrefix: string;
  keyHint: string;
}

/**
 * Generate a new sk-8router access key.
 * Returns raw key (shown once), public prefix (for lookup), and masked hint.
 */
export function generateAccessKey(): GeneratedAccessKey {
  const secret = randomBytes(KEY_SECRET_LEN).toString('hex');
  const rawKey = KEY_PREFIX + secret;
  const keyPrefix = rawKey.slice(0, 20); // sk-8router_live_ + first 5
  const keyHint = maskAccessKey(rawKey);
  return { rawKey, keyPrefix, keyHint };
}
