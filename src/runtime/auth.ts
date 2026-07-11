// 8Router — Runtime Auth
// Validates sk-8router_* access keys from Authorization headers

import type { Request } from 'express';
import { validateAccessKey, type AccessKeyContext } from '../security/access-keys/validate.js';
import { getDB } from '../database.js';
import { ERRORS, type OpenAIError } from './errors.js';

export type AuthResult =
  | { ok: true; ctx: AccessKeyContext }
  | { ok: false; error: OpenAIError; httpStatus: number };

/**
 * Extract and validate access key from request.
 * Supports Authorization: Bearer sk-8router_* and api-key header.
 */
export function authenticateRequest(req: Request): AuthResult {
  // Extract key from Authorization: Bearer ... or api-key header
  const authHeader = req.headers.authorization || req.headers['api-key'];
  if (!authHeader || typeof authHeader !== 'string') {
    return { ok: false, error: ERRORS.missingApiKey(), httpStatus: 401 };
  }

  let rawKey = '';
  if (authHeader.startsWith('Bearer ')) {
    rawKey = authHeader.slice(7).trim();
  } else {
    rawKey = authHeader.trim();
  }

  if (!rawKey) {
    return { ok: false, error: ERRORS.missingApiKey(), httpStatus: 401 };
  }

  // Must be 8Router key format
  if (!rawKey.startsWith('sk-8router')) {
    return { ok: false, error: ERRORS.invalidApiKey(), httpStatus: 401 };
  }

  // Validate against stored hashes
  const result = validateAccessKey(rawKey);

  if (!result.valid) {
    switch (result.reason) {
      case 'disabled':
      case 'revoked':
        return { ok: false, error: ERRORS.accessKeyDisabled(), httpStatus: 401 };
      case 'expired':
        return { ok: false, error: ERRORS.accessKeyExpired(), httpStatus: 401 };
      default:
        return { ok: false, error: ERRORS.invalidApiKey(), httpStatus: 401 };
    }
  }

  return { ok: true, ctx: result };
}

/**
 * Update access key usage metadata after successful request.
 */
export function updateAccessKeyUsage(accessKeyId: string): void {
  try {
    const db = getDB();
    const now = new Date().toISOString();
    db.prepare('UPDATE access_keys SET lastUsedAt = ?, updatedAt = ? WHERE id = ?').run(now, now, accessKeyId);
  } catch {
    // Don't let usage tracking break requests
  }
}
