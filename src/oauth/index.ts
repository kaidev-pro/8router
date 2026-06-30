// 8Router — OAuth Module Index
export { getOAuthConfig, maskOAuthSecret, getOAuthConfigForDisplay, validateOAuthConfig } from './config.js';
export type { OAuthConfig, OAuthProvider } from './config.js';
export { SessionManager, generateState, signState, verifyState } from './session.js';
export type { SessionData } from './session.js';
export { requireAuth, optionalAuth, isProtectedRoute, isPublicRoute } from './middleware.js';
export { createAuthRoutes } from './routes.js';
export { getLoginPageHTML } from './login-page.js';
