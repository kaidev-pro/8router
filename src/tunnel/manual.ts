// 8Router — Manual Tunnel Provider (reverse proxy instructions)
import { TunnelInstance, TunnelProviderImpl } from './provider.js';
import { TunnelConfig } from './config.js';

export const manualProvider: TunnelProviderImpl = {
  name: 'manual',

  async isAvailable(): Promise<boolean> {
    // Manual is always available — it's just instructions
    return true;
  },

  async start(config: TunnelConfig): Promise<TunnelInstance> {
    if (!config.publicUrl) {
      throw new Error(
        'Manual tunnel requires a publicUrl in config.\n' +
        'Set tunnel.publicUrl in 8router.yaml or TUNNEL_PUBLIC_URL env var.\n\n' +
        'Example reverse proxy configs:\n\n' +
        'nginx:\n' +
        '  location / {\n' +
        '    proxy_pass http://localhost:8080;\n' +
        '    proxy_set_header Host $host;\n' +
        '    proxy_set_header X-Real-IP $remote_addr;\n' +
        '  }\n\n' +
        'Caddy:\n' +
        '  8router.example.com {\n' +
        '    reverse_proxy localhost:8080\n' +
        '  }\n\n' +
        'Cloudflare DNS:\n' +
        '  Point A record to your server IP, then use Cloudflare proxy.\n'
      );
    }

    // Manual mode — just return the configured URL
    return {
      provider: 'manual',
      publicUrl: config.publicUrl,
      stop: async () => {
        // Nothing to stop — user manages the reverse proxy
      },
    };
  },

  getInstallInstructions(): string {
    return `Manual tunnel mode — use your own reverse proxy.

Setup options:

1. nginx:
   server {
     listen 443 ssl;
     server_name 8router.yourdomain.com;

     location / {
       proxy_pass http://localhost:8080;
       proxy_set_header Host $host;
       proxy_set_header X-Real-IP $remote_addr;
       proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
       proxy_set_header X-Forwarded-Proto $scheme;
     }
   }

2. Caddy:
   8router.yourdomain.com {
     reverse_proxy localhost:8080
   }

3. Cloudflare Tunnel (DNS-only):
   - Point A record to your server IP
   - Enable Cloudflare proxy (orange cloud)
   - Set tunnel.publicUrl in 8router.yaml

After setup, configure:
  tunnel:
    enabled: true
    provider: manual
    publicUrl: https://8router.yourdomain.com`;
  },
};
