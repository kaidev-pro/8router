// 8Router — Tunnel Lifecycle Manager
import { TunnelConfig, TunnelStatus, getTunnelStatusForDisplay, maskSecret } from './config.js';
import { TunnelInstance, TunnelProviderImpl } from './provider.js';
import { cloudflareProvider } from './cloudflare.js';
import { ngrokProvider } from './ngrok.js';
import { manualProvider } from './manual.js';

const PROVIDERS: Record<string, TunnelProviderImpl> = {
  cloudflare: cloudflareProvider,
  ngrok: ngrokProvider,
  manual: manualProvider,
};

export class TunnelManager {
  private config: TunnelConfig;
  private instance: TunnelInstance | null = null;
  private state: TunnelStatus['state'] = 'disabled';
  private error: string | null = null;
  private startTime: number | null = null;

  constructor(config: TunnelConfig) {
    this.config = config;
    if (config.enabled) {
      this.state = 'disabled'; // Will be started explicitly
    }
  }

  async start(): Promise<TunnelStatus> {
    if (this.instance) {
      return this.getStatus();
    }

    this.state = 'starting';
    this.error = null;

    const provider = PROVIDERS[this.config.provider];
    if (!provider) {
      this.state = 'error';
      this.error = `Unknown tunnel provider: ${this.config.provider}`;
      return this.getStatus();
    }

    // Check availability with fallback chain
    const available = await provider.isAvailable();
    if (!available) {
      // Try fallback: cloudflare → ngrok → manual
      const fallbackOrder = ['cloudflare', 'ngrok', 'manual'].filter(p => p !== this.config.provider);
      let started = false;

      for (const fallbackName of fallbackOrder) {
        const fallback = PROVIDERS[fallbackName];
        if (await fallback.isAvailable()) {
          try {
            this.instance = await fallback.start(this.config);
            this.config.provider = fallbackName as any;
            started = true;
            break;
          } catch (err) {
            // Try next fallback
            continue;
          }
        }
      }

      if (!started) {
        this.state = 'error';
        this.error = `No tunnel provider available. ${provider.getInstallInstructions()}`;
        return this.getStatus();
      }
    } else {
      try {
        this.instance = await provider.start(this.config);
      } catch (err: any) {
        this.state = 'error';
        this.error = err.message || 'Failed to start tunnel';
        return this.getStatus();
      }
    }

    this.state = 'active';
    this.startTime = Date.now();
    return this.getStatus();
  }

  async stop(): Promise<TunnelStatus> {
    if (this.instance) {
      await this.instance.stop();
      this.instance = null;
    }
    this.state = 'disabled';
    this.startTime = null;
    this.error = null;
    return this.getStatus();
  }

  getStatus(): TunnelStatus {
    return {
      state: this.state,
      provider: this.instance ? this.config.provider : null,
      mode: this.config.mode,
      publicUrl: this.instance?.publicUrl || this.config.publicUrl || null,
      authRequired: this.config.authRequired,
      hasToken: !!this.config.token,
      error: this.error,
      uptime: this.startTime ? Math.floor((Date.now() - this.startTime) / 1000) : null,
    };
  }

  getConfig(): TunnelConfig {
    return { ...this.config };
  }

  isActive(): boolean {
    return this.state === 'active' && !!this.instance;
  }
}
