// 8Router — Provider Connection Test
// Tests provider API connectivity using the cheapest possible method.

import { getProviderMeta, type ProviderSecurityMeta } from './provider-meta.js';
import { redactSecrets } from './redact.js';

export interface TestResult {
  success: boolean;
  status: string;
  latencyMs: number;
  error?: string;
  models?: string[];
}

const TEST_TIMEOUT_MS = 10_000;

export async function testProviderConnection(
  providerId: string,
  apiKey: string,
  baseUrl?: string
): Promise<TestResult> {
  const meta = getProviderMeta(providerId);
  if (!meta) {
    return { success: false, status: 'error', latencyMs: 0, error: 'Unknown provider' };
  }
  if (meta.status === 'coming_soon') {
    return { success: false, status: 'error', latencyMs: 0, error: 'Provider not yet implemented' };
  }

  const url = (baseUrl || meta.defaultBaseUrl) + meta.testEndpoint;
  const start = Date.now();

  try {
    const headers: Record<string, string> = { 'Accept': 'application/json' };

    // Auth header
    if (meta.requiresKey) {
      if (!apiKey || apiKey === 'encrypted') {
        return { success: false, status: 'error', latencyMs: 0, error: 'No API key provided' };
      }
      if (providerId === 'anthropic') {
        headers['x-api-key'] = apiKey;
        headers['anthropic-version'] = '2023-06-01';
      } else {
        headers['Authorization'] = `Bearer ${apiKey}`;
      }
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), TEST_TIMEOUT_MS);

    const res = await fetch(url, { method: 'GET', headers, signal: controller.signal });
    clearTimeout(timer);

    const latencyMs = Date.now() - start;

    if (res.ok) {
      let models: string[] = [];
      try {
        const body = await res.json() as any;
        if (body.data && Array.isArray(body.data)) {
          models = body.data.map((m: any) => m.id).filter(Boolean).slice(0, 10);
        }
      } catch { /* not all endpoints return models in same shape */ }
      return { success: true, status: 'connected', latencyMs, models };
    }

    // 401/403 = invalid key
    if (res.status === 401 || res.status === 403) {
      return { success: false, status: 'invalid', latencyMs, error: 'Invalid API key or unauthorized' };
    }

    // 429 = rate limited
    if (res.status === 429) {
      return { success: false, status: 'rate_limited', latencyMs, error: 'Rate limited by provider' };
    }

    return {
      success: false,
      status: 'error',
      latencyMs,
      error: `Provider returned HTTP ${res.status}`,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const msg = err?.name === 'AbortError'
      ? `Connection timeout after ${TEST_TIMEOUT_MS}ms`
      : redactSecrets(err?.message || 'Connection failed');
    return { success: false, status: 'disconnected', latencyMs, error: msg };
  }
}
