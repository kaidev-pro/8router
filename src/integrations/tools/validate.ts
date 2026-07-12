// 8Router — Setup Validation (Phase 2G)
// Validates URLs, models, and access key format without exposing secrets.

export interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const PRIVATE_IP_PATTERNS = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2[0-9]|3[01])\./,
  /^192\.168\./,
  /^localhost$/i,
  /^0\.0\.0\.0$/,
];

// Matches user:pass@ in URLs like https://user:pass@host/path
const URL_CREDENTIAL_PATTERN = /\/\/[^/]*:[^/]*@/;

/** Validate a base URL */
export function validateBaseUrl(url: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!url || typeof url !== 'string') {
    errors.push('Base URL is required');
    return { valid: false, errors, warnings };
  }

  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    errors.push('Invalid URL format');
    return { valid: false, errors, warnings };
  }

  if (!['http:', 'https:'].includes(parsed.protocol)) {
    errors.push('URL must use http or https protocol');
  }

  if (URL_CREDENTIAL_PATTERN.test(url)) {
    errors.push('URL must not contain embedded credentials');
  }

  if (parsed.protocol === 'http:') {
    const isPrivate = PRIVATE_IP_PATTERNS.some(p => p.test(parsed.hostname));
    if (!isPrivate) {
      warnings.push('HTTP is not secure for non-local endpoints');
    }
  }

  if (url.endsWith('/')) {
    warnings.push('Trailing slash will be normalized');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Normalize a base URL */
export function normalizeBaseUrl(url: string): string {
  let normalized = url.trim().replace(/\/+$/, '');
  if (normalized.endsWith('/v1/v1')) {
    normalized = normalized.slice(0, -3);
  }
  return normalized;
}

/** Validate a model ID */
export function validateModel(model: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!model || typeof model !== 'string') {
    errors.push('Model is required');
    return { valid: false, errors, warnings };
  }

  if (model.length > 256) {
    errors.push('Model ID is too long');
  }

  return { valid: errors.length === 0, errors, warnings };
}

/** Validate an access key format */
export function validateAccessKeyFormat(key: string): ValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  if (!key || typeof key !== 'string') {
    errors.push('Access key is required');
    return { valid: false, errors, warnings };
  }

  if (!key.startsWith('sk-8router_')) {
    warnings.push('Access key should start with sk-8router_');
  }

  if (key.length < 20) {
    errors.push('Access key appears too short');
  }

  return { valid: errors.length === 0, errors, warnings };
}
