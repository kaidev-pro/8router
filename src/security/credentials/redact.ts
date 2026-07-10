// 8Router — Secret Redaction Utility
// Redacts sensitive data from logs, errors, and public responses.

const SECRET_PATTERNS: RegExp[] = [
  // OpenAI style keys
  /sk-proj-[A-Za-z0-9]{20,}/g,
  /sk-[A-Za-z0-9]{20,}/g,
  // Gemini / Google
  /AIza[A-Za-z0-9_-]{20,}/g,
  // Anthropic
  /sk-ant-[A-Za-z0-9]{20,}/g,
  // Bearer tokens in headers
  /[Bb]earer\s+[A-Za-z0-9_.-]{20,}/g,
  // API key query params
  /[?&](key|api_key|token|secret)=[A-Za-z0-9_.-]{8,}/gi,
];

/**
 * Mask a credential: show first 4 + last 4 chars.
 * `sk-proj-abc123456789xyz` → `sk-p...xyz`
 * Short strings → `****`
 */
export function maskCredential(value: string): string {
  if (!value) return '****';
  // Handle local endpoints
  if (value.startsWith('http://') || value.startsWith('https://')) {
    try {
      const url = new URL(value);
      return url.hostname + (url.port ? ':' + url.port : '');
    } catch { return value; }
  }
  if (value.length <= 8) return '****';
  return value.slice(0, 4) + '...' + value.slice(-4);
}

/**
 * Redact secrets from a string.
 * Replaces known secret patterns with `[REDACTED]`.
 */
export function redactSecrets(text: string): string {
  if (!text) return text;
  let result = text;
  for (const pattern of SECRET_PATTERNS) {
    result = result.replace(pattern, '[REDACTED]');
  }
  return result;
}

/**
 * Sanitize an error message for storage/display.
 * Strips secrets and truncates if too long.
 */
export function sanitizeError(error: unknown, maxLen = 500): string {
  const raw = error instanceof Error ? error.message : String(error);
  const sanitized = redactSecrets(raw);
  return sanitized.length > maxLen ? sanitized.slice(0, maxLen) + '...' : sanitized;
}

/**
 * Check if a string looks like a secret (not a URL or simple name).
 */
export function looksLikeSecret(value: string): boolean {
  if (!value || value.length < 8) return false;
  if (value.startsWith('http://') || value.startsWith('https://')) return false;
  // High entropy check: ratio of alphanumeric chars
  const alphaNum = value.replace(/[^A-Za-z0-9]/g, '').length;
  return alphaNum / value.length > 0.7 && value.length >= 12;
}
