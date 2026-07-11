// 8Router — /v1/chat/completions Handler
// Full runtime path: auth → routing → fallback → response
// Phase 2D: health-aware with circuit breaker

import type { Request, Response } from 'express';
import { authenticateRequest, updateAccessKeyUsage } from './auth.js';
import { ERRORS, redactError } from './errors.js';
import { resolveRoute, type ProviderRoute } from './provider-select.js';
import { forwardToProvider, isRetryable, type ProviderResponse } from './provider-client.js';
import { getDecryptedCredential } from '../security/credentials/credential-manager.js';
import { recordProviderSuccess, recordProviderFailure } from './health/manager.js';
import { logRuntimeRequest } from './logging.js';

// ─── Non-Streaming Handler ──────────────────────────────────────────

export async function handleChatCompletions(req: Request, res: Response): Promise<void> {
  const start = Date.now();
  const body = req.body || {};

  // Auth
  const auth = authenticateRequest(req);
  if (!auth.ok) {
    res.status(auth.httpStatus).json(auth.error);
    return;
  }
  const ctx = auth.ctx;

  // Validate request body
  if (!body.model) {
    res.status(400).json(ERRORS.invalidRequest('Missing required field: model'));
    return;
  }
  if (!Array.isArray(body.messages) || body.messages.length === 0) {
    res.status(400).json(ERRORS.invalidRequest('Missing or empty messages array'));
    return;
  }

  const isStream = body.stream === true;
  const requestedModel = body.model;

  // Resolve route — Phase 2D: passes userId for health-aware selection
  const routeResult = await resolveRoute(
    requestedModel,
    ctx.allowedProviders,
    ctx.allowedModels,
    ctx.userId,
  );

  if (!routeResult.ok) {
    res.status(routeResult.httpStatus).json(routeResult.error);
    return;
  }

  // Build fallback pool
  const pool: ProviderRoute[] = [routeResult.route, ...routeResult.fallbackPool];
  const fallbackLog: Array<{
    provider: string; model: string; status: string;
    errorCode?: string; latencyMs: number; circuitState?: string;
  }> = [];

  // Try each provider
  let lastError: string = '';
  for (const route of pool) {
    // Decrypt provider API key
    const decryptedKey = getDecryptedCredential(route.credentialId);
    if (!decryptedKey) {
      fallbackLog.push({ provider: route.provider, model: route.model, status: 'skipped', errorCode: 'decrypt_failed', latencyMs: 0 });
      continue;
    }

    route.apiKey = decryptedKey;

    // Forward request
    const result = await forwardToProvider({
      route,
      apiKey: decryptedKey,
      body,
      stream: isStream,
    });

    // ── Streaming success ──
    if (isStream && result.ok && result.body && typeof result.body?.getReader === 'function') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('x-8router-provider', route.provider);
      res.setHeader('x-8router-model', route.model);
      if (fallbackLog.length > 0) {
        res.setHeader('x-8router-fallback-count', String(fallbackLog.length));
      }

      try {
        const reader = result.body.getReader();
        const decoder = new TextDecoder();
        let streamDone = false;
        while (!streamDone) {
          const { value, done } = await reader.read();
          streamDone = done;
          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            res.write(chunk);
          }
        }
        res.end();
      } catch {
        res.end();
      }

      // Phase 2D: record health success
      recordProviderSuccess({
        userId: ctx.userId,
        providerCredentialId: route.credentialId,
        provider: route.provider,
        latencyMs: result.latencyMs,
        status: 200,
      });
      logRuntimeRequest(ctx.accessKeyId, ctx.userId, requestedModel, route.provider, route.model, 'auto', 'success', 200, Date.now() - start, fallbackLog.length, null);
      updateAccessKeyUsage(ctx.accessKeyId);
      return;
    }

    // ── Non-streaming success ──
    if (result.ok) {
      res.setHeader('x-8router-provider', route.provider);
      res.setHeader('x-8router-model', route.model);
      if (fallbackLog.length > 0) {
        res.setHeader('x-8router-fallback-count', String(fallbackLog.length));
      }

      // Phase 2D: record health success
      recordProviderSuccess({
        userId: ctx.userId,
        providerCredentialId: route.credentialId,
        provider: route.provider,
        latencyMs: result.latencyMs,
        status: 200,
      });
      logRuntimeRequest(ctx.accessKeyId, ctx.userId, requestedModel, route.provider, route.model, 'auto', 'success', 200, Date.now() - start, fallbackLog.length, null);
      updateAccessKeyUsage(ctx.accessKeyId);
      res.status(200).json(result.body);
      return;
    }

    // ── Failure ──
    lastError = result.error || 'unknown';

    // Phase 2D: classify and record failure
    const isTimeout = result.status === 504;
    const isNetwork = result.status === 502;
    const errType = isTimeout ? 'timeout' : isNetwork ? 'network_error' : 'provider_error';
    recordProviderFailure({
      userId: ctx.userId,
      providerCredentialId: route.credentialId,
      provider: route.provider,
      latencyMs: result.latencyMs,
      status: result.status,
      errorType: errType as any,
      safeMessage: lastError,
    });

    fallbackLog.push({
      provider: route.provider,
      model: route.model,
      status: 'failed',
      errorCode: `http_${result.status}`,
      latencyMs: result.latencyMs,
      circuitState: 'closed',  // will be updated after health recording
    });

    // Check if retryable
    if (!isRetryable(result.status)) {
      // Non-retryable (e.g., 400, 401) — stop trying
      break;
    }
  }

  // All providers failed
  logRuntimeRequest(ctx.accessKeyId, ctx.userId, requestedModel, pool[0]?.provider || 'none', pool[0]?.model || 'none', 'auto', 'failed', 502, Date.now() - start, fallbackLog.length, lastError);
  res.status(502).json(ERRORS.allProvidersFailed());
}
