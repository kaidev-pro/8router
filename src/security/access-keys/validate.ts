// 8Router — Access Key Validation
// Validates incoming access keys for runtime routing (Phase 2C use)

import { getDB, type AccessKeyRow } from '../../database.js';
import { assertAccessKeyHashReady, verifyAccessKey } from './hash.js';
import { redactSecrets } from '../credentials/redact.js';

const KEY_PREFIX = 'sk-8router_';

export interface AccessKeyContext {
  valid: true;
  userId: string;
  accessKeyId: string;
  name: string;
  allowedProviders: string[];
  allowedModels: string[];
  routingMode: string;
  defaultModelAlias: string;
  limits: {
    dailyRequestLimit?: number;
    monthlyRequestLimit?: number;
    rateLimitPerMinute?: number;
  };
}

export interface InvalidResult {
  valid: false;
  reason: 'missing' | 'invalid_format' | 'not_found' | 'disabled' | 'revoked' | 'expired';
}

export type ValidationResult = AccessKeyContext | InvalidResult;

/**
 * Validate an incoming 8Router access key.
 * Returns context for valid keys, or structured invalid result.
 * Never throws for normal invalid keys.
 */
export function validateAccessKey(rawKey: string): ValidationResult {
  try { assertAccessKeyHashReady(); } catch { return { valid: false, reason: 'not_found' }; }
  if (!rawKey || typeof rawKey !== 'string') {
    return { valid: false, reason: 'missing' };
  }

  // Check format: must start with sk-8router_
  if (!rawKey.startsWith(KEY_PREFIX)) {
    return { valid: false, reason: 'invalid_format' };
  }

  // Minimum length: prefix + 40 chars
  if (rawKey.length < KEY_PREFIX.length + 40) {
    return { valid: false, reason: 'invalid_format' };
  }

  try {
    const db = getDB();
    // Look up by keyPrefix first (fast), then verify hash
    const keyPrefix = rawKey.slice(0, 20);
    const rows = db.prepare('SELECT * FROM access_keys WHERE keyPrefix = ?').all(keyPrefix) as AccessKeyRow[];

    let matched: AccessKeyRow | null = null;
    for (const row of rows) {
      if (verifyAccessKey(rawKey, row.keyHash)) {
        matched = row;
        break;
      }
    }

    if (!matched) {
      return { valid: false, reason: 'not_found' };
    }

    // Check status
    if (matched.status === 'revoked') {
      return { valid: false, reason: 'revoked' };
    }
    if (matched.isEnabled === 0) {
      return { valid: false, reason: 'disabled' };
    }
    if (matched.expiresAt && new Date(matched.expiresAt) < new Date()) {
      return { valid: false, reason: 'expired' };
    }

    // Parse JSON arrays
    let allowedProviders: string[] = [];
    let allowedModels: string[] = [];
    try { allowedProviders = JSON.parse(matched.allowedProviders); } catch {}
    try { allowedModels = JSON.parse(matched.allowedModels); } catch {}

    return {
      valid: true,
      userId: matched.userId,
      accessKeyId: matched.id,
      name: matched.name,
      allowedProviders,
      allowedModels,
      routingMode: matched.routingMode,
      defaultModelAlias: matched.defaultModelAlias,
      limits: {
        dailyRequestLimit: matched.dailyRequestLimit || undefined,
        monthlyRequestLimit: matched.monthlyRequestLimit || undefined,
        rateLimitPerMinute: matched.rateLimitPerMinute || undefined,
      },
    };
  } catch (err: any) {
    console.error('[access-keys] validation error:', redactSecrets(String(err?.message || err)));
    return { valid: false, reason: 'not_found' };
  }
}
