// 8Router — Latency Tracker
// Tracks per-provider/model latency statistics for smart model selection

export interface LatencyStats {
  p50: number;   // median latency in ms
  p95: number;   // 95th percentile
  p99: number;   // 99th percentile
  avg: number;   // average latency
  count: number; // number of samples
  lastUpdated: number;
}

// In-memory latency store: key = "provider:model"
const latencyStore = new Map<string, { samples: number[]; lastUpdated: number }>();
const MAX_SAMPLES = 200;

/**
 * Record a latency sample for a provider/model pair.
 */
export function recordLatency(providerId: string, modelId: string, latencyMs: number): void {
  const key = `${providerId}:${modelId}`;
  let entry = latencyStore.get(key);
  if (!entry) {
    entry = { samples: [], lastUpdated: Date.now() };
    latencyStore.set(key, entry);
  }
  entry.samples.push(latencyMs);
  // Keep only the most recent samples
  if (entry.samples.length > MAX_SAMPLES) {
    entry.samples = entry.samples.slice(-MAX_SAMPLES);
  }
  entry.lastUpdated = Date.now();
}

/**
 * Get latency statistics for a provider/model pair.
 * Returns null if no data is available.
 */
export function getLatencyStats(providerId: string, modelId: string): LatencyStats | null {
  const key = `${providerId}:${modelId}`;
  const entry = latencyStore.get(key);
  if (!entry || entry.samples.length === 0) return null;

  const sorted = [...entry.samples].sort((a, b) => a - b);
  const count = sorted.length;

  return {
    p50: sorted[Math.floor(count * 0.5)],
    p95: sorted[Math.floor(count * 0.95)],
    p99: sorted[Math.floor(count * 0.99)],
    avg: sorted.reduce((a, b) => a + b, 0) / count,
    count,
    lastUpdated: entry.lastUpdated,
  };
}

/**
 * Get all tracked provider:model pairs with their stats.
 */
export function getAllLatencyStats(): Record<string, LatencyStats> {
  const result: Record<string, LatencyStats> = {};
  for (const [key] of latencyStore) {
    const [providerId, modelId] = key.split(':');
    const stats = getLatencyStats(providerId, modelId);
    if (stats) result[key] = stats;
  }
  return result;
}

/**
 * Alias for getAllLatencyStats (used by benchmark endpoint).
 */
export function getAllStats(): Record<string, LatencyStats> {
  return getAllLatencyStats();
}

/**
 * Run a latency benchmark against enabled providers.
 * Sends a minimal chat completion request to each provider and records latency.
 */
export async function runBenchmark(
  providers: Array<{ id: string; baseUrl: string; apiKey: string }>
): Promise<Array<{ provider: string; latencyMs: number; error?: string }>> {
  const results: Array<{ provider: string; latencyMs: number; error?: string }> = [];

  for (const p of providers) {
    try {
      const start = Date.now();
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 10000);

      const res = await fetch(`${p.baseUrl}/v1/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${p.apiKey}`,
        },
        body: JSON.stringify({
          model: 'gpt-3.5-turbo',
          messages: [{ role: 'user', content: 'hi' }],
          max_tokens: 1,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - start;

      if (res.ok) {
        recordLatency(p.id, 'benchmark', latencyMs);
        results.push({ provider: p.id, latencyMs });
      } else {
        results.push({ provider: p.id, latencyMs, error: `HTTP ${res.status}` });
      }
    } catch (err: any) {
      results.push({ provider: p.id, latencyMs: 0, error: err.message });
    }
  }

  return results;
}

/**
 * Clear all latency data (useful for testing or reset).
 */
export function clearLatencyData(): void {
  latencyStore.clear();
}
