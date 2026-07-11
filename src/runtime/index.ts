// 8Router — Runtime Barrel Exports

export { authenticateRequest, updateAccessKeyUsage, type AuthResult } from './auth.js';
export { ERRORS, openaiError, redactError, type OpenAIError } from './errors.js';
export { handleChatCompletions } from './chat-completions.js';
export { handleModels } from './models.js';
export {
  isAlias, resolveModelAlias, getDefaultModel, getProviderBaseUrl,
  resolveModelForProvider, resolveRoute,
  type ProviderRoute, type RouteResult,
} from './provider-select.js';
export {
  forwardToProvider, isRetryable,
  type ProviderResponse, type ForwardOptions,
} from './provider-client.js';
export { logRuntimeRequest, logAttempt, finalizeRequestLog } from './logging.js';
// Phase 2D — Provider Health
export * from './health/index.js';
// Phase 2E — Usage
export * from './usage/index.js';
