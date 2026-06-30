// 8Router — OAuth Configuration
// Manages OAuth settings with secure defaults

export type OAuthProvider = 'none' | 'google' | 'github' | 'both';

export interface OAuthConfig {
  enabled: boolean;
  provider: OAuthProvider;
  allowedEmails: string[];
  allowedDomains: string[];
  sessionSecret: string;
  sessionMaxAgeHours: number;
  google: {
    clientId: string;
    clientSecret: string;
  };
  github: {
    clientId: string;
    clientSecret: string;
  };
}

const DEFAULT_CONFIG: OAuthConfig = {
  enabled: false,
  provider: 'none',
  allowedEmails: [],
  allowedDomains: [],
  sessionSecret: '',
  sessionMaxAgeHours: 24,
  google: { clientId: '', clientSecret: '' },
  github: { clientId: '', clientSecret: '' },
};

export function getOAuthConfig(yaml: any): OAuthConfig {
  const raw = yaml?.oauth ?? {};
  return {
    enabled: parseBool(raw.enabled, process.env.OAUTH_ENABLED, DEFAULT_CONFIG.enabled),
    provider: raw.provider || process.env.OAUTH_PROVIDER || DEFAULT_CONFIG.provider,
    allowedEmails: parseList(raw.allowedEmails, process.env.OAUTH_ALLOWED_EMAILS),
    allowedDomains: parseList(raw.allowedDomains, process.env.OAUTH_ALLOWED_DOMAINS),
    sessionSecret: raw.sessionSecret || process.env.SESSION_SECRET || generateSecret(),
    sessionMaxAgeHours: parseInt(raw.sessionMaxAgeHours || process.env.SESSION_MAX_AGE_HOURS || '') || DEFAULT_CONFIG.sessionMaxAgeHours,
    google: {
      clientId: raw.google?.clientId || process.env.GOOGLE_CLIENT_ID || '',
      clientSecret: raw.google?.clientSecret || process.env.GOOGLE_CLIENT_SECRET || '',
    },
    github: {
      clientId: raw.github?.clientId || process.env.GITHUB_CLIENT_ID || '',
      clientSecret: raw.github?.clientSecret || process.env.GITHUB_CLIENT_SECRET || '',
    },
  };
}

export function maskOAuthSecret(value: string): string {
  if (!value || value.length <= 8) return '***';
  return value.slice(0, 4) + '...' + value.slice(-4);
}

export function getOAuthConfigForDisplay(config: OAuthConfig) {
  return {
    enabled: config.enabled,
    provider: config.provider,
    allowedEmails: config.allowedEmails,
    allowedDomains: config.allowedDomains,
    sessionMaxAgeHours: config.sessionMaxAgeHours,
    hasSessionSecret: !!config.sessionSecret,
    google: {
      configured: !!(config.google.clientId && config.google.clientSecret),
      clientId: config.google.clientId ? maskOAuthSecret(config.google.clientId) : '',
    },
    github: {
      configured: !!(config.github.clientId && config.github.clientSecret),
      clientId: config.github.clientId ? maskOAuthSecret(config.github.clientId) : '',
    },
    // Never expose secrets
    sessionSecret: maskOAuthSecret(config.sessionSecret),
    googleClientSecret: '***',
    githubClientSecret: '***',
  };
}

export function validateOAuthConfig(config: OAuthConfig): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (!config.enabled) return { valid: true, errors: [] };

  if (config.provider === 'none') {
    errors.push('OAuth enabled but provider is "none"');
  }

  if ((config.provider === 'google' || config.provider === 'both') && (!config.google.clientId || !config.google.clientSecret)) {
    errors.push('Google OAuth selected but client ID/secret missing');
  }

  if ((config.provider === 'github' || config.provider === 'both') && (!config.github.clientId || !config.github.clientSecret)) {
    errors.push('GitHub OAuth selected but client ID/secret missing');
  }

  if (!config.sessionSecret) {
    errors.push('Session secret is empty');
  }

  return { valid: errors.length === 0, errors };
}

// ─── Helpers ───

function parseBool(...args: any[]): boolean {
  for (const arg of args) {
    if (arg === true || arg === 'true' || arg === '1') return true;
    if (arg === false || arg === 'false' || arg === '0') return false;
  }
  return false;
}

function parseList(yamlVal: any, envVal?: string): string[] {
  if (Array.isArray(yamlVal)) return yamlVal.filter(Boolean).map(String);
  if (envVal) return envVal.split(',').map(s => s.trim()).filter(Boolean);
  return [];
}

function generateSecret(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let secret = '';
  for (let i = 0; i < 64; i++) {
    secret += chars[Math.floor(Math.random() * chars.length)];
  }
  return secret;
}
