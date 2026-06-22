// 8Router — API Key Authentication & Rate Limiting
// Protect endpoints with API keys and rate limits

import crypto from 'crypto';

export interface APIKey {
  id: string;
  key: string;
  name: string;
  permissions: ('chat' | 'models' | 'admin')[];
  rateLimit: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
  };
  usage: {
    totalRequests: number;
    totalTokens: number;
    lastUsed: number;
  };
  active: boolean;
  createdAt: number;
}

// In-memory store (persist to file in production)
const apiKeys: Map<string, APIKey> = new Map();

// Rate limit tracking
const rateLimits: Map<string, { count: number; windowStart: number }[]> = new Map();

export function generateAPIKey(): string {
  return `8r_${crypto.randomBytes(32).toString('hex')}`;
}

export function createAPIKey(name: string, permissions: APIKey['permissions'] = ['chat', 'models']): APIKey {
  const key = generateAPIKey();
  const apiKey: APIKey = {
    id: crypto.randomUUID(),
    key,
    name,
    permissions,
    rateLimit: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
      requestsPerDay: 10000
    },
    usage: {
      totalRequests: 0,
      totalTokens: 0,
      lastUsed: 0
    },
    active: true,
    createdAt: Date.now()
  };
  apiKeys.set(key, apiKey);
  return apiKey;
}

export function validateAPIKey(key: string): { valid: boolean; key?: APIKey; error?: string } {
  if (!key) {
    return { valid: false, error: 'API key required' };
  }

  const apiKey = apiKeys.get(key);
  if (!apiKey) {
    return { valid: false, error: 'Invalid API key' };
  }

  if (!apiKey.active) {
    return { valid: false, error: 'API key is disabled' };
  }

  return { valid: true, key: apiKey };
}

export function checkRateLimit(key: string, limit: APIKey['rateLimit']): { allowed: boolean; remaining: number; resetAt: number } {
  const now = Date.now();
  const minuteWindow = 60 * 1000;
  const hourWindow = 60 * 60 * 1000;
  const dayWindow = 24 * 60 * 60 * 1000;

  if (!rateLimits.has(key)) {
    rateLimits.set(key, []);
  }

  const windows = rateLimits.get(key)!;

  // Clean old windows
  const validWindows = windows.filter(w => now - w.windowStart < dayWindow);
  rateLimits.set(key, validWindows);

  // Count requests in each window
  const minuteCount = validWindows.filter(w => now - w.windowStart < minuteWindow).length;
  const hourCount = validWindows.filter(w => now - w.windowStart < hourWindow).length;
  const dayCount = validWindows.length;

  if (minuteCount >= limit.requestsPerMinute) {
    return { allowed: false, remaining: 0, resetAt: now + minuteWindow };
  }
  if (hourCount >= limit.requestsPerHour) {
    return { allowed: false, remaining: 0, resetAt: now + hourWindow };
  }
  if (dayCount >= limit.requestsPerDay) {
    return { allowed: false, remaining: 0, resetAt: now + dayWindow };
  }

  // Add current request
  validWindows.push({ count: 1, windowStart: now });
  rateLimits.set(key, validWindows);

  return {
    allowed: true,
    remaining: limit.requestsPerMinute - minuteCount - 1,
    resetAt: now + minuteWindow
  };
}

export function updateKeyUsage(key: string, tokens: number): void {
  const apiKey = apiKeys.get(key);
  if (apiKey) {
    apiKey.usage.totalRequests++;
    apiKey.usage.totalTokens += tokens;
    apiKey.usage.lastUsed = Date.now();
  }
}

export function getAllAPIKeys(): APIKey[] {
  return Array.from(apiKeys.values());
}

export function deactivateAPIKey(key: string): boolean {
  const apiKey = apiKeys.get(key);
  if (apiKey) {
    apiKey.active = false;
    return true;
  }
  return false;
}

export function activateAPIKey(key: string): boolean {
  const apiKey = apiKeys.get(key);
  if (apiKey) {
    apiKey.active = true;
    return true;
  }
  return false;
}

// Default key for initial setup
export function ensureDefaultKey(): APIKey {
  const existing = Array.from(apiKeys.values()).find(k => k.name === 'default');
  if (existing) return existing;
  return createAPIKey('default', ['chat', 'models', 'admin']);
}
