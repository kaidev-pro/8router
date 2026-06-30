// 8Router — Cloudflare Tunnel Provider
import { TunnelInstance, TunnelProviderImpl, binaryExists } from './provider.js';
import { TunnelConfig, maskSecret } from './config.js';
import { spawn, ChildProcess } from 'child_process';

let tunnelProcess: ChildProcess | null = null;

export const cloudflareProvider: TunnelProviderImpl = {
  name: 'cloudflare',

  async isAvailable(): Promise<boolean> {
    return binaryExists('cloudflared');
  },

  async start(config: TunnelConfig): Promise<TunnelInstance> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('cloudflared binary not found. Install: https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/');
    }

    return new Promise((resolve, reject) => {
      const args = ['tunnel', '--url', `http://localhost:${8080}`];

      // If token provided, use named tunnel
      if (config.cloudflareToken) {
        args.push('--token', config.cloudflareToken);
      }

      tunnelProcess = spawn('cloudflared', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: { ...process.env },
      });

      let publicUrl: string | null = null;
      let resolved = false;
      let stderr = '';

      const timeout = setTimeout(() => {
        if (!resolved) {
          tunnelProcess?.kill();
          reject(new Error('Cloudflare tunnel startup timed out after 30s'));
        }
      }, 30000);

      tunnelProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        // cloudflared prints the URL like: https://xxx-xxx-xxx.trycloudflare.com
        const match = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/);
        if (match && !resolved) {
          resolved = true;
          clearTimeout(timeout);
          publicUrl = match[0];
          config.publicUrl = publicUrl;
          resolve({
            provider: 'cloudflare',
            publicUrl,
            stop: async () => {
              tunnelProcess?.kill();
              tunnelProcess = null;
            },
          });
        }
      });

      tunnelProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      tunnelProcess.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`Failed to start cloudflared: ${err.message}`));
        }
      });

      tunnelProcess.on('exit', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`cloudflared exited with code ${code}. stderr: ${stderr.slice(0, 200)}`));
        }
      });
    });
  },

  getInstallInstructions(): string {
    return `Cloudflare Tunnel (cloudflared) is not installed.

Install options:
  macOS:   brew install cloudflared
  Linux:   https://developers.cloudflare.com/cloudflare-one/connections/connect-apps/install-and-setup/
  Docker:  docker run --rm -it cloudflare/cloudflared:latest tunnel --url http://host.docker.internal:8080
  Windows: https://github.com/cloudflare/cloudflared/releases

After install, run: 8router --tunnel`;
  },
};
