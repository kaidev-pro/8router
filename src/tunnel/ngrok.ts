// 8Router — ngrok Tunnel Provider
import { TunnelInstance, TunnelProviderImpl, binaryExists } from './provider.js';
import { TunnelConfig } from './config.js';
import { spawn, ChildProcess } from 'child_process';

let tunnelProcess: ChildProcess | null = null;

export const ngrokProvider: TunnelProviderImpl = {
  name: 'ngrok',

  async isAvailable(): Promise<boolean> {
    return binaryExists('ngrok');
  },

  async start(config: TunnelConfig): Promise<TunnelInstance> {
    const available = await this.isAvailable();
    if (!available) {
      throw new Error('ngrok binary not found. Install: https://ngrok.com/download');
    }

    if (!config.ngrokToken) {
      throw new Error('NGROK_AUTHTOKEN is not set. Get your token at https://dashboard.ngrok.com/get-started/your-authtoken and set: export NGROK_AUTHTOKEN=your_token');
    }

    return new Promise((resolve, reject) => {
      const args = ['http', '8080', '--log', 'stdout', '--log-format', 'json'];

      tunnelProcess = spawn('ngrok', args, {
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
          ...process.env,
          NGROK_AUTHTOKEN: config.ngrokToken,
        },
      });

      let publicUrl = '';
      let resolved = false;
      let stderr = '';

      const timeout = setTimeout(() => {
        if (!resolved) {
          tunnelProcess?.kill();
          reject(new Error('ngrok startup timed out after 30s'));
        }
      }, 30000);

      tunnelProcess.stdout?.on('data', (data: Buffer) => {
        const text = data.toString();
        // ngrok logs JSON with url field
        try {
          const lines = text.split('\n').filter(Boolean);
          for (const line of lines) {
            try {
              const json = JSON.parse(line);
              if (json.url && json.url.startsWith('https://') && !resolved) {
                resolved = true;
                clearTimeout(timeout);
                publicUrl = json.url;
                config.publicUrl = publicUrl;
                resolve({
                  provider: 'ngrok',
                  publicUrl,
                  stop: async () => {
                    tunnelProcess?.kill();
                    tunnelProcess = null;
                  },
                });
              }
            } catch { /* not JSON, skip */ }
          }
        } catch { /* parse error, skip */ }
      });

      tunnelProcess.stderr?.on('data', (data: Buffer) => {
        stderr += data.toString();
      });

      tunnelProcess.on('error', (err) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`Failed to start ngrok: ${err.message}`));
        }
      });

      tunnelProcess.on('exit', (code) => {
        if (!resolved) {
          resolved = true;
          clearTimeout(timeout);
          reject(new Error(`ngrok exited with code ${code}. stderr: ${stderr.slice(0, 200)}`));
        }
      });
    });
  },

  getInstallInstructions(): string {
    return `ngrok is not installed.

Install options:
  macOS:   brew install ngrok
  Linux:   curl -sSL https://ngrok-agent.s3.amazonaws.com/ngrok-v3-stable-linux-amd64.tgz | tar xz -C /usr/local/bin
  Windows: https://ngrok.com/download
  Docker:  docker run --rm -it -e NGROK_AUTHTOKEN=your_token ngrok/ngrok http host.docker.internal:8080

Setup:
  1. Sign up at https://ngrok.com
  2. Get your token at https://dashboard.ngrok.com/get-started/your-authtoken
  3. Export: export NGROK_AUTHTOKEN=your_token
  4. Run: 8router --tunnel`;
  },
};
