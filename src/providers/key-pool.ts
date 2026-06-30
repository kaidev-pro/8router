// 8Router — Multi-Account Key Pool v2
// Round-robin rotation with health tracking, circuit breaker, and automatic failover

export interface PoolKey {
  apiKey: string;
  index: number;
  healthy: boolean;
  status: 'healthy' | 'rate_limited' | 'exhausted' | 'invalid' | 'cooldown';
  lastUsed: number;
  lastSuccess: number;
  lastError: number;
  errorCount: number;
  successCount: number;
  totalRequests: number;
  totalErrors: number;
  cooldownMs: number;
  cooldownUntil: number | null;
  remainingQuota: number | null;
}

export interface ProviderPool {
  providerId: string;
  keys: PoolKey[];
  currentIndex: number;
  rotation: 'round-robin' | 'random' | 'least-used';
  // Circuit breaker
  circuitState: 'closed' | 'open' | 'half-open';
  circuitFailures: number;
  circuitLastFailure: number;
  circuitOpenUntil: number | null;
  circuitThreshold: number;
  circuitOpenMs: number;
}

const HEALTHY_COOLDOWN = 60_000;
const MAX_ERRORS_BEFORE_DISABLE = 3;
const CIRCUIT_THRESHOLD = 5;
const CIRCUIT_OPEN_MS = 3 * 60_000; // 3 minutes

const pools = new Map<string, ProviderPool>();

export function initKeyPool(providerId: string, apiKeys: string[], rotation = 'round-robin'): ProviderPool {
  const existing = pools.get(providerId);
  if (existing) return existing;

  const pool: ProviderPool = {
    providerId,
    keys: apiKeys.map((key, i) => ({
      apiKey: key,
      index: i,
      healthy: true,
      status: 'healthy',
      lastUsed: 0,
      lastSuccess: 0,
      lastError: 0,
      errorCount: 0,
      successCount: 0,
      totalRequests: 0,
      totalErrors: 0,
      cooldownMs: HEALTHY_COOLDOWN,
      cooldownUntil: null,
      remainingQuota: null,
    })),
    currentIndex: 0,
    rotation: rotation as any,
    // Circuit breaker
    circuitState: 'closed',
    circuitFailures: 0,
    circuitLastFailure: 0,
    circuitOpenUntil: null,
    circuitThreshold: CIRCUIT_THRESHOLD,
    circuitOpenMs: CIRCUIT_OPEN_MS,
  };
  pools.set(providerId, pool);
  return pool;
}

export function hasPool(providerId: string): boolean {
  return pools.has(providerId);
}

// ─── Circuit Breaker ──────────────────────────────────────────────

function isCircuitOpen(pool: ProviderPool): boolean {
  if (pool.circuitState === 'closed') return false;
  
  const now = Date.now();
  
  if (pool.circuitState === 'open') {
    if (pool.circuitOpenUntil && now > pool.circuitOpenUntil) {
      // Transition to half-open
      pool.circuitState = 'half-open';
      pool.circuitOpenUntil = null;
      console.log(`[8Router] Circuit breaker half-open for ${pool.providerId}`);
      return false;
    }
    return true;
  }
  
  // half-open: allow one request
  return false;
}

function recordCircuitSuccess(pool: ProviderPool): void {
  if (pool.circuitState === 'half-open') {
    pool.circuitState = 'closed';
    pool.circuitFailures = 0;
    pool.circuitOpenUntil = null;
    console.log(`[8Router] Circuit breaker closed for ${pool.providerId}`);
  }
}

function recordCircuitFailure(pool: ProviderPool): void {
  pool.circuitFailures++;
  pool.circuitLastFailure = Date.now();
  
  if (pool.circuitFailures >= pool.circuitThreshold) {
    pool.circuitState = 'open';
    pool.circuitOpenUntil = Date.now() + pool.circuitOpenMs;
    console.log(`[8Router] Circuit breaker OPEN for ${pool.providerId} (failures: ${pool.circuitFailures}, until: ${new Date(pool.circuitOpenUntil).toISOString()})`);
  }
}

export function getCircuitStatus(providerId: string): {
  state: string;
  failures: number;
  openUntil: string | null;
} | null {
  const pool = pools.get(providerId);
  if (!pool) return null;
  return {
    state: pool.circuitState,
    failures: pool.circuitFailures,
    openUntil: pool.circuitOpenUntil ? new Date(pool.circuitOpenUntil).toISOString() : null,
  };
}

// ─── Key Selection ────────────────────────────────────────────────

export function getNextKey(providerId: string): PoolKey | null {
  const pool = pools.get(providerId);
  if (!pool || pool.keys.length === 0) return null;

  // Check circuit breaker
  if (isCircuitOpen(pool)) {
    return null;
  }

  const now = Date.now();
  const totalKeys = pool.keys.length;

  for (let attempt = 0; attempt < totalKeys; attempt++) {
    let key: PoolKey;

    if (pool.rotation === 'random') {
      key = pool.keys[Math.floor(Math.random() * pool.keys.length)];
    } else if (pool.rotation === 'least-used') {
      key = pool.keys.reduce((min, k) => k.totalRequests < min.totalRequests ? k : min, pool.keys[0]);
    } else {
      key = pool.keys[pool.currentIndex % pool.keys.length];
      pool.currentIndex = (pool.currentIndex + 1) % pool.keys.length;
    }

    // Skip keys in cooldown
    if (key.cooldownUntil && now < key.cooldownUntil) {
      continue;
    }

    // Skip exhausted/invalid keys
    if (key.status === 'exhausted' || key.status === 'invalid') {
      continue;
    }

    if (key.healthy) {
      key.lastUsed = now;
      key.totalRequests++;
      return key;
    }

    // Check if cooldown expired
    if (now - key.lastError > key.cooldownMs) {
      key.healthy = true;
      key.status = 'healthy';
      key.errorCount = 0;
      key.lastUsed = now;
      key.totalRequests++;
      return key;
    }
  }

  // All keys unhealthy - try oldest cooldown
  const oldest = pool.keys.reduce((oldest, k) =>
    (k.lastError < oldest.lastError) ? k : oldest, pool.keys[0]);
  
  if (oldest.cooldownUntil && now < oldest.cooldownUntil) {
    return null; // All keys in cooldown
  }
  
  oldest.lastUsed = now;
  oldest.totalRequests++;
  return oldest;
}

export function getRetryKey(providerId: string, failedApiKey: string): PoolKey | null {
  const pool = pools.get(providerId);
  if (!pool) return null;

  // Mark failed key
  const failedKey = pool.keys.find(k => k.apiKey === failedApiKey);
  if (failedKey) {
    failedKey.errorCount++;
    failedKey.totalErrors++;
    failedKey.lastError = Date.now();
  }

  // Get next healthy key (skip the failed one)
  const now = Date.now();
  for (const key of pool.keys) {
    if (key.apiKey === failedApiKey) continue;
    
    // Skip keys in cooldown
    if (key.cooldownUntil && now < key.cooldownUntil) continue;
    if (key.status === 'exhausted' || key.status === 'invalid') continue;
    
    if (key.healthy || (now - key.lastError > key.cooldownMs)) {
      key.healthy = true;
      key.status = 'healthy';
      key.lastUsed = now;
      key.totalRequests++;
      return key;
    }
  }
  return null;
}

// ─── Key Status Updates ───────────────────────────────────────────

export function recordKeySuccess(providerId: string, apiKey: string): void {
  const pool = pools.get(providerId);
  if (!pool) return;
  const key = pool.keys.find(k => k.apiKey === apiKey);
  if (key) {
    key.successCount++;
    key.lastSuccess = Date.now();
    key.errorCount = 0;
    key.healthy = true;
    key.status = 'healthy';
    key.cooldownUntil = null;
  }
  recordCircuitSuccess(pool);
}

export function recordKeyFailure(providerId: string, apiKey: string, statusCode?: number, _errText?: string): void {
  const pool = pools.get(providerId);
  if (!pool) return;
  const key = pool.keys.find(k => k.apiKey === apiKey);
  if (!key) return;

  key.errorCount++;
  key.totalErrors++;
  key.lastError = Date.now();

  // Determine status based on error
  if (statusCode === 401 || statusCode === 403) {
    key.healthy = false;
    key.status = 'invalid';
    key.cooldownMs = 300_000; // 5 minutes
    key.cooldownUntil = Date.now() + key.cooldownMs;
  } else if (statusCode === 429) {
    key.healthy = false;
    key.status = 'rate_limited';
    key.cooldownMs = 30_000; // 30 seconds
    key.cooldownUntil = Date.now() + key.cooldownMs;
  } else if (key.errorCount >= MAX_ERRORS_BEFORE_DISABLE) {
    key.healthy = false;
    key.status = 'cooldown';
    key.cooldownMs = HEALTHY_COOLDOWN;
    key.cooldownUntil = Date.now() + key.cooldownMs;
  } else {
    key.status = 'cooldown';
    key.cooldownUntil = Date.now() + key.cooldownMs;
  }

  recordCircuitFailure(pool);
}

export function isRetryableError(statusCode: number): boolean {
  return statusCode === 429 || statusCode === 401 || statusCode === 403 ||
         statusCode === 500 || statusCode === 502 || statusCode === 503;
}

// ─── Status & Export ──────────────────────────────────────────────

export function getPoolStatus(providerId: string): any {
  const pool = pools.get(providerId);
  if (!pool) return null;
  return {
    providerId: pool.providerId,
    rotation: pool.rotation,
    totalKeys: pool.keys.length,
    healthyKeys: pool.keys.filter(k => k.healthy).length,
    circuit: {
      state: pool.circuitState,
      failures: pool.circuitFailures,
      openUntil: pool.circuitOpenUntil ? new Date(pool.circuitOpenUntil).toISOString() : null,
    },
    keys: pool.keys.map(k => ({
      index: k.index,
      masked: maskKey(k.apiKey),
      healthy: k.healthy,
      status: k.status,
      successCount: k.successCount,
      errorCount: k.errorCount,
      totalRequests: k.totalRequests,
      totalErrors: k.totalErrors,
      lastUsed: k.lastUsed ? new Date(k.lastUsed).toISOString() : null,
      lastSuccess: k.lastSuccess ? new Date(k.lastSuccess).toISOString() : null,
      lastError: k.lastError ? new Date(k.lastError).toISOString() : null,
      cooldownUntil: k.cooldownUntil ? new Date(k.cooldownUntil).toISOString() : null,
      remainingQuota: k.remainingQuota,
    })),
  };
}

export function getAllPoolStatuses(): any[] {
  return Array.from(pools.keys()).map(id => getPoolStatus(id)).filter(Boolean);
}

// ─── Secret Masking ───────────────────────────────────────────────

export function maskKey(key: string): string {
  if (!key) return '';
  if (key.length <= 12) return '***';
  return key.slice(0, 6) + '...' + key.slice(-4);
}

export function maskAllSecrets(obj: any): any {
  if (typeof obj === 'string') {
    // Mask API keys
    if (obj.match(/^(sk-|gsk-|key-|token-|Bearer )/i)) {
      return maskKey(obj);
    }
    return obj;
  }
  if (Array.isArray(obj)) {
    return obj.map(maskAllSecrets);
  }
  if (obj && typeof obj === 'object') {
    const masked: any = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.toLowerCase().includes('key') || key.toLowerCase().includes('token') || key.toLowerCase().includes('secret')) {
        if (typeof value === 'string') {
          masked[key] = maskKey(value);
        } else {
          masked[key] = maskAllSecrets(value);
        }
      } else {
        masked[key] = maskAllSecrets(value);
      }
    }
    return masked;
  }
  return obj;
}
