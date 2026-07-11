// 8Router — Access Key Masking
// Safe display of access key hints

/**
 * Mask an access key for safe display.
 * Shows first 12 chars + '...' + last 4 chars.
 */
export function maskAccessKey(rawKey: string): string {
  if (!rawKey || rawKey.length < 12) return '****';
  if (rawKey.startsWith('http://') || rawKey.startsWith('https://')) {
    try {
      const url = new URL(rawKey);
      return url.port ? `${url.hostname}:${url.port}` : url.hostname;
    } catch {
      return '****';
    }
  }
  return rawKey.slice(0, 12) + '...' + rawKey.slice(-4);
}
