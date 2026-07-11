// 8Router — /v1/chat/completions Handler
// Full runtime path: auth → routing → fallback → response
// Phase 2E: enhanced logging with attempt tracking

import type { Request, Response } from 'express';
import { authenticateRequest, updateAccessKeyUsage } from './auth.js';
import { ERRORS, redactError } from './errors.js';
import { resolveRoute, type ProviderRoute } from './provider-select.js';
import { forwardToProvider, isRetryable } from './provider-client.js';
import { getDecryptedCredential } from '../security/credentials/credential-manager.js';
import { recordProviderSuccess, recordProviderFailure, getProviderHealth } from './health/manager.js';
import { logRuntimeRequest, logAttempt, finalizeRequestLog, type LogRequestInput } from './logging.js';

// ─── Handler ─────────────────────────────────────────────────────

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
  const isAlias = requestedModel.startsWith('8router/');

  // Resolve route — Phase 2D: passes userId for health-aware selection
  const routeResult = await resolveRoute(
    requestedModel,
    ctx.allowedProviders,
    ctx.allowedModels,
    ctx.userId,
  );

  if (!routeResult.ok) {
    // Log the failed routing attempt
    logRuntimeRequest({
      userId: ctx.userId, accessKeyId: ctx.accessKeyId,
      requestedModel, requestedAlias: isAlias ? requestedModel : undefined,
      routeMode: 'auto', status: 'failed', httpStatus: routeResult.httpStatus,
      latencyMs: Date.now() - start, errorType: 'routing_error',
      endpoint: req.path, method: req.method,
      streaming: isStream,
      clientUserAgent: req.headers['user-agent'],
    });
    res.status(routeResult.httpStatus).json(routeResult.error);
    return;
  }

  // Build fallback pool
  const pool: ProviderRoute[] = [routeResult.route, ...routeResult.fallbackPool];

  // Phase 2E: create parent request log
  const parentLogId = logRuntimeRequest({
    userId: ctx.userId, accessKeyId: ctx.accessKeyId,
    accessKeyName: ctx.name,
    endpoint: req.path, method: req.method,
    requestedModel, requestedAlias: isAlias ? requestedModel : undefined,
    routeMode: 'auto', status: 'in_progress',
    streaming: isStream,
    clientUserAgent: req.headers['user-agent'],
  });

  // Try each provider
  let attemptIndex = 0;
  let lastError: string = '';
  let lastErrType: string = 'unknown';

  for (const route of pool) {
    attemptIndex++;

    // Decrypt provider API key
    const decryptedKey = getDecryptedCredential(route.credentialId);
    if (!decryptedKey) {
      // Log skipped attempt
      if (parentLogId) {
        logAttempt({
          requestLogId: parentLogId, userId: ctx.userId, attemptIndex,
          provider: route.provider, model: route.model,
          status: 'skipped', failureType: 'decrypt_failed',
        });
      }
      continue;
    }

    route.apiKey = decryptedKey;

    // Get health state before attempt
    const healthBefore = getProviderHealth(ctx.userId, route.credentialId);

    // Forward request
    const result = await forwardToProvider({
      route,
      apiKey: decryptedKey,
      body,
      stream: isStream,
    });

    // Get health state after attempt
    const healthAfter = getProviderHealth(ctx.userId, route.credentialId);

    // ── Streaming success ──
    if (isStream && result.ok && result.body && typeof result.body?.getReader === 'function') {
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');
      res.setHeader('x-8router-provider', route.provider);
      res.setHeader('x-8router-model', route.model);
      if (attemptIndex > 1) {
        res.setHeader('x-8router-fallback-count', String(attemptIndex - 1));
      }

      // Log success attempt
      if (parentLogId) {
        const attemptId = logAttempt({
          requestLogId: parentLogId, userId: ctx.userId, attemptIndex,
          provider: route.provider, model: route.model,
          latencyMs: result.latencyMs, status: 'success', httpStatus: 200,
          circuitStateBefore: healthBefore?.circuitState,
          circuitStateAfter: healthAfter?.circuitState,
          healthStatusBefore: healthBefore?.status,
          healthStatusAfter: healthAfter?.status,
        });
        finalizeRequestLog(parentLogId, {
          status: 'success', actualProvider: route.provider, actualModel: route.model,
          latencyMs: result.latencyMs, httpStatus: 200,
          fallbackCount: attemptIndex - 1, attemptCount: attemptIndex,
          finalAttemptId: attemptId || undefined,
          providerHealthStatus: healthAfter?.status,
          circuitState: healthAfter?.circuitState,
        });
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

      recordProviderSuccess({
        userId: ctx.userId, providerCredentialId: route.credentialId,
        provider: route.provider, latencyMs: result.latencyMs, status: 200,
      });
      updateAccessKeyUsage(ctx.accessKeyId);
      return;
    }

    // ── Non-streaming success ──
    if (result.ok) {
      res.setHeader('x-8router-provider', route.provider);
      res.setHeader('x-8router-model', route.model);
      if (attemptIndex > 1) {
        res.setHeader('x-8router-fallback-count', String(attemptIndex - 1));
      }

      // Extract usage from response
      const usage = (result.body as any)?.usage;
      const inputTokens = usage?.prompt_tokens || null;
      const outputTokens = usage?.completion_tokens || null;
      const totalTokens = usage?.total_tokens || null;

      // Log success attempt
      if (parentLogId) {
        const attemptId = logAttempt({
          requestLogId: parentLogId, userId: ctx.userId, attemptIndex,
          provider: route.provider, model: route.model,
          latencyMs: result.latencyMs, status: 'success', httpStatus: 200,
          circuitStateBefore: healthBefore?.circuitState,
          circuitStateAfter: healthAfter?.circuitState,
          healthStatusBefore: healthBefore?.status,
          healthStatusAfter: healthAfter?.status,
          inputTokens: inputTokens || undefined,
          outputTokens: outputTokens || undefined,
          totalTokens: totalTokens || undefined,
        });
        finalizeRequestLog(parentLogId, {
          status: 'success', actualProvider: route.provider, actualModel: route.model,
          latencyMs: result.latencyMs, httpStatus: 200,
          inputTokens: inputTokens || undefined,
          outputTokens: outputTokens || undefined,
          totalTokens: totalTokens || undefined,
          fallbackCount: attemptIndex - 1, attemptCount: attemptIndex,
          finalAttemptId: attemptId || undefined,
          providerHealthStatus: healthAfter?.status,
          circuitState: healthAfter?.circuitState,
        });
      }

      recordProviderSuccess({
        userId: ctx.userId, providerCredentialId: route.credentialId,
        provider: route.provider, latencyMs: result.latencyMs, status: 200,
      });
      updateAccessKeyUsage(ctx.accessKeyId);
      res.status(200).json(result.body);
      return;
    }

    // ── Failure ──
    lastError = result.error || 'unknown';
    const isTimeout = result.status === 504;
    const isNetwork = result.status === 502;
    lastErrType = isTimeout ? 'timeout' : isNetwork ? 'network_error' : 'provider_error';

    recordProviderFailure({
      userId: ctx.userId, providerCredentialId: route.credentialId,
      provider: route.provider, latencyMs: result.latencyMs,
      status: result.status, errorType: lastErrType as any, safeMessage: lastError,
    });

    // Log failed attempt
    if (parentLogId) {
      logAttempt({
        requestLogId: parentLogId, userId: ctx.userId, attemptIndex,
        provider: route.provider, model: route.model,
        latencyMs: result.latencyMs, status: 'failed', httpStatus: result.status,
        failureType: lastErrType, errorCode: `http_${result.status}`,
        errorMessage: lastError,
        circuitStateBefore: healthBefore?.circuitState,
        circuitStateAfter: healthAfter?.circuitState,
        healthStatusBefore: healthBefore?.status,
        healthStatusAfter: healthAfter?.status,
      });
    }

    // Check if retryable
    if (!isRetryable(result.status)) break;
  }

  // All providers failed
  if (parentLogId) {
    finalizeRequestLog(parentLogId, {
      status: 'failed', httpStatus: 502,
      latencyMs: Date.now() - start,
      actualProvider: pool[pool.length - 1]?.provider,
      actualModel: pool[pool.length - 1]?.model,
      fallbackCount: attemptIndex - 1, attemptCount: attemptIndex,
      errorType: lastErrType, errorMessage: lastError,
    });
  }

  res.status(502).json(ERRORS.allProvidersFailed());
}
