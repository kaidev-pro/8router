// 8Router — Proxy Pool Manager
// Manage multiple outbound proxies for provider requests

export interface ProxyConfig {
  id: string;
  name: string;
  type: 'http' | 'socks5' | 'cloudflare' | 'deno';
  host: string;
  port: number;
  username?: string;
  password?: string;
  active: boolean;
  health: {
    lastCheck: number;
    latencyMs: number;
    successRate: number;
    consecutiveErrors: number;
  };
  usage: {
    totalRequests: number;
    totalTokens: number;
  };
}

export interface ProxyPool {
  id: string;
  name: string;
  proxies: string[]; // proxy IDs
  strategy: 'round-robin' | 'least-latency' | 'random' | 'healthiest';
  currentIndex: number;
}

// In-memory stores
const proxies: Map<string, ProxyConfig> = new Map();
const pools: Map<string, ProxyPool> = new Map();

// ═══ Proxy Management ═══

export function addProxy(config: Omit<ProxyConfig, 'health' | 'usage'>): ProxyConfig {
  const proxy: ProxyConfig = {
    ...config,
    health: {
      lastCheck: 0,
      latencyMs: 0,
      successRate: 100,
      consecutiveErrors: 0
    },
    usage: {
      totalRequests: 0,
      totalTokens: 0
    }
  };
  proxies.set(proxy.id, proxy);
  return proxy;
}

export function removeProxy(id: string): boolean {
  return proxies.delete(id);
}

export function getProxy(id: string): ProxyConfig | undefined {
  return proxies.get(id);
}

export function getAllProxies(): ProxyConfig[] {
  return Array.from(proxies.values());
}

export function updateProxyHealth(id: string, success: boolean, latencyMs: number): void {
  const proxy = proxies.get(id);
  if (!proxy) return;

  proxy.health.lastCheck = Date.now();
  proxy.health.latencyMs = latencyMs;

  if (success) {
    proxy.health.consecutiveErrors = 0;
    proxy.health.successRate = Math.min(100, proxy.health.successRate + 1);
  } else {
    proxy.health.consecutiveErrors++;
    proxy.health.successRate = Math.max(0, proxy.health.successRate - 10);
  }

  // Auto-disable if too many errors
  if (proxy.health.consecutiveErrors >= 5) {
    proxy.active = false;
  }
}

// ═══ Pool Management ═══

export function createPool(config: Omit<ProxyPool, 'currentIndex'>): ProxyPool {
  const pool: ProxyPool = {
    ...config,
    currentIndex: 0
  };
  pools.set(pool.id, pool);
  return pool;
}

export function getPool(id: string): ProxyPool | undefined {
  return pools.get(id);
}

export function getAllPools(): ProxyPool[] {
  return Array.from(pools.values());
}

export function addProxyToPool(poolId: string, proxyId: string): boolean {
  const pool = pools.get(poolId);
  if (!pool) return false;
  if (!pool.proxies.includes(proxyId)) {
    pool.proxies.push(proxyId);
  }
  return true;
}

export function removeProxyFromPool(poolId: string, proxyId: string): boolean {
  const pool = pools.get(poolId);
  if (!pool) return false;
  pool.proxies = pool.proxies.filter(id => id !== proxyId);
  return true;
}

// ═══ Proxy Selection ═══

export function selectProxy(poolId: string): ProxyConfig | null {
  const pool = pools.get(poolId);
  if (!pool || pool.proxies.length === 0) return null;

  const availableProxies = pool.proxies
    .map(id => proxies.get(id))
    .filter((p): p is ProxyConfig => p !== undefined && p.active);

  if (availableProxies.length === 0) return null;

  let selected: ProxyConfig;

  switch (pool.strategy) {
    case 'round-robin':
      selected = availableProxies[pool.currentIndex % availableProxies.length];
      pool.currentIndex = (pool.currentIndex + 1) % availableProxies.length;
      break;

    case 'least-latency':
      selected = availableProxies.reduce((min, p) =>
        p.health.latencyMs < min.health.latencyMs ? p : min
      );
      break;

    case 'healthiest':
      selected = availableProxies.reduce((best, p) =>
        p.health.successRate > best.health.successRate ? p : best
      );
      break;

    case 'random':
    default:
      selected = availableProxies[Math.floor(Math.random() * availableProxies.length)];
      break;
  }

  selected.usage.totalRequests++;
  return selected;
}

// ═══ Health Check ═══

export async function healthCheckProxy(id: string): Promise<boolean> {
  const proxy = proxies.get(id);
  if (!proxy) return false;

  try {
    const start = Date.now();
    // Simple health check - try to connect
    const testUrl = `http://${proxy.host}:${proxy.port}`;
    const response = await fetch(testUrl, {
      method: 'HEAD',
      signal: AbortSignal.timeout(5000)
    });
    const latency = Date.now() - start;

    updateProxyHealth(id, response.ok, latency);
    return response.ok;
  } catch {
    updateProxyHealth(id, false, 0);
    return false;
  }
}

export async function healthCheckAll(): Promise<Map<string, boolean>> {
  const results = new Map<string, boolean>();
  for (const [id] of proxies) {
    results.set(id, await healthCheckProxy(id));
  }
  return results;
}

// ═══ Export stats ═══

export function getPoolStats(poolId: string): {
  totalProxies: number;
  activeProxies: number;
  avgLatency: number;
  totalRequests: number;
} {
  const pool = pools.get(poolId);
  if (!pool) return { totalProxies: 0, activeProxies: 0, avgLatency: 0, totalRequests: 0 };

  const poolProxies = pool.proxies.map(id => proxies.get(id)).filter(Boolean) as ProxyConfig[];
  const activeProxies = poolProxies.filter(p => p.active);
  const avgLatency = activeProxies.length > 0
    ? activeProxies.reduce((sum, p) => sum + p.health.latencyMs, 0) / activeProxies.length
    : 0;
  const totalRequests = poolProxies.reduce((sum, p) => sum + p.usage.totalRequests, 0);

  return {
    totalProxies: poolProxies.length,
    activeProxies: activeProxies.length,
    avgLatency: Math.round(avgLatency),
    totalRequests
  };
}
