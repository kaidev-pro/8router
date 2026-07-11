// 8Router — Runtime Error Responses
// OpenAI-compatible error format for /v1 endpoints

export interface OpenAIError {
  error: {
    message: string;
    type: string;
    param: string | null;
    code: string;
  };
}

export function openaiError(
  message: string,
  type: string,
  code: string,
  param: string | null = null
): OpenAIError {
  return { error: { message, type, param, code } };
}

// Pre-built common errors
export const ERRORS = {
  missingApiKey: () =>
    openaiError('Missing API key. Include your 8Router access key in the Authorization header.', 'authentication_error', 'missing_api_key'),

  invalidApiKey: () =>
    openaiError('Invalid or disabled 8Router access key.', 'authentication_error', 'invalid_api_key'),

  accessKeyDisabled: () =>
    openaiError('This 8Router access key is disabled or revoked.', 'authentication_error', 'access_key_disabled'),

  accessKeyExpired: () =>
    openaiError('This 8Router access key has expired.', 'authentication_error', 'access_key_disabled'),

  noProviderCredentials: () =>
    openaiError('No enabled provider credentials are connected for this 8Router access key. Connect a provider key in your 8Router dashboard.', 'invalid_request_error', 'no_provider_credentials'),

  providerNotConnected: (provider: string) =>
    openaiError(`Provider "${provider}" is not connected. Add this provider in your 8Router dashboard.`, 'invalid_request_error', 'provider_not_connected'),

  unsupportedModel: (model: string) =>
    openaiError(`Model "${model}" is not available. Use an 8router/* alias or a model from a connected provider.`, 'invalid_request_error', 'unsupported_model'),

  localProviderNotConnected: () =>
    openaiError('No local provider (Ollama) is connected for 8router/local.', 'invalid_request_error', 'local_provider_not_connected'),

  allProvidersFailed: () =>
    openaiError('All connected providers failed or were unavailable. Check your provider credentials and try again.', 'provider_error', 'all_providers_failed'),

  providerTimeout: (provider: string) =>
    openaiError(`Provider "${provider}" timed out.`, 'provider_error', 'provider_timeout'),

  providerError: (provider: string, detail?: string) =>
    openaiError(`Provider "${provider}" returned an error.${detail ? ' ' + detail : ''}`, 'provider_error', 'provider_error'),

  invalidRequest: (msg: string) =>
    openaiError(msg, 'invalid_request_error', 'invalid_request'),

  internalError: () =>
    openaiError('Internal server error.', 'server_error', 'internal_error'),

  streamingNotSupported: () =>
    openaiError('Streaming is not enabled yet for this provider.', 'invalid_request_error', 'streaming_not_supported'),

  modelNotAllowed: (model: string) =>
    openaiError(`Model "${model}" is not allowed by your 8Router access key policy.`, 'invalid_request_error', 'model_not_allowed'),
} as const;

export function redactError(detail: string): string {
  return detail
    .replace(/sk-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]')
    .replace(/Bearer [a-zA-Z0-9_-]{20,}/g, 'Bearer [REDACTED]')
    .replace(/api[_-]?key[=:]\s*[a-zA-Z0-9_-]{20,}/gi, 'api_key=[REDACTED]')
    .replace(/AIza[a-zA-Z0-9_-]{30,}/g, '[REDACTED]')
    .replace(/xai-[a-zA-Z0-9_-]{20,}/g, '[REDACTED]');
}
