// 8Router — Canonical Experiment Alerts (Phase 3A)
// Webhook-based alert hook for critical experiment events.
// No secrets, no raw content, bounded timeout, non-blocking.

import type { CanonicalAlertEvent, CanonicalAlertPayload } from './types.js';
import { getShadowProductionConfig } from './config.js';

/**
 * Fire an alert event. Non-blocking — errors are swallowed.
 * Never exposes raw request/response content, keys, or credentials.
 */
export async function fireAlert(
  event: CanonicalAlertEvent,
  details: Record<string, string | number | boolean>,
): Promise<void> {
  const config = getShadowProductionConfig();
  const url = config.alertWebhookUrl;
  if (!url) return; // no webhook configured — silent no-op

  const payload: CanonicalAlertPayload = {
    event,
    timestamp: new Date().toISOString(),
    details: sanitizeAlertDetails(details),
  };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s bounded timeout

    await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
      signal: controller.signal,
    }).catch(() => {}); // swallow network errors

    clearTimeout(timeout);
  } catch {
    // Alert failure must not affect runtime
  }
}

/**
 * Sanitize alert details — remove any accidentally included secrets.
 */
function sanitizeAlertDetails(details: Record<string, string | number | boolean>): Record<string, string | number | boolean> {
  const sanitized: Record<string, string | number | boolean> = {};
  const blocked = new Set([
    'authorization', 'api_key', 'apikey', 'token', 'cookie',
    'secret', 'password', 'credential', 'access_key', 'provider_key',
  ]);

  for (const [key, value] of Object.entries(details)) {
    const lower = key.toLowerCase();
    if (blocked.has(lower)) continue;
    // Also block keys that contain blocked words
    let containsBlocked = false;
    for (const b of blocked) {
      if (lower.includes(b)) { containsBlocked = true; break; }
    }
    if (containsBlocked) continue;
    sanitized[key] = value;
  }

  return sanitized;
}
