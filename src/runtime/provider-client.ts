// 8Router — Provider Client
// Forwards OpenAI-compatible requests to user-owned provider keys

import { redactError } from './errors.js';
import type { ProviderRoute } from './provider-select.js';

// ─── Types ──────────────────────────────────────────────────────────

export interface ProviderResponse {
  ok: boolean;
  status: number;
  body: any;
  headers: Record<string, string>;
  latencyMs: number;
  error?: string;
}

export interface ForwardOptions {
  route: ProviderRoute;
  apiKey: string;
  body: any;
  stream?: boolean;
  timeoutMs?: number;
}

// ─── Forward Request ────────────────────────────────────────────────

const DEFAULT_TIMEOUT = 30_000;
const SKIP_HEADERS = new Set([
  'host', 'authorization', 'connection', 'keep-alive',
  'transfer-encoding', 'te', 'trailer', 'upgrade',
  'proxy-authorization', 'proxy-authenticate',
]);

/**
 * Forward an OpenAI-compatible request to a provider.
 * Returns response body (or stream reader if streaming).
 */
export async function forwardToProvider(opts: ForwardOptions): Promise<ProviderResponse> {
  const { route, apiKey, body, stream, timeoutMs = DEFAULT_TIMEOUT } = opts;
  const start = Date.now();

  // Build provider URL
  const url = `${route.baseUrl}/chat/completions`;

  // Build headers
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'Authorization': `Bearer ${apiKey}`,
  };

  // OpenRouter optional app headers
  if (route.provider === 'openrouter') {
    headers['HTTP-Referer'] = 'https://8router.8agents.xyz';
    headers['X-Title'] = '8Router';
  }

  // Inject model into body
  const forwardBody = { ...body, model: route.model };

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);

    const resp = await fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(forwardBody),
      signal: controller.signal,
    });

    clearTimeout(timeout);
    const latencyMs = Date.now() - start;

    // Collect response headers
    const respHeaders: Record<string, string> = {};
    resp.headers.forEach((v, k) => {
      if (!SKIP_HEADERS.has(k.toLowerCase())) {
        respHeaders[k] = v;
      }
    });

    // Streaming: return raw response for passthrough
    if (stream && resp.ok && resp.headers.get('content-type')?.includes('text/event-stream')) {
      return {
        ok: true,
        status: resp.status,
        body: resp.body,  // ReadableStream for passthrough
        headers: { ...respHeaders, 'content-type': 'text/event-stream' },
        latencyMs,
      };
    }

    // Non-streaming: parse JSON
    const respBody = await resp.json().catch(() => null);

    if (!resp.ok) {
      return {
        ok: false,
        status: resp.status,
        body: respBody,
        headers: respHeaders,
        latencyMs,
        error: redactError(JSON.stringify(respBody || 'Unknown error')),
      };
    }

    return {
      ok: true,
      status: resp.status,
      body: respBody,
      headers: respHeaders,
      latencyMs,
    };
  } catch (err: any) {
    const latencyMs = Date.now() - start;
    const isTimeout = err?.name === 'AbortError' || err?.code === 'ABORT_ERR';
    return {
      ok: false,
      status: isTimeout ? 504 : 502,
      body: null,
      headers: {},
      latencyMs,
      error: isTimeout ? 'Provider request timed out' : redactError(String(err?.message || 'Network error')),
    };
  }
}

/**
 * Check if a provider response is retryable (should fallback).
 */
export function isRetryable(status: number): boolean {
  return status === 429 || status === 500 || status === 502 || status === 503 || status === 504;
}
