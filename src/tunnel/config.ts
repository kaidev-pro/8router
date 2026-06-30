// 8Router — Tunnel Configuration
// Manages tunnel settings with secure defaults

export type TunnelMode = 'dashboard-only' | 'api-only' | 'full';
export type TunnelProvider = 'cloudflare' | 'ngrok' | 'manual';

export interface TunnelConfig {
  enabled: boolean;
  provider: TunnelProvider;
  mode: TunnelMode;
  authRequired: boolean;
  token: string;
  publicUrl: string;
  // Provider-specific tokens (never exposed)
  cloudflareToken: string;
  ngrokToken: string;
}

export interface TunnelStatus {
  state: 'disabled' | 'starting' | 'active' | 'error';
  provider: TunnelProvider | null;
  mode: TunnelMode;
  publicUrl: string | null;
  authRequired: boolean;
  hasToken: boolean;
  error: string | null;
  uptime: number | null;
}

const DEFAULT_CONFIG: TunnelConfig = {
  enabled: false,
  provider: 'cloudflare',
  mode: 'dashboard-only',
  authRequired: true,
  token: '',
  publicUrl: '',
  cloudflareToken: '',
  ngrokToken: '',
};

export function getTunnelConfig(yaml: any): TunnelConfig {
  const raw = yaml?.tunnel ?? {};
  return {
    enabled: raw.enabled ?? DEFAULT_CONFIG.enabled,
    provider: raw.provider ?? DEFAULT_CONFIG.provider,
    mode: raw.mode ?? DEFAULT_CONFIG.mode,
    authRequired: raw.authRequired ?? DEFAULT_CONFIG.authRequired,
    token: raw.token || generateToken(),
    publicUrl: raw.publicUrl ?? DEFAULT_CONFIG.publicUrl,
    cloudflareToken: raw.cloudflareToken || process.env.TUNNEL_CLOUDFLARE_TOKEN || process.env.CLOUDFLARE_TUNNEL_TOKEN || '',
    ngrokToken: raw.ngrokToken || process.env.NGROK_AUTHTOKEN || process.env.NGROK_TOKEN || '',
  };
}

export function maskSecret(value: string): string {
  if (!value || value.length <= 8) return '***';
  return value.slice(0, 4) + '...' + value.slice(-4);
}

export function generateToken(): string {
  const chars = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let token = 'tr_';
  for (let i = 0; i < 32; i++) {
    token += chars[Math.floor(Math.random() * chars.length)];
  }
  return token;
}

export function isRouteAllowedInMode(path: string, mode: TunnelMode): boolean {
  // Landing page is always allowed
  if (path === '/8router/' || path === '/8router') return true;
  // Health check is always allowed
  if (path === '/health') return true;
  // Auth routes are always allowed
  if (path.startsWith('/auth/')) return true;

  switch (mode) {
    case 'dashboard-only':
      // Only dashboard, setup, assets, landing
      if (path.startsWith('/8router/dashboard')) return true;
      if (path.startsWith('/8router/setup')) return true;
      if (path.startsWith('/assets/')) return true;
      if (path.startsWith('/8router/public/')) return true;
      return false;

    case 'api-only':
      // Only API endpoints (require API key)
      if (path.startsWith('/v1/')) return true;
      if (path.startsWith('/assets/')) return true;
      return false;

    case 'full':
      // Everything except admin
      if (path.startsWith('/admin/')) return false;
      return true;

    default:
      return false;
  }
}

export function getTunnelStatusForDisplay(config: TunnelConfig, state: TunnelStatus['state'], error?: string): TunnelStatus {
  return {
    state: config.enabled ? state : 'disabled',
    provider: config.enabled ? config.provider : null,
    mode: config.mode,
    publicUrl: config.enabled ? (config.publicUrl || null) : null,
    authRequired: config.authRequired,
    hasToken: !!config.token,
    error: error || null,
    uptime: null,
  };
}
