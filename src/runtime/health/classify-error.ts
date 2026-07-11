// 8Router — Provider Error Classifier (Phase 2D)

import type { ClassifierResult, FailureType } from './types.js';
import { redactSecrets } from '../../security/credentials/redact.js';

/**
 * Classify a provider error into a safe FailureType.
 * Returns retryable flag, circuit open decision, and safe message.
 */
export function classifyProviderError(input: {
  status?: number;
  body?: any;
  message?: string;
  isTimeout?: boolean;
  isNetworkError?: boolean;
}): ClassifierResult {
  const { status, body, message, isTimeout, isNetworkError } = input;

  // Timeout
  if (isTimeout) {
    return {
      type: 'timeout',
      retryable: true,
      shouldOpenCircuit: true,
      safeMessage: 'Provider request timed out',
    };
  }

  // Network error
  if (isNetworkError) {
    return {
      type: 'network_error',
      retryable: true,
      shouldOpenCircuit: true,
      safeMessage: 'Provider network error',
    };
  }

  // HTTP status-based classification
  if (status) {
    switch (status) {
      case 401:
      case 403:
        return {
          type: 'auth_error',
          retryable: false,
          shouldOpenCircuit: true,
          safeMessage: 'Provider authentication failed',
          statusCode: status,
        };

      case 429: {
        const bodyMsg = typeof body === 'object' && body?.error?.message
          ? redactSecrets(String(body.error.message))
          : '';
        const isQuota = /quota|credit|billing|insufficient/i.test(bodyMsg);
        return {
          type: isQuota ? 'quota_exhausted' : 'rate_limit',
          retryable: true,
          shouldOpenCircuit: true,
          safeMessage: isQuota ? 'Provider quota exhausted' : 'Provider rate limited',
          statusCode: status,
        };
      }

      case 500:
      case 502:
      case 503:
      case 504:
        return {
          type: 'provider_error',
          retryable: true,
          shouldOpenCircuit: true,
          safeMessage: `Provider returned HTTP ${status}`,
          statusCode: status,
        };

      case 400: {
        const bodyStr = typeof body === 'object' ? JSON.stringify(body) : String(body || '');
        const lowerBody = bodyStr.toLowerCase();
        if (/model.*not.*found|model.*not.*available/i.test(lowerBody)) {
          return {
            type: 'model_unavailable',
            retryable: false,
            shouldOpenCircuit: false,
            safeMessage: 'Requested model is not available',
            statusCode: status,
          };
        }
        if (/context.*length|max.*token/i.test(lowerBody)) {
          return {
            type: 'context_length',
            retryable: false,
            shouldOpenCircuit: false,
            safeMessage: 'Context length exceeded',
            statusCode: status,
          };
        }
        return {
          type: 'invalid_request',
          retryable: false,
          shouldOpenCircuit: false,
          safeMessage: 'Invalid request',
          statusCode: status,
        };
      }

      default:
        return {
          type: status >= 500 ? 'provider_error' : 'unknown',
          retryable: status >= 500,
          shouldOpenCircuit: status >= 500,
          safeMessage: `Provider returned HTTP ${status}`,
          statusCode: status,
        };
    }
  }

  // Unknown error with message
  const safeMsg = message ? redactSecrets(message) : 'Unknown provider error';
  return {
    type: 'unknown',
    retryable: false,
    shouldOpenCircuit: false,
    safeMessage: safeMsg,
  };
}
