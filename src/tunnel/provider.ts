// 8Router — Tunnel Provider Abstraction
import { TunnelProvider, TunnelConfig } from './config.js';

export interface TunnelInstance {
  provider: TunnelProvider;
  publicUrl: string;
  stop: () => Promise<void>;
}

export interface TunnelProviderImpl {
  name: TunnelProvider;
  isAvailable(): Promise<boolean>;
  start(config: TunnelConfig): Promise<TunnelInstance>;
  getInstallInstructions(): string;
}

/**
 * Check if a binary exists in PATH
 */
export async function binaryExists(name: string): Promise<boolean> {
  try {
    const { execSync } = await import('child_process');
    const cmd = process.platform === 'win32' ? 'where' : 'which';
    execSync(`${cmd} ${name}`, { stdio: 'ignore' });
    return true;
  } catch {
    return false;
  }
}
